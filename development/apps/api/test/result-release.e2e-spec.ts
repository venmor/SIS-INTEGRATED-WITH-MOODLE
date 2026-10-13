import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { assessPost, assessGet, key } from './helpers/assessment.js';
import { publicationFixture, declaration } from './helpers/publication.js';
import { user } from './helpers/phase6.js';

// Policy and MFA ports are deliberately test-only. Actual defaults must deny.
// All domain transactions, authorization, roster checks and reads are real.
describe('official result publication', () => {
  let app: INestApplication;
  let db: PrismaService;
  let post: ReturnType<typeof assessPost>;
  let get: ReturnType<typeof assessGet>;
  const policies = new Map<string, object>();
  const proofHooks = new Map<string, () => Promise<void>>();
  beforeAll(async () => {
    if (!/(test|review|ci)/i.test(new URL(process.env.DATABASE_URL!).pathname))
      throw Error('isolated database required');
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider('RESULT_PUBLICATION_POLICY')
      .useValue({
        resolve: async (_db: unknown, offering: string) =>
          policies.get(offering) ?? null,
      })
      .overrideProvider('RESULT_STEP_UP')
      .useValue({
        consume: async (
          _db: unknown,
          context: { proof?: string; actor: { accountId: string } },
        ) => {
          await proofHooks.get(context.actor.accountId)?.();
          return context.proof === 'isolated-test-proof';
        },
      })
      .compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
    post = assessPost(app);
    get = assessGet(app);
  });
  afterAll(async () => {
    await app?.close();
  });
  async function setup(candidateCount = 1) {
    const f = await publicationFixture(app, db, candidateCount);
    policies.set(f.offeringRef, {
      version: 'TEST-PUBLICATION-v1',
      courseId: f.course.id,
      releaseAt: '2020-01-01T00:00:00Z',
      showMarks: true,
      reviewInstructions:
        'Contact the examinations office for the approved review route.',
      restrictionsSatisfied: true,
    });
    return { ...f, pkg: await f.packageAt() };
  }
  function release(
    f: Awaited<ReturnType<typeof setup>>,
    extra = {},
    cookie = f.publisher.cookie,
  ) {
    return post(
      `/packages/${f.pkg.id}/release`,
      {
        idempotencyKey: key(),
        version: f.pkg.version,
        declaration,
        proof: 'isolated-test-proof',
        ...extra,
      },
      cookie,
    );
  }
  it('atomically publishes a private immutable result and replays a lost response', async () => {
    const f = await setup();
    expect(
      (await get('/me/results', f.student.cookie).expect(200)).body.items,
    ).toHaveLength(0);
    const idempotencyKey = key();
    const receipt = await release(f, { idempotencyKey }).expect(201);
    expect((await release(f, { idempotencyKey }).expect(201)).body).toEqual(
      receipt.body,
    );
    const mine = await get('/me/results', f.student.cookie).expect(200);
    expect(mine.body.items).toHaveLength(1);
    expect(mine.body.items[0]).toMatchObject({
      mark: 70,
      outcome: 'PASS',
      version: 1,
    });
    expect(JSON.stringify(mine.body)).not.toMatch(
      /moderationRefs|preparedBy|packageHash|decisionReason/,
    );
    const stranger = await user(db, 'STUDENT', ['study']);
    expect(
      (await get('/me/results', stranger.cookie).expect(200)).body.items,
    ).toHaveLength(0);
    const events = await db.outboxEvent.findMany({
      where: { aggregateId: receipt.body.id },
    });
    expect(events).toHaveLength(1);
    expect(events[0].payload).not.toHaveProperty('mark');
    expect(events[0].payload).not.toHaveProperty('students');
    // Pending delivery is independent of the committed result. Actual provider
    // failure/retry needs the delivery adapter integration (separate gate).
    await db.outboxEvent.update({
      where: { id: events[0].id },
      data: { deliveredAt: null },
    });
    expect(
      (await get('/me/results', f.student.cookie).expect(200)).body.items[0]
        .mark,
    ).toBe(70);
    await expect(
      db.$executeRaw`UPDATE "OfficialResultVersion" SET mark = 1 WHERE "releaseId" = ${receipt.body.id}`,
    ).rejects.toThrow();
  });
  it('requires explicit publication authority and step-up proof', async () => {
    const f = await setup();
    await release(f, {}, f.examiner.cookie).expect(403);
    await release(f, {}, f.lecturer.cookie).expect(403);
    await release(f, { proof: 'wrong' }).expect(403);
    for (const role of ['SYSADMIN', 'MOODLE_ADMIN', 'TUT']) {
      const other = await user(
        db,
        role,
        ['release-results'],
        'PERIOD',
        f.periodCode,
      );
      await release(f, {}, other.cookie).expect(403);
    }
    expect(
      (await get('/me/results', f.student.cookie).expect(200)).body.items,
    ).toHaveLength(0);
  });
  it('refuses wrong periods, stale versions, unapproved policy and changed payload replay', async () => {
    const f = await setup();
    const wrong = await user(
      db,
      'EXAMINATIONS_OFFICER',
      ['release-results'],
      'PERIOD',
      'OTHER',
    );
    await release(f, {}, wrong.cookie).expect(404);
    await release(f, { version: 0 }).expect(400);
    await release(f, { version: f.pkg.version + 1 }).expect(409);
    policies.delete(f.offeringRef);
    await release(f).expect(409);
    policies.set(f.offeringRef, {
      version: 'TEST-v1',
      courseId: f.course.id,
      releaseAt: '2020-01-01T00:00:00Z',
      showMarks: true,
      reviewInstructions: 'Contact examinations.',
      restrictionsSatisfied: true,
    });
    const idempotencyKey = key();
    await release(f, { idempotencyKey }).expect(201);
    await release(f, { idempotencyKey, version: f.pkg.version + 1 }).expect(
      409,
    );
  });
  it('rechecks registered candidates and serializes concurrent release', async () => {
    const f = await setup();
    await db.courseRegistration.updateMany({
      where: { registrationId: f.registration.id },
      data: { status: 'DROPPED' },
    });
    await release(f).expect(409);
    await db.courseRegistration.updateMany({
      where: { registrationId: f.registration.id },
      data: { status: 'ENROLLED' },
    });
    const replies = await Promise.all([release(f), release(f)]);
    expect(replies.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    expect(
      (await get('/me/results', f.student.cookie).expect(200)).body.items,
    ).toHaveLength(1);
  });
  it('amends through a separate officer, preserving history and invalidating readiness', async () => {
    const f = await setup();
    const first = await release(f).expect(201);
    const replacement = await f.packageAt(80);
    const requested = await post(
      '/amendments',
      {
        idempotencyKey: key(),
        releaseId: first.body.id,
        packageId: replacement.id,
        reason: 'Verified clerical correction',
        evidenceRef: 'TEST-REVIEW-42',
      },
      f.examiner.cookie,
    ).expect(201);
    await post(
      `/amendments/${requested.body.id}/approve`,
      {
        idempotencyKey: key(),
        version: 1,
        declaration,
        proof: 'isolated-test-proof',
      },
      f.examiner.cookie,
    ).expect(403);
    await post(
      `/amendments/${requested.body.id}/approve`,
      {
        idempotencyKey: key(),
        version: 1,
        declaration,
        proof: 'isolated-test-proof',
      },
      f.publisher.cookie,
    ).expect(201);
    const mine = await get('/me/results', f.student.cookie).expect(200);
    expect(mine.body.items).toHaveLength(1);
    expect(mine.body.items[0]).toMatchObject({
      mark: 80,
      version: 2,
      progressionReadiness: 'REVIEW_REQUIRED',
    });
    expect(
      mine.body.items[0].history.map((v: { mark: number }) => v.mark),
    ).toEqual([80, 70]);
    expect(JSON.stringify(mine.body)).not.toContain('Verified clerical');
  });
  it('uses distinct officers for concurrent amendments and preserves one successor', async () => {
    const f = await setup();
    const first = await release(f).expect(201);
    const replacement = await f.packageAt(80);
    const requests = await Promise.all(
      [1, 2].map(() =>
        post(
          '/amendments',
          {
            idempotencyKey: key(),
            releaseId: first.body.id,
            packageId: replacement.id,
            reason: 'Verified correction',
            evidenceRef: 'TEST-CONCURRENT',
          },
          f.examiner.cookie,
        ).expect(201),
      ),
    );
    const other = await user(
      db,
      'EXAMINATIONS_OFFICER',
      ['validate-results', 'release-results'],
      'PERIOD',
      f.periodCode,
    );
    const replies = await Promise.all(
      requests.map((r, n) =>
        post(
          `/amendments/${r.body.id}/approve`,
          {
            idempotencyKey: key(),
            version: 1,
            declaration,
            proof: 'isolated-test-proof',
          },
          n ? other.cookie : f.publisher.cookie,
        ),
      ),
    );
    expect(replies.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    expect(
      await db.resultRelease.count({
        where: { previousReleaseId: first.body.id },
      }),
    ).toBe(1);
  });
  it('hides numeric marks when policy requires and denies revoked authority', async () => {
    const f = await setup();
    policies.set(f.offeringRef, {
      ...policies.get(f.offeringRef),
      showMarks: false,
    });
    await release(f).expect(201);
    const mine = await get('/me/results', f.student.cookie).expect(200);
    expect(mine.body.items[0].mark).toBeNull();
    expect(mine.body.items[0].history[0].mark).toBeNull();
    await db.roleAssignment.updateMany({
      where: { accountId: f.publisher.accountId },
      data: { revokedAt: new Date() },
    });
    const response = await release(f);
    expect([401, 403]).toContain(response.status);
  });
  it('requires fresh integrity, board conditions and publication windows', async () => {
    const f = await setup();
    policies.set(f.offeringRef, {
      ...policies.get(f.offeringRef),
      releaseAt: '2999-01-01T00:00:00Z',
    });
    expect((await release(f).expect(409)).body.code).toBe('RELEASE_WINDOW');
    policies.set(f.offeringRef, {
      ...policies.get(f.offeringRef),
      releaseAt: '2020-01-01T00:00:00Z',
    });
    await db.boardDecision.updateMany({
      where: { packageId: f.pkg.id },
      data: { conditions: ['Unresolved evidence'] },
    });
    expect((await release(f).expect(409)).body.code).toBe(
      'BOARD_APPROVAL_REQUIRED',
    );
    await db.boardDecision.updateMany({
      where: { packageId: f.pkg.id },
      data: { conditions: [] },
    });
    await db.resultPackage.update({
      where: { id: f.pkg.id },
      data: { packageHash: 'changed' },
    });
    expect((await release(f).expect(409)).body.code).toBe('INTEGRITY_FAILURE');
  });
  it('allows removal of an unpublished package but never a published package', async () => {
    const unpublished = await db.resultPackage.create({
      data: {
        offeringRef: key(),
        periodCode: 'TEST',
        packageHash: 'test',
        candidateListId: key(),
        declaration,
        preparedByAccountId: key(),
      },
    });
    await db.resultPackage.deleteMany({ where: { id: unpublished.id } });
    expect(
      await db.resultPackage.findUnique({ where: { id: unpublished.id } }),
    ).toBeNull();
    const f = await setup();
    await release(f).expect(201);
    await expect(
      db.resultPackage.delete({ where: { id: f.pkg.id } }),
    ).rejects.toThrow();
  });
  it('loads a scoped amendment directly, independent of queue pagination', async () => {
    const f = await setup();
    const first = await release(f).expect(201);
    const replacement = await f.packageAt(80);
    const requested = await post(
      '/amendments',
      {
        idempotencyKey: key(),
        releaseId: first.body.id,
        packageId: replacement.id,
        reason: 'Reviewed correction',
        evidenceRef: 'TEST-DETAIL',
      },
      f.examiner.cookie,
    ).expect(201);
    const laterPackages = Array.from({ length: 101 }, () => ({
      id: key(),
      offeringRef: key(),
      periodCode: f.periodCode,
      packageHash: 'pagination-fixture',
      candidateListId: key(),
      declaration,
      preparedByAccountId: f.lecturer.accountId,
    }));
    await db.resultPackage.createMany({ data: laterPackages });
    await db.resultRelease.createMany({
      data: laterPackages.map((p) => ({
        packageId: p.id,
        offeringRef: p.offeringRef,
        periodCode: p.periodCode,
        packageHash: p.packageHash,
        policySnapshot: {},
        declaration,
        releasedByAccountId: f.publisher.accountId,
        assignmentId: key(),
      })),
    });
    const workspace = (
      await get('/publications', f.publisher.cookie).expect(200)
    ).body;
    expect(workspace.releases).toHaveLength(100);
    expect(workspace.amendments.map((a: { id: string }) => a.id)).toContain(
      requested.body.id,
    );
    expect(workspace.nextReleaseCursor).toBeTruthy();
    const older = (
      await get(
        `/publications?releaseCursor=${workspace.nextReleaseCursor}`,
        f.publisher.cookie,
      ).expect(200)
    ).body;
    expect(older.releases.map((r: { id: string }) => r.id)).toContain(
      first.body.id,
    );
    expect(
      (
        await get(
          `/amendments/${requested.body.id}`,
          f.publisher.cookie,
        ).expect(200)
      ).body.id,
    ).toBe(requested.body.id);
    await get(
      `/amendments/${requested.body.id}`,
      (
        await user(
          db,
          'EXAMINATIONS_OFFICER',
          ['validate-results'],
          'PERIOD',
          'OTHER',
        )
      ).cookie,
    ).expect(404);
  });

  it('holds eligibility and assessment scope while publication commits', async () => {
    const f = await setup();
    let signal!: () => void;
    const entered = new Promise<void>((resolve) => {
      signal = resolve;
    });
    let finish!: () => void;
    const continueRelease = new Promise<void>((resolve) => {
      finish = resolve;
    });
    proofHooks.set(f.publisher.accountId, async () => {
      signal();
      await continueRelease;
    });
    const publishing = release(f).then((r) => r);
    await entered;
    let rosterDone = false;
    let candidateDone = false;
    const rosterChange = db.courseRegistration
      .updateMany({
        where: { registrationId: f.registration.id },
        data: { status: 'DROPPED' },
      })
      .then(() => {
        rosterDone = true;
      });
    const coordinator = await user(
      db,
      'COORDINATOR',
      ['approve-assessment'],
      'SCHOOL',
      'TEST',
    );
    const candidateChange = post(
      '/candidate-lists',
      {
        idempotencyKey: key(),
        offeringRef: f.offeringRef,
        periodCode: f.periodCode,
        studentRefs: [f.record.studentNumber],
      },
      coordinator.cookie,
    ).then((r) => {
      candidateDone = true;
      return r;
    });
    try {
      // Both operations have started on independent connections/actors.
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(rosterDone).toBe(false);
      expect(candidateDone).toBe(false);
    } finally {
      finish();
      proofHooks.delete(f.publisher.accountId);
    }
    expect((await publishing).status).toBe(201);
    await rosterChange;
    expect((await candidateChange).status).toBe(201);
  });
  it('rolls back result, release, notice, outbox and receipt after a late database failure', async () => {
    const f = await setup(2);
    const idempotencyKey = key();
    // A database constraint fails after the release and result writes, inside
    // the same transaction; this is deliberately not a mocked transaction.
    await db.$executeRawUnsafe(
      `ALTER TABLE "ResultNotice" ADD CONSTRAINT "test_notice_failure" CHECK ("studentId" <> '${f.records[1].id}')`,
    );
    try {
      await release(f, { idempotencyKey }).expect(503);
      expect(
        await db.resultRelease.count({ where: { packageId: f.pkg.id } }),
      ).toBe(0);
      expect(
        await db.officialResultVersion.count({
          where: { studentId: { in: f.records.map((r) => r.id) } },
        }),
      ).toBe(0);
      expect(
        await db.applicationCommand.findUnique({
          where: { key: idempotencyKey },
        }),
      ).toBeNull();
      expect(
        (await db.resultPackage.findUniqueOrThrow({ where: { id: f.pkg.id } }))
          .status,
      ).toBe('APPROVED_FOR_RELEASE');
    } finally {
      await db.$executeRawUnsafe(
        'ALTER TABLE "ResultNotice" DROP CONSTRAINT "test_notice_failure"',
      );
    }
    await release(f, { idempotencyKey }).expect(201);
  });
  it('denies a publisher who also prepared or marked the package', async () => {
    const f = await setup();
    await db.resultPackage.update({
      where: { id: f.pkg.id },
      data: { preparedByAccountId: f.publisher.accountId },
    });
    expect((await release(f).expect(403)).body.code).toBe('SOD_VIOLATION');
    await db.resultPackage.update({
      where: { id: f.pkg.id },
      data: { preparedByAccountId: f.lecturer.accountId },
    });
    await db.gradeBatch.updateMany({
      where: { offeringRef: f.offeringRef },
      data: { createdByAccountId: f.publisher.accountId },
    });
    expect((await release(f).expect(403)).body.code).toBe('SOD_VIOLATION');
    expect(
      await db.resultRelease.count({ where: { packageId: f.pkg.id } }),
    ).toBe(0);
  });
});
