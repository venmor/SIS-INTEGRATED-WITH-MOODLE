import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createRequire } from 'node:module';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

// Config endpoint authorization proofs. Requires a live dev database:
//   node scripts/with-env.mjs npm run test:e2e --workspace=apps/api
// /config exposes security configuration (rate limits, lockout thresholds,
// roles) and mutates it: every route requires a signed-in IAM grantor.
// Students read nothing; unauthenticated writes are 401 (never 500);
// successful writes record the actor. No sweep needed (reads only + a
// same-value PATCH that changes no effective configuration).
const require = createRequire(import.meta.url);
const { hash } = require('argon2') as typeof import('argon2');

const CSRF = { 'x-requested-with': 'XMLHttpRequest' };

describe('config authorization (e2e)', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let prisma: PrismaService;
  let server: unknown;
  const stamp = Date.now().toString(36);

  const makeUser = async (tag: string, password: string): Promise<string> => {
    const username = `e2e.cfg.${tag}.${stamp}`;
    const person = await prisma.person.create({
      data: { displayName: `E2E config ${tag}` },
    });
    const account = await prisma.account.create({
      data: { personId: person.id, username, status: 'ACTIVE' },
    });
    await prisma.credential.create({
      data: {
        accountId: account.id,
        kind: 'PASSWORD',
        secretHash: await hash(password),
        status: 'ACTIVE',
      },
    });
    return username;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const stale = await prisma.account.findMany({
      where: { username: { startsWith: 'e2e.cfg.' } },
      select: { id: true },
    });
    const staleIds = stale.map((a) => a.id);
    if (staleIds.length > 0) {
      await prisma.session.deleteMany({
        where: { accountId: { in: staleIds } },
      });
      await prisma.credential.deleteMany({
        where: { accountId: { in: staleIds } },
      });
      await prisma.account.deleteMany({ where: { id: { in: staleIds } } });
    }
    await prisma.person.deleteMany({
      where: {
        displayName: { startsWith: 'E2E config ' },
        accounts: { none: {} },
      },
    });
    await app.close();
  }, 60000);

  it('refuses students on reads and unauthenticated callers on writes', async () => {
    const username = await makeUser('student', 'Long-Enough-Password-1');
    const student = request.agent(server as never);
    await student
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const read = await student.get('/config');
    expect(read.status).toBe(403);
    expect(read.body.reference).toBeDefined();
    const anon = await request(server as never)
      .patch('/config/security.expiryCheckIntervalMinutes')
      .set(CSRF)
      .send({ value: 1, changeReason: 'probe' });
    expect(anon.status).toBe(401);
  });

  it('lets grantors read and same-value patch with actor attribution', async () => {
    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });
    const read = await admin.get('/config/security.expiryCheckIntervalMinutes');
    expect(read.status).toBe(200);
    const patched = await admin
      .patch('/config/security.expiryCheckIntervalMinutes')
      .set(CSRF)
      .send({
        value: read.body.value,
        changeReason: 'authorization probe (no effective change)',
      });
    expect(patched.status).toBe(200);
    const mweene = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    expect(patched.body.updatedBy).toBe(mweene.id);
  });
});
