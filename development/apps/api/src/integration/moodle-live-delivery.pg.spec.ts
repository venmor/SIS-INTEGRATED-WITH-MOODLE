import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../identity-access/prisma.service.js';
import { MoodleLiveDeliveryService } from './moodle-live-delivery.service.js';
import type { MoodleLiveRunService } from './moodle-live-run.service.js';
import { IntegrationService } from './integration.service.js';
import type { OpsService } from '../ops/ops.service.js';
import { MoodleLiveRecoveryService } from './moodle-live-recovery.service.js';
import { hashToken } from '../identity-access/session.service.js';
import type { SessionAuthority } from '../identity-access/transaction-session.js';
import { selectBackend } from './moodle-live-config.js';

// Explicit disposable database opt-in; there is no cleanup/reset of shared rows.
describe.skipIf(process.env.MOODLE_DELIVERY_PG_TEST !== '1')(
  'Moodle external claims on PostgreSQL',
  () => {
    let db: PrismaService,
      worker: MoodleLiveDeliveryService,
      rowId: string,
      registrationId: string,
      studentId: string,
      courseId: string;
    let userCreated = false,
      enrolled = false,
      failMutation = false;
    const calls: string[] = [];
    let pauseAfterSiteInfo = false,
      refuseMutation = false,
      support: SessionAuthority;
    const permit = vi.fn(async () => {
      const s = selectBackend();
      if (s.kind !== 'live-test') throw Error('TEST_CONFIGURATION');
      return s.descriptor;
    });
    async function event(type = 'MoodleEnrolmentQueued') {
      return db.outboxEvent.create({
        data: {
          aggregate: 'InstitutionalRegistration',
          aggregateId: registrationId,
          type,
          payload: { registrationId },
        },
      });
    }
    beforeAll(async () => {
      if (!process.env.DATABASE_URL?.includes('sis_moodle_delivery_review_'))
        throw Error('ISOLATED_DELIVERY_DATABASE_REQUIRED');
      for (const [k, v] of Object.entries({
        DEMO_MODE: 'true',
        SIS_ENABLE_MOODLE_DEMO_BOOTSTRAP: 'true',
        MOODLE_DEMO_INITIAL_PASSWORD: 'Private-bootstrap-review-2026!',
        MOODLE_INTEGRATION_MODE: 'live-test',
        MOODLE_API_URL: 'https://delivery.example.moodlecloud.com',
        MOODLE_API_TOKEN: 'fixture-secret',
        MOODLE_ALLOWED_HOST: 'delivery.example.moodlecloud.com',
        MOODLE_EXPECTED_SITE_ID: '1',
        MOODLE_EXPECTED_VERSION: '5.2',
        MOODLE_ROLE_IDS: '{"Student":5}',
        MOODLE_CATEGORY_ID: '3',
        MOODLE_COURSE_VISIBLE: '1',
        MOODLE_LIVE_TEST_RUN_ID: `delivery-${randomUUID()}`,
        MOODLE_LIVE_TEST_DB_FINGERPRINT: '0'.repeat(64),
        MOODLE_LIVE_TEST_COHORT_PREFIX: 'SIS-MOODLE-LIVE-TEST-',
      }))
        vi.stubEnv(k, v);
      db = new PrismaService();
      await db.$connect();
      const person = await db.person.create({
        data: {
          displayName: 'Lombe Delivery',
          email: `${randomUUID()}@example.invalid`,
        },
      });
      const student = await db.student.create({
        data: { personId: person.id, studentNumber: `D-${randomUUID()}` },
      });
      studentId = student.id;
      const offering = await db.programmeOffering.findFirstOrThrow();
      const attempt = await db.programmeAttempt.create({
        data: {
          studentId,
          applicationId: randomUUID(),
          offeringId: offering.id,
          intake: offering.intake,
          status: 'REGISTERED',
        },
      });
      const period = await db.academicPeriod.create({
        data: { code: `DELIVERY-${randomUUID()}`, status: 'ACTIVE' },
      });
      const course = await db.course.create({
        data: {
          code: `D-${randomUUID()}`,
          title: 'Integration Methods',
          credits: 15,
          courseType: 'SEMESTER',
          capacity: 50,
        },
      });
      courseId = course.id;
      const curriculum = await db.curriculumVersion.create({
        data: {
          programmeId: offering.programmeId,
          version: Math.floor(Date.now() / 1000),
          status: 'PUBLISHED',
        },
      });
      await db.curriculumCourse.create({
        data: { curriculumId: curriculum.id, courseId },
      });
      await db.programmeAttempt.update({
        where: { id: attempt.id },
        data: { curriculumVersionId: curriculum.id },
      });
      const reg = await db.institutionalRegistration.create({
        data: {
          attemptId: attempt.id,
          periodId: period.id,
          status: 'REGISTERED',
          snapshot: {},
          receipt: randomUUID(),
        },
      });
      registrationId = reg.id;
      const row = await db.courseRegistration.create({
        data: { registrationId, courseId },
      });
      rowId = row.id;
      await db.moodleLiveTestRun.create({
        data: {
          runId: process.env.MOODLE_LIVE_TEST_RUN_ID!,
          state: 'FAILED', // FK fixture only; persisted permit policy is tested separately.
          scopeType: 'SYSTEM',
          scopeRef: 'DELIVERY-REVIEW',
          dbFingerprint: '0'.repeat(64),
          schemaChecksum: '1'.repeat(64),
          scopeManifestChecksum: '2'.repeat(64),
          configFingerprint: '3'.repeat(64),
          expectedHost: 'delivery.example.moodlecloud.com',
          expectedSiteId: 1,
          expectedRelease: '5.2',
          cohortPrefix: 'SIS-MOODLE-LIVE-TEST-',
          nonProductionConfirmed: true,
          syntheticOnlyConfirmed: true,
          creatorAccountId: 'synthetic-creator',
        },
      });
      const mapping = await db.moodleMapping.create({
        data: {
          kind: 'SHELL',
          sisType: 'COURSE_PERIOD',
          sisId: `${courseId}:${period.id}`,
          moodleId: '14',
          status: 'ACTIVE',
          creatorAccountId: 'synthetic-creator',
          activatorAccountId: 'synthetic-activator',
        },
      });
      await db.mappingCheck.createMany({
        data: [
          {
            mappingId: mapping.id,
            result: 'PASS',
            reasons: { runId: process.env.MOODLE_LIVE_TEST_RUN_ID },
          },
          {
            mappingId: mapping.id,
            result: 'ACADEMIC_APPROVED',
            reasons: { curriculumVersionId: curriculum.id },
          },
        ],
      });
      const reviewer = await db.person.create({
        data: { displayName: 'Delivery support reviewer' },
      });
      const account = await db.account.create({
        data: { personId: reviewer.id, username: `support-${randomUUID()}` },
      });
      const assignment = await db.roleAssignment.create({
        data: {
          accountId: account.id,
          role: 'INTEGRATION_SUPPORT',
          scopeType: 'SYSTEM',
          scopeRef: 'DELIVERY-REVIEW',
          capabilities: ['replay-event'],
          reason: 'Synthetic delivery recovery verification',
        },
      });
      const sessionToken = randomUUID();
      await db.session.create({
        data: {
          accountId: account.id,
          activeAssignmentId: assignment.id,
          tokenHash: hashToken(sessionToken),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      support = {
        accountId: account.id,
        assignmentId: assignment.id,
        activeRole: 'INTEGRATION_SUPPORT',
        scope: 'SYSTEM:DELIVERY-REVIEW',
        sessionToken,
      };
      worker = new MoodleLiveDeliveryService(db, {
        registrationDeliveryPermit: permit,
      } as unknown as MoodleLiveRunService);
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: unknown, options?: RequestInit) => {
          const body = options?.body as URLSearchParams,
            fn = body.get('wsfunction')!;
          calls.push(fn);
          let data: unknown = null;
          if (fn === 'core_webservice_get_site_info') {
            if (pauseAfterSiteInfo) {
              pauseAfterSiteInfo = false;
              await db.moodleConnection.update({
                where: { provider: 'MOODLE-SIM-v1' },
                data: { capabilities: { paused: true } },
              });
            }
            data = { siteid: 1, release: '5.2', version: '20261018' };
          } else if (fn === 'core_course_get_courses_by_field')
            data = {
              courses: [
                {
                  id: 14,
                  shortname: 'INTEGRATION',
                  idnumber: 'SIS-DELIVERY-REVIEW',
                  categoryid: 3,
                },
              ],
            };
          else if (fn === 'core_enrol_get_course_enrolment_methods')
            data = [{ id: 1, type: 'manual', status: true }];
          else if (fn === 'core_user_get_users_by_field')
            data = userCreated
              ? [
                  {
                    id: 812,
                    idnumber: `SIS-STUDENT-${studentId}`,
                    username: `sis.${studentId.toLowerCase()}`,
                  },
                ]
              : [];
          else if (fn === 'core_user_create_users') {
            expect(body.get('users[0][createpassword]')).toBe('0');
            expect(body.get('users[0][preferences][0][value]')).toBe('1');
            userCreated = true;
            data = [{ id: 812 }];
          } else if (fn === 'enrol_manual_enrol_users') {
            if (refuseMutation) {
              refuseMutation = false;
              return new Response('', { status: 403 });
            }
            enrolled = body.get('enrolments[0][suspend]') !== '1';
            if (failMutation) {
              failMutation = false;
              return new Response('', { status: 503 });
            }
          } else if (fn === 'core_enrol_get_enrolled_users')
            data = enrolled ? [{ id: 812, roles: [{ roleid: 5 }] }] : [];
          else throw Error('UNEXPECTED_FUNCTION');
          return new Response(JSON.stringify(data), {
            headers: { 'content-type': 'application/json' },
          });
        }),
      );
    });
    afterAll(async () => {
      await db?.$disconnect();
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });
    it('racing workers produce one claim, one identity and confirmed course access', async () => {
      const e = await event();
      const results = await Promise.all([
        worker.deliver(e.id, rowId),
        worker.deliver(e.id, rowId),
      ]);
      expect(results.sort()).toEqual(['DEFERRED', 'DELIVERED']);
      expect(calls.filter((f) => f === 'core_user_create_users')).toHaveLength(
        1,
      );
      expect(
        await db.moodleLiveDeliveryClaim.count({ where: { outboxId: e.id } }),
      ).toBe(1);
      expect(
        (await db.outboxEvent.findUniqueOrThrow({ where: { id: e.id } }))
          .deliveredAt,
      ).not.toBeNull();
      expect(
        await db.$transaction((tx) =>
          worker.confirmedStudentIdentity(tx, rowId),
        ),
      ).toMatchObject({ moodleUserId: 812 });
      const claim = await db.moodleLiveDeliveryClaim.findFirstOrThrow({
        where: { outboxId: e.id },
      });
      expect(JSON.stringify(claim)).not.toContain('Private-bootstrap');
      const integration = new IntegrationService(db, {} as OpsService, worker);
      const access = await integration.liveRegistrationAccess(
        registrationId,
        studentId,
      );
      expect(access).toMatchObject({
        state: 'READY',
        confirmedCount: 1,
        totalCourses: 1,
        username: `sis.${studentId.toLowerCase()}`,
      });
      expect(access?.courses[0]?.moodleCourseUrl).toBe(
        'https://delivery.example.moodlecloud.com/course/view.php?id=14',
      );
      await expect(
        integration.liveRegistrationAccess(registrationId, 'foreign-student'),
      ).rejects.toThrow('Registration unavailable.');
      // An unrelated course change increments the registration envelope; it
      // must not invalidate this course's unchanged positive access proof.
      await db.institutionalRegistration.update({
        where: { id: registrationId },
        data: { version: { increment: 1 } },
      });
      expect(
        await integration.liveRegistrationAccess(registrationId, studentId),
      ).toMatchObject({ state: 'READY' });
    });
    it('a closed permit leaves the source pending without taking a lease or calling Moodle', async () => {
      const e = await event(),
        before = calls.length;
      permit.mockRejectedValueOnce(Error('RUNNING_RUN_REQUIRED'));
      await expect(worker.deliver(e.id, rowId)).rejects.toThrow(
        'RUNNING_RUN_REQUIRED',
      );
      expect(calls).toHaveLength(before);
      expect(
        await db.moodleLiveDeliveryClaim.count({ where: { outboxId: e.id } }),
      ).toBe(0);
    });
    it('unknown mutation outcomes reconcile by identity before retrying and never create a second account', async () => {
      const e = await event();
      failMutation = true;
      expect(await worker.deliver(e.id, rowId)).toBe('RETRY');
      await db.moodleLiveDeliveryClaim.updateMany({
        where: { outboxId: e.id },
        data: { nextRunAt: new Date(0) },
      });
      expect(await worker.deliver(e.id, rowId)).toBe('DELIVERED');
      expect(calls.filter((f) => f === 'core_user_create_users')).toHaveLength(
        1,
      );
    });
    it('global pause prevents live delegation, direct claims and mutation after a late pause', async () => {
      await db.moodleConnection.upsert({
        where: { provider: 'MOODLE-SIM-v1' },
        create: { provider: 'MOODLE-SIM-v1', capabilities: { paused: true } },
        update: { capabilities: { paused: true } },
      });
      const e = await event(),
        before = calls.length;
      const spy = vi.spyOn(worker, 'run');
      expect(
        await new IntegrationService(db, {} as OpsService, worker).runWorker(),
      ).toMatchObject({ processed: 0 });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
      expect(await worker.deliver(e.id, rowId)).toBe('DEFERRED');
      expect(calls).toHaveLength(before);
      expect(
        await db.moodleLiveDeliveryClaim.count({ where: { outboxId: e.id } }),
      ).toBe(0);
      await db.moodleConnection.update({
        where: { provider: 'MOODLE-SIM-v1' },
        data: { capabilities: { paused: false } },
      });
      const mutationCount = calls.filter(
        (fn) => fn === 'enrol_manual_enrol_users',
      ).length;
      pauseAfterSiteInfo = true;
      expect(await worker.deliver(e.id, rowId)).toBe('RETRY');
      expect(
        calls.filter((fn) => fn === 'enrol_manual_enrol_users'),
      ).toHaveLength(mutationCount);
      expect(
        await db.moodleLiveDeliveryClaim.findFirstOrThrow({
          where: { outboxId: e.id },
        }),
      ).toMatchObject({ state: 'RETRY', lastCode: 'DELIVERY_PAUSED' });
      await db.moodleConnection.update({
        where: { provider: 'MOODLE-SIM-v1' },
        data: { capabilities: { paused: false } },
      });
    });
    it('durable keyset traversal passes 25 blocked events and delivers the later valid registration', async () => {
      const start = new Date(Date.now() + 3600000);
      await db.outboxEvent.createMany({
        data: Array.from({ length: 25 }, (_, index) => ({
          id: randomUUID(),
          aggregate: 'InstitutionalRegistration',
          aggregateId: randomUUID(),
          type: 'MoodleEnrolmentQueued',
          payload: { registrationId: randomUUID() },
          occurredAt: new Date(start.getTime() + index),
        })),
      });
      const valid = await db.outboxEvent.create({
        data: {
          aggregate: 'InstitutionalRegistration',
          aggregateId: registrationId,
          type: 'MoodleEnrolmentQueued',
          payload: { registrationId },
          occurredAt: new Date(start.getTime() + 1000),
        },
      });
      await db.moodleLiveDeliverySchedule.upsert({
        where: { runId: process.env.MOODLE_LIVE_TEST_RUN_ID! },
        create: {
          runId: process.env.MOODLE_LIVE_TEST_RUN_ID!,
          occurredAt: new Date(start.getTime() - 1),
          outboxId: 'delivery-test-cursor',
        },
        update: { occurredAt: new Date(start.getTime() - 1), outboxId: 'delivery-test-cursor' },
      });
      const blocked = await worker.run(25);
      expect(blocked.processed).toBe(0);
      expect(blocked.deferred).toBeGreaterThanOrEqual(25);
      expect(await worker.run(25)).toMatchObject({ delivered: 1 });
      expect(
        (await db.outboxEvent.findUniqueOrThrow({ where: { id: valid.id } }))
          .deliveredAt,
      ).not.toBeNull();
      expect(
        await db.moodleLiveDeliverySchedule.findUniqueOrThrow({
          where: { runId: process.env.MOODLE_LIVE_TEST_RUN_ID! },
        }),
      ).toMatchObject({ outboxId: valid.id });
    });
    it('scoped recovery preserves manual-review evidence and reconciles an already applied Moodle outcome', async () => {
      const e = await event();
      refuseMutation = true;
      expect(await worker.deliver(e.id, rowId)).toBe('MANUAL_REVIEW');
      const old = await db.moodleLiveDeliveryClaim.findFirstOrThrow({
        where: { outboxId: e.id },
      });
      const recovery = new MoodleLiveRecoveryService(
        db,
        worker,
        new IntegrationService(db, {} as OpsService, worker),
      );
      await expect(
        recovery.retry({ ...support, activeRole: 'MOODLE_ADMIN' }, old.id, {
          idempotencyKey: randomUUID(),
          reason: 'Verified the target course and learner binding.',
        }),
      ).rejects.toThrow();
      expect((await recovery.list(support)).items).toContainEqual(expect.objectContaining({ id: old.id, canRetry: true }));
      await expect(recovery.list({ ...support, activeRole: 'MOODLE_ADMIN' })).rejects.toThrow();
      const key = randomUUID();
      expect(
        await recovery.retry(support, old.id, {
          idempotencyKey: key,
          reason: 'Verified the target course and learner binding.',
        }),
      ).toMatchObject({ outcome: 'RECOVERY_QUEUED' });
      const audit = await db.auditEvent.findFirstOrThrow({
        where: { action: 'MoodleLiveRecoveryRequested', targetRef: old.id },
      });
      expect(audit.priorState).toMatchObject({
        lastCode: 'MOODLE_REMOTE_REFUSAL',
        evidenceChecksum: old.evidenceChecksum,
        sourceChecksum: old.sourceChecksum,
      });
      const before = calls.filter(
        (fn) => fn === 'enrol_manual_enrol_users',
      ).length;
      expect(await worker.deliver(e.id, rowId)).toBe('DELIVERED');
      expect(
        calls.filter((fn) => fn === 'enrol_manual_enrol_users'),
      ).toHaveLength(before);
      expect(
        await db.moodleLiveDeliveryClaim.findUniqueOrThrow({
          where: { id: old.id },
        }),
      ).toMatchObject({ lastCode: 'ALREADY_APPLIED' });
      await db.roleAssignment.update({
        where: { id: support.assignmentId! },
        data: { revokedAt: new Date() },
      });
      await expect(
        recovery.retry(support, old.id, {
          idempotencyKey: key,
          reason: 'Verified the target course and learner binding.',
        }),
      ).rejects.toThrow('CURRENT_SESSION_REQUIRED');
    });
    it('course removal suspends access while retaining the learner identity and result evidence', async () => {
      await db.courseRegistration.update({
        where: { id: rowId },
        data: { status: 'DROPPED' },
      });
      const e = await event('MoodleCourseRemoved');
      expect(await worker.deliver(e.id, rowId)).toBe('DELIVERED');
      expect(enrolled).toBe(false);
      expect(userCreated).toBe(true);
      expect(
        await db.$transaction((tx) =>
          worker.confirmedStudentIdentity(tx, rowId),
        ),
      ).toBeNull();
      expect(calls).not.toContain('enrol_manual_unenrol_users');
    });
    it('synthetic bootstrap cannot run unless its explicit opt-in remains enabled', async () => {
      await db.courseRegistration.update({
        where: { id: rowId },
        data: { status: 'ENROLLED' },
      });
      vi.stubEnv('SIS_ENABLE_MOODLE_DEMO_BOOTSTRAP', 'false');
      const e = await event(),
        before = calls.length;
      await expect(worker.deliver(e.id, rowId)).rejects.toThrow(
        'VERIFIED_MOODLE_CONTACT_REQUIRED',
      );
      expect(calls).toHaveLength(before);
      expect(
        await db.moodleLiveDeliveryClaim.count({ where: { outboxId: e.id } }),
      ).toBe(0);
    });
  },
);
