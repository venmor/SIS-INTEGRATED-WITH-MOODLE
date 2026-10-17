import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { hash } from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

describe('own-session workspace landing and sign-in rotation', () => {
  let app: INestApplication, db: PrismaService;
  const password = 'Fictional-workspace-proof-2026!';
  const previousVercel = process.env.VERCEL;

  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
      !/(?:test|review|ci|browser)/i.test(target.pathname))
      throw new Error('Use an isolated loopback test/review database.');
    process.env.VERCEL = '1';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(PrismaService);
  });
  afterAll(async () => {
    if (app) await app.close();
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
  });

  async function actor(roles = ['LEC', 'SYSADMIN'], personId?: string) {
    const person = personId ? { id: personId } : await db.person.create({ data: { displayName: 'Fictional workspace actor' } });
    const account = await db.account.create({ data: { personId: person.id, username: `landing.${randomUUID()}` } });
    await db.credential.create({ data: { accountId: account.id, kind: 'PASSWORD', secretHash: await hash(password) } });
    const assignments = [];
    for (const [index, role] of roles.entries()) assignments.push(await db.roleAssignment.create({ data: {
      accountId: account.id, role, scopeType: role === 'LEC' ? 'OFFERING' : 'SYSTEM',
      scopeRef: role === 'LEC' ? 'SWE-2026S1' : 'GLOBAL', capabilities: role === 'SYSADMIN' ? ['administer-identity'] : [],
      startsAt: new Date(`200${index}-01-01`), reason: 'Isolated own-workspace landing fixture',
    } }));
    return { ...account, assignments };
  }
  async function login(username: string, cookie?: string) {
    const call = request(app.getHttpServer()).post('/auth/sign-in')
      .set('x-requested-with', 'XMLHttpRequest');
    if (cookie) call.set('Cookie', cookie);
    const response = await call.send({ username, password }).expect(200);
    const header = response.headers['set-cookie'];
    return (Array.isArray(header) ? header[0] : header).split(';')[0];
  }
  async function me(cookie: string) {
    const response = await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie).expect(200);
    return response.body;
  }
  const select = (cookie: string, assignmentId: string) => request(app.getHttpServer())
    .post('/auth/workspace/switch').set('Cookie', cookie)
    .set('x-requested-with', 'XMLHttpRequest').send({ assignmentId });

  it('retains only the selected live same-account context while rotating the old session', async () => {
    const user = await actor();
    const first = await login(user.username);
    expect((await me(first)).activeWorkspace.assignmentId).toBe(user.assignments[0].id);
    await select(first, user.assignments[1].id).expect(200);
    const next = await login(user.username, first);
    expect((await me(next)).activeWorkspace.assignmentId).toBe(user.assignments[1].id);
    await request(app.getHttpServer()).get('/auth/me').set('Cookie', first).expect(401);
  });

  it('does not retain an expired or revoked selected assignment', async () => {
    for (const change of [{ endsAt: new Date('2000-01-01') }, { revokedAt: new Date() }]) {
      const user = await actor();
      const cookie = await login(user.username);
      await select(cookie, user.assignments[1].id).expect(200);
      await db.roleAssignment.update({ where: { id: user.assignments[1].id }, data: change });
      const next = await login(user.username, cookie);
      expect((await me(next)).activeWorkspace.assignmentId).toBe(user.assignments[0].id);
    }
  });

  it('cannot borrow a foreign account selection, including another account of the same person', async () => {
    const source = await actor();
    for (const personId of [undefined, source.personId]) {
      const target = await actor(['LEC'], personId);
      const cookie = await login(source.username);
      await select(cookie, source.assignments[1].id).expect(200);
      const next = await login(target.username, cookie);
      const state = await me(next);
      expect(state.account.accountId).toBe(target.id);
      expect(state.activeWorkspace.assignmentId).toBe(target.assignments[0].id);
    }
  });

  it('does not retain an expired session or automatically enter emergency access', async () => {
    const user = await actor();
    let cookie = await login(user.username);
    await select(cookie, user.assignments[1].id).expect(200);
    await db.session.updateMany({ where: { accountId: user.id }, data: { expiresAt: new Date('2000-01-01') } });
    cookie = await login(user.username, cookie);
    expect((await me(cookie)).activeWorkspace.assignmentId).toBe(user.assignments[0].id);
    const emergency = await db.roleAssignment.create({ data: {
      accountId: user.id, role: 'SYSADMIN', scopeType: 'BREAK_GLASS', scopeRef: 'INC-FICTIONAL',
      capabilities: [], startsAt: new Date('1990-01-01'), reason: 'Isolated emergency context fixture',
    } });
    await select(cookie, emergency.id).expect(200);
    cookie = await login(user.username, cookie);
    expect((await me(cookie)).activeWorkspace.assignmentId).toBe(user.assignments[0].id);
  });

  it('keeps no-active-authority accounts signed in without inventing a workspace', async () => {
    const user = await actor([]);
    const cookie = await login(user.username);
    expect((await me(cookie)).activeWorkspace).toBeNull();
  });

  it('allows existing actual role aliases to switch but denies foreign and expired targets', async () => {
    for (const role of ['STUDENT', 'APPLICANT', 'MOODLE_ADMIN', 'FINANCE_OFFICER', 'INTEGRATION_SUPPORT']) {
      const user = await actor([role, role]);
      const outsider = await actor([role]);
      const cookie = await login(user.username);
      await select(cookie, user.assignments[1].id).expect(200);
      await select(cookie, outsider.assignments[0].id).expect(400);
      await db.roleAssignment.update({ where: { id: user.assignments[0].id }, data: { endsAt: new Date('2000-01-01') } });
      await select(cookie, user.assignments[0].id).expect(400);
      expect((await me(cookie)).activeWorkspace.assignmentId).toBe(user.assignments[1].id);
    }
  });
});
