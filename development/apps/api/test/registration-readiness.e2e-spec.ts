import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH4-003 registration eligibility summary e2e.
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: readiness-matrix, readiness-closed-period,
 * readiness-hold-blocks, readiness-clearance-fixture, readiness-conditions,
 * readiness-boundaries, readiness-finance-state-only, readiness-stale,
 * readiness-foreign-neutral, readiness-denied.
 */
describe('Phase 4 registration eligibility summary', () => {
  let app: INestApplication;
  let db: PrismaService;
  let officer: string;
  let approver: string;
  let records: string;
  let offeringId: string;
  const csrf = { 'x-requested-with': 'XMLHttpRequest' };
  const key = () => randomUUID();
  const appPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/applications${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const appGet = (path: string, c: string) =>
    request(app.getHttpServer()).get(`/applications${path}`).set('Cookie', c);
  const staffPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/review${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const staffGet = (path: string, c: string) =>
    request(app.getHttpServer()).get(`/review${path}`).set('Cookie', c);
  const recPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/records${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const regGet = (path: string, c: string) =>
    request(app.getHttpServer()).get(`/registration${path}`).set('Cookie', c);

  async function user(
    role: string,
    capabilities: string[],
    scopeType = 'SYSTEM',
    scopeRef = 'GLOBAL',
  ) {
    const person = await db.person.create({
      data: {
        displayName: `Fictional ${role} ${key().slice(0, 8)}`,
        email: `${key()}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username: key() },
    });
    const assignment = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role,
        scopeType,
        scopeRef,
        capabilities,
        reason: 'isolated test',
        startsAt: new Date('2020-01-01'),
      },
    });
    const token = key();
    await db.session.create({
      data: {
        accountId: account.id,
        activeAssignmentId: assignment.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    return { cookie: `sid=${token}`, accountId: account.id };
  }

  async function convertedStudent() {
    const me = await user('APP', ['apply'], 'APPLICATION', key());
    const c = me.cookie;
    const started = await appPost(
      '',
      { offeringId, confirmed: true, idempotencyKey: key() },
      c,
    ).expect(201);
    const id = started.body.id as string;
    let version = started.body.version as number;
    const save = async (section: string, data: object) => {
      const r = await appPost(
        `/${id}/sections/${section}`,
        { version, idempotencyKey: key(), complete: true, data },
        c,
      ).expect(201);
      version = r.body.version as number;
    };
    await save('personal', {
      givenName: 'Ready',
      familyName: 'Student',
      dateOfBirth: '2000-01-01',
    });
    await save('contact', { preferredChannel: 'PORTAL' });
    await save('qualifications', {
      routeCode: 'ECZ',
      institution: 'Fictional ECZ',
      awardTitle: 'Grade 12',
      completionYear: 2025,
      status: 'COMPLETED',
      subjects: [
        { subject: 'Mathematics', grade: 4 },
        { subject: 'English', grade: 5 },
      ],
    });
    const { readFile } = await import('node:fs/promises');
    const pdf = await readFile(
      new URL(
        '../../../packages/test-fixtures/documents/fictional-result.pdf',
        import.meta.url,
      ),
    );
    const uploaded = await request(app.getHttpServer())
      .post(`/applications/${id}/documents`)
      .set(csrf)
      .set('Cookie', c)
      .field('category', 'qualification')
      .field('version', String(version))
      .field('idempotencyKey', key())
      .attach('file', pdf, 'fictional-result.pdf')
      .expect(201);
    const docId = (uploaded.body as { documents: Array<{ id: string }> })
      .documents.at(-1)?.id as string;
    version = (uploaded.body as { version: number }).version;
    await appPost(
      `/${id}/documents/${docId}/scan`,
      { version, idempotencyKey: key() },
      c,
    ).expect(201);
    const review = await appGet(`/${id}/review`, c).expect(200);
    version = review.body.application.version as number;
    await appPost(
      `/${id}/submit`,
      {
        version,
        confirmed: true,
        idempotencyKey: key(),
        declarations: [
          { id: 'accuracy', version: 'DEMO-DECLARATION-v1', accepted: true },
          { id: 'evidence', version: 'DEMO-DECLARATION-v1', accepted: true },
          { id: 'processing', version: 'DEMO-DECLARATION-v1', accepted: true },
        ],
      },
      c,
    ).expect(201);
    const timelineVersion = async () =>
      (
        (await appGet(`/${id}/timeline`, c).expect(200)).body as {
          version: number;
        }
      ).version;
    await staffPost(
      `/${id}/claim`,
      { version: await timelineVersion(), idempotencyKey: key() },
      officer,
    ).expect(201);
    const queue = await staffGet(`/queue/${id}`, officer).expect(200);
    await staffPost(
      `/${id}/recommendations`,
      {
        version: (queue.body as { version: number }).version,
        idempotencyKey: key(),
        eligibilityOutcome: 'ELIGIBLE',
        recommendation: 'FAVOURABLE',
        rationale: 'Fixture recommendation.',
      },
      officer,
    ).expect(201);
    const queue2 = await staffGet(`/queue/${id}`, officer).expect(200);
    await staffPost(
      `/${id}/decision/release`,
      {
        version: (queue2.body as { version: number }).version,
        idempotencyKey: key(),
        outcome: 'ADMIT_WITH_CONDITIONS',
        message: 'Offered a place with conditions.',
        acceptBy: '2027-01-15T17:00:00.000Z',
        conditions: [],
      },
      approver,
    ).expect(201);
    await appPost(
      `/${id}/offer/response`,
      {
        version: await timelineVersion(),
        idempotencyKey: key(),
        decision: 'ACCEPT',
        declarations: [
          'UNDERSTAND_TERMS',
          'ACCEPT_PROGRAMME',
          'INFO_ACCURATE',
          'REGISTRATION_SEPARATE',
        ],
      },
      c,
    ).expect(201);
    for (const taskKey of ['CONFIRM_CONTACT', 'ACCEPT_DECLARATIONS']) {
      await appPost(
        `/${id}/onboarding/tasks`,
        {
          version: await timelineVersion(),
          idempotencyKey: key(),
          taskKey,
        },
        c,
      ).expect(201);
    }
    await recPost(
      `/applications/${id}/convert`,
      { idempotencyKey: key() },
      records,
    ).expect(201);
    const account = await db.application.findUniqueOrThrow({
      where: { id },
      select: { accountId: true },
    });
    const assignment = await db.roleAssignment.findFirstOrThrow({
      where: { accountId: account.accountId, role: 'STUDENT' },
    });
    const token = key();
    await db.session.create({
      data: {
        accountId: account.accountId,
        activeAssignmentId: assignment.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    return { id, cookie: `sid=${token}` };
  }

  type Condition = {
    key: string;
    status: string;
    owner: string;
    detail: string;
    next: string;
  };
  type Assessment = {
    overall: string;
    period: string;
    conditions: Condition[];
  };
  const read = async (cookie: string, query = '') =>
    (
      (await regGet(`/readiness${query}`, cookie).expect(200)).body as Assessment
    );

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
    officer = (
      await user('ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', '2026')
    ).cookie;
    approver = (
      await user('ADMISSIONS_APPROVER', ['decide-offer'], 'INTAKE', '2026')
    ).cookie;
    records = (
      await user('RECORDS_OFFICER', ['convert-student'], 'INTAKE', '2026')
    ).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('readiness-matrix: nine conditions with owners and next steps', async () => {
    const app = await convertedStudent();
    const assessment = await read(app.cookie);
    expect(assessment.period).toBe('2026S1');
    expect(assessment.conditions).toHaveLength(9);
    for (const condition of assessment.conditions) {
      expect(condition.owner).toBeDefined();
      expect(condition.next).toBeDefined();
    }
    const byKey = Object.fromEntries(
      assessment.conditions.map((c) => [c.key, c]),
    );
    expect(byKey['record-active'].status).toBe('READY');
    expect(byKey['programme-intake'].status).toBe('READY');
    expect(byKey['period-open'].status).toBe('READY');
    expect(byKey['progression'].status).toBe('READY');
    expect(byKey['clearance'].status).toBe('READY');
    expect(byKey['programme-conditions'].status).toBe('READY');
    // Selection and declarations arrive in later slices.
    expect(byKey['selection-complete'].status).toBe('ACTION_REQUIRED');
    expect(byKey['declarations'].status).toBe('ACTION_REQUIRED');
    expect(assessment.overall).toBe('AWAITING_STUDENT_INPUT');
  });

  it('readiness-closed-period: a closed period blocks with dates', async () => {
    const app = await convertedStudent();
    const assessment = await read(app.cookie, '?period=2025S2');
    expect(assessment.period).toBe('2025S2');
    const period = assessment.conditions.find((c) => c.key === 'period-open');
    expect(period?.status).toBe('BLOCKED');
    expect(period?.detail ?? '').toMatch(/2025/);
    expect(assessment.overall).toBe('AWAITING_ACADEMIC_APPROVAL');
  });

  it('readiness-hold-blocks: active holds name office and route', async () => {
    const app = await convertedStudent();
    const student = await db.student.findFirstOrThrow({
      where: {
        attempts: { some: { applicationId: app.id } },
      },
    });
    await db.hold.create({
      data: {
        studentId: student.id,
        holdType: 'FEE_ARREARS',
        effect: 'Blocks registration finalization.',
        reason: 'Unpaid prior balance.',
        office: 'Finance',
        status: 'ACTIVE',
      },
    });
    const assessment = await read(app.cookie);
    const holds = assessment.conditions.find((c) => c.key === 'holds-clear');
    expect(holds?.status).toBe('BLOCKED');
    expect(holds?.detail ?? '').toContain('Finance');
    expect(assessment.overall).toBe('AWAITING_FINANCIAL_CLEARANCE');
  });

  it('readiness-clearance-fixture: explicit rows beat the demo default', async () => {
    const app = await convertedStudent();
    const student = await db.student.findFirstOrThrow({
      where: { attempts: { some: { applicationId: app.id } } },
    });
    const period = await db.academicPeriod.findUniqueOrThrow({
      where: { code: '2026S1' },
    });
    await db.financeClearance.create({
      data: {
        studentId: student.id,
        periodId: period.id,
        status: 'HELD',
        expiresAt: new Date('2027-01-01T00:00:00Z'),
      },
    });
    const assessment = await read(app.cookie);
    expect(
      assessment.conditions.find((c) => c.key === 'clearance')?.status,
    ).toBe('BLOCKED');
    expect(assessment.overall).toBe('AWAITING_FINANCIAL_CLEARANCE');
  });

  it('readiness-conditions: blocking programme conditions surface', async () => {
    const app = await convertedStudent();
    // A condition becomes blocking after conversion (projection test: the
    // assessment reflects stored decision data; conversion itself refuses
    // blocking conditions up front).
    const decision = await db.applicationDecision.findUniqueOrThrow({
      where: { applicationId: app.id },
    });
    const conditions = [
      ...(Array.isArray(decision.conditions) ? decision.conditions : []),
      {
        text: 'Provide certified documents.',
        detail: null,
        owner: 'APPLICANT',
        deadline: null,
        blocksMatriculation: true,
      },
    ];
    await db.applicationDecision.update({
      where: { applicationId: app.id },
      data: { conditions: conditions as never },
    });
    const assessment = await read(app.cookie);
    const conditionsRow = assessment.conditions.find(
      (c) => c.key === 'programme-conditions',
    );
    expect(conditionsRow?.status).toBe('ACTION_REQUIRED');
    expect(conditionsRow?.detail ?? '').toContain(
      'Provide certified documents.',
    );
  });

  it('readiness-boundaries: open regulation refs travel with progression', async () => {
    const app = await convertedStudent();
    const assessment = await read(app.cookie);
    const progression = assessment.conditions.find(
      (c) => c.key === 'progression',
    );
    expect(progression?.status).toBe('READY');
    const body = (await regGet('/readiness', app.cookie).expect(200)).body as {
      pendingRegulations: string[];
    };
    expect(body.pendingRegulations).toContain('DEC-PROG-001');
    expect(body.pendingRegulations).toContain('DEC-PROG-002');
  });

  it('readiness-finance-state-only: no ledger detail leaks', async () => {
    const app = await convertedStudent();
    const payload = JSON.stringify(await read(app.cookie));
    expect(payload).not.toMatch(/balance|transaction|amount|invoice/i);
  });

  it('readiness-stale: expired clearance blocks as expired', async () => {
    const app = await convertedStudent();
    const student = await db.student.findFirstOrThrow({
      where: { attempts: { some: { applicationId: app.id } } },
    });
    const period = await db.academicPeriod.findUniqueOrThrow({
      where: { code: '2026S1' },
    });
    await db.financeClearance.create({
      data: {
        studentId: student.id,
        periodId: period.id,
        status: 'CLEARED',
        expiresAt: new Date('2020-01-01T00:00:00Z'),
      },
    });
    const assessment = await read(app.cookie);
    const clearance = assessment.conditions.find((c) => c.key === 'clearance');
    expect(clearance?.status).toBe('BLOCKED');
    expect(clearance?.detail ?? '').toMatch(/expir/i);
  });

  it('readiness-foreign-neutral: unknown attempts and periods 404', async () => {
    const app = await convertedStudent();
    await regGet(`/readiness?attemptId=${randomUUID()}`, app.cookie).expect(
      404,
    );
    await regGet('/readiness?period=NOPE', app.cookie).expect(404);
    // Another student's attempt is not visible through this session.
    const stranger = await convertedStudent();
    const otherAttempt = await db.programmeAttempt.findFirstOrThrow({
      where: { applicationId: stranger.id },
    });
    await regGet(
      `/readiness?attemptId=${otherAttempt.id}`,
      app.cookie,
    ).expect(404);
  });

  it('readiness-denied: non-student workspaces refused', async () => {
    const applicant = await user('APP', ['apply'], 'APPLICATION', key());
    await regGet('/readiness', applicant.cookie).expect(403);
    await regGet('/readiness', officer).expect(403);
  });
});
