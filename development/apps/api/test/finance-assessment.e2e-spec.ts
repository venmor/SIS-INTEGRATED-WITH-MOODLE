import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH5-001 versioned fee assessment e2e (RED first).
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: assess-happy-path, assess-append-only,
 * assess-unknown, assess-duplicate, assess-concurrent, assess-denied,
 * assess-money, assess-neutral.
 */
describe('Phase 5 versioned fee assessment', () => {
  let app: INestApplication;
  let nestApp: INestApplication;
  let db: PrismaService;
  let officer: string;
  let approver: string;
  let records: string;
  let finance: string;
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
  const regPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/registration${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const finPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/finance${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const finGet = (path: string, c: string) =>
    request(app.getHttpServer()).get(`/finance${path}`).set('Cookie', c);

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
      givenName: 'Fee',
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

  async function registeredStudent(codes = ['SWE111', 'MTH111', 'ENG111']) {
    const app = await convertedStudent();
    const saved = await regPost(
      '/plan',
      { version: 1, idempotencyKey: key(), courseCodes: codes },
      app.cookie,
    ).expect(201);
    const planVersion = (saved.body as { version: number }).version;
    await regPost(
      '/submit',
      { version: planVersion, idempotencyKey: key(), declarations: DECLARATIONS },
      app.cookie,
    ).expect(201);
    return app;
  }

  const assess = (cookie: string, body: object) =>
    finPost('/assess', { idempotencyKey: key(), ...body }, cookie);

  async function attemptOf(applicationId: string) {
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId },
    });
    return attempt.id;
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
    nestApp = app;
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
    finance = (
      await user('FINANCE_OFFICER', ['assess-charges'], 'FINANCE', 'GLOBAL')
    ).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('assess-happy-path: charges + invoice + reference from registration', async () => {
    const app = await registeredStudent();
    const res = await assess(finance, {
      attemptId: await attemptOf(app.id),
    }).expect(201);
    const body = res.body as {
      reference: string;
      period: string;
      policyVersion: string;
      status: string;
      lines: Array<{
        code: string;
        courseCode: string | null;
        amountMinor: number;
        currency: string;
      }>;
      totalMinor: number;
      currency: string;
    };
    expect(body.reference).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(body.period).toBe('2026S1');
    expect(body.policyVersion).toBe('FINANCE-DEMO-v1');
    expect(body.status).toBe('ISSUED');
    expect(body.currency).toBe('ZMW');
    const codes = body.lines.map((l) => l.code).sort();
    expect(codes).toEqual([
      'COURSE_FEE',
      'COURSE_FEE',
      'COURSE_FEE',
      'REGISTRATION_FEE',
    ]);
    expect(
      body.lines.every((l) => Number.isInteger(l.amountMinor) && l.amountMinor > 0),
    ).toBe(true);
    expect(
      body.lines.every((l) => l.currency === 'ZMW'),
    ).toBe(true);
    expect(body.totalMinor).toBe(
      body.lines.reduce((sum, l) => sum + l.amountMinor, 0),
    );
  });

  it('assess-money: every line names rule, version and inputs', async () => {
    const app = await registeredStudent();
    const res = await assess(finance, {
      attemptId: await attemptOf(app.id),
    }).expect(201);
    const lines = (
      res.body as {
        lines: Array<{
          feeRule: string;
          policyVersion: string;
          description: string;
        }>;
      }
    ).lines;
    expect(
      lines.every(
        (l) =>
          l.feeRule.length > 0 &&
          l.policyVersion === 'FINANCE-DEMO-v1' &&
          l.description.length > 0,
      ),
    ).toBe(true);
  });

  it('assess-append-only: roster growth adds lines, never edits posted ones', async () => {
    const student = await registeredStudent(['SWE111', 'MTH111']);
    const attemptId = await attemptOf(student.id);
    const first = await assess(finance, { attemptId }).expect(201);
    const firstLines = (first.body as { lines: unknown[] }).lines;
    expect(firstLines).toHaveLength(3);
    const before = await db.financeChargeLine.findMany({
      where: { invoice: { reference: (first.body as { reference: string }).reference } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true },
    });
    // Student adds an elective through the approved change flow, then a
    // re-assessment picks up only the new course.
    const created = await request(nestApp.getHttpServer())
      .post('/registration/changes')
      .set(csrf)
      .set('Cookie', student.cookie)
      .send({
        kind: 'ADD',
        courseCode: 'BUS111',
        reason: 'Append-only check.',
        idempotencyKey: key(),
      })
      .expect(201);
    await request(nestApp.getHttpServer())
      .post(`/registration/amendments/${(created.body as { id: string }).id}/decide`)
      .set(csrf)
      .set('Cookie', records)
      .send({ approve: true, idempotencyKey: key() })
      .expect(201);
    // The approved addition joins the roster; re-assessment appends exactly
    // one new posted line and never touches the posted ones.
    const second = await assess(finance, { attemptId }).expect(201);
    const secondLines = (
      second.body as {
        lines: Array<{ code: string; courseCode: string | null }>;
      }
    ).lines;
    expect(secondLines).toHaveLength(4);
    expect(
      secondLines.filter((l) => l.courseCode === 'BUS111'),
    ).toHaveLength(1);
    const after = await db.financeChargeLine.findMany({
      where: {
        invoice: { reference: (first.body as { reference: string }).reference },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    expect(after.map((r) => r.id).slice(0, 3)).toEqual(
      before.map((r) => r.id),
    );
  });

  it('assess-duplicate: replays return the stored invoice', async () => {
    const app = await registeredStudent();
    const attemptId = await attemptOf(app.id);
    const same = key();
    const first = await finPost(
      '/assess',
      { idempotencyKey: same, attemptId },
      finance,
    ).expect(201);
    const replay = await finPost(
      '/assess',
      { idempotencyKey: same, attemptId },
      finance,
    ).expect(201);
    expect(replay.body).toEqual(first.body);
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: app.id },
    });
    const student = await db.student.findFirstOrThrow({
      where: { attempts: { some: { id: attempt.id } } },
    });
    expect(
      await db.financeInvoice.count({
        where: { account: { studentId: student.id } },
      }),
    ).toBe(1);
  });

  it('assess-concurrent: two triggers yield one invoice', async () => {
    const app = await registeredStudent();
    const attemptId = await attemptOf(app.id);
    const [left, right] = await Promise.all([
      assess(finance, { attemptId }),
      assess(finance, { attemptId }),
    ]);
    expect(left.status).toBe(201);
    expect(right.status).toBe(201);
    expect(left.body.reference).toBe(right.body.reference);
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: app.id },
    });
    const student = await db.student.findFirstOrThrow({
      where: { attempts: { some: { id: attempt.id } } },
    });
    expect(
      await db.financeInvoice.count({
        where: { account: { studentId: student.id } },
      }),
    ).toBe(1);
  });

  it('assess-unknown: missing registration and period 404', async () => {
    const app = await registeredStudent();
    const attemptId = await attemptOf(app.id);
    await assess(finance, { attemptId, period: 'NOPE' }).expect(404);
    await assess(finance, { attemptId: randomUUID() }).expect(404);
    // No registration at all: converted but never registered.
    const bare = await convertedStudent();
    const bareAttempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: bare.id },
    });
    await assess(finance, { attemptId: bareAttempt.id }).expect(404);
  });

  it('assess-denied: students assess nothing, lecturers see no amounts', async () => {
    const app = await registeredStudent();
    const attemptId = await attemptOf(app.id);
    await assess(app.cookie, { attemptId }).expect(403);
    const lecturer = await user('LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    await assess(lecturer.cookie, {}).expect(403);
    await finGet('/invoices?period=2026S1', lecturer.cookie).expect(403);
    const applicant = await user('APP', ['apply'], 'APPLICATION', key());
    await assess(applicant.cookie, {}).expect(403);
  });

  it('assess-neutral: invoice reads are own-record only', async () => {
    const app = await registeredStudent();
    const attemptId = await attemptOf(app.id);
    await assess(finance, { attemptId }).expect(201);
    await assess(finance, {}).expect(400);
    const shown = await finGet('/invoices?period=2026S1', app.cookie).expect(200);
    expect(
      (shown.body as { reference: string }).reference,
    ).toMatch(/^INV-\d{4}-\d{4}$/);
    const other = await registeredStudent();
    await assess(finance, { attemptId: await attemptOf(other.id) }).expect(201);
    // No cross-student invoice access: the read is bound to the caller.
    const mine = await finGet('/invoices?period=2026S1', other.cookie).expect(200);
    expect((mine.body as { reference: string }).reference).not.toBe(
      (shown.body as { reference: string }).reference,
    );
  });
});
