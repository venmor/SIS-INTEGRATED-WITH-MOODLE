import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import { assessedStudent, http, key, user, type Ctx } from './helpers/phase6.js';

/**
 * TASK-PH6-005 dead letter, replay approval and incidents e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet Test-ID map: replay-deadletter, replay-request, replay-foureyes,
 * replay-execute, replay-range, replay-decline, replay-denied, pause-flow,
 * incident-lifecycle, incident-evidence, incident-outage, incident-denied.
 */
describe('Phase 6 dead letter, replay and incidents', () => {
  let app: INestApplication;
  let db: PrismaService;
  let ctx: Ctx;
  let admin: string;
  let supportA: string;
  let supportB: string;

  const intPost = (path: string, body: object, c: string) =>
    request(http(ctx).raw())
      .post(`/integration${path}`)
      .set({ 'x-requested-with': 'XMLHttpRequest' })
      .set('Cookie', c)
      .send(body);
  const intGet = (path: string, c: string) =>
    request(http(ctx).raw()).get(`/integration${path}`).set('Cookie', c);

  async function supportUser() {
    return user(
      db,
      'INTEGRATION_SUPPORT',
      ['replay-event', 'manage-incident'],
      'SYSTEM',
      'INTEGRATION',
    );
  }

  async function deadAttempt() {
    const student = await assessedStudent(ctx);
    await intPost('/simulator/mode', { mode: 'TIMEOUT' }, admin).expect(201);
    // Exhaust the budget: force attempts past max, then run.
    const events = await db.outboxEvent.findMany({
      where: { type: { startsWith: 'Moodle' }, deliveredAt: null },
      orderBy: { occurredAt: 'desc' },
      take: 1,
    });
    const attempt = await db.integrationDeliveryAttempt.create({
      data: {
        outboxId: events[0].id,
        state: 'PENDING',
        attempt: 99,
      },
    });
    await intPost('/worker/run', {}, admin).expect(201);
    await intPost('/simulator/mode', { mode: 'SUCCESS' }, admin).expect(201);
    return { student, attemptId: attempt.id, outboxId: events[0].id };
  }

  beforeAll(async () => {
    const database = process.env.DATABASE_URL;
    if (!database || !/(test|review|ci)/i.test(new URL(database).pathname))
      throw new Error(
        'Use an isolated test/review database for admissions tests.',
      );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DocumentScanner)
      .useValue({
        scan: async () => ({
          status: 'AwaitingQualityCheck',
          scanner: 'TEST-ADAPTER',
        }),
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
    const officer = (
      await user(db, 'ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', '2026')
    ).cookie;
    const approver = (
      await user(db, 'ADMISSIONS_APPROVER', ['decide-offer'], 'INTAKE', '2026')
    ).cookie;
    const records = (
      await user(db, 'RECORDS_OFFICER', ['convert-student'], 'INTAKE', '2026')
    ).cookie;
    const finance = (
      await user(db, 'FINANCE_OFFICER', ['assess-charges'], 'FINANCE', 'GLOBAL')
    ).cookie;
    admin = (
      await user(
        db,
        'MOODLE_ADMIN',
        ['sync-moodle', 'manage-mapping'],
        'SYSTEM',
        'MOODLE',
      )
    ).cookie;
    supportA = (await supportUser()).cookie;
    supportB = (await supportUser()).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    ctx = {
      app,
      db,
      officer,
      approver,
      records,
      finance,
      offeringId: seeded.id,
    } as Ctx;
  });

  afterAll(async () => {
    await app.close();
  });

  it('replay-deadletter: exhausted budgets land in dead letter', async () => {
    const { attemptId } = await deadAttempt();
    const row = await db.integrationDeliveryAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });
    expect(row.state).toBe('DEAD_LETTER');
    expect(row.attempt).toBeGreaterThanOrEqual(5);
    const queue = await intGet('/dead-letters', supportA).expect(200);
    const items = (queue.body as { items: Array<{ id: string }> }).items;
    expect(items.some((i) => i.id === attemptId)).toBe(true);
  });

  it('replay-request: replays freeze evidence with a declaration', async () => {
    const { attemptId } = await deadAttempt();
    // Declaration is mandatory.
    await intPost(
      '/replays',
      { idempotencyKey: key(), attemptId, reason: 'Retry now.', declaration: false },
      supportA,
    ).expect(400);
    const requested = await intPost(
      '/replays',
      {
        idempotencyKey: key(),
        attemptId,
        reason: 'Provider recovered; retry once.',
        declaration: true,
      },
      supportA,
    ).expect(201);
    const id = (requested.body as { id: string }).id;
    const stored = await db.replayDecision.findUniqueOrThrow({ where: { id } });
    expect(stored.status).toBe('PENDING');
    const evidence = stored.evidence as Record<string, unknown>;
    expect(evidence.attemptId).toBe(attemptId);
    expect(evidence.reason).toBe('Provider recovered; retry once.');
    // Live state is not part of the frozen package.
    const list = await intGet('/replays', supportA).expect(200);
    expect(
      ((list.body as { items: Array<{ id: string }> }).items).some(
        (i) => i.id === id,
      ),
    ).toBe(true);
  });

  it('replay-foureyes: requesters never decide their own replay', async () => {
    const { attemptId } = await deadAttempt();
    const requested = await intPost(
      '/replays',
      {
        idempotencyKey: key(),
        attemptId,
        reason: 'Self-deal attempt.',
        declaration: true,
      },
      supportA,
    ).expect(201);
    const id = (requested.body as { id: string }).id;
    const refused = await intPost(
      `/replays/${id}/decide`,
      { idempotencyKey: key(), approve: true },
      supportA,
    ).expect(403);
    expect((refused.body as { code: string }).code).toBe('SOD_VIOLATION');
  });

  it('replay-execute: approved replays deliver without duplicating', async () => {
    const { attemptId, outboxId } = await deadAttempt();
    const requested = await intPost(
      '/replays',
      {
        idempotencyKey: key(),
        attemptId,
        reason: 'Provider recovered.',
        declaration: true,
      },
      supportA,
    ).expect(201);
    const id = (requested.body as { id: string }).id;
    const decided = await intPost(
      `/replays/${id}/decide`,
      { idempotencyKey: key(), approve: true, note: 'Evidence reviewed.' },
      supportB,
    ).expect(201);
    expect((decided.body as { status: string }).status).toBe('APPROVED');
    const run = await intPost('/worker/run', {}, admin).expect(201);
    expect((run.body as { delivered: number }).delivered).toBeGreaterThanOrEqual(1);
    const event = await db.outboxEvent.findUniqueOrThrow({
      where: { id: outboxId },
    });
    expect(event.deliveredAt).not.toBeNull();
    // No duplicate enrolment rows from the replay.
    const attempt = await db.programmeAttempt.findFirstOrThrow({
      orderBy: { createdAt: 'desc' },
    });
    const enrolments = await db.simStudentEnrolment.findMany({
      where: { studentId: attempt.studentId },
    });
    expect(enrolments.length).toBeLessThanOrEqual(1);
  });

  it('replay-range: approved windows reset their dead letters', async () => {
    await deadAttempt();
    await deadAttempt();
    const from = new Date(Date.now() - 3600_000).toISOString();
    const to = new Date(Date.now() + 3600_000).toISOString();
    const requested = await intPost(
      '/replays',
      {
        idempotencyKey: key(),
        rangeFrom: from,
        rangeTo: to,
        reason: 'Bulk recovery window.',
        declaration: true,
      },
      supportA,
    ).expect(201);
    const id = (requested.body as { id: string }).id;
    await intPost(
      `/replays/${id}/decide`,
      { idempotencyKey: key(), approve: true },
      supportB,
    ).expect(201);
    const pending = await db.integrationDeliveryAttempt.count({
      where: { state: 'PENDING' },
    });
    expect(pending).toBeGreaterThanOrEqual(2);
  });

  it('replay-decline: declines require reasons', async () => {
    const { attemptId } = await deadAttempt();
    const requested = await intPost(
      '/replays',
      {
        idempotencyKey: key(),
        attemptId,
        reason: 'Weak case.',
        declaration: true,
      },
      supportA,
    ).expect(201);
    const id = (requested.body as { id: string }).id;
    await intPost(
      `/replays/${id}/decide`,
      { idempotencyKey: key(), approve: false },
      supportB,
    ).expect(400);
    const declined = await intPost(
      `/replays/${id}/decide`,
      { idempotencyKey: key(), approve: false, note: 'Provider retired.' },
      supportB,
    ).expect(201);
    expect((declined.body as { status: string }).status).toBe('REJECTED');
  });

  it('replay-denied: admins and students stay outside replay', async () => {
    await intPost(
      '/replays',
      { idempotencyKey: key(), attemptId: key(), reason: 'x', declaration: true },
      admin,
    ).expect(403);
    await intGet('/dead-letters', admin).expect(403);
    const student = await assessedStudent(ctx);
    await intGet('/dead-letters', student.cookie).expect(403);
    await intPost(
      '/replays',
      { idempotencyKey: key(), reason: 'x', declaration: true },
      student.cookie,
    ).expect(403);
    void student;
  });

  it('pause-flow: paused delivery skips ticks and resumes', async () => {
    await assessedStudent(ctx);
    await intPost(
      '/delivery/pause',
      { idempotencyKey: key(), paused: true },
      supportA,
    ).expect(201);
    const skipped = await intPost('/worker/run', {}, admin).expect(201);
    expect((skipped.body as { processed: number }).processed).toBe(0);
    await intPost(
      '/delivery/pause',
      { idempotencyKey: key(), paused: false },
      supportA,
    ).expect(201);
    const resumed = await intPost('/worker/run', {}, admin).expect(201);
    expect(
      (resumed.body as { delivered: number }).delivered,
    ).toBeGreaterThanOrEqual(1);
  });

  it('incident-lifecycle: open, own and close with evidence', async () => {
    const opened = await intPost(
      '/incidents',
      {
        idempotencyKey: key(),
        title: 'Simulator flap observed.',
        severity: 'MEDIUM',
        detail: 'Intermittent timeouts on enrolment delivery.',
      },
      supportA,
    ).expect(201);
    const id = (opened.body as { id: string }).id;
    const list = await intGet('/incidents', supportA).expect(200);
    expect(
      ((list.body as { items: Array<{ id: string }> }).items).some(
        (i) => i.id === id,
      ),
    ).toBe(true);
    const closed = await intPost(
      `/incidents/${id}/close`,
      {
        idempotencyKey: key(),
        evidence: 'Three consecutive successful deliveries after flap; enrolment counts match.',
      },
      supportA,
    ).expect(201);
    expect((closed.body as { status: string }).status).toBe('CLOSED');
  });

  it('incident-evidence: bare notes never close incidents', async () => {
    const opened = await intPost(
      '/incidents',
      { idempotencyKey: key(), title: 'Thin case.', severity: 'LOW' },
      supportA,
    ).expect(201);
    const id = (opened.body as { id: string }).id;
    await intPost(
      `/incidents/${id}/close`,
      { idempotencyKey: key(), evidence: 'Fixed.' },
      supportA,
    ).expect(400);
    await intPost(
      `/incidents/${id}/close`,
      { idempotencyKey: key(), evidence: '' },
      supportA,
    ).expect(400);
  });

  it('incident-outage: forcing outage opens an incident', async () => {
    await intPost('/simulator/mode', { mode: 'OUTAGE' }, admin).expect(201);
    const open = await db.integrationIncident.findFirst({
      where: { title: 'Moodle simulator outage', status: { not: 'CLOSED' } },
    });
    expect(open).toBeDefined();
    expect(open?.severity).toBe('HIGH');
    await intPost('/simulator/mode', { mode: 'SUCCESS' }, admin).expect(201);
  });

  it('incident-denied: incident control is support-only', async () => {
    await intGet('/incidents', admin).expect(403);
    await intPost(
      '/incidents',
      { idempotencyKey: key(), title: 'Nope.', severity: 'LOW' },
      admin,
    ).expect(403);
    const lecturer = await user(db, 'LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    await intGet('/incidents', lecturer.cookie).expect(403);
  });
});
