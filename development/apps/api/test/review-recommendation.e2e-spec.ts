import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH3-004 eligibility and recommendation package e2e.
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: recommendation-denied, recommendation-crud,
 * recommendation-supersede, recommendation-no-mutation,
 * recommendation-eligible-not-admitted, recommendation-no-leak,
 * recommendation-validation, recommendation-version, recommendation-idempotency.
 */
describe('Phase 3 eligibility and recommendation package', () => {
  let app: INestApplication;
  let db: PrismaService;
  let officer: string;
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
      givenName: 'Recommend',
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
    const review = await appGet(`/${id}/review`, c).expect(200);
    version = review.body.application.version as number;
    // Minimum evidence stage for submission readiness (mirrors the
    // evidence-spec flow): upload the fixture and request safety processing.
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
    const ready = await appGet(`/${id}/review`, c).expect(200);
    version = ready.body.application.version as number;
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

  const recommend = (
    id: string,
    body: object,
    c: string,
  ) => post(`/${id}/recommendations`, body, c);

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
    sysadmin = (await user('SYSADMIN', ['administer-case-demo'])).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('recommendation-crud: record with eligibility outcome and rationale', async () => {
    const { id, version } = await claimedApp(officer);
    const created = await recommend(
      id,
      {
        version,
        idempotencyKey: key(),
        eligibilityOutcome: 'ELIGIBLE',
        recommendation: 'FAVOURABLE',
        criteria: ['COMPLETENESS', 'MINIMUM_ELIGIBILITY'],
        rationale: 'Meets the published minimum on all demo criteria.',
      },
      officer,
    ).expect(201);
    expect((created.body as { status: string }).status).toBe('ACTIVE');
    expect((created.body as { version: number }).version).toBe(1);
    const recId = (created.body as { id: string }).id;
    // A second active package is suppressed, pointing at the open one.
    const dupe = await recommend(
      id,
      {
        version: version + 1,
        idempotencyKey: key(),
        eligibilityOutcome: 'ELIGIBLE',
        recommendation: 'FAVOURABLE',
        rationale: 'Second look.',
      },
      officer,
    ).expect(409);
    expect((dupe.body as { code: string }).code).toBe('DUPLICATE_TASK');
    expect((dupe.body as { recommendationId: string }).recommendationId).toBe(
      recId,
    );
    // History lists the active package.
    const listed = await get(`/${id}/recommendations`, officer).expect(200);
    const items = (listed.body as { items: Array<{ id: string }> }).items;
    expect(items.some((r) => r.id === recId)).toBe(true);
  });

  it('recommendation-supersede: new version preserves history', async () => {
    const { id, version } = await claimedApp(officer);
    const first = await recommend(
      id,
      {
        version,
        idempotencyKey: key(),
        eligibilityOutcome: 'UNDETERMINED',
        recommendation: 'NEEDS_INFORMATION',
        rationale: 'Result statement unclear.',
      },
      officer,
    ).expect(201);
    const firstId = (first.body as { id: string }).id;
    const second = await recommend(
      id,
      {
        version: version + 1,
        idempotencyKey: key(),
        eligibilityOutcome: 'ELIGIBLE',
        recommendation: 'FAVOURABLE',
        rationale: 'Clearer copy received via clarification.',
        supersedesId: firstId,
      },
      officer,
    ).expect(201);
    expect((second.body as { version: number }).version).toBe(2);
    const listed = await get(`/${id}/recommendations`, officer).expect(200);
    const items = (
      listed.body as { items: Array<{ id: string; status: string }> }
    ).items;
    expect(items.find((r) => r.id === firstId)?.status).toBe('SUPERSEDED');
    expect(
      items.find((r) => r.id === (second.body as { id: string }).id)?.status,
    ).toBe('ACTIVE');
  });

  it('recommendation-denied: applicant, approver and sysadmin cannot record', async () => {
    const { id, version, cookie } = await claimedApp(officer);
    const body = {
      version,
      idempotencyKey: key(),
      eligibilityOutcome: 'ELIGIBLE',
      recommendation: 'FAVOURABLE',
      rationale: 'Applicant attempt.',
    };
    await recommend(id, body, cookie).expect(403);
    const approver = (
      await user('ADMISSIONS_APPROVER', ['decide-offer'], 'INTAKE', '2026')
    ).cookie;
    await recommend(id, { ...body, idempotencyKey: key() }, approver).expect(
      403,
    );
    await recommend(id, { ...body, idempotencyKey: key() }, sysadmin).expect(
      403,
    );
    // Foreign officer and unknown ids stay neutral.
    const officer2 = (
      await user('ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', '2026')
    ).cookie;
    await recommend(id, { ...body, idempotencyKey: key() }, officer2).expect(
      404,
    );
    await recommend(randomUUID(), { ...body, idempotencyKey: key() }, officer).expect(
      404,
    );
  });

  it('recommendation-no-mutation: recording never rewrites the snapshot', async () => {
    const { id, version } = await claimedApp(officer);
    const before = await db.applicationSubmission.findFirstOrThrow({
      where: { applicationId: id },
    });
    await recommend(
      id,
      {
        version,
        idempotencyKey: key(),
        eligibilityOutcome: 'ELIGIBLE',
        recommendation: 'FAVOURABLE',
        rationale: 'Snapshot must not move.',
      },
      officer,
    ).expect(201);
    const after = await db.applicationSubmission.findFirstOrThrow({
      where: { applicationId: id },
    });
    expect(after.snapshot).toEqual(before.snapshot);
    expect(after.id).toBe(before.id);
  });

  it('recommendation-eligible-not-admitted: no decision or offer appears', async () => {
    const { id, version, cookie } = await claimedApp(officer);
    await recommend(
      id,
      {
        version,
        idempotencyKey: key(),
        eligibilityOutcome: 'ELIGIBLE',
        recommendation: 'FAVOURABLE',
        rationale: 'Eligible is not admitted.',
      },
      officer,
    ).expect(201);
    const decision = await db.applicationDecision.findUnique({
      where: { applicationId: id },
    });
    expect(decision).toBeNull();
    await appGet(`/${id}/decision`, cookie).expect(404);
  });

  it('recommendation-no-leak: applicant views carry no recommendation', async () => {
    const { id, version, cookie } = await claimedApp(officer);
    await recommend(
      id,
      {
        version,
        idempotencyKey: key(),
        eligibilityOutcome: 'NOT_ELIGIBLE',
        recommendation: 'UNFAVOURABLE',
        rationale: 'Below the demo minimum.',
      },
      officer,
    ).expect(201);
    const timeline = await appGet(`/${id}/timeline`, cookie).expect(200);
    expect(JSON.stringify(timeline.body)).not.toContain('UNFAVOURABLE');
    expect(JSON.stringify(timeline.body)).not.toContain('NOT_ELIGIBLE');
    const notifications = await appGet('/notifications', cookie).expect(200);
    expect(JSON.stringify(notifications.body)).not.toContain('UNFAVOURABLE');
  });

  it('recommendation-validation: blank, enums, stale version', async () => {
    const { id, version } = await claimedApp(officer);
    const base = {
      version,
      idempotencyKey: key(),
      eligibilityOutcome: 'ELIGIBLE',
      recommendation: 'FAVOURABLE',
      rationale: 'Valid.',
    };
    await recommend(
      id,
      { ...base, idempotencyKey: key(), rationale: '   ' },
      officer,
    ).expect(400);
    await recommend(
      id,
      { ...base, idempotencyKey: key(), recommendation: 'MAYBE' },
      officer,
    ).expect(400);
    await recommend(
      id,
      { ...base, idempotencyKey: key(), eligibilityOutcome: 'SORT_OF' },
      officer,
    ).expect(400);
    await recommend(
      id,
      { ...base, idempotencyKey: key(), version: version - 1 < 1 ? 9999 : version - 1 },
      officer,
    ).expect(409);
  });

  it('recommendation-idempotency: same key replays, different payload conflicts', async () => {
    const { id, version } = await claimedApp(officer);
    const idempotencyKey = key();
    const first = await recommend(
      id,
      {
        version,
        idempotencyKey,
        eligibilityOutcome: 'ELIGIBLE',
        recommendation: 'FAVOURABLE',
        rationale: 'First write.',
      },
      officer,
    ).expect(201);
    const replay = await recommend(
      id,
      {
        version,
        idempotencyKey,
        eligibilityOutcome: 'ELIGIBLE',
        recommendation: 'FAVOURABLE',
        rationale: 'First write.',
      },
      officer,
    ).expect(201);
    expect((replay.body as { id: string }).id).toBe(
      (first.body as { id: string }).id,
    );
    const conflict = await recommend(
      id,
      {
        version,
        idempotencyKey,
        eligibilityOutcome: 'NOT_ELIGIBLE',
        recommendation: 'UNFAVOURABLE',
        rationale: 'Changed mind.',
      },
      officer,
    ).expect(409);
    expect((conflict.body as { code: string }).code).toBe(
      'IDEMPOTENCY_CONFLICT',
    );
  });
});
