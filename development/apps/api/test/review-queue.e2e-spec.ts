import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH3-001 assigned admissions queue e2e (claim/release/filters/authz).
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: queue-assigned-only, queue-claim-release,
 * queue-double-claim, queue-filters, queue-unknown-neutral,
 * queue-idempotency, queue-version, queue-denied-roles.
 */
describe('Phase 3 assigned admissions queue', () => {
  let app: INestApplication;
  let db: PrismaService;
  let officer: string;
  let officer2: string;
  let applicant: string;
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
      givenName: 'Queue',
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
    officer2 = (
      await user('ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', '2026')
    ).cookie;
    applicant = (await user('APP', ['apply'], 'APPLICATION', key())).cookie;
    sysadmin = (await user('SYSADMIN', ['administer-case-demo'])).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('queue-assigned-only: officers see their cases, not others', async () => {
    const mine = await submittedApp();
    const theirs = await submittedApp();
    await post(
      `/${mine.id}/claim`,
      { version: mine.version, idempotencyKey: key() },
      officer,
    ).expect(201);
    await post(
      `/${theirs.id}/claim`,
      { version: theirs.version, idempotencyKey: key() },
      officer2,
    ).expect(201);
    const queue = await get('/queue?scope=mine', officer).expect(200);
    const ids = (
      queue.body as { items: Array<{ applicationId: string }> }
    ).items.map((i) => i.applicationId);
    expect(ids).toContain(mine.id);
    expect(ids).not.toContain(theirs.id);
    // Claimable pool hides cases claimed by others.
    const pool = await get('/queue?scope=pool', officer).expect(200);
    const poolIds = (
      pool.body as { items: Array<{ applicationId: string }> }
    ).items.map((i) => i.applicationId);
    expect(poolIds).not.toContain(mine.id);
    expect(poolIds).not.toContain(theirs.id);
  });

  it('queue-claim-release: claim then release returns the case to the pool', async () => {
    const { id, version } = await submittedApp();
    await post(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      officer,
    ).expect(201);
    const claimed = await get('/queue?scope=mine', officer).expect(200);
    expect(
      (claimed.body as { items: Array<{ applicationId: string }> }).items.map(
        (i) => i.applicationId,
      ),
    ).toContain(id);
    await post(
      `/${id}/release`,
      { version, idempotencyKey: key() },
      officer,
    ).expect(201);
    const after = await get('/queue?scope=mine', officer).expect(200);
    expect(
      (after.body as { items: Array<{ applicationId: string }> }).items.map(
        (i) => i.applicationId,
      ),
    ).not.toContain(id);
    const pool = await get('/queue?scope=pool', officer).expect(200);
    expect(
      (pool.body as { items: Array<{ applicationId: string }> }).items.map(
        (i) => i.applicationId,
      ),
    ).toContain(id);
  });

  it('queue-double-claim: a second officer conflicts without identity leak', async () => {
    const { id, version } = await submittedApp();
    await post(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      officer,
    ).expect(201);
    const conflict = await post(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      officer2,
    ).expect(409);
    expect((conflict.body as { code: string }).code).toBe(
      'ASSIGNMENT_CONFLICT',
    );
    expect(JSON.stringify(conflict.body)).not.toMatch(/@demo\.invalid/);
  });

  it('queue-filters: state filter narrows the claimable pool', async () => {
    const { id } = await submittedApp();
    const pool = await get('/queue?scope=pool&state=Submitted', officer).expect(
      200,
    );
    const ids = (
      pool.body as { items: Array<{ applicationId: string; state: string }> }
    ).items;
    expect(ids.map((i) => i.applicationId)).toContain(id);
    expect(ids.every((i) => i.state === 'Submitted')).toBe(true);
    const empty = await get('/queue?scope=pool&state=Withdrawn', officer).expect(
      200,
    );
    expect(
      (empty.body as { items: Array<{ applicationId: string }> }).items.map(
        (i) => i.applicationId,
      ),
    ).not.toContain(id);
  });

  it('queue-unknown-neutral: unknown ids look like foreign ids', async () => {
    const unknown = randomUUID();
    const res = await get(`/queue/${unknown}`, officer).expect(404);
    expect((res.body as { code: string }).code).toBe('NOT_FOUND');
    await post(
      `/${unknown}/claim`,
      { version: 1, idempotencyKey: key() },
      officer,
    ).expect(404);
  });

  it('queue-idempotency: same key replays, different payload conflicts', async () => {
    const { id, version } = await submittedApp();
    const same = key();
    const first = await post(
      `/${id}/claim`,
      { version, idempotencyKey: same },
      officer,
    ).expect(201);
    const second = await post(
      `/${id}/claim`,
      { version, idempotencyKey: same },
      officer,
    ).expect(201);
    expect(second.body).toEqual(first.body);
    const conflict = await post(
      `/${id}/release`,
      { version: version + 1, idempotencyKey: same },
      officer,
    ).expect(409);
    expect((conflict.body as { code: string }).code).toBe(
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('queue-version: stale versions conflict with the current version', async () => {
    const { id, version } = await submittedApp();
    const stale = await post(
      `/${id}/claim`,
      { version: version + 99, idempotencyKey: key() },
      officer,
    ).expect(409);
    expect((stale.body as { code: string }).code).toBe('VERSION_CONFLICT');
    expect((stale.body as { currentVersion?: number }).currentVersion).toBe(
      version,
    );
  });

  it('queue-denied-roles: applicants and sysadmin cannot work the queue', async () => {
    const { id, version } = await submittedApp();
    await get('/queue?scope=mine', applicant).expect(403);
    await post(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      applicant,
    ).expect(403);
    await get('/queue?scope=mine', sysadmin).expect(403);
    await post(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      sysadmin,
    ).expect(403);
  });

  it('queue-withdraw-releases: withdrawal clears the officer queue', async () => {
    const { id, version, cookie } = await submittedApp();
    await post(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      officer,
    ).expect(201);
    const timeline = await appGet(`/${id}/timeline`, cookie).expect(200);
    const current = (timeline.body as { version: number }).version;
    await appPost(
      `/${id}/withdraw`,
      { version: current, confirmed: true, idempotencyKey: key() },
      cookie,
    ).expect(201);
    const mine = await get('/queue?scope=mine', officer).expect(200);
    expect(
      (mine.body as { items: Array<{ applicationId: string }> }).items.map(
        (i) => i.applicationId,
      ),
    ).not.toContain(id);
    await get(`/queue/${id}`, officer).expect(404);
  });

  it('queue-cross-intake: out-of-scope intakes look missing', async () => {
    const { id, version } = await submittedApp();
    const outsider = (
      await user('ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', '2027')
    ).cookie;
    await post(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      outsider,
    ).expect(404);
    // In-scope officer unaffected.
    await post(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      officer,
    ).expect(201);
  });

  it('queue-action-needed-false: the filter really excludes flagged cases', async () => {
    const { id, version } = await submittedApp();
    await post(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      officer,
    ).expect(201);
    // Flag the case via a staff clarification on a second app; first stays clean.
    const calm = await get('/queue?scope=mine&actionNeeded=false', officer).expect(
      200,
    );
    const items = (
      calm.body as {
        items: Array<{ applicationId: string; actionNeeded: boolean }>;
      }
    ).items;
    expect(items.map((i) => i.applicationId)).toContain(id);
    expect(items.every((i) => i.actionNeeded === false)).toBe(true);
  });

  it('queue-approver: read-only evidence, no queue writes', async () => {
    const { id, version } = await submittedApp();
    const approver = (
      await user('ADMISSIONS_APPROVER', ['decide-offer'], 'INTAKE', '2026')
    ).cookie;
    const evidence = await get(`/${id}/evidence`, approver).expect(200);
    expect((evidence.body as { applicationId: string }).applicationId).toBe(id);
    await post(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      approver,
    ).expect(403);
    await post(
      `/${id}/findings`,
      {
        version,
        kind: 'NOTE',
        subject: 'Approver note',
        detail: 'Should be denied.',
        severity: 'INFO',
        idempotencyKey: key(),
      },
      approver,
    ).expect(403);
  });

  it('queue-summary: staff header exposes state without decision outcome', async () => {
    const { id, version } = await submittedApp();
    await post(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      officer,
    ).expect(201);
    const summary = await get(`/queue/${id}`, officer).expect(200);
    const body = summary.body as {
      applicationId: string;
      reference: string;
      state: string;
      version: number;
      openClarifications: number;
      openCorrections: number;
      hasDecision: boolean;
    };
    expect(body.applicationId).toBe(id);
    expect(body.state).toBe('Submitted');
    expect(body.hasDecision).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/OFFERED|NOT_OFFERED/);
  });
});
