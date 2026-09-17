import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createRequire } from 'node:module';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { ExpiryDaemonService } from '../src/identity-access/expiry-daemon.service.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

// Slice-5 expiry-daemon proofs (TASK-PH1-005 DoD). Requires a live dev database:
//   node scripts/with-env.mjs npm run test:e2e --workspace=apps/api
// Flow: live assignment → endsAt lapses → runCheck() revokes transactionally
// (assignment + sessions + audit + outbox + warning + daemon state) → session
// guard resolves null workspace on safe reads → protected switch answers the
// §12.12 sentence → replay is idempotent. Throwaway e2e.exp.* rows are swept.
const require = createRequire(import.meta.url);
const { hash } = require('argon2') as typeof import('argon2');

const ASSIGNMENT_CHANGED =
  'Your role assignment has changed. This action was not completed.';
const CSRF = { 'x-requested-with': 'XMLHttpRequest' };

describe('expiry-daemon (e2e)', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let prisma: PrismaService;
  let daemon: ExpiryDaemonService;
  let server: unknown;
  const stamp = Date.now().toString(36);
  const assignmentIds: string[] = [];

  const makeUser = async (tag: string, password: string): Promise<string> => {
    const username = `e2e.exp.${tag}.${stamp}`;
    const person = await prisma.person.create({
      data: { displayName: `E2E expiry ${tag}` },
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
    daemon = app.get(ExpiryDaemonService);
  });

  afterAll(async () => {
    const stale = await prisma.account.findMany({
      where: { username: { startsWith: 'e2e.exp.' } },
      select: { id: true },
    });
    const staleIds = stale.map((a) => a.id);
    if (staleIds.length > 0) {
      await prisma.session.deleteMany({
        where: { accountId: { in: staleIds } },
      });
      await prisma.recoveryToken.deleteMany({
        where: { accountId: { in: staleIds } },
      });
      await prisma.credential.deleteMany({
        where: { accountId: { in: staleIds } },
      });
      await prisma.roleAssignment.deleteMany({
        where: { accountId: { in: staleIds } },
      });
      await prisma.expiryWarning.deleteMany({
        where: { assignmentId: { in: assignmentIds } },
      });
      await prisma.outboxEvent.deleteMany({
        where: { aggregateId: { in: assignmentIds } },
      });
      await prisma.auditEvent.deleteMany({
        where: { targetRef: { in: assignmentIds } },
      });
      await prisma.account.deleteMany({ where: { id: { in: staleIds } } });
    }
    await prisma.person.deleteMany({
      where: {
        displayName: { startsWith: 'E2E expiry ' },
        accounts: { none: {} },
      },
    });
    await app.close();
  }, 60000);

  it('auto-revokes a lapsed assignment with full audit shape, warning, outbox and daemon state', async () => {
    const username = await makeUser('daemon', 'Long-Enough-Password-1');
    const account = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const assignment = await prisma.roleAssignment.create({
      data: {
        accountId: account.id,
        role: 'TUT',
        scopeType: 'COURSE',
        scopeRef: 'E2E101-2026S1',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 60 * 60 * 1000),
        reason: 'E2E expiry daemon grant',
      },
    });
    assignmentIds.push(assignment.id);
    // A second live assignment survives: the user stays active overall while
    // the first assignment lapses (the §12.12 "composing while access
    // changes" shape — policy still passes, liveness answers the sentence).
    await prisma.roleAssignment.create({
      data: {
        accountId: account.id,
        role: 'TUT',
        scopeType: 'COURSE',
        scopeRef: 'E2E102-2026S1',
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        reason: 'E2E expiry daemon survivor',
      },
    });

    // Live session opens on the new assignment (deterministic default).
    const agent = request.agent(server as never);
    await agent
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const before = await agent.get('/auth/me');
    expect(before.status).toBe(200);
    expect(before.body.activeWorkspace?.assignmentId).toBe(assignment.id);

    // The end date lapses; the daemon run revokes transactionally.
    await prisma.roleAssignment.update({
      where: { id: assignment.id },
      data: { endsAt: new Date(Date.now() - 1000) },
    });
    await daemon.runCheck();

    const revoked = await prisma.roleAssignment.findUniqueOrThrow({
      where: { id: assignment.id },
    });
    expect(revoked.revokedAt).not.toBeNull();
    expect(revoked.revokeReason).toContain('expiry');

    // Safe reads keep working with a null workspace (session itself valid).
    const me = await agent.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.activeWorkspace).toBeNull();
    expect(me.body.workspaces).toHaveLength(1);

    // Protected switch to the dead assignment answers the §12.12 sentence.
    const switched = await agent
      .post('/auth/workspace/switch')
      .set(CSRF)
      .send({ assignmentId: assignment.id });
    expect(switched.status).toBe(400);
    expect(switched.body.message).toBe(ASSIGNMENT_CHANGED);
    expect(switched.body.reference).toBeDefined();

    // Audit carries purpose + prior/new state + support reference.
    const audit = await prisma.auditEvent.findFirst({
      where: { targetRef: assignment.id, action: 'CMD-IAM-ExpiryDaemon' },
    });
    expect(audit).toBeDefined();
    expect(audit?.outcome).toBe('DENY');
    expect(audit?.reason).toBe('revoked-by-expiry');
    expect(audit?.purpose).toBe('role-expiry');
    expect(audit?.correlationId).toBeDefined();
    expect(audit?.priorState).toMatchObject({ revokedAt: null });
    expect(audit?.newState).toMatchObject({ assignmentId: assignment.id });

    // Outbox event is recorded and marked delivered (processed, idempotent).
    const outbox = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: assignment.id,
        type: 'RoleAssignmentRevokedByExpiry',
      },
    });
    expect(outbox).toBeDefined();
    expect(outbox?.deliveredAt).not.toBeNull();

    // An expiry warning exists for the revoked assignment.
    const warning = await prisma.expiryWarning.findFirst({
      where: { assignmentId: assignment.id },
    });
    expect(warning).toBeDefined();

    // Daemon state advances observability.
    const state = await prisma.expiryDaemonState.findFirst();
    expect(state).toBeDefined();
    expect(state?.processedCount).toBeGreaterThanOrEqual(1);
    expect(state?.lastRunAt).toBeDefined();
  });

  it('replays idempotently: a second run writes no duplicate audit or outbox rows', async () => {
    const targetId = assignmentIds[0];
    const auditBefore = await prisma.auditEvent.count({
      where: { targetRef: targetId, action: 'CMD-IAM-ExpiryDaemon' },
    });
    const outboxBefore = await prisma.outboxEvent.count({
      where: { aggregateId: targetId, type: 'RoleAssignmentRevokedByExpiry' },
    });
    expect(auditBefore).toBe(1);
    expect(outboxBefore).toBe(1);

    await daemon.runCheck();

    const auditAfter = await prisma.auditEvent.count({
      where: { targetRef: targetId, action: 'CMD-IAM-ExpiryDaemon' },
    });
    const outboxAfter = await prisma.outboxEvent.count({
      where: { aggregateId: targetId, type: 'RoleAssignmentRevokedByExpiry' },
    });
    expect(auditAfter).toBe(1);
    expect(outboxAfter).toBe(1);
  });

  it('drains batches past 100 in deterministic order with exact counts', async () => {
    const username = await makeUser('bulk', 'Long-Enough-Password-1');
    const account = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const past = new Date(Date.now() - 1000);
    const ids: string[] = [];
    for (let i = 0; i < 105; i++) {
      const row = await prisma.roleAssignment.create({
        data: {
          accountId: account.id,
          role: 'TUT',
          scopeType: 'COURSE',
          scopeRef: `E2E-BULK-${stamp}-${i}`,
          startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          endsAt: past,
          reason: 'E2E bulk expiry grant',
        },
      });
      ids.push(row.id);
      assignmentIds.push(row.id);
    }
    const stateBefore = await prisma.expiryDaemonState.findFirst();
    await daemon.runCheck();
    const remaining = await prisma.roleAssignment.count({
      where: { id: { in: ids }, revokedAt: null },
    });
    expect(remaining).toBe(0);
    const revoked = await prisma.outboxEvent.count({
      where: {
        aggregateId: { in: ids },
        type: 'RoleAssignmentRevokedByExpiry',
      },
    });
    // Exactly-once per row even when parallel suites' ticks race this one
    // (guarded claims): one outbox row each, no duplicates, no misses.
    expect(revoked).toBe(105);
    const stateAfter = await prisma.expiryDaemonState.findFirst();
    expect(stateAfter).toBeDefined();
    expect(Date.now() - stateAfter!.lastRunAt.getTime()).toBeLessThan(
      5 * 60 * 1000,
    );
    void stateBefore;
  });

  it('records daemon state even on idle ticks', async () => {
    await daemon.runCheck();
    const state = await prisma.expiryDaemonState.findFirst();
    expect(state).toBeDefined();
    expect(Date.now() - state!.lastRunAt.getTime()).toBeLessThan(5 * 60 * 1000);
    expect(state!.nextRunAt.getTime()).toBeGreaterThan(
      state!.lastRunAt.getTime(),
    );
  });

  it('never holds two open warnings for one assignment', async () => {
    const targetId = assignmentIds[0];
    await prisma.expiryWarning.deleteMany({
      where: { assignmentId: targetId },
    });
    await prisma.expiryWarning.create({ data: { assignmentId: targetId } });
    const duplicate = prisma.expiryWarning.create({
      data: { assignmentId: targetId },
    });
    await expect(duplicate).rejects.toThrow();
    await prisma.expiryWarning.deleteMany({
      where: { assignmentId: targetId },
    });
  });
});
