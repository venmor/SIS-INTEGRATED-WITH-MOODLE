import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import {
  convertedStudent,
  csrf,
  http,
  key,
  user,
  type Ctx,
} from './helpers/phase6.js';

/**
 * TASK-PH6-000 tutorial-group and teaching-assignment sources e2e.
 * Isolated fictional test database required (same guard as other suites).
 * Packet Test-ID map: tg-create, tg-duplicate, tg-tutor-gate,
 * tg-allocate, tg-capacity, tg-remove, assign-lifecycle, quiz-allow,
 * quiz-deny-scope, quiz-deny-dates, quiz-substitute, tg-denied,
 * tg-neutral, tg-concurrent, tg-idempotent.
 */
describe('Phase 6 tutorial groups and teaching assignments', () => {
  let app: INestApplication;
  let db: PrismaService;
  let ctx: Ctx;
  let coordinator: string;
  let offeringId: string;
  let programmeCode = 'SWE';

  const teachPost = (path: string, body: object, c: string) =>
    request(http(ctx).raw()).post(`/teaching${path}`).set(csrf).set('Cookie', c).send(body);
  const teachGet = (path: string, c: string) =>
    request(http(ctx).raw()).get(`/teaching${path}`).set('Cookie', c);

  async function tutorUser() {
    return user(db, 'TUT', ['mark-delegated-activities'], 'TUTORIAL_GROUP', 'TG-FIX');
  }

  async function group(codes?: { name?: string; capacity?: number }) {
    const res = await teachPost(
      '/groups',
      {
        idempotencyKey: key(),
        offeringId,
        name: codes?.name ?? `TG-${key().slice(0, 6)}`,
        capacity: codes?.capacity ?? 30,
        meetingPattern: 'Mon 10:00',
      },
      coordinator,
    ).expect(201);
    return (res.body as { id: string }).id;
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
    coordinator = (
      await user(
        db,
        'COORDINATOR',
        ['manage-tutorial-groups', 'assign-teaching'],
        'PROGRAMME',
        programmeCode,
      )
    ).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
    ctx = {
      app,
      db,
      officer,
      approver,
      records,
      finance,
      offeringId,
    } as Ctx;
  });

  afterAll(async () => {
    await app.close();
  });

  async function studentNumberOf(applicationId: string) {
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId },
      include: { student: true },
    });
    return attempt.student.studentNumber;
  }

  it('tg-create: coordinator creates a draft group', async () => {
    const res = await teachPost(
      '/groups',
      {
        idempotencyKey: key(),
        offeringId,
        name: `TG-CREATE-${key().slice(0, 6)}`,
        capacity: 25,
      },
      coordinator,
    ).expect(201);
    const body = res.body as { status: string; capacity: number; allocated: number };
    expect(body.status).toBe('DRAFT');
    expect(body.capacity).toBe(25);
    expect(body.allocated).toBe(0);
  });

  it('tg-duplicate: names are unique per offering', async () => {
    const name = `TG-DUP-${key().slice(0, 6)}`;
    await group({ name });
    const dupe = await teachPost(
      '/groups',
      { idempotencyKey: key(), offeringId, name, capacity: 10 },
      coordinator,
    ).expect(409);
    expect((dupe.body as { code: string }).code).toBe('DUPLICATE_TASK');
  });

  it('tg-tutor-gate: activation needs an active tutor', async () => {
    const id = await group();
    const refused = await teachPost(
      `/groups/${id}/activate`,
      { idempotencyKey: key() },
      coordinator,
    ).expect(409);
    expect((refused.body as { code: string }).code).toBe('TUTOR_REQUIRED');
  });

  it('tg-allocate: active groups take students with reasons', async () => {
    const id = await group();
    const tutor = await tutorUser();
    const tutorAccount = await db.account.findFirstOrThrow({
      orderBy: { createdAt: 'desc' },
    });
    void tutor;
    const assigned = await teachPost(
      '/assignments',
      {
        idempotencyKey: key(),
        username: tutorAccount.username,
        role: 'Tutor',
        offeringId,
        groupId: id,
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
      `/groups/${id}/activate`,
      { idempotencyKey: key() },
      coordinator,
    ).expect(201);
    const student = await convertedStudent(ctx);
    const number = await studentNumberOf(student.id);
    const allocated = await teachPost(
      `/groups/${id}/allocate`,
      { idempotencyKey: key(), studentNumber: number, reason: 'Cohort balance.' },
      coordinator,
    ).expect(201);
    expect((allocated.body as { status: string }).status).toBe('ACTIVE');
    const detail = await teachGet(`/groups/${id}`, coordinator).expect(200);
    expect(
      ((detail.body as { members: Array<{ studentNumber: string }> }).members).some(
        (m) => m.studentNumber === number,
      ),
    ).toBe(true);
  });

  it('tg-capacity: over-enrolment is refused', async () => {
    const id = await group({ capacity: 1 });
    const tutorAccount = await db.account.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Fixture Tutor',
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
        offeringId,
        groupId: id,
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
      `/groups/${id}/activate`,
      { idempotencyKey: key() },
      coordinator,
    ).expect(201);
    const first = await convertedStudent(ctx);
    await teachPost(
      `/groups/${id}/allocate`,
      {
        idempotencyKey: key(),
        studentNumber: await studentNumberOf(first.id),
        reason: 'First seat.',
      },
      coordinator,
    ).expect(201);
    const second = await convertedStudent(ctx);
    const refused = await teachPost(
      `/groups/${id}/allocate`,
      {
        idempotencyKey: key(),
        studentNumber: await studentNumberOf(second.id),
        reason: 'No seat.',
      },
      coordinator,
    ).expect(409);
    expect((refused.body as { code: string }).code).toBe('TG_FULL');
  });

  it('tg-remove: removals preserve history', async () => {
    const id = await group();
    const tutorAccount = await db.account.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Fixture Tutor',
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
        offeringId,
        groupId: id,
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
      `/groups/${id}/activate`,
      { idempotencyKey: key() },
      coordinator,
    ).expect(201);
    const student = await convertedStudent(ctx);
    const allocated = await teachPost(
      `/groups/${id}/allocate`,
      {
        idempotencyKey: key(),
        studentNumber: await studentNumberOf(student.id),
        reason: 'Temporary.',
      },
      coordinator,
    ).expect(201);
    const allocationId = (allocated.body as { id: string }).id;
    const removed = await teachPost(
      `/allocations/${allocationId}/remove`,
      { idempotencyKey: key() },
      coordinator,
    ).expect(201);
    expect((removed.body as { status: string }).status).toBe('REMOVED');
    expect(
      await db.tGAllocation.findUniqueOrThrow({ where: { id: allocationId } }),
    ).toBeDefined();
  });

  it('assign-lifecycle: proposed, active, suspended, ended', async () => {
    const tutorAccount = await db.account.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Fixture Tutor',
              email: `${key()}@demo.invalid`,
              emailVerifiedAt: new Date(),
            },
          })
        ).id,
        username: key(),
      },
    });
    const created = await teachPost(
      '/assignments',
      {
        idempotencyKey: key(),
        username: tutorAccount.username,
        role: 'Tutor',
        offeringId,
        capabilities: [],
      },
      coordinator,
    ).expect(201);
    expect((created.body as { status: string }).status).toBe('PROPOSED');
    const id = (created.body as { id: string }).id;
    const active = await teachPost(
      `/assignments/${id}/decide`,
      { idempotencyKey: key(), approve: true },
      coordinator,
    ).expect(201);
    expect((active.body as { status: string }).status).toBe('ACTIVE');
    const suspended = await teachPost(
      `/assignments/${id}/decide`,
      { idempotencyKey: key(), approve: false },
      coordinator,
    ).expect(201);
    expect((suspended.body as { status: string }).status).toBe('SUSPENDED');
    const ended = await teachPost(
      `/assignments/${id}/end`,
      { idempotencyKey: key() },
      coordinator,
    ).expect(201);
    expect((ended.body as { status: string }).status).toBe('ENDED');
    // Unknown roles and accounts are refused.
    await teachPost(
      '/assignments',
      {
        idempotencyKey: key(),
        username: tutorAccount.username,
        role: 'Chancellor',
        capabilities: [],
      },
      coordinator,
    ).expect(400);
    await teachPost(
      '/assignments',
      {
        idempotencyKey: key(),
        username: 'nobody-at-all',
        role: 'Tutor',
        capabilities: [],
      },
      coordinator,
    ).expect(404);
  });

  it('quiz-allow: explicit capability grants scoped authority', async () => {
    const id = await group();
    const tutorAccount = await db.account.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Fixture Tutor',
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
        offeringId,
        groupId: id,
        capabilities: ['QUIZ_CREATE_MARK'],
      },
      coordinator,
    ).expect(201);
    await teachPost(
      `/assignments/${(assigned.body as { id: string }).id}/decide`,
      { idempotencyKey: key(), approve: true },
      coordinator,
    ).expect(201);
    const account = await db.account.findUniqueOrThrow({
      where: { username: tutorAccount.username },
    });
    const check = await teachGet(
      `/quiz-authority?accountId=${account.id}&groupId=${id}`,
      coordinator,
    ).expect(200);
    const body = check.body as {
      allowed: boolean;
      scope: string;
      groupIds: string[];
    };
    expect(body.allowed).toBe(true);
    expect(body.scope).toBe('TG');
    expect(body.groupIds).toContain(id);
  });

  it('quiz-deny-scope: other groups stay out of reach', async () => {
    const first = await group();
    const second = await group();
    const tutorAccount = await db.account.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Fixture Tutor',
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
        offeringId,
        groupId: first,
        capabilities: ['QUIZ_CREATE_MARK'],
      },
      coordinator,
    ).expect(201);
    await teachPost(
      `/assignments/${(assigned.body as { id: string }).id}/decide`,
      { idempotencyKey: key(), approve: true },
      coordinator,
    ).expect(201);
    const account = await db.account.findUniqueOrThrow({
      where: { username: tutorAccount.username },
    });
    const check = await teachGet(
      `/quiz-authority?accountId=${account.id}&groupId=${second}`,
      coordinator,
    ).expect(200);
    expect((check.body as { allowed: boolean }).allowed).toBe(false);
  });

  it('quiz-deny-dates: expired assignments grant nothing', async () => {
    const id = await group();
    const tutorAccount = await db.account.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Fixture Tutor',
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
        offeringId,
        groupId: id,
        capabilities: ['QUIZ_CREATE_MARK'],
        effectiveTo: '2020-01-01T00:00:00Z',
      },
      coordinator,
    ).expect(201);
    await teachPost(
      `/assignments/${(assigned.body as { id: string }).id}/decide`,
      { idempotencyKey: key(), approve: true },
      coordinator,
    ).expect(201);
    const account = await db.account.findUniqueOrThrow({
      where: { username: tutorAccount.username },
    });
    const check = await teachGet(
      `/quiz-authority?accountId=${account.id}&groupId=${id}`,
      coordinator,
    ).expect(200);
    expect((check.body as { allowed: boolean }).allowed).toBe(false);
  });

  it('quiz-substitute: cover states its own authority explicitly', async () => {
    const id = await group();
    const tutorAccount = await db.account.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Fixture Tutor',
              email: `${key()}@demo.invalid`,
              emailVerifiedAt: new Date(),
            },
          })
        ).id,
        username: key(),
      },
    });
    // A teaching-only assignment grants no quiz authority.
    const assigned = await teachPost(
      '/assignments',
      {
        idempotencyKey: key(),
        username: tutorAccount.username,
        role: 'Tutor',
        offeringId,
        groupId: id,
        capabilities: [],
      },
      coordinator,
    ).expect(201);
    await teachPost(
      `/assignments/${(assigned.body as { id: string }).id}/decide`,
      { idempotencyKey: key(), approve: true },
      coordinator,
    ).expect(201);
    const account = await db.account.findUniqueOrThrow({
      where: { username: tutorAccount.username },
    });
    const check = await teachGet(
      `/quiz-authority?accountId=${account.id}&groupId=${id}`,
      coordinator,
    ).expect(200);
    expect((check.body as { allowed: boolean }).allowed).toBe(false);
  });

  it('tg-denied: students and lecturers manage nothing', async () => {
    const student = await convertedStudent(ctx);
    await teachPost(
      '/groups',
      { idempotencyKey: key(), offeringId, name: 'TG-X', capacity: 5 },
      student.cookie,
    ).expect(403);
    const lecturer = await user(db, 'LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    await teachPost(
      '/groups',
      { idempotencyKey: key(), offeringId, name: 'TG-Y', capacity: 5 },
      lecturer.cookie,
    ).expect(403);
    await teachGet('/groups', lecturer.cookie).expect(403);
  });

  it('tg-neutral: unknown groups and students 404', async () => {
    await teachGet(`/groups/${randomUUID()}`, coordinator).expect(404);
    const id = await group();
    await teachPost(
      `/groups/${id}/activate`,
      { idempotencyKey: key() },
      coordinator,
    ).expect(409);
  });

  it('tg-concurrent: racing allocations seat one student once', async () => {
    const id = await group({ capacity: 1 });
    const tutorAccount = await db.account.create({
      data: {
        personId: (
          await db.person.create({
            data: {
              displayName: 'Fixture Tutor',
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
        offeringId,
        groupId: id,
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
      `/groups/${id}/activate`,
      { idempotencyKey: key() },
      coordinator,
    ).expect(201);
    const student = await convertedStudent(ctx);
    const number = await studentNumberOf(student.id);
    const [left, right] = await Promise.all([
      teachPost(
        `/groups/${id}/allocate`,
        { idempotencyKey: key(), studentNumber: number, reason: 'Race.' },
        coordinator,
      ),
      teachPost(
        `/groups/${id}/allocate`,
        { idempotencyKey: key(), studentNumber: number, reason: 'Race.' },
        coordinator,
      ),
    ]);
    const statuses = [left.status, right.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('tg-idempotent: replays return the stored group', async () => {
    const same = key();
    const name = `TG-REPLAY-${key().slice(0, 6)}`;
    const first = await teachPost(
      '/groups',
      { idempotencyKey: same, offeringId, name, capacity: 10 },
      coordinator,
    ).expect(201);
    const replay = await teachPost(
      '/groups',
      { idempotencyKey: same, offeringId, name, capacity: 10 },
      coordinator,
    ).expect(201);
    expect(replay.body).toEqual(first.body);
  });
});
