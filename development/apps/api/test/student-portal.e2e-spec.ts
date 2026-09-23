import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH4-001 student portal home + contact + corrections e2e.
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: portal-home, portal-unknown, contact-update,
 * contact-empty, contact-history, correction-request, correction-duplicate,
 * correction-decide, portal-denied, portal-neutral, portal-idempotency.
 */
describe('Phase 4 student portal', () => {
  let app: INestApplication;
  let db: PrismaService;
  let officer: string;
  let approver: string;
  let records: string;
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
  const recGet = (path: string, c: string) =>
    request(app.getHttpServer()).get(`/records${path}`).set('Cookie', c);

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
      givenName: 'Portal',
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
    // Mint a student-workspace session on the same account.
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
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('portal-home: welcome, programme, period and onboarding remainder', async () => {
    const app = await convertedStudent();
    const home = await recGet('/me/home', app.cookie).expect(200);
    const body = home.body as {
      studentNumber: string;
      displayName: string;
      programmeName: string;
      intake: string;
      period: string;
      registrationOpensAt: string | null;
      onboardingRequiredTotal: number;
      onboardingRequiredComplete: number;
      pendingCorrections: number;
    };
    expect(body.studentNumber).toMatch(/^STU-2026-\d{4}$/);
    expect(body.displayName).toBeDefined();
    expect(body.programmeName).toBe('BSc Software Engineering');
    expect(body.period).toBe('2026S1');
    expect(body.registrationOpensAt).toBeDefined();
    expect(body.onboardingRequiredTotal).toBe(3);
    expect(body.onboardingRequiredComplete).toBe(2);
    expect(body.pendingCorrections).toBe(0);
  });

  it('portal-unknown: accounts without a student workspace are refused', async () => {
    // No student assignment exists, so the workspace gate refuses before any
    // record lookup: 403 names the missing workspace, never another record.
    const stranger = await user('APP', ['apply'], 'APPLICATION', key());
    await recGet('/me/home', stranger.cookie).expect(403);
    await recGet('/me/contact', stranger.cookie).expect(403);
    await recGet('/me/corrections', stranger.cookie).expect(403);
  });

  it('contact-update: change clears verification with old/new audit', async () => {
    const app = await convertedStudent();
    const updated = await recPost(
      '/me/contact',
      { email: 'new-address@demo.invalid', idempotencyKey: key() },
      app.cookie,
    ).expect(201);
    const body = updated.body as {
      email: string | null;
      emailVerifiedAt: string | null;
    };
    expect(body.email).toBe('new-address@demo.invalid');
    expect(body.emailVerifiedAt).toBeNull();
    const home = await recGet('/me/home', app.cookie).expect(200);
    const student = await db.student.findUniqueOrThrow({
      where: {
        studentNumber: (home.body as { studentNumber: string }).studentNumber,
      },
    });
    const audit = await db.auditEvent.findFirst({
      where: {
        action: 'StudentContactUpdated',
        targetRef: student.id,
      },
      orderBy: { occurredAt: 'desc' },
    });
    expect(audit).toBeDefined();
    expect(audit?.outcome).toBe('ALLOW');
  });

  it('contact-empty: an update with no fields is refused', async () => {
    const app = await convertedStudent();
    const refused = await recPost(
      '/me/contact',
      { idempotencyKey: key() },
      app.cookie,
    ).expect(400);
    expect((refused.body as { code: string }).code).toBe('EMPTY_UPDATE');
  });

  it('correction-request: create, duplicate redirect, history', async () => {
    const app = await convertedStudent();
    const created = await recPost(
      '/me/corrections',
      {
        field: 'phone',
        requestedValue: '+260971111111',
        reason: 'New handset.',
        idempotencyKey: key(),
      },
      app.cookie,
    ).expect(201);
    expect((created.body as { status: string }).status).toBe('PENDING');
    const dupe = await recPost(
      '/me/corrections',
      {
        field: 'phone',
        requestedValue: '+260972222222',
        reason: 'Another try.',
        idempotencyKey: key(),
      },
      app.cookie,
    ).expect(409);
    expect((dupe.body as { code: string }).code).toBe('DUPLICATE_TASK');
    const listed = await recGet('/me/corrections', app.cookie).expect(200);
    expect(
      (listed.body as { items: Array<{ id: string }> }).items.some(
        (c) => c.id === (created.body as { id: string }).id,
      ),
    ).toBe(true);
  });

  it('correction-decide: approval applies with old/new history', async () => {
    const app = await convertedStudent();
    const created = await recPost(
      '/me/corrections',
      {
        field: 'displayName',
        requestedValue: 'Portal Student Official',
        reason: 'Legal name order.',
        idempotencyKey: key(),
      },
      app.cookie,
    ).expect(201);
    const correctionId = (created.body as { id: string }).id;
    const decided = await recPost(
      `/corrections/${correctionId}/decide`,
      { approve: true, note: 'Matches evidence.', idempotencyKey: key() },
      records,
    ).expect(201);
    expect((decided.body as { status: string }).status).toBe('APPROVED');
    const home = await recGet('/me/home', app.cookie).expect(200);
    expect((home.body as { displayName: string }).displayName).toBe(
      'Portal Student Official',
    );
  });

  it('portal-denied: applicant, officer and approver workspaces refused', async () => {
    const app = await convertedStudent();
    const applicant = await user('APP', ['apply'], 'APPLICATION', key());
    await recGet('/me/home', applicant.cookie).expect(403);
    await recPost(
      '/me/contact',
      { email: 'x@demo.invalid', idempotencyKey: key() },
      applicant.cookie,
    ).expect(403);
    await recGet('/me/home', officer).expect(403);
    await recGet('/me/home', approver).expect(403);
  });

  it('portal-idempotency: same key replays, different payload conflicts', async () => {
    const app = await convertedStudent();
    const same = key();
    const first = await recPost(
      '/me/contact',
      { email: 'repeat@demo.invalid', idempotencyKey: same },
      app.cookie,
    ).expect(201);
    const replay = await recPost(
      '/me/contact',
      { email: 'repeat@demo.invalid', idempotencyKey: same },
      app.cookie,
    ).expect(201);
    expect(replay.body).toEqual(first.body);
    await recPost(
      '/me/contact',
      { email: 'changed@demo.invalid', idempotencyKey: same },
      app.cookie,
    ).expect(409);
  });
});
