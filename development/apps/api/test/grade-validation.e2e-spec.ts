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
 * TASK-PH7-003 validation and missing-mark queue e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet proof map: per-code findings (MISSING_MARK, DUPLICATE,
 * OUT_OF_RANGE, UNMAPPED, MOODLE_ONLY, SCALE_MISMATCH, STALE_MAPPING,
 * STRUCTURALLY_INVALID), partial-preserves-valid, missing-mark work item
 * + no-zero assertion, swimlane visibility, replay without duplicating,
 * decline reasons, denials (incl. students everywhere, expired role),
 * neutrals, concurrent-transition conflict.
 */
describe('Phase 7 validation and missing-mark queue', () => {
  let app: INestApplication;
  let db: PrismaService;
  let post: ReturnType<typeof assessPost>;
  let get: ReturnType<typeof assessGet>;
  let lecA: string;
  let coordB: string;
  let exam: string;
  let examAccountId: string;
  let moodle: string;
  let tutor: string;
  let sysadmin: string;
  let student: string;
  let known1: string;
  let known2: string;

  const validate = (cookie: string, batchId: string, k = key()) =>
    post(`/batches/${batchId}/validate`, { idempotencyKey: k }, cookie);

  /** Draft + approve a plan, draft + test + activate a mapping. Isolated
   * per call so mutation tests never strand another test's mapping. */
  async function activeMappingFor(code: string, activitySuffix = key()) {
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
          moodleActivityId: `SIM-QUIZ-${activitySuffix.slice(0, 8).toUpperCase()}`,
          moodleCourseRef: `${SHELL_REF}-VAL`,
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
        displayName: 'Fictional validation student',
        email: `valid-${key()}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    const ref = `STU-2026-${key().slice(0, 8).toUpperCase()}`;
    await db.student.create({
      data: { personId: person.id, studentNumber: ref },
    });
    return ref;
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
    lecA = (await user(db, 'LEC', ['stage-marks'], 'OFFERING', OFFERING_REF))
      .cookie;
    coordB = (
      await user(db, 'COORDINATOR', ['approve-assessment'], 'SCHOOL', 'Computing')
    ).cookie;
    const officer = await user(
      db,
      'EXAMINATIONS_OFFICER',
      ['validate-results'],
      'PERIOD',
      PERIOD_CODE,
    );
    exam = officer.cookie;
    examAccountId = officer.accountId;
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
      where: { id: '00000000-0000-0000-0000-000000000009' },
      update: { status: 'ACTIVE', moodleId: `${SHELL_REF}-VAL` },
      create: {
        id: '00000000-0000-0000-0000-000000000009',
        kind: 'SHELL',
        sisType: 'OFFERING',
        sisId: `${offering.id}:${PERIOD_CODE}`,
        moodleId: `${SHELL_REF}-VAL`,
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

  it('validate-happy-path: per-code findings with work items, valid lines kept', async () => {
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const ghost = `GHOST-${key().slice(0, 8)}`;
    const ghost2 = `GHOST2-${key().slice(0, 8)}`;
    const ghost3 = `GHOST3-${key().slice(0, 8)}`;
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 17 },
        { studentRef: ghost, rawValue: 12 },
        { studentRef: ghost2, rawValue: 999 },
        { studentRef: ghost3, rawValue: 5, outcome: 'MADE_UP' },
        { studentRef: known2, outcome: 'MISSING_MARK' },
      ],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    const res = await validate(exam, batchId).expect(201);
    const codes = (
      (res.body as { findings: Array<{ code: string }> }).findings ?? []
    )
      .map((f) => f.code)
      .sort();
    expect(codes).toEqual(
      [
        'MISSING_MARK',
        'MOODLE_ONLY',
        'OUT_OF_RANGE',
        'STRUCTURALLY_INVALID',
      ].sort(),
    );
    // Missing-mark work item: responsible unit + escalation deadline, and
    // the batch result reflects MISSING_MARKS without storing a zero.
    const missing = (
      res.body as {
        findings: Array<{
          code: string;
          ownerUnit: string | null;
          escalationDeadline: string | null;
        }>;
      }
    ).findings.find((f) => f.code === 'MISSING_MARK');
    expect(missing?.ownerUnit).toBeTruthy();
    expect(missing?.escalationDeadline).toBeTruthy();
    expect((res.body as { resultState: string | null }).resultState).toBe(
      'MISSING_MARKS',
    );
    const missingLines = await db.gradeLine.findMany({
      where: { batchId, outcome: 'MISSING_MARK' },
    });
    expect(missingLines).toHaveLength(1);
    expect(missingLines[0].rawValue).toBeNull();
    expect(missingLines[0].convertedValue).toBeNull();
    // Partial import: the valid line survives validation untouched.
    const valid = await db.gradeLine.findFirstOrThrow({
      where: { batchId, studentRef: known1 },
    });
    expect(valid.status).toBe('STAGED');
    expect(valid.convertedValue).toBe(17);
    expect(valid.flagCode).toBeNull();
  });

  it('validate-duplicate: repeated students become DUPLICATE findings', async () => {
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 15 },
        { studentRef: known1, rawValue: 15 },
      ],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    const res = await validate(exam, batchId).expect(201);
    const codes = (
      res.body as { findings: Array<{ code: string }> }
    ).findings.map((f) => f.code);
    expect(codes).toEqual(['DUPLICATE']);
  });

  it('validate-idempotent: replay returns stored findings, adds nothing', async () => {
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: `GHOST-${key().slice(0, 8)}`, rawValue: 14 }],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    const k = key();
    const first = await validate(exam, batchId, k).expect(201);
    const retry = await validate(exam, batchId, k).expect(201);
    expect(retry.body).toEqual(first.body);
    expect(
      await db.gradeFinding.count({ where: { batchId } }),
    ).toBe(
      (first.body as { findings: unknown[] }).findings.length,
    );
    // A fresh key re-validates but converges: no duplicate findings.
    await validate(exam, batchId).expect(201);
    expect(await db.gradeFinding.count({ where: { batchId } })).toBe(
      (first.body as { findings: unknown[] }).findings.length,
    );
  });

  it('validate-stale: a superseded mapping flags STALE_MAPPING', async () => {
    const first = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId: first.mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: known1, rawValue: 11 }],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    // A newer activation on the same component expires the mapping the
    // batch was staged through while the plan stays approved.
    const second = await post(
      '/mappings',
      {
        idempotencyKey: key(),
        ...mkMapping(first.component.id, {
          moodleActivityId: `SIM-QUIZ-${key().slice(0, 8).toUpperCase()}`,
          moodleCourseRef: `${SHELL_REF}-VAL`,
        }),
      },
      lecA,
    ).expect(201);
    const secondId = (second.body as { id: string }).id;
    await post(`/mappings/${secondId}/test`, { idempotencyKey: key() }, lecA)
      .expect(201);
    await post(
      `/mappings/${secondId}/activate`,
      { idempotencyKey: key() },
      coordB,
    ).expect(201);
    const res = await validate(exam, batchId).expect(201);
    const codes = (
      res.body as { findings: Array<{ code: string }> }
    ).findings.map((f) => f.code);
    expect(codes).toContain('STALE_MAPPING');
    expect(codes).not.toContain('UNMAPPED');
  });

  it('validate-unmapped: a superseded plan flags UNMAPPED', async () => {
    const { mappingId, plan } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: known1, rawValue: 11 }],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    // Approving a newer plan version strands this batch outside any
    // approved component: its lines are effectively unmapped.
    const drafted = await post(
      '/plans',
      {
        idempotencyKey: key(),
        ...mkPlan(),
        components: [
          { code: 'CA-QUIZ1', maxMark: 20, weight: 20 },
          { code: 'CA-ASSIGN', maxMark: 30, weight: 20 },
          { code: 'FINAL-EXAM', maxMark: 100, weight: 60 },
        ],
      },
      lecA,
    ).expect(201);
    const next = drafted.body as { id: string; version: number };
    expect(next.version).toBeGreaterThan(plan.version);
    await post(
      `/plans/${next.id}/approve`,
      { idempotencyKey: key(), version: next.version },
      coordB,
    ).expect(201);
    const res = await validate(exam, batchId).expect(201);
    const codes = (
      res.body as { findings: Array<{ code: string }> }
    ).findings.map((f) => f.code);
    expect(codes).toContain('UNMAPPED');
  });

  it('validate-scale: a drifted scale flags SCALE_MISMATCH', async () => {
    const { mappingId, component } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: known1, rawValue: 11 }],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    await db.assessmentComponent.update({
      where: { id: component.id },
      data: { scaleRef: 'A-F' },
    });
    const res = await validate(exam, batchId).expect(201);
    const codes = (
      res.body as { findings: Array<{ code: string }> }
    ).findings.map((f) => f.code);
    expect(codes).toContain('SCALE_MISMATCH');
  });

  it('validate-swimlanes: each role sees only its lane', async () => {
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: known1, rawValue: 17 },
        { studentRef: `GHOST-${key().slice(0, 8)}`, rawValue: 12 },
        { studentRef: known2, outcome: 'MISSING_MARK' },
      ],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    await validate(exam, batchId).expect(201);
    const codesOf = async (cookie: string, query = '') => {
      const listed = await get(`/findings?batchId=${batchId}${query}`, cookie).expect(200);
      return (
        (listed.body as { items: Array<{ code: string }> }).items.map(
          (f) => f.code,
        )
      ).sort();
    };
    // Moodle admins see technical errors only; the clean academic batch
    // has none, and the academic finding detail stays neutral-hidden.
    expect(await codesOf(moodle)).toEqual([]);
    const academic = await get('/findings', lecA).expect(200);
    const academicCodes = (
      academic.body as { items: Array<{ code: string }> }
    ).items.map((f) => f.code);
    expect(academicCodes).toContain('MISSING_MARK');
    expect(academicCodes).not.toContain('MOODLE_ONLY');
    // Enrolment truth lives in the Registry lane: lecturers never see it.
    const moodleOnly = (
      (await get('/findings', exam).expect(200)).body as {
        items: Array<{ id: string; code: string }>;
      }
    ).items.find((f) => f.code === 'MOODLE_ONLY');
    expect(moodleOnly?.id).toBeTruthy();
    await get(`/findings/${moodleOnly?.id}`, lecA).expect(404);
    await get(`/findings/${moodleOnly?.id}`, moodle).expect(404);
    await get(`/findings/${moodleOnly?.id}`, exam).expect(200);
    // Students see nothing, anywhere.
    await get('/findings', student).expect(403);
    await get(`/findings/${moodleOnly?.id}`, student).expect(403);
  });

  it('finding-transition: version-checked triage with reasons', async () => {
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: known2, outcome: 'MISSING_MARK' }],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    const validated = await validate(exam, batchId).expect(201);
    const finding = (
      validated.body as {
        findings: Array<{ id: string; version: number; status: string }>;
      }
    ).findings[0];
    expect(finding.status).toBe('OPEN');
    const transition = (cookie: string, body: object) =>
      post(`/findings/${finding.id}/transition`, {
        idempotencyKey: key(),
        ...body,
      }, cookie);
    // Lecturers operate nothing in the queue.
    await transition(lecA, { version: 1, to: 'ACKNOWLEDGED' }).expect(403);
    // Resolve/dismiss demand a reason; concurrent edits conflict.
    await transition(exam, { version: 1, to: 'RESOLVED' }).expect(400);
    await transition(exam, { version: 1, to: 'ACKNOWLEDGED' }).expect(201);
    const stale = await transition(exam, {
      version: 1,
      to: 'RESOLVED',
      reason: 'Lecturer will correct in a new revision.',
    });
    expect(stale.status).toBe(409);
    await transition(exam, {
      version: 2,
      to: 'RESOLVED',
      reason: 'Lecturer will correct in a new revision.',
    }).expect(201);
    const row = await db.gradeFinding.findUniqueOrThrow({
      where: { id: finding.id },
    });
    expect(row.status).toBe('RESOLVED');
    expect(row.resolveReason).toBeTruthy();
  });

  it('finding-concurrent: racing triage converges on one outcome', async () => {
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: known2, outcome: 'MISSING_MARK' }],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    const validated = await validate(exam, batchId).expect(201);
    const finding = (
      validated.body as { findings: Array<{ id: string }> }
    ).findings[0];
    const transition = (cookie: string, body: object) =>
      post(`/findings/${finding.id}/transition`, {
        idempotencyKey: key(),
        ...body,
      }, cookie);
    const [a, b] = await Promise.all([
      transition(exam, { version: 1, to: 'ACKNOWLEDGED' }),
      transition(exam, {
        version: 1,
        to: 'RESOLVED',
        reason: 'Concurrent second look.',
      }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });

  it('validate-denied: staging roles, admins and students validate nothing', async () => {
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: known1, rawValue: 7 }],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    for (const cookie of [lecA, tutor, sysadmin, moodle, student]) {
      await validate(cookie, batchId).expect(403);
    }
  });

  it('validate-expired: an expired examinations grant fails safe', async () => {
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const staged = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: known1, rawValue: 7 }],
    }).expect(201);
    const batchId = (staged.body as { id: string }).id;
    await db.roleAssignment.updateMany({
      where: { accountId: examAccountId, role: 'EXAMINATIONS_OFFICER' },
      data: { endsAt: new Date('2020-01-01T00:00:00Z') },
    });
    try {
      await validate(exam, batchId).expect(403);
    } finally {
      await db.roleAssignment.updateMany({
        where: { accountId: examAccountId, role: 'EXAMINATIONS_OFFICER' },
        data: { endsAt: null },
      });
    }
  });

  it('validate-neutral: unknown batches and findings are neutral 404s', async () => {
    await validate(exam, key()).expect(404);
    await get(`/findings/${key()}`, exam).expect(404);
  });

  it('validate-correction: lecturers correct by new revision, never by edit', async () => {
    const { mappingId } = await activeMappingFor('CA-QUIZ1');
    const first = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: known2, outcome: 'MISSING_MARK' }],
    }).expect(201);
    const firstId = (first.body as { id: string }).id;
    await validate(exam, firstId).expect(201);
    // The correction is a new revision: the original finding stays as
    // history while the new batch validates clean.
    const second = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: known2, rawValue: 14 }],
    }).expect(201);
    const secondId = (second.body as { id: string }).id;
    const res = await validate(exam, secondId).expect(201);
    expect(
      (res.body as { findings: unknown[] }).findings,
    ).toHaveLength(0);
    expect(
      await db.gradeFinding.count({
        where: { batchId: firstId, status: 'OPEN' },
      }),
    ).toBeGreaterThan(0);
  });
});
