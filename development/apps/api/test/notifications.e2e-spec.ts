import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { DocumentScanner } from '../src/admissions/scanner.js';
import { user, key } from './helpers/phase6.js';
import {
  mkPlan,
  mkMapping,
  OFFERING_REF,
  PERIOD_CODE,
  SHELL_REF,
} from './helpers/assessment.js';
import request from 'supertest';

/**
 * TASK-PH8-001 notification record and delivery status e2e (RED first).
 * Isolated fictional test database required (same guard as other suites).
 * Packet proof map: template versioning + supersede, OPEN record +
 * QUEUED delivery, state machine to delivered/read, failed → retried →
 * dead-letter, mandatory-escalation task, suppression rules, recipient
 * isolation + staff-scope reads, role denials, neutrals, worker
 * concurrency convergence, idempotence + key conflict, expired-grant
 * fail-safe.
 */
const csrf = { 'x-requested-with': 'XMLHttpRequest' };

describe('Phase 8 notification record and delivery status', () => {
  let app: INestApplication;
  let db: PrismaService;
  let sysadmin: string;
  let sysadminAccountId: string;
  let studentCookie: string;
  let studentAccountId: string;
  let lecturerCookie: string;
  let lecturerAccountId: string;
  let tutorCookie: string;
  let officerCookie: string;

  const post = (path: string, body: object, cookie: string) =>
    request(app.getHttpServer())
      .post(`/notifications${path}`)
      .set(csrf)
      .set('Cookie', cookie)
      .send(body);
  const get = (path: string, cookie: string) =>
    request(app.getHttpServer()).get(`/notifications${path}`).set('Cookie', cookie);

  const templateBody = (extra = {}) => ({
    idempotencyKey: key(),
    event: 'RESULT_RELEASED',
    title: 'Official results released',
    body: 'Your official results are available securely in the portal.',
    office: 'Examinations',
    category: 'RESULT',
    mandatory: true,
    ...extra,
  });

  const recordBody = (templateId: string, recipientAccountId: string, extra = {}) => ({
    idempotencyKey: key(),
    templateId,
    event: 'RESULT_RELEASED',
    title: 'Official results released',
    body: 'Your official results are available securely in the portal.',
    office: 'Examinations',
    category: 'RESULT',
    mandatory: true,
    recipientAccountId,
    dedupeKey: key(),
    channels: ['IN_SYSTEM'],
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
    const sys = await user(db, 'SYSADMIN', ['administer-identity'], 'SYSTEM', 'GLOBAL');
    sysadmin = sys.cookie;
    sysadminAccountId = sys.accountId;
    const stu = await user(db, 'STUDENT', ['study'], 'STUDENT', 'self');
    studentCookie = stu.cookie;
    studentAccountId = stu.accountId;
    const lec = await user(db, 'LEC', ['stage-marks'], 'OFFERING', 'SWE-2026S1');
    lecturerCookie = lec.cookie;
    lecturerAccountId = lec.accountId;
    tutorCookie = (await user(db, 'TUT', ['mark-delegated-activities'], 'TUTORIAL_GROUP', 'TG-1')).cookie;
    officerCookie = (
      await user(db, 'EXAMINATIONS_OFFICER', ['validate-results'], 'PERIOD', '2026S1')
    ).cookie;
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

  it('template-versioning: ACTIVE v1, supersede creates v2, history kept', async () => {
    const first = (await post('/templates', templateBody(), sysadmin).expect(201)).body as {
      id: string;
      version: number;
      status: string;
    };
    expect(first.version).toBe(1);
    expect(first.status).toBe('ACTIVE');
    const second = (await post('/templates', templateBody(), sysadmin).expect(201)).body as {
      id: string;
      version: number;
    };
    expect(second.version).toBe(2);
    expect(second.id).not.toBe(first.id);
    const rows = await db.notificationTemplate.findMany({
      where: { event: 'RESULT_RELEASED' },
      orderBy: { version: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].status).toBe('SUPERSEDED');
    expect(rows[1].status).toBe('ACTIVE');
  });

  it('record-happy-path: OPEN record plus QUEUED in-system delivery', async () => {
    const tpl = (await post('/templates', templateBody({ event: 'DECISION_RELEASED' }), sysadmin).expect(201))
      .body as { id: string };
    const res = (await post('/records', recordBody(tpl.id, studentAccountId), sysadmin).expect(201))
      .body as { id: string; status: string };
    expect(res.status).toBe('OPEN');
    const deliveries = await db.notificationDelivery.findMany({
      where: { recordId: res.id },
    });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].channel).toBe('IN_SYSTEM');
    expect(deliveries[0].state).toBe('QUEUED');
  });

  it('record-refusal: unknown template and bad recipient fail closed', async () => {
    const unknown = await post(
      '/records',
      recordBody('00000000-0000-0000-0000-000000000000', studentAccountId),
      sysadmin,
    );
    expect(unknown.status).toBe(404);
    const bare = await post(
      '/records',
      recordBody(
        (await db.notificationTemplate.findFirstOrThrow({ where: { status: 'ACTIVE' } })).id,
        studentAccountId,
        { recipientAccountId: undefined },
      ),
      sysadmin,
    );
    expect([400, 409]).toContain(bare.status);
  });

  it('delivery-states: worker advances QUEUED to DELIVERED, read marks READ', async () => {
    const tpl = (await post('/templates', templateBody({ event: 'PAYMENT_POSTED' }), sysadmin).expect(201))
      .body as { id: string };
    const rec = (await post('/records', recordBody(tpl.id, studentAccountId), sysadmin).expect(201))
      .body as { id: string };
    await post('/worker/run', { idempotencyKey: key() }, sysadmin).expect(201);
    const delivered = await db.notificationDelivery.findFirstOrThrow({
      where: { recordId: rec.id },
    });
    expect(delivered.state).toBe('DELIVERED');
    expect(delivered.attempts).toBe(1);
    await post(`/records/${rec.id}/read`, { idempotencyKey: key() }, studentCookie).expect(201);
    const mine = (await get('/records/mine', studentCookie).expect(200)).body as {
      items: Array<{ id: string; state: string }>;
    };
    expect(mine.items.find((i) => i.id === rec.id)?.state).toBe('READ');
  });

  it('delivery-retry: failures retry then dead-letter with escalation', async () => {
    const tpl = (await post('/templates', templateBody({ event: 'FINDING_OVERDUE' }), sysadmin).expect(201))
      .body as { id: string };
    const rec = (await post(
      '/records',
      recordBody(tpl.id, studentAccountId, { channels: ['SMS_SIM'], simulateFailure: true }),
      sysadmin,
    ).expect(201)).body as { id: string };
    // Backoff schedules the next attempt in the future (honest wait);
    // the test advances the clock by resetting nextRunAt between ticks.
    await post('/worker/run', { idempotencyKey: key() }, sysadmin).expect(201);
    let delivery = await db.notificationDelivery.findFirstOrThrow({
      where: { recordId: rec.id, channel: 'SMS_SIM' },
    });
    expect(delivery.state).toBe('RETRIED');
    expect(delivery.nextRunAt!.getTime()).toBeGreaterThan(Date.now() - 1000);
    for (let i = 0; i < 2; i++) {
      await db.notificationDelivery.updateMany({
        where: { recordId: rec.id, channel: 'SMS_SIM' },
        data: { nextRunAt: new Date(Date.now() - 1000) },
      });
      await post('/worker/run', { idempotencyKey: key() }, sysadmin).expect(201);
    }
    delivery = await db.notificationDelivery.findFirstOrThrow({
      where: { recordId: rec.id, channel: 'SMS_SIM' },
    });
    expect(delivery.state).toBe('DEAD_LETTER');
    // Mandatory notice failure escalates to a staff follow-up record.
    const escalations = await db.notificationRecord.findMany({
      where: { event: 'NOTICE_ESCALATED', recipientRole: 'EXAMINATIONS_OFFICER' },
    });
    expect(escalations.length).toBeGreaterThanOrEqual(1);
  });

  it('suppression: optional suppresses, mandatory refuses, duplicates suppress', async () => {
    const tpl = (await post('/templates', templateBody({ event: 'SUPPORT_REPLY' }), sysadmin).expect(201))
      .body as { id: string };
    // Optional category record honors suppression.
    const opt = (await post(
      '/records',
      recordBody(tpl.id, studentAccountId, { category: 'SUPPORT', mandatory: false }),
      sysadmin,
    ).expect(201)).body as { id: string };
    await post(`/records/${opt.id}/suppress`, { idempotencyKey: key(), optedOut: true }, studentCookie).expect(201);
    const suppressed = await db.notificationDelivery.findFirstOrThrow({
      where: { recordId: opt.id },
    });
    expect(suppressed.state).toBe('SUPPRESSED');
    // Mandatory records refuse suppression.
    const mand = (await post('/records', recordBody(tpl.id, studentAccountId), sysadmin).expect(201))
      .body as { id: string };
    const refused = await post(`/records/${mand.id}/suppress`, { idempotencyKey: key(), optedOut: true }, studentCookie);
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('MANDATORY_NOTICE');
    // Duplicate dedupeKey suppresses to the stored record.
    const dupeKey = key();
    const one = (await post(
      '/records',
      recordBody(tpl.id, lecturerAccountId, { dedupeKey: dupeKey }),
      sysadmin,
    ).expect(201)).body as { id: string };
    const two = (await post(
      '/records',
      recordBody(tpl.id, lecturerAccountId, { dedupeKey: dupeKey }),
      sysadmin,
    ).expect(201)).body as { id: string };
    expect(two.id).toBe(one.id);
  });

  it('isolation: students see only own records; staff see scoped signals', async () => {
    const tpl = (await post('/templates', templateBody({ event: 'CLARIFICATION_ISSUED' }), sysadmin).expect(201))
      .body as { id: string };
    const mine = (await post('/records', recordBody(tpl.id, studentAccountId), sysadmin).expect(201))
      .body as { id: string };
    // A role-scoped staff signal for the examinations office.
    const signal = (await post(
      '/records',
      {
        idempotencyKey: key(),
        templateId: tpl.id,
        event: 'FINDING_OVERDUE',
        title: 'Finding response overdue',
        body: 'A quality finding requires your response.',
        office: 'Examinations',
        category: 'DEADLINE',
        mandatory: true,
        recipientRole: 'EXAMINATIONS_OFFICER',
        scopeType: 'PERIOD',
        scopeRef: '2026S1',
        dedupeKey: key(),
        channels: ['IN_SYSTEM'],
      },
      sysadmin,
    ).expect(201)).body as { id: string };
    const studentView = (await get('/records/mine', studentCookie).expect(200)).body as {
      items: Array<{ id: string }>;
    };
    expect(studentView.items.map((i) => i.id)).toContain(mine.id);
    expect(studentView.items.map((i) => i.id)).not.toContain(signal.id);
    const signals = (await get('/records/signals', officerCookie).expect(200)).body as {
      items: Array<{ id: string }>;
    };
    expect(signals.items.map((i) => i.id)).toContain(signal.id);
    const foreign = (await get('/records/signals', lecturerCookie).expect(200)).body as {
      items: Array<{ id: string }>;
    };
    expect(foreign.items.map((i) => i.id)).not.toContain(signal.id);
  });

  it('denials: tutor and anonymous refused on writes and signals', async () => {
    const tpl = (await post('/templates', templateBody({ event: 'APPOINTMENT_REMINDER' }), sysadmin).expect(201))
      .body as { id: string };
    const denied = await post('/records', recordBody(tpl.id, studentAccountId), tutorCookie);
    expect([403, 404]).toContain(denied.status);
    const tplDenied = await post('/templates', templateBody({ event: 'X' }), tutorCookie);
    expect([403, 404]).toContain(tplDenied.status);
    const signals = await get('/records/signals', tutorCookie);
    expect([403, 404]).toContain(signals.status);
  });

  it('neutral: unknown records and deliveries are 404 without disclosure', async () => {
    const missing = await get(`/records/${key()}`, studentCookie);
    expect(missing.status).toBe(404);
    const delivery = await get(`/deliveries/${key()}`, studentCookie);
    expect(delivery.status).toBe(404);
  });

  it('worker-concurrency: racing ticks converge without duplication', async () => {
    const tpl = (await post('/templates', templateBody({ event: 'DEADLINE_APPROACHING' }), sysadmin).expect(201))
      .body as { id: string };
    const rec = (await post('/records', recordBody(tpl.id, studentAccountId), sysadmin).expect(201))
      .body as { id: string };
    const [a, b] = await Promise.all([
      post('/worker/run', { idempotencyKey: key() }, sysadmin),
      post('/worker/run', { idempotencyKey: key() }, sysadmin),
    ]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    const deliveries = await db.notificationDelivery.findMany({
      where: { recordId: rec.id, channel: 'IN_SYSTEM' },
    });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].state).toBe('DELIVERED');
  });

  it('idempotent: same key replays; mismatched key conflicts', async () => {
    const tpl = (await post('/templates', templateBody({ event: 'WITHDRAWAL_OUTCOME' }), sysadmin).expect(201))
      .body as { id: string };
    const k = key();
    const sharedDedupe = key();
    const first = (await post(
      '/records',
      { ...recordBody(tpl.id, studentAccountId), idempotencyKey: k, dedupeKey: sharedDedupe },
      sysadmin,
    ).expect(201)).body as { id: string };
    const retry = (await post(
      '/records',
      { ...recordBody(tpl.id, studentAccountId), idempotencyKey: k, dedupeKey: sharedDedupe },
      sysadmin,
    ).expect(201)).body as { id: string };
    expect(retry.id).toBe(first.id);
    const conflict = await post(
      '/records',
      { ...recordBody(tpl.id, lecturerAccountId), idempotencyKey: k },
      sysadmin,
    );
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('expired-grant: lapsed governance cannot write templates', async () => {
    const target = await db.roleAssignment.findFirstOrThrow({
      where: { accountId: sysadminAccountId, role: 'SYSADMIN' },
    });
    await db.roleAssignment.update({
      where: { id: target.id },
      data: { endsAt: new Date('2020-01-01T00:00:00Z') },
    });
    try {
      const denied = await post('/templates', templateBody({ event: 'EXPIRED_PROBE' }), sysadmin);
      expect(denied.status).toBe(403);
      expect(
        await db.notificationTemplate.count({ where: { event: 'EXPIRED_PROBE' } }),
      ).toBe(0);
    } finally {
      await db.roleAssignment.update({
        where: { id: target.id },
        data: { endsAt: null },
      });
    }
  });

  it('template-read: non-governance roles read active templates', async () => {
    await post('/templates', templateBody({ event: 'EVIDENCE_REQUEST' }), sysadmin).expect(201);
    const list = (await get('/templates?event=EVIDENCE_REQUEST', studentCookie).expect(200)).body as {
      items: Array<{ event: string; version: number; status: string }>;
    };
    expect(list.items.length).toBeGreaterThanOrEqual(1);
    expect(list.items[0].status).toBe('ACTIVE');
  });

  it('signal-read: students cannot read staff signals', async () => {
    const denied = await get('/records/signals', studentCookie);
    expect([403, 404]).toContain(denied.status);
  });

  // ---- Assessment fan-out (Task 4): release + amendment approval ----
  // write per-student records in the same transaction. Full
  // plan→release flow helpers adapted from grade-release.
  async function provisionCandidates(refs: string[], coord: string) {
    await request(app.getHttpServer())
      .post('/assessment/candidate-lists')
      .set(csrf)
      .set('Cookie', coord)
      .send({
        idempotencyKey: key(),
        offeringRef: OFFERING_REF,
        periodCode: PERIOD_CODE,
        studentRefs: refs,
      })
      .expect(201);
  }

  async function releasedPackage(
    refs: string[],
    lec: string,
    coord: string,
    mod: string,
    exam: string,
  ): Promise<{ id: string }> {
    const apost = (path: string, body: object, cookie: string) =>
      request(app.getHttpServer())
        .post(`/assessment${path}`)
        .set(csrf)
        .set('Cookie', cookie)
        .send(body);
    await provisionCandidates(refs, coord);
    const drafted = await apost('/plans', { idempotencyKey: key(), ...mkPlan() }, lec).expect(201);
    const plan = drafted.body as { id: string; version: number };
    await apost(`/plans/${plan.id}/approve`, { idempotencyKey: key(), version: plan.version }, coord).expect(201);
    const full = await db.assessmentPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { components: true },
    });
    const marks: Record<string, number> = { 'CA-QUIZ1': 14, 'CA-ASSIGN': 21, 'FINAL-EXAM': 68 };
    for (const component of full.components) {
      const mapped = await apost(
        '/mappings',
        {
          idempotencyKey: key(),
          ...mkMapping(component.id, {
            moodleActivityId: `SIM-FAN-${key().slice(0, 8).toUpperCase()}`,
            moodleCourseRef: `${SHELL_REF}-MOD`,
          }),
        },
        lec,
      ).expect(201);
      const mappingId = (mapped.body as { id: string }).id;
      await apost(`/mappings/${mappingId}/test`, { idempotencyKey: key() }, lec).expect(201);
      await apost(`/mappings/${mappingId}/activate`, { idempotencyKey: key() }, coord).expect(201);
      const staged = await apost(
        '/batches',
        {
          idempotencyKey: key(),
          mappingId,
          sourceRevision: `mdl-rev-${key()}`,
          lines: refs.map((studentRef) => ({ studentRef, rawValue: marks[component.code] ?? 10 })),
        },
        lec,
      ).expect(201);
      const batchId = (staged.body as { id: string }).id;
      await apost(`/batches/${batchId}/validate`, { idempotencyKey: key() }, exam).expect(201);
      const submitted = await apost(
        `/batches/${batchId}/submit`,
        {
          idempotencyKey: key(),
          declaration:
            'I confirm that this batch is complete for its scope and I submit it for moderation within my assigned authority.',
        },
        lec,
      ).expect(201);
      const caseId = (submitted.body as { id: string }).id;
      await apost(`/moderation/${caseId}/begin`, { idempotencyKey: key() }, mod).expect(201);
      await apost(`/moderation/${caseId}/decide`, { idempotencyKey: key(), version: 1, to: 'APPROVED' }, mod).expect(201);
    }
    const pkg = (await apost(
      '/packages',
      {
        idempotencyKey: key(),
        offeringRef: OFFERING_REF,
        periodCode: PERIOD_CODE,
        declaration:
          'I confirm that this result package is complete for its offering and period and I submit it for board decision within my assigned authority.',
      },
      lec,
    ).expect(201)).body as { id: string; version: number };
    await apost(`/packages/${pkg.id}/decide`, {
      idempotencyKey: key(),
      version: pkg.version,
      to: 'APPROVE_FOR_RELEASE',
      reason: 'Board minute 12.',
    }, exam).expect(201);
    await apost('/releases', { idempotencyKey: key(), packageId: pkg.id }, exam).expect(201);
    return { id: pkg.id };
  }

  async function studentRef(): Promise<{ cookie: string; ref: string; accountId: string }> {
    const me = await user(db, 'STUDENT', ['study'], 'STUDENT', 'self');
    const account = await db.account.findUniqueOrThrow({ where: { id: me.accountId } });
    const ref = `STU-2026-${key().slice(0, 8).toUpperCase()}`;
    await db.student.create({ data: { personId: account.personId, studentNumber: ref } });
    return { cookie: me.cookie, ref, accountId: me.accountId };
  }

  // File-wide fan-out cohort (slice-5 pattern): assembly
  // reconciliation compares the whole offering+period scope, so every
  // fan-out release stages the same refs.
  let fan: {
    s1: { cookie: string; ref: string; accountId: string };
    s2: { cookie: string; ref: string; accountId: string };
    lec: string;
    coord: string;
    mod: string;
    exam: string;
  } | null = null;
  async function fanCohort() {
    if (!fan) {
      const lec = (await user(db, 'LEC', ['stage-marks'], 'OFFERING', OFFERING_REF)).cookie;
      const coord = (await user(db, 'COORDINATOR', ['approve-assessment'], 'SCHOOL', 'Computing')).cookie;
      const mod = (await user(db, 'MODERATOR', ['moderate-results'], 'OFFERING', OFFERING_REF)).cookie;
      const exam = (await user(db, 'EXAMINATIONS_OFFICER', ['validate-results'], 'PERIOD', PERIOD_CODE)).cookie;
      fan = { s1: await studentRef(), s2: await studentRef(), lec, coord, mod, exam };
    }
    return fan;
  }

  it('fan-out-release: release writes per-student RESULT_RELEASED records in-TX', async () => {
    const { s1, s2, lec, coord, mod, exam } = await fanCohort();
    await post('/templates', templateBody({ event: 'RESULT_RELEASED' }), sysadmin).expect(201);
    await releasedPackage([s1.ref, s2.ref], lec, coord, mod, exam);
    for (const s of [s1, s2]) {
      const mine = (await request(app.getHttpServer())
        .get('/notifications/records/mine')
        .set('Cookie', s.cookie)
        .expect(200)).body as { items: Array<{ event: string; mandatory: boolean }> };
      const found = mine.items.filter((i) => i.event === 'RESULT_RELEASED');
      expect(found).toHaveLength(1);
      expect(found[0].mandatory).toBe(true);
    }
  });

  it('fan-out-amend: amendment approval writes RESULT_AMENDED record', async () => {
    const { s1, s2, lec, coord, mod, exam } = await fanCohort();
    await post('/templates', templateBody({ event: 'RESULT_RELEASED' }), sysadmin).expect(201);
    await post('/templates', templateBody({ event: 'RESULT_AMENDED' }), sysadmin).expect(201);
    const pkg = await releasedPackage([s1.ref, s2.ref], lec, coord, mod, exam);
    const opened = (await request(app.getHttpServer())
      .post('/assessment/amendments')
      .set(csrf)
      .set('Cookie', lec)
      .send({
        idempotencyKey: key(),
        packageId: pkg.id,
        studentRef: s1.ref,
        correctedTotal: 74,
        reason: 'Verified clerical error.',
        declaration:
          'I confirm that this official-result amendment is complete for its student and I submit it within my assigned authority.',
      })
      .expect(201)).body as { id: string; version: number };
    await request(app.getHttpServer())
      .post(`/assessment/amendments/${opened.id}/decide`)
      .set(csrf)
      .set('Cookie', exam)
      .send({ idempotencyKey: key(), version: opened.version, to: 'APPROVE' })
      .expect(201);
    const mine = (await request(app.getHttpServer())
      .get('/notifications/records/mine')
      .set('Cookie', s1.cookie)
      .expect(200)).body as { items: Array<{ event: string }> };
    expect(mine.items.map((i) => i.event)).toContain('RESULT_AMENDED');
  });
});
