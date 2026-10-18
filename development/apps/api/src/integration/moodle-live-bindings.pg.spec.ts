import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { hash } from 'argon2';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { SessionAuthority } from '../identity-access/transaction-session.js';
import { IntegrationService } from './integration.service.js';
import { MoodleLiveBindingsService } from './moodle-live-bindings.service.js';
import type { MoodleLiveRunService } from './moodle-live-run.service.js';
import type { OpsService } from '../ops/ops.service.js';
import type { LiveTestDescriptor } from './moodle-live-config.js';

describe.skipIf(process.env.MOODLE_DELIVERY_PG_TEST !== '1')(
  'governed live bindings on PostgreSQL',
  () => {
    let db: PrismaService,
      service: MoodleLiveBindingsService,
      rowId: string,
      creator: SessionAuthority,
      coordinator: SessionAuthority,
      activator: SessionAuthority,
      student: SessionAuthority;
    const password = 'Private-binding-review-2026!',
      runName = `binding-${randomUUID()}`;
    const moodleStudentId = Math.floor(Math.random() * 1000000000) + 100;
    const descriptor = {
      baseUrl: 'https://binding.example.moodlecloud.com',
      host: 'binding.example.moodlecloud.com',
      restPath: '/webservice/rest/server.php',
      token: 'fixture-secret',
      timeoutMs: 1000,
      siteId: 1,
      release: '5.2',
      categoryId: 3,
      courseVisible: 1,
      roleIds: { Student: 5 },
      runId: runName,
      dbFingerprint: '0'.repeat(64),
      cohortPrefix: 'SIS-MOODLE-LIVE-TEST-',
      configFingerprint: '1'.repeat(64),
    } satisfies LiveTestDescriptor;
    async function actor(
      role: string,
      scopeType: string,
      scopeRef: string,
      personId?: string,
    ) {
      const person = personId
        ? { id: personId }
        : await db.person.create({
            data: { displayName: 'Generated binding officer' },
          });
      const account = await db.account.create({
        data: { personId: person.id, username: `binding-${randomUUID()}` },
      });
      await db.credential.create({
        data: {
          accountId: account.id,
          kind: 'PASSWORD',
          secretHash: await hash(password),
        },
      });
      const a = await db.roleAssignment.create({
        data: {
          accountId: account.id,
          role,
          scopeType,
          scopeRef,
          reason: 'Synthetic verification',
          capabilities: [
            role === 'COORDINATOR' ? 'approve-assessment' : 'manage-mapping',
          ],
        },
      });
      const sessionToken = randomUUID();
      await db.session.create({
        data: {
          accountId: account.id,
          activeAssignmentId: a.id,
          tokenHash: createHash('sha256').update(sessionToken).digest('hex'),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      return {
        sessionToken,
        accountId: account.id,
        assignmentId: a.id,
        activeRole: role,
        scope: `${scopeType}:${scopeRef}`,
      };
    }
    beforeAll(async () => {
      if (!process.env.DATABASE_URL?.includes('sis_moodle_delivery_review_'))
        throw Error('ISOLATED_DELIVERY_DATABASE_REQUIRED');
      db = new PrismaService();
      await db.$connect();
      const programme = await db.programme.create({
        data: {
          code: `BIND-${randomUUID()}`,
          name: 'Generated binding review programme',
          awardLevel: 'BSc',
          school: 'Binding review school',
          duration: '4 years',
          overview: 'Isolated generated fixture',
          feeScheduleRef: 'REVIEW',
          publishedVersion: '1',
          effectiveDate: new Date(),
          owningOffice: 'Registry',
        },
      });
      const offering = await db.programmeOffering.create({
        data: {
          programmeId: programme.id,
          intake: 'BINDING-REVIEW',
          studyMode: 'FULLTIME',
          campus: 'MAIN',
          availability: 'OPEN',
        },
        include: { programme: true },
      });
      const person = await db.person.create({
        data: { displayName: 'Generated learner' },
      });
      const learner = await db.student.create({
        data: { personId: person.id, studentNumber: `B-${randomUUID()}` },
      });
      const course = await db.course.create({
        data: {
          code: `B-${randomUUID()}`,
          title: 'Governed Integration',
          credits: 15,
          courseType: 'SEMESTER',
          capacity: 50,
        },
      });
      const cv = await db.curriculumVersion.create({
        data: {
          programmeId: offering.programmeId,
          version: Math.floor(Date.now() % 1000000000),
          status: 'PUBLISHED',
        },
      });
      await db.curriculumCourse.create({
        data: { curriculumId: cv.id, courseId: course.id },
      });
      const attempt = await db.programmeAttempt.create({
        data: {
          studentId: learner.id,
          applicationId: randomUUID(),
          offeringId: offering.id,
          intake: offering.intake,
          curriculumVersionId: cv.id,
        },
      });
      const period = await db.academicPeriod.create({
        data: { code: `BINDING-${randomUUID()}`, status: 'ACTIVE' },
      });
      const reg = await db.institutionalRegistration.create({
        data: {
          attemptId: attempt.id,
          periodId: period.id,
          snapshot: {},
          receipt: randomUUID(),
        },
      });
      rowId = (
        await db.courseRegistration.create({
          data: { registrationId: reg.id, courseId: course.id },
        })
      ).id;
      await db.moodleLiveTestRun.create({
        data: {
          runId: runName,
          state: 'FAILED',
          scopeType: 'SYSTEM',
          scopeRef: 'BINDING-REVIEW',
          dbFingerprint: '0'.repeat(64),
          schemaChecksum: '1'.repeat(64),
          scopeManifestChecksum: '2'.repeat(64),
          configFingerprint: '3'.repeat(64),
          expectedHost: descriptor.host,
          expectedSiteId: 1,
          expectedRelease: '5.2',
          cohortPrefix: descriptor.cohortPrefix,
          nonProductionConfirmed: true,
          syntheticOnlyConfirmed: true,
          creatorAccountId: 'synthetic-fixture',
        },
      });
      creator = await actor('MOODLE_ADMIN', 'SYSTEM', 'BINDING-REVIEW');
      activator = await actor('MOODLE_ADMIN', 'SYSTEM', 'BINDING-REVIEW');
      coordinator = await actor(
        'COORDINATOR',
        'SCHOOL',
        offering.programme.school,
      );
      student = await actor('STUDENT', 'PERSON', learner.id);
      service = new MoodleLiveBindingsService(
        db,
        {
          registrationDeliveryPermit: vi.fn(async () => descriptor),
        } as unknown as MoodleLiveRunService,
        new IntegrationService(db, {} as OpsService),
      );
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: unknown, options?: RequestInit) => {
          const form = options?.body as URLSearchParams;
          const fn = form.get('wsfunction');
          const value =
            fn === 'core_webservice_get_site_info'
              ? { siteid: 1, release: '5.2' }
              : fn === 'core_course_get_courses_by_field'
                ? {
                    courses: [
                      {
                        id: 14,
                        shortname: 'BINDING',
                        idnumber: 'sis-demo-course',
                        categoryid: 3,
                      },
                    ],
                  }
                : fn === 'core_enrol_get_course_enrolment_methods'
                  ? [{ id: 2, type: 'manual' }]
                  : fn === 'core_user_get_users_by_field'
                    ? [
                        {
                          id: moodleStudentId,
                          idnumber: 'sis-demo-learner',
                          username: 'sis.demo.learner',
                        },
                      ]
                    : null;
          return new Response(JSON.stringify(value), {
            headers: { 'content-type': 'application/json' },
          });
        }),
      );
    });
    afterAll(async () => {
      await db?.$disconnect();
      vi.unstubAllGlobals();
    });
    it('allows an independently reviewed course binding and recovers a lost-response replay', async () => {
      const input = {
        idempotencyKey: randomUUID(),
        courseRegistrationId: rowId,
        kind: 'SHELL' as const,
        moodleId: 14,
      };
      const drafted = (await service.draft(creator, input)) as {
        id: string;
        version: number;
      };
      expect(await service.draft(creator, input)).toEqual(drafted);
      expect(await db.moodleMapping.count({ where: { id: drafted.id } })).toBe(
        1,
      );
      await expect(
        service.decide(
          creator,
          drafted.id,
          { idempotencyKey: randomUUID(), version: 1, password },
          false,
        ),
      ).rejects.toThrow('INDEPENDENT_BINDING_DECISION_REQUIRED');
      await expect(
        service.decide(
          activator,
          drafted.id,
          { idempotencyKey: randomUUID(), version: 1, password },
          false,
        ),
      ).rejects.toThrow('INDEPENDENT_ACADEMIC_APPROVAL_REQUIRED');
      await service.decide(
        coordinator,
        drafted.id,
        { idempotencyKey: randomUUID(), version: 1 },
        true,
      );
      await expect(
        service.decide(
          activator,
          drafted.id,
          { idempotencyKey: randomUUID(), version: 1, password: 'wrong' },
          false,
        ),
      ).rejects.toThrow('FRESH_PASSWORD_REQUIRED');
      const key = randomUUID();
      expect(
        await service.decide(
          activator,
          drafted.id,
          { idempotencyKey: key, version: 1, password },
          false,
        ),
      ).toMatchObject({ status: 'ACTIVE', version: 2 });
      expect(
        await service.decide(
          activator,
          drafted.id,
          { idempotencyKey: key, version: 1 },
          false,
        ),
      ).toMatchObject({ status: 'ACTIVE', version: 2 });
    });
    it('does not let a student call the binding command or learn its source', async () => {
      await expect(
        service.draft(student, {
          idempotencyKey: randomUUID(),
          courseRegistrationId: rowId,
          kind: 'USER',
          moodleId: moodleStudentId,
        }),
      ).rejects.toThrow('LIVE_BINDING_AUTHORITY_REQUIRED');
      expect(
        await db.auditEvent.count({
          where: {
            action: 'MoodleLiveBindingRefused',
            actorAccountId: student.accountId,
          },
        }),
      ).toBeGreaterThan(0);
    });
    it('binds an existing user by verified Moodle ID/idnumber and requires independent activation', async () => {
      const m = (await service.draft(creator, {
        idempotencyKey: randomUUID(),
        courseRegistrationId: rowId,
        kind: 'USER',
        moodleId: moodleStudentId,
      })) as { id: string; version: number };
      await service.decide(
        activator,
        m.id,
        { idempotencyKey: randomUUID(), version: 1, password },
        false,
      );
      expect(
        (
          await db.mappingCheck.findFirstOrThrow({
            where: { mappingId: m.id, result: 'PASS' },
          })
        ).reasons,
      ).toMatchObject({ moodleIdnumber: 'sis-demo-learner' });
    });
    it('refuses linking one Moodle identity to two different active SIS students', async () => {
      const foreign = await db.moodleMapping.create({
        data: {
          kind: 'USER',
          sisType: 'STUDENT',
          sisId: `foreign-${randomUUID()}`,
          moodleId: String(moodleStudentId),
          status: 'ACTIVE',
          creatorAccountId: creator.accountId,
          activatorAccountId: activator.accountId,
        },
      });
      try {
        const m = (await service.draft(creator, {
          idempotencyKey: randomUUID(),
          courseRegistrationId: rowId,
          kind: 'USER',
          moodleId: moodleStudentId,
        })) as { id: string; version: number };
        await expect(
          service.decide(
            activator,
            m.id,
            { idempotencyKey: randomUUID(), version: m.version, password },
            false,
          ),
        ).rejects.toThrow('MOODLE_IDENTITY_ALREADY_BOUND');
      } finally {
        await db.moodleMapping.update({
          where: { id: foreign.id },
          data: { status: 'SUPERSEDED' },
        });
      }
    });
    it.each(['revoke', 'switch'] as const)(
      'refuses a binding when its issuing session changes during provider read: %s',
      async (change) => {
        const officer = await actor('MOODLE_ADMIN', 'SYSTEM', 'BINDING-REVIEW');
        const provider = globalThis.fetch;
        let changed = false;
        vi.stubGlobal(
          'fetch',
          vi.fn(
            async (url: Parameters<typeof fetch>[0], options?: RequestInit) => {
              const response = await provider(url, options);
              const fn = (options?.body as URLSearchParams).get('wsfunction');
              if (!changed && fn === 'core_course_get_courses_by_field') {
                changed = true;
                await db.session.updateMany({
                  where: { accountId: officer.accountId },
                  data:
                    change === 'revoke'
                      ? { revokedAt: new Date() }
                      : { activeAssignmentId: null },
                });
              }
              return response;
            },
          ),
        );
        try {
          await expect(
            service.draft(officer, {
              idempotencyKey: randomUUID(),
              courseRegistrationId: rowId,
              kind: 'SHELL',
              moodleId: 14,
            }),
          ).rejects.toThrow('CURRENT_SESSION_REQUIRED');
          expect(
            await db.moodleMapping.count({
              where: { creatorAccountId: officer.accountId },
            }),
          ).toBe(0);
        } finally {
          vi.stubGlobal('fetch', provider);
        }
      },
    );
    it('refuses binding receipt replay after switching the issuing session workspace', async () => {
      const officer = await actor('MOODLE_ADMIN', 'SYSTEM', 'BINDING-REVIEW');
      const input = {
        idempotencyKey: randomUUID(),
        courseRegistrationId: rowId,
        kind: 'USER' as const,
        moodleId: moodleStudentId,
      };
      await service.draft(officer, input);
      await db.session.updateMany({
        where: { accountId: officer.accountId },
        data: { activeAssignmentId: null },
      });
      await expect(service.draft(officer, input)).rejects.toThrow(
        'CURRENT_SESSION_REQUIRED',
      );
    });
    it.each(['expired', 'idle'] as const)(
      'refuses a %s issuing session before any binding write',
      async (state) => {
        const officer = await actor('MOODLE_ADMIN', 'SYSTEM', 'BINDING-REVIEW');
        await db.session.updateMany({
          where: { accountId: officer.accountId },
          data:
            state === 'expired'
              ? { expiresAt: new Date(Date.now() - 1000) }
              : { lastSeenAt: new Date('2000-01-01') },
        });
        await expect(
          service.draft(officer, {
            idempotencyKey: randomUUID(),
            courseRegistrationId: rowId,
            kind: 'USER',
            moodleId: moodleStudentId,
          }),
        ).rejects.toThrow('CURRENT_SESSION_REQUIRED');
        expect(
          await db.moodleMapping.count({
            where: { creatorAccountId: officer.accountId },
          }),
        ).toBe(0);
      },
    );
    it('revocation blocks a previously successful command receipt replay', async () => {
      const m = (await service.draft(creator, {
        idempotencyKey: randomUUID(),
        courseRegistrationId: rowId,
        kind: 'USER',
        moodleId: moodleStudentId,
      })) as { id: string; version: number };
      const key = randomUUID();
      await service.decide(
        activator,
        m.id,
        { idempotencyKey: key, version: 1, password },
        false,
      );
      await db.roleAssignment.update({
        where: { id: activator.assignmentId! },
        data: { revokedAt: new Date() },
      });
      await expect(
        service.decide(
          activator,
          m.id,
          { idempotencyKey: key, version: 1 },
          false,
        ),
      ).rejects.toThrow('CURRENT_SESSION_REQUIRED');
    });
  },
);
