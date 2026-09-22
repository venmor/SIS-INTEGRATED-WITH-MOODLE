import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH3-005 separate decision authority and offer e2e.
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: decision-release, decision-denied, decision-no-package,
 * decision-self-approval, decision-outcomes, decision-version,
 * decision-idempotency, decision-already-released, decision-delivery-kept,
 * decision-view-neutral, decision-no-leak.
 */
describe('Phase 3 separate decision authority and offer', () => {
  let app: INestApplication;
  let db: PrismaService;
  let officer: string;
  let approver: string;
  let sysadmin: string;
  let offeringId: string;
  const csrf = { 'x-requested-with': 'XMLHttpRequest' };
  const key = () => randomUUID();
  const post = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/review${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const get = (path: string, c: string) =>
    request(app.getHttpServer()).get(`/review${path}`).set('Cookie', c);
  const appPost = (path: string, body: object, c: string) =>
    request(app.getHttpServer())
      .post(`/applications${path}`)
      .set(csrf)
      .set('Cookie', c)
      .send(body);
  const appGet = (path: string, c: string) =>
    request(app.getHttpServer()).get(`/applications${path}`).set('Cookie', c);

  async function user(
    role: string,
    capabilities: string[],
    scopeType = 'SYSTEM',
    scopeRef = 'GLOBAL',
    accountId?: string,
  ) {
    const account =
      accountId != null
        ? { id: accountId }
        : await db.account.create({
            data: {
              personId: (
                await db.person.create({
                  data: {
                    displayName: `Fictional ${role}`,
                    email: `${key()}@demo.invalid`,
                    emailVerifiedAt: new Date(),
                  },
                })
              ).id,
              username: key(),
            },
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
      givenName: 'Decide',
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

  async function claimedApp(officerCookie: string) {
    const app = await submittedApp();
    await post(
      `/${app.id}/claim`,
      { version: app.version, idempotencyKey: key() },
      officerCookie,
    ).expect(201);
    return app;
  }

  async function recommendedApp(officerCookie: string) {
    const app = await claimedApp(officerCookie);
    const queue = await get(`/queue/${app.id}`, officerCookie).expect(200);
    const version = (queue.body as { version: number }).version;
    await post(
      `/${app.id}/recommendations`,
      {
        version,
        idempotencyKey: key(),
        eligibilityOutcome: 'ELIGIBLE',
        recommendation: 'FAVOURABLE',
        criteria: ['COMPLETENESS', 'MINIMUM_ELIGIBILITY'],
        rationale: 'Meets the demo minimum.',
      },
      officerCookie,
    ).expect(201);
    const fresh = await get(`/queue/${app.id}`, officerCookie).expect(200);
    return {
      ...app,
      version: (fresh.body as { version: number }).version,
    };
  }

  const releaseBody = (version: number, extra: object = {}) => ({
    version,
    idempotencyKey: key(),
    outcome: 'ADMIT_WITH_CONDITIONS',
    message: 'Offered a place with conditions.',
    acceptBy: '2027-01-15T17:00:00.000Z',
    conditions: [
      {
        text: 'Provide certified documents.',
        detail: 'Certified copy of the result statement.',
        owner: 'APPLICANT',
        deadline: '2027-01-10T17:00:00.000Z',
        blocksMatriculation: true,
      },
    ],
    ...extra,
  });

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
    sysadmin = (await user('SYSADMIN', ['administer-case-demo'])).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('decision-release: approver releases a versioned conditional offer', async () => {
    const app = await recommendedApp(officer);
    const released = await post(
      `/${app.id}/decision/release`,
      releaseBody(app.version),
      approver,
    ).expect(201);
    expect((released.body as { outcome: string }).outcome).toBe(
      'ADMIT_WITH_CONDITIONS',
    );
    expect((released.body as { version: number }).version).toBe(1);
    // Applicant sees the outcome only by deliberately opening the decision.
    const viewed = await appGet(`/${app.id}/decision`, app.cookie).expect(200);
    expect((viewed.body as { outcome: string }).outcome).toBe(
      'ADMIT_WITH_CONDITIONS',
    );
    const conditions = (
      viewed.body as {
        conditions: Array<{
          text: string;
          deadline: string | null;
          blocksMatriculation: boolean;
        }>;
      }
    ).conditions;
    expect(conditions).toHaveLength(1);
    expect(conditions[0].text).toBe('Provide certified documents.');
    expect(conditions[0].blocksMatriculation).toBe(true);
  });

  it('decision-view-neutral: the notice carries no outcome', async () => {
    const app = await recommendedApp(officer);
    await post(
      `/${app.id}/decision/release`,
      releaseBody(app.version, { outcome: 'REJECT' }),
      approver,
    ).expect(201);
    const inbox = await appGet('/notifications', app.cookie).expect(200);
    const payload = JSON.stringify(inbox.body);
    expect(payload).not.toContain('REJECT');
    expect(payload).toContain('Sign in to view it securely');
  });

  it('decision-denied: officer, applicant and sysadmin cannot release', async () => {
    const app = await recommendedApp(officer);
    await post(
      `/${app.id}/decision/release`,
      releaseBody(app.version),
      officer,
    ).expect(403);
    await post(
      `/${app.id}/decision/release`,
      releaseBody(app.version),
      app.cookie,
    ).expect(403);
    await post(
      `/${app.id}/decision/release`,
      releaseBody(app.version),
      sysadmin,
    ).expect(403);
    const officer2 = (
      await user('ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', '2026')
    ).cookie;
    await post(
      `/${app.id}/decision/release`,
      releaseBody(app.version),
      officer2,
    ).expect(403);
    await post(
      `/${randomUUID()}/decision/release`,
      releaseBody(1),
      approver,
    ).expect(404);
  });

  it('decision-no-package: release without a recommendation is refused', async () => {
    const app = await claimedApp(officer);
    const queue = await get(`/queue/${app.id}`, officer).expect(200);
    const version = (queue.body as { version: number }).version;
    const refused = await post(
      `/${app.id}/decision/release`,
      releaseBody(version),
      approver,
    ).expect(409);
    expect((refused.body as { code: string }).code).toBe('NO_RECOMMENDATION');
    expect(await db.applicationDecision.findUnique({
      where: { applicationId: app.id },
    })).toBeNull();
  });

  it('decision-self-approval: the recommending officer cannot release', async () => {
    const me = await user('ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', '2026');
    const app = await recommendedApp(me.cookie);
    // Same person, second workspace: approver authority, officer history.
    const alter = await user(
      'ADMISSIONS_APPROVER',
      ['decide-offer'],
      'INTAKE',
      '2026',
      me.accountId,
    );
    const denied = await post(
      `/${app.id}/decision/release`,
      releaseBody(app.version),
      alter.cookie,
    ).expect(403);
    expect((denied.body as { code: string }).code).toBe('SELF_APPROVAL');
    expect(await db.applicationDecision.findUnique({
      where: { applicationId: app.id },
    })).toBeNull();
  });

  it('decision-outcomes: all six outcomes persist', async () => {
    for (const outcome of [
      'ADMIT',
      'ADMIT_WITH_CONDITIONS',
      'WAITLIST',
      'REJECT',
      'REFER_TO_ALTERNATIVE_PROGRAMME',
      'REQUEST_FURTHER_REVIEW',
    ]) {
      const app = await recommendedApp(officer);
      const released = await post(
        `/${app.id}/decision/release`,
        releaseBody(app.version, { outcome, conditions: [] }),
        approver,
      ).expect(201);
      expect((released.body as { outcome: string }).outcome).toBe(outcome);
    }
  });

  it('decision-version: stale versions conflict with the current version', async () => {
    const app = await recommendedApp(officer);
    const stale = await post(
      `/${app.id}/decision/release`,
      releaseBody(1),
      approver,
    ).expect(409);
    expect((stale.body as { code: string }).code).toBe('VERSION_CONFLICT');
    expect((stale.body as { currentVersion: number }).currentVersion).toBe(
      app.version,
    );
  });

  it('decision-idempotency: same key replays, different payload conflicts', async () => {
    const app = await recommendedApp(officer);
    const idempotencyKey = key();
    const first = await post(
      `/${app.id}/decision/release`,
      { ...releaseBody(app.version), idempotencyKey },
      approver,
    ).expect(201);
    const replay = await post(
      `/${app.id}/decision/release`,
      { ...releaseBody(app.version), idempotencyKey },
      approver,
    ).expect(201);
    expect((replay.body as { id: string }).id).toBe(
      (first.body as { id: string }).id,
    );
    const conflict = await post(
      `/${app.id}/decision/release`,
      {
        ...releaseBody(app.version, { outcome: 'REJECT' }),
        idempotencyKey,
      },
      approver,
    ).expect(409);
    expect((conflict.body as { code: string }).code).toBe(
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('decision-already-released: a second decision never replaces the first', async () => {
    const app = await recommendedApp(officer);
    const first = await post(
      `/${app.id}/decision/release`,
      releaseBody(app.version),
      approver,
    ).expect(201);
    const again = await post(
      `/${app.id}/decision/release`,
      releaseBody(app.version + 1, { outcome: 'REJECT' }),
      approver,
    ).expect(409);
    expect((again.body as { code: string }).code).toBe('ALREADY_RELEASED');
    expect((again.body as { decisionId: string }).decisionId).toBe(
      (first.body as { id: string }).id,
    );
  });

  it('decision-delivery-kept: losing the notice keeps the valid decision', async () => {
    const app = await recommendedApp(officer);
    await post(
      `/${app.id}/decision/release`,
      releaseBody(app.version),
      approver,
    ).expect(201);
    // Delivery failure analogue: the inbox row is gone, the release stands.
    await db.applicantNotification.deleteMany({
      where: { applicationId: app.id },
    });
    const viewed = await appGet(`/${app.id}/decision`, app.cookie).expect(200);
    expect((viewed.body as { outcome: string }).outcome).toBe(
      'ADMIT_WITH_CONDITIONS',
    );
  });

  it('decision-no-leak: internal package stays out of applicant views', async () => {
    const app = await recommendedApp(officer);
    await post(
      `/${app.id}/decision/release`,
      releaseBody(app.version),
      approver,
    ).expect(201);
    const timeline = await appGet(`/${app.id}/timeline`, app.cookie).expect(
      200,
    );
    const payload = JSON.stringify(timeline.body);
    expect(payload).not.toContain('Meets the demo minimum.');
    expect(payload).not.toContain('FAVOURABLE');
  });
});
