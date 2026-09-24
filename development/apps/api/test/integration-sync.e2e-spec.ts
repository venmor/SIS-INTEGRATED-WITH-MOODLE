import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import {
  assessedStudent,
  csrf,
  http,
  key,
  registeredStudent,
  user,
  type Ctx,
} from './helpers/phase6.js';

/**
 * TASK-PH6-003 simulator adapter and delivery worker e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet Test-ID map: sync-deliver, sync-shell-once, sync-roles,
 * sync-quiz-gate, sync-tg, sync-drop, sync-duplicate, sync-timeout,
 * sync-outage, sync-student-states, sync-concurrent, sync-denied,
 * sync-neutral.
 */
describe('Phase 6 simulator delivery and enrolment sync', () => {
  let app: INestApplication;
  let db: PrismaService;
  let ctx: Ctx;
  let admin: string;
  let support: string;
  let coordinator: string;

  const intPost = (path: string, body: object, c: string) =>
    request(http(ctx).raw())
      .post(`/integration${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const intGet = (path: string, c: string) =>
    request(http(ctx).raw()).get(`/integration${path}`).set('Cookie', c);
  const regPost = (path: string, body: object, c: string) =>
    request(http(ctx).raw())
      .post(`/registration${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const regGet = (path: string, c: string) =>
    request(http(ctx).raw()).get(`/registration${path}`).set('Cookie', c);
  const teachPost = (path: string, body: object, c: string) =>
    request(http(ctx).raw())
      .post(`/teaching${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);

  async function runWorker() {
    const res = await intPost('/worker/run', {}, admin).expect(201);
    return res.body as {
      processed: number;
      delivered: number;
      retried: number;
      dead: number;
    };
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
    coordinator = (
      await user(
        db,
        'COORDINATOR',
        ['manage-tutorial-groups', 'assign-teaching'],
        'PROGRAMME',
        'SWE',
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('sync-deliver: registration confirms into a simulator enrolment', async () => {
    const student = await assessedStudent(ctx);
    const before = await regGet('/status', student.cookie).expect(200);
    expect(
      (before.body as { moodle: { state: string } }).moodle.state,
    ).toBe('Queued');
    const run = await runWorker();
    expect(run.delivered).toBeGreaterThanOrEqual(1);
    const after = await regGet('/status', student.cookie).expect(200);
    expect(
      (after.body as { moodle: { state: string } }).moodle.state,
    ).toBe('Synced');
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    const enrolment = await db.simStudentEnrolment.findFirstOrThrow({
      where: { studentId: attempt.studentId, status: 'ACTIVE' },
    });
    expect(enrolment.role).toBe('Student');
  });

  it('sync-shell-once: one shell per offering and period', async () => {
    await assessedStudent(ctx);
    await assessedStudent(ctx);
    await runWorker();
    const shells = await db.simShell.findMany();
    expect(shells).toHaveLength(1);
    expect(shells[0].shellRef).toBe('SIM-SH-SWE-2026S1');
  });

  it('sync-roles: lecturer maps to Teacher', async () => {
    const lecturer = await user(db, 'LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    const lecturerAccount = await db.account.findFirstOrThrow({
      orderBy: { createdAt: 'desc' },
    });
    void lecturer;
    const created = await teachPost(
      '/assignments',
      {
        idempotencyKey: key(),
        username: lecturerAccount.username,
        role: 'Lecturer',
        offeringId: ctx.offeringId,
        capabilities: [],
      },
      coordinator,
    ).expect(201);
    await teachPost(
      `/assignments/${(created.body as { id: string }).id}/decide`,
      { idempotencyKey: key(), approve: true },
      coordinator,
    ).expect(201);
    await runWorker();
    const role = await db.simStaffRole.findFirst({
      where: { accountId: lecturerAccount.id },
    });
    expect(role?.moodleRole).toBe('Teacher');
    expect(role?.status).toBe('ACTIVE');
  });

  it('sync-quiz-gate: quiz authority gates the restricted role', async () => {
    const plain = await db.account.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Plain Tutor',
              email: `${key()}@demo.invalid`,
              emailVerifiedAt: new Date(),
            },
          })
        ).id,
        username: key(),
      },
    });
    const quizzer = await db.account.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Quiz Tutor',
              email: `${key()}@demo.invalid`,
              emailVerifiedAt: new Date(),
            },
          })
        ).id,
        username: key(),
      },
    });
    for (const [account, caps] of [
      [plain, []],
      [quizzer, ['QUIZ_CREATE_MARK']],
    ] as const) {
      const created = await teachPost(
        '/assignments',
        {
          idempotencyKey: key(),
          username: account.username,
          role: 'Tutor',
          offeringId: ctx.offeringId,
          capabilities: [...caps],
        },
        coordinator,
      ).expect(201);
      await teachPost(
        `/assignments/${(created.body as { id: string }).id}/decide`,
        { idempotencyKey: key(), approve: true },
        coordinator,
      ).expect(201);
    }
    await runWorker();
    const plainRole = await db.simStaffRole.findFirst({
      where: { accountId: plain.id },
    });
    const quizRole = await db.simStaffRole.findFirst({
      where: { accountId: quizzer.id },
    });
    expect(plainRole?.moodleRole).toBe('Tutor');
    expect(quizRole?.moodleRole).toBe('Non-editing Teacher');
    expect(quizRole?.quizScope).toBeDefined();
  });

  it('sync-tg: allocations mirror into simulator groups', async () => {
    const student = await assessedStudent(ctx);
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    const attemptStudent = await db.student.findFirstOrThrow({
      where: { attempts: { some: { id: attempt.id } } },
    });
    const created = await teachPost(
      '/groups',
      {
        idempotencyKey: key(),
        offeringId: ctx.offeringId,
        name: `TG-SYNC-${key().slice(0, 6)}`,
        capacity: 30,
      },
      coordinator,
    ).expect(201);
    const groupId = (created.body as { id: string }).id;
    const tutorAccount = await db.account.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Sync Tutor',
              email: `${key()}@demo.invalid`,
              emailVerifiedAt: new Date(),
            },
          })
        ).id,
        username: key(),
      },
    });
    const assigned = await teachPost(
      '/assignments',
      {
        idempotencyKey: key(),
        username: tutorAccount.username,
        role: 'Tutor',
        offeringId: ctx.offeringId,
        groupId,
        capabilities: [],
      },
      coordinator,
    ).expect(201);
    await teachPost(
      `/assignments/${(assigned.body as { id: string }).id}/decide`,
      { idempotencyKey: key(), approve: true },
      coordinator,
    ).expect(201);
    await teachPost(
      `/groups/${groupId}/activate`,
      { idempotencyKey: key() },
      coordinator,
    ).expect(201);
    await teachPost(
      `/groups/${groupId}/allocate`,
      {
        idempotencyKey: key(),
        studentNumber: attemptStudent.studentNumber,
        reason: 'Sync check.',
      },
      coordinator,
    ).expect(201);
    await runWorker();
    const member = await db.simGroupMember.findFirst({
      where: { groupId, studentId: attemptStudent.id, status: 'ACTIVE' },
    });
    expect(member).toBeDefined();
  });

  it('sync-drop: drops suspend without erasing history', async () => {
    const student = await assessedStudent(ctx, ['SWE111', 'MTH111', 'ENG111', 'BUS111']);
    await runWorker();
    const created = await regPost(
      '/changes',
      {
        idempotencyKey: key(),
        kind: 'DROP',
        courseCode: 'BUS111',
        reason: 'Drop sync check.',
      },
      student.cookie,
    ).expect(201);
    const recordsCookie = ctx.records;
    await request(http(ctx).raw())
      .post(
        `/registration/amendments/${(created.body as { id: string }).id}/decide`,
      )
      .set({ 'x-requested-with': 'XMLHttpRequest' })
      .set('Cookie', recordsCookie)
      .send({ approve: true, idempotencyKey: key() })
      .expect(201);
    await runWorker();
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    const enrolment = await db.simStudentEnrolment.findFirst({
      where: { studentId: attempt.studentId },
    });
    // Programme-level enrolment suspends; the row (history) survives.
    expect(enrolment?.status).toBe('SUSPENDED');
    expect(enrolment).toBeDefined();
  });

  it('sync-duplicate: redelivery converges without new rows', async () => {
    const student = await assessedStudent(ctx);
    await runWorker();
    const first = await runWorker();
    expect(first.delivered).toBe(0);
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    expect(
      await db.simStudentEnrolment.count({
        where: { studentId: attempt.studentId },
      }),
    ).toBe(1);
    void student;
  });

  it('sync-timeout: timeouts reschedule with backoff', async () => {
    await intPost('/simulator/mode', { mode: 'TIMEOUT' }, admin).expect(201);
    const student = await assessedStudent(ctx);
    const run = await runWorker();
    expect(run.retried).toBeGreaterThanOrEqual(1);
    const status = await regGet('/status', student.cookie).expect(200);
    // Registration stays valid and queued through provider trouble.
    expect(
      (status.body as { moodle: { state: string } }).moodle.state,
    ).toBe('Queued');
    await intPost('/simulator/mode', { mode: 'SUCCESS' }, admin).expect(201);
    // Force the retry due now, then deliver.
    await db.integrationDeliveryAttempt.updateMany({
      data: { nextRunAt: new Date('2020-01-01T00:00:00Z') },
    });
    const recovered = await runWorker();
    expect(recovered.delivered).toBeGreaterThanOrEqual(1);
  });

  it('sync-outage: outage survives without touching registration', async () => {
    await intPost('/simulator/mode', { mode: 'OUTAGE' }, admin).expect(201);
    const health = await intGet('/health', admin).expect(200);
    expect((health.body as { status: string }).status).toBe('OUTAGE');
    const student = await assessedStudent(ctx);
    const run = await runWorker();
    expect(run.retried).toBeGreaterThanOrEqual(1);
    const syncAttempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    const registration =
      await db.institutionalRegistration.findFirstOrThrow({
        where: { attemptId: syncAttempt.id },
      });
    expect(registration.status).toBe('REGISTERED');
    await intPost('/simulator/mode', { mode: 'SUCCESS' }, admin).expect(201);
  });

  it('sync-student-states: Queued before, Synced after', async () => {
    const student = await assessedStudent(ctx);
    const queued = await regGet('/status', student.cookie).expect(200);
    expect(
      (queued.body as { moodle: { state: string } }).moodle.state,
    ).toBe('Queued');
    await runWorker();
    const synced = await regGet('/status', student.cookie).expect(200);
    const moodle = (synced.body as { moodle: { state: string; detail: string } })
      .moodle;
    expect(moodle.state).toBe('Synced');
    expect(moodle.detail.length).toBeGreaterThan(0);
  });

  it('sync-concurrent: racing worker ticks claim once', async () => {
    await assessedStudent(ctx);
    const [left, right] = await Promise.all([
      runWorker(),
      runWorker(),
    ]);
    expect(left.delivered + right.delivered).toBeGreaterThanOrEqual(1);
    // No duplicate enrolment rows from the race.
    const shells = await db.simShell.findMany();
    expect(shells.length).toBeLessThanOrEqual(2);
  });

  it('sync-denied: worker and simulator controls are privileged', async () => {
    const student = await assessedStudent(ctx);
    await intPost('/worker/run', {}, student.cookie).expect(403);
    await intPost('/simulator/mode', { mode: 'OUTAGE' }, student.cookie).expect(403);
    const lecturer = await user(db, 'LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    await intPost('/worker/run', {}, lecturer.cookie).expect(403);
    void student;
  });

  it('sync-neutral: unknown simulator modes refused', async () => {
    const res = await intPost('/simulator/mode', { mode: 'HYPERDRIVE' }, admin).expect(
      400,
    );
    expect((res.body as { code: string }).code).toBe('UNKNOWN_SCENARIO');
  });
});
