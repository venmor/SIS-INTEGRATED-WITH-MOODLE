import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH2-006 post-submit case e2e (timeline, clarification, correction,
 * decision, tickets, withdrawal, notifications, simulation). Isolated
 * fictional test database required (see applications.e2e-spec.ts guard).
 * Packet Test-ID map: case-timeline, case-foreign-denied, case-clarify-flow,
 * case-clarify-late, case-correction, case-decision, case-tickets,
 * case-withdraw, case-notifications, case-idempotency, case-sim-forbidden,
 * keyboard-SR-case (contracts + reviewer manual pass; no runner per
 * deferred Playwright decision).
 */
describe('Phase 2 post-submit applicant case', () => {
  let app: INestApplication;
  let db: PrismaService;
  let cookie: string;
  let other: string;
  let officer: string;
  let approver: string;
  let offeringId: string;
  const csrf = { 'x-requested-with': 'XMLHttpRequest' };
  const key = () => randomUUID();
  const post = (path: string, body: object, c = cookie) =>
    request(app.getHttpServer())
      .post(`/applications${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const get = (path: string, c = cookie) =>
    request(app.getHttpServer()).get(`/applications${path}`).set('Cookie', c);
  const reviewPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/review${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);

  async function user(
    role = 'APP',
    capabilities?: string[],
    scopeType?: string,
    scopeRef?: string,
  ) {
    const person = await db.person.create({
      data: {
        displayName: 'Fictional case applicant',
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
        scopeType: scopeType ?? (role === 'APP' ? 'APPLICATION' : 'SYSTEM'),
        scopeRef: scopeRef ?? (role === 'APP' ? account.id : 'SYSTEM'),
        capabilities:
          capabilities ??
          (role === 'APP' ? ['apply'] : ['administer-case-demo']),
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

  // Fresh applicant per submitted app: the demo policy caps active
  // applications per intake, and each test needs its own owner.
  async function submittedApp() {
    const me = await user();
    const c = me.cookie;
    const started = await post(
      '',
      {
        offeringId,
        confirmed: true,
        idempotencyKey: key(),
      },
      c,
    ).expect(201);
    const id = started.body.id as string;
    let version = started.body.version as number;
    const save = async (section: string, data: object) => {
      const r = await post(
        `/${id}/sections/${section}`,
        {
          version,
          idempotencyKey: key(),
          complete: true,
          data,
        },
        c,
      ).expect(201);
      version = r.body.version as number;
    };
    await save('personal', {
      givenName: 'Case',
      familyName: 'Applicant',
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
    // Fixture PDF upload + scan to reach minimumStage for the ECZ statement.
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
    const docId = (
      uploaded.body as { documents: Array<{ id: string }> }
    ).documents.at(-1)?.id as string;
    version = (uploaded.body as { version: number }).version;
    await post(
      `/${id}/documents/${docId}/scan`,
      { version, idempotencyKey: key() },
      c,
    ).expect(201);
    const review = await get(`/${id}/review`, c).expect(200);
    version = review.body.application.version as number;
    const submitted = await post(
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
    return { id, receipt: submitted.body, cookie: c };
  }

  // Staff-side seeding through the real officer/approver endpoints (GAP-017:
  // the SYSADMIN simulation endpoints are deleted; suites exercise the same
  // authority paths as the product). Each helper reads the current version
  // from the staff summary, so sequential staff writes never go stale.
  async function staffVersion(id: string, c: string) {
    const summary = await request(app.getHttpServer())
      .get(`/review/queue/${id}`)
      .set('Cookie', c)
      .expect(200);
    return (summary.body as { version: number }).version;
  }

  async function staffClaim(id: string, applicantCookie: string) {
    // Claim first: the staff summary only exists for claimed cases, so the
    // claim carries the applicant timeline version.
    const timeline = await request(app.getHttpServer())
      .get(`/applications/${id}/timeline`)
      .set('Cookie', applicantCookie)
      .expect(200);
    const version = (timeline.body as { version: number }).version;
    await reviewPost(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      officer,
    ).expect(201);
  }

  async function staffClarify(
    id: string,
    question: string,
    extra: object = {},
  ) {
    const res = await reviewPost(
      `/${id}/clarifications`,
      {
        version: await staffVersion(id, officer),
        idempotencyKey: key(),
        question,
        ...extra,
      },
      officer,
    ).expect(201);
    return res.body as { id: string; status: string };
  }

  async function staffRecommend(id: string) {
    const res = await reviewPost(
      `/${id}/recommendations`,
      {
        version: await staffVersion(id, officer),
        idempotencyKey: key(),
        eligibilityOutcome: 'ELIGIBLE',
        recommendation: 'FAVOURABLE',
        rationale: 'Fixture recommendation for decision tests.',
      },
      officer,
    ).expect(201);
    return res.body as { id: string };
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
    cookie = (await user()).cookie;
    other = (await user()).cookie;
    officer = (
      await user('ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', '2026')
    ).cookie;
    approver = (
      await user('ADMISSIONS_APPROVER', ['decide-offer'], 'INTAKE', '2026')
    ).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('case-timeline: submitted application shows a visible timeline', async () => {
    const { id, cookie: mine } = await submittedApp();
    // Staff-only rows must never leak, even when present.
    await db.applicationStatusEvent.create({
      data: {
        applicationId: id,
        code: 'Assigned',
        label: 'Internal assignment',
        actorRole: 'ADMISSIONS',
        applicantVisible: false,
      },
    });
    const res = await get(`/${id}/timeline`, mine).expect(200);
    const body = res.body as {
      reference: string;
      state: string;
      events: Array<{ code: string; label: string }>;
    };
    expect(body.state).toBe('Submitted');
    expect(body.events.some((e) => e.code === 'Submitted')).toBe(true);
    expect(body.events.some((e) => e.code === 'Assigned')).toBe(false);
  });

  it('case-foreign-denied: other applicants see neutral 404s', async () => {
    const { id } = await submittedApp();
    await get(`/${id}/timeline`, other).expect(404);
    await get(`/${id}/decision`, other).expect(404);
    await get('/notifications', other).expect(200);
  });

  it('case-clarify-flow: simulate, respond, receipt, closed on replay', async () => {
    const { id, cookie: mine } = await submittedApp();
    await staffClaim(id, mine);
    const clar = await staffClarify(id, 'Provide a complete result statement.');
    const clarId = clar.id;
    const listed = await get(`/${id}/clarifications`, mine).expect(200);
    expect(
      (listed.body as { items: Array<{ id: string }> }).items.some(
        (c) => c.id === clarId,
      ),
    ).toBe(true);
    const timeline = await get(`/${id}/timeline`, mine).expect(200);
    const version = (timeline.body as { version: number }).version;
    expect(
      (timeline.body as { events: Array<{ code: string }> }).events.some(
        (e) => e.code === 'ClarificationRequired',
      ),
    ).toBe(true);
    const notes = await get('/notifications', mine).expect(200);
    expect(
      (notes.body as { items: Array<{ type: string }> }).items.some(
        (n) => n.type === 'CLARIFICATION_REQUEST',
      ),
    ).toBe(true);
    const same = key();
    const payload = {
      version,
      response: 'Replacement uploaded.',
      idempotencyKey: same,
    };
    const answer = await post(
      `/${id}/clarifications/${clarId}/respond`,
      payload,
      mine,
    ).expect(201);
    expect((answer.body as { receipt: string }).receipt).toBeDefined();
    // Same key replays the stored receipt...
    const replay = await post(
      `/${id}/clarifications/${clarId}/respond`,
      payload,
      mine,
    ).expect(201);
    expect(replay.body.receipt).toBe(answer.body.receipt);
    // ...while a new response to an answered request is closed.
    await post(
      `/${id}/clarifications/${clarId}/respond`,
      { version, response: 'Second attempt.', idempotencyKey: key() },
      mine,
    ).expect(404);
  });

  it('case-clarify-late: past-deadline requests refuse with policy wording', async () => {
    const { id, cookie: mine } = await submittedApp();
    const past = await db.applicationClarification.create({
      data: {
        applicationId: id,
        question: 'Late item.',
        deadline: new Date(Date.now() - 1000),
        status: 'OPEN',
      },
    });
    const timeline = await get(`/${id}/timeline`, mine).expect(200);
    const version = (timeline.body as { version: number }).version;
    const res = await post(
      `/${id}/clarifications/${past.id}/respond`,
      {
        version,
        response: 'Too late.',
        idempotencyKey: key(),
      },
      mine,
    ).expect(409);
    expect((res.body as { code: string }).code).toBe('RESPONSE_LATE');
  });

  it('case-correction: request, duplicate redirect, draft refused', async () => {
    const { id, cookie: mine } = await submittedApp();
    const timeline = await get(`/${id}/timeline`, mine).expect(200);
    const version = (timeline.body as { version: number }).version;
    const created = await post(
      `/${id}/corrections`,
      {
        version,
        section: 'contact',
        field: 'address',
        reason: 'Moved house.',
        idempotencyKey: key(),
      },
      mine,
    ).expect(201);
    expect((created.body as { status: string }).status).toBe('PENDING');
    const createdId = (created.body as { id: string }).id;
    const listed = await get(`/${id}/corrections`, mine).expect(200);
    expect(
      (listed.body as { items: Array<{ id: string }> }).items.some(
        (c) => c.id === createdId,
      ),
    ).toBe(true);
    const dupe = await post(
      `/${id}/corrections`,
      {
        version,
        section: 'contact',
        field: 'address',
        reason: 'Moved again.',
        idempotencyKey: key(),
      },
      mine,
    ).expect(409);
    expect((dupe.body as { code: string }).code).toBe('DUPLICATE_TASK');
    const draft = await post('', {
      offeringId,
      confirmed: true,
      idempotencyKey: key(),
    }).expect(201);
    const draftTimeline = await get(
      `/${draft.body.id}/timeline`,
      cookie,
    ).expect(200);
    const draftVersion = (draftTimeline.body as { version: number }).version;
    await post(
      `/${draft.body.id}/corrections`,
      {
        version: draftVersion,
        section: 'contact',
        field: 'address',
        reason: 'Too early.',
        idempotencyKey: key(),
      },
      cookie,
    ).expect(409);
  });

  it('case-decision: pending is neutral, released decision views fully', async () => {
    const { id, cookie: mine } = await submittedApp();
    await get(`/${id}/decision`, mine).expect(404);
    await staffClaim(id, mine);
    await staffRecommend(id);
    await reviewPost(
      `/${id}/decision/release`,
      {
        version: await staffVersion(id, approver),
        idempotencyKey: key(),
        outcome: 'ADMIT_WITH_CONDITIONS',
        message: 'Offered a place with conditions.',
        acceptBy: '2027-01-15T17:00:00.000Z',
        conditions: [
          {
            text: 'Provide certified documents.',
            detail: null,
            owner: 'APPLICANT',
            deadline: null,
            blocksMatriculation: false,
          },
        ],
      },
      approver,
    ).expect(201);
    const res = await get(`/${id}/decision`, mine).expect(200);
    const body = res.body as {
      outcome: string;
      message: string;
      conditions: Array<{ text: string }>;
      reference: string;
    };
    expect(body.outcome).toBe('ADMIT_WITH_CONDITIONS');
    expect(body.conditions.map((c) => c.text)).toEqual([
      'Provide certified documents.',
    ]);
    expect(JSON.stringify(body)).not.toContain('assessor');
    const notes = await get('/notifications', mine).expect(200);
    const titles = (
      notes.body as { items: Array<{ title: string }> }
    ).items.map((n) => n.title);
    expect(titles.some((t) => /decision is available/i.test(t))).toBe(true);
    expect(titles.some((t) => /offer/i.test(t))).toBe(false);
  });

  it('case-tickets: create, list, reply, resolved blocks', async () => {
    const { id, cookie: mine } = await submittedApp();
    const timeline = await get(`/${id}/timeline`, mine).expect(200);
    const version = (timeline.body as { version: number }).version;
    const created = await post(
      `/${id}/tickets`,
      {
        version,
        subject: 'Upload question',
        message: 'Which file goes where?',
        idempotencyKey: key(),
      },
      mine,
    ).expect(201);
    const ticketId = (created.body as { id: string }).id;
    const listed = await get(`/${id}/tickets`, mine).expect(200);
    const items = (listed.body as { items: Array<{ id: string }> }).items;
    expect(items.some((t) => t.id === ticketId)).toBe(true);
    await post(
      `/${id}/tickets/${ticketId}/replies`,
      {
        version,
        message: 'Extra detail.',
        idempotencyKey: key(),
      },
      mine,
    ).expect(201);
    const again = await get(`/${id}/tickets`, mine).expect(200);
    const found = (
      again.body as {
        items: Array<{ messages: Array<{ body: string }> }>;
      }
    ).items.find((t) => t.messages.some((m) => m.body === 'Extra detail.'));
    expect(found).toBeDefined();
  });

  it('case-withdraw: confirm gate, receipt, refund separation, replay', async () => {
    const { id, cookie: mine } = await submittedApp();
    const timelineBefore = await get(`/${id}/timeline`, mine).expect(200);
    const version = (timelineBefore.body as { version: number }).version;
    await post(
      `/${id}/withdraw`,
      {
        version,
        confirmed: false,
        idempotencyKey: key(),
      },
      mine,
    ).expect(400);
    const done = await post(
      `/${id}/withdraw`,
      {
        version,
        confirmed: true,
        reason: 'Accepted elsewhere.',
        idempotencyKey: key(),
      },
      mine,
    ).expect(201);
    const body = done.body as { receipt: string };
    expect(body.receipt).toBeDefined();
    await post(
      `/${id}/withdraw`,
      {
        version,
        confirmed: true,
        idempotencyKey: key(),
      },
      mine,
    ).expect(409);
    const timeline = await get(`/${id}/timeline`, mine).expect(200);
    expect((timeline.body as { state: string }).state).toBe('Withdrawn');
  });

  it('case-notifications: list, mark read, foreign cannot read', async () => {
    const { id, cookie: mine } = await submittedApp();
    await staffClaim(id, mine);
    await staffClarify(id, 'Notify me.');
    const listed = await get('/notifications', mine).expect(200);
    const items = (listed.body as { items: Array<{ id: string }> }).items;
    expect(items.length).toBeGreaterThan(0);
    const first = items[0];
    const marked = await post(
      `/notifications/${first.id}/read`,
      {},
      mine,
    ).expect(201);
    expect((marked.body as { readAt: string }).readAt).toBeDefined();
    await post(`/notifications/${first.id}/read`, {}, other).expect(404);
  });

  it('case-idempotency: same key replays the stored receipt', async () => {
    const { id, cookie: mine } = await submittedApp();
    await staffClaim(id, mine);
    const same = key();
    // Same key AND same payload (pinned version): the stored result replays.
    const version = await staffVersion(id, officer);
    const body = { version, idempotencyKey: same, question: 'Replay me.' };
    const first = await reviewPost(
      `/${id}/clarifications`,
      body,
      officer,
    ).expect(201);
    const second = await reviewPost(
      `/${id}/clarifications`,
      body,
      officer,
    ).expect(201);
    expect(second.body.id).toBe(first.body.id);
  });

  it('case-sims-removed: the simulation endpoints are gone', async () => {
    const { id } = await submittedApp();
    await post(`/${id}/simulate-clarification`, {
      question: 'Self ask.',
      idempotencyKey: key(),
    }).expect(404);
    await post(`/${id}/simulate-decision`, {
      outcome: 'ADMIT',
      message: 'Self grant.',
      idempotencyKey: key(),
    }).expect(404);
    await post(`/${id}/simulate-correction-decision`, {
      correctionId: randomUUID(),
      approve: true,
      idempotencyKey: key(),
    }).expect(404);
  });

  it('case-version: stale versions conflict on case writes', async () => {
    const { id, cookie: mine } = await submittedApp();
    await staffClaim(id, mine);
    const clar = await staffClarify(id, 'Version check.');
    const clarId = clar.id;
    // Staff writes advance the version: re-read before responding.
    const fresh = await get(`/${id}/timeline`, mine).expect(200);
    const current = (fresh.body as { version: number }).version;
    // Stale version must conflict with current version surfaced.
    const stale = await post(
      `/${id}/clarifications/${clarId}/respond`,
      {
        version: current + 99,
        response: 'Stale attempt.',
        idempotencyKey: key(),
      },
      mine,
    ).expect(409);
    expect((stale.body as { code: string }).code).toBe('VERSION_CONFLICT');
    expect((stale.body as { currentVersion?: number }).currentVersion).toBe(
      current,
    );
    // Correct version succeeds.
    const ok = await post(
      `/${id}/clarifications/${clarId}/respond`,
      {
        version: current,
        response: 'Current version response.',
        idempotencyKey: key(),
      },
      mine,
    ).expect(201);
    expect((ok.body as { receipt: string }).receipt).toBeDefined();
  });

  it('case-mismatched-key: same key with different payload conflicts', async () => {
    const { id, cookie: mine } = await submittedApp();
    const timeline = await get(`/${id}/timeline`, mine).expect(200);
    const version = (timeline.body as { version: number }).version;
    const same = key();
    await post(
      `/${id}/corrections`,
      {
        version,
        section: 'contact',
        field: 'address',
        reason: 'First reason.',
        idempotencyKey: same,
      },
      mine,
    ).expect(201);
    const conflict = await post(
      `/${id}/corrections`,
      {
        version,
        section: 'contact',
        field: 'phone',
        reason: 'Different payload, same key.',
        idempotencyKey: same,
      },
      mine,
    ).expect(409);
    expect((conflict.body as { code: string }).code).toBe(
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('case-unknown-neutral: unknown ids look like foreign ids', async () => {
    const unknown = randomUUID();
    const foreignTimeline = await get(`/${unknown}/timeline`, cookie).expect(
      404,
    );
    expect((foreignTimeline.body as { code: string }).code).toBe('NOT_FOUND');
    await get(`/${unknown}/decision`, cookie).expect(404);
    await get(`/${unknown}/clarifications`, cookie).expect(404);
  });

  it('case-scoped: responding to one clarification leaves others open', async () => {
    const { id, cookie: mine } = await submittedApp();
    await staffClaim(id, mine);
    const first = await staffClarify(id, 'First item.');
    const second = await staffClarify(id, 'Second item.');
    const timeline = await get(`/${id}/timeline`, mine).expect(200);
    const version = (timeline.body as { version: number }).version;
    await post(
      `/${id}/clarifications/${first.id}/respond`,
      {
        version,
        response: 'Answering only the first.',
        idempotencyKey: key(),
      },
      mine,
    ).expect(201);
    const listed = await get(`/${id}/clarifications`, mine).expect(200);
    const items = (
      listed.body as {
        items: Array<{ id: string; status: string; response: string | null }>;
      }
    ).items;
    const answered = items.find((c) => c.id === first.id);
    const untouched = items.find((c) => c.id === second.id);
    expect(answered?.status).toBe('ANSWERED');
    expect(answered?.response).toBe('Answering only the first.');
    expect(untouched?.status).toBe('OPEN');
    expect(untouched?.response).toBeNull();
    // Application data itself is untouched by a clarification response.
    const review = await get(`/${id}/review`, mine).expect(200);
    expect(
      (review.body as { application: { personal: { givenName: string } } })
        .application.personal.givenName,
    ).toBe('Case');
  });

  it('case-withdraw-wording: receipt and timeline separate refunds', async () => {
    const { id, cookie: mine } = await submittedApp();
    const timeline = await get(`/${id}/timeline`, mine).expect(200);
    const version = (timeline.body as { version: number }).version;
    const done = await post(
      `/${id}/withdraw`,
      {
        version,
        confirmed: true,
        reason: 'Wording check.',
        idempotencyKey: key(),
      },
      mine,
    ).expect(201);
    expect((done.body as { receipt: string }).receipt).toBeDefined();
    const after = await get(`/${id}/timeline`, mine).expect(200);
    const events = (
      after.body as { events: Array<{ code: string; detail: string | null }> }
    ).events;
    const withdrawn = events.find((e) => e.code === 'Withdrawn');
    expect(withdrawn).toBeDefined();
    expect(withdrawn?.detail ?? '').toMatch(/refund/i);
    expect(withdrawn?.detail ?? '').toMatch(/separate/i);
  });

  it('case-notify-dedupe: replaying a request does not duplicate notices', async () => {
    const { id, cookie: mine } = await submittedApp();
    await staffClaim(id, mine);
    const before = await get('/notifications', mine).expect(200);
    const beforeCount = (before.body as { items: Array<unknown> }).items.length;
    const same = key();
    const version = await staffVersion(id, officer);
    const payload = {
      version,
      idempotencyKey: same,
      question: 'Dedupe check.',
    };
    const first = await reviewPost(
      `/${id}/clarifications`,
      payload,
      officer,
    ).expect(201);
    const afterFirst = await get('/notifications', mine).expect(200);
    const firstCount = (afterFirst.body as { items: Array<unknown> }).items
      .length;
    expect(firstCount).toBe(beforeCount + 1);
    const second = await reviewPost(
      `/${id}/clarifications`,
      payload,
      officer,
    ).expect(201);
    expect(second.body.id).toBe(first.body.id);
    const afterSecond = await get('/notifications', mine).expect(200);
    expect((afterSecond.body as { items: Array<unknown> }).items.length).toBe(
      firstCount,
    );
  });

  it('case-ticket-resolved: replies to resolved tickets are blocked', async () => {
    const { id, cookie: mine } = await submittedApp();
    const timeline = await get(`/${id}/timeline`, mine).expect(200);
    const version = (timeline.body as { version: number }).version;
    const created = await post(
      `/${id}/tickets`,
      {
        version,
        subject: 'Resolve me',
        message: 'Please resolve.',
        idempotencyKey: key(),
      },
      mine,
    ).expect(201);
    const ticketId = (created.body as { id: string }).id;
    await db.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'RESOLVED' },
    });
    const blocked = await post(
      `/${id}/tickets/${ticketId}/replies`,
      { version, message: 'Too late.', idempotencyKey: key() },
      mine,
    ).expect(409);
    expect((blocked.body as { code: string }).code).toBe('TICKET_CLOSED');
  });

  it('case-correction-decision: approval preserves the submitted snapshot', async () => {
    const { id, cookie: mine } = await submittedApp();
    await staffClaim(id, mine);
    const timeline = await get(`/${id}/timeline`, mine).expect(200);
    const version = (timeline.body as { version: number }).version;
    const created = await post(
      `/${id}/corrections`,
      {
        version,
        section: 'contact',
        field: 'address',
        reason: 'Moved house.',
        idempotencyKey: key(),
      },
      mine,
    ).expect(201);
    const correctionId = (created.body as { id: string }).id;
    const submission = await db.applicationSubmission.findUniqueOrThrow({
      where: { applicationId: id },
    });
    const snapshotBefore = JSON.stringify(submission.snapshot);
    const approved = await reviewPost(
      `/corrections/${correctionId}/decide`,
      {
        approve: true,
        note: 'Approved in demo.',
        idempotencyKey: key(),
      },
      officer,
    ).expect(201);
    expect((approved.body as { status: string }).status).toBe('APPROVED');
    const listed = await get(`/${id}/corrections`, mine).expect(200);
    const found = (
      listed.body as {
        items: Array<{ id: string; status: string; decidedAt: string | null }>;
      }
    ).items.find((c) => c.id === correctionId);
    expect(found?.status).toBe('APPROVED');
    expect(found?.decidedAt).not.toBeNull();
    // Original snapshot is immutable: approval records the decision without
    // rewriting submitted data.
    const after = await db.applicationSubmission.findUniqueOrThrow({
      where: { applicationId: id },
    });
    expect(JSON.stringify(after.snapshot)).toBe(snapshotBefore);
    const events = await get(`/${id}/timeline`, mine).expect(200);
    expect(
      (events.body as { events: Array<{ code: string }> }).events.some(
        (e) => e.code === 'AmendmentApproved',
      ),
    ).toBe(true);
  });

  it('case-correction-decline: declined corrections record a decision', async () => {
    const { id, cookie: mine } = await submittedApp();
    await staffClaim(id, mine);
    const timeline = await get(`/${id}/timeline`, mine).expect(200);
    const version = (timeline.body as { version: number }).version;
    const created = await post(
      `/${id}/corrections`,
      {
        version,
        section: 'personal',
        field: 'familyName',
        reason: 'Spelling query.',
        idempotencyKey: key(),
      },
      mine,
    ).expect(201);
    const correctionId = (created.body as { id: string }).id;
    const declined = await reviewPost(
      `/corrections/${correctionId}/decide`,
      {
        approve: false,
        note: 'Locked after deadline.',
        idempotencyKey: key(),
      },
      officer,
    ).expect(201);
    expect((declined.body as { status: string }).status).toBe('REJECTED');
  });
});
