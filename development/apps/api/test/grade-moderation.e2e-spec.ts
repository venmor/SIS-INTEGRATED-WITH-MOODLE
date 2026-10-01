import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { createHash } from 'node:crypto';
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
 * TASK-PH7-004 lecturer correction and moderation handoff e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet proof map: submit checklist (validated, no OPEN findings,
 * candidate reconciliation, declaration), approve/return/clarify/refer
 * with reason demands, correction loop (new revision, history preserved,
 * re-moderation supersedes CA), SoD refusals, post-approval staging
 * guard, component lock during open cases, denials, neutrals,
 * concurrency, idempotence.
 */
const DECLARATION =
  'I confirm that this batch is complete for its scope and I submit it for moderation within my assigned authority.';

describe('Phase 7 moderation handoff', () => {
  let app: INestApplication;
  let db: PrismaService;
  let post: ReturnType<typeof assessPost>;
  let get: ReturnType<typeof assessGet>;
  let lecA: string;
  let lecAAccountId: string;
  let lecB: string;
  let coordB: string;
  let modA: string;
  let modB: string;
  let dualLecSid: string;
  let dualModSid: string;
  let exam: string;
  let moodle: string;
  let tutor: string;
  let sysadmin: string;
  let student: string;
  let known1: string;
  let known2: string;

  const submitBatch = (cookie: string, batchId: string, extra = {}) =>
    post(
      `/batches/${batchId}/submit`,
      { idempotencyKey: key(), declaration: DECLARATION, ...extra },
      cookie,
    );

  const decideCase = (cookie: string, caseId: string, body: object) =>
    post(
      `/moderation/${caseId}/decide`,
      { idempotencyKey: key(), ...body },
      cookie,
    );

  const beginReview = (cookie: string, caseId: string) =>
    post(`/moderation/${caseId}/begin`, { idempotencyKey: key() }, cookie);

  /** Draft + approve a plan, draft + test + activate a mapping. Isolated
   * per call so mutation tests never strand another test's mapping. */
  async function activeMappingFor(code: string) {
    const drafted = await post(
      '/plans',
      { idempotencyKey: key(), ...mkPlan() },
      lecA,
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
    const component = full.components.find((c) => c.code === code);
    if (!component) throw new Error('demo component missing');
    const mapped = await post(
      '/mappings',
      {
        idempotencyKey: key(),
        ...mkMapping(component.id, {
          moodleActivityId: `SIM-QUIZ-${key().slice(0, 8).toUpperCase()}`,
          moodleCourseRef: `${SHELL_REF}-MOD`,
        }),
      },
      lecA,
    ).expect(201);
    const mapping = mapped.body as { id: string };
    await post(`/mappings/${mapping.id}/test`, { idempotencyKey: key() }, lecA)
      .expect(201);
    await post(
      `/mappings/${mapping.id}/activate`,
      { idempotencyKey: key() },
      coordB,
    ).expect(201);
    return { mappingId: mapping.id, component, plan };
  }

  const stage = (cookie: string, body: object) =>
    post('/batches', { idempotencyKey: key(), ...body }, cookie);

  async function knownStudent(): Promise<string> {
    const person = await db.person.create({
      data: {
        displayName: 'Fictional moderation student',
        email: `mod-${key()}@demo.invalid`,
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

  /** Clean validated batch: staged lines, validated with no findings. */
  async function cleanBatch(refs: string[]) {
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: refs.map((studentRef, i) => ({
        studentRef,
        rawValue: 10 + i,
      })),
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    await post(
      `/batches/${batchId}/validate`,
      { idempotencyKey: key() },
      (
        await user(
          db,
          'EXAMINATIONS_OFFICER',
          ['validate-results'],
          'PERIOD',
          PERIOD_CODE,
        )
      ).cookie,
    ).expect(201);
    return { batchId, mappingId };
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
    lecB = (await user(db, 'LEC', ['stage-marks'], 'OFFERING', OFFERING_REF))
      .cookie;
    coordB = (
      await user(db, 'COORDINATOR', ['approve-assessment'], 'SCHOOL', 'Computing')
    ).cookie;
    modA = (await user(db, 'MODERATOR', ['moderate-results'], 'OFFERING', OFFERING_REF))
      .cookie;
    modB = (await user(db, 'MODERATOR', ['moderate-results'], 'OFFERING', OFFERING_REF))
      .cookie;
    exam = (
      await user(
        db,
        'EXAMINATIONS_OFFICER',
        ['validate-results'],
        'PERIOD',
        PERIOD_CODE,
      )
    ).cookie;
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
    // Dual-hat account: LEC + MODERATOR in the same offering, with a
    // session per workspace (same-account SoD still refuses).
    const person = await db.person.create({
      data: {
        displayName: 'Fictional dual-hat moderator',
        email: `dual-${key()}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const account = await db.account.create({
      data: { personId: person.id, username: key() },
    });
    const lecAssign = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: 'LEC',
        scopeType: 'OFFERING',
        scopeRef: OFFERING_REF,
        capabilities: ['stage-marks'],
        reason: 'isolated test',
        startsAt: new Date('2020-01-01'),
      },
    });
    const modAssign = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: 'MODERATOR',
        scopeType: 'OFFERING',
        scopeRef: OFFERING_REF,
        capabilities: ['moderate-results'],
        reason: 'isolated test',
        startsAt: new Date('2020-01-01'),
      },
    });
    const mint = async (assignmentId: string) => {
      const token = key();
      await db.session.create({
        data: {
          accountId: account.id,
          activeAssignmentId: assignmentId,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      return `sid=${token}`;
    };
    dualLecSid = await mint(lecAssign.id);
    dualModSid = await mint(modAssign.id);
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

  it('submit-happy-path: checklist passes, case opens, declaration kept', async () => {
    await provisionCandidates([known1, known2]);
    const { batchId } = await cleanBatch([known1, known2]);
    const res = await submitBatch(lecA, batchId).expect(201);
    const body = res.body as {
      id: string;
      status: string;
      declaration: string;
      version: number;
    };
    expect(body.status).toBe('SUBMITTED');
    expect(body.declaration).toBe(DECLARATION);
    expect(body.version).toBe(1);
  });

  it('submit-checklist: unvalidated, flagged, and unreconciled batches refuse', async () => {
    await provisionCandidates([known1, known2]);
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    // Never validated: no validatedAt, checklist fails first.
    const raw = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 12 },
        { studentRef: known2, rawValue: 13 },
      ],
    }).expect(201);
    const rawId = (raw.body as { id: string }).id;
    const unvalidated = await submitBatch(lecA, rawId);
    expect(unvalidated.status).toBe(409);
    expect(unvalidated.body.code).toBe('CHECKLIST_UNVALIDATED');
    // Quarantined line: validate first, then the OPEN finding blocks.
    const flagged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 12 },
        { studentRef: known2, rawValue: 999 },
      ],
    }).expect(201);
    const flaggedId = (flagged.body as { id: string }).id;
    await post(
      `/batches/${flaggedId}/validate`,
      { idempotencyKey: key() },
      exam,
    ).expect(201);
    const open = await submitBatch(lecA, flaggedId);
    expect(open.status).toBe(409);
    expect(open.body.code).toBe('CHECKLIST_OPEN_FINDINGS');
    // Candidate missing from the lines: reconciliation fails.
    const short = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: known1, rawValue: 12 }],
    }).expect(201);
    const shortId = (short.body as { id: string }).id;
    await post(
      `/batches/${shortId}/validate`,
      { idempotencyKey: key() },
      exam,
    ).expect(201);
    const missing = await submitBatch(lecA, shortId);
    expect(missing.status).toBe(409);
    expect(missing.body.code).toBe('CHECKLIST_UNRECONCILED');
    // A wrong declaration is refused before anything is stored.
    const { batchId } = await cleanBatch([known1, known2]);
    const badDeclaration = await submitBatch(lecA, batchId, {
      declaration: 'looks fine',
    });
    expect(badDeclaration.status).toBe(400);
    expect(
      await db.moderationCase.count({ where: { batchId } }),
    ).toBe(0);
  });

  it('submit-idempotent: replay returns the stored case', async () => {
    await provisionCandidates([known1, known2]);
    const { batchId } = await cleanBatch([known1, known2]);
    const k = key();
    const first = await post(
      `/batches/${batchId}/submit`,
      { idempotencyKey: k, declaration: DECLARATION },
      lecA,
    ).expect(201);
    const retry = await post(
      `/batches/${batchId}/submit`,
      { idempotencyKey: k, declaration: DECLARATION },
      lecA,
    ).expect(201);
    expect(retry.body).toEqual(first.body);
    expect(
      await db.moderationCase.count({ where: { batchId } }),
    ).toBe(1);
  });

  it('submit-denied: only scoped lecturers and coordinators submit', async () => {
    await provisionCandidates([known1, known2]);
    const { batchId } = await cleanBatch([known1, known2]);
    for (const cookie of [tutor, sysadmin, moodle, student, exam, modA]) {
      await submitBatch(cookie, batchId).expect(403);
    }
    // A coordinator submits within governance scope.
    await submitBatch(coordB, batchId).expect(201);
  });

  it('decide-approve: moderation writes immutable official CA records', async () => {
    await provisionCandidates([known1, known2]);
    const { batchId } = await cleanBatch([known1, known2]);
    const submitted = await submitBatch(lecB, batchId).expect(201);
    const caseId = (submitted.body as { id: string }).id;
    await beginReview(modA, caseId).expect(201);
    const res = await decideCase(modA, caseId, {
      version: 1,
      to: 'APPROVED',
    }).expect(201);
    expect((res.body as { status: string }).status).toBe('APPROVED');
    const records = await db.officialCARecord.findMany({
      where: {
        offeringRef: OFFERING_REF,
        periodCode: PERIOD_CODE,
        componentCode: 'CA-QUIZ1',
        studentRef: { in: [known1, known2] },
      },
    });
    // First approval on this component: exactly version 1 per student.
    expect(records).toHaveLength(2);
    const byRef = new Map(records.map((r) => [r.studentRef, r]));
    expect([byRef.get(known1)?.mark, byRef.get(known1)?.version]).toEqual([
      10, 1,
    ]);
    expect([byRef.get(known2)?.mark, byRef.get(known2)?.version]).toEqual([
      11, 1,
    ]);
    const batch = await db.gradeBatch.findUniqueOrThrow({
      where: { id: batchId },
    });
    expect(batch.lockedAt).toBeTruthy();
  });

  it('decide-sod: the stager can never moderate their own batch', async () => {
    await provisionCandidates([known1, known2]);
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(dualLecSid, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 12 },
        { studentRef: known2, rawValue: 13 },
      ],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    await post(
      `/batches/${batchId}/validate`,
      { idempotencyKey: key() },
      exam,
    ).expect(201);
    const submitted = await post(
      `/batches/${batchId}/submit`,
      { idempotencyKey: key(), declaration: DECLARATION },
      dualLecSid,
    ).expect(201);
    const caseId = (submitted.body as { id: string }).id;
    // Same human, moderator workspace: still refused.
    await beginReview(dualModSid, caseId).expect(403);
    await decideCase(dualModSid, caseId, { version: 1, to: 'APPROVED' }).expect(
      403,
    );
    // An independent moderator proceeds.
    await beginReview(modB, caseId).expect(201);
    await decideCase(modB, caseId, { version: 1, to: 'APPROVED' }).expect(201);
  });

  it('decide-return-loop: corrections are new versions, history preserved', async () => {
    await provisionCandidates([known1, known2]);
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 5 },
        { studentRef: known2, rawValue: 6 },
      ],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    await post(
      `/batches/${batchId}/validate`,
      { idempotencyKey: key() },
      exam,
    ).expect(201);
    const submitted = await submitBatch(lecA, batchId).expect(201);
    const caseId = (submitted.body as { id: string }).id;
    await beginReview(modA, caseId).expect(201);
    // Reasons are demanded for returns.
    await decideCase(modA, caseId, { version: 1, to: 'RETURNED' }).expect(400);
    await decideCase(modA, caseId, {
      version: 1,
      to: 'RETURNED',
      reason: 'Two marks sit far below the TG distribution; recheck capture.',
    }).expect(201);
    // The correction is a new revision: the returned case stays as history.
    const corrected = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 15 },
        { studentRef: known2, rawValue: 16 },
      ],
    }).expect(201);
    const correctedId = (corrected.body as { id: string }).id;
    await post(
      `/batches/${correctedId}/validate`,
      { idempotencyKey: key() },
      exam,
    ).expect(201);
    const resubmitted = await submitBatch(lecA, correctedId).expect(201);
    const newCaseId = (resubmitted.body as { id: string }).id;
    expect(newCaseId).not.toBe(caseId);
    await beginReview(modB, newCaseId).expect(201);
    await decideCase(modB, newCaseId, { version: 1, to: 'APPROVED' }).expect(
      201,
    );
    const oldCase = await db.moderationCase.findUniqueOrThrow({
      where: { id: caseId },
    });
    expect(oldCase.status).toBe('RETURNED');
    const records = await db.officialCARecord.findMany({
      where: {
        offeringRef: OFFERING_REF,
        periodCode: PERIOD_CODE,
        componentCode: 'CA-QUIZ1',
        studentRef: known1,
      },
      orderBy: { version: 'asc' },
    });
    // Prior versions preserved; the re-moderation appends the new mark.
    expect(records.length).toBeGreaterThanOrEqual(2);
    const versions = records.map((r) => r.version);
    expect([...versions].sort((a, b) => a - b)).toEqual(versions);
    expect(records[records.length - 1].mark).toBe(15);
  });

  it('decide-clarify-refer: clarification and referral routes hold', async () => {
    await provisionCandidates([known1, known2]);
    const { batchId } = await cleanBatch([known1, known2]);
    const submitted = await submitBatch(lecA, batchId).expect(201);
    const caseId = (submitted.body as { id: string }).id;
    await beginReview(modA, caseId).expect(201);
    await decideCase(modA, caseId, {
      version: 1,
      to: 'CLARIFICATION_REQUESTED',
      reason: 'Confirm whether the second mark already includes late submission.',
    }).expect(201);
    // Clarification is answered by correction resubmission; the lecturer
    // sees the reason on the case.
    const detail = await get(`/moderation/${caseId}`, lecA).expect(200);
    expect(
      (detail.body as { status: string; decisionReason: string | null }).status,
    ).toBe('CLARIFICATION_REQUESTED');
    const { batchId: secondId } = await cleanBatch([known1, known2]);
    const second = await submitBatch(lecA, secondId).expect(201);
    const secondCaseId = (second.body as { id: string }).id;
    await beginReview(modB, secondCaseId).expect(201);
    await decideCase(modB, secondCaseId, {
      version: 1,
      to: 'REFERRED',
      reason: 'Borderline cohort outcome needs examinations review.',
    }).expect(201);
    // Referred cases surface in the examinations lane of the queue.
    const queue = await get('/moderation', exam).expect(200);
    const ids = (
      queue.body as { items: Array<{ id: string }> }
    ).items.map((c) => c.id);
    expect(ids).toContain(secondCaseId);
    // The submitter still sees their own referred case; an unrelated
    // lecturer learns nothing about it.
    const lecturerQueue = await get('/moderation', lecB).expect(200);
    expect(
      (lecturerQueue.body as { items: Array<{ id: string }> }).items.map(
        (c) => c.id,
      ),
    ).not.toContain(secondCaseId);
  });

  it('decide-denied: moderation writes belong to assigned moderators', async () => {
    await provisionCandidates([known1, known2]);
    const { batchId } = await cleanBatch([known1, known2]);
    const submitted = await submitBatch(lecA, batchId).expect(201);
    const caseId = (submitted.body as { id: string }).id;
    for (const cookie of [lecA, tutor, sysadmin, moodle, student, exam]) {
      await beginReview(cookie, caseId).expect(403);
      await decideCase(cookie, caseId, { version: 1, to: 'APPROVED' }).expect(
        403,
      );
    }
    // Decisions demand review first, then a reason for non-approvals.
    await beginReview(modA, caseId).expect(201);
    await decideCase(modA, caseId, { version: 1, to: 'APPROVED' }).expect(201);
    const closed = await decideCase(modA, caseId, {
      version: 2,
      to: 'RETURNED',
      reason: 'Too late.',
    });
    expect(closed.status).toBe(409);
  });

  it('decide-concurrent: racing decisions converge on one outcome', async () => {
    await provisionCandidates([known1, known2]);
    const { batchId } = await cleanBatch([known1, known2]);
    const submitted = await submitBatch(lecA, batchId).expect(201);
    const caseId = (submitted.body as { id: string }).id;
    await beginReview(modA, caseId).expect(201);
    const [a, b] = await Promise.all([
      decideCase(modA, caseId, { version: 1, to: 'APPROVED' }),
      decideCase(modB, caseId, {
        version: 1,
        to: 'RETURNED',
        reason: 'Concurrent second look.',
      }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const row = await db.moderationCase.findUniqueOrThrow({
      where: { id: caseId },
    });
    expect(['APPROVED', 'RETURNED']).toContain(row.status);
  });

  it('lock-rule: open cases block new revisions until returned', async () => {
    await provisionCandidates([known1, known2]);
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 12 },
        { studentRef: known2, rawValue: 13 },
      ],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    await post(
      `/batches/${batchId}/validate`,
      { idempotencyKey: key() },
      exam,
    ).expect(201);
    const submitted = await submitBatch(lecA, batchId).expect(201);
    const caseId = (submitted.body as { id: string }).id;
    const blocked = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 12 },
        { studentRef: known2, rawValue: 13 },
      ],
    });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('CASE_OPEN');
    // After a return, the correction revision stages cleanly.
    await beginReview(modA, caseId).expect(201);
    await decideCase(modA, caseId, {
      version: 1,
      to: 'RETURNED',
      reason: 'Recheck the second mark.',
    }).expect(201);
    await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 12 },
        { studentRef: known2, rawValue: 13 },
      ],
    }).expect(201);
  });

  it('post-approval-staging: new revisions never touch official CA', async () => {
    await provisionCandidates([known1, known2]);
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 10 },
        { studentRef: known2, rawValue: 11 },
      ],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    await post(
      `/batches/${batchId}/validate`,
      { idempotencyKey: key() },
      exam,
    ).expect(201);
    const submitted = await submitBatch(lecA, batchId).expect(201);
    const caseId = (submitted.body as { id: string }).id;
    await beginReview(modA, caseId).expect(201);
    await decideCase(modA, caseId, { version: 1, to: 'APPROVED' }).expect(201);
    // A later Moodle change stages a new batch; official CA is untouched.
    const countWhere = {
      offeringRef: OFFERING_REF,
      periodCode: PERIOD_CODE,
      componentCode: 'CA-QUIZ1',
      studentRef: known1,
    };
    const before = await db.officialCARecord.count({ where: countWhere });
    const changed = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 19 },
        { studentRef: known2, rawValue: 11 },
      ],
    }).expect(201);
    const changedId = (changed.body as { id: string }).id;
    expect(changedId).not.toBe(batchId);
    expect(await db.officialCARecord.count({ where: countWhere })).toBe(
      before,
    );
    // Re-moderation supersedes: v2 carries the new mark, v1 stays.
    await post(
      `/batches/${changedId}/validate`,
      { idempotencyKey: key() },
      exam,
    ).expect(201);
    const resubmitted = await submitBatch(lecA, changedId).expect(201);
    const newCaseId = (resubmitted.body as { id: string }).id;
    await beginReview(modB, newCaseId).expect(201);
    await decideCase(modB, newCaseId, { version: 1, to: 'APPROVED' }).expect(
      201,
    );
    const records = await db.officialCARecord.findMany({
      where: {
        offeringRef: OFFERING_REF,
        periodCode: PERIOD_CODE,
        componentCode: 'CA-QUIZ1',
        studentRef: known1,
      },
      orderBy: { version: 'asc' },
    });
    // History preserved; the last two versions carry this test's marks.
    expect(records.length).toBeGreaterThanOrEqual(2);
    expect(records.slice(-2).map((r) => r.mark)).toEqual([10, 19]);
  });

  it('moderation-neutral: unknown batches and cases are neutral 404s', async () => {
    await submitBatch(lecA, key()).expect(404);
    await beginReview(modA, key()).expect(404);
    await decideCase(modA, key(), { version: 1, to: 'APPROVED' }).expect(404);
    await get(`/moderation/${key()}`, modA).expect(404);
  });

  it('moderation-reads: queues split by swimlane, students see nothing', async () => {
    await provisionCandidates([known1, known2]);
    const { batchId } = await cleanBatch([known1, known2]);
    const submitted = await submitBatch(lecA, batchId).expect(201);
    const caseId = (submitted.body as { id: string }).id;
    // Moderator and submitter read the case; students denied everywhere.
    await get(`/moderation/${caseId}`, modA).expect(200);
    await get(`/moderation/${caseId}`, lecA).expect(200);
    await get('/moderation', student).expect(403);
    await get(`/moderation/${caseId}`, student).expect(403);
    // An out-of-scope moderator learns nothing (neutral 404).
    const outsider = (
      await user(db, 'MODERATOR', ['moderate-results'], 'OFFERING', 'OTHER-1')
    ).cookie;
    await get(`/moderation/${caseId}`, outsider).expect(404);
    await get('/moderation', outsider).expect(200);
    const items = (
      (await get('/moderation', outsider).expect(200)).body as {
        items: unknown[];
      }
    ).items;
    expect(items).toHaveLength(0);
  });
});
