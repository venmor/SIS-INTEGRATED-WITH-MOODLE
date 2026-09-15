import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createRequire } from 'node:module';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

// Slice-2a endpoint proofs. Requires a live dev database:
//   export $(cat .env | grep -v '^#' | xargs) && npm run test:e2e
// Uses throwaway accounts (deleted afterwards); seed accounts are only read
// for the identical-response comparisons, never locked (dedicated lockout
// account instead).
const require = createRequire(import.meta.url);
const { hash } = require('argon2') as typeof import('argon2');

const EXPECTED_FAILURE = 'We could not sign you in with those details. Check them and try again, or reset your password.';
const EXPECTED_RECOVERY =
  'If an account matches, recovery instructions are on their way. Otherwise no account exists with those details.';
const CSRF = { 'x-requested-with': 'XMLHttpRequest' };

describe('auth (e2e)', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let prisma: PrismaService;
  let server: unknown;
  const createdUsernames: string[] = [];
  const logs: string[] = [];
  const stamp = Date.now().toString(36);

  const makeUser = async (tag: string, password: string): Promise<string> => {
    const username = `e2e.${tag}.${stamp}`;
    const person = await prisma.person.create({ data: { displayName: `E2E ${tag}` } });
    const account = await prisma.account.create({
      data: { personId: person.id, username, status: 'ACTIVE' },
    });
    await prisma.credential.create({
      data: { accountId: account.id, kind: 'PASSWORD', secretHash: await hash(password), status: 'ACTIVE' },
    });
    createdUsernames.push(username);
    return username;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication({
      logger: {
        log: (m: unknown) => logs.push(String(m)),
        error: (m: unknown) => logs.push(String(m)),
        warn: (m: unknown) => logs.push(String(m)),
        debug: (m: unknown) => logs.push(String(m)),
        verbose: (m: unknown) => logs.push(String(m)),
        setLogLevels: () => undefined,
      },
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Sweep every throwaway e2e account (including leftovers from aborted
    // runs) before deleting orphaned persons — FK-safe order.
    const stale = await prisma.account.findMany({
      where: { username: { startsWith: 'e2e.' } },
      select: { id: true },
    });
    for (const account of stale) {
      await prisma.recoveryToken.deleteMany({ where: { accountId: account.id } });
      await prisma.credential.deleteMany({ where: { accountId: account.id } });
      await prisma.session.deleteMany({ where: { accountId: account.id } });
      await prisma.roleAssignment.deleteMany({ where: { accountId: account.id } });
      await prisma.account.delete({ where: { id: account.id } });
    }
    await prisma.person.deleteMany({
      where: { displayName: { startsWith: 'E2E ' }, accounts: { none: {} } },
    });
    await app.close();
  }, 60000);

  it('signs in with cookie flags and reads own record', async () => {
    const username = await makeUser('happy', 'Long-Enough-Password-1');
    const agent = request.agent(server as never);
    const res = await agent.post('/auth/sign-in').set(CSRF).send({ username, password: 'Long-Enough-Password-1' });
    expect(res.status).toBe(200);
    expect(res.body.account.username).toBe(username);
    const cookie = String(res.headers['set-cookie'] ?? '');
    expect(cookie).toContain('sid=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    const me = await agent.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.account.username).toBe(username);
  });

  it('returns identical responses for wrong password and unknown user', async () => {
    const username = await makeUser('enum', 'Long-Enough-Password-1');
    const bad = await request(server as never).post('/auth/sign-in').set(CSRF).send({ username, password: 'Wrong-Password-000' });
    const unknown = await request(server as never).post('/auth/sign-in').set(CSRF).send({ username: `ghost.${stamp}`, password: 'Wrong-Password-000' });
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(bad.body.message).toBe(EXPECTED_FAILURE);
    expect(unknown.body.message).toBe(EXPECTED_FAILURE);
    // §16.1 support reference rides with every failure (§16.14 correlationId).
    expect(bad.body.reference).toBeDefined();
    expect(unknown.body.reference).toBeDefined();
  });

  it('rate-limits sign-in and locks out with neutral responses', async () => {
    const username = await makeUser('lock', 'Long-Enough-Password-1');
    const client = request(server as never);
    for (let i = 0; i < 5; i++) {
      await client.post('/auth/sign-in').set(CSRF).send({ username, password: 'Wrong-Password-000' });
    }
    const limited = await client.post('/auth/sign-in').set(CSRF).send({ username, password: 'Wrong-Password-000' });
    expect(limited.status).toBe(429);
    expect(limited.body.message).toContain('For your security');
    expect(limited.body.reference).toBeDefined();
    expect(limited.headers['retry-after']).toBeDefined();
    const account = await prisma.account.findUniqueOrThrow({ where: { username } });
    expect(account.lockedUntil).not.toBeNull();
    // Sixth attempt trips the route limiter first (5/15min): even the correct
    // password gets a neutral 429 — neither validity nor lock state leaks.
    const locked = await client.post('/auth/sign-in').set(CSRF).send({ username, password: 'Long-Enough-Password-1' });
    expect(locked.status).toBe(429);
    expect(locked.body.message).toContain('For your security');
    // Five failures carry progressive delays (1+2+3+4+5s + hashing).
  }, 60000);

  it('requires the CSRF marker on mutations', async () => {
    const res = await request(server as never).post('/auth/sign-in').send({ username: 'x', password: 'y' });
    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated /me', async () => {
    const res = await request(server as never).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('recovers with generic messages, single-use tokens and session kill', async () => {
    const username = await makeUser('rec', 'Long-Enough-Password-1');
    const agent = request.agent(server as never);
    await agent.post('/auth/sign-in').set(CSRF).send({ username, password: 'Long-Enough-Password-1' });
    const known = await request(server as never).post('/auth/recovery/request').set(CSRF).send({ username });
    const unknown = await request(server as never)
      .post('/auth/recovery/request')
      .set(CSRF)
      .send({ username: `ghost.${stamp}` });
    expect(known.body.message).toBe(EXPECTED_RECOVERY);
    expect(unknown.body.message).toBe(EXPECTED_RECOVERY);
    const demo = await request(server as never).get('/auth/demo/recovery-token').query({ username });
    expect(demo.status).toBe(200);
    const confirm = await request(server as never)
      .post('/auth/recovery/confirm')
      .set(CSRF)
      .send({ token: demo.body.token, newPassword: 'Brand-New-Password-2' });
    expect(confirm.status).toBe(200);
    expect(confirm.body.message).toContain('signed out');
    const reuse = await request(server as never)
      .post('/auth/recovery/confirm')
      .set(CSRF)
      .send({ token: demo.body.token, newPassword: 'Another-Password-3' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.reference).toBeDefined();
    const oldSession = await agent.get('/auth/me');
    expect(oldSession.status).toBe(401);
    const fresh = await request(server as never)
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Brand-New-Password-2' });
    expect(fresh.status).toBe(200);
  });

  it('rate-limits recovery requests with neutral responses', async () => {
    const username = await makeUser('rllimit', 'Long-Enough-Password-1');
    const client = request(server as never);
    for (let i = 0; i < 3; i++) {
      const ok = await client.post('/auth/recovery/request').set(CSRF).send({ username });
      expect(ok.status).toBe(200);
      expect(ok.body.message).toBe(EXPECTED_RECOVERY);
    }
    const limited = await client.post('/auth/recovery/request').set(CSRF).send({ username });
    expect(limited.status).toBe(429);
    expect(limited.body.message).toContain('For your security');
    expect(limited.body.reference).toBeDefined();
    expect(limited.headers['retry-after']).toBeDefined();
  });

  it('signs out and revokes the session', async () => {
    const username = await makeUser('out', 'Long-Enough-Password-1');
    const agent = request.agent(server as never);
    await agent.post('/auth/sign-in').set(CSRF).send({ username, password: 'Long-Enough-Password-1' });
    const out = await agent.post('/auth/sign-out').set(CSRF);
    expect(out.status).toBe(200);
    expect(await agent.get('/auth/me')).toHaveProperty('status', 401);
  });

  it('never logs passwords or tokens', async () => {
    const canary = `Canary-${stamp}-Secret`;
    await request(server as never).post('/auth/sign-in').set(CSRF).send({ username: 'x', password: canary });
    const dump = logs.join('\n');
    expect(dump).not.toContain(canary);
    expect(dump).not.toContain('sid=');
  });
});
