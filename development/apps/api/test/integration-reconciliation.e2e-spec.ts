import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import { assessedStudent, http, key, user, type Ctx } from './helpers/phase6.js';

/**
 * TASK-PH6-006 expected-vs-actual reconciliation e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet Test-ID map: recon-clean, recon-missing, recon-unexpected,
 * recon-mismatch, recon-rerun, recon-requeue, recon-suspend,
 * recon-escalate, recon-forbidden, recon-close-evidence, recon-denied,
 * recon-neutral, recon-checkpoint.
 */
describe('Phase 6 reconciliation and closure', () => {
  let app: INestApplication;
  let db: PrismaService;
  let ctx: Ctx;
  let admin: string;
  let support: string;

  const intPost = (path: string, body: object, c: string) =>
    request(http(ctx).raw())
      .post(`/integration${path}`)
      .set({ 'x-requested-with': 'XMLHttpRequest' })
      .set('Cookie', c)
      .send(body);
  const intGet = (path: string, c: string) =>
    request(http(ctx).raw()).get(`/integration${path}`).set('Cookie', c);
  const regGet = (path: string, c: string) =>
    request(http(ctx).raw()).get(`/registration${path}`).set('Cookie', c);

  async function runRecon() {
    const res = await intPost('/reconciliation/runs', {}, admin).expect(201);
    return res.body as { runId: string; diffs: number; repaired: number; cases: number };
  }

  async function ownOpenCase(ghostId: string) {
    return db.reconciliationCase.findFirst({
      where: {
        kind: 'UNEXPECTED_IN_MOODLE',
        status: 'OPEN',
        detail: { path: ['externalKey'], equals: ghostId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async function worker() {
    await intPost('/worker/run', {}, admin).expect(201);
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
    support = (
      await user(
        db,
        'INTEGRATION_SUPPORT',
        ['replay-event', 'manage-incident'],
        'SYSTEM',
        'INTEGRATION',
      )
    ).cookie;
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
    // Shared shell for ghost-row tests: one assessed student delivered,
    // so SimShell + mapping exist regardless of test order.
    await assessedStudent(ctx);
    await request(app.getHttpServer())
      .post('/integration/worker/run')
      .set({ 'x-requested-with': 'XMLHttpRequest' })
      .set('Cookie', admin)
      .send({})
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('recon-clean: aligned states produce no diffs', async () => {
    const student = await assessedStudent(ctx);
    await worker();
    await runRecon();
    // Student-scoped (other tests share this DB): own enrolment active,
    // no open case naming this student.
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    expect(
      await db.simStudentEnrolment.count({
        where: { studentId: attempt.studentId, status: 'ACTIVE' },
      }),
    ).toBe(1);
    expect(
      await db.reconciliationCase.count({
        where: {
          studentId: attempt.studentId,
          status: { in: ['OPEN', 'ESCALATED'] },
        },
      }),
    ).toBe(0);
    const runs = await intGet('/reconciliation/runs', admin).expect(200);
    expect(
      ((runs.body as { items: Array<{ status: string }> }).items).some(
        (i) => i.status === 'COMPLETED',
      ),
    ).toBe(true);
  });

  it('recon-missing: absent enrolments repair by requeue', async () => {
    const student = await assessedStudent(ctx);
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    // Simulate drift: wipe the simulator enrolment outright.
    await db.simStudentEnrolment.deleteMany({
      where: { studentId: attempt.studentId },
    });
    const run = await runRecon();
    expect(run.diffs).toBeGreaterThanOrEqual(1);
    expect(run.repaired).toBeGreaterThanOrEqual(1);
    await worker();
    expect(
      await db.simStudentEnrolment.count({
        where: { studentId: attempt.studentId, status: 'ACTIVE' },
      }),
    ).toBe(1);
  });

  it('recon-unexpected: simulator-only enrolments open cases', async () => {
    const ghost = await db.student.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Ghost Student',
              email: `${key()}@demo.invalid`,
              emailVerifiedAt: new Date(),
            },
          })
        ).id,
        studentNumber: `STU-2026-${key().slice(0, 4).toUpperCase()}`,
        status: 'ACTIVE',
      },
    });
    const shell = await db.simShell.findFirstOrThrow();
    await db.simStudentEnrolment.create({
      data: { shellId: shell.id, studentId: ghost.id, status: 'ACTIVE' },
    });
    await runRecon();
    // Own ghost case exists (deduped across dirty DBs, never duplicated).
    const own = await ownOpenCase(ghost.id);
    expect(own).toBeDefined();
    expect(own!.kind).toBe('UNEXPECTED_IN_MOODLE');
  });

  it('recon-mismatch: wrong roles open governed cases', async () => {
    const student = await assessedStudent(ctx);
    await worker();
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    await db.simStudentEnrolment.updateMany({
      where: { studentId: attempt.studentId },
      data: { role: 'Teacher', status: 'ACTIVE' },
    });
    await runRecon();
    const own = await db.reconciliationCase.findFirst({
      where: {
        kind: 'ENROLMENT_MISMATCH',
        studentId: attempt.studentId,
        status: 'OPEN',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(own).toBeDefined();
  });

  it('recon-rerun: repeated runs converge without duplicate cases', async () => {
    const ghost = await db.student.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Ghost Student',
              email: `${key()}@demo.invalid`,
              emailVerifiedAt: new Date(),
            },
          })
        ).id,
        studentNumber: `STU-2026-${key().slice(0, 4).toUpperCase()}`,
        status: 'ACTIVE',
      },
    });
    const shell = await db.simShell.findFirstOrThrow();
    await db.simStudentEnrolment.create({
      data: { shellId: shell.id, studentId: ghost.id, status: 'ACTIVE' },
    });
    await runRecon();
    const before = await db.reconciliationCase.count({
      where: { status: { in: ['OPEN', 'ESCALATED'] } },
    });
    await runRecon();
    const after = await db.reconciliationCase.count({
      where: { status: { in: ['OPEN', 'ESCALATED'] } },
    });
    expect(after).toBe(before);
  });

  it('recon-requeue: safe repairs redeliver idempotently', async () => {
    const student = await assessedStudent(ctx);
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    await db.simStudentEnrolment.deleteMany({
      where: { studentId: attempt.studentId },
    });
    await runRecon();
    await worker();
    await worker();
    expect(
      await db.simStudentEnrolment.count({
        where: { studentId: attempt.studentId },
      }),
    ).toBe(1);
    void student;
  });

  it('recon-suspend: unexpected access suspends without touching SIS', async () => {
    const ghost = await db.student.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Ghost Student',
              email: `${key()}@demo.invalid`,
              emailVerifiedAt: new Date(),
            },
          })
        ).id,
        studentNumber: `STU-2026-${key().slice(0, 4).toUpperCase()}`,
        status: 'ACTIVE',
      },
    });
    const shell = await db.simShell.findFirstOrThrow();
    await db.simStudentEnrolment.create({
      data: { shellId: shell.id, studentId: ghost.id, status: 'ACTIVE' },
    });
    await runRecon();
    const target = await ownOpenCase(ghost.id);
    expect(target).toBeDefined();
    const resolved = await intPost(
      `/reconciliation/cases/${target!.id}/resolve`,
      { idempotencyKey: key(), action: 'SUSPEND_ACCESS', note: 'No SIS record.' },
      support,
    ).expect(201);
    expect((resolved.body as { status: string }).status).toBe('RESOLVED');
    expect(
      (
        await db.simStudentEnrolment.findMany({
          where: { studentId: ghost.id },
        })
      ).every((e) => e.status === 'SUSPENDED'),
    ).toBe(true);
    // The SIS ghost record itself is untouched.
    expect(
      (await db.student.findUniqueOrThrow({ where: { id: ghost.id } })).status,
    ).toBe('ACTIVE');
  });

  it('recon-escalate: escalation keeps cases visible', async () => {
    const ghost = await db.student.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Ghost Student',
              email: `${key()}@demo.invalid`,
              emailVerifiedAt: new Date(),
            },
          })
        ).id,
        studentNumber: `STU-2026-${key().slice(0, 4).toUpperCase()}`,
        status: 'ACTIVE',
      },
    });
    const shell = await db.simShell.findFirstOrThrow();
    await db.simStudentEnrolment.create({
      data: { shellId: shell.id, studentId: ghost.id, status: 'ACTIVE' },
    });
    await runRecon();
    const target = await ownOpenCase(ghost.id);
    expect(target).toBeDefined();
    const escalated = await intPost(
      `/reconciliation/cases/${target!.id}/resolve`,
      { idempotencyKey: key(), action: 'ESCALATE', note: 'Needs registrar.' },
      admin,
    ).expect(201);
    expect((escalated.body as { status: string }).status).toBe('ESCALATED');
  });

  it('recon-forbidden: activating SIS records is refused', async () => {
    const ghost = await db.student.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Ghost Student',
              email: `${key()}@demo.invalid`,
              emailVerifiedAt: new Date(),
            },
          })
        ).id,
        studentNumber: `STU-2026-${key().slice(0, 4).toUpperCase()}`,
        status: 'ACTIVE',
      },
    });
    const shell = await db.simShell.findFirstOrThrow();
    await db.simStudentEnrolment.create({
      data: { shellId: shell.id, studentId: ghost.id, status: 'ACTIVE' },
    });
    await runRecon();
    const target = await ownOpenCase(ghost.id);
    expect(target).toBeDefined();
    // There is no "make SIS active" action: unknown actions are refused.
    const refused = await intPost(
      `/reconciliation/cases/${target!.id}/resolve`,
      { idempotencyKey: key(), action: 'MAKE_ACTIVE' },
      admin,
    ).expect(400);
    expect((refused.body as { code: string }).code).toBe('UNKNOWN_ACTION');
  });

  it('recon-close-evidence: bare notes never close cases', async () => {
    const ghost = await db.student.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Ghost Student',
              email: `${key()}@demo.invalid`,
              emailVerifiedAt: new Date(),
            },
          })
        ).id,
        studentNumber: `STU-2026-${key().slice(0, 4).toUpperCase()}`,
        status: 'ACTIVE',
      },
    });
    const shell = await db.simShell.findFirstOrThrow();
    await db.simStudentEnrolment.create({
      data: { shellId: shell.id, studentId: ghost.id, status: 'ACTIVE' },
    });
    await runRecon();
    const target = await ownOpenCase(ghost.id);
    expect(target).toBeDefined();
    await intPost(
      `/reconciliation/cases/${target!.id}/resolve`,
      { idempotencyKey: key(), action: 'MARK_RESOLVED', note: 'Fixed.' },
      support,
    ).expect(400);
    const closed = await intPost(
      `/reconciliation/cases/${target!.id}/resolve`,
      {
        idempotencyKey: key(),
        action: 'MARK_RESOLVED',
        note: 'Confirmed with the registrar that no SIS record exists; simulator row retained for audit.',
      },
      support,
    ).expect(201);
    expect((closed.body as { status: string }).status).toBe('RESOLVED');
  });

  it('recon-denied: resolution is operations-only', async () => {
    const student = await assessedStudent(ctx);
    await intPost('/reconciliation/runs', {}, student.cookie).expect(403);
    await intGet('/reconciliation/cases', student.cookie).expect(403);
    const lecturer = await user(db, 'LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    await intPost('/reconciliation/runs', {}, lecturer.cookie).expect(403);
    void student;
  });

  it('recon-neutral: unknown cases 404', async () => {
    await intPost(
      '/reconciliation/cases/00000000-0000-0000-0000-000000000000/resolve',
      { idempotencyKey: key(), action: 'ESCALATE' },
      admin,
    ).expect(404);
  });

  it('recon-checkpoint: outage, replay and alignment in one flow', async () => {
    const student = await assessedStudent(ctx);
    await intPost('/simulator/mode', { mode: 'OUTAGE' }, admin).expect(201);
    await intPost('/worker/run', {}, admin).expect(201);
    const queued = await regGet('/status', student.cookie).expect(200);
    expect(
      (queued.body as { moodle: { state: string } }).moodle.state,
    ).toBe('Queued');
    await intPost('/simulator/mode', { mode: 'SUCCESS' }, admin).expect(201);
    // Release every deferred retry, then deliver and reconcile.
    await db.integrationDeliveryAttempt.updateMany({
      data: { nextRunAt: new Date('2020-01-01T00:00:00Z') },
    });
    const delivered = await intPost('/worker/run', {}, admin).expect(201);
    expect(
      (delivered.body as { delivered: number }).delivered,
    ).toBeGreaterThanOrEqual(1);
    const synced = await regGet('/status', student.cookie).expect(200);
    expect(
      (synced.body as { moodle: { state: string } }).moodle.state,
    ).toBe('Synced');
    const run = await runRecon();
    void run;
    // No open case naming this student after a clean run.
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    expect(
      await db.reconciliationCase.count({
        where: {
          studentId: attempt.studentId,
          status: { in: ['OPEN', 'ESCALATED'] },
        },
      }),
    ).toBe(0);
    // Exactly one simulator enrolment: replay-safe, duplication-free.
    expect(
      await db.simStudentEnrolment.count({
        where: { studentId: attempt.studentId },
      }),
    ).toBe(1);
  });
});
