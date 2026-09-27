import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import { user } from './helpers/phase6.js';
import {
  assessPost,
  assessGet,
  key,
  mkPlan,
  mkMapping,
  OFFERING_REF,
  PERIOD_CODE,
  SHELL_REF,
} from './helpers/assessment.js';

/**
 * TASK-PH7-006 official result release and student view e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet proof map: happy-path rows + outbox chain, pre-board /
 * blocking-condition / stale-package / unresolved-student refusals,
 * SoD + role denials, student isolation (own released rows only),
 * neutrals, concurrency convergence, idempotence + key conflict,
 * outbox-deletion-keeps-release (TEST-REC-010), second-version
 * independent release, expired-grant fail-safe.
 */
const PACKAGE_DECLARATION =
  'I confirm that this result package is complete for its offering and period and I submit it for board decision within my assigned authority.';

const SUBMISSION_DECLARATION =
  'I confirm that this batch is complete for its scope and I submit it for moderation within my assigned authority.';

const COMPONENT_MARKS: Record<string, number> = {
  'CA-QUIZ1': 14,
  'CA-ASSIGN': 21,
  'FINAL-EXAM': 68,
};

describe('Phase 7 official result release and student view', () => {
  let app: INestApplication;
  let db: PrismaService;
  let post: ReturnType<typeof assessPost>;
  let get: ReturnType<typeof assessGet>;
  let lecA: string;
  let lecB: string;
  let coordB: string;
  let modA: string;
  let exam: string;
  let examAccountId: string;
  let moodle: string;
  let tutor: string;
  let sysadmin: string;
  // File-wide cohort (slice-5 pattern): assembly reconciliation compares
  // the whole offering+period scope, so every test stages the same refs.
  let s1: { cookie: string; ref: string };
  let s2: { cookie: string; ref: string };

  const assemble = (cookie: string, extra = {}) =>
    post(
      '/packages',
      {
        idempotencyKey: key(),
        offeringRef: OFFERING_REF,
        periodCode: PERIOD_CODE,
        declaration: PACKAGE_DECLARATION,
        ...extra,
      },
      cookie,
    );

  const decide = (cookie: string, id: string, body: object) =>
    post(`/packages/${id}/decide`, { idempotencyKey: key(), ...body }, cookie);

  const release = (cookie: string, packageId: string, extra = {}) =>
    post('/releases', { idempotencyKey: key(), packageId, ...extra }, cookie);

  /** A sign-in student whose account links to a real Student row, so
   * `/results/mine` resolves ownership exactly like production. */
  async function studentUser(): Promise<{ cookie: string; ref: string }> {
    const me = await user(db, 'STUDENT', ['study'], 'STUDENT', 'self');
    const account = await db.account.findUniqueOrThrow({
      where: { id: me.accountId },
    });
    const ref = `STU-2026-${key().slice(0, 8).toUpperCase()}`;
    await db.student.create({
      data: { personId: account.personId, studentNumber: ref },
    });
    return { cookie: me.cookie, ref };
  }

  async function provisionCandidates(refs: string[]) {
    const res = await post(
      '/candidate-lists',
      {
        idempotencyKey: key(),
        offeringRef: OFFERING_REF,
        periodCode: PERIOD_CODE,
        studentRefs: refs,
      },
      coordB,
    ).expect(201);
    return (res.body as { id: string }).id;
  }

  async function fullyModeratedScope(refs: string[], lec: string, markShift = 0) {
    const drafted = await post(
      '/plans',
      { idempotencyKey: key(), ...mkPlan() },
      lec,
    ).expect(201);
    const plan = drafted.body as { id: string; version: number };
    await post(
      `/plans/${plan.id}/approve`,
      { idempotencyKey: key(), version: plan.version },
      coordB,
    ).expect(201);
    const full = await db.assessmentPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { components: true },
    });
    for (const component of full.components) {
      const mapped = await post(
        '/mappings',
        {
          idempotencyKey: key(),
          ...mkMapping(component.id, {
            moodleActivityId: `SIM-REL-${key().slice(0, 8).toUpperCase()}`,
            moodleCourseRef: `${SHELL_REF}-MOD`,
          }),
        },
        lec,
      ).expect(201);
      const mappingId = (mapped.body as { id: string }).id;
      await post(
        `/mappings/${mappingId}/test`,
        { idempotencyKey: key() },
        lec,
      ).expect(201);
      await post(
        `/mappings/${mappingId}/activate`,
        { idempotencyKey: key() },
        coordB,
      ).expect(201);
      const staged = await post(
        '/batches',
        {
          idempotencyKey: key(),
          mappingId,
          sourceRevision: `mdl-rev-${key()}`,
          lines: refs.map((studentRef) => ({
            studentRef,
            rawValue: (COMPONENT_MARKS[component.code] ?? 10) + markShift,
          })),
        },
        lec,
      ).expect(201);
      const batchId = (staged.body as { id: string }).id;
      await post(
        `/batches/${batchId}/validate`,
        { idempotencyKey: key() },
        exam,
      ).expect(201);
      const submitted = await post(
        `/batches/${batchId}/submit`,
        { idempotencyKey: key(), declaration: SUBMISSION_DECLARATION },
        lec,
      ).expect(201);
      const caseId = (submitted.body as { id: string }).id;
      await post(
        `/moderation/${caseId}/begin`,
        { idempotencyKey: key() },
        modA,
      ).expect(201);
      const decided = await post(
        `/moderation/${caseId}/decide`,
        { idempotencyKey: key(), version: 1, to: 'APPROVED' },
        modA,
      ).expect(201);
      expect((decided.body as { status: string }).status).toBe('APPROVED');
    }
  }

  /** Assemble + approve-for-release; returns the package id + version. */
  async function approvedPackage(
    refs: string[],
    lec: string,
  ): Promise<{ id: string; version: number }> {
    await provisionCandidates(refs);
    await fullyModeratedScope(refs, lec);
    const pkg = (await assemble(lec).expect(201)).body as {
      id: string;
      version: number;
    };
    const decided = await decide(exam, pkg.id, {
      version: pkg.version,
      to: 'APPROVE_FOR_RELEASE',
      reason: 'Board minute 12.',
    }).expect(201);
    expect((decided.body as { status: string }).status).toBe(
      'APPROVED_FOR_RELEASE',
    );
    return { id: pkg.id, version: pkg.version };
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
    post = assessPost(app);
    get = assessGet(app);
    lecA = (
      await user(db, 'LEC', ['stage-marks'], 'OFFERING', OFFERING_REF)
    ).cookie;
    // Second lecturer in the same offering: heavy suites spread the
    // per-account rate budget (180 general req/min) across preparers.
    lecB = (await user(db, 'LEC', ['stage-marks'], 'OFFERING', OFFERING_REF))
      .cookie;
    coordB = (
      await user(db, 'COORDINATOR', ['approve-assessment'], 'SCHOOL', 'Computing')
    ).cookie;
    modA = (await user(db, 'MODERATOR', ['moderate-results'], 'OFFERING', OFFERING_REF))
      .cookie;
    const examUser = await user(
      db,
      'EXAMINATIONS_OFFICER',
      ['validate-results'],
      'PERIOD',
      PERIOD_CODE,
    );
    exam = examUser.cookie;
    examAccountId = examUser.accountId;
    moodle = (
      await user(
        db,
        'MOODLE_ADMIN',
        ['manage-mapping', 'sync-moodle'],
        'SYSTEM',
        'MOODLE',
      )
    ).cookie;
    tutor = (
      await user(
        db,
        'TUT',
        ['mark-delegated-activities'],
        'TUTORIAL_GROUP',
        'TG-1',
      )
    ).cookie;
    sysadmin = (
      await user(db, 'SYSADMIN', ['administer-identity'], 'SYSTEM', 'GLOBAL')
    ).cookie;
    s1 = await studentUser();
    s2 = await studentUser();
    const programme = await db.programme.upsert({
      where: { code: 'SWE' },
      update: {},
      create: {
        code: 'SWE',
        name: 'Fictional Software Engineering',
        awardLevel: 'BSc',
        school: 'Computing',
        duration: '4 years',
        overview: 'Isolated test programme',
        feeScheduleRef: 'FIN-DEMO-v1',
        publishedVersion: '1',
        effectiveDate: new Date('2026-01-01'),
        owningOffice: 'Registry',
      },
    });
    const offering = await db.programmeOffering.upsert({
      where: {
        programmeId_intake_studyMode_campus: {
          programmeId: programme.id,
          intake: '2026S1',
          studyMode: 'FULLTIME',
          campus: 'MAIN',
        },
      },
      update: { availability: 'OPEN' },
      create: {
        programmeId: programme.id,
        intake: '2026S1',
        studyMode: 'FULLTIME',
        campus: 'MAIN',
        availability: 'OPEN',
      },
    });
    await db.moodleMapping.upsert({
      where: { id: '00000000-0000-0000-0000-000000000011' },
      update: { status: 'ACTIVE', moodleId: `${SHELL_REF}-MOD` },
      create: {
        id: '00000000-0000-0000-0000-000000000011',
        kind: 'SHELL',
        sisType: 'OFFERING',
        sisId: `${offering.id}:${PERIOD_CODE}`,
        moodleId: `${SHELL_REF}-MOD`,
        version: 1,
        status: 'ACTIVE',
        creatorAccountId: 'SYSTEM',
        activatorAccountId: 'SYSTEM',
      },
    });
    await db.academicPeriod.upsert({
      where: { code: PERIOD_CODE },
      update: {},
      create: { code: PERIOD_CODE, status: 'ACTIVE' },
    });
  }, 120000);

  afterAll(async () => {
    await app.close();
  });

  it('release-refusal: pre-board packages cannot release', async () => {
    await provisionCandidates([s1.ref, s2.ref]);
    await fullyModeratedScope([s1.ref, s2.ref], lecA);
    const pkg = (await assemble(lecA).expect(201)).body as { id: string };
    const res = await release(exam, pkg.id);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('NOT_BOARD_APPROVED');
    expect(
      await db.officialCourseResult.count({ where: { packageId: pkg.id } }),
    ).toBe(0);
  });

  it('student-view-empty-before-release: unreleased students see neutral empty', async () => {
    const res = await get('/results/mine', s1.cookie).expect(200);
    expect(res.body).toEqual({ items: [] });
  });

  it('release-happy-path: immutable rows plus outbox chain', async () => {
    const pkg = await approvedPackage([s1.ref, s2.ref], lecB);
    const res = await release(exam, pkg.id).expect(201);
    const body = res.body as {
      packageId: string;
      version: number;
      status: string;
      studentCount: number;
      releaseHash: string;
      publishedAt: string;
    };
    expect(body.packageId).toBe(pkg.id);
    expect(body.status).toBe('RELEASED');
    expect(body.studentCount).toBe(2);
    expect(body.releaseHash).toMatch(/^[a-f0-9]{64}$/);
    const rows = await db.officialCourseResult.findMany({
      where: { packageId: pkg.id },
      orderBy: { studentRef: 'asc' },
    });
    expect(rows.map((r) => r.studentRef).sort()).toEqual(
      [s1.ref, s2.ref].sort(),
    );
    // CA-QUIZ1 14/20*20=14, CA-ASSIGN 21/30*20=14, FINAL 68/100*60=40.8 → 68.8.
    for (const row of rows) {
      expect(row.total).toBeCloseTo(68.8, 5);
      expect(row.outcome).toBe('PASS');
      expect(row.status).toBe('RELEASED');
    }
    const outbox = await db.outboxEvent.findMany({
      where: { aggregateId: pkg.id, type: 'OfficialResultsReleased' },
    });
    expect(outbox).toHaveLength(1);
    const payload = outbox[0].payload as {
      chain: { command: string; event: string };
    };
    expect(payload.chain.command).toBe('ReleaseOfficialCourseResults');
    expect(payload.chain.event).toBe('OfficialResultsReleased-v1');
  });

  it('release-refusal: blocking board conditions stop release', async () => {
    await provisionCandidates([s1.ref, s2.ref]);
    await fullyModeratedScope([s1.ref, s2.ref], lecA);
    const pkg = (await assemble(lecA).expect(201)).body as {
      id: string;
      version: number;
    };
    await decide(exam, pkg.id, {
      version: pkg.version,
      to: 'CONDITION',
      reason: 'Verify absence evidence before release.',
      conditions: [{ text: 'Confirm absence evidence', blocksRelease: true }],
    }).expect(201);
    const res = await release(exam, pkg.id);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONDITION_BLOCKS_RELEASE');
    expect(
      await db.officialCourseResult.count({ where: { packageId: pkg.id } }),
    ).toBe(0);
  });

  it('release-refusal: stale packages force a fresh assembly', async () => {
    const pkg = await approvedPackage([s1.ref, s2.ref], lecB);
    // New approved results land after assembly with different marks: the
    // frozen trace no longer governs, so release refuses stale output.
    await fullyModeratedScope([s1.ref, s2.ref], lecB, 1);
    const res = await release(exam, pkg.id);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STALE_PACKAGE');
  });

  it('release-refusal: unresolved students force Registry correction', async () => {
    const pkg = await approvedPackage([s1.ref, s2.ref], lecA);
    // Simulate an identity withdrawal after assembly: unlink the staged
    // lines, then remove the student record itself. Restored afterwards
    // so later tests resolve the shared fixture refs.
    const victim = await db.student.findUniqueOrThrow({
      where: { studentNumber: s2.ref },
    });
    await db.gradeLine.updateMany({
      where: { resolvedStudentId: victim.id },
      data: { resolvedStudentId: null },
    });
    await db.student.delete({ where: { id: victim.id } });
    try {
      const res = await release(exam, pkg.id);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('UNRESOLVED_STUDENTS');
      expect(
        await db.officialCourseResult.count({ where: { packageId: pkg.id } }),
      ).toBe(0);
    } finally {
      await db.student.create({
        data: { personId: victim.personId, studentNumber: s2.ref },
      });
    }
  });

  it('release-denials: lecturer, coordinator, moderator, tutor, sysadmin, moodle-admin refused', async () => {
    const pkg = await approvedPackage([s1.ref, s2.ref], lecB);
    for (const cookie of [lecA, coordB, modA, tutor, sysadmin, moodle]) {
      const denied = await release(cookie, pkg.id);
      expect([403, 404]).toContain(denied.status);
    }
    expect(
      await db.officialCourseResult.count({ where: { packageId: pkg.id } }),
    ).toBe(0);
  });

  it('release-expired: an expired examinations grant fails safe', async () => {
    const pkg = await approvedPackage([s1.ref, s2.ref], lecA);
    await db.roleAssignment.updateMany({
      where: { accountId: examAccountId, role: 'EXAMINATIONS_OFFICER' },
      data: { endsAt: new Date('2020-01-01T00:00:00Z') },
    });
    try {
      const denied = await release(exam, pkg.id);
      expect(denied.status).toBe(403);
      expect(
        await db.officialCourseResult.count({ where: { packageId: pkg.id } }),
      ).toBe(0);
    } finally {
      await db.roleAssignment.updateMany({
        where: { accountId: examAccountId, role: 'EXAMINATIONS_OFFICER' },
        data: { endsAt: null },
      });
    }
  });

  it('release-wrong-period: a foreign-period officer cannot release', async () => {
    const pkg = await approvedPackage([s1.ref, s2.ref], lecB);
    const foreign = (
      await user(
        db,
        'EXAMINATIONS_OFFICER',
        ['validate-results'],
        'PERIOD',
        '2099X9',
      )
    ).cookie;
    const denied = await release(foreign, pkg.id);
    expect(denied.status).toBe(403);
    expect(
      await db.officialCourseResult.count({ where: { packageId: pkg.id } }),
    ).toBe(0);
  });

  it('release-neutral: unknown releases are 404 without disclosure', async () => {
    const missing = await release(exam, key());
    expect(missing.status).toBe(404);
    const detail = await get(`/releases/${key()}`, exam);
    expect(detail.status).toBe(404);
  });

  it('release-concurrency: racing releases converge on one release', async () => {
    const pkg = await approvedPackage([s1.ref, s2.ref], lecA);
    const [a, b] = await Promise.all([
      release(exam, pkg.id),
      release(exam, pkg.id),
    ]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect((a.body as { packageId: string }).packageId).toBe(pkg.id);
    expect((b.body as { packageId: string }).packageId).toBe(pkg.id);
    // One release: exactly one row set, never duplicated.
    expect(
      await db.officialCourseResult.count({ where: { packageId: pkg.id } }),
    ).toBe(2);
    const reread = await get(`/releases/${pkg.id}`, exam).expect(200);
    expect((reread.body as { status: string }).status).toBe('RELEASED');
  });

  it('release-idempotent: same key replays; mismatched key conflicts', async () => {
    const pkg = await approvedPackage([s1.ref, s2.ref], lecB);
    const other = await approvedPackage([s1.ref, s2.ref], lecB);
    const k = key();
    const first = await post(
      '/releases',
      { idempotencyKey: k, packageId: pkg.id },
      exam,
    ).expect(201);
    const retry = await post(
      '/releases',
      { idempotencyKey: k, packageId: pkg.id },
      exam,
    ).expect(201);
    expect((retry.body as { releaseHash: string }).releaseHash).toBe(
      (first.body as { releaseHash: string }).releaseHash,
    );
    // Same key, different existing package: the stored reference belongs
    // to another action payload and must conflict, never cross-release.
    const conflict = await post(
      '/releases',
      { idempotencyKey: k, packageId: other.id },
      exam,
    );
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(
      await db.officialCourseResult.count({ where: { packageId: other.id } }),
    ).toBe(0);
  });

  it('release-recovery: outbox loss never rolls back the release', async () => {
    const pkg = await approvedPackage([s1.ref, s2.ref], lecA);
    await release(exam, pkg.id).expect(201);
    // Simulate a delivery failure after commit: the handoff row is gone,
    // the certified release stands and stays readable.
    await db.outboxEvent.deleteMany({ where: { aggregateId: pkg.id } });
    const reread = await get(`/releases/${pkg.id}`, exam).expect(200);
    const body = reread.body as { status: string; studentCount: number };
    expect(body.status).toBe('RELEASED');
    expect(body.studentCount).toBe(2);
    expect(
      await db.officialCourseResult.count({ where: { packageId: pkg.id } }),
    ).toBe(2);
  });

  it('student-isolation: students see only their own released rows', async () => {
    const pkg = await approvedPackage([s1.ref, s2.ref], lecB);
    await release(exam, pkg.id).expect(201);
    const mine = await get('/results/mine', s1.cookie).expect(200);
    const items = (
      mine.body as {
        items: Array<{
          studentRef: string;
          offeringRef: string;
          total: number;
          outcome: string;
        }>;
      }
    ).items;
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.studentRef).toBe(s1.ref);
      expect(item.offeringRef).toBe(OFFERING_REF);
      expect(item.total).toBeCloseTo(68.8, 5);
      expect(item.outcome).toBe('PASS');
    }
    const other = await get('/results/mine', s2.cookie).expect(200);
    const otherItems = (
      other.body as { items: Array<{ studentRef: string }> }
    ).items;
    expect(otherItems.length).toBeGreaterThan(0);
    for (const item of otherItems) {
      expect(item.studentRef).toBe(s2.ref);
    }
    // Staff cannot use the student endpoint at all.
    await get('/results/mine', exam).expect(403);
    await get('/results/mine', lecA).expect(403);
  });

  it('release-versioning: a new package version releases independently', async () => {
    const first = await approvedPackage([s1.ref, s2.ref], lecA);
    await release(exam, first.id).expect(201);
    const second = await approvedPackage([s1.ref, s2.ref], lecB);
    expect(second.version).toBeGreaterThan(first.version);
    await release(exam, second.id).expect(201);
    const v1 = await db.officialCourseResult.count({
      where: { packageId: first.id },
    });
    const v2 = await db.officialCourseResult.count({
      where: { packageId: second.id },
    });
    expect(v1).toBe(2);
    expect(v2).toBe(2);
  });
});
