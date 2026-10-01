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
 * TASK-PH7-005 board/decision package e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet proof map: assembly happy-path (hash, trace, reconciliation),
 * assembly refusals (unmoderated component, missing candidate list,
 * open MISSING findings, bad declaration), decision transitions with
 * reason/condition demands, SoD refusals (preparer cannot decide;
 * moderator/tutor/sysadmin/moodle-admin/student denied), neutrals,
 * concurrency (VERSION_CONFLICT), idempotence (same-key replay).
 */
const PACKAGE_DECLARATION =
  'I confirm that this result package is complete for its offering and period and I submit it for board decision within my assigned authority.';

const COMPONENT_MARKS: Record<string, number> = {
  'CA-QUIZ1': 14,
  'CA-ASSIGN': 21,
  'FINAL-EXAM': 68,
};

describe('Phase 7 board/decision package', () => {
  let app: INestApplication;
  let db: PrismaService;
  let post: ReturnType<typeof assessPost>;
  let get: ReturnType<typeof assessGet>;
  let lecA: string;
  let lecAAccountId: string;
  let lecB: string;
  let coordB: string;
  let modA: string;
  let exam: string;
  let examAccountId: string;
  let moodle: string;
  let tutor: string;
  let sysadmin: string;
  let student: string;
  let known1: string;
  let known2: string;

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

  async function knownStudent(): Promise<string> {
    const person = await db.person.create({
      data: {
        displayName: 'Fictional board student',
        email: `board-${key()}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const ref = `STU-2026-${key().slice(0, 8).toUpperCase()}`;
    await db.student.create({
      data: { personId: person.id, studentNumber: ref },
    });
    return ref;
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

  /**
   * One approved plan + three ACTIVE mappings + three staged batches,
   * each validated, submitted, begun and moderator-approved. Returns the
   * plan row for CA-ref assertions. The preparer cookie is parameterized
   * so heavy suites spread the per-account rate budget across lecturers.
   */
  async function fullyModeratedScope(refs: string[], lec: string = lecA) {
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
            moodleActivityId: `SIM-BRD-${key().slice(0, 8).toUpperCase()}`,
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
            rawValue: COMPONENT_MARKS[component.code] ?? 10,
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
        {
          idempotencyKey: key(),
          declaration:
            'I confirm that this batch is complete for its scope and I submit it for moderation within my assigned authority.',
        },
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
    return { planId: plan.id };
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
    const lecAUser = await user(db, 'LEC', ['stage-marks'], 'OFFERING', OFFERING_REF);
    lecA = lecAUser.cookie;
    lecAAccountId = lecAUser.accountId;
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
    student = (await user(db, 'STUDENT', ['study'], 'STUDENT', 'self')).cookie;
    known1 = await knownStudent();
    known2 = await knownStudent();
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
          studyMode: 'Full-time',
          campus: 'Main Campus',
        },
      },
      update: { availability: 'OPEN' },
      create: {
        programmeId: programme.id,
        intake: '2026S1',
        studyMode: 'Full-time',
        campus: 'Main Campus',
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

  it('assembly-refusal: unmoderated components cannot assemble', async () => {
    const res = await assemble(lecA);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('UNMODERATED_COMPONENT');
    expect(
      await db.resultPackage.count({
        where: { offeringRef: OFFERING_REF, periodCode: PERIOD_CODE },
      }),
    ).toBe(0);
  });

  it('assembly-refusal: bad declaration writes nothing', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2]);
    const res = await assemble(lecA, { declaration: 'looks complete' });
    expect(res.status).toBe(400);
    expect(
      await db.resultPackage.count({
        where: { offeringRef: OFFERING_REF, periodCode: PERIOD_CODE },
      }),
    ).toBe(0);
  });

  it('assembly-happy-path: frozen hash, weighted-total-v1 trace, reconciliation', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2]);
    const res = await assemble(lecA).expect(201);
    const body = res.body as {
      id: string;
      version: number;
      status: string;
      packageHash: string;
      trace: {
        formulaVersion: string;
        students: Array<{ studentRef: string; rounded: number }>;
      };
    };
    expect(body.status).toBe('ASSEMBLED');
    expect(body.version).toBe(1);
    expect(body.packageHash).toMatch(/^[a-f0-9]{64}$/);
    expect(body.trace.formulaVersion).toBe('weighted-total-v1');
    // CA-QUIZ1 14/20*20=14, CA-ASSIGN 21/30*20=14, FINAL 68/100*60=40.8 → 68.8
    const row = body.trace.students.find((s) => s.studentRef === known1);
    expect(row?.rounded).toBeCloseTo(68.8, 5);
    // Reconciliation: both candidates present in the trace.
    expect(body.trace.students.map((s) => s.studentRef).sort()).toEqual(
      [known1, known2].sort(),
    );
  });

  it('assembly-idempotent: same key replays the stored package', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2]);
    const k = key();
    const first = await post(
      '/packages',
      {
        idempotencyKey: k,
        offeringRef: OFFERING_REF,
        periodCode: PERIOD_CODE,
        declaration: PACKAGE_DECLARATION,
      },
      lecA,
    ).expect(201);
    const retry = await post(
      '/packages',
      {
        idempotencyKey: k,
        offeringRef: OFFERING_REF,
        periodCode: PERIOD_CODE,
        declaration: PACKAGE_DECLARATION,
      },
      lecA,
    ).expect(201);
    expect((retry.body as { id: string }).id).toBe(
      (first.body as { id: string }).id,
    );
    const conflict = await post(
      '/packages',
      {
        idempotencyKey: k,
        offeringRef: OFFERING_REF,
        periodCode: '2099X9',
        declaration: PACKAGE_DECLARATION,
      },
      lecA,
    );
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('decision-sod: preparer cannot decide; decider must be examinations', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2]);
    const pkg = (
      await assemble(lecA).expect(201)
    ).body as { id: string; version: number };
    // The preparer (lecturer) holds no board authority: denied before any
    // disclosure. The examinations decider (a different account) succeeds.
    const self = await decide(lecA, pkg.id, {
      version: pkg.version,
      to: 'APPROVE_FOR_RELEASE',
      reason: 'Board minute 12.',
    });
    expect(self.status).toBe(403);
    const ok = await decide(exam, pkg.id, {
      version: pkg.version,
      to: 'APPROVE_FOR_RELEASE',
      reason: 'Board minute 12.',
    }).expect(201);
    expect((ok.body as { status: string }).status).toBe('APPROVED_FOR_RELEASE');
    expect(lecAAccountId).not.toBe(examAccountId);
  });

  it('decision-demands: non-approvals need reasons, conditions store', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2]);
    const pkg = (
      await assemble(lecA).expect(201)
    ).body as { id: string; version: number };
    const bare = await decide(exam, pkg.id, {
      version: pkg.version,
      to: 'RETURN',
    });
    expect(bare.status).toBe(400);
    expect(bare.body.code).toBe('REASON_REQUIRED');
    const cond = await decide(exam, pkg.id, {
      version: pkg.version,
      to: 'CONDITION',
      reason: 'Verify absence evidence before release.',
      conditions: [{ text: 'Confirm absence evidence', blocksRelease: true }],
    }).expect(201);
    expect((cond.body as { status: string }).status).toBe('CONDITION');
    const stored = await db.boardDecision.findFirstOrThrow({
      where: { packageId: pkg.id },
    });
    expect(JSON.stringify(stored.conditions)).toContain('absence evidence');
  });

  it('decision-denials: moderator, tutor, sysadmin, moodle-admin, student refused', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2]);
    const pkg = (
      await assemble(lecA).expect(201)
    ).body as { id: string; version: number };
    for (const cookie of [modA, tutor, sysadmin, moodle, student]) {
      const denied = await assemble(cookie);
      expect([403, 404]).toContain(denied.status);
      const dec = await decide(cookie, pkg.id, {
        version: pkg.version,
        to: 'APPROVE_FOR_RELEASE',
        reason: 'Board minute 12.',
      });
      expect([403, 404]).toContain(dec.status);
    }
    const studentRead = await get(`/packages/${pkg.id}`, student);
    expect([403, 404]).toContain(studentRead.status);
  });

  it('decision-neutral: unknown package is 404 without disclosure', async () => {
    const missing = await get(`/packages/${key()}`, lecA);
    expect(missing.status).toBe(404);
    const decideMissing = await decide(exam, key(), {
      version: 1,
      to: 'APPROVE_FOR_RELEASE',
      reason: 'Board minute 12.',
    });
    expect(decideMissing.status).toBe(404);
  });

  it('decision-concurrency: racing decisions conflict, never overwrite', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2]);
    const pkg = (
      await assemble(lecA).expect(201)
    ).body as { id: string; version: number };
    const [a, b] = await Promise.all([
      decide(exam, pkg.id, {
        version: pkg.version,
        to: 'APPROVE_FOR_RELEASE',
        reason: 'Board minute 12a.',
      }),
      decide(exam, pkg.id, {
        version: pkg.version,
        to: 'RETURN',
        reason: 'Board minute 12b.',
      }),
    ]);
    const statuses = [a.status, b.status].sort((x, y) => x - y);
    expect(statuses).toEqual([201, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.code).toBe('VERSION_CONFLICT');
    const kept = await db.resultPackage.findUniqueOrThrow({
      where: { id: pkg.id },
    });
    expect(kept.version).toBe(pkg.version + 1);
  });

  it('assembly-refusal: missing candidate list blocks assembly', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2], lecB);
    await db.assessmentCandidateList.updateMany({
      where: { offeringRef: OFFERING_REF, periodCode: PERIOD_CODE },
      data: { status: 'SUPERSEDED' },
    });
    const before = await db.resultPackage.count({
      where: { offeringRef: OFFERING_REF, periodCode: PERIOD_CODE },
    });
    const res = await assemble(lecB);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CANDIDATE_LIST_REQUIRED');
    expect(
      await db.resultPackage.count({
        where: { offeringRef: OFFERING_REF, periodCode: PERIOD_CODE },
      }),
    ).toBe(before);
  });

  it('assembly-refusal: open missing-mark findings block assembly', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2], lecB);
    const mapping = await db.gradeActivityMapping.findFirstOrThrow({
      where: {
        status: 'ACTIVE',
        component: {
          plan: {
            offeringRef: OFFERING_REF,
            periodCode: PERIOD_CODE,
            status: 'APPROVED',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const staged = await post(
      '/batches',
      {
        idempotencyKey: key(),
        mappingId: mapping.id,
        sourceRevision: `mdl-rev-${key()}`,
        lines: [{ studentRef: known1, outcome: 'MISSING_MARK' }],
      },
      lecB,
    ).expect(201);
    const batchId = (staged.body as { id: string }).id;
    await post(
      `/batches/${batchId}/validate`,
      { idempotencyKey: key() },
      exam,
    ).expect(201);
    const blocked = await assemble(lecB);
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('OPEN_FINDINGS');
    // Cleanup triage so later tests assemble clean: OPEN→ACKNOWLEDGED→RESOLVED.
    const finding = await db.gradeFinding.findFirstOrThrow({
      where: {
        code: 'MISSING_MARK',
        status: 'OPEN',
        batch: { offeringRef: OFFERING_REF, periodCode: PERIOD_CODE },
      },
      orderBy: { createdAt: 'desc' },
    });
    await post(
      `/findings/${finding.id}/transition`,
      { idempotencyKey: key(), version: 1, to: 'ACKNOWLEDGED' },
      exam,
    ).expect(201);
    await post(
      `/findings/${finding.id}/transition`,
      {
        idempotencyKey: key(),
        version: 2,
        to: 'RESOLVED',
        reason: 'Missing mark captured on the corrected revision.',
      },
      exam,
    ).expect(201);
  });

  it('assembly-refusal: superseded provenance cannot assemble (no Moodle-direct)', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2], lecB);
    // A newer approved plan supersedes the moderated one: approvals under
    // the old plan no longer govern, so assembly refuses instead of
    // accepting ungoverned (Moodle-direct) inputs.
    const drafted = await post(
      '/plans',
      { idempotencyKey: key(), ...mkPlan() },
      lecB,
    ).expect(201);
    const plan = drafted.body as { id: string; version: number };
    await post(
      `/plans/${plan.id}/approve`,
      { idempotencyKey: key(), version: plan.version },
      coordB,
    ).expect(201);
    const res = await assemble(lecB);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('UNMODERATED_COMPONENT');
  });

  it('decision-expired: an expired examinations grant fails safe', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2], lecB);
    const pkg = (
      await assemble(lecB).expect(201)
    ).body as { id: string; version: number };
    await db.roleAssignment.updateMany({
      where: { accountId: examAccountId, role: 'EXAMINATIONS_OFFICER' },
      data: { endsAt: new Date('2020-01-01T00:00:00Z') },
    });
    try {
      const denied = await decide(exam, pkg.id, {
        version: pkg.version,
        to: 'APPROVE_FOR_RELEASE',
        reason: 'Board minute 12.',
      });
      expect(denied.status).toBe(403);
      expect(
        await db.boardDecision.count({ where: { packageId: pkg.id } }),
      ).toBe(0);
    } finally {
      await db.roleAssignment.updateMany({
        where: { accountId: examAccountId, role: 'EXAMINATIONS_OFFICER' },
        data: { endsAt: null },
      });
    }
  });

  it('decision-transitions: defer, refer and clarify record; deferrals resubmit as new versions', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2], lecB);
    const first = (
      await assemble(lecB).expect(201)
    ).body as { id: string; version: number };
    const deferred = await decide(exam, first.id, {
      version: first.version,
      to: 'DEFER',
      reason: 'Awaiting external examiner note.',
    }).expect(201);
    expect((deferred.body as { status: string }).status).toBe('DEFER');
    // The decision bumps the package version; decided packages then keep
    // their outcome, and the deferral re-submits as the next version.
    const deferredVersion = (deferred.body as { version: number }).version;
    const closed = await decide(exam, first.id, {
      version: deferredVersion,
      to: 'APPROVE_FOR_RELEASE',
      reason: 'Board minute 13.',
    });
    expect(closed.status).toBe(409);
    expect(closed.body.code).toBe('REQUEST_CLOSED');
    // The deferral re-submits as a new version, which the board refers.
    const second = (
      await assemble(lecB).expect(201)
    ).body as { id: string; version: number };
    expect(second.version).toBe(deferredVersion + 1);
    const referred = await decide(exam, second.id, {
      version: second.version,
      to: 'REFER',
      reason: 'Refer to the progression board.',
    }).expect(201);
    expect((referred.body as { status: string }).status).toBe('REFER');
    // And again for clarification.
    const third = (
      await assemble(lecB).expect(201)
    ).body as { id: string; version: number };
    const clarified = await decide(exam, third.id, {
      version: third.version,
      to: 'CLARIFY',
      reason: 'Clarify the absence evidence.',
    }).expect(201);
    expect((clarified.body as { status: string }).status).toBe('CLARIFY');
  });

  it('weighted-preview: numeric zero is genuine, nulls never zero-fill', async () => {
    await provisionCandidates([known1, known2]);
    await fullyModeratedScope([known1, known2], lecB);
    const res = await assemble(lecB).expect(201);
    const trace = (
      res.body as {
        trace: { students: Array<{ rounded: number }> };
      }
    ).trace;
    for (const row of trace.students) {
      expect(Number.isFinite(row.rounded)).toBe(true);
    }
    // Official CA rows carry real marks; no zero-filled placeholders.
    const zeros = await db.officialCARecord.count({
      where: {
        offeringRef: OFFERING_REF,
        periodCode: PERIOD_CODE,
        mark: 0,
      },
    });
    expect(zeros).toBe(0);
  });
});
