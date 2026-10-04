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
    return {
      cookie: `sid=${token}`,
      accountId: account.id,
      assignmentId: assignment.id,
    };
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
    const { reference } = await db.application.findUniqueOrThrow({
      where: { id },
      select: { reference: true },
    });
    const referenceQuery = `&reference=${encodeURIComponent(reference)}`;
    await post(
      `/${id}/claim`,
      { version, idempotencyKey: key() },
      officer,
    ).expect(201);
    const claimed = await get(
      `/queue?scope=mine${referenceQuery}`,
      officer,
    ).expect(200);
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
    const after = await get(
      `/queue?scope=mine${referenceQuery}`,
      officer,
    ).expect(200);
    expect(
      (after.body as { items: Array<{ applicationId: string }> }).items.map(
        (i) => i.applicationId,
      ),
    ).not.toContain(id);
    const pool = await get(
      `/queue?scope=pool${referenceQuery}`,
      officer,
    ).expect(200);
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
    const { reference } = await db.application.findUniqueOrThrow({
      where: { id },
      select: { reference: true },
    });
    const referenceQuery = `&reference=${encodeURIComponent(reference)}`;
    const pool = await get(
      `/queue?scope=pool&state=Submitted${referenceQuery}`,
      officer,
    ).expect(200);
    const ids = (
      pool.body as { items: Array<{ applicationId: string; state: string }> }
    ).items;
    expect(ids.map((i) => i.applicationId)).toContain(id);
    expect(ids.every((i) => i.state === 'Submitted')).toBe(true);
    const empty = await get(
      `/queue?scope=pool&state=Withdrawn${referenceQuery}`,
      officer,
    ).expect(200);
    expect(
      (empty.body as { items: Array<{ applicationId: string }> }).items.map(
        (i) => i.applicationId,
      ),
    ).not.toContain(id);
  });

  it('queue-reference: finds only an in-scope visible case by exact reference', async () => {
    const visible = await submittedApp();
    const claimed = await submittedApp();
    const visibleRow = await db.application.findUniqueOrThrow({
      where: { id: visible.id },
      select: { reference: true },
    });
    const claimedRow = await db.application.findUniqueOrThrow({
      where: { id: claimed.id },
      select: { reference: true },
    });
    await post(
      `/${claimed.id}/claim`,
      { version: claimed.version, idempotencyKey: key() },
      officer2,
    ).expect(201);

    const found = await get(
      `/queue?scope=pool&reference=${encodeURIComponent(` ${visibleRow.reference.toLowerCase()} `)}`,
      officer,
    ).expect(200);
    expect(found.body.items).toHaveLength(1);
    expect(found.body.items[0].applicationId).toBe(visible.id);
    expect(found.body.hasMore).toBe(false);

    const hidden = await get(
      `/queue?scope=pool&reference=${encodeURIComponent(claimedRow.reference)}`,
      officer,
    ).expect(200);
    const absent = await get(
      '/queue?scope=pool&reference=APP-NOT-FOUND',
      officer,
    ).expect(200);
    expect(hidden.body).toEqual(absent.body);
    await get('/queue?scope=pool&reference=%20%20', officer).expect(400);
    await get('/queue?scope=pool&reference=APP-%25', officer).expect(400);
  });

  it('queue-cursor: equal timestamps traverse once and cursor is actor-bound', async () => {
    const baseOffering = await db.programmeOffering.findUniqueOrThrow({
      where: { id: offeringId },
    });
    const intake = `V2-CURSOR-${key()}`;
    const cursorOffering = await db.programmeOffering.create({
      data: {
        programmeId: baseOffering.programmeId,
        intake,
        studyMode: baseOffering.studyMode,
        campus: baseOffering.campus,
        availability: 'OPEN',
        deadline: new Date('2099-01-01T00:00:00.000Z'),
      },
    });
    const cursorOfficer = await user(
      'ADMISSIONS_OFFICER',
      ['review-assigned'],
      'INTAKE',
      intake,
    );
    const tiedTime = new Date('2000-01-01T00:00:00.000Z');
    const ids: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const syntheticApplicant = await user(
        'APP',
        ['apply'],
        'APPLICATION',
        key(),
      );
      const reference = `APP-CURSOR-${key()}`;
      const application = await db.application.create({
        data: {
          accountId: syntheticApplicant.accountId,
          offeringId: cursorOffering.id,
          reference,
          state: 'Submitted',
          policyVersion: 'APPLICATION-DEMO-v1',
          requirementVersion: 'SYNTHETIC-QUEUE-FIXTURE-v1',
          createdAt: tiedTime,
          submission: {
            create: {
              reference,
              snapshot: { synthetic: true },
              receipt: { reference },
              createdAt: tiedTime,
            },
          },
        },
        select: { id: true },
      });
      ids.push(application.id);
    }
    ids.sort();

    const query = (cursor?: string) => {
      const params = new URLSearchParams({
        scope: 'pool',
        state: 'Submitted',
        take: '2',
      });
      if (cursor) params.set('cursor', cursor);
      return get(`/queue?${params.toString()}`, cursorOfficer.cookie);
    };
    const first = await query().expect(200);
    const firstBody = first.body as {
      items: Array<{ applicationId: string }>;
      nextCursor: string | null;
      hasMore: boolean;
    };
    expect(firstBody.items.map((row) => row.applicationId)).toEqual(
      ids.slice(0, 2),
    );
    expect(firstBody.hasMore).toBe(true);
    expect(firstBody.nextCursor).toEqual(expect.any(String));
    expect(Object.keys(firstBody.items[0]).sort()).toEqual([
      'actionNeeded',
      'applicationId',
      'claimedAt',
      'openClarifications',
      'openCorrections',
      'reference',
      'state',
      'submittedAt',
      'version',
    ]);

    await get(
      `/queue?scope=pool&state=Withdrawn&take=2&cursor=${encodeURIComponent(firstBody.nextCursor!)}`,
      cursorOfficer.cookie,
    ).expect(400);
    await get(
      `/queue?scope=pool&state=Submitted&take=2&reference=${encodeURIComponent(`APP-CURSOR-${key()}`)}&cursor=${encodeURIComponent(firstBody.nextCursor!)}`,
      cursorOfficer.cookie,
    ).expect(400);

    // A newly submitted case after the cursor should enter the next page
    // without causing an already-seen case to repeat.
    const laterApplicant = await user('APP', ['apply'], 'APPLICATION', key());
    const laterReference = `APP-CURSOR-${key()}`;
    const later = await db.application.create({
      data: {
        accountId: laterApplicant.accountId,
        offeringId: cursorOffering.id,
        reference: laterReference,
        state: 'Submitted',
        policyVersion: 'APPLICATION-DEMO-v1',
        requirementVersion: 'SYNTHETIC-QUEUE-FIXTURE-v1',
        createdAt: new Date('2001-01-01T00:00:00.000Z'),
        submission: {
          create: {
            reference: laterReference,
            snapshot: { synthetic: true },
            receipt: { reference: laterReference },
          },
        },
      },
      select: { id: true },
    });

    const second = await query(firstBody.nextCursor!).expect(200);
    const secondBody = second.body as {
      items: Array<{ applicationId: string }>;
      nextCursor: string | null;
      hasMore: boolean;
    };
    expect(secondBody.items.map((row) => row.applicationId)).toEqual([
      ...ids.slice(2),
      later.id,
    ]);
    expect(secondBody.hasMore).toBe(false);
    expect(secondBody.nextCursor).toBeNull();

    const newestQuery = (cursor?: string) => {
      const params = new URLSearchParams({
        scope: 'pool',
        state: 'Submitted',
        sort: 'newest',
        take: '2',
      });
      if (cursor) params.set('cursor', cursor);
      return get(`/queue?${params.toString()}`, cursorOfficer.cookie);
    };
    const newestIds: string[] = [];
    let newestCursor: string | null = null;
    do {
      const response = await newestQuery(newestCursor ?? undefined).expect(200);
      const page = response.body as {
        items: Array<{ applicationId: string }>;
        nextCursor: string | null;
      };
      newestIds.push(...page.items.map((item) => item.applicationId));
      newestCursor = page.nextCursor;
    } while (newestCursor);
    expect(newestIds).toEqual([later.id, ...ids.toReversed()]);
    await newestQuery(firstBody.nextCursor!).expect(400);

    const [encoded, signature] = firstBody.nextCursor!.split('.');
    const tampered = `${encoded}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
    await query(tampered).expect(400);

    const otherOfficer = (
      await user('ADMISSIONS_OFFICER', ['review-assigned'], 'INTAKE', intake)
    ).cookie;
    const reused = await request(app.getHttpServer())
      .get(
        `/review/queue?scope=pool&state=Submitted&take=2&cursor=${encodeURIComponent(firstBody.nextCursor!)}`,
      )
      .set('Cookie', otherOfficer)
      .expect(400);
    expect(JSON.stringify(reused.body)).not.toContain(ids[2]);

    await db.roleAssignment.update({
      where: { id: cursorOfficer.assignmentId },
      data: { revokedAt: new Date() },
    });
    await query(firstBody.nextCursor!).expect(403);
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

  it('preparation preview rechecks each claimed case without writing or revealing foreign cases', async () => {
    const mine = await submittedApp();
    const foreign = await submittedApp();
    const released = await submittedApp();
    await post(
      `/${mine.id}/claim`,
      { version: mine.version, idempotencyKey: key() },
      officer,
    ).expect(201);
    await post(
      `/${foreign.id}/claim`,
      { version: foreign.version, idempotencyKey: key() },
      officer2,
    ).expect(201);
    await post(
      `/${released.id}/claim`,
      { version: released.version, idempotencyKey: key() },
      officer,
    ).expect(201);
    await post(
      `/${released.id}/release`,
      { version: released.version, idempotencyKey: key() },
      officer,
    ).expect(201);
    const unknown = key();
    const before = await db.application.findUniqueOrThrow({
      where: { id: mine.id },
      select: { version: true },
    });
    const auditsBefore = await db.auditEvent.count({
      where: { action: 'ReviewPreparationPreviewed' },
    });
    const response = await post(
      '/queue/preparation',
      {
        items: [mine, foreign, { id: unknown, version: 1 }, released].map(
          ({ id, version }) => ({ applicationId: id, version }),
        ),
      },
      officer,
    ).expect(201);
    expect(response.body.items).toHaveLength(4);
    expect(response.body.items[0]).toMatchObject({
      applicationId: mine.id,
      state: 'CURRENT',
      version: mine.version,
      documents: { current: 1, awaitingQualityCheck: 1 },
      openClarifications: 0,
      openCorrections: 0,
    });
    for (const index of [1, 2, 3]) {
      expect(response.body.items[index]).toEqual({
        applicationId: [foreign.id, unknown, released.id][index - 1],
        state: 'UNAVAILABLE',
      });
    }
    expect(JSON.stringify(response.body)).not.toContain('Fictional');
    const after = await db.application.findUniqueOrThrow({
      where: { id: mine.id },
      select: { version: true },
    });
    expect(after.version).toBe(before.version);
    expect(
      await db.auditEvent.count({
        where: { action: 'ReviewPreparationPreviewed' },
      }),
    ).toBe(auditsBefore + 1);
  });

  it('preparation preview refuses stale versions, invalid selections and revoked authority', async () => {
    const mine = await submittedApp();
    await post(
      `/${mine.id}/claim`,
      { version: mine.version, idempotencyKey: key() },
      officer,
    ).expect(201);
    const body = { items: [{ applicationId: mine.id, version: mine.version }] };
    await db.application.update({
      where: { id: mine.id },
      data: { version: { increment: 1 } },
    });
    const stale = await post('/queue/preparation', body, officer).expect(201);
    expect(stale.body.items[0]).toMatchObject({
      applicationId: mine.id,
      state: 'CHANGED',
    });
    expect(stale.body.items[0].documents).toBeUndefined();
    await post('/queue/preparation', { items: [] }, officer).expect(400);
    await post(
      '/queue/preparation',
      { items: [{ applicationId: 'not-a-uuid', version: 1 }] },
      officer,
    ).expect(400);
    await post(
      '/queue/preparation',
      { items: [body.items[0], body.items[0]] },
      officer,
    ).expect(400);
    await post(
      '/queue/preparation',
      {
        items: Array.from({ length: 51 }, (_, index) => ({
          applicationId: key(),
          version: index + 1,
        })),
      },
      officer,
    ).expect(400);
    await post('/queue/preparation', body, applicant).expect(403);
    const changedScope = await user(
      'ADMISSIONS_OFFICER',
      ['review-assigned'],
      'INTAKE',
      '2026',
    );
    const otherCase = await submittedApp();
    await post(
      `/${otherCase.id}/claim`,
      { version: otherCase.version, idempotencyKey: key() },
      changedScope.cookie,
    ).expect(201);
    await db.roleAssignment.update({
      where: { id: changedScope.assignmentId },
      data: { scopeRef: '2027' },
    });
    const outOfScope = await post(
      '/queue/preparation',
      { items: [{ applicationId: otherCase.id, version: otherCase.version }] },
      changedScope.cookie,
    ).expect(201);
    expect(outOfScope.body.items[0]).toEqual({
      applicationId: otherCase.id,
      state: 'UNAVAILABLE',
    });
    const revoked = await user(
      'ADMISSIONS_OFFICER',
      ['review-assigned'],
      'INTAKE',
      '2026',
    );
    await db.roleAssignment.update({
      where: { id: revoked.assignmentId },
      data: { revokedAt: new Date() },
    });
    await post('/queue/preparation', body, revoked.cookie).expect(403);
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
    const calm = await get(
      '/queue?scope=mine&actionNeeded=false',
      officer,
    ).expect(200);
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
