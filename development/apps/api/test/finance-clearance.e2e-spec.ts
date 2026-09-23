import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH5-005 allocation, balance and clearance calculation e2e (RED first).
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: clear-full, clear-partial, clear-sponsor,
 * clear-reversal, clear-review-case, clear-manual-denied,
 * clear-registration, clear-idempotent, clear-neutral.
 */
describe('Phase 5 allocation, balance and clearance', () => {
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
  const regGet = (path: string, c: string) =>
    request(app.getHttpServer()).get(`/registration${path}`).set('Cookie', c);
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
      givenName: 'Clear',
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

  async function payAndConfirm(
    cookie: string,
    body: Record<string, unknown> = {},
  ) {
    const initiated = await finPost(
      '/payments/initiate',
      { idempotencyKey: key(), method: 'MOBILE_MONEY', ...body },
      cookie,
    ).expect(201);
    const reference = (initiated.body as { reference: string }).reference;
    await finPost(
      '/simulator/dispatch',
      { idempotencyKey: key(), requestReference: reference },
      cookie,
    ).expect(201);
    return reference;
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

  it('clear-full: full payment clears with versioned policy result', async () => {
    const student = await invoicedStudent();
    const reference = await payAndConfirm(student.cookie);
    const account = await finGet('/account?period=2026S1', student.cookie).expect(200);
    const body = account.body as {
      clearanceStatus: string;
      clearanceWording: string;
      blocksRegistration: boolean;
      outstandingMinor: number;
    };
    expect(body.clearanceStatus).toBe('CLEARED');
    expect(body.clearanceWording).toBe('Financial clearance complete');
    expect(body.blocksRegistration).toBe(false);
    expect(body.outstandingMinor).toBe(0);
    const statement = await finGet('/statement?period=2026S1', student.cookie).expect(200);
    const totals = statement.body as {
      invoicedMinor: number;
      paidMinor: number;
      outstandingMinor: number;
      allocations: Array<{ chargeCode: string; amountMinor: number }>;
    };
    expect(totals.paidMinor).toBe(totals.invoicedMinor);
    expect(totals.outstandingMinor).toBe(0);
    expect(totals.allocations.length).toBeGreaterThan(0);
    const receipt = await finGet(`/receipts/${reference}`, student.cookie).expect(200);
    expect(
      ((receipt.body as { allocations: unknown[] }).allocations).length,
    ).toBeGreaterThan(0);
  });

  it('clear-partial: part payment stays pending with the remainder due', async () => {
    const student = await invoicedStudent();
    await payAndConfirm(student.cookie, { amountMinor: 10000 });
    const account = await finGet('/account?period=2026S1', student.cookie).expect(200);
    const body = account.body as {
      clearanceStatus: string;
      blocksRegistration: boolean;
      outstandingMinor: number;
    };
    expect(body.clearanceStatus).toBe('PENDING');
    expect(body.blocksRegistration).toBe(true);
    const statement = await finGet('/statement?period=2026S1', student.cookie).expect(200);
    const totals = statement.body as {
      invoicedMinor: number;
      paidMinor: number;
      outstandingMinor: number;
    };
    expect(totals.paidMinor).toBe(10000);
    expect(totals.outstandingMinor).toBe(totals.invoicedMinor - 10000);
  });

  it('clear-sponsor: confirmed coverage clears without cash', async () => {
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
    const accountRow = await db.financeAccount.findUniqueOrThrow({
      where: { studentId: attemptStudent.id },
    });
    const invoice = await db.financeInvoice.findUniqueOrThrow({
      where: {
        accountId_periodId: { accountId: accountRow.id, periodId: period.id },
      },
      include: { lines: true },
    });
    const total = invoice.lines.reduce((sum, l) => sum + l.amountMinor, 0);
    // Sponsorship writer arrives in slice 6; the row here proves the
    // calculator already treats confirmed coverage as cover, not cash.
    await db.financeSponsorship.create({
      data: {
        accountId: accountRow.id,
        periodId: period.id,
        sponsorName: 'Fictional Bursary Board',
        categories: ['Tuition'],
        coverageType: 'AMOUNT',
        coverageValue: total,
        status: 'CONFIRMED',
        version: 1,
      },
    });
    // A zero-effect trigger still recalculates: any later payment event.
    await payAndConfirm(student.cookie, { amountMinor: 100 });
    const account = await finGet('/account?period=2026S1', student.cookie).expect(200);
    expect((account.body as { clearanceStatus: string }).clearanceStatus).toBe(
      'CLEARED',
    );
  });

  it('clear-reversal: reversal after clearance re-blocks with a hold', async () => {
    const student = await invoicedStudent();
    const reference = await payAndConfirm(student.cookie);
    await finPost(
      '/simulator/dispatch',
      {
        idempotencyKey: key(),
        requestReference: reference,
        outcome: 'REVERSAL',
      },
      student.cookie,
    ).expect(201);
    const account = await finGet('/account?period=2026S1', student.cookie).expect(200);
    const body = account.body as {
      clearanceStatus: string;
      blocksRegistration: boolean;
    };
    expect(body.clearanceStatus).toBe('HELD');
    expect(body.blocksRegistration).toBe(true);
    const readiness = await regGet('/readiness', student.cookie).expect(200);
    const conditions = (
      readiness.body as {
        conditions: Array<{ key: string; status: string }>;
      }
    ).conditions;
    expect(conditions.find((c) => c.key === 'clearance')?.status).toBe('BLOCKED');
  });

  it('clear-review-case: open cases force manual review', async () => {
    const student = await invoicedStudent();
    const initiated = await finPost(
      '/payments/initiate',
      { idempotencyKey: key(), method: 'MOBILE_MONEY' },
      student.cookie,
    ).expect(201);
    const reference = (initiated.body as { reference: string }).reference;
    await finPost(
      '/simulator/dispatch',
      {
        idempotencyKey: key(),
        requestReference: reference,
        outcome: 'MISMATCH',
      },
      student.cookie,
    ).expect(202);
    const account = await finGet('/account?period=2026S1', student.cookie).expect(200);
    expect((account.body as { clearanceStatus: string }).clearanceStatus).toBe(
      'MANUAL_REVIEW',
    );
  });

  it('clear-manual-denied: no endpoint toggles clearance', async () => {
    const student = await invoicedStudent();
    void student;
    await request(app.getHttpServer())
      .put('/finance/clearance')
      .set(csrf)
      .set('Cookie', finance)
      .send({ status: 'CLEARED' })
      .expect(404);
    await request(app.getHttpServer())
      .patch('/finance/clearance')
      .set(csrf)
      .set('Cookie', finance)
      .send({ status: 'CLEARED' })
      .expect(404);
    // The writer stamps its policy version; staff never hand-set status.
    const versions = await db.financeClearance.findMany({
      select: { policyVersion: true },
    });
    expect(
      versions.every(
        (v) => v.policyVersion === null || v.policyVersion === 'FINANCE-DEMO-v1',
      ),
    ).toBe(true);
  });

  it('clear-registration: real writer feeds the registration gate', async () => {
    const student = await invoicedStudent();
    await payAndConfirm(student.cookie);
    const readiness = await regGet('/readiness', student.cookie).expect(200);
    const conditions = (
      readiness.body as {
        conditions: Array<{ key: string; status: string }>;
      }
    ).conditions;
    expect(conditions.find((c) => c.key === 'clearance')?.status).toBe('READY');
  });

  it('clear-idempotent: repeated triggers settle one outcome', async () => {
    const student = await invoicedStudent();
    const first = await payAndConfirm(student.cookie);
    void first;
    const one = await finGet('/account?period=2026S1', student.cookie).expect(200);
    const two = await finGet('/account?period=2026S1', student.cookie).expect(200);
    const { refreshedAt: _ra, ...firstRead } = one.body as Record<
      string,
      unknown
    >;
    const { refreshedAt: _rb, ...secondRead } = two.body as Record<
      string,
      unknown
    >;
    void _ra;
    void _rb;
    expect(firstRead).toEqual(secondRead);
    const attempt = await db.programmeAttempt.findUniqueOrThrow({
      where: { applicationId: student.id },
    });
    const attemptStudent = await db.student.findFirstOrThrow({
      where: { attempts: { some: { id: attempt.id } } },
    });
    const period = await db.academicPeriod.findUniqueOrThrow({
      where: { code: '2026S1' },
    });
    expect(
      await db.financeClearance.count({
        where: { studentId: attemptStudent.id, periodId: period.id },
      }),
    ).toBe(1);
  });

  it('clear-neutral: unknown periods stay neutral', async () => {
    const student = await invoicedStudent();
    await finGet('/account?period=NOPE', student.cookie).expect(404);
  });
});
