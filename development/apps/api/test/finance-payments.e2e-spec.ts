import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH5-003 payment simulator and request state e2e (RED first).
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: pay-initiate, pay-blocks-uncertain, pay-replay,
 * pay-concurrent, pay-expired-retry, pay-report, pay-validation,
 * pay-denied, pay-neutral.
 */
describe('Phase 5 payment initiation and request state', () => {
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
      givenName: 'Pay',
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

  const initiate = (cookie: string, body: object) =>
    finPost('/payments/initiate', { idempotencyKey: key(), ...body }, cookie);
  const report = (cookie: string, body: object) =>
    finPost('/payments/report', { idempotencyKey: key(), ...body }, cookie);

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

  it('pay-initiate: reference, uncertain state and safe wording', async () => {
    const student = await invoicedStudent();
    const res = await initiate(student.cookie, {
      method: 'MOBILE_MONEY',
      scenario: 'SUCCESS',
    }).expect(201);
    const body = res.body as {
      reference: string;
      status: string;
      amountMinor: number;
      currency: string;
      method: string;
      safeMessage: string;
      partialWarning: string | null;
      expiresAt: string;
    };
    expect(body.reference).toMatch(/^PAY-\d{4}-\d{4}$/);
    expect(body.status).toBe('AWAITING_CONFIRMATION');
    expect(body.currency).toBe('ZMW');
    expect(body.method).toBe('MOBILE_MONEY');
    expect(body.amountMinor).toBeGreaterThan(0);
    expect(body.safeMessage).toMatch(/do not pay again/i);
    expect(body.partialWarning).toBeNull();
    const staged = await db.financePaymentTransaction.findFirst({
      where: { request: { reference: body.reference } },
    });
    expect(staged?.status).toBe('STAGED');
    expect(staged?.provider).toBe('FIN-SIM-v1');
  });

  it('pay-partial: smaller amounts warn plainly', async () => {
    const student = await invoicedStudent();
    const res = await initiate(student.cookie, {
      method: 'BANK_TRANSFER',
      amountMinor: 10000,
    }).expect(201);
    const body = res.body as {
      amountMinor: number;
      partialWarning: string | null;
    };
    expect(body.amountMinor).toBe(10000);
    expect(body.partialWarning).toMatch(/will not complete/i);
  });

  it('pay-blocks-uncertain: no second initiation while one is open', async () => {
    const student = await invoicedStudent();
    const first = await initiate(student.cookie, {
      method: 'MOBILE_MONEY',
    }).expect(201);
    const blocked = await initiate(student.cookie, {
      method: 'BANK_TRANSFER',
    }).expect(409);
    expect((blocked.body as { code: string }).code).toBe('PAYMENT_IN_PROGRESS');
    expect(JSON.stringify(blocked.body)).toMatch(
      (first.body as { reference: string }).reference,
    );
    expect(JSON.stringify(blocked.body)).toMatch(/do not pay again/i);
  });

  it('pay-replay: same reference returns the stored request', async () => {
    const student = await invoicedStudent();
    const same = key();
    const payload = { idempotencyKey: same, method: 'MOBILE_MONEY' };
    const first = await finPost('/payments/initiate', payload, student.cookie).expect(201);
    const replay = await finPost('/payments/initiate', payload, student.cookie).expect(201);
    expect(replay.body).toEqual(first.body);
  });

  it('pay-concurrent: double taps converge to one request', async () => {
    const student = await invoicedStudent();
    const [left, right] = await Promise.all([
      initiate(student.cookie, { method: 'MOBILE_MONEY' }),
      initiate(student.cookie, { method: 'MOBILE_MONEY' }),
    ]);
    const refs = [left, right]
      .filter((r) => r.status === 201)
      .map((r) => (r.body as { reference: string }).reference);
    // Exactly one wins; the loser is refused against the open request.
    const statuses = [left.status, right.status].sort();
    expect(statuses).toEqual([201, 409]);
    expect(refs).toHaveLength(1);
    const count = await db.financePaymentRequest.count({
      where: { status: 'AWAITING_CONFIRMATION' },
    });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('pay-expired-retry: spent requests allow a fresh attempt', async () => {
    const student = await invoicedStudent();
    const first = await initiate(student.cookie, {
      method: 'MOBILE_MONEY',
    }).expect(201);
    const reference = (first.body as { reference: string }).reference;
    await db.financePaymentRequest.update({
      where: { reference },
      data: { status: 'EXPIRED', expiresAt: new Date('2020-01-01T00:00:00Z') },
    });
    const retry = await initiate(student.cookie, {
      method: 'BANK_TRANSFER',
    }).expect(201);
    expect((retry.body as { reference: string }).reference).not.toBe(reference);
  });

  it('pay-report: offline reports stay reported, never paid', async () => {
    const student = await invoicedStudent();
    const res = await report(student.cookie, {
      method: 'BANK_TRANSFER',
      amountMinor: 50000,
      payerReference: 'BANK-REF-001',
    }).expect(201);
    const body = res.body as { status: string; safeMessage: string };
    expect(body.status).toBe('REPORTED');
    expect(body.safeMessage).toMatch(/reconciliation pending/i);
    const account = await finGet('/account?period=2026S1', student.cookie).expect(200);
    expect(
      (account.body as { clearanceStatus: string }).clearanceStatus,
    ).not.toBe('CLEARED');
  });

  it('pay-validation: methods, amounts and invoices are bounded', async () => {
    const student = await invoicedStudent();
    const bad = await initiate(student.cookie, { method: 'RAW_CARD' }).expect(400);
    expect((bad.body as { code: string }).code).toBe('UNKNOWN_METHOD');
    const over = await initiate(student.cookie, {
      method: 'MOBILE_MONEY',
      amountMinor: 999999999,
    }).expect(409);
    expect((over.body as { code: string }).code).toBe('AMOUNT_EXCEEDS_BALANCE');
    const zero = await initiate(student.cookie, {
      method: 'MOBILE_MONEY',
      amountMinor: 0,
    }).expect(400);
    expect((zero.body as { code: string }).code).toBe('INVALID_AMOUNT');
    const scenarioStudent = await invoicedStudent();
    const scenario = await initiate(scenarioStudent.cookie, {
      method: 'MOBILE_MONEY',
      scenario: 'HACK_THE_PLANET',
    }).expect(400);
    expect((scenario.body as { code: string }).code).toBe('UNKNOWN_SCENARIO');
    // No invoice for this period: converted but never registered.
    const bare = await convertedStudent();
    const missing = await initiate(bare.cookie, {
      method: 'MOBILE_MONEY',
    }).expect(404);
    expect((missing.body as { code: string }).code).toBe('INVOICE_NOT_READY');
  });

  it('pay-denied: staff and foreign students cannot initiate', async () => {
    const student = await invoicedStudent();
    void student;
    await initiate(finance, { method: 'MOBILE_MONEY' }).expect(403);
    const lecturer = await user('LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    await initiate(lecturer.cookie, { method: 'MOBILE_MONEY' }).expect(403);
    await finGet('/payments', lecturer.cookie).expect(403);
    const applicant = await user('APP', ['apply'], 'APPLICATION', key());
    await initiate(applicant.cookie, { method: 'MOBILE_MONEY' }).expect(403);
  });

  it('pay-rate-limit: initiation budget is per-account and strict', async () => {
    const student = await invoicedStudent();
    for (let i = 0; i < 3; i++) {
      await initiate(student.cookie, { method: 'RAW_CARD' }).expect(400);
    }
    const limited = await initiate(student.cookie, {
      method: 'RAW_CARD',
    }).expect(429);
    expect(JSON.stringify(limited.body)).toMatch(/existing request|Wait briefly/i);
  });

  it('pay-neutral: unknown requests and periods 404', async () => {
    const student = await invoicedStudent();
    await finGet('/payments/PAY-2026-9999', student.cookie).expect(404);
    await finGet('/payments?period=NOPE', student.cookie).expect(404);
    await initiate(student.cookie, { method: 'MOBILE_MONEY' }).expect(201);
    const list = await finGet('/payments', student.cookie).expect(200);
    expect(
      ((list.body as { items: unknown[] }).items).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
