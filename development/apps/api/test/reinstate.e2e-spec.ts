import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createRequire } from 'node:module';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

// Slice-5 reinstatement proofs (TASK-PH1-005 DoD, handbook §12.13 row:
// "Role assignment is revoked in error → Use controlled reinstatement with
// reason and audit; do not edit old history"). Requires a live dev database:
//   node scripts/with-env.mjs npm run test:e2e --workspace=apps/api
// An erroneous revocation is reinstated with reason + evidence: history is
// preserved (old row stays revoked, a new row carries forward), audit links
// prior/new, and the target session works again. Throwaway e2e.rst.* rows
// are swept afterwards.
const require = createRequire(import.meta.url);
const { hash } = require('argon2') as typeof import('argon2');

const CSRF = { 'x-requested-with': 'XMLHttpRequest' };

describe('reinstate (e2e)', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let prisma: PrismaService;
  let server: unknown;
  const stamp = Date.now().toString(36);
  const assignmentIds: string[] = [];

  const makeUser = async (tag: string, password: string): Promise<string> => {
    const username = `e2e.rst.${tag}.${stamp}`;
    const person = await prisma.person.create({
      data: { displayName: `E2E reinstate ${tag}` },
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
      where: { username: { startsWith: 'e2e.rst.' } },
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
      await prisma.reviewSchedule.deleteMany({
        where: { assignmentId: { in: assignmentIds } },
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
      await prisma.idempotencyKey.deleteMany({
        where: { key: { in: assignmentIds.map((id) => `reinstate:${id}`) } },
      });
      await prisma.account.deleteMany({ where: { id: { in: staleIds } } });
    }
    await prisma.person.deleteMany({
      where: {
        displayName: { startsWith: 'E2E reinstate ' },
        accounts: { none: {} },
      },
    });
    await app.close();
  }, 60000);

  it('refuses non-administrators and reason/evidence-free requests', async () => {
    const username = await makeUser('deny', 'Long-Enough-Password-1');
    const target = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const assignment = await prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-RST-0',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'E2E reinstate deny grant',
      },
    });
    assignmentIds.push(assignment.id);
    await prisma.roleAssignment.update({
      where: { id: assignment.id },
      data: { revokedAt: new Date(), revokeReason: 'E2E erroneous revocation' },
    });

    const outsider = request.agent(server as never);
    await outsider
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const refused = await outsider.post('/auth/reinstate').set(CSRF).send({
      assignmentId: assignment.id,
      reason: 'erroneous revocation',
      evidence: 'review log',
    });
    expect(refused.status).toBe(403);
    expect(refused.body.reference).toBeDefined();

    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });
    const noReason = await admin
      .post('/auth/reinstate')
      .set(CSRF)
      .send({ assignmentId: assignment.id, evidence: 'x' });
    expect(noReason.status).toBe(400);
    const noEvidence = await admin
      .post('/auth/reinstate')
      .set(CSRF)
      .send({ assignmentId: assignment.id, reason: 'x' });
    expect(noEvidence.status).toBe(400);
    // Anti-garbage floor: trimmed single-word reasons are refused.
    const short = await admin.post('/auth/reinstate').set(CSRF).send({
      assignmentId: assignment.id,
      reason: 'x',
      evidence: 'y',
    });
    expect(short.status).toBe(400);
    const live = await admin.post('/auth/reinstate').set(CSRF).send({
      assignmentId: assignment.id,
      reason: 'shape probe reason',
      evidence: 'shape probe evidence',
    });
    // Still revoked at this point, but reason/evidence minimums hold shape;
    // real reinstatement is proven below. Accepts the shape (201).
    expect(live.status).toBe(201);
    assignmentIds.push(live.body.assignmentId);
  });

  it('reinstates an erroneous revocation with history preserved and session restored', async () => {
    const username = await makeUser('restore', 'Long-Enough-Password-1');
    const target = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const assignment = await prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-RST-1',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'E2E reinstate restore grant',
      },
    });
    assignmentIds.push(assignment.id);
    await prisma.roleAssignment.update({
      where: { id: assignment.id },
      data: { revokedAt: new Date(), revokeReason: 'E2E erroneous revocation' },
    });

    const agent = request.agent(server as never);
    await agent
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const before = await agent.get('/auth/me');
    expect(before.status).toBe(200);
    expect(before.body.activeWorkspace).toBeNull();

    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });
    const restored = await admin.post('/auth/reinstate').set(CSRF).send({
      assignmentId: assignment.id,
      reason: 'erroneous revocation',
      evidence: 'review log entry 42',
    });
    expect(restored.status).toBe(201);
    expect(restored.body.assignmentId).toBeDefined();
    expect(restored.body.assignmentId).not.toBe(assignment.id);
    expect(restored.body.reference).toBeDefined();
    assignmentIds.push(restored.body.assignmentId);

    // History preserved: the old row stays revoked.
    const prior = await prisma.roleAssignment.findUniqueOrThrow({
      where: { id: assignment.id },
    });
    expect(prior.revokedAt).not.toBeNull();
    const next = await prisma.roleAssignment.findUniqueOrThrow({
      where: { id: restored.body.assignmentId },
    });
    expect(next.revokedAt).toBeNull();
    expect(next.role).toBe('TUT');
    expect(next.scopeRef).toBe('E2E-RST-1');

    const audit = await prisma.auditEvent.findFirst({
      where: {
        targetRef: restored.body.assignmentId,
        action: 'CMD-IAM-ReinstateAssignment',
      },
    });
    expect(audit).toBeDefined();
    expect(audit?.outcome).toBe('ALLOW');
    expect(audit?.purpose).toBe('access-reinstatement');
    expect(audit?.priorState).toMatchObject({ assignmentId: assignment.id });
    expect(audit?.newState).toMatchObject({
      assignmentId: restored.body.assignmentId,
    });

    const outbox = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: restored.body.assignmentId,
        type: 'RoleAssignmentReinstated',
      },
    });
    expect(outbox).toBeDefined();
    expect(outbox?.deliveredAt).not.toBeNull();

    // Session restored: the target can switch into the reinstated workspace.
    const switched = await agent
      .post('/auth/workspace/switch')
      .set(CSRF)
      .send({ assignmentId: restored.body.assignmentId });
    expect(switched.status).toBe(200);
    const me = await agent.get('/auth/me');
    expect(me.body.activeWorkspace?.assignmentId).toBe(
      restored.body.assignmentId,
    );
  });

  it('fails closed on live assignments and unknown ids', async () => {
    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });
    const username = await makeUser('closed', 'Long-Enough-Password-1');
    const target = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const live = await prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-RST-2',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'E2E reinstate closed grant',
      },
    });
    assignmentIds.push(live.id);
    const onLive = await admin
      .post('/auth/reinstate')
      .set(CSRF)
      .send({ assignmentId: live.id, reason: 'oops', evidence: 'none' });
    expect(onLive.status).toBe(400);
    const ghost = await admin.post('/auth/reinstate').set(CSRF).send({
      assignmentId: '123e4567-e89b-12d3-a456-426614174000',
      reason: 'ghost probe reason',
      evidence: 'ghost probe evidence',
    });
    expect(ghost.status).toBe(404);
  });

  it('refuses to resurrect lapsed authority: expired-then-revoked stays dead', async () => {
    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });
    const username = await makeUser('lapsed', 'Long-Enough-Password-1');
    const target = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const lapsed = await prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-RST-3',
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 60 * 60 * 1000),
        reason: 'E2E reinstate lapsed grant',
      },
    });
    assignmentIds.push(lapsed.id);
    await prisma.roleAssignment.update({
      where: { id: lapsed.id },
      data: { revokedAt: new Date(), revokeReason: 'E2E lapse revocation' },
    });
    const res = await admin.post('/auth/reinstate').set(CSRF).send({
      assignmentId: lapsed.id,
      reason: 'please bring it back',
      evidence: 'verbal request',
    });
    expect(res.status).toBe(400);
    expect(res.body.reference).toBeDefined();
    const rows = await prisma.roleAssignment.findMany({
      where: { accountId: target.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].revokedAt).not.toBeNull();
  });

  it('replays idempotently: a repeated request returns the same new assignment', async () => {
    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });
    const username = await makeUser('replay', 'Long-Enough-Password-1');
    const target = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const prior = await prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-RST-4',
        startsAt: new Date(Date.now() - 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'E2E reinstate replay grant',
      },
    });
    assignmentIds.push(prior.id);
    await prisma.roleAssignment.update({
      where: { id: prior.id },
      data: { revokedAt: new Date(), revokeReason: 'E2E replay revocation' },
    });
    const payload = {
      assignmentId: prior.id,
      reason: 'erroneous revocation confirmed',
      evidence: 'review log entry 7',
    };
    const first = await admin.post('/auth/reinstate').set(CSRF).send(payload);
    expect(first.status).toBe(201);
    assignmentIds.push(first.body.assignmentId);
    const second = await admin.post('/auth/reinstate').set(CSRF).send(payload);
    expect(second.status).toBe(200);
    expect(second.body.assignmentId).toBe(first.body.assignmentId);
    expect(second.body.reference).toBeDefined();
    const rows = await prisma.roleAssignment.findMany({
      where: { accountId: target.id, revokedAt: null },
    });
    expect(rows).toHaveLength(1);
  });
});
