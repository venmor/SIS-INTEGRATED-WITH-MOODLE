import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createRequire } from 'node:module';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

// Slice-4 permission-policy proofs. Requires a live dev database:
//   node scripts/with-env.mjs npm run test:e2e --workspace=apps/api
// Covers: approver rules, idempotent grants + receipt replay, resolve
// endpoint, guard audits, prior/new audit refs, account-status gating.
// Throwaway e2e accounts and test-made grants are swept afterwards.
const require = createRequire(import.meta.url);
const { hash } = require('argon2') as typeof import('argon2');

const GRANT_DENIED = 'This change was not completed. Check the details and try again, or ask an administrator.';
const EMPTY_SCOPED = 'There are no records available in your current role and scope.';
const CSRF = { 'x-requested-with': 'XMLHttpRequest' };

describe('policy (e2e)', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let prisma: PrismaService;
  let server: unknown;
  const stamp = Date.now().toString(36);

  const signIn = (agent: { post(url: string): unknown }, username: string, password: string) =>
    (agent.post('/auth/sign-in') as ReturnType<typeof request>).set(CSRF).send({ username, password });

  const makeUser = async (tag: string, password: string): Promise<{ id: string; username: string }> => {
    const username = `e2e.pol.${tag}.${stamp}`;
    const person = await prisma.person.create({ data: { displayName: `E2E pol ${tag}` } });
    const account = await prisma.account.create({
      data: { personId: person.id, username, status: 'ACTIVE' },
    });
    await prisma.credential.create({
      data: { accountId: account.id, kind: 'PASSWORD', secretHash: await hash(password), status: 'ACTIVE' },
    });
    return { id: account.id, username };
  };

  const grantBody = (username: string, approverId: string, reason: string, extra?: Record<string, unknown>) => ({
    username,
    role: 'TUT',
    scopeType: 'TUTORIAL_GROUP',
    scopeRef: `SWE101-TG9-2026S1-${stamp}`,
    startsAt: '2026-03-01',
    appointmentRef: 'HR-2026-099',
    authoritySource: 'University Appointments',
    approverId,
    reason,
    ...extra,
  });

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
      where: { username: { startsWith: 'e2e.pol.' } },
      select: { id: true },
    });
    for (const account of stale) {
      await prisma.session.deleteMany({ where: { accountId: account.id } });
      await prisma.recoveryToken.deleteMany({ where: { accountId: account.id } });
      await prisma.credential.deleteMany({ where: { accountId: account.id } });
      await prisma.roleAssignment.deleteMany({ where: { accountId: account.id } });
      await prisma.idempotencyKey.deleteMany({ where: { accountId: account.id } });
      await prisma.account.delete({ where: { id: account.id } });
    }
    await prisma.person.deleteMany({
      where: { displayName: { startsWith: 'E2E pol ' }, accounts: { none: {} } },
    });
    await prisma.roleAssignment.deleteMany({ where: { reason: { startsWith: 'E2E pol grant ' } } });
    await app.close();
  }, 60000);

  it('requires a real approver who is never the target', async () => {
    const admin = request.agent(server as never);
    await (signIn(admin, 'mweene.t', 'Seed-2026-Mweene') as unknown as Promise<{ status: number }>);
    const target = await makeUser('appr', 'Long-Enough-Password-1');
    const mweene = await prisma.account.findUniqueOrThrow({ where: { username: 'mweene.t' } });
    const missing = await admin
      .post('/auth/grants')
      .set(CSRF)
      .send({ ...grantBody(target.username, mweene.id, `E2E pol grant ${stamp}`), approverId: undefined });
    expect(missing.status).toBe(400);
    const ghostApprover = await admin
      .post('/auth/grants')
      .set(CSRF)
      .send(grantBody(target.username, '123e4567-e89b-12d3-a456-426614174000', `E2E pol grant ${stamp}`));
    expect(ghostApprover.status).toBe(400);
    expect(ghostApprover.body.message).toBe(GRANT_DENIED);
    const selfApproved = await admin
      .post('/auth/grants')
      .set(CSRF)
      .send(grantBody(target.username, target.id, `E2E pol grant ${stamp}`));
    expect(selfApproved.status).toBe(403);
    expect(selfApproved.body.message).toBe(GRANT_DENIED);
  });

  it('replays identical grants from one idempotency key without duplication', async () => {
    const admin = request.agent(server as never);
    await (signIn(admin, 'mweene.t', 'Seed-2026-Mweene') as unknown as Promise<{ status: number }>);
    const target = await makeUser('idem', 'Long-Enough-Password-1');
    const mweene = await prisma.account.findUniqueOrThrow({ where: { username: 'mweene.t' } });
    const key = randomUUID();
    const first = await admin
      .post('/auth/grants')
      .set(CSRF)
      .send(grantBody(target.username, mweene.id, `E2E pol grant ${stamp}`, { idempotencyKey: key }));
    expect(first.status).toBe(201);
    const second = await admin
      .post('/auth/grants')
      .set(CSRF)
      .send(grantBody(target.username, mweene.id, `E2E pol grant ${stamp}`, { idempotencyKey: key }));
    expect(second.status).toBe(201);
    expect(second.body.assignmentId).toBe(first.body.assignmentId);
    const rows = await prisma.roleAssignment.count({
      where: { accountId: target.id, reason: `E2E pol grant ${stamp}` },
    });
    expect(rows).toBe(1);
    const replay = await prisma.auditEvent.findFirstOrThrow({
      where: {
        action: 'CMD-IAM-GrantRole',
        outcome: 'ALLOW',
        targetRef: first.body.assignmentId,
        reason: 'idempotent-replay',
      },
    });
    expect(replay.newState).toMatchObject({ assignmentId: first.body.assignmentId });
    const receipt = await admin.get(`/auth/commands/${key}`);
    expect(receipt.status).toBe(200);
    expect(receipt.body.response.assignmentId).toBe(first.body.assignmentId);
    expect(receipt.body.response.type).toBe('CMD-IAM-GrantRole');
    expect(receipt.body.response.occurredAt).toBeDefined();
    const user = request.agent(server as never);
    await (signIn(user, 'chanda.k', 'Seed-2026-Chanda') as unknown as Promise<{ status: number }>);
    const foreign = await user.get(`/auth/commands/${key}`);
    expect(foreign.status).toBe(404);
  });

  it('resolves grant targets for grantors, empty for unknown, uniform for others', async () => {
    const admin = request.agent(server as never);
    await (signIn(admin, 'mweene.t', 'Seed-2026-Mweene') as unknown as Promise<{ status: number }>);
    const found = await admin.post('/auth/grants/resolve').set(CSRF).send({ username: 'chanda.k' });
    expect(found.status).toBe(200);
    expect(found.body.username).toBe('chanda.k');
    expect(found.body.displayName).toBeDefined();
    expect(found.body.reference).toBeDefined();
    expect(found.body).not.toHaveProperty('accountId');
    const missing = await admin.post('/auth/grants/resolve').set(CSRF).send({ username: `ghost.${stamp}` });
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe(EMPTY_SCOPED);
    const user = request.agent(server as never);
    await (signIn(user, 'chanda.k', 'Seed-2026-Chanda') as unknown as Promise<{ status: number }>);
    const denied = await user.post('/auth/grants/resolve').set(CSRF).send({ username: 'mutinta.l' });
    expect(denied.status).toBe(403);
    expect(denied.body.message).toBe(GRANT_DENIED);
    const deniedGhost = await user.post('/auth/grants/resolve').set(CSRF).send({ username: `ghost.${stamp}` });
    expect(deniedGhost.status).toBe(403);
    expect(deniedGhost.body.message).toBe(GRANT_DENIED);
  });

  it('audits guard rejections and records purpose plus prior/new refs on grants', async () => {
    const before = await prisma.auditEvent.count({ where: { action: 'CMD-IAM-Guard' } });
    const anon = await request(server as never).get('/auth/me');
    expect(anon.status).toBe(401);
    const after = await prisma.auditEvent.count({ where: { action: 'CMD-IAM-Guard' } });
    expect(after).toBeGreaterThan(before);
    const admin = request.agent(server as never);
    await (signIn(admin, 'mweene.t', 'Seed-2026-Mweene') as unknown as Promise<{ status: number }>);
    const target = await makeUser('audit', 'Long-Enough-Password-1');
    const mweene = await prisma.account.findUniqueOrThrow({ where: { username: 'mweene.t' } });
    const reason = `E2E pol grant ${stamp}`;
    const created = await admin.post('/auth/grants').set(CSRF).send(grantBody(target.username, mweene.id, reason));
    expect(created.status).toBe(201);
    const row = await prisma.auditEvent.findFirstOrThrow({
      where: { action: 'CMD-IAM-GrantRole', outcome: 'ALLOW', targetRef: created.body.assignmentId },
    });
    expect(row.purpose).toBe(reason);
    expect(row.activeRole).toBe('SYSADMIN');
    expect(row.priorState).toBeNull();
    expect(row.newState).toMatchObject({ assignmentId: created.body.assignmentId, role: 'TUT' });
  });

  it('emits the full §12.9 event chain and records the idempotency key', async () => {
    const admin = request.agent(server as never);
    await (signIn(admin, 'mweene.t', 'Seed-2026-Mweene') as unknown as Promise<{ status: number }>);
    const target = await makeUser('chain', 'Long-Enough-Password-1');
    const mweene = await prisma.account.findUniqueOrThrow({ where: { username: 'mweene.t' } });
    const key = randomUUID();
    const reason = `E2E pol grant ${stamp}`;
    const created = await admin
      .post('/auth/grants')
      .set(CSRF)
      .send({
        ...grantBody(target.username, mweene.id, reason, { idempotencyKey: key }),
        endsAt: '2026-12-31',
      });
    expect(created.status).toBe(201);
    const events = await prisma.outboxEvent.findMany({
      where: { aggregateId: created.body.assignmentId },
    });
    // Same-transaction chain (creation order shares a timestamp, so compare
    // as a set — atomicity is the assertion, not row order).
    expect(events.map((e) => e.type).sort()).toEqual(
      [
        'RoleAssignmentRequested',
        'RoleAssignmentApproved',
        'RoleAssignmentActivated',
        'RoleAssignmentExpiryScheduled',
      ].sort(),
    );
    const row = await prisma.auditEvent.findFirstOrThrow({
      where: { action: 'CMD-IAM-GrantRole', outcome: 'ALLOW', targetRef: created.body.assignmentId },
    });
    expect(row.idempotencyRef).toBe(key);
  });

  it('gates non-Active account statuses without disclosure', async () => {
    const victim = await makeUser('status', 'Long-Enough-Password-1');
    for (const status of ['Closed', 'VerificationRequired', 'RecoveryPending']) {
      await prisma.account.update({ where: { id: victim.id }, data: { status } });
      const res = await request(server as never)
        .post('/auth/sign-in')
        .set(CSRF)
        .send({ username: victim.username, password: 'Long-Enough-Password-1' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe(
        'We could not sign you in with those details. Check them and try again, or reset your password.',
      );
    }
  });
});
