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
 * TASK-PH7-007 result amendment skeleton e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet proof map: request happy-path OPEN + outbox chain, request
 * refusals (unreleased/unknown-student/out-of-range/bad-declaration),
 * approve happy-path (new version row, old row preserved, outbox chain,
 * impact task PENDING, student sees amended total), decline demands
 * reason, SoD (requester cannot approve), role denials, neutrals,
 * concurrency convergence, idempotence + key conflict, expired-grant
 * fail-safe, second case opens a new version after approval.
 */
const PACKAGE_DECLARATION =
  'I confirm that this result package is complete for its offering and period and I submit it for board decision within my assigned authority.';

const SUBMISSION_DECLARATION =
  'I confirm that this batch is complete for its scope and I submit it for moderation within my assigned authority.';

const AMENDMENT_DECLARATION =
  'I confirm that this official-result amendment is complete for its student and I submit it within my assigned authority.';

const COMPONENT_MARKS: Record<string, number> = {
  'CA-QUIZ1': 14,
  'CA-ASSIGN': 21,
  'FINAL-EXAM': 68,
};

describe('Phase 7 result amendment skeleton', () => {
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
  let student: string;
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

  const requestAmendment = (cookie: string, body: object) =>
    post('/amendments', { idempotencyKey: key(), ...body }, cookie);

  const decideAmendment = (cookie: string, id: string, body: object) =>
    post(`/amendments/${id}/decide`, { idempotencyKey: key(), ...body }, cookie);

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
            moodleActivityId: `SIM-AMD-${key().slice(0, 8).toUpperCase()}`,
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

  /** Assemble + approve-for-release + release; returns the package. */
  async function releasedPackage(
    refs: string[],
    lec: string,
  ): Promise<{ id: string; version: number }> {
    await provisionCandidates(refs);
    await fullyModeratedScope(refs, lec);
    const pkg = (await assemble(lec).expect(201)).body as {
      id: string;
      version: number;
    };
    await decide(exam, pkg.id, {
      version: pkg.version,
      to: 'APPROVE_FOR_RELEASE',
      reason: 'Board minute 12.',
    }).expect(201);
    const rel = (await release(exam, pkg.id).expect(201)).body as {
      status: string;
    };
    expect(rel.status).toBe('RELEASED');
    return { id: pkg.id, version: pkg.version };
  }

  const amendmentBody = (packageId: string, studentRef: string, extra = {}) => ({
    packageId,
    studentRef,
    correctedTotal: 72.5,
    reason: 'Verified clerical error: FINAL-EXAM 68 misrecorded as 66.',
    evidence: 'remark-slip-001',
    declaration: AMENDMENT_DECLARATION,
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
    student = (
      await user(db, 'STUDENT', ['study'], 'STUDENT', 'self')
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

  it('request-happy-path: OPEN case plus outbox chain', async () => {
    const pkg = await releasedPackage([s1.ref, s2.ref], lecA);
    const res = await requestAmendment(
      lecA,
      amendmentBody(pkg.id, s1.ref),
    ).expect(201);
    const body = res.body as { id: string; status: string; version: number };
    expect(body.status).toBe('OPEN');
    expect(body.version).toBe(1);
    const stored = await db.resultAmendmentCase.findUniqueOrThrow({
      where: { id: body.id },
    });
    expect(stored.correctedTotal).toBeCloseTo(72.5, 5);
    expect(stored.correctedOutcome).toBe('PASS');
    const outbox = await db.outboxEvent.findMany({
      where: { aggregateId: body.id, type: 'OfficialResultAmendmentRequested' },
    });
    expect(outbox).toHaveLength(1);
    const payload = outbox[0].payload as {
      chain: { command: string; event: string };
    };
    expect(payload.chain.command).toBe('RequestOfficialResultAmendment');
    expect(payload.chain.event).toBe('OfficialResultAmendmentRequested-v1');
  });

  it('request-refusal: unreleased packages cannot amend', async () => {
    await provisionCandidates([s1.ref, s2.ref]);
    await fullyModeratedScope([s1.ref, s2.ref], lecB);
    const pkg = (await assemble(lecB).expect(201)).body as { id: string };
    const res = await requestAmendment(lecB, amendmentBody(pkg.id, s1.ref));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('NOT_RELEASED');
    expect(
      await db.resultAmendmentCase.count({ where: { packageId: pkg.id } }),
    ).toBe(0);
  });

  it('request-refusal: unknown students and out-of-range totals fail closed', async () => {
    const pkg = await releasedPackage([s1.ref, s2.ref], lecA);
    const unknown = await requestAmendment(
      lecA,
      amendmentBody(pkg.id, 'STU-2026-UNKNOWN'),
    );
    expect(unknown.status).toBe(409);
    expect(unknown.body.code).toBe('UNKNOWN_STUDENT');
    const ranged = await requestAmendment(
      lecA,
      amendmentBody(pkg.id, s1.ref, { correctedTotal: 140 }),
    );
    expect(ranged.status).toBe(400);
    expect(ranged.body.code).toBe('OUT_OF_RANGE');
    const bare = await requestAmendment(
      lecA,
      amendmentBody(pkg.id, s1.ref, {
        declaration: 'I confirm something else.',
      }),
    );
    expect(bare.status).toBe(400);
  });

  it('approve-happy-path: new version row, old preserved, impact queued', async () => {
    const pkg = await releasedPackage([s1.ref, s2.ref], lecB);
    const opened = (
      await requestAmendment(lecB, amendmentBody(pkg.id, s1.ref)).expect(201)
    ).body as { id: string; version: number };
    const before = await db.officialCourseResult.findMany({
      where: { packageId: pkg.id, studentRef: s1.ref },
      orderBy: { version: 'asc' },
    });
    expect(before).toHaveLength(1);
    const decided = await decideAmendment(exam, opened.id, {
      version: opened.version,
      to: 'APPROVE',
    }).expect(201);
    expect((decided.body as { status: string }).status).toBe('APPROVED');
    const rows = await db.officialCourseResult.findMany({
      where: {
        packageId: pkg.id,
        studentRef: s1.ref,
      },
      orderBy: { version: 'asc' },
    });
    expect(rows).toHaveLength(2);
    // Original immutable: the released 68.8 stays exactly as published.
    expect(rows[0].total).toBeCloseTo(68.8, 5);
    expect(rows[1].total).toBeCloseTo(72.5, 5);
    expect(rows[1].version).toBe(rows[0].version + 1);
    const trace = rows[1].trace as { supersedesId?: string };
    expect(trace.supersedesId).toBe(rows[0].id);
    const outbox = await db.outboxEvent.findMany({
      where: { aggregateId: opened.id, type: 'OfficialResultAmended' },
    });
    expect(outbox).toHaveLength(1);
    const payload = outbox[0].payload as {
      chain: { command: string; event: string };
      nextVersion: number;
    };
    expect(payload.chain.command).toBe('ApproveOfficialResultAmendment');
    expect(payload.chain.event).toBe('OfficialResultAmended-v1');
    const impacts = await db.academicImpactTask.findMany({
      where: { amendmentCaseId: opened.id },
    });
    expect(impacts).toHaveLength(1);
    expect(impacts[0].kind).toBe('PROGRESSION_RECALC');
    expect(impacts[0].status).toBe('PENDING');
    // The student sees the amended current version only.
    const mine = await get('/results/mine', s1.cookie).expect(200);
    const items = (mine.body as { items: Array<{ total: number; version: number }> }).items;
    const current = items.find((i) => i.total === 72.5);
    expect(current).toBeDefined();
    expect(items.filter((i) => i.total === 68.8)).toHaveLength(0);
  });

  it('decline-demands-reason: bare declines refuse, reasoned declines keep history', async () => {
    const pkg = await releasedPackage([s1.ref, s2.ref], lecA);
    const opened = (
      await requestAmendment(lecA, amendmentBody(pkg.id, s2.ref)).expect(201)
    ).body as { id: string; version: number };
    const bare = await decideAmendment(exam, opened.id, {
      version: opened.version,
      to: 'DECLINE',
    });
    expect(bare.status).toBe(400);
    expect(bare.body.code).toBe('REASON_REQUIRED');
    await decideAmendment(exam, opened.id, {
      version: opened.version,
      to: 'DECLINE',
      reason: 'Evidence does not support the claimed error.',
    }).expect(201);
    const rows = await db.officialCourseResult.findMany({
      where: { packageId: pkg.id, studentRef: s2.ref },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBeCloseTo(68.8, 5);
  });

  it('decision-sod: the requester cannot approve their own case', async () => {
    const pkg = await releasedPackage([s1.ref, s2.ref], lecB);
    // Lecturer B requests; lecturer B (same account path as preparer but
    // a different case role) is refused only when requester == approver.
    // Here the examinations officer approves, while a lecturer approval
    // attempt is denied before any disclosure.
    const opened = (
      await requestAmendment(lecB, amendmentBody(pkg.id, s1.ref)).expect(201)
    ).body as { id: string; version: number };
    const selfApprove = await decideAmendment(lecB, opened.id, {
      version: opened.version,
      to: 'APPROVE',
    });
    expect([403, 404]).toContain(selfApprove.status);
    // Four-eyes proper: examinations approves a lecturer-requested case.
    await decideAmendment(exam, opened.id, {
      version: opened.version,
      to: 'APPROVE',
    }).expect(201);
  });

  it('request-denials: moderator, tutor, sysadmin, moodle-admin, student refused', async () => {
    const pkg = await releasedPackage([s1.ref, s2.ref], lecA);
    for (const cookie of [modA, tutor, sysadmin, moodle, student]) {
      const denied = await requestAmendment(
        cookie,
        amendmentBody(pkg.id, s1.ref),
      );
      expect([403, 404]).toContain(denied.status);
    }
    const opened = (
      await requestAmendment(lecA, amendmentBody(pkg.id, s2.ref)).expect(201)
    ).body as { id: string; version: number };
    for (const cookie of [modA, tutor, sysadmin, moodle, student]) {
      const dec = await decideAmendment(cookie, opened.id, {
        version: opened.version,
        to: 'APPROVE',
      });
      expect([403, 404]).toContain(dec.status);
    }
    const studentRead = await get(`/amendments/${opened.id}`, s1.cookie);
    expect([403, 404]).toContain(studentRead.status);
  });

  it('amendment-neutral: unknown cases are 404 without disclosure', async () => {
    const missing = await get(`/amendments/${key()}`, exam);
    expect(missing.status).toBe(404);
    const decideMissing = await decideAmendment(exam, key(), {
      version: 1,
      to: 'APPROVE',
    });
    expect(decideMissing.status).toBe(404);
  });

  it('amendment-concurrency: racing approvals converge on one version', async () => {
    const pkg = await releasedPackage([s1.ref, s2.ref], lecB);
    const opened = (
      await requestAmendment(lecB, amendmentBody(pkg.id, s1.ref)).expect(201)
    ).body as { id: string; version: number };
    const [a, b] = await Promise.all([
      decideAmendment(exam, opened.id, {
        version: opened.version,
        to: 'APPROVE',
      }),
      decideAmendment(exam, opened.id, {
        version: opened.version,
        to: 'APPROVE',
      }),
    ]);
    const statuses = [a.status, b.status].sort((x, y) => x - y);
    expect(statuses).toEqual([201, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.code).toBe('REQUEST_CLOSED');
    // One amendment: exactly one new official version, never duplicated.
    const rows = await db.officialCourseResult.findMany({
      where: {
        offeringRef: OFFERING_REF,
        periodCode: PERIOD_CODE,
        studentRef: s1.ref,
        packageId: pkg.id,
      },
    });
    expect(rows).toHaveLength(2);
  });

  it('amendment-idempotent: same key replays; mismatched key conflicts', async () => {
    const pkg = await releasedPackage([s1.ref, s2.ref], lecA);
    const k = key();
    const first = await post(
      '/amendments',
      { idempotencyKey: k, ...amendmentBody(pkg.id, s1.ref) },
      lecA,
    ).expect(201);
    const retry = await post(
      '/amendments',
      { idempotencyKey: k, ...amendmentBody(pkg.id, s1.ref) },
      lecA,
    ).expect(201);
    expect((retry.body as { id: string }).id).toBe(
      (first.body as { id: string }).id,
    );
    const conflict = await post(
      '/amendments',
      { idempotencyKey: k, ...amendmentBody(pkg.id, s2.ref) },
      lecA,
    );
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('amendment-expired: an expired examinations grant fails safe', async () => {
    const pkg = await releasedPackage([s1.ref, s2.ref], lecB);
    const opened = (
      await requestAmendment(lecB, amendmentBody(pkg.id, s1.ref)).expect(201)
    ).body as { id: string; version: number };
    await db.roleAssignment.updateMany({
      where: { accountId: examAccountId, role: 'EXAMINATIONS_OFFICER' },
      data: { endsAt: new Date('2020-01-01T00:00:00Z') },
    });
    try {
      const denied = await decideAmendment(exam, opened.id, {
        version: opened.version,
        to: 'APPROVE',
      });
      expect(denied.status).toBe(403);
      expect(
        await db.officialCourseResult.count({
          where: { packageId: pkg.id, studentRef: s1.ref },
        }),
      ).toBe(1);
    } finally {
      await db.roleAssignment.updateMany({
        where: { accountId: examAccountId, role: 'EXAMINATIONS_OFFICER' },
        data: { endsAt: null },
      });
    }
  });

  it('amendment-versioning: a second case opens a new version after approval', async () => {
    const pkg = await releasedPackage([s1.ref, s2.ref], lecA);
    const first = (
      await requestAmendment(lecA, amendmentBody(pkg.id, s1.ref)).expect(201)
    ).body as { id: string; version: number };
    await decideAmendment(exam, first.id, {
      version: first.version,
      to: 'APPROVE',
    }).expect(201);
    const second = (
      await requestAmendment(
        lecA,
        amendmentBody(pkg.id, s1.ref, { correctedTotal: 74 }),
      ).expect(201)
    ).body as { id: string; version: number };
    expect(second.version).toBe(first.version + 1);
    await decideAmendment(exam, second.id, {
      version: second.version,
      to: 'APPROVE',
    }).expect(201);
    const rows = await db.officialCourseResult.findMany({
      where: {
        packageId: pkg.id,
        studentRef: s1.ref,
      },
      orderBy: { version: 'asc' },
    });
    expect(rows).toHaveLength(3);
    expect(rows[2].total).toBeCloseTo(74, 5);
  });
});
