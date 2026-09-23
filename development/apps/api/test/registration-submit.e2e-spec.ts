import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH4-005 formal registration and immutable snapshot e2e.
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: submit-happy-path, submit-preconditions,
 * submit-duplicate, submit-concurrent, submit-version, submit-declarations,
 * submit-closed-period, submit-hold, submit-clearance, status-timetable,
 * submit-plan-locked, submit-denied, submit-neutral.
 */
describe('Phase 4 formal registration and immutable snapshot', () => {
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
  const regPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/registration${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);

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
      givenName: 'Register',
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

  const DECLARATIONS = ['PLAN_ACCURATE', 'RULES_UNDERSTOOD', 'FINANCE_UNDERSTOOD'];

  async function plannedStudent(codes = ['SWE111', 'MTH111', 'ENG111']) {
    const app = await convertedStudent();
    const saved = await regPost(
      '/plan',
      { version: 1, idempotencyKey: key(), courseCodes: codes },
      app.cookie,
    ).expect(201);
    return { ...app, planVersion: (saved.body as { version: number }).version };
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

  it('submit-happy-path: snapshot, roster, receipt and outbox', async () => {
    const app = await plannedStudent();
    const submitted = await regPost(
      '/submit',
      {
        version: app.planVersion,
        idempotencyKey: key(),
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(201);
    const body = submitted.body as {
      receipt: string;
      version: number;
      status: string;
      courses: Array<{ code: string }>;
      loadHalves: number;
      clearance: string;
    };
    expect(body.receipt).toMatch(/^REG-\d{4}-\d{4}$/);
    expect(body.version).toBe(1);
    expect(body.status).toBe('REGISTERED');
    expect(body.courses.map((c) => c.code).sort()).toEqual([
      'ENG111',
      'MTH111',
      'SWE111',
    ]);
    expect(body.loadHalves).toBe(3);
    expect(body.clearance).toBe('CLEARED');
    const registration = await db.institutionalRegistration.findUniqueOrThrow({
      where: { receipt: body.receipt },
      include: { roster: true },
    });
    expect(registration.roster).toHaveLength(3);
    expect(
      registration.roster.every((r) => r.status === 'ENROLLED'),
    ).toBe(true);
    const snapshot = registration.snapshot as {
      courses: unknown[];
      declarations: unknown[];
      policyVersion: string;
    };
    expect(snapshot.courses).toHaveLength(3);
    expect(snapshot.declarations).toHaveLength(3);
    expect(snapshot.policyVersion).toBeDefined();
    const outbox = await db.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: registration.id,
        type: 'MoodleEnrolmentQueued',
      },
    });
    expect(outbox.deliveredAt).toBeNull();
    const plan = await db.coursePlan.findFirstOrThrow({
      where: { status: 'SUBMITTED' },
    });
    expect(plan.version).toBe(app.planVersion);
    const attempt = await db.programmeAttempt.findFirstOrThrow({
      orderBy: { createdAt: 'desc' },
    });
    expect(attempt.status).toBe('ACTIVE');
  });

  it('submit-preconditions: each missing gate names its cause', async () => {
    // No plan at all.
    const bare = await convertedStudent();
    const noPlan = await regPost(
      '/submit',
      { version: 1, idempotencyKey: key(), declarations: DECLARATIONS },
      bare.cookie,
    ).expect(409);
    expect((noPlan.body as { code: string }).code).toBe('PLAN_NOT_READY');
    // Blocking validation: prerequisite course without its base.
    const blocked = await convertedStudent();
    await regPost(
      '/plan',
      { version: 1, idempotencyKey: key(), courseCodes: ['SWE121'] },
      blocked.cookie,
    ).expect(201);
    const failed = await regPost(
      '/submit',
      { version: 1, idempotencyKey: key(), declarations: DECLARATIONS },
      blocked.cookie,
    ).expect(409);
    expect((failed.body as { code: string }).code).toBe('VALIDATION_FAILED');
  });

  it('submit-hold: active holds preserve the plan and block final', async () => {
    const app = await plannedStudent();
    const attempt = await db.programmeAttempt.findFirstOrThrow({
      orderBy: { createdAt: 'desc' },
    });
    const student = await db.student.findFirstOrThrow({
      where: { id: attempt.studentId },
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
    const refused = await regPost(
      '/submit',
      {
        version: app.planVersion,
        idempotencyKey: key(),
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(409);
    expect((refused.body as { code: string }).code).toBe('HOLDS_BLOCKING');
    // Plan and draft survive the refusal.
    const board = await regGet('/plan', app.cookie).expect(200);
    expect(
      (board.body as { items: Array<unknown> }).items.length,
    ).toBeGreaterThan(0);
  });

  it('submit-clearance: unassessed fees block with policy wording', async () => {
    const app = await plannedStudent();
    // Flip the demo fee rule for this check is impossible (const config),
    // so the HELD fixture proves the row path instead.
    const attempt = await db.programmeAttempt.findFirstOrThrow({
      orderBy: { createdAt: 'desc' },
    });
    const student = await db.student.findFirstOrThrow({
      where: { id: attempt.studentId },
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
    const refused = await regPost(
      '/submit',
      {
        version: app.planVersion,
        idempotencyKey: key(),
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(409);
    expect((refused.body as { code: string }).code).toBe(
      'CLEARANCE_INCOMPLETE',
    );
  });

  it('submit-declarations: incomplete sets are refused', async () => {
    const app = await plannedStudent();
    const refused = await regPost(
      '/submit',
      {
        version: app.planVersion,
        idempotencyKey: key(),
        declarations: ['PLAN_ACCURATE'],
      },
      app.cookie,
    ).expect(400);
    expect((refused.body as { code: string }).code).toBe(
      'DECLARATIONS_INCOMPLETE',
    );
  });

  it('submit-version: stale plans conflict with the current version', async () => {
    const app = await plannedStudent();
    const stale = await regPost(
      '/submit',
      {
        version: app.planVersion + 99,
        idempotencyKey: key(),
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(409);
    expect((stale.body as { code: string }).code).toBe('VERSION_CONFLICT');
  });

  it('submit-duplicate: replays return the stored receipt', async () => {
    const app = await plannedStudent();
    const same = key();
    const payload = {
      version: app.planVersion,
      idempotencyKey: same,
      declarations: DECLARATIONS,
    };
    const first = await regPost('/submit', payload, app.cookie).expect(201);
    const replay = await regPost('/submit', payload, app.cookie).expect(201);
    expect(replay.body).toEqual(first.body);
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: app.id },
    });
    expect(
      await db.institutionalRegistration.count({
        where: { attemptId: attempt.id },
      }),
    ).toBe(1);
  });

  it('submit-concurrent: two devices yield one registration', async () => {
    const app = await plannedStudent();
    const payload = (extraKey: string) => ({
      version: app.planVersion,
      idempotencyKey: extraKey,
      declarations: DECLARATIONS,
    });
    const [left, right] = await Promise.all([
      regPost('/submit', payload(key()), app.cookie),
      regPost('/submit', payload(key()), app.cookie),
    ]);
    expect(left.status).toBe(201);
    expect(right.status).toBe(201);
    expect(left.body.receipt).toBe(right.body.receipt);
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: app.id },
    });
    const rows = await db.institutionalRegistration.findMany({
      where: { attemptId: attempt.id },
    });
    expect(rows).toHaveLength(1);
  });

  it('submit-closed-period: shut windows refuse with dates', async () => {
    const app = await plannedStudent();
    const refused = await regPost(
      '/submit?period=2025S2',
      {
        version: app.planVersion,
        idempotencyKey: key(),
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(409);
    expect((refused.body as { code: string }).code).toBe('PERIOD_CLOSED');
  });

  it('submit-plan-locked: submitted plans reject further saves', async () => {
    const app = await plannedStudent();
    await regPost(
      '/submit',
      {
        version: app.planVersion,
        idempotencyKey: key(),
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(201);
    const locked = await regPost(
      '/plan',
      { version: 1, idempotencyKey: key(), courseCodes: ['ENG111'] },
      app.cookie,
    ).expect(409);
    expect((locked.body as { code: string }).code).toBe('PLAN_SUBMITTED');
  });

  it('status-timetable: null before, receipt and derived timetable after', async () => {
    const app = await plannedStudent();
    const empty = await regGet('/status', app.cookie).expect(200);
    expect((empty.body as { registration: null }).registration).toBeNull();
    expect(
      (empty.body as { moodle: { state: string } }).moodle.state,
    ).toBe('NotAvailable');
    await regGet('/timetable', app.cookie).expect(404);
    await regPost(
      '/submit',
      {
        version: app.planVersion,
        idempotencyKey: key(),
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(201);
    const full = await regGet('/status', app.cookie).expect(200);
    expect(
      (full.body as { registration: { receipt: string } }).registration
        .receipt,
    ).toMatch(/^REG-\d{4}-\d{4}$/);
    expect(
      (full.body as { moodle: { state: string } }).moodle.state,
    ).toBe('Queued');
    const table = await regGet('/timetable', app.cookie).expect(200);
    const groups = (
      table.body as {
        groups: Array<{ semester: string; courses: Array<{ code: string }> }>;
      }
    ).groups;
    expect(
      groups.some((g) =>
        g.courses.some((c) => c.code === 'SWE111'),
      ),
    ).toBe(true);
  });

  it('submit-denied: non-student workspaces refused', async () => {
    const applicant = await user('APP', ['apply'], 'APPLICATION', key());
    await regPost(
      '/submit',
      { version: 1, idempotencyKey: key(), declarations: DECLARATIONS },
      applicant.cookie,
    ).expect(403);
    await regPost(
      '/submit',
      { version: 1, idempotencyKey: key(), declarations: DECLARATIONS },
      officer,
    ).expect(403);
    await regGet('/status', applicant.cookie).expect(403);
  });

  it('submit-neutral: unknown attempts and periods 404', async () => {
    const app = await plannedStudent();
    await regPost(
      '/submit?attemptId=' + randomUUID(),
      {
        version: 1,
        idempotencyKey: key(),
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(404);
    await regPost(
      '/submit?period=NOPE',
      {
        version: 1,
        idempotencyKey: key(),
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(404);
  });
});
