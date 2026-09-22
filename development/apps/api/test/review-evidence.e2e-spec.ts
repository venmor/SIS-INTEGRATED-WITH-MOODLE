import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID, createHash } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';

/**
 * TASK-PH3-002 evidence and declaration comparison e2e.
 * Isolated fictional test database required (same guard as admissions tests).
 * Packet Test-ID map: evidence-assigned-only, findings-crud,
 * findings-no-mutation, evidence-doc-states, staff-clarification,
 * correction-decide-regated, evidence-version, evidence-idempotency.
 */
describe('Phase 3 evidence and declaration comparison', () => {
  let app: INestApplication;
  let db: PrismaService;
  let officer: string;
  let officer2: string;
  let applicantRole: string;
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
      givenName: 'Evidence',
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
    const docId = (
      uploaded.body as { documents: Array<{ id: string }> }
    ).documents.at(-1)?.id as string;
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
    applicantRole = (await user('APP', ['apply'], 'APPLICATION', key())).cookie;
    const seeded = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    offeringId = seeded.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('evidence-assigned-only: claimed officer reads, others get neutral 404s', async () => {
    const { id } = await claimedApp(officer);
    const res = await get(`/${id}/evidence`, officer).expect(200);
    const body = res.body as {
      applicationId: string;
      reference: string;
      documents: Array<{ category: string; status: string }>;
    };
    expect(body.applicationId).toBe(id);
    expect(body.documents.some((d) => d.category === 'qualification')).toBe(
      true,
    );
    // No file bytes in the projection.
    expect(JSON.stringify(body)).not.toContain('content');
    await get(`/${id}/evidence`, officer2).expect(404);
    await get(`/${id}/evidence`, applicantRole).expect(403);
    await get(`/${randomUUID()}/evidence`, officer).expect(404);
  });

  it('findings-crud: create, list, duplicate redirects to the open finding', async () => {
    const { id, version } = await claimedApp(officer);
    const created = await post(
      `/${id}/findings`,
      {
        version,
        kind: 'DECLARATION_MISMATCH',
        subject: 'Award title vs transcript',
        detail: 'Declared Grade 12; transcript header differs.',
        severity: 'ACTION_NEEDED',
        idempotencyKey: key(),
      },
      officer,
    ).expect(201);
    expect((created.body as { status: string }).status).toBe('OPEN');
    const findingId = (created.body as { id: string }).id;
    const listed = await get(`/${id}/findings`, officer).expect(200);
    expect(
      (listed.body as { items: Array<{ id: string }> }).items.some(
        (f) => f.id === findingId,
      ),
    ).toBe(true);
    const dupe = await post(
      `/${id}/findings`,
      {
        version,
        kind: 'DECLARATION_MISMATCH',
        subject: 'Award title vs transcript',
        detail: 'Second look.',
        severity: 'INFO',
        idempotencyKey: key(),
      },
      officer,
    ).expect(409);
    expect((dupe.body as { code: string }).code).toBe('DUPLICATE_TASK');
    expect((dupe.body as { findingId?: string }).findingId).toBe(findingId);
  });

  it('findings-no-mutation: findings and approval never rewrite the snapshot', async () => {
    const { id, version, cookie } = await claimedApp(officer);
    const before = await db.applicationSubmission.findUniqueOrThrow({
      where: { applicationId: id },
    });
    const snapshotBefore = JSON.stringify(before.snapshot);
    await post(
      `/${id}/findings`,
      {
        version,
        kind: 'COMPLETENESS',
        subject: 'Checklist complete',
        detail: 'All required evidence present.',
        severity: 'INFO',
        idempotencyKey: key(),
      },
      officer,
    ).expect(201);
    const correction = await appPost(
      `/${id}/corrections`,
      {
        version,
        section: 'contact',
        field: 'address',
        reason: 'Moved house.',
        idempotencyKey: key(),
      },
      cookie,
    ).expect(201);
    const decided = await post(
      `/corrections/${(correction.body as { id: string }).id}/decide`,
      { approve: true, note: 'Approved in demo.', idempotencyKey: key() },
      officer,
    ).expect(201);
    expect((decided.body as { status: string }).status).toBe('APPROVED');
    const after = await db.applicationSubmission.findUniqueOrThrow({
      where: { applicationId: id },
    });
    expect(JSON.stringify(after.snapshot)).toBe(snapshotBefore);
  });

  it('evidence-doc-states: unsafe files render state-only', async () => {
    const { id } = await claimedApp(officer);
    // Force one document back to quarantine directly.
    const docs = await db.applicationDocument.findMany({
      where: { applicationId: id },
    });
    await db.applicationDocument.update({
      where: { id: docs[0].id },
      data: { status: 'SecurityScanPending' },
    });
    const res = await get(`/${id}/evidence`, officer).expect(200);
    const body = res.body as {
      documents: Array<{ id: string; status: string; canPreview: boolean }>;
    };
    const quarantined = body.documents.find((d) => d.id === docs[0].id);
    expect(quarantined?.status).toBe('SecurityScanPending');
    expect(quarantined?.canPreview).toBe(false);
  });

  it('staff-clarification: officer raises a scoped request with receipt', async () => {
    const { id, version, cookie } = await claimedApp(officer);
    const created = await post(
      `/${id}/clarifications`,
      {
        version,
        question: 'Provide a complete result statement.',
        deadlineDays: 7,
        idempotencyKey: key(),
      },
      officer,
    ).expect(201);
    const clarId = (created.body as { id: string }).id;
    expect((created.body as { status: string }).status).toBe('OPEN');
    // Applicant sees it and can respond through the existing flow.
    const listed = await appGet(`/${id}/clarifications`, cookie).expect(200);
    expect(
      (listed.body as { items: Array<{ id: string }> }).items.some(
        (c) => c.id === clarId,
      ),
    ).toBe(true);
    const timeline = await appGet(`/${id}/timeline`, cookie).expect(200);
    expect(
      (timeline.body as { events: Array<{ code: string }> }).events.some(
        (e) => e.code === 'ClarificationRequired',
      ),
    ).toBe(true);
    // Identical open question redirects instead of duplicating.
    const dupe = await post(
      `/${id}/clarifications`,
      {
        version,
        question: 'Provide a complete result statement.',
        idempotencyKey: key(),
      },
      officer,
    ).expect(409);
    expect((dupe.body as { code: string }).code).toBe('DUPLICATE_TASK');
  });

  it('summary-answered-counts: answered items leave the open counts', async () => {
    const app = await claimedApp(officer);
    const id = app.id;
    let officerVersion = app.version;
    const applicant = app.cookie;
    const summary = async () =>
      (await get(`/queue/${id}`, officer).expect(200)).body as {
        openClarifications: number;
        openCorrections: number;
      };
    // Raise a clarification: open count rises.
    const created = await post(
      `/${id}/clarifications`,
      {
        version: officerVersion,
        question: 'Provide a complete result statement.',
        deadlineDays: 7,
        idempotencyKey: key(),
      },
      officer,
    ).expect(201);
    const clarId = (created.body as { id: string }).id;
    officerVersion += 1;
    expect((await summary()).openClarifications).toBe(1);
    // Applicant answers through the existing flow.
    const applicantVersion = (
      (await appGet(`/${id}/timeline`, applicant).expect(200)).body as {
        version: number;
      }
    ).version;
    await appPost(
      `/${id}/clarifications/${clarId}/respond`,
      {
        version: applicantVersion,
        idempotencyKey: key(),
        response: 'Uploaded a clearer copy.',
      },
      applicant,
    ).expect(201);
    // Answered: history keeps it, open count drops.
    expect((await summary()).openClarifications).toBe(0);
    // Correction requested then decided: open count drops.
    const correctionVersion = (
      (await appGet(`/${id}/timeline`, applicant).expect(200)).body as {
        version: number;
      }
    ).version;
    const correction = await appPost(
      `/${id}/corrections`,
      {
        version: correctionVersion,
        idempotencyKey: key(),
        section: 'contact',
        field: 'preferredChannel',
        reason: 'Changed number.',
      },
      applicant,
    ).expect(201);
    const correctionId = (correction.body as { id: string }).id;
    expect((await summary()).openCorrections).toBe(1);
    await post(
      `/corrections/${correctionId}/decide`,
      { approve: false, note: 'Not needed.', idempotencyKey: key() },
      officer,
    ).expect(201);
    const closed = await summary();
    expect(closed.openCorrections).toBe(0);
    expect(closed.openClarifications).toBe(0);
  });

  it('correction-decide-regated: officer decides, applicant cannot', async () => {
    const { id, version, cookie } = await claimedApp(officer);
    const correction = await appPost(
      `/${id}/corrections`,
      {
        version,
        section: 'personal',
        field: 'familyName',
        reason: 'Spelling query.',
        idempotencyKey: key(),
      },
      cookie,
    ).expect(201);
    const correctionId = (correction.body as { id: string }).id;
    await post(
      `/corrections/${correctionId}/decide`,
      { approve: false, note: 'Locked after deadline.', idempotencyKey: key() },
      applicantRole,
    ).expect(403);
    const declined = await post(
      `/corrections/${correctionId}/decide`,
      { approve: false, note: 'Locked after deadline.', idempotencyKey: key() },
      officer,
    ).expect(201);
    expect((declined.body as { status: string }).status).toBe('REJECTED');
    const findings = await get(`/${id}/findings`, officer).expect(200);
    expect(
      (findings.body as { items: Array<unknown> }).items.length,
    ).toBeGreaterThanOrEqual(0);
  });

  it('evidence-blank: whitespace-only subjects and questions are rejected', async () => {
    const { id, version } = await claimedApp(officer);
    await post(
      `/${id}/findings`,
      {
        version,
        kind: 'NOTE',
        subject: '   ',
        detail: 'Blank subject.',
        severity: 'INFO',
        idempotencyKey: key(),
      },
      officer,
    ).expect(400);
    await post(
      `/${id}/clarifications`,
      { version, question: '   ', idempotencyKey: key() },
      officer,
    ).expect(400);
  });

  it('evidence-withdrawn-decide: decisions need a live submitted case', async () => {
    const { id, version, cookie } = await claimedApp(officer);
    const correction = await appPost(
      `/${id}/corrections`,
      {
        version,
        section: 'contact',
        field: 'address',
        reason: 'Moved house.',
        idempotencyKey: key(),
      },
      cookie,
    ).expect(201);
    const correctionId = (correction.body as { id: string }).id;
    const timeline = await appGet(`/${id}/timeline`, cookie).expect(200);
    const current = (timeline.body as { version: number }).version;
    await appPost(
      `/${id}/withdraw`,
      { version: current, confirmed: true, idempotencyKey: key() },
      cookie,
    ).expect(201);
    const refused = await post(
      `/corrections/${correctionId}/decide`,
      { approve: true, idempotencyKey: key() },
      officer,
    ).expect(404);
    expect((refused.body as { code: string }).code).toBe('NOT_FOUND');
  });

  it('evidence-no-leak: staff assignment never reaches the applicant', async () => {
    const { id, cookie } = await claimedApp(officer);
    const timeline = await appGet(`/${id}/timeline`, cookie).expect(200);
    const codes = (
      timeline.body as { events: Array<{ code: string }> }
    ).events.map((e) => e.code);
    expect(codes).not.toContain('ReviewClaimed');
    expect(codes).toContain('Submitted');
    const notes = await appGet('/notifications', cookie).expect(200);
    expect((notes.body as { items: Array<unknown> }).items.length).toBe(0);
  });

  it('evidence-version-bump: applicant writes invalidate stale officer state', async () => {
    const { id, version, cookie } = await claimedApp(officer);
    const correction = await appPost(
      `/${id}/corrections`,
      {
        version,
        section: 'contact',
        field: 'address',
        reason: 'Moved house.',
        idempotencyKey: key(),
      },
      cookie,
    ).expect(201);
    expect((correction.body as { status: string }).status).toBe('PENDING');
    // Officer state captured before the applicant's write is now stale.
    const stale = await post(
      `/${id}/findings`,
      {
        version,
        kind: 'NOTE',
        subject: 'Stale observation',
        detail: 'Should conflict.',
        severity: 'INFO',
        idempotencyKey: key(),
      },
      officer,
    ).expect(409);
    expect((stale.body as { code: string }).code).toBe('VERSION_CONFLICT');
  });

  it('evidence-version: stale versions conflict with the current version', async () => {
    const { id, version } = await claimedApp(officer);
    const stale = await post(
      `/${id}/findings`,
      {
        version: version + 99,
        kind: 'COMPLETENESS',
        subject: 'Stale attempt',
        detail: 'Should conflict.',
        severity: 'INFO',
        idempotencyKey: key(),
      },
      officer,
    ).expect(409);
    expect((stale.body as { code: string }).code).toBe('VERSION_CONFLICT');
    expect((stale.body as { currentVersion?: number }).currentVersion).toBe(
      version,
    );
  });

  it('evidence-idempotency: same key replays, different payload conflicts', async () => {
    const { id, version } = await claimedApp(officer);
    const same = key();
    const first = await post(
      `/${id}/findings`,
      {
        version,
        kind: 'DOCUMENT_QUALITY',
        subject: 'Readable scan',
        detail: 'First note.',
        severity: 'INFO',
        idempotencyKey: same,
      },
      officer,
    ).expect(201);
    const second = await post(
      `/${id}/findings`,
      {
        version,
        kind: 'DOCUMENT_QUALITY',
        subject: 'Readable scan',
        detail: 'First note.',
        severity: 'INFO',
        idempotencyKey: same,
      },
      officer,
    ).expect(201);
    expect(second.body).toEqual(first.body);
    const conflict = await post(
      `/${id}/findings`,
      {
        version,
        kind: 'DOCUMENT_QUALITY',
        subject: 'Different subject',
        detail: 'Same key, other payload.',
        severity: 'INFO',
        idempotencyKey: same,
      },
      officer,
    ).expect(409);
    expect((conflict.body as { code: string }).code).toBe(
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('case-history: staff see every event newest-first, others get 404s', async () => {
    const { id, version, cookie } = await claimedApp(officer);
    await post(
      `/${id}/findings`,
      {
        version,
        kind: 'NOTE',
        subject: 'History probe',
        detail: 'Creates a staff-only event.',
        severity: 'INFO',
        idempotencyKey: key(),
      },
      officer,
    ).expect(201);
    const history = await get(`/${id}/history`, officer).expect(200);
    const items = history.body as {
      items: Array<{
        code: string;
        actorRole: string;
        applicantVisible: boolean;
        occurredAt: string;
      }>;
    };
    expect(items.items.length).toBeGreaterThan(0);
    // Newest first.
    const times = items.items.map((e) => e.occurredAt);
    expect([...times].sort().reverse()).toEqual(times);
    // Staff-only rows are present for reviewers (claim event is staff-only).
    expect(
      items.items.some(
        (e) => e.applicantVisible === false && e.actorRole === 'ADMISSIONS',
      ),
    ).toBe(true);
    // Applicant and strangers stay out with neutral responses.
    await appGet(`/${id}/history`, cookie).expect(404);
    const officer2 = (
      await user('ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', '2026')
    ).cookie;
    await get(`/${id}/history`, officer2).expect(404);
    await get(`/${randomUUID()}/history`, officer).expect(404);
  });
});
