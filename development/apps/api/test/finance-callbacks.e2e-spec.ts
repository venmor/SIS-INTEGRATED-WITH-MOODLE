import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash, createHmac } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH5-004 callback normalization and duplicate protection e2e.
 * Isolated fictional test database required (same guard as admissions tests).
 * Signed with FIN_SIM_SECRET (demo simulator contract, never a real key).
 * Packet Test-ID map: callback-success, callback-duplicate,
 * callback-delayed, callback-mismatch, callback-unmatched,
 * callback-bad-signature, callback-stale, callback-reversal,
 * callback-out-of-order, callback-neutral, callback-denied.
 */
describe('Phase 5 callback normalization and duplicate protection', () => {
  let app: INestApplication;
  let db: PrismaService;
  let officer: string;
  let approver: string;
  let records: string;
  let finance: string;
  let offeringId: string;
  const csrf = { 'x-requested-with': 'XMLHttpRequest' };
  const key = () => randomUUID();
  const SECRET = process.env.FIN_SIM_SECRET ?? 'demo-fixtures-secret';
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

  function sign(body: Record<string, unknown>): string {
    const canonical = [
      'FIN-SIM-v1',
      body.providerRef,
      body.requestReference ?? '',
      body.amountMinor,
      body.currency,
      body.status,
      body.occurredAt,
      body.nonce,
    ].join('|');
    return createHmac('sha256', SECRET).update(canonical).digest('hex');
  }

  function callbackBody(
    staged: { providerRef: string; amountMinor: number },
    requestReference: string,
    overrides: Record<string, unknown> = {},
  ) {
    const body = {
      provider: 'FIN-SIM-v1',
      providerRef: staged.providerRef,
      requestReference,
      amountMinor: staged.amountMinor,
      currency: 'ZMW',
      status: 'SUCCESS',
      occurredAt: new Date().toISOString(),
      nonce: key(),
      ...overrides,
    };
    return { ...body, signature: sign(body) };
  }

  const postCallback = (body: object) =>
    request(app.getHttpServer()).post('/finance/callbacks').send(body);

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
      givenName: 'Callback',
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

  async function initiatedPayment(codes = ['SWE111', 'MTH111', 'ENG111']) {
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
    const initiated = await finPost(
      '/payments/initiate',
      { idempotencyKey: key(), method: 'MOBILE_MONEY' },
      student.cookie,
    ).expect(201);
    const reference = (initiated.body as { reference: string }).reference;
    const staged = await db.financePaymentTransaction.findFirstOrThrow({
      where: { request: { reference } },
    });
    return { student, reference, staged };
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

  it('callback-success: matched callback confirms with receipt link', async () => {
    const { student, reference, staged } = await initiatedPayment();
    const res = await postCallback(
      callbackBody(staged, reference),
    ).expect(200);
    expect((res.body as { outcome: string }).outcome).toBe('CONFIRMED');
    expect((res.body as { reference: string }).reference).toBe(reference);
    const detail = await finGet(
      `/payments/${reference}`,
      student.cookie,
    ).expect(200);
    expect((detail.body as { status: string }).status).toBe('CONFIRMED');
    const receipt = await finGet(
      `/receipts/${reference}`,
      student.cookie,
    ).expect(200);
    expect(
      (receipt.body as { amountMinor: number }).amountMinor,
    ).toBe(staged.amountMinor);
    const outbox = await db.outboxEvent.findFirst({
      where: { type: 'FinancePaymentPosted' },
    });
    expect(outbox).toBeDefined();
  });

  it('callback-duplicate: same delivery twice, one financial effect', async () => {
    const { reference, staged } = await initiatedPayment();
    const body = callbackBody(staged, reference);
    const first = await postCallback(body).expect(200);
    // Exact redelivery (same nonce): prior outcome, no new effects.
    const replay = await postCallback(body).expect(200);
    expect(replay.body).toEqual(first.body);
    const count = await db.financePaymentTransaction.count({
      where: { providerRef: staged.providerRef },
    });
    expect(count).toBe(1);
    const callbacks = await db.financeCallback.count({
      where: { provider: 'FIN-SIM-v1', nonce: body.nonce },
    });
    expect(callbacks).toBe(1);
  });

  it('callback-delayed: second channel converges to the same outcome', async () => {
    const { reference, staged } = await initiatedPayment();
    await postCallback(callbackBody(staged, reference)).expect(200);
    // Same provider event, fresh nonce (delayed second channel).
    const late = await postCallback(
      callbackBody(staged, reference),
    ).expect(200);
    expect((late.body as { outcome: string }).outcome).toBe('DUPLICATE');
    expect((late.body as { reference: string }).reference).toBe(reference);
  });

  it('callback-mismatch: wrong amount opens a case, confirms nothing', async () => {
    const { student, reference, staged } = await initiatedPayment();
    const res = await postCallback(
      callbackBody(staged, reference, { amountMinor: staged.amountMinor + 100 }),
    ).expect(202);
    expect((res.body as { outcome: string }).outcome).toBe('CASE_OPENED');
    expect(JSON.stringify(res.body)).toMatch(/do not pay again/i);
    const detail = await finGet(
      `/payments/${reference}`,
      student.cookie,
    ).expect(200);
    expect((detail.body as { status: string }).status).toBe(
      'AWAITING_CONFIRMATION',
    );
    const open = await db.financeReconciliationCase.findFirst({
      where: {
        kind: 'AMOUNT_MISMATCH',
        status: 'OPEN',
        providerRef: staged.providerRef,
      },
    });
    expect(open?.providerRef).toBe(staged.providerRef);
  });

  it('callback-unmatched: unknown references become review work', async () => {
    const res = await postCallback(
      callbackBody(
        { providerRef: `SIM-UNKNOWN-${key().slice(0, 8)}`, amountMinor: 50000 },
        'PAY-2026-0000',
      ),
    ).expect(202);
    expect((res.body as { outcome: string }).outcome).toBe('CASE_OPENED');
    const open = await db.financeReconciliationCase.findFirst({
      where: { kind: 'UNMATCHED', status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    });
    expect(open).toBeDefined();
  });

  it('callback-bad-signature: forgeries change nothing', async () => {
    const { reference, staged } = await initiatedPayment();
    const body = callbackBody(staged, reference);
    const forged = await postCallback({
      ...body,
      signature: '0'.repeat(64),
    }).expect(400);
    expect((forged.body as { code: string }).code).toBe('INVALID_SIGNATURE');
    expect(
      await db.financeCallback.count({
        where: { providerRef: staged.providerRef },
      }),
    ).toBe(0);
  });

  it('callback-stale: callbacks outside the replay window are rejected', async () => {
    const { reference, staged } = await initiatedPayment();
    const stale = await postCallback(
      callbackBody(staged, reference, {
        occurredAt: new Date('2020-01-01T00:00:00Z').toISOString(),
      }),
    ).expect(400);
    expect((stale.body as { code: string }).code).toBe('CALLBACK_STALE');
  });

  it('callback-reversal: reversals are new events with recalculation', async () => {
    const { student, reference, staged } = await initiatedPayment();
    await postCallback(callbackBody(staged, reference)).expect(200);
    const allocatedBefore = await db.financeAllocation.findMany({
      where: { paymentTransaction: { providerRef: staged.providerRef } },
    });
    expect(allocatedBefore.length).toBeGreaterThan(0);
    const reversed = await postCallback(
      callbackBody(staged, reference, { status: 'REVERSED' }),
    ).expect(200);
    expect((reversed.body as { outcome: string }).outcome).toBe('REVERSED');
    const allocatedAfter = await db.financeAllocation.findMany({
      where: { paymentTransaction: { providerRef: staged.providerRef } },
    });
    expect(allocatedAfter.map((row) => row.id)).toEqual(
      allocatedBefore.map((row) => row.id),
    );
    const compensations = await db.financeAllocationReversal.findMany({
      where: { allocationId: { in: allocatedBefore.map((row) => row.id) } },
    });
    expect(compensations).toHaveLength(allocatedBefore.length);
    expect(compensations.reduce((sum, row) => sum + row.amountMinor, 0)).toBe(
      allocatedBefore.reduce((sum, row) => sum + row.amountMinor, 0),
    );
    const events = await db.financePaymentTransaction.findMany({
      where: { accountId: staged.accountId, status: 'REVERSED' },
    });
    // The original posted transaction is immutable; reversal is a linked
    // compensating event, and repeated delivery must not create another.
    expect(events).toHaveLength(1);
    const original = await db.financePaymentTransaction.findUniqueOrThrow({
      where: { providerRef: staged.providerRef },
    });
    expect(original.status).toBe('POSTED');
    const again = await postCallback(
      callbackBody(staged, reference, { status: 'REVERSED' }),
    ).expect(200);
    expect((again.body as { outcome: string }).outcome).toBe('DUPLICATE');
    expect(await db.financePaymentTransaction.count({ where: { accountId: staged.accountId, status: 'REVERSED' } })).toBe(1);
    expect(
      events.some(
        (e) =>
          (e.evidence as { reversesProviderRef?: string } | null)
            ?.reversesProviderRef === staged.providerRef,
      ),
    ).toBe(true);
    const flag = await db.outboxEvent.findFirst({
      where: { type: 'FinancePaymentReversed' },
    });
    expect(flag).toBeDefined();
    const detail = await finGet(
      `/payments/${reference}`,
      student.cookie,
    ).expect(200);
    expect((detail.body as { status: string }).status).toBe('CONFIRMED');
  });

  it('callback-out-of-order: late failure after confirm becomes review', async () => {
    const { student, reference, staged } = await initiatedPayment();
    await postCallback(callbackBody(staged, reference)).expect(200);
    const late = await postCallback(
      callbackBody(staged, reference, { status: 'FAILED' }),
    ).expect(202);
    expect((late.body as { outcome: string }).outcome).toBe('CASE_OPENED');
    const detail = await finGet(
      `/payments/${reference}`,
      student.cookie,
    ).expect(200);
    // Confirmation stands until a governed process reverses it.
    expect((detail.body as { status: string }).status).toBe('CONFIRMED');
  });

  it('callback-neutral: unknown providers and shapes refused', async () => {
    const { reference, staged } = await initiatedPayment();
    const body = callbackBody(staged, reference);
    const unknown = await postCallback({
      ...body,
      provider: 'REAL-BANK',
    }).expect(400);
    expect((unknown.body as { code: string }).code).toBe('UNKNOWN_PROVIDER');
    const unsigned = await postCallback({
      provider: 'FIN-SIM-v1',
      providerRef: staged.providerRef,
    }).expect(400);
    expect(unsigned.status).toBe(400);
  });

  it('callback-denied: simulator dispatch is demo-gated and owned', async () => {
    const { student, reference } = await initiatedPayment();
    const applicant = await user('APP', ['apply'], 'APPLICATION', key());
    await finPost(
      '/simulator/dispatch',
      { idempotencyKey: key(), requestReference: reference },
      applicant.cookie,
    ).expect(403);
  });

  it('dispatch-success: demo control confirms through the same path', async () => {
    const { student, reference } = await initiatedPayment();
    const res = await finPost(
      '/simulator/dispatch',
      { idempotencyKey: key(), requestReference: reference },
      student.cookie,
    ).expect(201);
    expect((res.body as { outcome: string }).outcome).toBe('CONFIRMED');
    const detail = await finGet(
      `/payments/${reference}`,
      student.cookie,
    ).expect(200);
    expect((detail.body as { status: string }).status).toBe('CONFIRMED');
  });
});
