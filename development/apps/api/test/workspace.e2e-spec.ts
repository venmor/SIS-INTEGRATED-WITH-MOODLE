import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createRequire } from 'node:module';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

// Slice-3 endpoint proofs. Requires a live dev database:
//   node scripts/with-env.mjs npm run test:e2e --workspace=apps/api
// Demo story: Mutinta holds live LEC + DEAN assignments plus one expired TUT
// (filtered out); Mweene (SYSADMIN) is the demo IAM-Administrator stand-in.
// Seed accounts are signed into but never structurally changed; throwaway
// e2e accounts and test-made grants are swept afterwards.
const require = createRequire(import.meta.url);
const { hash } = require('argon2') as typeof import('argon2');

const GRANT_DENIED = 'This change was not completed. Check the details and try again, or ask an administrator.';
const ASSIGNMENT_CHANGED = 'Your role assignment has changed. This action was not completed.';
const CSRF = { 'x-requested-with': 'XMLHttpRequest' };

describe('workspace (e2e)', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let prisma: PrismaService;
  let server: unknown;
  const stamp = Date.now().toString(36);

  const signIn = (agent: { post(url: string): unknown }, username: string, password: string) =>
    (agent.post('/auth/sign-in') as ReturnType<typeof request>).set(CSRF).send({ username, password });

  const makeUser = async (tag: string, password: string): Promise<string> => {
    const username = `e2e.ws.${tag}.${stamp}`;
    const person = await prisma.person.create({ data: { displayName: `E2E ws ${tag}` } });
    const account = await prisma.account.create({
      data: { personId: person.id, username, status: 'ACTIVE' },
    });
    await prisma.credential.create({
      data: { accountId: account.id, kind: 'PASSWORD', secretHash: await hash(password), status: 'ACTIVE' },
    });
    return username;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    server = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const stale = await prisma.account.findMany({
      where: { username: { startsWith: 'e2e.ws.' } },
      select: { id: true },
    });
    for (const account of stale) {
      await prisma.session.deleteMany({ where: { accountId: account.id } });
      await prisma.recoveryToken.deleteMany({ where: { accountId: account.id } });
      await prisma.credential.deleteMany({ where: { accountId: account.id } });
      await prisma.roleAssignment.deleteMany({ where: { accountId: account.id } });
      await prisma.account.delete({ where: { id: account.id } });
    }
    await prisma.person.deleteMany({
      where: { displayName: { startsWith: 'E2E ws ' }, accounts: { none: {} } },
    });
    // Test-made grants on seed accounts never outlive the run (schedules
    // first: the grant hook schedules reviews for every grant).
    const testMade = await prisma.roleAssignment.findMany({
      where: { reason: { startsWith: 'E2E ws grant ' } },
      select: { id: true },
    });
    await prisma.reviewSchedule.deleteMany({ where: { assignmentId: { in: testMade.map((a) => a.id) } } });
    await prisma.roleAssignment.deleteMany({ where: { reason: { startsWith: 'E2E ws grant ' } } });
    await app.close();
  }, 60000);

  it('lists live workspaces with a deterministic default (expired TUT excluded)', async () => {
    const agent = request.agent(server as never);
    await (signIn(agent, 'mutinta.l', 'Seed-2026-Mutinta') as unknown as Promise<{ status: number }>);
    const me = await agent.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.workspaces).toHaveLength(2);
    expect(me.body.workspaces.map((w: { role: string }) => w.role).sort()).toEqual(['DEAN', 'LEC']);
    // Earliest-started live assignment wins the default: LEC (2026-01-15).
    expect(me.body.activeWorkspace.role).toBe('LEC');
    expect(me.body.activeWorkspace.scopeRef).toBe('SWE101-2026S1');
  });

  it('switches deliberately with audit, then reads back the Dean header facts', async () => {
    const agent = request.agent(server as never);
    await (signIn(agent, 'mutinta.l', 'Seed-2026-Mutinta') as unknown as Promise<{ status: number }>);
    const me = await agent.get('/auth/me');
    const dean = me.body.workspaces.find((w: { role: string }) => w.role === 'DEAN');
    const res = await agent.post('/auth/workspace/switch').set(CSRF).send({ assignmentId: dean.assignmentId });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Workspace switched');
    expect(res.body.reference).toBeDefined();
    expect(res.body.activeWorkspace).toMatchObject({ role: 'DEAN', scopeType: 'SCHOOL', scopeRef: 'Computing' });
    const after = await agent.get('/auth/me');
    expect(after.body.activeWorkspace.role).toBe('DEAN');
    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'CMD-IAM-SwitchWorkspace', outcome: 'ALLOW' },
      orderBy: { occurredAt: 'desc' },
    });
    expect(audit?.activeRole).toBe('DEAN');
    expect(audit?.scope).toBe('SCHOOL:Computing');
  });

  it('denies foreign and expired assignments without disclosure', async () => {
    const agent = request.agent(server as never);
    await (signIn(agent, 'mutinta.l', 'Seed-2026-Mutinta') as unknown as Promise<{ status: number }>);
    const chanda = await prisma.account.findUniqueOrThrow({ where: { username: 'chanda.k' } });
    const foreign = await prisma.roleAssignment.findFirstOrThrow({ where: { accountId: chanda.id } });
    const bad = await agent.post('/auth/workspace/switch').set(CSRF).send({ assignmentId: foreign.id });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe(ASSIGNMENT_CHANGED);
    expect(bad.body.reference).toBeDefined();
    const mutinta = await prisma.account.findUniqueOrThrow({ where: { username: 'mutinta.l' } });
    const expired = await prisma.roleAssignment.findFirstOrThrow({
      where: { accountId: mutinta.id, role: 'TUT' },
    });
    const gone = await agent.post('/auth/workspace/switch').set(CSRF).send({ assignmentId: expired.id });
    expect(gone.status).toBe(400);
    expect(gone.body.message).toBe(ASSIGNMENT_CHANGED);
  });

  it('rejects unknown switch fields', async () => {
    const agent = request.agent(server as never);
    await (signIn(agent, 'mutinta.l', 'Seed-2026-Mutinta') as unknown as Promise<{ status: number }>);
    const res = await agent
      .post('/auth/workspace/switch')
      .set(CSRF)
      .send({ assignmentId: '123e4567-e89b-12d3-a456-426614174000', extra: 'nope' });
    expect(res.status).toBe(400);
  });

  it('grants as SYSADMIN, denies self-grants, unknown users and non-admins', async () => {
    const admin = request.agent(server as never);
    await (signIn(admin, 'mweene.t', 'Seed-2026-Mweene') as unknown as Promise<{ status: number }>);
    const target = await makeUser('grantee', 'Long-Enough-Password-1');
    const mweene = await prisma.account.findUniqueOrThrow({ where: { username: 'mweene.t' } });
    const grant = { username: target, role: 'TUT', scopeType: 'TUTORIAL_GROUP', scopeRef: 'SWE101-TG9-2026S1', startsAt: '2026-03-01', appointmentRef: 'HR-2026-099', authoritySource: 'University Appointments', approverId: mweene.id, reason: `E2E ws grant ${stamp}` };
    const created = await admin.post('/auth/grants').set(CSRF).send(grant);
    expect(created.status).toBe(201);
    expect(created.body.assignmentId).toBeDefined();
    expect(created.body.message).toContain('Role assignment created');
    const self = await admin.post('/auth/grants').set(CSRF).send({ ...grant, username: 'mweene.t', reason: `E2E ws grant self ${stamp}` });
    expect(self.status).toBe(403);
    expect(self.body.message).toBe(GRANT_DENIED);
    const ghost = await admin.post('/auth/grants').set(CSRF).send({ ...grant, username: `ghost.${stamp}`, reason: `E2E ws grant ghost ${stamp}` });
    expect(ghost.status).toBe(400);
    expect(ghost.body.message).toBe(GRANT_DENIED);
    expect(ghost.body.reference).toBeDefined();
    const user = request.agent(server as never);
    await (signIn(user, 'chanda.k', 'Seed-2026-Chanda') as unknown as Promise<{ status: number }>);
    const rogue = await user.post('/auth/grants').set(CSRF).send({ ...grant, username: target, reason: `E2E ws grant rogue ${stamp}` });
    expect(rogue.status).toBe(403);
    expect(rogue.body.message).toBe(GRANT_DENIED);
  });

  it('drops dead assignments from the session without killing sign-in', async () => {
    const username = await makeUser('revokee', 'Long-Enough-Password-1');
    const admin = request.agent(server as never);
    await (signIn(admin, 'mweene.t', 'Seed-2026-Mweene') as unknown as Promise<{ status: number }>);
    const mweene2 = await prisma.account.findUniqueOrThrow({ where: { username: 'mweene.t' } });
    const grant = { username, role: 'TUT', scopeType: 'TUTORIAL_GROUP', scopeRef: 'SWE101-TG9-2026S1', startsAt: '2026-03-01', appointmentRef: 'HR-2026-099', authoritySource: 'University Appointments', approverId: mweene2.id, reason: `E2E ws grant ${stamp}` };
    const created = await admin.post('/auth/grants').set(CSRF).send(grant);
    expect(created.status).toBe(201);
    const agent = request.agent(server as never);
    await (signIn(agent, username, 'Long-Enough-Password-1') as unknown as Promise<{ status: number }>);
    const switched = await agent.post('/auth/workspace/switch').set(CSRF).send({ assignmentId: created.body.assignmentId });
    expect(switched.status).toBe(200);
    await prisma.roleAssignment.update({
      where: { id: created.body.assignmentId },
      data: { revokedAt: new Date(), revokeReason: 'E2E revocation' },
    });
    const me = await agent.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.activeWorkspace).toBeNull();
    expect(me.body.workspaces).toHaveLength(0);
  });
});
