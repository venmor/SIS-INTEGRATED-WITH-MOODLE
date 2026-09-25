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
 * TASK-PH7-002 Moodle grade staging snapshot e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet proof map: stage happy-path (snapshot + provenance + outbox),
 * idempotent replay returns stored batch, mismatched-key conflict,
 * unmapped/expired refusal (MAPPING_REQUIRED), Moodle-only flag (no
 * converted value), duplicate convergence, out-of-range quarantine,
 * structurally-invalid quarantine, post-approval change creates a new
 * batch without touching the prior one, denials (tutor, sysadmin,
 * moodle-admin academic write), neutrals, concurrency single-batch.
 */
describe('Phase 7 Moodle grade staging snapshot', () => {
  let app: INestApplication;
  let db: PrismaService;
  let post: ReturnType<typeof assessPost>;
  let get: ReturnType<typeof assessGet>;
  let lecA: string;
  let lecB: string;
  let coordB: string;
  let moodle: string;
  let tutor: string;
  let sysadmin: string;
  let mappingId: string;
  let maxMark: number;
  let knownStudentRef: string;

  const stage = (cookie: string, body: object) =>
    post('/batches', { idempotencyKey: key(), ...body }, cookie);

  /** Draft + approve a plan, draft + test + activate a mapping. */
  async function activeMapping() {
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
    const component = full.components.find((c) => c.code === 'CA-QUIZ1');
    if (!component) throw new Error('demo component missing');
    const mapped = await post(
      '/mappings',
      {
        idempotencyKey: key(),
        ...mkMapping(component.id, { moodleCourseRef: `${SHELL_REF}-STG` }),
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
    maxMark = component.maxMark;
    return mapping.id;
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
    lecB = (await user(db, 'LEC', ['stage-marks'], 'OFFERING', OFFERING_REF))
      .cookie;
    coordB = (
      await user(db, 'COORDINATOR', ['approve-assessment'], 'SCHOOL', 'Computing')
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
    // Known student: minimal Student row so MOODLE_ONLY logic has a true case.
    const person = await db.person.create({
      data: {
        displayName: 'Fictional staged student',
        email: `staged-${key()}@demo.invalid`,
        emailVerifiedAt: new Date(),
      },
    });
    knownStudentRef = `STU-2026-${key().slice(0, 8).toUpperCase()}`;
    await db.student.create({
      data: { personId: person.id, studentNumber: knownStudentRef },
    });
    // Synthetic SWE/OPEN offering + ACTIVE shell (Phase 6 registry reuse),
    // so mapping synthetic tests pass on unseeded databases.
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
    // Distinct shell ref/id so this suite never mutates the shared Phase 6
    // SHELL fixture used by teaching/integration suites on dirty DBs.
    await db.moodleMapping.upsert({
      where: { id: '00000000-0000-0000-0000-000000000007' },
      update: { status: 'ACTIVE', moodleId: `${SHELL_REF}-STG` },
      create: {
        id: '00000000-0000-0000-0000-000000000007',
        kind: 'SHELL',
        sisType: 'OFFERING',
        sisId: `${offering.id}:${PERIOD_CODE}`,
        moodleId: `${SHELL_REF}-STG`,
        version: 1,
        status: 'ACTIVE',
        creatorAccountId: 'SYSTEM',
        activatorAccountId: 'SYSTEM',
      },
    });
    // Academic period for the mapping synthetic test (period-known).
    await db.academicPeriod.upsert({
      where: { code: PERIOD_CODE },
      update: {},
      create: { code: PERIOD_CODE, status: 'ACTIVE' },
    });
    mappingId = await activeMapping();
  }, 120000);

  afterAll(async () => {
    await app.close();
  });

  it('stage-happy-path: immutable snapshot with provenance and outbox', async () => {
    const revision = `mdl-rev-${key()}`;
    const res = await stage(lecA, {
      mappingId,
      sourceRevision: revision,
      lines: [{ studentRef: knownStudentRef, rawValue: 17 }],
    }).expect(201);
    const batch = res.body as {
      id: string;
      status: string;
      lines: Array<{
        studentRef: string;
        rawValue: number;
        outcome: string;
        convertedValue: number | null;
        status: string;
        flagCode: string | null;
      }>;
    };
    expect(batch.status).toBe('VALIDATED');
    expect(batch.lines).toHaveLength(1);
    expect(batch.lines[0]).toMatchObject({
      studentRef: knownStudentRef,
      rawValue: 17,
      outcome: 'MARK_RECORDED',
      status: 'STAGED',
      flagCode: null,
    });
    const stored = await db.gradeBatch.findUniqueOrThrow({
      where: { id: batch.id },
      include: { lines: true },
    });
    expect(stored.mappingId).toBe(mappingId);
    expect(stored.lines).toHaveLength(1);
    const outbox = await db.outboxEvent.findFirst({
      where: { aggregate: 'GradeBatch', aggregateId: batch.id },
    });
    expect(outbox?.type).toBe('MoodleGradeTransferStaged');
  });

  it('stage-idempotent: same key returns the stored batch', async () => {
    const k = key();
    const revision = `mdl-rev-${key()}`;
    const first = await post(
      '/batches',
      {
        idempotencyKey: k,
        mappingId,
        sourceRevision: revision,
        lines: [{ studentRef: knownStudentRef, rawValue: 12 }],
      },
      lecA,
    ).expect(201);
    const second = await post(
      '/batches',
      {
        idempotencyKey: k,
        mappingId,
        sourceRevision: revision,
        lines: [{ studentRef: knownStudentRef, rawValue: 12 }],
      },
      lecA,
    ).expect(201);
    expect(second.body.id).toBe(first.body.id);
    const count = await db.gradeBatch.count({
      where: { mappingId, sourceRevision: revision },
    });
    expect(count).toBe(1);
  });

  it('stage-conflict: same key with another payload is refused', async () => {
    const k = key();
    await post(
      '/batches',
      {
        idempotencyKey: k,
        mappingId,
        sourceRevision: `mdl-rev-${key()}`,
        lines: [{ studentRef: knownStudentRef, rawValue: 10 }],
      },
      lecA,
    ).expect(201);
    const res = await post(
      '/batches',
      {
        idempotencyKey: k,
        mappingId,
        sourceRevision: `mdl-rev-${key()}`,
        lines: [{ studentRef: knownStudentRef, rawValue: 11 }],
      },
      lecA,
    );
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('stage-unmapped: DRAFT mapping refuses with MAPPING_REQUIRED', async () => {
    const full = await db.assessmentPlan.findFirstOrThrow({
      where: { offeringRef: OFFERING_REF, periodCode: PERIOD_CODE, status: 'APPROVED' },
      include: { components: true },
    });
    const component = full.components[0];
    const mapped = await post(
      '/mappings',
      { idempotencyKey: key(), ...mkMapping(component.id) },
      lecA,
    ).expect(201);
    const res = await stage(lecA, {
      mappingId: (mapped.body as { id: string }).id,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: knownStudentRef, rawValue: 5 }],
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MAPPING_REQUIRED');
  });

  it('stage-moodle-only: unknown student is flagged with no converted value', async () => {
    const res = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: `GHOST-${key().slice(0, 8)}`, rawValue: 14 }],
    }).expect(201);
    const line = (res.body as { lines: Array<{ status: string; flagCode: string | null; convertedValue: number | null }> }).lines[0];
    expect(line.flagCode).toBe('MOODLE_ONLY');
    expect(line.convertedValue).toBeNull();
  });

  it('stage-duplicate: repeated student converges on one flagged line', async () => {
    const res = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: knownStudentRef, rawValue: 15 },
        { studentRef: knownStudentRef, rawValue: 15 },
      ],
    }).expect(201);
    const lines = (res.body as { lines: Array<{ flagCode: string | null }> }).lines;
    // First write wins per student inside one batch; the stored row carries
    // the DUPLICATE flag instead of a second snapshot row.
    expect(lines).toHaveLength(1);
    expect(lines[0].flagCode).toBe('DUPLICATE');
  });

  it('stage-range: out-of-range line is quarantined, valid lines preserved', async () => {
    const res = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: knownStudentRef, rawValue: 9 },
        { studentRef: `GHOST-${key().slice(0, 8)}`, rawValue: maxMark + 50 },
      ],
    }).expect(201);
    const lines = (res.body as { lines: Array<{ status: string; flagCode: string | null }> }).lines;
    expect(lines).toHaveLength(2);
    const quarantined = lines.filter((l) => l.flagCode === 'OUT_OF_RANGE');
    expect(quarantined).toHaveLength(1);
    expect(quarantined[0].status).toBe('QUARANTINED');
    expect(lines.filter((l) => l.flagCode === null)).toHaveLength(1);
  });

  it('stage-invalid: bad outcome code and negative mark are quarantined', async () => {
    const res = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [
        { studentRef: knownStudentRef, rawValue: 8, outcome: 'MADE_UP' },
        { studentRef: `GHOST2-${key().slice(0, 8)}`, rawValue: -3 },
      ],
    }).expect(201);
    const lines = (res.body as { lines: Array<{ flagCode: string | null }> }).lines;
    expect(lines.filter((l) => l.flagCode === 'STRUCTURALLY_INVALID')).toHaveLength(2);
  });

  it('stage-change: new revision creates a new batch, prior untouched', async () => {
    const first = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: knownStudentRef, rawValue: 13 }],
    }).expect(201);
    const second = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: knownStudentRef, rawValue: 16 }],
    }).expect(201);
    expect(second.body.id).not.toBe(first.body.id);
    const prior = await db.gradeBatch.findUniqueOrThrow({
      where: { id: (first.body as { id: string }).id },
      include: { lines: true },
    });
    expect(prior.lines[0].rawValue).toBe(13);
  });

  it('stage-denied: tutor, sysadmin and moodle-admin cannot stage', async () => {
    const body = {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: knownStudentRef, rawValue: 7 }],
    };
    for (const cookie of [tutor, sysadmin, moodle]) {
      const res = await stage(cookie, { ...body, sourceRevision: `mdl-rev-${key()}` });
      expect(res.status).toBe(403);
    }
  });

  it('stage-neutral: unknown mapping is a neutral 404', async () => {
    const res = await stage(lecA, {
      mappingId: key(),
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: knownStudentRef, rawValue: 7 }],
    });
    expect(res.status).toBe(404);
  });

  it('stage-concurrent: same revision converges on one batch', async () => {
    const revision = `mdl-rev-${key()}`;
    const payload = {
      mappingId,
      sourceRevision: revision,
      lines: [{ studentRef: knownStudentRef, rawValue: 11 }],
    };
    const [a, b] = await Promise.all([
      post('/batches', { idempotencyKey: key(), ...payload }, lecA),
      post('/batches', { idempotencyKey: key(), ...payload }, lecB),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 201]);
    const count = await db.gradeBatch.count({
      where: { mappingId, sourceRevision: revision },
    });
    expect(count).toBe(1);
  });

  it('stage-provenance: frozen snapshot carries DS5 S4 provenance', async () => {
    const ghost = `GHOST-${key().slice(0, 8)}`;
    const revision = `mdl-rev-${key()}`;
    const res = await stage(lecA, {
      mappingId,
      sourceRevision: revision,
      lines: [
        { studentRef: knownStudentRef, rawValue: 17 },
        { studentRef: ghost, rawValue: 12 },
      ],
    }).expect(201);
    const batch = res.body as {
      id: string;
      moodleInstance: string;
      moodleCourseRef: string;
      moodleActivityId: string;
      offeringRef: string;
      periodCode: string;
      componentCode: string;
      planVersion: number;
      policyVersion: string;
      sourceResponse: { sourceRevision: string };
      lines: Array<{
        studentRef: string;
        flagCode: string | null;
        resolvedStudentId: string | null;
        conversionFormula: string | null;
      }>;
    };
    const mapping = await db.gradeActivityMapping.findUniqueOrThrow({
      where: { id: mappingId },
      include: { component: { include: { plan: true } } },
    });
    // Frozen at stage time: later supersedes never rewrite the snapshot.
    expect(batch.moodleInstance).toBe('MOODLE-SIM-v1');
    expect(batch.moodleCourseRef).toBe(mapping.moodleCourseRef);
    expect(batch.moodleActivityId).toBe(mapping.moodleActivityId);
    expect(batch.offeringRef).toBe(mapping.component.plan.offeringRef);
    expect(batch.periodCode).toBe(mapping.component.plan.periodCode);
    expect(batch.componentCode).toBe(mapping.component.code);
    expect(batch.planVersion).toBe(mapping.component.plan.version);
    expect(batch.policyVersion).toBe('ASSESSMENT-DEMO-v1');
    expect(batch.sourceResponse).toMatchObject({ sourceRevision: revision });
    const known = batch.lines.find((l) => l.studentRef === knownStudentRef);
    expect(known?.resolvedStudentId).toBeTruthy();
    expect(known?.conversionFormula).toBe('identity');
    const unknown = batch.lines.find((l) => l.studentRef === ghost);
    expect(unknown?.flagCode).toBe('MOODLE_ONLY');
    expect(unknown?.resolvedStudentId).toBeNull();
  });

  it('stage-outage: unreachable source refuses, last batch survives, resume works', async () => {
    const before = await db.gradeBatch.count({ where: { mappingId } });
    const shell = await db.moodleMapping.findFirstOrThrow({
      where: { kind: 'SHELL', moodleId: `${SHELL_REF}-STG`, status: 'ACTIVE' },
    });
    await db.moodleMapping.update({
      where: { id: shell.id },
      data: { status: 'OUTAGE' },
    });
    try {
      const refused = await stage(lecA, {
        mappingId,
        sourceRevision: `mdl-rev-${key()}`,
        lines: [{ studentRef: knownStudentRef, rawValue: 10 }],
      });
      expect(refused.status).toBe(503);
      expect(refused.body.code).toBe('SOURCE_UNAVAILABLE');
      // Nothing written: the last confirmed batch is preserved as-is.
      expect(
        await db.gradeBatch.count({ where: { mappingId } }),
      ).toBe(before);
    } finally {
      await db.moodleMapping.update({
        where: { id: shell.id },
        data: { status: 'ACTIVE' },
      });
    }
    // Resume: the same payload stages once the source is reachable again.
    const revision = `mdl-rev-${key()}`;
    const res = await stage(lecA, {
      mappingId,
      sourceRevision: revision,
      lines: [{ studentRef: knownStudentRef, rawValue: 10 }],
    }).expect(201);
    expect((res.body as { sourceRevision: string }).sourceRevision).toBe(
      revision,
    );
  });

  it('stage-retry: lost-response replay recovers without duplicate outbox', async () => {
    const k = key();
    const revision = `mdl-rev-${key()}`;
    const payload = {
      mappingId,
      sourceRevision: revision,
      lines: [{ studentRef: knownStudentRef, rawValue: 12 }],
    };
    const first = await post(
      '/batches',
      { idempotencyKey: k, ...payload },
      lecA,
    ).expect(201);
    // Timeout then retry with the same key: command lookup recovers the
    // stored batch instead of staging twice.
    const retry = await post(
      '/batches',
      { idempotencyKey: k, ...payload },
      lecA,
    ).expect(201);
    expect(retry.body.id).toBe(first.body.id);
    expect(
      await db.outboxEvent.count({
        where: {
          aggregate: 'GradeBatch',
          aggregateId: (first.body as { id: string }).id,
        },
      }),
    ).toBe(1);
  });

  it('stage-superseded: an expired mapping stops transfer', async () => {
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
    const component = full.components.find((c) => c.code === 'CA-ASSIGN');
    if (!component) throw new Error('demo component missing');
    const first = await post(
      '/mappings',
      {
        idempotencyKey: key(),
        ...mkMapping(component.id, {
          moodleActivityId: `SIM-QUIZ-${key().slice(0, 8)}`,
          moodleCourseRef: `${SHELL_REF}-STG`,
        }),
      },
      lecA,
    ).expect(201);
    const firstId = (first.body as { id: string }).id;
    await post(`/mappings/${firstId}/test`, { idempotencyKey: key() }, lecA)
      .expect(201);
    await post(
      `/mappings/${firstId}/activate`,
      { idempotencyKey: key() },
      coordB,
    ).expect(201);
    // A newer activation expires the first mapping (supersede, never edit).
    const second = await post(
      '/mappings',
      {
        idempotencyKey: key(),
        ...mkMapping(component.id, {
          moodleActivityId: `SIM-QUIZ-${key().slice(0, 8)}`,
          moodleCourseRef: `${SHELL_REF}-STG`,
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
    const res = await stage(lecA, {
      mappingId: firstId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: knownStudentRef, rawValue: 5 }],
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('MAPPING_REQUIRED');
  });

  it('stage-change-event: each revision emits its own outbox event', async () => {
    const first = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: knownStudentRef, rawValue: 13 }],
    }).expect(201);
    const second = await stage(lecA, {
      mappingId,
      sourceRevision: `mdl-rev-${key()}`,
      lines: [{ studentRef: knownStudentRef, rawValue: 16 }],
    }).expect(201);
    const firstId = (first.body as { id: string }).id;
    const secondId = (second.body as { id: string }).id;
    for (const id of [firstId, secondId]) {
      const event = await db.outboxEvent.findFirst({
        where: { aggregate: 'GradeBatch', aggregateId: id },
      });
      expect(event?.type).toBe('MoodleGradeTransferStaged');
      // Canonical chain (GAP-022): ACT-ASM-001 + CMD + INT + EVT.
      expect(event?.payload as object).toMatchObject({
        chain: {
          act: 'ACT-ASM-001',
          command: 'CMD-LRN-StageMoodleGradeTransfer',
          interface: 'INT-Moodle-GradeTransfer-v1',
          event: 'EVT-MoodleGradeTransferStaged-v1',
        },
      });
    }
  });

  it('stage-reads: list and detail are reader-scoped', async () => {
    const listed = await get('/batches', lecA).expect(200);
    expect(
      ((listed.body as { items: unknown[] }).items).length,
    ).toBeGreaterThan(0);
    const first = ((listed.body as { items: Array<{ id: string }> }).items)[0];
    const detail = await get(`/batches/${first.id}`, lecA).expect(200);
    expect((detail.body as { id: string }).id).toBe(first.id);
    await get('/batches', sysadmin).expect(403);
  });
});
