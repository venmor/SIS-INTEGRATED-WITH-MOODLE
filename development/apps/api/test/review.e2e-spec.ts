import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createRequire } from 'node:module';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

// Slice-5 review proofs (TASK-PH1-005 DoD). Requires a live dev database:
//   node scripts/with-env.mjs npm run test:e2e --workspace=apps/api
// Quarterly-by-risk review (handbook §12.12): a reviewer lists pending
// schedules, decides revoke with reason, the assignment dies transactionally
// while the target session degrades to null workspace (never full logout),
// the next protected act answers the §12.12 sentence, and audit carries the
// CMD-IAM-ReviewAssignment shape with prior/new refs. Seed reviewer mweene.t
// (SYSADMIN) stands in for the IAM Administrator; throwaway e2e.rev.* rows
// are swept afterwards.
const require = createRequire(import.meta.url);
const { hash } = require('argon2') as typeof import('argon2');

const ASSIGNMENT_CHANGED =
  'Your role assignment has changed. This action was not completed.';
const CSRF = { 'x-requested-with': 'XMLHttpRequest' };

describe('review (e2e)', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let prisma: PrismaService;
  let server: unknown;
  const stamp = Date.now().toString(36);
  const assignmentIds: string[] = [];

  const makeUser = async (tag: string, password: string): Promise<string> => {
    const username = `e2e.rev.${tag}.${stamp}`;
    const person = await prisma.person.create({
      data: { displayName: `E2E review ${tag}` },
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
    await prisma.reviewSchedule.deleteMany({
      where: { assignmentId: { in: assignmentIds } },
    });
    const stale = await prisma.account.findMany({
      where: { username: { startsWith: 'e2e.rev.' } },
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
        displayName: { startsWith: 'E2E review ' },
        accounts: { none: {} },
      },
    });
    await app.close();
  }, 60000);

  it('lists pending reviews for reviewers and refuses non-reviewers without disclosure', async () => {
    const username = await makeUser('list', 'Long-Enough-Password-1');
    const target = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const reviewer = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    const assignment = await prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-REV-1',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'E2E review list grant',
      },
    });
    assignmentIds.push(assignment.id);
    await prisma.reviewSchedule.create({
      data: {
        assignmentId: assignment.id,
        reviewerId: reviewer.id,
        riskLevel: 'high',
        cadence: 'quarterly',
        nextDueAt: new Date(Date.now() - 1000),
        status: 'pending',
      },
    });

    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });
    const listed = await admin
      .get('/auth/reviews')
      .query({ status: 'pending' });
    expect(listed.status).toBe(200);
    expect(Array.isArray(listed.body)).toBe(true);
    expect(
      listed.body.map((r: { assignmentId: string }) => r.assignmentId),
    ).toContain(assignment.id);

    const outsider = request.agent(server as never);
    await outsider
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const refused = await outsider.get('/auth/reviews');
    expect(refused.status).toBe(403);
    expect(refused.body.reference).toBeDefined();
  });

  it('decides revoke with reason: assignment dies, session degrades to null, audit carries prior/new', async () => {
    const username = await makeUser('revoke', 'Long-Enough-Password-1');
    const target = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const reviewer = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    const assignment = await prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-REV-2',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'E2E review revoke grant',
      },
    });
    assignmentIds.push(assignment.id);
    // Survivor keeps the target authenticated overall (policy passes, the
    // dead assignment answers §12.12 on next use).
    await prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-REV-2B',
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'E2E review survivor grant',
      },
    });
    const schedule = await prisma.reviewSchedule.create({
      data: {
        assignmentId: assignment.id,
        reviewerId: reviewer.id,
        riskLevel: 'high',
        cadence: 'quarterly',
        nextDueAt: new Date(Date.now() - 1000),
        status: 'pending',
      },
    });

    const agent = request.agent(server as never);
    await agent
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });

    const decided = await admin
      .post(`/auth/reviews/${schedule.id}/decide`)
      .set(CSRF)
      .send({ decision: 'revoke', reason: 'No longer required' });
    expect(decided.status).toBe(200);

    const revoked = await prisma.roleAssignment.findUniqueOrThrow({
      where: { id: assignment.id },
    });
    expect(revoked.revokedAt).not.toBeNull();

    // Session survives with a null workspace; the dead assignment answers §12.12.
    const me = await agent.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.activeWorkspace).toBeNull();
    const switched = await agent
      .post('/auth/workspace/switch')
      .set(CSRF)
      .send({ assignmentId: assignment.id });
    expect(switched.status).toBe(400);
    expect(switched.body.message).toBe(ASSIGNMENT_CHANGED);
    expect(switched.body.reference).toBeDefined();

    const audit = await prisma.auditEvent.findFirst({
      where: { targetRef: assignment.id, action: 'CMD-IAM-ReviewAssignment' },
    });
    expect(audit).toBeDefined();
    expect(audit?.outcome).toBe('DENY');
    expect(audit?.reason).toBe('revoked-by-review');
    expect(audit?.purpose).toBe('access-review');
    expect(audit?.priorState).toMatchObject({ revokedAt: null });
    expect(audit?.newState).toMatchObject({ assignmentId: assignment.id });

    const outbox = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: schedule.id,
        type: 'RoleAssignmentReviewCompleted',
      },
    });
    expect(outbox).toBeDefined();
    expect(outbox?.deliveredAt).not.toBeNull();

    // Replay and garbage decisions fail closed with client errors, never 500.
    const replay = await admin
      .post(`/auth/reviews/${schedule.id}/decide`)
      .set(CSRF)
      .send({ decision: 'revoke', reason: 'Decided again after review' });
    expect(replay.status).toBe(409);
    const garbage = await admin
      .post(`/auth/reviews/${schedule.id}/decide`)
      .set(CSRF)
      .send({ decision: 'delete-everything', reason: 'x' });
    expect(garbage.status).toBe(400);
  });

  it('serializes concurrent decisions: one wins, the other gets 409, single audit trail', async () => {
    const username = await makeUser('race', 'Long-Enough-Password-1');
    const target = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const reviewer = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    const assignment = await prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-REV-RACE',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'E2E review race grant',
      },
    });
    assignmentIds.push(assignment.id);
    const schedule = await prisma.reviewSchedule.create({
      data: {
        assignmentId: assignment.id,
        reviewerId: reviewer.id,
        riskLevel: 'high',
        cadence: 'quarterly',
        nextDueAt: new Date(Date.now() - 1000),
        status: 'pending',
      },
    });
    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });
    const decide = () =>
      admin
        .post(`/auth/reviews/${schedule.id}/decide`)
        .set(CSRF)
        .send({ decision: 'confirm', reason: 'still required' });
    const [first, second] = await Promise.all([decide(), decide()]);
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);
    const audits = await prisma.auditEvent.count({
      where: {
        targetRef: assignment.id,
        action: 'CMD-IAM-ReviewAssignment',
        outcome: 'ALLOW',
      },
    });
    expect(audits).toBe(1);
    const outbox = await prisma.outboxEvent.count({
      where: {
        aggregateId: schedule.id,
        type: 'RoleAssignmentReviewCompleted',
      },
    });
    expect(outbox).toBe(1);
  });

  it('fails closed when the scheduled assignment is already dead: history untouched', async () => {
    const username = await makeUser('dead', 'Long-Enough-Password-1');
    const target = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const reviewer = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    const assignment = await prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-REV-DEAD',
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'E2E review dead grant',
      },
    });
    assignmentIds.push(assignment.id);
    await prisma.roleAssignment.update({
      where: { id: assignment.id },
      data: { revokedAt: new Date(), revokeReason: 'original revocation' },
    });
    const schedule = await prisma.reviewSchedule.create({
      data: {
        assignmentId: assignment.id,
        reviewerId: reviewer.id,
        riskLevel: 'high',
        cadence: 'quarterly',
        nextDueAt: new Date(Date.now() - 1000),
        status: 'pending',
      },
    });
    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });
    const res = await admin
      .post(`/auth/reviews/${schedule.id}/decide`)
      .set(CSRF)
      .send({ decision: 'revoke', reason: 'revoke again' });
    expect(res.status).toBe(400);
    const untouched = await prisma.roleAssignment.findUniqueOrThrow({
      where: { id: assignment.id },
    });
    expect(untouched.revokeReason).toBe('original revocation');
    const open = await prisma.reviewSchedule.findUniqueOrThrow({
      where: { id: schedule.id },
    });
    expect(open.status).toBe('pending');

    // Confirming a dead assignment is equally meaningless.
    const scheduleB = await prisma.reviewSchedule.create({
      data: {
        assignmentId: assignment.id,
        reviewerId: reviewer.id,
        riskLevel: 'high',
        cadence: 'quarterly',
        nextDueAt: new Date(Date.now() - 1000),
        status: 'pending',
      },
    });
    const confirmDead = await admin
      .post(`/auth/reviews/${scheduleB.id}/decide`)
      .set(CSRF)
      .send({ decision: 'confirm', reason: 'confirming a dead row anyway' });
    expect(confirmDead.status).toBe(400);
    await prisma.reviewSchedule.delete({ where: { id: scheduleB.id } });
  });

  it('refuses self-decisions: reviewers never decide their own assignments', async () => {
    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mutinta.l', password: 'Seed-2026-Mutinta' });
    const reviewer = await prisma.account.findUniqueOrThrow({
      where: { username: 'mutinta.l' },
    });
    // Direct insert: API grants refuse self-assignment, but the review layer
    // must still refuse self-decisions on rows that exist anyway.
    const assignment = await prisma.roleAssignment.create({
      data: {
        accountId: reviewer.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-REV-SELF',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: `E2E rev self grant ${stamp}`,
      },
    });
    const schedule = await prisma.reviewSchedule.create({
      data: {
        assignmentId: assignment.id,
        reviewerId: reviewer.id,
        riskLevel: 'medium',
        cadence: 'annual',
        nextDueAt: new Date(Date.now() - 1000),
        status: 'pending',
      },
    });
    const res = await admin
      .post(`/auth/reviews/${schedule.id}/decide`)
      .set(CSRF)
      .send({ decision: 'confirm', reason: 'self-approving my own access' });
    expect(res.status).toBe(403);
    expect(res.body.reference).toBeDefined();
    await prisma.reviewSchedule.delete({ where: { id: schedule.id } });
    await prisma.roleAssignment.delete({ where: { id: assignment.id } });
  });

  it('keeps clarified reviews pending for follow-up and defers unspecified decisions', async () => {
    const username = await makeUser('clarify', 'Long-Enough-Password-1');
    const target = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    // mutinta.l (DEAN) exercises the non-SYSADMIN reviewer path.
    const reviewer = await prisma.account.findUniqueOrThrow({
      where: { username: 'mutinta.l' },
    });
    const assignment = await prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-REV-CLAR',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'E2E review clarify grant',
      },
    });
    assignmentIds.push(assignment.id);
    const schedule = await prisma.reviewSchedule.create({
      data: {
        assignmentId: assignment.id,
        reviewerId: reviewer.id,
        riskLevel: 'medium',
        cadence: 'annual',
        nextDueAt: new Date(Date.now() - 1000),
        status: 'pending',
      },
    });
    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mutinta.l', password: 'Seed-2026-Mutinta' });

    const clarified = await admin
      .post(`/auth/reviews/${schedule.id}/decide`)
      .set(CSRF)
      .send({ decision: 'clarify', reason: 'need appointment evidence first' });
    expect(clarified.status).toBe(200);
    const stillOpen = await prisma.reviewSchedule.findUniqueOrThrow({
      where: { id: schedule.id },
    });
    expect(stillOpen.status).toBe('pending');

    // Follow-up decide still works after clarification.
    const confirmed = await admin
      .post(`/auth/reviews/${schedule.id}/decide`)
      .set(CSRF)
      .send({ decision: 'confirm', reason: 'evidence now on file' });
    expect(confirmed.status).toBe(200);
    const done = await prisma.reviewSchedule.findUniqueOrThrow({
      where: { id: schedule.id },
    });
    expect(done.status).toBe('completed');
    expect(done.decision).toBe('confirm');

    // Unspecified decisions fail closed with a deferred code, never silently.
    const assignment2 = await prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-REV-DEF',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'E2E review deferred grant',
      },
    });
    assignmentIds.push(assignment2.id);
    const schedule2 = await prisma.reviewSchedule.create({
      data: {
        assignmentId: assignment2.id,
        reviewerId: reviewer.id,
        riskLevel: 'medium',
        cadence: 'annual',
        nextDueAt: new Date(Date.now() - 1000),
        status: 'pending',
      },
    });
    for (const decision of ['reduce', 'reassign']) {
      const deferred = await admin
        .post(`/auth/reviews/${schedule2.id}/decide`)
        .set(CSRF)
        .send({ decision, reason: 'please do this thing' });
      expect(deferred.status).toBe(400);
      expect(deferred.body.reference).toBeDefined();
    }
    const untouched = await prisma.reviewSchedule.findUniqueOrThrow({
      where: { id: schedule2.id },
    });
    expect(untouched.status).toBe('pending');
  });

  it('schedules a review when a grant is created: risk, cadence and due date', async () => {
    const targetName = await makeUser('sched', 'Long-Enough-Password-1');
    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });
    const mweene = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    const before = Date.now();
    const granted = await admin
      .post('/auth/grants')
      .set(CSRF)
      .send({
        username: targetName,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-REV-SCHED',
        startsAt: new Date().toISOString(),
        appointmentRef: 'HR-2026-100',
        authoritySource: 'University Appointments',
        approverId: mweene.id,
        reason: `E2E rev schedule grant ${stamp}`,
      });
    expect(granted.status).toBe(201);
    assignmentIds.push(granted.body.assignmentId);
    const schedule = await prisma.reviewSchedule.findFirst({
      where: { assignmentId: granted.body.assignmentId, status: 'pending' },
    });
    expect(schedule).toBeDefined();
    // TUT maps to low risk → annual cadence → ~180 days out.
    expect(schedule?.riskLevel).toBe('low');
    expect(schedule?.cadence).toBe('annual');
    expect(schedule?.reviewerId).toBe(mweene.id);
    const dueInDays =
      (schedule!.nextDueAt.getTime() - before) / (24 * 60 * 60 * 1000);
    expect(dueInDays).toBeGreaterThan(179);
    expect(dueInDays).toBeLessThan(181);
  });

  it('reads one review by id for reviewers; others get neutral refusals', async () => {
    const reviewer = request.agent(server as never);
    await reviewer
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mutinta.l', password: 'Seed-2026-Mutinta' });
    const targetId = assignmentIds[0];
    const schedule = await prisma.reviewSchedule.findFirstOrThrow({
      where: { assignmentId: targetId },
    });
    const found = await reviewer.get(`/auth/reviews/${schedule.id}`);
    expect(found.status).toBe(200);
    expect(found.body.id).toBe(schedule.id);
    expect(found.body.assignmentId).toBe(targetId);

    const outsider = request.agent(server as never);
    const username = await makeUser('byid', 'Long-Enough-Password-1');
    await outsider
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const refused = await outsider.get(`/auth/reviews/${schedule.id}`);
    expect(refused.status).toBe(403);
    expect(refused.body.reference).toBeDefined();
    const ghost = await reviewer.get(
      '/auth/reviews/123e4567-e89b-42d3-a456-426614174000',
    );
    expect(ghost.status).toBe(404);
  });
});
