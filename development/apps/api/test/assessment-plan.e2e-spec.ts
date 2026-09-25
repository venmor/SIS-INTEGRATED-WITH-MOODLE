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
 * TASK-PH7-001 assessment scheme + grade-activity mapping plan e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet proof map: plan draft/approve/supersede + versioning, four-eyes
 * self-approve refusal, mapping draft/test/activate, closed component kinds,
 * synthetic pass/fail (fail writes nothing), test-required refusal,
 * both-identifier enforcement, post-review arbitrary-mapping block, denials
 * (tutor ungranted, sysadmin, moodle-admin academic), neutrals, concurrency
 * single-active, idempotence replay/conflict.
 */
describe('Phase 7 assessment scheme and mapping plan', () => {
  let app: INestApplication;
  let db: PrismaService;
  let post: ReturnType<typeof assessPost>;
  let get: ReturnType<typeof assessGet>;
  let lecA: string;
  let lecB: string;
  let coordA: string;
  let coordB: string;
  let moodle: string;
  let tutor: string;
  let sysadmin: string;

  const draftPlan = (cookie: string, body: object = {}) =>
    post('/plans', { idempotencyKey: key(), ...mkPlan(), ...body }, cookie);

  const approvePlan = (cookie: string, id: string, version: number, k = key()) =>
    post(`/plans/${id}/approve`, { idempotencyKey: k, version }, cookie);

  const draftMapping = (cookie: string, componentId: string, extra = {}) =>
    post(
      '/mappings',
      { idempotencyKey: key(), ...mkMapping(componentId, extra) },
      cookie,
    );

  /** Draft + approve a fresh plan; returns the approved plan + components. */
  async function approvedPlan() {
    const drafted = await draftPlan(lecA).expect(201);
    const plan = drafted.body as { id: string; version: number };
    await approvePlan(coordB, plan.id, plan.version).expect(201);
    const listed = await get(
      `/plans?offeringRef=${OFFERING_REF}&periodCode=${PERIOD_CODE}`,
      lecA,
    ).expect(200);
    const items = (listed.body as { items: Array<{ id: string }> }).items;
    const full = await db.assessmentPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { components: true },
    });
    void items;
    return full;
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
    coordA = (
      await user(db, 'COORDINATOR', ['approve-assessment'], 'SCHOOL', 'Computing')
    ).cookie;
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
    // Active shell binding the demo course ref (Phase 6 registry reuse).
    const offering = await db.programmeOffering.findFirstOrThrow({
      where: { programme: { code: 'SWE' }, availability: 'OPEN' },
    });
    await db.moodleMapping.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: { status: 'ACTIVE', moodleId: SHELL_REF },
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        kind: 'SHELL',
        sisType: 'OFFERING',
        sisId: `${offering.id}:${PERIOD_CODE}`,
        moodleId: SHELL_REF,
        version: 1,
        status: 'ACTIVE',
        creatorAccountId: 'SYSTEM',
        activatorAccountId: 'SYSTEM',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('plan-draft: lecturers draft versioned plans in scope', async () => {
    const res = await draftPlan(lecA).expect(201);
    const body = res.body as {
      status: string;
      version: number;
      policyVersion: string;
      components: Array<{ code: string }>;
    };
    expect(body.status).toBe('DRAFT');
    // Versions advance per offering+period across drafts (suites share the
    // offering and reruns keep history); exact sequencing is proven by the
    // versioning test below.
    expect(body.version).toBeGreaterThanOrEqual(1);
    expect(body.policyVersion).toBe('ASSESSMENT-DEMO-v1');
    expect(body.components.map((c) => c.code)).toEqual([
      'CA-QUIZ1',
      'CA-ASSIGN',
      'FINAL-EXAM',
    ]);
  });

  it('plan-versioning: approval supersedes, never edits', async () => {
    const first = await draftPlan(lecA).expect(201);
    const v1 = first.body as { id: string; version: number };
    await approvePlan(coordB, v1.id, v1.version).expect(201);
    const second = await draftPlan(lecA).expect(201);
    const v2 = second.body as { id: string; version: number };
    // Versions advance per offering+period across drafts (suites share the
    // offering); each approval still leaves exactly one APPROVED plan.
    expect(v2.version).toBe(v1.version + 1);
    await approvePlan(coordB, v2.id, v2.version).expect(201);
    const old = await db.assessmentPlan.findUniqueOrThrow({
      where: { id: v1.id },
    });
    expect(old.status).toBe('SUPERSEDED');
    const approved = await db.assessmentPlan.count({
      where: {
        offeringRef: OFFERING_REF,
        periodCode: PERIOD_CODE,
        status: 'APPROVED',
      },
    });
    expect(approved).toBe(1);
  });

  it('plan-foureyes: the creator never approves their own plan', async () => {
    // One person holding both lecturer and coordinator assignments still
    // needs a second person to approve (four-eyes on the account).
    const person = await db.person.create({
      data: {
        displayName: `Fictional DUAL ${key().slice(0, 8)}`,
        email: `${key()}@demo.invalid`,
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
    const coordAssign = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: 'COORDINATOR',
        scopeType: 'SCHOOL',
        scopeRef: 'Computing',
        capabilities: ['approve-assessment'],
        reason: 'isolated test',
        startsAt: new Date('2020-01-01'),
      },
    });
    const sessionFor = async (assignmentId: string) => {
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
    const lecCookie = await sessionFor(lecAssign.id);
    const coordCookie = await sessionFor(coordAssign.id);
    const drafted = await draftPlan(lecCookie).expect(201);
    const plan = drafted.body as { id: string; version: number };
    const refused = await approvePlan(coordCookie, plan.id, plan.version).expect(
      403,
    );
    expect((refused.body as { code: string }).code).toBe('SOD_VIOLATION');
  });

  it('plan-version-conflict: stale approvals are refused', async () => {
    const drafted = await draftPlan(lecA).expect(201);
    const plan = drafted.body as { id: string; version: number };
    const refused = await approvePlan(coordB, plan.id, plan.version + 1).expect(
      409,
    );
    expect((refused.body as { code: string }).code).toBe('VERSION_CONFLICT');
  });

  it('plan-closed-code: components come from the closed demo scheme', async () => {
    const refused = await draftPlan(lecA, {
      components: [{ code: 'CA-SURPRISE', maxMark: 10, weight: 10 }],
    }).expect(400);
    expect((refused.body as { code: string }).code).toBe('COMPONENT_UNKNOWN');
  });

  it('map-journey: draft, synthetic pass, four-eyes activation', async () => {
    const plan = await approvedPlan();
    const component = plan.components.find((c) => c.code === 'CA-QUIZ1');
    if (!component) throw new Error('demo component missing');
    const drafted = await draftMapping(lecA, component.id).expect(201);
    const mapping = drafted.body as { id: string; status: string; version: number };
    expect(mapping.status).toBe('DRAFT');
    expect(mapping.version).toBe(1);
    const tested = await post(
      `/mappings/${mapping.id}/test`,
      { idempotencyKey: key() },
      lecA,
    ).expect(201);
    const result = tested.body as {
      result: string;
      conditions: Array<{ condition: string; passed: boolean }>;
    };
    expect(result.result).toBe('PASS');
    expect(result.conditions).toHaveLength(6);
    const activated = await post(
      `/mappings/${mapping.id}/activate`,
      { idempotencyKey: key() },
      coordB,
    ).expect(201);
    expect((activated.body as { status: string }).status).toBe('ACTIVE');
  });

  it('map-sod-refusal: the creator can never activate their own mapping', async () => {
    // Same account holds both lecturer and coordinator assignments: draft +
    // test as lecturer, then attempt activation as coordinator. Four-eyes
    // refuses with SOD_VIOLATION even though the synthetic test passed.
    const person = await db.person.create({
      data: {
        displayName: `Fictional DUAL-MAP ${key().slice(0, 8)}`,
        email: `${key()}@demo.invalid`,
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
    const coordAssign = await db.roleAssignment.create({
      data: {
        accountId: account.id,
        role: 'COORDINATOR',
        scopeType: 'SCHOOL',
        scopeRef: 'Computing',
        capabilities: ['approve-assessment'],
        reason: 'isolated test',
        startsAt: new Date('2020-01-01'),
      },
    });
    const sessionFor = async (assignmentId: string) => {
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
    const lecCookie = await sessionFor(lecAssign.id);
    const coordCookie = await sessionFor(coordAssign.id);
    const plan = await approvedPlan();
    const component = plan.components.find((c) => c.code === 'CA-QUIZ1');
    if (!component) throw new Error('demo component missing');
    const drafted = await draftMapping(lecCookie, component.id).expect(201);
    const mapping = drafted.body as { id: string };
    await post(
      `/mappings/${mapping.id}/test`,
      { idempotencyKey: key() },
      lecCookie,
    ).expect(201);
    const refused = await post(
      `/mappings/${mapping.id}/activate`,
      { idempotencyKey: key() },
      coordCookie,
    ).expect(403);
    expect((refused.body as { code: string }).code).toBe('SOD_VIOLATION');
    const row = await db.gradeActivityMapping.findUniqueOrThrow({
      where: { id: mapping.id },
    });
    expect(row.status).not.toBe('ACTIVE');
  });

  it('map-test-fail: dangling course bindings fail and write nothing', async () => {
    const plan = await approvedPlan();
    const component = plan.components.find((c) => c.code === 'CA-ASSIGN');
    if (!component) throw new Error('demo component missing');
    const drafted = await draftMapping(lecA, component.id, {
      moodleCourseRef: 'SIM-SH-NOWHERE-0000',
    }).expect(201);
    const mapping = drafted.body as { id: string };
    const tested = await post(
      `/mappings/${mapping.id}/test`,
      { idempotencyKey: key() },
      lecA,
    ).expect(201);
    const body = tested.body as { result: string; reasons: string[] };
    expect(body.result).toBe('FAIL');
    expect(body.reasons.length).toBeGreaterThan(0);
    // A failed test never moves the mapping: still DRAFT, never ACTIVE.
    const row = await db.gradeActivityMapping.findUniqueOrThrow({
      where: { id: mapping.id },
    });
    expect(row.status).toBe('DRAFT');
    expect(
      await db.gradeActivityMapping.count({
        where: { componentId: component.id, status: 'ACTIVE' },
      }),
    ).toBe(0);
  });

  it('map-test-required: activation without a passing test is refused', async () => {
    const plan = await approvedPlan();
    const component = plan.components.find((c) => c.code === 'CA-QUIZ1');
    if (!component) throw new Error('demo component missing');
    const drafted = await draftMapping(lecA, component.id).expect(201);
    const mapping = drafted.body as { id: string };
    const refused = await post(
      `/mappings/${mapping.id}/activate`,
      { idempotencyKey: key() },
      coordB,
    ).expect(409);
    expect((refused.body as { code: string }).code).toBe('TEST_REQUIRED');
  });

  it('map-identifiers: both SIS and Moodle identifiers are enforced', async () => {
    const plan = await approvedPlan();
    const component = plan.components.find((c) => c.code === 'CA-QUIZ1');
    if (!component) throw new Error('demo component missing');
    await draftMapping(lecA, component.id, { moodleActivityId: '' }).expect(400);
    await draftMapping(lecA, component.id, { moodleCourseRef: '' }).expect(400);
  });

  it('map-arbitrary-blocked: an untested quiz stays blocked after review', async () => {
    const plan = await approvedPlan();
    const component = plan.components.find((c) => c.code === 'CA-QUIZ1');
    if (!component) throw new Error('demo component missing');
    const reviewed = await draftMapping(lecA, component.id).expect(201);
    const reviewedId = (reviewed.body as { id: string }).id;
    await post(
      `/mappings/${reviewedId}/test`,
      { idempotencyKey: key() },
      lecA,
    ).expect(201);
    // A lecturer mapping an arbitrary quiz after review has no passing
    // test of its own: activation stays blocked without authorized change.
    const rogue = await draftMapping(lecA, component.id, {
      moodleActivityId: 'SIM-QUIZ-ROGUE',
    }).expect(201);
    const rogueId = (rogue.body as { id: string }).id;
    const refused = await post(
      `/mappings/${rogueId}/activate`,
      { idempotencyKey: key() },
      coordB,
    ).expect(409);
    expect((refused.body as { code: string }).code).toBe('TEST_REQUIRED');
  });

  it('map-closed: unapproved or closed components take no mappings', async () => {
    const drafted = await draftPlan(lecA).expect(201);
    const plan = drafted.body as { id: string };
    const row = await db.assessmentPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { components: true },
    });
    const component = row.components[0];
    const refused = await draftMapping(lecA, component.id).expect(409);
    expect((refused.body as { code: string }).code).toBe('PLAN_NOT_APPROVED');
    const approved = await approvedPlan();
    const target = approved.components[0];
    await db.assessmentComponent.update({
      where: { id: target.id },
      data: { status: 'CLOSED' },
    });
    const closed = await draftMapping(lecA, target.id).expect(409);
    expect((closed.body as { code: string }).code).toBe('COMPONENT_CLOSED');
  });

  it('map-denied-tutor: ungranted tutors manage nothing', async () => {
    await draftPlan(tutor).expect(403);
    await get('/plans', tutor).expect(403);
    const plan = await approvedPlan();
    await draftMapping(tutor, plan.components[0].id).expect(403);
  });

  it('map-denied-sysadmin: system admins never write assessments', async () => {
    await draftPlan(sysadmin).expect(403);
    const plan = await approvedPlan();
    await approvePlan(sysadmin, plan.id, plan.version).expect(403);
    await draftMapping(sysadmin, plan.components[0].id).expect(403);
  });

  it('map-denied-moodle-academic: admins wire, never approve', async () => {
    // Technical mapping work is allowed …
    const plan = await approvedPlan();
    await draftMapping(moodle, plan.components[0].id).expect(201);
    // … academic approval never is.
    const drafted = await draftPlan(lecA).expect(201);
    const target = drafted.body as { id: string; version: number };
    await approvePlan(moodle, target.id, target.version).expect(403);
    const tested = await draftMapping(moodle, plan.components[0].id).expect(
      201,
    );
    const testedId = (tested.body as { id: string }).id;
    await post(
      `/mappings/${testedId}/test`,
      { idempotencyKey: key() },
      moodle,
    ).expect(201);
    await post(
      `/mappings/${testedId}/activate`,
      { idempotencyKey: key() },
      moodle,
    ).expect(403);
  });

  it('map-scope: lecturers capture only inside their offering', async () => {
    const outsider = (
      await user(db, 'LEC', ['stage-marks'], 'OFFERING', 'OTHER-2026S1')
    ).cookie;
    await draftPlan(outsider).expect(403);
  });

  it('map-neutral: unknown plans and mappings 404', async () => {
    const missing = '00000000-0000-0000-0000-000000000000';
    await approvePlan(tutor, missing, 1).expect(404);
    await approvePlan(sysadmin, missing, 1).expect(404);
    await post(
      `/mappings/${missing}/test`,
      { idempotencyKey: key() },
      tutor,
    ).expect(404);
    await post(
      `/mappings/${missing}/activate`,
      { idempotencyKey: key() },
      sysadmin,
    ).expect(404);
  });

  it('map-concurrent: racing activations converge on one ACTIVE mapping', async () => {
    const plan = await approvedPlan();
    const component = plan.components.find((c) => c.code === 'FINAL-EXAM');
    if (!component) throw new Error('demo component missing');
    const left = await draftMapping(lecA, component.id).expect(201);
    const right = await draftMapping(lecB, component.id, {
      moodleActivityId: 'SIM-EXAM-HALL-B',
    }).expect(201);
    const leftId = (left.body as { id: string }).id;
    const rightId = (right.body as { id: string }).id;
    await post(`/mappings/${leftId}/test`, { idempotencyKey: key() }, lecA).expect(
      201,
    );
    await post(
      `/mappings/${rightId}/test`,
      { idempotencyKey: key() },
      lecB,
    ).expect(201);
    const [first, second] = await Promise.all([
      post(`/mappings/${leftId}/activate`, { idempotencyKey: key() }, coordA),
      post(`/mappings/${rightId}/activate`, { idempotencyKey: key() }, coordB),
    ]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(
      await db.gradeActivityMapping.count({
        where: { componentId: component.id, status: 'ACTIVE' },
      }),
    ).toBe(1);
  });

  it('map-idempotent: replays return receipts, conflicts are refused', async () => {
    const k = key();
    const first = await post(
      '/plans',
      { idempotencyKey: k, ...mkPlan() },
      lecA,
    ).expect(201);
    const replay = await post(
      '/plans',
      { idempotencyKey: k, ...mkPlan() },
      lecA,
    ).expect(201);
    expect(replay.body).toEqual(first.body);
    const conflict = await post(
      '/plans',
      { idempotencyKey: k, ...mkPlan({ periodCode: '2026S2' }) },
      lecA,
    ).expect(409);
    expect((conflict.body as { code: string }).code).toBe(
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('map-list: officers read plans and mappings', async () => {
    const plan = await approvedPlan();
    const listed = await get(
      `/plans?offeringRef=${OFFERING_REF}&periodCode=${PERIOD_CODE}`,
      coordA,
    ).expect(200);
    const items = (listed.body as { items: Array<{ id: string }> }).items;
    expect(items.some((p) => p.id === plan.id)).toBe(true);
    const mappings = await get(
      `/mappings?componentId=${plan.components[0].id}`,
      coordA,
    ).expect(200);
    expect(Array.isArray((mappings.body as { items: unknown }).items)).toBe(
      true,
    );
  });
});
