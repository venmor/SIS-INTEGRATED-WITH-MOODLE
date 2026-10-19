import { Injectable } from '@nestjs/common';
import { MOODLE_DEMO_V1 } from '@sis/config';
import { createHash, randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { MoodleWorkerRunResult } from '@sis/contracts';
import { PrismaService } from '../identity-access/prisma.service.js';
import { MoodleLiveRunService } from './moodle-live-run.service.js';
import { MoodleWriteTransport } from './moodle-write-transport.js';
import { selectBackend } from './moodle-live-config.js';

type Tx = Prisma.TransactionClient;
const digest = (v: unknown) =>
  createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function assertLiveMapping(
  m: {
    status: string;
    moodleId: string;
    creatorAccountId: string;
    activatorAccountId: string | null;
  } | null,
) {
  if (
    !m ||
    m.status !== 'ACTIVE' ||
    !/^[1-9][0-9]*$/.test(m.moodleId) ||
    !m.activatorAccountId ||
    m.activatorAccountId === m.creatorAccountId ||
    m.creatorAccountId === 'SYSTEM' ||
    m.activatorAccountId === 'SYSTEM'
  )
    throw new Error('INDEPENDENT_NUMERIC_MAPPING_REQUIRED');
  return Number(m.moodleId);
}

/** Only the worker calls this service. Source registration never waits for HTTP.
 * Each official course registration has independent durable external custody.
 */
@Injectable()
export class MoodleLiveDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runs: MoodleLiveRunService,
  ) {}
  private async paused(tx: Tx | PrismaService) {
    const connection = await tx.moodleConnection.findUnique({
      where: { provider: MOODLE_DEMO_V1.provider },
    });
    return (
      (connection?.capabilities as Record<string, unknown> | null)?.paused ===
      true
    );
  }
  private async assertWritable(
    tx: Tx,
    outboxId: string,
    rowId: string,
    claim: { id: string; leaseToken: string },
    fingerprint: string,
  ) {
    if (await this.paused(tx)) throw new Error('DELIVERY_PAUSED');
    const fresh = await this.source(tx, outboxId, rowId);
    const lease = await tx.moodleLiveDeliveryClaim.findFirst({
      where: {
        id: claim.id,
        leaseToken: claim.leaseToken,
        state: 'DELIVERING',
        leaseUntil: { gt: new Date() },
      },
    });
    if (!lease || fresh.fingerprint !== fingerprint)
      throw new Error('CLAIM_SOURCE_CHANGED');
  }
  /** Used only by scoped recovery commands; returns nonsecret current proof. */
  async recoverySnapshot(tx: Tx, claimId: string) {
    const claim = await tx.moodleLiveDeliveryClaim.findUniqueOrThrow({
      where: { id: claimId },
    });
    const source = await this.source(
      tx,
      claim.outboxId,
      claim.courseRegistrationId,
    );
    const run = await tx.moodleLiveTestRun.findUniqueOrThrow({
      where: { runId: source.descriptor.runId },
    });
    if (claim.runId !== run.id) throw new Error('RECOVERY_RUN_MISMATCH');
    return {
      claim,
      run,
      sourceChecksum: source.fingerprint,
      mappingId: source.mapping.id,
      mappingVersion: source.mapping.version,
    };
  }
  private async nextPage(runId: string, limit: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`moodle-live-traversal:${runId}`},0))::text`;
      if (await this.paused(tx)) return [];
      const cursor = await tx.moodleLiveDeliverySchedule.findUnique({
        where: { runId },
      });
      const base = {
        deliveredAt: null,
        type: {
          in: [
            'MoodleEnrolmentQueued',
            'MoodleCourseAdded',
            'MoodleCourseRemoved',
          ],
        },
      };
      const after =
        cursor?.occurredAt && cursor.outboxId
          ? {
              OR: [
                { occurredAt: { gt: cursor.occurredAt } },
                { occurredAt: cursor.occurredAt, id: { gt: cursor.outboxId } },
              ],
            }
          : {};
      let page = await tx.outboxEvent.findMany({
        where: { ...base, ...after },
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        take: limit,
      });
      if (!page.length && cursor?.outboxId)
        page = await tx.outboxEvent.findMany({
          where: base,
          orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
          take: limit,
        });
      const last = page.at(-1);
      if (last)
        await tx.moodleLiveDeliverySchedule.upsert({
          where: { runId },
          create: { runId, occurredAt: last.occurredAt, outboxId: last.id },
          update: { occurredAt: last.occurredAt, outboxId: last.id },
        });
      return page;
    });
  }
  private async source(tx: Tx, outboxId: string, rowId: string) {
    const event = await tx.outboxEvent.findUniqueOrThrow({
      where: { id: outboxId },
    });
    if (
      ![
        'MoodleEnrolmentQueued',
        'MoodleCourseAdded',
        'MoodleCourseRemoved',
      ].includes(event.type)
    )
      throw new Error('SOURCE_EVENT_UNSUPPORTED');
    const row = await tx.courseRegistration.findUniqueOrThrow({
      where: { id: rowId },
      include: { course: true, registration: true },
    });
    const payload = event.payload as Record<string, unknown>;
    if (
      payload.registrationId !== row.registrationId ||
      (payload.courseCode && payload.courseCode !== row.course.code)
    )
      throw new Error('SOURCE_EVENT_MISMATCH');
    const registration = row.registration;
    const attempt = await tx.programmeAttempt.findUniqueOrThrow({
      where: { id: registration.attemptId },
    });
    const student = await tx.student.findUniqueOrThrow({
      where: { id: attempt.studentId },
      include: { person: true },
    });
    const suspend = event.type === 'MoodleCourseRemoved';
    if (
      registration.status !== 'REGISTERED' ||
      student.status !== 'ACTIVE' ||
      student.person.status !== 'ACTIVE' ||
      (!suspend && row.status !== 'ENROLLED') ||
      (suspend && row.status === 'ENROLLED')
    )
      throw new Error('SOURCE_ENTITLEMENT_INACTIVE');
    const descriptor = await this.runs.registrationDeliveryPermit(
      tx,
      row.id,
      suspend,
    );
    const mappings = await tx.moodleMapping.findMany({
      where: {
        kind: 'SHELL',
        sisType: 'COURSE_PERIOD',
        sisId: `${row.courseId}:${registration.periodId}`,
        status: 'ACTIVE',
      },
      take: 2,
    });
    if (mappings.length !== 1) throw new Error('EXACT_COURSE_MAPPING_REQUIRED');
    const mapping = mappings[0]!;
    const courseId = assertLiveMapping(mapping);
    if (courseId === 1) throw new Error('SITE_COURSE_REFUSED');
    const checks = await tx.mappingCheck.findMany({
      where: {
        mappingId: mapping.id,
        result: { in: ['PASS', 'ACADEMIC_APPROVED'] },
      },
    });
    const academicCheck = checks.find((c) => c.result === 'ACADEMIC_APPROVED');
    const academicEvidence = academicCheck?.reasons as Record<
      string,
      unknown
    > | null;
    if (
      !checks.some(
        (c) =>
          c.result === 'PASS' &&
          (c.reasons as { runId?: unknown } | null)?.runId === descriptor.runId,
      ) ||
      !attempt.curriculumVersionId ||
      academicEvidence?.curriculumVersionId !== attempt.curriculumVersionId ||
      !(await tx.curriculumCourse.findFirst({
        where: {
          curriculumId: attempt.curriculumVersionId,
          courseId: row.courseId,
          curriculum: { status: 'PUBLISHED' },
        },
      }))
    )
      throw new Error('ACADEMIC_MAPPING_APPROVAL_REQUIRED');
    const users = await tx.moodleMapping.findMany({
      where: {
        kind: 'USER',
        sisType: 'STUDENT',
        sisId: student.id,
        status: 'ACTIVE',
      },
      take: 2,
    });
    if (users.length > 1) throw new Error('IDENTITY_CONFLICT');
    const userId = users.length ? assertLiveMapping(users[0]!) : null;
    const userCheck = users[0]
      ? await tx.mappingCheck.findFirst({
          where: { mappingId: users[0].id, result: 'PASS' },
          orderBy: { createdAt: 'desc' },
        })
      : null;
    const userEvidence = userCheck?.reasons as Record<string, unknown> | null;
    const userIdnumber = userId ? userEvidence?.moodleIdnumber : null;
    if (
      userId &&
      (typeof userIdnumber !== 'string' ||
        !userIdnumber ||
        userEvidence?.runId !== descriptor.runId)
    )
      throw new Error('VERIFIED_USER_BINDING_REQUIRED');
    const bootstrap =
      process.env.DEMO_MODE === 'true' &&
      process.env.SIS_ENABLE_MOODLE_DEMO_BOOTSTRAP === 'true' &&
      (process.env.MOODLE_DEMO_INITIAL_PASSWORD?.length ?? 0) >= 12;
    if (
      !userId &&
      !bootstrap &&
      (suspend ||
        !student.person.email ||
        !student.person.emailVerifiedAt ||
        /\.(invalid|test)$/i.test(student.person.email))
    )
      throw new Error('VERIFIED_MOODLE_CONTACT_REQUIRED');
    const amendment = await tx.registrationAmendment.findFirst({
      where: { registrationId: registration.id, courseId: row.courseId },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, kind: true },
    });
    const fingerprint = digest({
      outboxId,
      payload,
      registrationId: registration.id,
      registrationStatus: registration.status,
      attemptId: attempt.id,
      curriculumVersionId: attempt.curriculumVersionId,
      courseAmendment: amendment,
      rowId: row.id,
      status: row.status,
      studentId: student.id,
      mappingId: mapping.id,
      mappingVersion: mapping.version,
      courseId,
      userMapping: users[0]?.id ?? null,
      userId,
      runId: descriptor.runId,
      config: descriptor.configFingerprint,
    });
    return {
      event,
      row,
      registration,
      attempt,
      student,
      descriptor,
      mapping,
      courseId,
      userId,
      userIdnumber,
      bootstrap,
      suspend,
      fingerprint,
    };
  }
  private async claim(outboxId: string, rowId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "OutboxEvent" WHERE id = ${outboxId} FOR UPDATE`;
      if (await this.paused(tx)) return null;
      const source = await this.source(tx, outboxId, rowId);
      if (
        source.event.deliveredAt ||
        (await tx.moodleMaintenance.findFirst({
          where: {
            status: 'SCHEDULED',
            startsAt: { lte: new Date() },
            endsAt: { gt: new Date() },
          },
        }))
      )
        return null;
      const prior = await tx.moodleLiveDeliveryClaim.findUnique({
        where: {
          outboxId_courseRegistrationId: {
            outboxId,
            courseRegistrationId: rowId,
          },
        },
      });
      if (
        prior &&
        (['DELIVERED', 'MANUAL_REVIEW'].includes(prior.state) ||
          (prior.state === 'DELIVERING' && prior.leaseUntil > new Date()) ||
          (prior.nextRunAt && prior.nextRunAt > new Date()))
      )
        return null;
      if (prior && prior.sourceChecksum !== source.fingerprint)
        throw new Error('CLAIM_SOURCE_CHANGED');
      const run = await tx.moodleLiveTestRun.findUniqueOrThrow({
        where: { runId: source.descriptor.runId },
      });
      const leaseToken = randomUUID(),
        leaseUntil = new Date(Date.now() + 120000);
      const claim = prior
        ? await tx.moodleLiveDeliveryClaim.update({
            where: { id: prior.id },
            data: {
              leaseToken,
              leaseUntil,
              state: 'DELIVERING',
              attempt: { increment: 1 },
              nextRunAt: null,
            },
          })
        : await tx.moodleLiveDeliveryClaim.create({
            data: {
              outboxId,
              courseRegistrationId: rowId,
              runId: run.id,
              mappingId: source.mapping.id,
              mappingVersion: source.mapping.version,
              sourceChecksum: source.fingerprint,
              leaseToken,
              leaseUntil,
            },
          });
      return { source, claim };
    });
  }
  async deliver(outboxId: string, rowId: string) {
    const claimed = await this.claim(outboxId, rowId);
    if (!claimed) return 'DEFERRED' as const;
    const { source, claim } = claimed;
    let userId = source.userId;
    let state: 'DELIVERED' | 'RETRY' | 'MANUAL_REVIEW' = 'DELIVERED',
      code: string | null = null;
    try {
      const remote = new MoodleWriteTransport(source.descriptor);
      await remote.verifyTarget();
      await remote.courseIdentity(source.courseId);
      const role =
        source.descriptor.roleIds.Student ?? source.descriptor.roleIds.student;
      if (!role) throw new Error('STUDENT_ROLE_REQUIRED');
      if (userId)
        await remote.verifyBoundUser(userId, source.userIdnumber as string);
      if (!userId) {
        await this.prisma.$transaction((tx) =>
          this.assertWritable(tx, outboxId, rowId, claim, source.fingerprint),
        );
        const names = source.student.person.displayName.trim().split(/\s+/);
        userId = await remote.ensureUser({
          allowCreate: !source.suspend,
          idnumber: `SIS-STUDENT-${source.student.id}`,
          username: `sis.${source.student.id.toLowerCase()}`,
          firstName: names[0]!,
          lastName: names.slice(1).join(' ') || names[0]!,
          email:
            source.student.person.email ??
            `${source.student.id}@sis-demo.invalid`,
          ...(source.bootstrap
            ? { bootstrapPassword: process.env.MOODLE_DEMO_INITIAL_PASSWORD! }
            : {}),
        });
      }
      await this.prisma.$transaction((tx) =>
        this.assertWritable(tx, outboxId, rowId, claim, source.fingerprint),
      );
      let alreadyApplied = false;
      if (claim.attempt > 1) {
        try {
          if (source.suspend)
            await remote.verifySuspended(userId, source.courseId);
          else await remote.verifyEnrolment(userId, source.courseId, role);
          alreadyApplied = true;
          code = 'ALREADY_APPLIED';
        } catch (error) {
          const expected = source.suspend
            ? 'MOODLE_SUSPENSION_NOT_CONFIRMED'
            : 'MOODLE_ENROLMENT_NOT_CONFIRMED';
          if (!(error instanceof Error) || error.message !== expected)
            throw error;
        }
      }
      if (!alreadyApplied) {
        await remote.setEnrolment(
          userId,
          source.courseId,
          role,
          source.suspend,
        );
        if (source.suspend)
          await remote.verifySuspended(userId, source.courseId);
        else await remote.verifyEnrolment(userId, source.courseId, role);
      }
    } catch (error) {
      const allowed = new Set([
        'DELIVERY_PAUSED',
        'MOODLE_OUTCOME_UNKNOWN',
        'MOODLE_REMOTE_REFUSAL',
        'MOODLE_RESPONSE_INVALID',
        'IDENTITY_CONFLICT',
        'STUDENT_ROLE_REQUIRED',
        'CLAIM_SOURCE_CHANGED',
        'MOODLE_ENROLMENT_NOT_CONFIRMED',
        'MOODLE_SUSPENSION_NOT_CONFIRMED',
      ]);
      code =
        error instanceof Error && allowed.has(error.message)
          ? error.message
          : 'LIVE_DELIVERY_REFUSED';
      state =
        code === 'DELIVERY_PAUSED' ||
        (code === 'MOODLE_OUTCOME_UNKNOWN' && claim.attempt < 5)
          ? 'RETRY'
          : 'MANUAL_REVIEW';
    }
    return this.prisma.$transaction(async (tx) => {
      if (state === 'DELIVERED') {
        try {
          const current = await this.source(tx, outboxId, rowId);
          if (current.fingerprint !== source.fingerprint)
            throw new Error('SOURCE_CHANGED');
        } catch {
          state = 'MANUAL_REVIEW';
          code = 'SOURCE_CHANGED_AFTER_REQUEST';
        }
      }
      const changed = await tx.moodleLiveDeliveryClaim.updateMany({
        where: {
          id: claim.id,
          leaseToken: claim.leaseToken,
          state: 'DELIVERING',
          leaseUntil: { gt: new Date() },
        },
        data: {
          state,
          lastCode: code,
          moodleUserId: userId,
          evidenceChecksum: digest({
            outboxId,
            rowId,
            userId,
            courseId: source.courseId,
            state,
            code,
            source: source.fingerprint,
          }),
          deliveredAt: state === 'DELIVERED' ? new Date() : null,
          nextRunAt:
            state === 'RETRY'
              ? new Date(
                  Date.now() + Math.min(600000, 10000 * 2 ** claim.attempt),
                )
              : null,
        },
      });
      if (changed.count !== 1) return 'DEFERRED' as const;
      await tx.auditEvent.create({
        data: {
          action: 'MoodleLiveCourseDelivery',
          targetRef: claim.id,
          outcome: state,
          reason: code,
          policyVersion: 'MOODLE-LIVE-TEST-v1',
          correlationId: randomUUID(),
          newState: {
            courseRegistrationId: rowId,
            state,
            attempt: claim.attempt,
            mappingId: source.mapping.id,
            mappingVersion: source.mapping.version,
            evidenceChecksum: digest({
              outboxId,
              rowId,
              userId,
              courseId: source.courseId,
              state,
              code,
              source: source.fingerprint,
            }),
          },
        },
      });
      if (state === 'DELIVERED') {
        const roster = await tx.courseRegistration.findMany({
          where: {
            registrationId: source.registration.id,
            ...(source.event.type === 'MoodleEnrolmentQueued'
              ? { status: 'ENROLLED' }
              : { id: rowId }),
          },
          select: { id: true },
        });
        const count = await tx.moodleLiveDeliveryClaim.count({
          where: {
            outboxId,
            state: 'DELIVERED',
            courseRegistrationId: { in: roster.map((r) => r.id) },
          },
        });
        if (roster.length && count === roster.length)
          await tx.outboxEvent.update({
            where: { id: outboxId },
            data: { deliveredAt: new Date() },
          });
      }
      return state;
    });
  }
  /** Read side may resolve an automatically created Moodle identity only from
   * a current, confirmed positive enrolment claim with unchanged source proof. */
  async confirmedStudentIdentity(tx: Tx, courseRegistrationId: string) {
    const claims = await tx.moodleLiveDeliveryClaim.findMany({
      where: {
        courseRegistrationId,
        state: 'DELIVERED',
        moodleUserId: { gt: 0 },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 20,
    });
    for (const claim of claims) {
      const event = await tx.outboxEvent.findUnique({
        where: { id: claim.outboxId },
      });
      if (
        !event ||
        !['MoodleEnrolmentQueued', 'MoodleCourseAdded'].includes(event.type)
      )
        continue;
      try {
        const current = await this.source(
          tx,
          claim.outboxId,
          courseRegistrationId,
        );
        const run = await tx.moodleLiveTestRun.findUniqueOrThrow({
          where: { runId: current.descriptor.runId },
        });
        if (
          claim.runId === run.id &&
          claim.sourceChecksum === current.fingerprint &&
          claim.mappingId === current.mapping.id &&
          claim.mappingVersion === current.mapping.version &&
          claim.moodleUserId &&
          claim.evidenceChecksum
        )
          return {
            moodleUserId: claim.moodleUserId,
            claimId: claim.id,
            evidenceChecksum: claim.evidenceChecksum,
            updatedAt: claim.updatedAt,
          };
      } catch {
        /* A changed source is never an identity fallback. */
      }
    }
    return null;
  }

  async run(limit = 10): Promise<MoodleWorkerRunResult> {
    const deferral = {
      outcome: 'NOT_PROVISIONED' as const,
      backend: 'live-test' as const,
      reason: 'LIVE_PREREQUISITES_UNAVAILABLE' as const,
      detail:
        'Access waits for the current run, approved course mapping and verified student identity.',
    };
    if (selectBackend().kind !== 'live-test')
      return {
        processed: 0,
        delivered: 0,
        retried: 0,
        dead: 0,
        deferred: 0,
        deferral,
      };
    if (await this.paused(this.prisma))
      return {
        processed: 0,
        delivered: 0,
        retried: 0,
        dead: 0,
        deferred: 0,
        deferral: null,
      };
    const selected = selectBackend();
    if (selected.kind !== 'live-test')
      return {
        processed: 0,
        delivered: 0,
        retried: 0,
        dead: 0,
        deferred: 0,
        deferral,
      };
    const events = await this.nextPage(
      selected.descriptor.runId,
      Math.min(Math.max(limit, 1), 25),
    );
    let processed = 0,
      delivered = 0,
      retried = 0,
      dead = 0,
      deferred = 0;
    for (const event of events) {
      const p = event.payload as Record<string, unknown>;
      if (typeof p.registrationId !== 'string') {
        deferred++;
        continue;
      }
      const roster = await this.prisma.courseRegistration.findMany({
        where: {
          registrationId: p.registrationId,
          ...(typeof p.courseCode === 'string'
            ? { course: { code: p.courseCode } }
            : { status: 'ENROLLED' }),
        },
        select: { id: true },
        take: 100,
      });
      if (!roster.length) deferred++;
      for (const row of roster) {
        try {
          const result = await this.deliver(event.id, row.id);
          if (result === 'DEFERRED') deferred++;
          else {
            processed++;
            if (result === 'DELIVERED') delivered++;
            else if (result === 'RETRY') retried++;
            else dead++;
          }
        } catch {
          deferred++;
        }
      }
    }
    // Unimplemented event families remain visible as waiting work; they are
    // never swallowed or counted as delivered by the enrolment-only worker.
    deferred += await this.prisma.outboxEvent.count({
      where: {
        deliveredAt: null,
        type: {
          startsWith: 'Moodle',
          notIn: [
            'MoodleEnrolmentQueued',
            'MoodleCourseAdded',
            'MoodleCourseRemoved',
          ],
        },
      },
    });
    return {
      processed,
      delivered,
      retried,
      dead,
      deferred,
      deferral: deferred ? deferral : null,
    };
  }
}
