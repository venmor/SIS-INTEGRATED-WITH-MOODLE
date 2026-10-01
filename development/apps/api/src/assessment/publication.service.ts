import { HttpException, Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { ResultPackage } from '@prisma/client';
import { packageDigest } from './package-integrity.js';
import { SECURITY_V1 } from '@sis/config';
import { PrismaService } from '../identity-access/prisma.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import type {
  PublicationPolicyProvider,
  ResultStepUpVerifier,
} from './publication-ports.js';
import type {
  ReleaseResultsDto,
  RequestAmendmentDto,
} from './publication.dto.js';

type Tx = Prisma.TransactionClient;
type Actor = ActiveAuthority & { sessionToken: string };
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
interface Trace {
  caRefs: string[];
  components: Array<{ code: string; maxMark: number; weight: number }>;
  formulaVersion: string;
  policyVersion: string;
  passMark: number;
  candidateListId: string;
  moderationRefs: string[];
  students: Array<{
    studentRef: string;
    preRounded: number;
    rounded: number;
    parts: Array<{
      componentCode: string;
      raw: number;
      normalised: number;
      weighted: number;
    }>;
  }>;
}

@Injectable()
export class PublicationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('RESULT_PUBLICATION_POLICY')
    private readonly policy: PublicationPolicyProvider,
    @Inject('RESULT_STEP_UP') private readonly stepUp: ResultStepUpVerifier,
  ) {}

  private fail(code: string, message: string, status = 409): never {
    throw new HttpException(
      {
        code,
        message,
        saved: false,
        nextAction:
          'Check the current result workspace and contact the examinations office.',
        supportReference: randomUUID(),
      },
      status,
    );
  }
  private async authority(
    db: Tx,
    actor: Actor,
    capability: string,
    period?: string,
  ) {
    const now = new Date();
    if (actor.activeRole !== 'EXAMINATIONS_OFFICER' || !actor.assignmentId)
      this.fail(
        'RESULT_AUTHORITY',
        'This result action is unavailable in your workspace.',
        403,
      );
    const grant = await db.roleAssignment.findFirst({
      where: {
        id: actor.assignmentId,
        accountId: actor.accountId,
        role: actor.activeRole,
        scopeType: 'PERIOD',
        capabilities: { has: capability },
        revokedAt: null,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        account: { status: 'ACTIVE' },
      },
    });
    if (!grant)
      this.fail(
        'RESULT_AUTHORITY',
        'This result action is unavailable in your workspace.',
        403,
      );
    if (period && grant.scopeRef !== period)
      this.fail('NOT_FOUND', 'Result record not found.', 404);
    return grant;
  }
  private async audit(
    db: Tx,
    actor: Actor,
    action: string,
    target: string,
    key: string,
    outcome = 'ALLOW',
    reason?: string,
  ) {
    await db.auditEvent.create({
      data: {
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole,
        scope: actor.scope,
        action,
        targetRef: target,
        idempotencyRef: key,
        correlationId: randomUUID(),
        outcome,
        reason,
        purpose: 'Official result publication and version history',
      },
    });
  }
  private async command(
    actor: Actor,
    key: string,
    action: string,
    input: object,
    run: (db: Tx, commandDigest: string) => Promise<unknown>,
  ) {
    const commandDigest = digest(input);
    try {
      return await this.prisma.$transaction(
        async (db) => {
          // Serialize same-actor requests; hold live authority/session rows so
          // revocation cannot race a high-impact commit.
          await db.$queryRaw`SELECT id FROM "Account" WHERE id = ${actor.accountId} FOR UPDATE`;
          if (actor.assignmentId)
            await db.$queryRaw`SELECT id FROM "RoleAssignment" WHERE id = ${actor.assignmentId} FOR SHARE`;
          const sessionHash = createHash('sha256')
            .update(actor.sessionToken)
            .digest('hex');
          await db.$queryRaw`SELECT id FROM "Session" WHERE "tokenHash" = ${sessionHash} FOR SHARE`;
          const session = await db.session.findUnique({
            where: { tokenHash: sessionHash },
          });
          const now = Date.now();
          if (
            !session ||
            session.accountId !== actor.accountId ||
            session.activeAssignmentId !== actor.assignmentId ||
            session.revokedAt ||
            session.expiresAt.getTime() <= now ||
            now - session.lastSeenAt.getTime() >
              SECURITY_V1.session.idleSeconds * 1000
          )
            this.fail(
              'SESSION_EXPIRED',
              'Sign in again before making this decision.',
              401,
            );
          const capability =
            action === 'RequestOfficialResultAmendment'
              ? 'validate-results'
              : 'release-results';
          await this.authority(db, actor, capability);
          const previous = await db.applicationCommand.findUnique({
            where: { key },
          });
          if (previous) {
            if (
              previous.accountId !== actor.accountId ||
              previous.action !== action ||
              previous.digest !== commandDigest
            )
              this.fail(
                'IDEMPOTENCY_CONFLICT',
                'This request reference belongs to a different decision.',
              );
            const target = input as { id?: string; packageId?: string };
            if (action === 'ApproveOfficialResultAmendment') {
              const amendment = await db.resultAmendment.findUnique({
                where: { id: target.id! },
              });
              if (!amendment)
                this.fail('NOT_FOUND', 'Amendment not found.', 404);
              await this.package(db, actor, amendment.packageId, capability);
            } else
              await this.package(
                db,
                actor,
                target.packageId ?? target.id!,
                capability,
              );
            return previous.response;
          }
          const result = await run(db, commandDigest);
          await this.authority(db, actor, capability); // effective time at commit
          await db.applicationCommand.create({
            data: {
              key,
              accountId: actor.accountId,
              action,
              digest: commandDigest,
              status: 201,
              response: json(result),
            },
          });
          return result;
        },
        { timeout: 20000 },
      );
    } catch (error) {
      const code =
        error instanceof HttpException
          ? (error.getResponse() as { code?: string }).code
          : 'PUBLICATION_UNAVAILABLE';
      await this.audit(
        this.prisma,
        actor,
        action,
        'result-workflow',
        key,
        'DENY',
        code,
      ).catch(() => undefined);
      if (error instanceof HttpException) throw error;
      this.fail(
        'PUBLICATION_UNAVAILABLE',
        'Publication was not confirmed. The previous official results remain intact. Check the workspace before retrying.',
        503,
      );
    }
  }
  private async package(db: Tx, actor: Actor, id: string, capability: string) {
    const grant = await this.authority(db, actor, capability);
    const pkg = await db.resultPackage.findFirst({
      where: { id, periodCode: grant.scopeRef },
    });
    if (!pkg) this.fail('NOT_FOUND', 'Result record not found.', 404);
    return pkg;
  }
  private async snapshot(db: Tx, pkg: ResultPackage, actor: Actor) {
    const trace = pkg.trace as unknown as Trace;
    if (
      !Array.isArray(trace.caRefs) ||
      !trace.caRefs.length ||
      !Array.isArray(trace.components) ||
      !Array.isArray(trace.students) ||
      !trace.students.length ||
      trace.formulaVersion !== 'weighted-total-v1' ||
      !Number.isFinite(trace.passMark) ||
      trace.passMark < 0 ||
      trace.passMark > 100 ||
      trace.candidateListId !== pkg.candidateListId
    )
      this.fail(
        'SNAPSHOT_REQUIRED',
        'Reassemble and approve a complete, reproducible result package.',
      );
    if (
      packageDigest({
        offeringRef: pkg.offeringRef,
        periodCode: pkg.periodCode,
        trace,
        caRefs: [...trace.caRefs].sort(),
      }) !== pkg.packageHash
    )
      this.fail(
        'INTEGRITY_FAILURE',
        'The reviewed result evidence no longer matches its integrity reference.',
      );
    const list = await db.assessmentCandidateList.findUnique({
      where: { id: pkg.candidateListId },
    });
    if (
      !list ||
      list.status !== 'ACTIVE' ||
      list.offeringRef !== pkg.offeringRef ||
      list.periodCode !== pkg.periodCode ||
      new Set(list.studentRefs).size !== list.studentRefs.length ||
      JSON.stringify([...list.studentRefs].sort()) !==
        JSON.stringify(trace.students.map((s) => s.studentRef).sort())
    )
      this.fail(
        'CANDIDATE_MISMATCH',
        'Reconcile this package against the current authorized candidate list.',
      );
    const rows = await db.officialCARecord.findMany({
      where: { id: { in: trace.caRefs } },
      include: {
        moderationCase: {
          include: {
            batch: {
              include: {
                mapping: {
                  include: { component: { include: { plan: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (
      rows.length !== trace.caRefs.length ||
      rows.length !== trace.students.length * trace.components.length ||
      new Set(trace.components.map((c) => c.code)).size !==
        trace.components.length ||
      trace.components.reduce((sum, c) => sum + c.weight, 0) !== 100
    )
      this.fail(
        'INCOMPLETE_COMPONENTS',
        'Each candidate needs all approved assessment components.',
      );
    for (const s of trace.students) {
      let total = 0;
      for (const c of trace.components) {
        const candidates = rows.filter(
          (r) => r.studentRef === s.studentRef && r.componentCode === c.code,
        );
        const r = candidates[0];
        if (
          candidates.length !== 1 ||
          !r ||
          r.mark === null ||
          !Number.isFinite(r.mark) ||
          r.mark < 0 ||
          r.mark > c.maxMark ||
          c.maxMark <= 0 ||
          c.weight < 0 ||
          r.outcome !== 'MARK_RECORDED' ||
          r.status !== 'APPROVED' ||
          r.offeringRef !== pkg.offeringRef ||
          r.periodCode !== pkg.periodCode ||
          r.policyVersion !== trace.policyVersion ||
          r.moderationCase.status !== 'APPROVED' ||
          !r.moderationCase.batch.lockedAt
        )
          this.fail(
            'INVALID_COMPONENT',
            'An input needs academic correction or approval.',
          );
        const component = r.moderationCase.batch.mapping.component;
        if (
          component.plan.status !== 'APPROVED' ||
          component.plan.version !== r.planVersion ||
          component.maxMark !== c.maxMark ||
          component.weight !== c.weight ||
          !trace.moderationRefs.includes(r.caseId)
        )
          this.fail(
            'STALE_COMPONENT',
            'The package no longer matches its approved assessment plan.',
          );
        if (
          actor.accountId === r.moderationCase.submittedByAccountId ||
          actor.accountId === r.moderationCase.batch.createdByAccountId
        )
          this.fail(
            'SOD_VIOLATION',
            'A marker cannot officialise their own results.',
            403,
          );
        const newer = await db.officialCARecord.count({
          where: {
            offeringRef: pkg.offeringRef,
            periodCode: pkg.periodCode,
            studentRef: r.studentRef,
            componentCode: r.componentCode,
            version: { gt: r.version },
            status: 'APPROVED',
          },
        });
        if (newer)
          this.fail(
            'STALE_COMPONENT',
            'New approved inputs require a new board package.',
          );
        total += (r.mark / c.maxMark) * c.weight;
      }
      const rounded = Math.round((total + Number.EPSILON) * 100) / 100;
      if (Math.abs(total - s.preRounded) > 1e-9 || rounded !== s.rounded)
        this.fail(
          'CALCULATION_MISMATCH',
          'The published outcome must reproduce the approved calculation.',
        );
    }
    return { trace, rows };
  }
  private async publish(
    db: Tx,
    actor: Actor,
    pkg: ResultPackage,
    dto: ReleaseResultsDto,
    commandDigest: string,
    amendment?: { id: string; releaseId: string },
  ) {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pkg.offeringRef + ':' + pkg.periodCode}, 0))`;
    await db.$queryRaw`SELECT id FROM "ResultPackage" WHERE id = ${pkg.id} FOR UPDATE`;
    const live = await this.package(db, actor, pkg.id, 'release-results');
    if (live.version !== dto.version)
      this.fail(
        'VERSION_CONFLICT',
        'The package changed after review. Reload it before deciding.',
      );
    if (live.status !== 'APPROVED_FOR_RELEASE')
      this.fail(
        'NOT_APPROVED',
        'Only an unconditionally approved board package may be published.',
      );
    const decision = await db.boardDecision.findFirst({
      where: { packageId: live.id },
      orderBy: { version: 'desc' },
    });
    if (
      !decision ||
      decision.to !== 'APPROVE_FOR_RELEASE' ||
      !Array.isArray(decision.conditions) ||
      decision.conditions.length
    )
      this.fail(
        'BOARD_APPROVAL_REQUIRED',
        'Board conditions must be resolved through a new approved package.',
      );
    if (live.preparedByAccountId === actor.accountId)
      this.fail(
        'SOD_VIOLATION',
        'The result preparer cannot publish the same package.',
        403,
      );
    const previous = await db.resultRelease.findFirst({
      where: {
        offeringRef: live.offeringRef,
        periodCode: live.periodCode,
        nextRelease: null,
      },
      include: { results: true },
    });
    if (previous && (!amendment || amendment.releaseId !== previous.id))
      this.fail(
        'AMENDMENT_REQUIRED',
        'This course already has published results. Use the controlled amendment route.',
      );
    if (amendment && !previous)
      this.fail(
        'VERSION_CONFLICT',
        'The previous release is no longer current.',
      );
    const configuration = await this.policy.resolve(
      db,
      live.offeringRef,
      live.periodCode,
    );
    if (
      !configuration ||
      !configuration.version ||
      !configuration.courseId ||
      !configuration.restrictionsSatisfied ||
      !configuration.reviewInstructions?.trim() ||
      typeof configuration.showMarks !== 'boolean'
    )
      this.fail(
        'PUBLICATION_POLICY_REQUIRED',
        'Approved publication policy and candidate restrictions must be confirmed before release.',
      );
    if (
      !Number.isFinite(Date.parse(configuration.releaseAt)) ||
      Date.parse(configuration.releaseAt) > Date.now()
    )
      this.fail(
        'RELEASE_WINDOW',
        'The approved publication date has not been reached.',
      );
    const course = await db.course.findUnique({
      where: { id: configuration.courseId },
    });
    const period = await db.academicPeriod.findUnique({
      where: { code: live.periodCode },
    });
    if (!course || !period)
      this.fail(
        'COURSE_MAPPING_REQUIRED',
        'Confirm the authoritative course and period mapping before publication.',
      );
    const { trace, rows } = await this.snapshot(db, live, actor);
    // Retain eligibility through commit. Registration owns these rows; shared
    // locks allow concurrent reads and block changes while publication commits.
    await db.$queryRaw`SELECT cr.id FROM "CourseRegistration" cr
      JOIN "InstitutionalRegistration" ir ON ir.id = cr."registrationId"
      JOIN "ProgrammeAttempt" pa ON pa.id = ir."attemptId"
      JOIN "Student" st ON st.id = pa."studentId"
      WHERE cr."courseId" = ${course.id} AND ir."periodId" = ${period.id}
      ORDER BY cr.id FOR SHARE OF cr, ir, pa, st`;
    const students = await db.student.findMany({
      where: { studentNumber: { in: trace.students.map((s) => s.studentRef) } },
    });
    if (students.length !== trace.students.length)
      this.fail(
        'IDENTITY_MISMATCH',
        'Every candidate must resolve to an official student record.',
      );
    const eligible = await db.courseRegistration.findMany({
      where: {
        courseId: course.id,
        status: 'ENROLLED',
        registration: { periodId: period.id, status: 'REGISTERED' },
      },
      include: { registration: true },
    });
    const attempts = await db.programmeAttempt.findMany({
      where: { id: { in: eligible.map((r) => r.registration.attemptId) } },
    });
    for (const student of students) {
      if (
        !attempts.some((a) => a.studentId === student.id) ||
        rows.some(
          (r) =>
            r.studentRef === student.studentNumber &&
            r.resolvedStudentId !== student.id,
        )
      )
        this.fail(
          'CANDIDATE_MISMATCH',
          'A candidate does not match the authoritative course registration.',
        );
    }
    if (
      previous &&
      (previous.results.length !== students.length ||
        previous.results.some(
          (r) =>
            r.courseId !== course.id ||
            !students.some((s) => s.id === r.studentId),
        ))
    )
      this.fail(
        'AMENDMENT_SCOPE',
        'An amendment must preserve the published batch membership and course. Reconcile eligibility changes separately.',
      );
    const sessionHash = createHash('sha256')
      .update(actor.sessionToken)
      .digest('hex');
    if (
      !(await this.stepUp.consume(db, {
        actor,
        sessionHash,
        action: amendment
          ? 'ApproveOfficialResultAmendment'
          : 'ReleaseOfficialCourseResults',
        commandDigest,
        proof: dto.proof,
      }))
    )
      this.fail(
        'STEP_UP_REQUIRED',
        'Verified step-up authentication is required. Publication remains unchanged.',
        403,
      );
    // Change the operational package before creating its immutable release FK.
    await db.resultPackage.update({
      where: { id: live.id },
      data: { status: 'RELEASED', version: { increment: 1 } },
    });
    const release = await db.resultRelease.create({
      data: {
        packageId: live.id,
        offeringRef: live.offeringRef,
        periodCode: live.periodCode,
        packageHash: live.packageHash,
        policySnapshot: json(configuration),
        releasedByAccountId: actor.accountId,
        assignmentId: actor.assignmentId!,
        declaration: dto.declaration,
        previousReleaseId: previous?.id,
        amendmentId: amendment?.id,
      },
    });
    for (const student of students) {
      const value = trace.students.find(
        (s) => s.studentRef === student.studentNumber,
      )!;
      const old = previous?.results.find((r) => r.studentId === student.id);
      const result = await db.officialResultVersion.create({
        data: {
          releaseId: release.id,
          studentId: student.id,
          studentRef: student.studentNumber,
          courseId: course.id,
          courseCode: course.code,
          courseTitle: course.title,
          courseType: course.courseType,
          periodCode: live.periodCode,
          version: (old?.version ?? 0) + 1,
          mark: value.rounded,
          outcome: value.rounded >= trace.passMark ? 'PASS' : 'FAIL',
          previousVersionId: old?.id,
          calculationSnapshot: json({
            ...value,
            policyVersion: trace.policyVersion,
            formulaVersion: trace.formulaVersion,
            caRefs: rows
              .filter((r) => r.studentRef === student.studentNumber)
              .map((r) => r.id),
          }),
        },
      });
      if (amendment)
        await db.resultAcademicImpact.createMany({
          data: [
            'PROGRESSION',
            'REGISTRATION',
            'ACADEMIC_STANDING',
            'FINANCE',
            'GRADUATION',
            'TRANSCRIPT',
            'CREDENTIALS',
            'STUDENT_SUPPORT',
          ].map((domain) => ({
            resultId: result.id,
            domain,
            sourceVersion: result.version,
          })),
        });
      await db.resultNotice.create({
        data: {
          releaseId: release.id,
          studentId: student.id,
          message: amendment
            ? 'An official result has been updated after an authorized review. Sign in to view the current result and next steps.'
            : 'Your official results are available securely in the portal.',
          href: '/student/results',
        },
      });
    }
    await db.outboxEvent.create({
      data: {
        aggregate: 'ResultRelease',
        aggregateId: release.id,
        type: amendment
          ? 'OfficialResultAmended'
          : 'OfficialCourseResultsReleased',
        payload: json({
          schemaVersion: 1,
          releaseId: release.id,
          classification: 'CONFIDENTIAL',
          producer: 'assessment',
          correlationId: dto.idempotencyKey,
          chain: {
            command: 'CMD-ASM-ReleaseOfficialResults',
            event: amendment
              ? 'OfficialResultAmended'
              : 'EVT-OfficialResultsReleased-v1',
          },
        }),
      },
    });
    await this.audit(
      db,
      actor,
      amendment ? 'OfficialResultAmended' : 'OfficialCourseResultsReleased',
      release.id,
      dto.idempotencyKey,
    );
    return {
      id: release.id,
      packageId: live.id,
      publishedAt: release.publishedAt.toISOString(),
      count: students.length,
      status: 'RELEASED',
      notificationStatus: 'PORTAL_AVAILABLE_DELIVERY_PENDING',
    };
  }
  release(actor: Actor, id: string, dto: ReleaseResultsDto) {
    return this.command(
      actor,
      dto.idempotencyKey,
      'ReleaseOfficialCourseResults',
      { id, version: dto.version, declaration: dto.declaration },
      async (db, hash) =>
        this.publish(
          db,
          actor,
          await this.package(db, actor, id, 'release-results'),
          dto,
          hash,
        ),
    );
  }
  requestAmendment(actor: Actor, dto: RequestAmendmentDto) {
    if (!dto.reason.trim() || !dto.evidenceRef.trim())
      this.fail(
        'EVIDENCE_REQUIRED',
        'Record the correction reason and evidence reference.',
        400,
      );
    return this.command(
      actor,
      dto.idempotencyKey,
      'RequestOfficialResultAmendment',
      {
        releaseId: dto.releaseId,
        packageId: dto.packageId,
        reason: dto.reason.trim(),
        evidenceRef: dto.evidenceRef.trim(),
      },
      async (db) => {
        const pkg = await this.package(
          db,
          actor,
          dto.packageId,
          'validate-results',
        );
        const source = await db.resultRelease.findFirst({
          where: {
            id: dto.releaseId,
            offeringRef: pkg.offeringRef,
            periodCode: pkg.periodCode,
            nextRelease: null,
          },
        });
        if (!source)
          this.fail('NOT_FOUND', 'Current result release not found.', 404);
        if (
          pkg.status !== 'APPROVED_FOR_RELEASE' ||
          source.packageId === pkg.id
        )
          this.fail(
            'NEW_APPROVAL_REQUIRED',
            'An amendment needs a new moderated and board-approved package.',
          );
        const item = await db.resultAmendment.create({
          data: {
            releaseId: source.id,
            packageId: pkg.id,
            reason: dto.reason.trim(),
            evidenceRef: dto.evidenceRef.trim(),
            requestedByAccountId: actor.accountId,
          },
        });
        await this.audit(
          db,
          actor,
          'OfficialResultAmendmentRequested',
          item.id,
          dto.idempotencyKey,
        );
        return { id: item.id, version: item.version, status: item.status };
      },
    );
  }
  approveAmendment(actor: Actor, id: string, dto: ReleaseResultsDto) {
    return this.command(
      actor,
      dto.idempotencyKey,
      'ApproveOfficialResultAmendment',
      { id, version: dto.version, declaration: dto.declaration },
      async (db, hash) => {
        await db.$queryRaw`SELECT id FROM "ResultAmendment" WHERE id = ${id} FOR UPDATE`;
        const amendment = await db.resultAmendment.findUnique({
          where: { id },
        });
        if (!amendment) this.fail('NOT_FOUND', 'Amendment not found.', 404);
        const pkg = await this.package(
          db,
          actor,
          amendment.packageId,
          'release-results',
        );
        if (amendment.requestedByAccountId === actor.accountId)
          this.fail(
            'SOD_VIOLATION',
            'An independent result approver must decide this amendment.',
            403,
          );
        if (
          amendment.status !== 'SUBMITTED' ||
          amendment.version !== dto.version
        )
          this.fail(
            'VERSION_CONFLICT',
            'This amendment has changed. Reload its current state.',
          );
        const receipt = await this.publish(
          db,
          actor,
          pkg,
          {
            idempotencyKey: dto.idempotencyKey,
            version: pkg.version,
            declaration: dto.declaration,
            proof: dto.proof,
          },
          hash,
          amendment,
        );
        await db.resultAmendment.update({
          where: { id },
          data: {
            status: 'APPROVED',
            version: { increment: 1 },
            decidedByAccountId: actor.accountId,
            decidedAt: new Date(),
          },
        });
        return receipt;
      },
    );
  }
  async workspace(
    actor: Actor,
    cursors: { releaseCursor?: string; amendmentCursor?: string } = {},
  ) {
    return this.prisma.$transaction(async (db) => {
      const grant = await this.authority(db, actor, 'validate-results');
      const releases = await db.resultRelease.findMany({
        where: { periodCode: grant.scopeRef },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 101,
        ...(cursors.releaseCursor
          ? { cursor: { id: cursors.releaseCursor }, skip: 1 }
          : {}),
        include: { nextRelease: { select: { id: true } } },
      });
      const scopedIds = await db.resultRelease.findMany({
        where: { periodCode: grant.scopeRef },
        select: { id: true },
      });
      const amendments = await db.resultAmendment.findMany({
        where: { releaseId: { in: scopedIds.map((r) => r.id) } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 101,
        ...(cursors.amendmentCursor
          ? { cursor: { id: cursors.amendmentCursor }, skip: 1 }
          : {}),
      });
      await this.audit(
        db,
        actor,
        'ResultPublicationWorkspaceViewed',
        grant.scopeRef,
        randomUUID(),
      );
      return {
        nextReleaseCursor: releases.length > 100 ? releases[99].id : null,
        nextAmendmentCursor: amendments.length > 100 ? amendments[99].id : null,
        releases: releases.slice(0, 100).map((r) => ({
          id: r.id,
          packageId: r.packageId,
          offeringRef: r.offeringRef,
          periodCode: r.periodCode,
          publishedAt: r.publishedAt.toISOString(),
          current: !r.nextRelease,
        })),
        amendments: amendments.slice(0, 100).map((a) => ({
          id: a.id,
          releaseId: a.releaseId,
          packageId: a.packageId,
          reason: a.reason,
          evidenceRef: a.evidenceRef,
          version: a.version,
          status: a.status,
        })),
      };
    });
  }
  async amendmentDetail(actor: Actor, id: string) {
    return this.prisma.$transaction(async (db) => {
      const grant = await this.authority(db, actor, 'validate-results');
      const item = await db.resultAmendment.findUnique({ where: { id } });
      const release =
        item &&
        (await db.resultRelease.findFirst({
          where: { id: item.releaseId, periodCode: grant.scopeRef },
        }));
      if (!item || !release)
        this.fail('NOT_FOUND', 'Amendment not found.', 404);
      await this.audit(db, actor, 'ResultAmendmentViewed', id, randomUUID());
      return {
        id: item.id,
        releaseId: item.releaseId,
        packageId: item.packageId,
        reason: item.reason,
        evidenceRef: item.evidenceRef,
        version: item.version,
        status: item.status,
      };
    });
  }
  async studentResults(actor: Actor) {
    const now = new Date();
    const grant =
      actor.activeRole === 'STUDENT' && actor.assignmentId
        ? await this.prisma.roleAssignment.findFirst({
            where: {
              id: actor.assignmentId,
              accountId: actor.accountId,
              role: 'STUDENT',
              capabilities: { has: 'study' },
              revokedAt: null,
              startsAt: { lte: now },
              OR: [{ endsAt: null }, { endsAt: { gt: now } }],
              account: { status: 'ACTIVE' },
            },
          })
        : null;
    if (!grant)
      this.fail(
        'STUDENT_WORKSPACE',
        'Select your student workspace to view your own results.',
        403,
      );
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: actor.accountId },
    });
    const student = await this.prisma.student.findUnique({
      where: { personId: account.personId },
    });
    if (!student) return { items: [], notices: [] };
    const rows = await this.prisma.officialResultVersion.findMany({
      where: { studentId: student.id },
      orderBy: [{ version: 'desc' }, { publishedAt: 'desc' }],
      include: { release: true, impacts: true },
    });
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const slot = `${row.courseId}:${row.periodCode}`;
      groups.set(slot, [...(groups.get(slot) ?? []), row]);
    }
    const items = [...groups.values()].map((history) => {
      const current = history[0];
      const policy = current.release.policySnapshot as unknown as {
        showMarks: boolean;
        reviewInstructions: string;
      };
      return {
        courseCode: current.courseCode,
        courseTitle: current.courseTitle,
        courseType: current.courseType,
        periodCode: current.periodCode,
        mark: policy.showMarks ? current.mark : null,
        outcome: current.outcome,
        version: current.version,
        publishedAt: current.publishedAt.toISOString(),
        progressionReadiness: current.impacts.some(
          (i) => i.domain === 'PROGRESSION' && i.status === 'REVIEW_REQUIRED',
        )
          ? 'REVIEW_REQUIRED'
          : 'NOT_EVALUATED',
        reviewInstructions: policy.reviewInstructions,
        history: history.map((r) => ({
          version: r.version,
          mark: (r.release.policySnapshot as unknown as { showMarks: boolean })
            .showMarks
            ? r.mark
            : null,
          outcome: r.outcome,
          publishedAt: r.publishedAt.toISOString(),
        })),
      };
    });
    const notices = await this.prisma.resultNotice.findMany({
      where: { studentId: student.id },
      select: { message: true, href: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    await this.audit(
      this.prisma,
      actor,
      'OwnOfficialResultsViewed',
      student.id,
      randomUUID(),
    );
    return { items, notices };
  }
}
