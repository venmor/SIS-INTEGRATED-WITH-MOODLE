import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHash, randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';

/** REG-001: actual guarded route, PostgreSQL ownership and bounded discovery.
 * Fixture rows are distinct, synthetic and never mutate the retained preview. */
describe('Owned academic registration contexts', () => {
  let app: INestApplication;
  let db: PrismaService;
  let offeringId: string;
  type Student = {
    cookie: string;
    accountId: string;
    personId: string;
    studentId: string;
    assignmentId: string;
    attemptId: string;
  };
  const get = (cookie: string, query = '') =>
    request(app.getHttpServer())
      .get(`/registration/contexts${query}`)
      .set('Cookie', cookie);
  async function student(
    status = 'ACTIVE',
    role = 'STUDENT',
    capabilities = ['study'],
  ): Promise<Student> {
    const person = await db.person.create({
      data: { displayName: 'Fictional context learner' },
    });
    const account = await db.account.create({
      data: { personId: person.id, username: randomUUID() },
    });
    const record = await db.student.create({
      data: { personId: person.id, studentNumber: `CTX-${randomUUID()}` },
    });
    const assignment = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role,
        scopeType: 'STUDENT',
        scopeRef: record.id,
        capabilities,
        startsAt: new Date('2020-01-01'),
        reason: 'Isolated REG-001 fixture',
      },
    });
    const attempt = await db.programmeAttempt.create({
      data: {
        studentId: record.id,
        offeringId,
        applicationId: randomUUID(),
        intake: 'Fictional context intake',
        status,
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
    return {
      cookie: `sid=${token}`,
      accountId: account.id,
      personId: person.id,
      studentId: record.id,
      assignmentId: assignment.id,
      attemptId: attempt.id,
    };
  }
  async function period(code = `CTX-${randomUUID()}`) {
    return db.academicPeriod.create({
      data: {
        code,
        status: 'OPEN',
        registrationOpen: new Date('2026-01-01'),
        registrationClose: new Date('2027-01-01'),
      },
    });
  }
  async function plan(attemptId: string, periodId: string, status = 'DRAFT') {
    return db.coursePlan.create({ data: { attemptId, periodId, status } });
  }
  async function registration(
    attemptId: string,
    periodId: string,
    status = 'REGISTERED',
  ) {
    return db.institutionalRegistration.create({
      data: {
        attemptId,
        periodId,
        status,
        snapshot: {},
        receipt: `CTX-${randomUUID()}`,
      },
    });
  }
  beforeAll(async () => {
    const database = process.env.DATABASE_URL;
    if (
      !database ||
      !new URL(database).pathname.endsWith('sis_setup003_test_2026101203')
    )
      throw new Error('REG-001 uses its distinct owned isolated clone only.');
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
    offeringId = (
      await db.programmeOffering.findFirstOrThrow({
        where: { programme: { code: 'SWE' } },
      })
    ).id;
  });
  afterAll(async () => {
    await app?.close();
  });

  it('discovers current-period options and only owned real plan/registration pairs without academic-date guesses', async () => {
    const owner = await student();
    const other = await student();
    const draft = await period();
    const registered = await period();
    const locked = await period();
    const foreign = await period();
    await plan(owner.attemptId, draft.id);
    await plan(owner.attemptId, registered.id, 'SUBMITTED');
    await registration(owner.attemptId, registered.id);
    await plan(owner.attemptId, locked.id, 'SUBMITTED');
    await plan(other.attemptId, foreign.id);
    const response = await get(owner.cookie).expect(200);
    expect(response.body.source).toBe('OWN_REGISTRATION_CONTEXTS');
    expect(Date.parse(response.body.checkedAt)).not.toBeNaN();
    expect(response.body.configuredPeriod).toEqual({ code: '2026S1' });
    expect(response.body.items).toHaveLength(4);
    expect(
      response.body.items.find(
        (i: { period: string }) => i.period === '2026S1',
      ),
    ).toMatchObject({
      attemptId: owner.attemptId,
      registrationStatus: 'NOT_STARTED',
      configuredCurrent: true,
      periodName: null,
      startDate: null,
      endDate: null,
    });
    expect(
      response.body.items.find(
        (i: { period: string }) => i.period === draft.code,
      ).registrationStatus,
    ).toBe('DRAFT');
    expect(
      response.body.items.find(
        (i: { period: string }) => i.period === registered.code,
      ).registrationStatus,
    ).toBe('REGISTERED');
    expect(
      response.body.items.find(
        (i: { period: string }) => i.period === locked.code,
      ).registrationStatus,
    ).toBe('REVIEW_REQUIRED');
    expect(response.body.soleRegisteredContext).toEqual({
      attemptId: owner.attemptId,
      period: registered.code,
    });
    expect(response.body.nextCursor).toBeNull();
    expect(JSON.stringify(response.body)).not.toContain(other.attemptId);
    expect(JSON.stringify(response.body)).not.toContain(owner.personId);
  });

  it('includes admitted planning attempts but excludes withdrawn attempts and orphan source links', async () => {
    const owner = await student('ADMITTED');
    const withdrawn = await db.programmeAttempt.create({
      data: {
        studentId: owner.studentId,
        offeringId,
        applicationId: randomUUID(),
        intake: 'Withdrawn fixture',
        status: 'WITHDRAWN',
      },
    });
    const withdrawnPeriod = await period();
    await plan(withdrawn.id, withdrawnPeriod.id);
    await plan(owner.attemptId, randomUUID());
    const existing = await period();
    await plan(randomUUID(), existing.id);
    const response = await get(owner.cookie).expect(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      attemptId: owner.attemptId,
      attemptStatus: 'ADMITTED',
      period: '2026S1',
    });
    expect(response.body.soleRegisteredContext).toBeNull();
  });

  it('traverses more than twenty contexts without omission and finds a sole registration beyond the first page', async () => {
    const owner = await student();
    const prefix = randomUUID().slice(0, 8);
    for (let index = 0; index < 23; index++) {
      const p = await period(`CTX-${prefix}-${String(index).padStart(2, '0')}`);
      await plan(owner.attemptId, p.id);
    }
    const last = await period(`ZZZ-${prefix}`);
    await registration(owner.attemptId, last.id);
    const first = await get(owner.cookie).expect(200);
    expect(first.body.items).toHaveLength(20);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    expect(
      first.body.items.some((i: { period: string }) => i.period === last.code),
    ).toBe(false);
    expect(first.body.soleRegisteredContext).toEqual({
      attemptId: owner.attemptId,
      period: last.code,
    });
    const second = await get(
      owner.cookie,
      `?cursor=${encodeURIComponent(first.body.nextCursor)}`,
    ).expect(200);
    expect(second.body.items).toHaveLength(5);
    expect(second.body.nextCursor).toBeNull();
    const all = [...first.body.items, ...second.body.items];
    expect(
      new Set(
        all.map(
          (i: { period: string; attemptId: string }) =>
            `${i.period}/${i.attemptId}`,
        ),
      ).size,
    ).toBe(25);
  });

  it('keeps separate own attempts in one period and refuses arbitrary default selection', async () => {
    const owner = await student();
    const second = await db.programmeAttempt.create({
      data: {
        studentId: owner.studentId,
        offeringId,
        applicationId: randomUUID(),
        intake: 'Second fictional attempt',
        status: 'ACTIVE',
      },
    });
    const p = await period();
    await registration(owner.attemptId, p.id);
    await registration(second.id, p.id);
    const response = await get(owner.cookie).expect(200);
    expect(
      response.body.items.filter(
        (i: { period: string }) => i.period === p.code,
      ),
    ).toHaveLength(2);
    expect(response.body.soleRegisteredContext).toBeNull();
  });

  it('does not treat an admitted or nonregistered source as a confirmed active registration', async () => {
    const owner = await student('ADMITTED');
    const p = await period();
    await registration(owner.attemptId, p.id);
    expect(
      (await get(owner.cookie).expect(200)).body.soleRegisteredContext,
    ).toBeNull();
  });

  it('binds traversal to the current account and appointment and rejects forged or repeated cursors', async () => {
    const owner = await student();
    for (let index = 0; index < 21; index++)
      await plan(owner.attemptId, (await period()).id);
    const cursor = (await get(owner.cookie).expect(200)).body
      .nextCursor as string;
    const other = await student();
    await get(other.cookie, `?cursor=${encodeURIComponent(cursor)}`).expect(
      400,
    );
    await get(
      owner.cookie,
      `?cursor=${encodeURIComponent(`${cursor}x`)}`,
    ).expect(400);
    await get(owner.cookie, '?cursor=bad').expect(400);
    await get(owner.cookie, '?cursor=bad&cursor=other').expect(400);
    const replacement = await db.roleAssignment.create({
      data: {
        accountId: owner.accountId,
        role: 'STUDENT',
        scopeType: 'STUDENT',
        scopeRef: owner.studentId,
        capabilities: ['study'],
        startsAt: new Date('2020-01-01'),
        reason: 'Second isolated appointment',
      },
    });
    const token = randomUUID();
    await db.session.create({
      data: {
        accountId: owner.accountId,
        activeAssignmentId: replacement.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    await get(`sid=${token}`, `?cursor=${encodeURIComponent(cursor)}`).expect(
      400,
    );
  });

  it.each(['APP', 'RECORDS_OFFICER', 'DOMAIN_ADMIN'])(
    'does not grant %s student-owned discovery authority',
    async (role) => {
      const actor = await student('ACTIVE', role, ['study', 'convert-student']);
      await get(actor.cookie).expect(403);
    },
  );

  it.each(['person', 'student', 'assignment', 'capability'] as const)(
    'denies inactive %s authority',
    async (kind) => {
      const owner = await student();
      if (kind === 'person')
        await db.person.update({
          where: { id: owner.personId },
          data: { status: 'INACTIVE' },
        });
      if (kind === 'student')
        await db.student.update({
          where: { id: owner.studentId },
          data: { status: 'INACTIVE' },
        });
      if (kind === 'assignment')
        await db.roleAssignment.update({
          where: { id: owner.assignmentId },
          data: { revokedAt: new Date() },
        });
      if (kind === 'capability')
        await db.roleAssignment.update({
          where: { id: owner.assignmentId },
          data: { capabilities: [] },
        });
      await get(owner.cookie).expect(403);
    },
  );

  it('projects calendar facts only from activated version and leaves draft names absent', async () => {
    const owner = await student();
    const reviewer = await student();
    const p = await period();
    await plan(owner.attemptId, p.id);
    const active = await db.demoInstitutionSetupActivation.findFirst({
      where: { successors: { none: {} } },
    });
    const previous = await db.demoInstitutionSetupVersion.aggregate({
      _max: { version: true },
    });
    const setup = await db.demoInstitutionSetupVersion.create({
      data: {
        version: (previous._max.version ?? 0) + 1,
        profile: {},
        reason: 'REG isolated calendar fixture',
        contentDigest: randomUUID(),
        createdByAccountId: owner.accountId,
        createdByAssignmentId: owner.assignmentId,
        clientRequestId: randomUUID(),
        policyVersion: 'DEMO-SETUP-2026.1',
      },
    });
    await db.academicPeriodVersion.create({
      data: {
        periodId: p.id,
        version: 1,
        name: 'Approved calendar label',
        periodType: 'SEMESTER',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-06-01'),
        setupVersionId: setup.id,
      },
    });
    const draftResponse = await get(owner.cookie).expect(200);
    expect(
      draftResponse.body.items.find(
        (i: { period: string }) => i.period === p.code,
      ).periodName,
    ).toBeNull();
    await db.demoInstitutionSetupActivation.create({
      data: {
        setupVersionId: setup.id,
        previousActivationId: active?.id ?? null,
        approvedByAccountId: reviewer.accountId,
        approvedByAssignmentId: reviewer.assignmentId,
        authenticationStrength: 'ISOLATED_FIXTURE',
        approvalMeaning: 'Isolated read projection test',
        contentDigest: setup.contentDigest,
        commandDigest: randomUUID(),
        clientRequestId: randomUUID(),
        policyVersion: 'DEMO-SETUP-2026.1',
      },
    });
    const activated = await get(owner.cookie).expect(200);
    expect(
      activated.body.items.find((i: { period: string }) => i.period === p.code),
    ).toMatchObject({
      periodName: 'Approved calendar label',
      startDate: '2026-02-01',
      endDate: '2026-06-01',
    });
  });

  it.each(['expired', 'future', 'foreign-scope'] as const)(
    'denies %s student appointment',
    async (kind) => {
      const owner = await student();
      await db.roleAssignment.update({
        where: { id: owner.assignmentId },
        data:
          kind === 'expired'
            ? { endsAt: new Date('2020-01-02') }
            : kind === 'future'
              ? { startsAt: new Date('2099-01-01') }
              : { scopeRef: randomUUID() },
      });
      await get(owner.cookie).expect(403);
    },
  );

  it('recognises the conversion service student-number scope without accepting a foreign scope', async () => {
    const owner = await student();
    const record = await db.student.findUniqueOrThrow({
      where: { id: owner.studentId },
    });
    await db.roleAssignment.update({
      where: { id: owner.assignmentId },
      data: { scopeRef: record.studentNumber },
    });
    await get(owner.cookie).expect(200);
  });

  it('keeps cancelled registration review-only and excludes completed attempts', async () => {
    const owner = await student();
    const p = await period();
    await registration(owner.attemptId, p.id, 'CANCELLED');
    const response = await get(owner.cookie).expect(200);
    expect(
      response.body.items.find((i: { period: string }) => i.period === p.code)
        .registrationStatus,
    ).toBe('REVIEW_REQUIRED');
    expect(response.body.soleRegisteredContext).toBeNull();
    await db.programmeAttempt.update({
      where: { id: owner.attemptId },
      data: { status: 'COMPLETED' },
    });
    expect((await get(owner.cookie).expect(200)).body.items).toHaveLength(0);
  });

  it('rejects unknown filters, empty and oversized cursors rather than silently defaulting', async () => {
    const owner = await student();
    for (const query of [
      '?attemptId=' + randomUUID(),
      '?period=other',
      '?cursor=',
      '?cursor=' + 'x'.repeat(2049),
    ])
      await get(owner.cookie, query).expect(400);
  });

  it('does not automatically select a cancelled period while preserving own registration history', async () => {
    const owner = await student();
    const p = await period();
    await registration(owner.attemptId, p.id);
    expect(
      (await get(owner.cookie).expect(200)).body.soleRegisteredContext,
    ).toEqual({ attemptId: owner.attemptId, period: p.code });
    await db.academicPeriod.update({
      where: { id: p.id },
      data: { status: 'CANCELLED' },
    });
    const cancelled = await get(owner.cookie).expect(200);
    expect(
      cancelled.body.items.find((i: { period: string }) => i.period === p.code)
        .registrationStatus,
    ).toBe('REGISTERED');
    expect(cancelled.body.soleRegisteredContext).toBeNull();
  });

  it.each(['SELF', 'own-person', 'foreign-person'])(
    'checks producer-shaped PERSON %s study authority',
    async (scope) => {
      const owner = await student();
      await db.roleAssignment.update({
        where: { id: owner.assignmentId },
        data: {
          scopeType: 'PERSON',
          scopeRef:
            scope === 'own-person'
              ? owner.personId
              : scope === 'SELF'
                ? 'SELF'
                : randomUUID(),
        },
      });
      await get(owner.cookie).expect(scope === 'foreign-person' ? 403 : 200);
    },
  );

  it('requires a live session and does not turn discovery into registration or planning writes', async () => {
    await request(app.getHttpServer())
      .get('/registration/contexts')
      .expect(401);
    const owner = await student();
    const before = {
      plans: await db.coursePlan.count({
        where: { attemptId: owner.attemptId },
      }),
      registrations: await db.institutionalRegistration.count({
        where: { attemptId: owner.attemptId },
      }),
    };
    await get(owner.cookie).expect(200);
    expect(
      await db.coursePlan.count({ where: { attemptId: owner.attemptId } }),
    ).toBe(before.plans);
    expect(
      await db.institutionalRegistration.count({
        where: { attemptId: owner.attemptId },
      }),
    ).toBe(before.registrations);
  });
});
