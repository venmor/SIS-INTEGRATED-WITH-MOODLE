import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH5-002 student account and statement e2e (RED first).
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: account-summary, account-wording, statement-lines,
 * statement-totals, receipt-absent, account-empty, account-denied,
 * account-neutral.
 */
describe('Phase 5 student account and statement', () => {
  let app: INestApplication;
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
      givenName: 'Statement',
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

  async function invoicedStudent(codes = ['SWE111', 'MTH111', 'ENG111']) {
    const student = await convertedStudent();
    const saved = await regPost(
      '/plan',
      { version: 1, idempotencyKey: key(), courseCodes: codes },
      student.cookie,
    ).expect(201);
    const planVersion = (saved.body as { version: number }).version;
    await regPost(
      '/submit',
      { version: planVersion, idempotencyKey: key(), declarations: DECLARATIONS },
      student.cookie,
    ).expect(201);
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    await finPost(
      '/assess',
      { idempotencyKey: key(), attemptId: attempt.id },
      finance,
    ).expect(201);
    return student;
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

  it('account-summary: period, status, amount, action, deadline, support', async () => {
    const student = await invoicedStudent();
    const res = await finGet('/account?period=2026S1', student.cookie).expect(200);
    const body = res.body as {
      studentNumber: string;
      period: string;
      clearanceStatus: string;
      clearanceWording: string;
      outstandingMinor: number;
      currency: string;
      blocksRegistration: boolean;
      nextAction: string;
      dueAt: string | null;
      sponsorship: string;
      refreshedAt: string;
      supportRoute: string;
    };
    expect(body.studentNumber).toMatch(/^STU-2026-\d{4}$/);
    expect(body.period).toBe('2026S1');
    expect(body.clearanceStatus).toBe('NOT_ASSESSED');
    expect(body.clearanceWording).toBe('Clearance is being prepared');
    expect(body.currency).toBe('ZMW');
    expect(Number.isInteger(body.outstandingMinor)).toBe(true);
    expect(body.outstandingMinor).toBeGreaterThan(0);
    expect(body.blocksRegistration).toBe(true);
    expect(body.nextAction.length).toBeGreaterThan(0);
    expect(body.dueAt).not.toBeNull();
    expect(body.sponsorship).toBe(
      'No confirmed sponsorship is currently linked to this period',
    );
    expect(body.supportRoute.length).toBeGreaterThan(0);
  });

  it('account-wording: held clearance names the block plainly', async () => {
    const student = await invoicedStudent();
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    const attemptStudent = await db.student.findFirstOrThrow({
      where: { attempts: { some: { id: attempt.id } } },
    });
    const period = await db.academicPeriod.findUniqueOrThrow({
      where: { code: '2026S1' },
    });
    await db.financeClearance.upsert({
      where: {
        studentId_periodId: { studentId: attemptStudent.id, periodId: period.id },
      },
      update: { status: 'HELD' },
      create: { studentId: attemptStudent.id, periodId: period.id, status: 'HELD' },
    });
    const res = await finGet('/account?period=2026S1', student.cookie).expect(200);
    const body = res.body as {
      clearanceStatus: string;
      clearanceWording: string;
      blocksRegistration: boolean;
    };
    expect(body.clearanceStatus).toBe('HELD');
    expect(body.clearanceWording).toBe('Registration is currently blocked');
    expect(body.blocksRegistration).toBe(true);
  });

  it('statement-lines: charges in order with currency and source', async () => {
    const student = await invoicedStudent();
    const res = await finGet('/statement?period=2026S1', student.cookie).expect(200);
    const body = res.body as {
      reference: string;
      lines: Array<{
        kind: string;
        description: string;
        amountMinor: number;
        currency: string;
        status: string;
        createdAt: string;
      }>;
      payments: unknown[];
      allocations: unknown[];
    };
    expect(body.reference).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(body.lines).toHaveLength(4);
    expect(
      body.lines.every(
        (l) =>
          l.kind === 'CHARGE' &&
          l.currency === 'ZMW' &&
          Number.isInteger(l.amountMinor),
      ),
    ).toBe(true);
    expect(body.payments).toEqual([]);
    expect(body.allocations).toEqual([]);
  });

  it('statement-totals: invoiced, paid and outstanding reconcile', async () => {
    const student = await invoicedStudent();
    const res = await finGet('/statement?period=2026S1', student.cookie).expect(200);
    const body = res.body as {
      invoicedMinor: number;
      paidMinor: number;
      outstandingMinor: number;
      currency: string;
    };
    expect(body.currency).toBe('ZMW');
    expect(body.paidMinor).toBe(0);
    expect(body.outstandingMinor).toBe(body.invoicedMinor);
    expect(body.invoicedMinor).toBeGreaterThan(0);
  });

  it('receipt-absent: no receipt before any confirmed payment', async () => {
    const student = await invoicedStudent();
    const res = await finGet(
      '/receipts/INV-2026-0000',
      student.cookie,
    ).expect(404);
    expect((res.body as { code: string }).code).toBe('RECEIPT_NOT_FOUND');
  });

  it('account-empty: no invoice yet says so safely', async () => {
    const student = await convertedStudent();
    const res = await finGet('/account?period=2026S1', student.cookie).expect(404);
    expect((res.body as { code: string }).code).toBe('INVOICE_NOT_READY');
    await finGet('/statement?period=2026S1', student.cookie).expect(404);
  });

  it('account-denied: academic roles see no amounts', async () => {
    const student = await invoicedStudent();
    void student;
    const lecturer = await user('LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    await finGet('/account?period=2026S1', lecturer.cookie).expect(403);
    await finGet('/statement?period=2026S1', lecturer.cookie).expect(403);
    await finGet('/receipts/INV-2026-0001', lecturer.cookie).expect(403);
    const applicant = await user('APP', ['apply'], 'APPLICATION', key());
    await finGet('/account?period=2026S1', applicant.cookie).expect(403);
  });

  it('account-neutral: unknown periods 404 without disclosure', async () => {
    const student = await invoicedStudent();
    await finGet('/account?period=NOPE', student.cookie).expect(404);
    await finGet('/statement?period=NOPE', student.cookie).expect(404);
  });
});
