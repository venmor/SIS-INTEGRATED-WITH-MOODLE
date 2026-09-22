import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createRequire } from 'node:module';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { ExpiryDaemonService } from '../src/identity-access/expiry-daemon.service.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

// Slice-5 break-glass proofs (TASK-PH1-005 DoD, handbook §15.20/§12.11:
// REQ-SUP-005 — time-limited, reasoned, narrowly scoped, reviewed, audited).
// Requires a live dev database:
//   node scripts/with-env.mjs npm run test:e2e --workspace=apps/api
// Emergency access is minimal (one incident scope), time-bound (25-minute
// demo cap), approver-gated (never self), idempotent per incident+requestor,
// enhanced-audited, and fully revoked on expiry (sessions bound to it die —
// the justified exception to null-workspace degradation). Throwaway
// e2e.bg.* rows are swept afterwards.
const require = createRequire(import.meta.url);
const { hash } = require('argon2') as typeof import('argon2');

const CSRF = { 'x-requested-with': 'XMLHttpRequest' };

describe('break-glass (e2e)', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  let prisma: PrismaService;
  let daemon: ExpiryDaemonService;
  let server: unknown;
  const stamp = Date.now().toString(36);
  const assignmentIds: string[] = [];
  const requestIds: string[] = [];

  const makeUser = async (tag: string, password: string): Promise<string> => {
    const username = `e2e.bg.${tag}.${stamp}`;
    const person = await prisma.person.create({
      data: { displayName: `E2E breakglass ${tag}` },
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
    await prisma.breakGlassRequest.deleteMany({
      where: { id: { in: requestIds } },
    });
    await prisma.reviewSchedule.deleteMany({
      where: { assignmentId: { in: assignmentIds } },
    });
    const stale = await prisma.account.findMany({
      where: { username: { startsWith: 'e2e.bg.' } },
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
        where: { aggregateId: { in: [...assignmentIds, ...requestIds] } },
      });
      await prisma.auditEvent.deleteMany({
        where: {
          targetRef: { in: [...assignmentIds, ...requestIds, ...staleIds] },
        },
      });
      await prisma.idempotencyKey.deleteMany({
        // Stamp-scoped: never wipe parallel workers' in-flight keys.
        where: { key: { contains: stamp } },
      });
      await prisma.account.deleteMany({ where: { id: { in: staleIds } } });
    }
    await prisma.person.deleteMany({
      where: {
        displayName: { startsWith: 'E2E breakglass ' },
        accounts: { none: {} },
      },
    });
    await app.close();
  }, 60000);

  it('fails closed on bad shape, self-approval, over-long duration and unauthorized approvers', async () => {
    const username = await makeUser('closed', 'Long-Enough-Password-1');
    const requestor = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const approver = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    const agent = request.agent(server as never);
    await agent
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const base = {
      incidentRef: `INC-2026-CLOSED-${stamp}`,
      reason: 'payment outage recovery',
      scope: 'payment-recovery',
      durationMinutes: 25,
      approverId: approver.id,
    };

    const noIncident = await agent
      .post('/auth/break-glass')
      .set(CSRF)
      .send({ ...base, incidentRef: undefined });
    expect(noIncident.status).toBe(400);
    const self = await agent
      .post('/auth/break-glass')
      .set(CSRF)
      .send({ ...base, approverId: requestor.id });
    expect(self.status).toBe(400);
    const tooLong = await agent
      .post('/auth/break-glass')
      .set(CSRF)
      .send({ ...base, durationMinutes: 26 });
    expect(tooLong.status).toBe(400);
    // chanda.k holds no approver role: unauthorized approver is refused.
    const chanda = await prisma.account.findUniqueOrThrow({
      where: { username: 'chanda.k' },
    });
    const badApprover = await agent
      .post('/auth/break-glass')
      .set(CSRF)
      .send({ ...base, approverId: chanda.id });
    expect(badApprover.status).toBe(403);
    expect(badApprover.body.reference).toBeDefined();
  });

  it('grants minimal scoped access with enhanced audit and replays the same incident idempotently', async () => {
    const username = await makeUser('grant', 'Long-Enough-Password-1');
    const approver = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    const agent = request.agent(server as never);
    await agent
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const payload = {
      incidentRef: `INC-2026-GRANT-${stamp}`,
      reason: 'payment outage recovery',
      scope: 'payment-recovery',
      durationMinutes: 25,
      approverId: approver.id,
    };

    const first = await agent.post('/auth/break-glass').set(CSRF).send(payload);
    expect(first.status).toBe(201);
    expect(first.body.breakGlassId).toBeDefined();
    expect(first.body.expiresAt).toBeDefined();
    expect(first.body.reference).toBeDefined();
    requestIds.push(first.body.breakGlassId);

    const second = await agent
      .post('/auth/break-glass')
      .set(CSRF)
      .send(payload);
    expect(second.status).toBe(200);
    expect(second.body.breakGlassId).toBe(first.body.breakGlassId);
    expect(second.body.reference).toBeDefined();

    const requests = await prisma.breakGlassRequest.findMany({
      where: { incidentRef: payload.incidentRef },
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].status).toBe('active');
    const granted = await prisma.roleAssignment.findMany({
      where: { scopeType: 'BREAK_GLASS', scopeRef: payload.incidentRef },
    });
    expect(granted).toHaveLength(1);
    expect(granted[0].role).toBe('SYSADMIN');
    assignmentIds.push(granted[0].id);

    // Oldest first: the replay writes a second row for the same target, so
    // an unordered lookup can return either under parallel-suite load.
    const audit = await prisma.auditEvent.findFirst({
      where: { targetRef: granted[0].id, action: 'CMD-IAM-BreakGlass' },
      orderBy: { occurredAt: 'asc' },
    });
    expect(audit).toBeDefined();
    expect(audit?.outcome).toBe('ALLOW');
    expect(audit?.purpose).toBe('emergency-access');
    expect(audit?.reason).toBe('break-glass-granted');
    expect(audit?.metadata).toMatchObject({
      incidentRef: payload.incidentRef,
      durationMinutes: 25,
    });
    const outbox = await prisma.outboxEvent.findFirst({
      where: { aggregateId: granted[0].id, type: 'BreakGlassGranted' },
    });
    expect(outbox).toBeDefined();
    expect(outbox?.deliveredAt).not.toBeNull();
  });

  it('auto-revokes on expiry: request expires, sessions bound to it die', async () => {
    const username = await makeUser('expiry', 'Long-Enough-Password-1');
    const requestor = await prisma.account.findUniqueOrThrow({
      where: { username },
    });
    const approver = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    const agent = request.agent(server as never);
    await agent
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const payload = {
      incidentRef: `INC-2026-EXP-${stamp}`,
      reason: 'payment outage recovery',
      scope: 'payment-recovery',
      durationMinutes: 25,
      approverId: approver.id,
    };
    const granted = await agent
      .post('/auth/break-glass')
      .set(CSRF)
      .send(payload);
    expect(granted.status).toBe(201);
    requestIds.push(granted.body.breakGlassId);

    // The requestor switches into the emergency workspace (the only way to
    // exercise it) — this binds the session to the break-glass assignment.
    const entered = await agent
      .post('/auth/workspace/switch')
      .set(CSRF)
      .send({ assignmentId: granted.body.assignmentId });
    expect(entered.status).toBe(200);
    const active = await agent.get('/auth/me');
    expect(active.body.activeWorkspace?.assignmentId).toBe(
      granted.body.assignmentId,
    );

    // Every action under emergency access carries the incident tag: the
    // switch audit and a subsequent refused action both record it.
    const switchAudit = await prisma.auditEvent.findFirst({
      where: {
        targetRef: granted.body.assignmentId,
        action: 'CMD-IAM-SwitchWorkspace',
        outcome: 'ALLOW',
      },
      orderBy: { occurredAt: 'desc' },
    });
    expect(switchAudit?.metadata).toMatchObject({
      incidentRef: payload.incidentRef,
    });
    // ALS propagation: an action audited with no explicit metadata still
    // carries the incident while the session is inside emergency access.
    // (A ghost grant is denied pre-creation: no junk rows, one DENY audit.)
    const probeApprover = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    const ghost = await agent
      .post('/auth/grants')
      .set(CSRF)
      .send({
        username: `ghost.${stamp}`,
        role: 'TUT',
        scopeType: 'TUTORIAL_GROUP',
        scopeRef: 'E2E-BG-GHOST',
        startsAt: new Date().toISOString(),
        appointmentRef: 'HR-2026-101',
        authoritySource: 'University Appointments',
        approverId: probeApprover.id,
        reason: 'emergency probe grant',
      });
    expect(ghost.status).toBe(400);
    const refusedAudit = await prisma.auditEvent.findFirst({
      where: {
        actorAccountId: requestor.id,
        action: 'CMD-IAM-GrantRole',
        outcome: 'DENY',
      },
      orderBy: { occurredAt: 'desc' },
    });
    expect(refusedAudit?.metadata).toMatchObject({
      incidentRef: payload.incidentRef,
    });

    // Emergency window lapses; the daemon run ends it completely.
    const past = new Date(Date.now() - 1000);
    await prisma.breakGlassRequest.update({
      where: { id: granted.body.breakGlassId },
      data: { expiresAt: past },
    });
    const bgAssignment = await prisma.roleAssignment.findFirstOrThrow({
      where: { scopeType: 'BREAK_GLASS', scopeRef: payload.incidentRef },
    });
    assignmentIds.push(bgAssignment.id);
    await prisma.roleAssignment.update({
      where: { id: bgAssignment.id },
      data: { endsAt: past },
    });
    await daemon.runCheck();

    const bgRequest = await prisma.breakGlassRequest.findUniqueOrThrow({
      where: { id: granted.body.breakGlassId },
    });
    expect(bgRequest.status).toBe('expired');
    const me = await agent.get('/auth/me');
    expect(me.status).toBe(401);

    const audit = await prisma.auditEvent.findFirst({
      where: {
        targetRef: bgAssignment.id,
        action: 'CMD-IAM-BreakGlass',
        reason: 'break-glass-expired',
      },
    });
    expect(audit).toBeDefined();
    const outbox = await prisma.outboxEvent.findFirst({
      where: { aggregateId: bgAssignment.id, type: 'BreakGlassRevoked' },
    });
    expect(outbox).toBeDefined();
    expect(outbox?.deliveredAt).not.toBeNull();
    void requestor;
  });

  it('rate-limits emergency requests with neutral responses and references', async () => {
    const username = await makeUser('ratelimit', 'Long-Enough-Password-1');
    const approver = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    const agent = request.agent(server as never);
    await agent
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    // Grant budget is 20/hour shared across this file's posts: hammer with
    // unique incidents until held (bounded), then assert the neutral shape.
    let held = 0;
    let passed = 0;
    for (let i = 0; i < 25; i++) {
      const res = await agent
        .post('/auth/break-glass')
        .set(CSRF)
        .send({
          incidentRef: `INC-2026-RL-${stamp}-${i}`,
          reason: 'rate probe recovery',
          scope: 'probe',
          durationMinutes: 5,
          approverId: approver.id,
        });
      if (res.status === 429) {
        held += 1;
        expect(res.body.message).toContain('For your security');
        expect(res.body.reference).toBeDefined();
        expect(res.headers['retry-after']).toBeDefined();
        break;
      }
      expect(res.status).toBe(201);
      passed += 1;
      requestIds.push(res.body.breakGlassId);
      const created = await prisma.roleAssignment.findFirstOrThrow({
        where: {
          scopeType: 'BREAK_GLASS',
          scopeRef: `INC-2026-RL-${stamp}-${i}`,
        },
      });
      assignmentIds.push(created.id);
    }
    expect(passed).toBeGreaterThan(0);
    expect(held).toBe(1);
  });

  it('closes the loop with a post-use review: fields, audit and single outcome', async () => {
    const username = await makeUser('retro', 'Long-Enough-Password-1');
    const approver = await prisma.account.findUniqueOrThrow({
      where: { username: 'mweene.t' },
    });
    const agent = request.agent(server as never);
    await agent
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username, password: 'Long-Enough-Password-1' });
    const granted = await agent
      .post('/auth/break-glass')
      .set(CSRF)
      .send({
        incidentRef: `INC-2026-RETRO-${stamp}`,
        reason: 'retrospective probe recovery',
        scope: 'probe',
        durationMinutes: 5,
        approverId: approver.id,
      });
    expect(granted.status).toBe(201);
    requestIds.push(granted.body.breakGlassId);
    const created = await prisma.roleAssignment.findFirstOrThrow({
      where: { scopeType: 'BREAK_GLASS', scopeRef: `INC-2026-RETRO-${stamp}` },
    });
    assignmentIds.push(created.id);

    // Non-administrators cannot review.
    const refused = await agent
      .post(`/auth/break-glass/${granted.body.breakGlassId}/review`)
      .set(CSRF)
      .send({
        outcome: 'justified',
        note: 'outsider review attempt',
      });
    expect(refused.status).toBe(403);
    expect(refused.body.reference).toBeDefined();

    // Gate precedes loading: outsiders learn nothing from unknown ids (403,
    // never a 404 oracle).
    const strangerName = await makeUser('retro-out', 'Long-Enough-Password-1');
    const stranger = request.agent(server as never);
    await stranger
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: strangerName, password: 'Long-Enough-Password-1' });
    const oracle = await stranger
      .post('/auth/break-glass/123e4567-e89b-42d3-a456-426614174000/review')
      .set(CSRF)
      .send({ outcome: 'justified', note: 'oracle probe attempt' });
    expect(oracle.status).toBe(403);

    const admin = request.agent(server as never);
    await admin
      .post('/auth/sign-in')
      .set(CSRF)
      .send({ username: 'mweene.t', password: 'Seed-2026-Mweene' });
    const garbage = await admin
      .post(`/auth/break-glass/${granted.body.breakGlassId}/review`)
      .set(CSRF)
      .send({
        outcome: 'fine-i-guess',
        note: 'garbage outcome probe',
      });
    expect(garbage.status).toBe(400);

    const reviewed = await admin
      .post(`/auth/break-glass/${granted.body.breakGlassId}/review`)
      .set(CSRF)
      .send({
        outcome: 'justified',
        note: 'outage confirmed, scope respected',
      });
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.reference).toBeDefined();
    const row = await prisma.breakGlassRequest.findUniqueOrThrow({
      where: { id: granted.body.breakGlassId },
    });
    expect(row.reviewOutcome).toBe('justified');
    expect(row.reviewedBy).toBe(approver.id);
    expect(row.reviewedAt).not.toBeNull();

    const audit = await prisma.auditEvent.findFirst({
      where: {
        targetRef: granted.body.breakGlassId,
        action: 'CMD-IAM-BreakGlass',
        reason: 'post-use-reviewed',
      },
    });
    expect(audit).toBeDefined();
    const outbox = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId: granted.body.breakGlassId,
        type: 'BreakGlassReviewed',
      },
    });
    expect(outbox).toBeDefined();
    expect(outbox?.deliveredAt).not.toBeNull();

    const repeat = await admin
      .post(`/auth/break-glass/${granted.body.breakGlassId}/review`)
      .set(CSRF)
      .send({
        outcome: 'excessive',
        note: 'second thoughts here',
      });
    expect(repeat.status).toBe(409);
  });
});
