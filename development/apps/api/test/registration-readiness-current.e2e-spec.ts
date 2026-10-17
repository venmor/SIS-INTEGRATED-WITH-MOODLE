import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHash, randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

describe('Registration readiness follows saved and official records (REG-002)', () => {
  let app: INestApplication;
  let db: PrismaService;
  let offeringId: string;
  let curriculumId: string;
  const declarations = [
    'PLAN_ACCURATE',
    'RULES_UNDERSTOOD',
    'FINANCE_UNDERSTOOD',
  ];
  type Actor = Awaited<ReturnType<typeof learner>>;
  async function learner() {
    const person = await db.person.create({
      data: { displayName: 'Readiness learner' },
    });
    const account = await db.account.create({
      data: { personId: person.id, username: randomUUID() },
    });
    const student = await db.student.create({
      data: { personId: person.id, studentNumber: `REG2-${randomUUID()}` },
    });
    const assignment = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: 'STUDENT',
        scopeType: 'STUDENT',
        scopeRef: student.id,
        capabilities: ['study'],
        startsAt: new Date('2020-01-01'),
        reason: 'Isolated REG-002 fixture',
      },
    });
    const attempt = await db.programmeAttempt.create({
      data: {
        studentId: student.id,
        offeringId,
        applicationId: randomUUID(),
        intake: '2026 readiness',
        status: 'ADMITTED',
        curriculumVersionId: curriculumId,
      },
    });
    const token = randomUUID();
    await db.session.create({
      data: {
        accountId: account.id,
        activeAssignmentId: assignment.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    const period = await db.academicPeriod.create({
      data: {
        code: `REG2-${randomUUID()}`,
        status: 'OPEN',
        registrationOpen: new Date(Date.now() - 86400000),
        registrationClose: new Date(Date.now() + 86400000),
      },
    });
    return {
      account,
      student,
      assignment,
      attempt,
      period,
      cookie: `sid=${token}`,
    };
  }
  const query = (a: Actor) =>
    `?attemptId=${a.attempt.id}&period=${a.period.code}`;
  const ready = (a: Actor) =>
    request(app.getHttpServer())
      .get(`/registration/readiness${query(a)}`)
      .set('Cookie', a.cookie);
  const save = (a: Actor, codes = ['SWE111', 'MTH111']) =>
    request(app.getHttpServer())
      .post(`/registration/plan${query(a)}`)
      .set('Cookie', a.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ idempotencyKey: randomUUID(), version: 1, courseCodes: codes });
  const submit = (a: Actor, version: number) =>
    request(app.getHttpServer())
      .post(`/registration/submit${query(a)}`)
      .set('Cookie', a.cookie)
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ idempotencyKey: randomUUID(), version, declarations });
  const condition = (body: any, key: string) =>
    body.conditions.find((c: any) => c.key === key);

  beforeAll(async () => {
    const target = new URL(
      process.env.DATABASE_URL ?? 'postgresql://invalid/invalid',
    );
    if (
      process.env.DEMO_MODE !== 'true' ||
      !['127.0.0.1', 'localhost'].includes(target.hostname) ||
      !/^\/(?:sis_v2_core_review_20261016|sis_setup003_test_ci_[a-f0-9]{16})$/.test(
        target.pathname,
      )
    )
      throw new Error('REG-002 requires its isolated owned database.');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
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
    const offering = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' } },
    });
    offeringId = offering.id;
    curriculumId = (
      await db.curriculumVersion.findFirstOrThrow({
        where: { programmeId: offering.programmeId, status: 'PUBLISHED' },
        orderBy: { version: 'asc' },
      })
    ).id;
  });
  afterAll(async () => {
    await app?.close();
  });

  it('keeps an empty plan incomplete and reports saved valid selection as ready', async () => {
    const a = await learner();
    expect(
      condition((await ready(a).expect(200)).body, 'selection-complete').status,
    ).toBe('ACTION_REQUIRED');
    await save(a).expect(201);
    const body = (await ready(a).expect(200)).body;
    expect(condition(body, 'selection-complete')).toMatchObject({
      status: 'READY',
    });
    expect(condition(body, 'declarations').status).toBe('ACTION_REQUIRED');
    expect(body.registration).toBeNull();
    expect(body.overall).toBe('AWAITING_STUDENT_INPUT');
    expect(
      await db.institutionalRegistration.count({
        where: { attemptId: a.attempt.id },
      }),
    ).toBe(0);
  });
  it('names blocked courses and load without treating a saved plan as complete', async () => {
    const a = await learner();
    await save(a, ['SWE121', 'BUS112']).expect(201);
    const c = condition(
      (await ready(a).expect(200)).body,
      'selection-complete',
    );
    expect(c.status).toBe('ACTION_REQUIRED');
    expect(c.detail).toContain('SWE121');
    expect(c.detail).toContain('BUS112');
    const b = await learner();
    await save(b, ['SWE111']).expect(201);
    expect(
      condition((await ready(b).expect(200)).body, 'selection-complete').detail,
    ).toContain('2');
  });
  it('uses the real completed receipt and declarations after submit, even after the window closes', async () => {
    const a = await learner();
    const plan = (await save(a).expect(201)).body;
    const receipt = (await submit(a, plan.version).expect(201)).body;
    const before = await db.institutionalRegistration.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    let body = (await ready(a).expect(200)).body;
    expect(body.overall).toBe('REGISTERED');
    expect(body.registration).toEqual(receipt);
    expect(condition(body, 'selection-complete').status).toBe('COMPLETE');
    expect(condition(body, 'declarations').status).toBe('COMPLETE');
    await db.academicPeriod.update({
      where: { id: a.period.id },
      data: {
        status: 'CLOSED',
        registrationClose: new Date(Date.now() - 1000),
      },
    });
    body = (await ready(a).expect(200)).body;
    expect(body.overall).toBe('REGISTERED');
    expect(body.registration.receipt).toBe(receipt.receipt);
    expect((await submit(a, plan.version).expect(201)).body).toEqual(receipt);
    expect(condition(body, 'period-open').status).toBe('NOT_APPLICABLE');
    expect(
      (
        await db.institutionalRegistration.findUniqueOrThrow({
          where: { id: receipt.id },
        })
      ).snapshot,
    ).toEqual(before.snapshot);
  });
  it('refuses a closed period even when historical window dates include today', async () => {
    const a = await learner();
    const plan = (await save(a).expect(201)).body;
    await db.academicPeriod.update({
      where: { id: a.period.id },
      data: { status: 'CLOSED' },
    });
    expect(
      condition((await ready(a).expect(200)).body, 'period-open').status,
    ).toBe('BLOCKED');
    expect((await submit(a, plan.version).expect(409)).body.code).toBe(
      'PERIOD_CLOSED',
    );
  });
  it('does not complete another period, another person or a cancelled registration', async () => {
    const a = await learner();
    const b = await learner();
    await request(app.getHttpServer())
      .get(`/registration/readiness${query(a)}`)
      .set('Cookie', b.cookie)
      .expect(404);
    const plan = (await save(a).expect(201)).body;
    await submit(a, plan.version).expect(201);
    expect(
      (
        await request(app.getHttpServer())
          .get(
            `/registration/readiness?attemptId=${a.attempt.id}&period=${b.period.code}`,
          )
          .set('Cookie', a.cookie)
          .expect(200)
      ).body.overall,
    ).not.toBe('REGISTERED');
    await db.institutionalRegistration.update({
      where: {
        attemptId_periodId: { attemptId: a.attempt.id, periodId: a.period.id },
      },
      data: { status: 'CANCELLED' },
    });
    const body = (await ready(a).expect(200)).body;
    expect(body.overall).not.toBe('REGISTERED');
    expect(condition(body, 'selection-complete').status).not.toBe('COMPLETE');
  });
  it('restricts records reads to the live intake appointment on readiness and plan', async () => {
    const a = await learner();
    const officer = await learner();
    await db.roleAssignment.update({
      where: { id: officer.assignment.id },
      data: {
        role: 'RECORDS_OFFICER',
        scopeType: 'INTAKE',
        scopeRef: '2025',
        capabilities: ['convert-student'],
      },
    });
    for (const path of ['readiness', 'plan'])
      await request(app.getHttpServer())
        .get(`/registration/${path}${query(a)}`)
        .set('Cookie', officer.cookie)
        .expect(404);
    await db.roleAssignment.update({
      where: { id: officer.assignment.id },
      data: { scopeRef: '2026' },
    });
    await request(app.getHttpServer())
      .get(`/registration/readiness${query(a)}`)
      .set('Cookie', officer.cookie)
      .expect(200);
    await db.roleAssignment.update({
      where: { id: officer.assignment.id },
      data: { revokedAt: new Date() },
    });
    await request(app.getHttpServer())
      .get(`/registration/readiness${query(a)}`)
      .set('Cookie', officer.cookie)
      .expect(403);
  });
  it('keeps the student on the assigned curriculum when a newer version is published', async () => {
    const a = await learner();
    const original = await db.curriculumVersion.findUniqueOrThrow({
      where: { id: curriculumId },
    });
    const last = await db.curriculumVersion.aggregate({
      where: { programmeId: original.programmeId },
      _max: { version: true },
    });
    const newer = await db.curriculumVersion.create({
      data: {
        programmeId: original.programmeId,
        version: (last._max.version ?? 0) + 1,
        status: 'PUBLISHED',
      },
    });
    try {
      const board = (
        await request(app.getHttpServer())
          .get(`/registration/plan${query(a)}`)
          .set('Cookie', a.cookie)
          .expect(200)
      ).body;
      expect(board.available.map((c: any) => c.code)).toContain('SWE111');
      await save(a).expect(201);
    } finally {
      await db.curriculumVersion.update({
        where: { id: newer.id },
        data: { status: 'DRAFT' },
      });
    }
  });
  it('does not borrow a study appointment scoped to a different student', async () => {
    const a = await learner();
    await db.roleAssignment.update({
      where: { id: a.assignment.id },
      data: { scopeRef: randomUUID() },
    });
    await ready(a).expect(403);
  });
});
