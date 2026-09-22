import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH3-006 offer acceptance and onboarding handoff e2e (no conversion).
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: offer-accept, offer-decline, offer-double-accept,
 * offer-expired, offer-foreign-neutral, offer-extend, offer-extend-denied,
 * onboarding-tasks, onboarding-task-denied, offer-no-conversion,
 * offer-validation, offer-version, offer-idempotency, offer-not-available.
 */
describe('Phase 3 offer acceptance and onboarding handoff', () => {
  let app: INestApplication;
  let db: PrismaService;
  let officer: string;
  let approver: string;
  let offeringId: string;
  const csrf = { 'x-requested-with': 'XMLHttpRequest' };
  const key = () => randomUUID();
  const DECLARATIONS = [
    'UNDERSTAND_TERMS',
    'ACCEPT_PROGRAMME',
    'INFO_ACCURATE',
    'REGISTRATION_SEPARATE',
  ];
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

  async function user(
    role: string,
    capabilities: string[],
    scopeType = 'SYSTEM',
    scopeRef = 'GLOBAL',
  ) {
    const person = await db.person.create({
      data: {
        displayName: `Fictional ${role}`,
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

  async function submittedApp() {
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
      givenName: 'Offer',
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
    const timeline = await appGet(`/${id}/timeline`, c).expect(200);
    return {
      id,
      version: (timeline.body as { version: number }).version,
      cookie: c,
    };
  }

  async function staffVersion(id: string, c: string) {
    const summary = await staffGet(`/queue/${id}`, c).expect(200);
    return (summary.body as { version: number }).version;
  }

  async function releasedApp(
    officerCookie: string,
    approverCookie: string,
    outcome = 'ADMIT_WITH_CONDITIONS',
    acceptBy = '2027-01-15T17:00:00.000Z',
  ) {
    const app = await submittedApp();
    const submitted = await appGet(`/${app.id}/timeline`, app.cookie).expect(
      200,
    );
    await staffPost(
      `/${app.id}/claim`,
      {
        version: (submitted.body as { version: number }).version,
        idempotencyKey: key(),
      },
      officerCookie,
    ).expect(201);
    await staffPost(
      `/${app.id}/recommendations`,
      {
        version: await staffVersion(app.id, officerCookie),
        idempotencyKey: key(),
        eligibilityOutcome: 'ELIGIBLE',
        recommendation: 'FAVOURABLE',
        rationale: 'Fixture recommendation.',
      },
      officerCookie,
    ).expect(201);
    await staffPost(
      `/${app.id}/decision/release`,
      {
        version: await staffVersion(app.id, approverCookie),
        idempotencyKey: key(),
        outcome,
        message: 'Offered a place with conditions.',
        acceptBy,
        conditions: [
          {
            text: 'Provide certified documents.',
            detail: 'Certified copy of the result statement.',
            owner: 'APPLICANT',
            deadline: '2027-01-10T17:00:00.000Z',
            blocksMatriculation: true,
          },
        ],
      },
      approverCookie,
    ).expect(201);
    return app;
  }

  const timelineVersion = async (id: string, c: string) =>
    (
      (await appGet(`/${id}/timeline`, c).expect(200)).body as {
        version: number;
      }
    ).version;

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
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('offer-accept: deliberate open, accept, onboarding appears', async () => {
    const app = await releasedApp(officer, approver);
    const offer = await appGet(`/${app.id}/offer`, app.cookie).expect(200);
    const body = offer.body as {
      outcome: string;
      acceptBy: string;
      conditions: Array<{ text: string; blocksMatriculation: boolean }>;
      response: null;
    };
    expect(body.outcome).toBe('ADMIT_WITH_CONDITIONS');
    expect(body.acceptBy).toBe('2027-01-15T17:00:00.000Z');
    expect(body.conditions[0].text).toBe('Provide certified documents.');
    expect(body.response).toBeNull();
    const accepted = await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'ACCEPT',
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(201);
    expect((accepted.body as { decision: string }).decision).toBe('ACCEPT');
    expect((accepted.body as { receipt: string }).receipt).toBeDefined();
    const onboarding = await appGet(
      `/${app.id}/onboarding`,
      app.cookie,
    ).expect(200);
    const board = onboarding.body as {
      requiredTotal: number;
      requiredComplete: number;
      tasks: Array<{ taskKey: string; owner: string }>;
    };
    expect(board.requiredTotal).toBe(3);
    expect(board.requiredComplete).toBe(0);
    expect(
      board.tasks.some((t) => t.taskKey === 'VERIFY_DOCUMENTS'),
    ).toBe(true);
    const timeline = await appGet(`/${app.id}/timeline`, app.cookie).expect(
      200,
    );
    expect(
      (timeline.body as { events: Array<{ code: string }> }).events.some(
        (e) => e.code === 'OfferAccepted',
      ),
    ).toBe(true);
  });

  it('offer-decline: reason recorded, onboarding stays closed', async () => {
    const app = await releasedApp(officer, approver);
    const declined = await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'DECLINE',
        reason: 'Accepted elsewhere.',
      },
      app.cookie,
    ).expect(201);
    expect((declined.body as { decision: string }).decision).toBe('DECLINE');
    await appGet(`/${app.id}/onboarding`, app.cookie).expect(404);
    const offer = await appGet(`/${app.id}/offer`, app.cookie).expect(200);
    expect(
      (offer.body as { response: { decision: string } }).response.decision,
    ).toBe('DECLINE');
  });

  it('offer-double-accept: second attempt receives the final status', async () => {
    const app = await releasedApp(officer, approver);
    const first = await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'ACCEPT',
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(201);
    const second = await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'DECLINE',
        reason: 'Changed mind.',
      },
      app.cookie,
    ).expect(201);
    expect((second.body as { receipt: string }).receipt).toBe(
      (first.body as { receipt: string }).receipt,
    );
    expect((second.body as { decision: string }).decision).toBe('ACCEPT');
    const count = await db.applicationOfferResponse.count({
      where: { applicationId: app.id },
    });
    expect(count).toBe(1);
  });

  it('offer-expired: late acceptance is blocked, decline still records', async () => {
    const app = await releasedApp(
      officer,
      approver,
      'ADMIT_WITH_CONDITIONS',
      '2020-01-15T17:00:00.000Z',
    );
    const late = await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'ACCEPT',
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(409);
    expect((late.body as { code: string }).code).toBe('OFFER_EXPIRED');
    await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'DECLINE',
        reason: 'Too late to accept.',
      },
      app.cookie,
    ).expect(201);
  });

  it('offer-foreign-neutral: other applicants see nothing', async () => {
    const app = await releasedApp(officer, approver);
    const stranger = (await user('APP', ['apply'], 'APPLICATION', key()))
      .cookie;
    await appGet(`/${app.id}/offer`, stranger).expect(404);
    await appGet(`/${app.id}/onboarding`, stranger).expect(404);
    await appPost(
      `/${app.id}/offer/response`,
      {
        version: 1,
        idempotencyKey: key(),
        decision: 'ACCEPT',
        declarations: DECLARATIONS,
      },
      stranger,
    ).expect(404);
    await appGet(`/${randomUUID()}/offer`, app.cookie).expect(404);
  });

  it('offer-extend: approver moves the deadline with a reason', async () => {
    const app = await releasedApp(
      officer,
      approver,
      'ADMIT_WITH_CONDITIONS',
      '2020-01-15T17:00:00.000Z',
    );
    const extended = await staffPost(
      `/${app.id}/offer/extend`,
      {
        version: await staffVersion(app.id, approver),
        idempotencyKey: key(),
        newDeadline: '2027-03-15T17:00:00.000Z',
        reason: 'Postal delay in the district.',
      },
      approver,
    ).expect(201);
    expect((extended.body as { acceptBy: string }).acceptBy).toBe(
      '2027-03-15T17:00:00.000Z',
    );
    // Acceptance now succeeds under the authorized extension.
    await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'ACCEPT',
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(201);
  });

  it('offer-extend-denied: roles, past dates and answered offers', async () => {
    const app = await releasedApp(officer, approver);
    const body = {
      version: await staffVersion(app.id, approver),
      idempotencyKey: key(),
      newDeadline: '2027-03-15T17:00:00.000Z',
      reason: 'Applicant attempt.',
    };
    await staffPost(`/${app.id}/offer/extend`, body, app.cookie).expect(403);
    await staffPost(
      `/${app.id}/offer/extend`,
      { ...body, idempotencyKey: key() },
      officer,
    ).expect(403);
    await staffPost(
      `/${app.id}/offer/extend`,
      {
        ...body,
        idempotencyKey: key(),
        newDeadline: '2020-01-01T00:00:00.000Z',
      },
      approver,
    ).expect(400);
    // Answer, then extension is refused as already answered.
    await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'ACCEPT',
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(201);
    const answered = await staffPost(
      `/${app.id}/offer/extend`,
      {
        version: await staffVersion(app.id, approver),
        idempotencyKey: key(),
        newDeadline: '2027-06-15T17:00:00.000Z',
        reason: 'Too late.',
      },
      approver,
    ).expect(409);
    expect((answered.body as { code: string }).code).toBe('ALREADY_ANSWERED');
  });

  it('onboarding-tasks: applicant completes own tasks only', async () => {
    const app = await releasedApp(officer, approver);
    await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'ACCEPT',
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(201);
    const done = await appPost(
      `/${app.id}/onboarding/tasks`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        taskKey: 'CONFIRM_CONTACT',
      },
      app.cookie,
    ).expect(201);
    expect((done.body as { status: string }).status).toBe('COMPLETED');
    const board = await appGet(`/${app.id}/onboarding`, app.cookie).expect(
      200,
    );
    expect(
      (board.body as { requiredComplete: number }).requiredComplete,
    ).toBe(1);
    // Re-completing is idempotent.
    const again = await appPost(
      `/${app.id}/onboarding/tasks`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        taskKey: 'CONFIRM_CONTACT',
      },
      app.cookie,
    ).expect(201);
    expect((again.body as { status: string }).status).toBe('COMPLETED');
  });

  it('onboarding-task-denied: institution tasks and unknown keys', async () => {
    const app = await releasedApp(officer, approver);
    await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'ACCEPT',
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(201);
    await appPost(
      `/${app.id}/onboarding/tasks`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        taskKey: 'VERIFY_DOCUMENTS',
      },
      app.cookie,
    ).expect(403);
    await appPost(
      `/${app.id}/onboarding/tasks`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        taskKey: 'NO_SUCH_TASK',
      },
      app.cookie,
    ).expect(404);
  });

  it('offer-no-conversion: acceptance changes no academic record', async () => {
    const app = await releasedApp(officer, approver);
    const before = await db.application.findUniqueOrThrow({
      where: { id: app.id },
    });
    await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'ACCEPT',
        declarations: DECLARATIONS,
      },
      app.cookie,
    ).expect(201);
    const after = await db.application.findUniqueOrThrow({
      where: { id: app.id },
    });
    // State machine untouched: still Submitted, no new role, no decision edit.
    expect(after.state).toBe('Submitted');
    expect(after.state).toBe(before.state);
    const decision = await db.applicationDecision.findUniqueOrThrow({
      where: { applicationId: app.id },
    });
    expect(decision.outcome).toBe('ADMIT_WITH_CONDITIONS');
    expect(decision.version).toBe(1);
    expect(decision.releasedAt).not.toBeNull();
  });

  it('offer-validation: bad decision value is rejected', async () => {
    const app = await releasedApp(officer, approver);
    await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'MAYBE',
      },
      app.cookie,
    ).expect(400);
  });

  it('offer-declarations: accept needs every offer declaration', async () => {
    const app = await releasedApp(officer, approver);
    const missing = await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey: key(),
        decision: 'ACCEPT',
        declarations: ['UNDERSTAND_TERMS'],
      },
      app.cookie,
    ).expect(400);
    expect((missing.body as { code: string }).code).toBe(
      'DECLARATIONS_INCOMPLETE',
    );
    expect(
      await db.applicationOfferResponse.findUnique({
        where: { applicationId: app.id },
      }),
    ).toBeNull();
  });

  it('offer-version: stale versions conflict', async () => {
    const app = await releasedApp(officer, approver);
    const current = await timelineVersion(app.id, app.cookie);
    const stale = await appPost(
      `/${app.id}/offer/response`,
      {
        version: current + 99,
        idempotencyKey: key(),
        decision: 'ACCEPT',
      },
      app.cookie,
    ).expect(409);
    expect((stale.body as { code: string }).code).toBe('VERSION_CONFLICT');
  });

  it('offer-idempotency: same key with different payload conflicts', async () => {
    const app = await releasedApp(officer, approver);
    const idempotencyKey = key();
    const version = await timelineVersion(app.id, app.cookie);
    await appPost(
      `/${app.id}/offer/response`,
      { version, idempotencyKey, decision: 'ACCEPT', declarations: DECLARATIONS },
      app.cookie,
    ).expect(201);
    const conflict = await appPost(
      `/${app.id}/offer/response`,
      {
        version: await timelineVersion(app.id, app.cookie),
        idempotencyKey,
        decision: 'DECLINE',
        reason: 'Changed mind.',
      },
      app.cookie,
    ).expect(409);
    expect((conflict.body as { code: string }).code).toBe(
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('offer-not-available: non-offer decisions have no offer surface', async () => {
    const submitted = await submittedApp();
    const started = await appGet(
      `/${submitted.id}/timeline`,
      submitted.cookie,
    ).expect(200);
    await staffPost(
      `/${submitted.id}/claim`,
      {
        version: (started.body as { version: number }).version,
        idempotencyKey: key(),
      },
      officer,
    ).expect(201);
    await staffPost(
      `/${submitted.id}/recommendations`,
      {
        version: await staffVersion(submitted.id, officer),
        idempotencyKey: key(),
        eligibilityOutcome: 'NOT_ELIGIBLE',
        recommendation: 'UNFAVOURABLE',
        rationale: 'Below the demo minimum.',
      },
      officer,
    ).expect(201);
    await staffPost(
      `/${submitted.id}/decision/release`,
      {
        version: await staffVersion(submitted.id, approver),
        idempotencyKey: key(),
        outcome: 'REJECT',
        message: 'Unable to offer a place.',
        acceptBy: '2027-01-15T17:00:00.000Z',
        conditions: [],
      },
      approver,
    ).expect(201);
    await appGet(`/${submitted.id}/offer`, submitted.cookie).expect(404);
    await appPost(
      `/${submitted.id}/offer/response`,
      {
        version: await timelineVersion(submitted.id, submitted.cookie),
        idempotencyKey: key(),
        decision: 'ACCEPT',
      },
      submitted.cookie,
    ).expect(404);
    await appGet(`/${submitted.id}/onboarding`, submitted.cookie).expect(404);
  });
});
