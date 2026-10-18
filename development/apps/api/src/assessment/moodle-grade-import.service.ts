import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  requireActiveTransactionSession,
  type SessionAuthority,
} from '../identity-access/transaction-session.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import { MoodleLiveRunService } from '../integration/moodle-live-run.service.js';
import { MoodleLiveDeliveryService } from '../integration/moodle-live-delivery.service.js';
import {
  LiveMoodleAdapter,
  MoodleApiError,
} from '../integration/moodle-live.js';
import { AssessmentService } from './assessment.service.js';
import { moodleGradeSnapshot } from './moodle-grade-snapshot.js';

const positiveId = (value: string) =>
  /^[1-9][0-9]*$/.test(value) && Number.isSafeInteger(Number(value));
@Injectable()
export class MoodleGradeImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessment: AssessmentService,
    private readonly runs: MoodleLiveRunService,
    @Optional() private readonly delivery?: MoodleLiveDeliveryService,
  ) {}

  private async authorize(
    db: Prisma.TransactionClient,
    auth: SessionAuthority,
    offeringRef: string,
  ) {
    const now = new Date();
    if (auth.activeRole === 'LEC' && auth.assignmentId)
      await requireActiveTransactionSession(db, auth);
    if (
      auth.activeRole !== 'LEC' ||
      !auth.assignmentId ||
      !(await db.roleAssignment.findFirst({
        where: {
          id: auth.assignmentId,
          accountId: auth.accountId,
          role: 'LEC',
          capabilities: { has: 'stage-marks' },
          scopeType: 'OFFERING',
          scopeRef: offeringRef,
          revokedAt: null,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          account: { status: 'ACTIVE' },
        },
      }))
    )
      throw new ForbiddenException(
        'Use the appointed lecturer workspace for this course.',
      );
  }

  private async custody(
    db: Prisma.TransactionClient,
    auth: SessionAuthority,
    mappingId: string,
  ) {
    const mapping = await db.gradeActivityMapping.findUnique({
      where: { id: mappingId },
      include: { component: { include: { plan: true } } },
    });
    if (!mapping) throw new ConflictException('Assessment mapping not found.');
    await this.authorize(db, auth, mapping.component.plan.offeringRef);
    if (
      mapping.status !== 'ACTIVE' ||
      mapping.component.plan.status !== 'APPROVED'
    )
      throw new ConflictException(
        'Approve the assessment plan and independently activate its Moodle mapping first.',
      );
    const [course, period] = await Promise.all([
      db.course.findUnique({
        where: { code: mapping.component.plan.offeringRef },
      }),
      db.academicPeriod.findUnique({
        where: { code: mapping.component.plan.periodCode },
      }),
    ]);
    if (
      !course ||
      !period ||
      !positiveId(mapping.moodleCourseRef) ||
      !positiveId(mapping.moodleActivityId)
    )
      throw new ConflictException(
        'Use the course code, academic period and numeric Moodle gradebook item ID.',
      );
    const shells = await db.moodleMapping.findMany({
      where: {
        kind: 'SHELL',
        sisType: 'COURSE_PERIOD',
        sisId: `${course.id}:${period.id}`,
        status: 'ACTIVE',
      },
    });
    if (
      shells.length !== 1 ||
      shells[0].moodleId !== mapping.moodleCourseRef ||
      mapping.moodleCourseRef === '1'
    )
      throw new ConflictException(
        'An unambiguous active Moodle course binding is required for this course and period.',
      );
    const requireVerifiedBinding = async (binding: (typeof shells)[number]) => {
      const proof = await db.mappingCheck.findFirst({
        where: { mappingId: binding.id, result: 'PASS' },
        orderBy: { createdAt: 'desc' },
      });
      const provenance = proof?.reasons as { runId?: unknown } | null;
      if (
        !binding.activatorAccountId ||
        binding.activatorAccountId === binding.creatorAccountId ||
        provenance?.runId !== process.env.MOODLE_LIVE_TEST_RUN_ID
      )
        throw new ConflictException(
          'Independently activate and verify the Moodle identity and course bindings before importing.',
        );
    };
    await requireVerifiedBinding(shells[0]);
    const registrations = await db.courseRegistration.findMany({
      where: {
        courseId: course.id,
        status: 'ENROLLED',
        registration: { periodId: period.id, status: 'REGISTERED' },
      },
      include: { registration: true },
      orderBy: { id: 'asc' },
      take: 201,
    });
    if (!registrations.length || registrations.length > 200)
      throw new ConflictException(
        'Live import supports a registered class of 1–200 students. Split larger classes through an approved delivery section.',
      );
    const attempts = await db.programmeAttempt.findMany({
      where: { id: { in: registrations.map((r) => r.registration.attemptId) } },
      include: { student: true },
    });
    const participants = registrations.map((registration) => {
      const attempt = attempts.find(
        (a) => a.id === registration.registration.attemptId,
      );
      if (!attempt || attempt.student.status !== 'ACTIVE')
        throw new ConflictException(
          'Resolve the registered student identity before importing.',
        );
      return { student: attempt.student, registration };
    });
    const bindings = await db.moodleMapping.findMany({
      where: {
        kind: 'USER',
        sisType: 'STUDENT',
        status: 'ACTIVE',
        sisId: { in: participants.map((p) => p.student.id) },
      },
      orderBy: { id: 'asc' },
    });
    for (const binding of bindings) await requireVerifiedBinding(binding);
    const coordinates: Array<{ moodleUserId: number; studentRef: string }> = [];
    const confirmedClaims: unknown[] = [];
    for (const { student, registration } of participants) {
      const bound = bindings.filter((b) => b.sisId === student.id);
      if (
        bound.length > 1 ||
        (bound.length === 1 && !positiveId(bound[0].moodleId))
      )
        throw new ConflictException(
          'Every registered student needs one unambiguous Moodle identity.',
        );
      const confirmed =
        bound.length === 0
          ? await this.delivery?.confirmedStudentIdentity(db, registration.id)
          : null;
      if (!bound.length && !confirmed)
        throw new ConflictException(
          'Synchronise each registered student to Moodle or activate their verified identity binding before importing.',
        );
      coordinates.push({
        moodleUserId: bound.length
          ? Number(bound[0].moodleId)
          : confirmed!.moodleUserId,
        studentRef: student.studentNumber,
      });
      if (confirmed)
        confirmedClaims.push([
          registration.id,
          confirmed.claimId,
          confirmed.evidenceChecksum,
          confirmed.updatedAt,
          confirmed.moodleUserId,
        ]);
    }
    const descriptor = await this.runs.registrationBatchDeliveryPermit(
      db,
      registrations.map((r) => r.id),
    );
    const signature = createHash('sha256')
      .update(
        JSON.stringify({
          mapping: [mapping.id, mapping.version, mapping.updatedAt],
          plan: [
            mapping.component.plan.id,
            mapping.component.plan.version,
            mapping.component.maxMark,
          ],
          shell: [shells[0].id, shells[0].version, shells[0].updatedAt],
          bindings: bindings.map((b) => [
            b.id,
            b.version,
            b.updatedAt,
            b.moodleId,
          ]),
          confirmedClaims,
          registrations: registrations.map((r) => [
            r.id,
            r.registrationId,
            r.registration.version,
          ]),
          run: [descriptor.runId, descriptor.configFingerprint],
        }),
      )
      .digest('hex');
    return { mapping, descriptor, signature, coordinates };
  }

  async import(auth: SessionAuthority, key: string, mappingId: string) {
    if (auth.activeRole !== 'LEC')
      throw new ForbiddenException(
        'Use the appointed lecturer workspace to import Moodle marks.',
      );
    // Authorize before recovering a lost-response receipt or revealing a batch.
    const mapping = await this.prisma.gradeActivityMapping.findUnique({
      where: { id: mappingId },
      include: { component: { include: { plan: true } } },
    });
    if (!mapping) throw new ConflictException('Assessment mapping not found.');
    await this.authorize(this.prisma, auth, mapping.component.plan.offeringRef);
    if (mapping.status !== 'ACTIVE')
      throw new ConflictException(
        'Activate the Moodle assessment mapping first.',
      );
    const prior = await this.prisma.$transaction(async (db) => {
      await this.authorize(db, auth, mapping.component.plan.offeringRef);
      return db.applicationCommand.findUnique({ where: { key } });
    });
    if (prior) {
      const result = prior.response as {
        mappingId?: string;
        sourceResponse?: { transfer?: string };
      };
      if (
        prior.accountId !== auth.accountId ||
        prior.action !== 'StageGradeBatch' ||
        result.mappingId !== mappingId ||
        result.sourceResponse?.transfer !== 'LIVE_REST'
      )
        throw new ConflictException(
          'This request reference belongs to another action.',
        );
      return prior.response;
    }
    const before = await this.prisma.$transaction(
      (db) => this.custody(db, auth, mappingId),
      { timeout: 20000 },
    );
    let raw: unknown;
    try {
      raw = await new LiveMoodleAdapter(this.prisma).readGradeItems(
        Number(before.mapping.moodleCourseRef),
        before.coordinates.map((p) => p.moodleUserId),
      );
    } catch (error) {
      throw new ServiceUnavailableException({
        code:
          error instanceof MoodleApiError ? error.code : 'MOODLE_READ_FAILED',
        message:
          error instanceof MoodleApiError &&
          error.code === 'MOODLE_GRADE_FUNCTION_REQUIRED'
            ? 'Add gradereport_user_get_grade_items to the SIS Demonstration external service in Moodle.'
            : 'Moodle marks could not be retrieved. Earlier batches are preserved; retry when the connection recovers.',
      });
    }
    let snapshot: ReturnType<typeof moodleGradeSnapshot>;
    try {
      snapshot = moodleGradeSnapshot(raw, {
        courseId: Number(before.mapping.moodleCourseRef),
        gradeItemId: Number(before.mapping.moodleActivityId),
        maxMark: before.mapping.component.maxMark,
        participants: before.coordinates,
      });
    } catch {
      throw new ConflictException(
        'Moodle returned missing, stale or incompatible grade evidence. Check the gradebook item, numeric maximum and participant bindings. No batch was saved.',
      );
    }
    return this.assessment.stageBatch(
      auth,
      key,
      {
        mappingId,
        sourceRevision: snapshot.sourceRevision,
        lines: snapshot.lines,
      },
      {
        instance: `MOODLE-LIVE:${before.descriptor.host}`,
        transfer: 'LIVE_REST',
        checksum: snapshot.checksum,
        bindingChecksum: before.signature,
        runId: before.descriptor.runId,
        retrievedAt: new Date().toISOString(),
      },
      async (db) => {
        const after = await this.custody(db, auth, mappingId);
        if (before.signature !== after.signature)
          throw new ConflictException(
            'Registration, authority, mapping or run changed during retrieval. Import again to capture current evidence.',
          );
      },
    );
  }
}
