import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash, createHmac } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH5-006 finance reconciliation queue and governance e2e (RED first).
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: sponsor-record-confirm, sponsor-draft-confirm,
 * sponsor-expiry, sponsor-denied, adjust-credit, adjust-sod,
 * adjust-evidence, adjust-refund, adjust-decline, arrange-flow,
 * arrange-denied, cashier-flow, case-queue, case-match, case-duplicate,
 * case-escalate, case-denied, expired-callback, queue-denied.
 */
describe('Phase 5 reconciliation queue and governance', () => {
  let app: INestApplication;
  let db: PrismaService;
  let officer: string;
  let approver: string;
  let records: string;
  let finance: string;
  let finApprover: string;
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
  const finPatch = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .patch(`/finance${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);

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
      givenName: 'Govern',
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
    return { ...student, attemptId: attempt.id };
  }

  const sponsor = (cookie: string, body: object) =>
    finPost('/sponsorships', { idempotencyKey: key(), ...body }, cookie);

  async function sponsorPayload(attemptId: string, extra: object = {}) {
    return {
      attemptId,
      sponsorName: 'Fictional Bursary Board',
      categories: ['Tuition'],
      coverageType: 'AMOUNT',
      coverageValue: 100000,
      evidenceNote: 'BB-2026-001',
      ...extra,
    };
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
      await user(
        'FINANCE_OFFICER',
        ['assess-charges', 'reconcile-case', 'record-sponsorship'],
        'FINANCE',
        'GLOBAL',
      )
    ).cookie;
    finApprover = (
      await user('FINANCE_APPROVER', ['approve-adjustment'], 'FINANCE', 'GLOBAL')
    ).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('sponsor-record-confirm: attested evidence confirms and clears', async () => {
    const student = await invoicedStudent();
    const created = await sponsor(
      finance,
      await sponsorPayload(student.attemptId, { coverageValue: 999999999 }),
    ).expect(201);
    expect((created.body as { status: string }).status).toBe('CONFIRMED');
    const account = await finGet('/account?period=2026S1', student.cookie).expect(200);
    expect((account.body as { clearanceStatus: string }).clearanceStatus).toBe(
      'CLEARED',
    );
    const mine = await finGet('/sponsorships', student.cookie).expect(200);
    const items = (mine.body as { items: Array<{ status: string }> }).items;
    expect(items.some((i) => i.status === 'CONFIRMED')).toBe(true);
  });

  it('sponsor-draft-confirm: bare records wait, versions on change', async () => {
    const student = await invoicedStudent();
    const created = await sponsor(
      finance,
      await sponsorPayload(student.attemptId, { evidenceNote: undefined }),
    ).expect(201);
    expect((created.body as { status: string }).status).toBe('DRAFT');
    const id = (created.body as { id: string }).id;
    // Confirming without evidence is refused.
    await finPost(
      `/sponsorships/${id}/confirm`,
      { idempotencyKey: key() },
      finance,
    ).expect(400);
    await finPatch(
      `/sponsorships/${id}`,
      { idempotencyKey: key(), evidenceNote: 'BB-2026-002' },
      finance,
    ).expect(200);
    const updated = await db.financeSponsorship.findUniqueOrThrow({
      where: { id },
    });
    expect(updated.version).toBe(2);
    expect(updated.status).toBe('DRAFT');
    await finPost(
      `/sponsorships/${id}/confirm`,
      { idempotencyKey: key() },
      finance,
    ).expect(201);
    expect(
      (await db.financeSponsorship.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('CONFIRMED');
  });

  it('sponsor-expiry: spent coverage stops covering', async () => {
    const student = await invoicedStudent();
    await sponsor(
      finance,
      await sponsorPayload(student.attemptId, {
        coverageValue: 999999999,
        effectiveTo: '2020-01-01T00:00:00Z',
      }),
    ).expect(201);
    // Trigger a recalculation with a token payment.
    const initiated = await finPost(
      '/payments/initiate',
      { idempotencyKey: key(), method: 'MOBILE_MONEY', amountMinor: 100 },
      student.cookie,
    ).expect(201);
    const reference = (initiated.body as { reference: string }).reference;
    await finPost(
      '/simulator/dispatch',
      { idempotencyKey: key(), requestReference: reference },
      student.cookie,
    ).expect(201);
    const account = await finGet('/account?period=2026S1', student.cookie).expect(200);
    expect((account.body as { clearanceStatus: string }).clearanceStatus).toBe(
      'PENDING',
    );
  });

  it('sponsor-denied: students and academic roles cannot record', async () => {
    const student = await invoicedStudent();
    await sponsor(
      student.cookie,
      await sponsorPayload(student.attemptId),
    ).expect(403);
    const lecturer = await user('LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    await sponsor(
      lecturer.cookie,
      await sponsorPayload(student.attemptId),
    ).expect(403);
    await finGet('/sponsorships', lecturer.cookie).expect(403);
  });

  it('adjust-credit: approved credits post compensating lines', async () => {
    const student = await invoicedStudent();
    const requested = await finPost(
      '/adjustments',
      {
        idempotencyKey: key(),
        attemptId: student.attemptId,
        kind: 'CREDIT_NOTE',
        amountMinor: 50000,
        reason: 'Duplicate charge correction.',
      },
      finance,
    ).expect(201);
    const id = (requested.body as { id: string }).id;
    const decided = await finPost(
      `/adjustments/${id}/decide`,
      { idempotencyKey: key(), approve: true, note: 'Verified.' },
      finApprover,
    ).expect(201);
    expect((decided.body as { status: string }).status).toBe('APPROVED');
    const statement = await finGet('/statement?period=2026S1', student.cookie).expect(200);
    const totals = statement.body as {
      invoicedMinor: number;
      outstandingMinor: number;
    };
    expect(totals.outstandingMinor).toBe(totals.invoicedMinor);
    // The credit is a negative posted line, not an edit.
    const credit = await db.financeChargeLine.findFirst({
      where: { inputs: { path: ['adjustmentId'], equals: id } },
    });
    expect(credit?.amountMinor).toBe(-50000);
  });

  it('adjust-sod: requesters never decide, approvers never request', async () => {
    const student = await invoicedStudent();
    const requested = await finPost(
      '/adjustments',
      {
        idempotencyKey: key(),
        attemptId: student.attemptId,
        kind: 'WAIVER',
        amountMinor: 10000,
        reason: 'Hardship waiver.',
      },
      finance,
    ).expect(201);
    const id = (requested.body as { id: string }).id;
    // The requesting officer cannot decide, even to approve.
    await finPost(
      `/adjustments/${id}/decide`,
      { idempotencyKey: key(), approve: true },
      finance,
    ).expect(403);
    // Same human, two hats: an account holding both assignments is still
    // refused when it requested the case.
    const dual = await user(
      'FINANCE_OFFICER',
      ['reconcile-case'],
      'FINANCE',
      'GLOBAL',
    );
    const dualAssignment = await db.roleAssignment.create({
      data: {
        accountId: dual.accountId,
        role: 'FINANCE_APPROVER',
        scopeType: 'FINANCE',
        scopeRef: 'GLOBAL',
        capabilities: ['approve-adjustment'],
        reason: 'isolated test',
        startsAt: new Date('2020-01-01'),
      },
    });
    const dualToken = key();
    await db.session.create({
      data: {
        accountId: dual.accountId,
        activeAssignmentId: dualAssignment.id,
        tokenHash: createHash('sha256').update(dualToken).digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    const dualCookie = `sid=${dualToken}`;
    const dualRequested = await finPost(
      '/adjustments',
      {
        idempotencyKey: key(),
        attemptId: student.attemptId,
        kind: 'WAIVER',
        amountMinor: 10000,
        reason: 'Dual-hat case.',
      },
      dual.cookie,
    ).expect(201);
    const dualId = (dualRequested.body as { id: string }).id;
    const self = await finPost(
      `/adjustments/${dualId}/decide`,
      { idempotencyKey: key(), approve: true },
      dualCookie,
    ).expect(403);
    expect((self.body as { code: string }).code).toBe('SOD_VIOLATION');
    // The approver cannot raise adjustments at all.
    await finPost(
      '/adjustments',
      {
        idempotencyKey: key(),
        attemptId: student.attemptId,
        kind: 'WAIVER',
        amountMinor: 10000,
        reason: 'Approver filing.',
      },
      finApprover,
    ).expect(403);
  });

  it('adjust-evidence: high value needs an evidence reference', async () => {
    const student = await invoicedStudent();
    const refused = await finPost(
      '/adjustments',
      {
        idempotencyKey: key(),
        attemptId: student.attemptId,
        kind: 'WAIVER',
        amountMinor: 2000000,
        reason: 'Big waiver, no evidence.',
      },
      finance,
    ).expect(400);
    expect((refused.body as { code: string }).code).toBe('EVIDENCE_REQUIRED');
  });

  it('adjust-refund: payouts record references with maker/checker', async () => {
    const student = await invoicedStudent();
    const requested = await finPost(
      '/adjustments',
      {
        idempotencyKey: key(),
        attemptId: student.attemptId,
        kind: 'REFUND',
        amountMinor: 20000,
        reason: 'Genuine overpayment.',
        evidenceNote: 'REV-2026-1',
      },
      finance,
    ).expect(201);
    const id = (requested.body as { id: string }).id;
    // Payout reference is mandatory for refunds.
    await finPost(
      `/adjustments/${id}/decide`,
      { idempotencyKey: key(), approve: true, note: 'Ok.' },
      finApprover,
    ).expect(400);
    const paid = await finPost(
      `/adjustments/${id}/decide`,
      {
        idempotencyKey: key(),
        approve: true,
        note: 'Verified overpayment.',
        payoutReference: 'PAYOUT-2026-001',
      },
      finApprover,
    ).expect(201);
    expect((paid.body as { status: string }).status).toBe('PAID');
    expect(
      (await db.financeAdjustment.findUniqueOrThrow({ where: { id } }))
        .payoutReference,
    ).toBe('PAYOUT-2026-001');
  });

  it('adjust-decline: declines require reasons', async () => {
    const student = await invoicedStudent();
    const requested = await finPost(
      '/adjustments',
      {
        idempotencyKey: key(),
        attemptId: student.attemptId,
        kind: 'WAIVER',
        amountMinor: 10000,
        reason: 'Weak case.',
      },
      finance,
    ).expect(201);
    const id = (requested.body as { id: string }).id;
    await finPost(
      `/adjustments/${id}/decide`,
      { idempotencyKey: key(), approve: false },
      finApprover,
    ).expect(400);
    const declined = await finPost(
      `/adjustments/${id}/decide`,
      { idempotencyKey: key(), approve: false, note: 'Policy excludes this.' },
      finApprover,
    ).expect(201);
    expect((declined.body as { status: string }).status).toBe('REJECTED');
  });

  it('arrange-flow: approved arrangements grant time-boxed clearance', async () => {
    const student = await invoicedStudent();
    const requested = await finPost(
      '/arrangements',
      {
        idempotencyKey: key(),
        terms: 'Three instalments by March 2027.',
        reason: 'Cash flow.',
      },
      student.cookie,
    ).expect(201);
    const id = (requested.body as { id: string }).id;
    // Duplicate open requests are refused.
    const dupe = await finPost(
      '/arrangements',
      {
        idempotencyKey: key(),
        terms: 'Again.',
        reason: 'Again.',
      },
      student.cookie,
    ).expect(409);
    expect((dupe.body as { code: string }).code).toBe('DUPLICATE_TASK');
    const queue = await finGet('/arrangements', finance).expect(200);
    expect(
      ((queue.body as { items: Array<{ id: string }> }).items).some(
        (i) => i.id === id,
      ),
    ).toBe(true);
    await finPost(
      `/arrangements/${id}/decide`,
      { idempotencyKey: key(), approve: true, note: 'Affordable.' },
      finApprover,
    ).expect(201);
    const account = await finGet('/account?period=2026S1', student.cookie).expect(200);
    expect((account.body as { clearanceStatus: string }).clearanceStatus).toBe(
      'CLEARED',
    );
  });

  it('arrange-decline: declined arrangements change nothing', async () => {
    const student = await invoicedStudent();
    const requested = await finPost(
      '/arrangements',
      {
        idempotencyKey: key(),
        terms: 'Pay someday.',
        reason: 'Vague.',
      },
      student.cookie,
    ).expect(201);
    const id = (requested.body as { id: string }).id;
    await finPost(
      `/arrangements/${id}/decide`,
      { idempotencyKey: key(), approve: false, note: 'Terms unclear.' },
      finApprover,
    ).expect(201);
    const account = await finGet('/account?period=2026S1', student.cookie).expect(200);
    const declinedBody = account.body as {
      clearanceStatus: string;
      blocksRegistration: boolean;
    };
    expect(declinedBody.clearanceStatus).not.toBe('CLEARED');
    expect(declinedBody.blocksRegistration).toBe(true);
  });

  it('arrange-denied: staff cannot request, students cannot decide', async () => {
    const student = await invoicedStudent();
    await finPost(
      '/arrangements',
      { idempotencyKey: key(), terms: 'x', reason: 'y' },
      finance,
    ).expect(403);
    const requested = await finPost(
      '/arrangements',
      { idempotencyKey: key(), terms: 'Terms.', reason: 'Reason.' },
      student.cookie,
    ).expect(201);
    const id = (requested.body as { id: string }).id;
    await finPost(
      `/arrangements/${id}/decide`,
      { idempotencyKey: key(), approve: true },
      student.cookie,
    ).expect(403);
    const lecturer = await user('LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    await finGet('/arrangements', lecturer.cookie).expect(403);
  });

  it('cashier-flow: reported cash confirms through reconciliation', async () => {
    const student = await invoicedStudent();
    const cashReceiptNo = `CR-${key().slice(0, 8)}`;
    const reported = await finPost(
      '/payments/report',
      {
        idempotencyKey: key(),
        method: 'CASHIER',
        amountMinor: 50000,
        payerReference: 'TILL-7',
      },
      student.cookie,
    ).expect(201);
    const reference = (reported.body as { reference: string }).reference;
    // Wrong amounts never record.
    await finPost(
      '/cashier/intake',
      {
        idempotencyKey: key(),
        requestReference: reference,
        amountMinor: 49999,
        cashReceiptNo,
      },
      finance,
    ).expect(409);
    await finPost(
      '/cashier/intake',
      {
        idempotencyKey: key(),
        requestReference: reference,
        amountMinor: 50000,
        cashReceiptNo,
      },
      finance,
    ).expect(201);
    const recorded = await finGet(
      `/payments/${reference}`,
      student.cookie,
    ).expect(200);
    expect((recorded.body as { status: string }).status).toBe(
      'CASHIER_RECORDED',
    );
    await finPost(
      '/cashier/confirm',
      { idempotencyKey: key(), requestReference: reference },
      finance,
    ).expect(201);
    const confirmed = await finGet(
      `/payments/${reference}`,
      student.cookie,
    ).expect(200);
    expect((confirmed.body as { status: string }).status).toBe('CONFIRMED');
    const statement = await finGet('/statement?period=2026S1', student.cookie).expect(200);
    expect((statement.body as { paidMinor: number }).paidMinor).toBe(50000);
  });

  it('case-queue: officers triage, students see safe wording', async () => {
    const student = await invoicedStudent();
    const initiated = await finPost(
      '/payments/initiate',
      { idempotencyKey: key(), method: 'MOBILE_MONEY' },
      student.cookie,
    ).expect(201);
    const reference = (initiated.body as { reference: string }).reference;
    const staged = await db.financePaymentTransaction.findFirstOrThrow({
      where: { request: { reference } },
    });
    const body = {
      provider: 'FIN-SIM-v1',
      providerRef: staged.providerRef,
      requestReference: reference,
      amountMinor: staged.amountMinor + 100,
      currency: 'ZMW',
      status: 'SUCCESS',
      occurredAt: new Date().toISOString(),
      nonce: key(),
    };
    await postCallback({ ...body, signature: sign(body) }).expect(202);
    const queue = await finGet('/cases', finance).expect(200);
    const items = (queue.body as { items: Array<{ kind: string; status: string }> }).items;
    expect(items.some((i) => i.kind === 'AMOUNT_MISMATCH')).toBe(true);
    const mine = await finGet('/cases', student.cookie).expect(200);
    const mineItems = (
      mine.body as {
        items: Array<{ kind: string; studentNumber: null; safeMessage: string }>;
      }
    ).items;
    expect(mineItems.length).toBeGreaterThan(0);
    expect(
      mineItems.every(
        (i) => i.studentNumber === null && i.safeMessage.length > 0,
      ),
    ).toBe(true);
    const lecturer = await user('LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    await finGet('/cases', lecturer.cookie).expect(403);
  });

  it('case-match: verified evidence confirms with history intact', async () => {
    const student = await invoicedStudent();
    const initiated = await finPost(
      '/payments/initiate',
      { idempotencyKey: key(), method: 'MOBILE_MONEY' },
      student.cookie,
    ).expect(201);
    const reference = (initiated.body as { reference: string }).reference;
    const staged = await db.financePaymentTransaction.findFirstOrThrow({
      where: { request: { reference } },
    });
    const received = staged.amountMinor + 100;
    const body = {
      provider: 'FIN-SIM-v1',
      providerRef: staged.providerRef,
      requestReference: reference,
      amountMinor: received,
      currency: 'ZMW',
      status: 'SUCCESS',
      occurredAt: new Date().toISOString(),
      nonce: key(),
    };
    const opened = await postCallback({ ...body, signature: sign(body) }).expect(202);
    const caseId = (opened.body as { caseId: string }).caseId;
    const detail = await finGet(`/cases/${caseId}`, finance).expect(200);
    expect(
      (detail.body as { callbacks: unknown[] }).callbacks.length,
    ).toBeGreaterThan(0);
    const resolved = await finPost(
      `/cases/${caseId}/resolve`,
      { idempotencyKey: key(), action: 'MATCH_CONFIRM', note: 'Bank advice matches.' },
      finance,
    ).expect(201);
    expect((resolved.body as { status: string }).status).toBe('RESOLVED');
    const payment = await finGet(`/payments/${reference}`, student.cookie).expect(200);
    expect((payment.body as { status: string }).status).toBe('CONFIRMED');
    // The case row survives resolution as history.
    expect(
      (await db.financeReconciliationCase.findUniqueOrThrow({ where: { id: caseId } }))
        .status,
    ).toBe('RESOLVED');
  });

  it('case-duplicate: marking duplicate moves no money', async () => {
    const student = await invoicedStudent();
    const initiated = await finPost(
      '/payments/initiate',
      { idempotencyKey: key(), method: 'MOBILE_MONEY' },
      student.cookie,
    ).expect(201);
    const reference = (initiated.body as { reference: string }).reference;
    const staged = await db.financePaymentTransaction.findFirstOrThrow({
      where: { request: { reference } },
    });
    const body = {
      provider: 'FIN-SIM-v1',
      providerRef: staged.providerRef,
      requestReference: reference,
      amountMinor: staged.amountMinor + 100,
      currency: 'ZMW',
      status: 'SUCCESS',
      occurredAt: new Date().toISOString(),
      nonce: key(),
    };
    const opened = await postCallback({ ...body, signature: sign(body) }).expect(202);
    const caseId = (opened.body as { caseId: string }).caseId;
    await finPost(
      `/cases/${caseId}/resolve`,
      { idempotencyKey: key(), action: 'MARK_DUPLICATE', note: 'Same bank line.' },
      finance,
    ).expect(201);
    const payment = await finGet(`/payments/${reference}`, student.cookie).expect(200);
    expect((payment.body as { status: string }).status).toBe(
      'AWAITING_CONFIRMATION',
    );
  });

  it('case-escalate: escalation keeps the case open and visible', async () => {
    const student = await invoicedStudent();
    const initiated = await finPost(
      '/payments/initiate',
      { idempotencyKey: key(), method: 'MOBILE_MONEY' },
      student.cookie,
    ).expect(201);
    const reference = (initiated.body as { reference: string }).reference;
    const staged = await db.financePaymentTransaction.findFirstOrThrow({
      where: { request: { reference } },
    });
    const body = {
      provider: 'FIN-SIM-v1',
      providerRef: staged.providerRef,
      requestReference: reference,
      amountMinor: staged.amountMinor + 100,
      currency: 'ZMW',
      status: 'SUCCESS',
      occurredAt: new Date().toISOString(),
      nonce: key(),
    };
    const opened = await postCallback({ ...body, signature: sign(body) }).expect(202);
    const caseId = (opened.body as { caseId: string }).caseId;
    const escalated = await finPost(
      `/cases/${caseId}/resolve`,
      { idempotencyKey: key(), action: 'ESCALATE', note: 'Needs bank trace.' },
      finance,
    ).expect(201);
    expect((escalated.body as { status: string }).status).toBe('ESCALATED');
    const queue = await finGet('/cases', finance).expect(200);
    expect(
      ((queue.body as { items: Array<{ id: string }> }).items).some(
        (i) => i.id === caseId,
      ),
    ).toBe(true);
    const account = await finGet('/account?period=2026S1', student.cookie).expect(200);
    expect((account.body as { clearanceStatus: string }).clearanceStatus).toBe(
      'MANUAL_REVIEW',
    );
  });

  it('case-denied: resolution is a finance authority act', async () => {
    const student = await invoicedStudent();
    const initiated = await finPost(
      '/payments/initiate',
      { idempotencyKey: key(), method: 'MOBILE_MONEY' },
      student.cookie,
    ).expect(201);
    const reference = (initiated.body as { reference: string }).reference;
    const staged = await db.financePaymentTransaction.findFirstOrThrow({
      where: { request: { reference } },
    });
    const body = {
      provider: 'FIN-SIM-v1',
      providerRef: staged.providerRef,
      requestReference: reference,
      amountMinor: staged.amountMinor + 100,
      currency: 'ZMW',
      status: 'SUCCESS',
      occurredAt: new Date().toISOString(),
      nonce: key(),
    };
    const opened = await postCallback({ ...body, signature: sign(body) }).expect(202);
    const caseId = (opened.body as { caseId: string }).caseId;
    await finPost(
      `/cases/${caseId}/resolve`,
      { idempotencyKey: key(), action: 'MARK_DUPLICATE' },
      student.cookie,
    ).expect(403);
    await finGet(`/cases/${caseId}`, student.cookie).expect(200);
    await finGet(`/cases/${caseId}`, finance).expect(200);
  });

  it('expired-callback: spent requests become review work, not money', async () => {
    const student = await invoicedStudent();
    const initiated = await finPost(
      '/payments/initiate',
      { idempotencyKey: key(), method: 'MOBILE_MONEY' },
      student.cookie,
    ).expect(201);
    const reference = (initiated.body as { reference: string }).reference;
    const staged = await db.financePaymentTransaction.findFirstOrThrow({
      where: { request: { reference } },
    });
    await db.financePaymentRequest.update({
      where: { reference },
      data: { expiresAt: new Date('2020-01-01T00:00:00Z') },
    });
    const body = {
      provider: 'FIN-SIM-v1',
      providerRef: staged.providerRef,
      requestReference: reference,
      amountMinor: staged.amountMinor,
      currency: 'ZMW',
      status: 'SUCCESS',
      occurredAt: new Date().toISOString(),
      nonce: key(),
    };
    const res = await postCallback({ ...body, signature: sign(body) }).expect(202);
    expect((res.body as { outcome: string }).outcome).toBe('CASE_OPENED');
    const payment = await finGet(`/payments/${reference}`, student.cookie).expect(200);
    expect((payment.body as { status: string }).status).toBe('EXPIRED');
  });

  it('queue-denied: case queue is finance-scoped', async () => {
    const lecturer = await user('LEC', ['teach'], 'OFFERING', 'SWE101-2026S1');
    await finGet('/cases', lecturer.cookie).expect(403);
    const applicant = await user('APP', ['apply'], 'APPLICATION', key());
    await finGet('/cases', applicant.cookie).expect(403);
  });
});
