import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/identity-access/prisma.service.js';
import { MoodleGradeImportService } from '../src/assessment/moodle-grade-import.service.js';
import { MoodleLiveRunService } from '../src/integration/moodle-live-run.service.js';
import {
  LiveMoodleAdapter,
  MoodleApiError,
} from '../src/integration/moodle-live.js';
import { user } from './helpers/phase6.js';
import { key } from './helpers/assessment.js';

describe('live Moodle grade import: HTTP and PostgreSQL custody', () => {
  let app: INestApplication;
  let db: PrismaService;
  const permit = vi.fn().mockResolvedValue({
    host: 'moodle.example.invalid',
    runId: 'CONNECTED-GRADE-REVIEW',
    configFingerprint: 'fixed',
  });
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      !/(test|review|ci)/i.test(target.pathname)
    )
      throw Error('isolated local review database required');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MoodleLiveRunService)
      .useValue({ registrationBatchDeliveryPermit: permit })
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
  });
  afterAll(async () => {
    await app?.close();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  async function fixture() {
    const code = `LIVE-${key().slice(0, 8)}`;
    const lecturer = await user(db, 'LEC', ['stage-marks'], 'OFFERING', code);
    const reviewer = await user(
      db,
      'COORDINATOR',
      ['approve-assessment'],
      'SCHOOL',
      'Computing',
    );
    const pupil = await user(db, 'STUDENT', ['study'], 'STUDENT', 'SELF');
    const account = await db.account.findUniqueOrThrow({
      where: { id: pupil.accountId },
    });
    const student = await db.student.create({
      data: { personId: account.personId, studentNumber: `S-${key()}` },
    });
    const programme = await db.programme.create({
      data: {
        code,
        name: 'Connected integration review',
        awardLevel: 'BSc',
        school: 'Computing',
        duration: '4 years',
        overview: 'Generated connected fixture',
        feeScheduleRef: 'DEMO',
        publishedVersion: '1',
        effectiveDate: new Date(),
        owningOffice: 'Registry',
      },
    });
    const offering = await db.programmeOffering.create({
      data: {
        programmeId: programme.id,
        intake: code,
        studyMode: 'FULLTIME',
        campus: 'MAIN',
        availability: 'OPEN',
      },
    });
    const application = await db.application.create({
      data: {
        accountId: pupil.accountId,
        offeringId: offering.id,
        reference: key(),
        policyVersion: 'REVIEW',
        requirementVersion: '1',
      },
    });
    const attempt = await db.programmeAttempt.create({
      data: {
        studentId: student.id,
        applicationId: application.id,
        offeringId: offering.id,
        intake: code,
      },
    });
    const course = await db.course.create({
      data: {
        code,
        title: 'Connected course',
        credits: 15,
        courseType: 'HALF',
        capacity: 40,
      },
    });
    const period = await db.academicPeriod.create({
      data: { code, status: 'OPEN' },
    });
    const registration = await db.institutionalRegistration.create({
      data: {
        attemptId: attempt.id,
        periodId: period.id,
        snapshot: {},
        receipt: key(),
        roster: { create: { courseId: course.id } },
      },
      include: { roster: true },
    });
    const plan = await db.assessmentPlan.create({
      data: {
        offeringRef: code,
        periodCode: code,
        status: 'APPROVED',
        policyVersion: 'ASSESSMENT-DEMO-v1',
        createdByAccountId: lecturer.accountId,
        approvedByAccountId: reviewer.accountId,
        components: {
          create: {
            code: 'CA-ASSIGN',
            maxMark: 20,
            weight: 100,
            status: 'APPROVED',
          },
        },
      },
      include: { components: true },
    });
    const mapping = await db.gradeActivityMapping.create({
      data: {
        componentId: plan.components[0].id,
        moodleCourseRef: '12',
        moodleActivityId: '42',
        status: 'ACTIVE',
        createdByAccountId: lecturer.accountId,
        activatedByAccountId: reviewer.accountId,
      },
    });
    const shell = await db.moodleMapping.create({
      data: {
        kind: 'SHELL',
        sisType: 'COURSE_PERIOD',
        sisId: `${course.id}:${period.id}`,
        moodleId: '12',
        status: 'ACTIVE',
        creatorAccountId: lecturer.accountId,
        activatorAccountId: reviewer.accountId,
        checks: {
          create: {
            result: 'PASS',
            reasons: { runId: 'CONNECTED-GRADE-REVIEW' },
          },
        },
      },
    });
    await db.moodleMapping.create({
      data: {
        kind: 'USER',
        sisType: 'STUDENT',
        sisId: student.id,
        moodleId: '7',
        status: 'ACTIVE',
        creatorAccountId: lecturer.accountId,
        activatorAccountId: reviewer.accountId,
        checks: {
          create: {
            result: 'PASS',
            reasons: { runId: 'CONNECTED-GRADE-REVIEW' },
          },
        },
      },
    });
    const raw = {
      usergrades: [
        {
          courseid: 12,
          userid: 7,
          gradeitems: [
            {
              id: 42,
              itemtype: 'mod',
              itemmodule: 'assign',
              scaleid: 0,
              grademin: 0,
              grademax: 20,
              graderaw: 17,
              gradedategraded: 100,
            },
          ],
        },
      ],
      warnings: [],
    };
    const read = vi
      .spyOn(LiveMoodleAdapter.prototype, 'readGradeItems')
      .mockResolvedValue(raw);
    // Constructor configuration is exercised separately by real HTTP transport
    // tests. Set complete descriptor values here; no request reaches this host.
    vi.stubEnv('MOODLE_INTEGRATION_MODE', 'live-test');
    vi.stubEnv('MOODLE_API_URL', 'https://moodle.example.invalid');
    vi.stubEnv('MOODLE_API_TOKEN', 'loopback-review-token');
    vi.stubEnv('MOODLE_ALLOWED_HOST', 'moodle.example.invalid');
    vi.stubEnv('MOODLE_EXPECTED_SITE_ID', '1');
    vi.stubEnv('MOODLE_EXPECTED_VERSION', '5.2');
    vi.stubEnv('MOODLE_ROLE_IDS', '{"student":5,"teacher":3}');
    vi.stubEnv('MOODLE_CATEGORY_ID', '3');
    vi.stubEnv('MOODLE_COURSE_VISIBLE', '1');
    vi.stubEnv('MOODLE_LIVE_TEST_RUN_ID', 'CONNECTED-GRADE-REVIEW');
    vi.stubEnv('MOODLE_LIVE_TEST_DB_FINGERPRINT', 'a'.repeat(64));
    vi.stubEnv('MOODLE_LIVE_TEST_COHORT_PREFIX', 'SIS-MOODLE-LIVE-TEST-');
    const post = (
      idempotencyKey = key(),
      cookie = lecturer.cookie,
      extra = {},
    ) =>
      request(app.getHttpServer())
        .post(`/assessment/mappings/${mapping.id}/import-moodle`)
        .set('Cookie', cookie)
        .set('x-requested-with', 'XMLHttpRequest')
        .send({ idempotencyKey, ...extra });
    return {
      lecturer,
      pupil,
      student,
      registration,
      mapping,
      shell,
      raw,
      read,
      post,
    };
  }
  it('imports provider marks, freezes provenance and recovers a lost response without reading again', async () => {
    const f = await fixture();
    const reference = key();
    const result = await f.post(reference).expect(201);
    expect(result.body.lines[0]).toMatchObject({
      studentRef: f.student.studentNumber,
      rawValue: 17,
      convertedValue: 17,
    });
    expect(result.body.sourceResponse).toMatchObject({
      transfer: 'LIVE_REST',
      runId: 'CONNECTED-GRADE-REVIEW',
    });
    expect(result.body.sourceRevision).toMatch(/^moodle:[a-f0-9]{64}$/);
    const replay = await f.post(reference).expect(201);
    expect(replay.body.id).toBe(result.body.id);
    expect(f.read).toHaveBeenCalledTimes(1);
    expect(
      await db.gradeBatch.count({ where: { mappingId: f.mapping.id } }),
    ).toBe(1);
    expect(
      await db.officialCARecord.count({
        where: { resolvedStudentId: f.student.id },
      }),
    ).toBe(0);
    expect(permit.mock.calls.at(-1)?.[1]).toEqual(
      expect.arrayContaining([f.registration.roster[0].id]),
    );
  });
  it('does not disclose a receipt to an obsolete session context', async () => {
    const f = await fixture();
    const reference = key();
    await f.post(reference).expect(201);
    const assignment = await db.roleAssignment.findFirstOrThrow({
      where: { accountId: f.lecturer.accountId, role: 'LEC' },
    });
    await db.session.updateMany({
      where: { accountId: f.lecturer.accountId },
      data: { activeAssignmentId: null },
    });
    await expect(
      app.get(MoodleGradeImportService).import(
        {
          accountId: f.lecturer.accountId,
          assignmentId: assignment.id,
          activeRole: 'LEC',
          scope: `${assignment.scopeType}:${assignment.scopeRef}`,
          sessionToken: f.lecturer.cookie.slice(4),
        },
        reference,
        f.mapping.id,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(f.read).toHaveBeenCalledTimes(1);
  });
  it('rejects caller-supplied marks, student access and missing CSRF', async () => {
    const f = await fixture();
    await f.post(key(), f.pupil.cookie).expect(403);
    await f
      .post(key(), f.lecturer.cookie, { lines: [{ rawValue: 100 }] })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/assessment/mappings/${f.mapping.id}/import-moodle`)
      .set('Cookie', f.lecturer.cookie)
      .send({ idempotencyKey: key() })
      .expect(403);
    expect(f.read).not.toHaveBeenCalled();
  });
  it('detects authority revoked while Moodle is responding and rolls back staging', async () => {
    const f = await fixture();
    f.read.mockImplementation(async () => {
      await db.roleAssignment.updateMany({
        where: { accountId: f.lecturer.accountId },
        data: { revokedAt: new Date() },
      });
      return f.raw;
    });
    await f.post().expect(403);
    expect(
      await db.gradeBatch.count({ where: { mappingId: f.mapping.id } }),
    ).toBe(0);
  });
  it.each(['revoke', 'switch'] as const)(
    'rejects a %s of the issuing session during the remote read',
    async (change) => {
      const f = await fixture();
      f.read.mockImplementation(async () => {
        await db.session.updateMany({
          where: { accountId: f.lecturer.accountId },
          data:
            change === 'revoke'
              ? { revokedAt: new Date() }
              : { activeAssignmentId: null },
        });
        return f.raw;
      });
      await f.post().expect(403);
      expect(
        await db.gradeBatch.count({ where: { mappingId: f.mapping.id } }),
      ).toBe(0);
    },
  );
  it('detects mapping drift and preserves earlier evidence during provider failure', async () => {
    const f = await fixture();
    f.read.mockImplementation(async () => {
      await db.moodleMapping.update({
        where: { id: f.shell.id },
        data: { version: { increment: 1 } },
      });
      return f.raw;
    });
    await f.post().expect(409);
    expect(
      await db.gradeBatch.count({ where: { mappingId: f.mapping.id } }),
    ).toBe(0);
    f.read.mockRejectedValue(
      new MoodleApiError(true, 'Connection unavailable.', 'MOODLE_TIMEOUT'),
    );
    await f.post().expect(503);
    expect(
      await db.gradeBatch.count({ where: { mappingId: f.mapping.id } }),
    ).toBe(0);
  });
  it('refuses an untested or self-activated identity binding before reading grades', async () => {
    const f = await fixture();
    await db.moodleMapping.updateMany({
      where: { sisType: 'STUDENT', sisId: f.student.id },
      data: { activatorAccountId: f.lecturer.accountId },
    });
    await f.post().expect(409);
    expect(f.read).not.toHaveBeenCalled();
  });
  it('refuses bindings verified for another run even when their numeric Moodle IDs match', async () => {
    const f = await fixture();
    await db.mappingCheck.updateMany({
      where: { mappingId: f.shell.id, result: 'PASS' },
      data: { reasons: { runId: 'another-target-run' } },
    });
    await f.post().expect(409);
    expect(f.read).not.toHaveBeenCalled();
  });
});
