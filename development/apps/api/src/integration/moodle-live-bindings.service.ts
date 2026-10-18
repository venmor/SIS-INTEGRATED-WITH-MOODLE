import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { verify } from 'argon2';
import { PrismaService } from '../identity-access/prisma.service.js';
import {
  requireActiveTransactionSession,
  type SessionAuthority,
} from '../identity-access/transaction-session.js';
import { MoodleLiveRunService } from './moodle-live-run.service.js';
import { IntegrationService } from './integration.service.js';
import { MoodleWriteTransport } from './moodle-write-transport.js';

/** Mapping commands preserve the existing three-person academic/technical
 * separation. A published curriculum is the academic source, not a checkbox.
 */
@Injectable()
export class MoodleLiveBindingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runs: MoodleLiveRunService,
    private readonly integration: IntegrationService,
  ) {}
  async sources(actor: SessionAuthority) {
    return this.guarded(actor, () => this.doSources(actor));
  }
  async draft(
    actor: SessionAuthority,
    input: {
      idempotencyKey: string;
      courseRegistrationId: string;
      kind: 'SHELL' | 'USER';
      moodleId?: number;
    },
  ) {
    return this.guarded(actor, () => this.doDraft(actor, input));
  }
  async decide(
    actor: SessionAuthority,
    id: string,
    input: { idempotencyKey: string; version: number; password?: string },
    academic: boolean,
  ) {
    return this.guarded(actor, () => this.doDecide(actor, id, input, academic));
  }
  private async guarded<T>(actor: SessionAuthority, work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      await this.prisma.auditEvent.create({
        data: {
          actorAccountId: actor.accountId,
          activeRole: actor.activeRole,
          action: 'MoodleLiveBindingRefused',
          outcome: 'DENIED',
          reason: 'AUTHORITY_OR_STATE_REFUSED',
          policyVersion: 'MOODLE-LIVE-TEST-v1',
          correlationId: crypto.randomUUID(),
        },
      });
      throw error;
    }
  }
  private async context(
    tx: Prisma.TransactionClient,
    actor: SessionAuthority,
    rowId: string,
    academic = false,
  ) {
    const now = new Date();
    if (['MOODLE_ADMIN', 'COORDINATOR'].includes(actor.activeRole ?? ''))
      await requireActiveTransactionSession(tx, actor);
    const role = academic ? 'COORDINATOR' : 'MOODLE_ADMIN',
      cap = academic ? 'approve-assessment' : 'manage-mapping';
    const a = await tx.roleAssignment.findFirst({
      where: {
        id: actor.assignmentId ?? '',
        accountId: actor.accountId,
        role,
        capabilities: { has: cap },
        revokedAt: null,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        account: { status: 'ACTIVE' },
      },
      include: { account: true },
    });
    if (!a || actor.activeRole !== role)
      throw new ForbiddenException('LIVE_BINDING_AUTHORITY_REQUIRED');
    const row = await tx.courseRegistration.findUnique({
      where: { id: rowId },
      include: { course: true, registration: true },
    });
    if (!row) throw new NotFoundException('BINDING_SOURCE_NOT_FOUND');
    const attempt = await tx.programmeAttempt.findUniqueOrThrow({
      where: { id: row.registration.attemptId },
      include: {
        offering: { include: { programme: true } },
        student: { include: { person: true } },
      },
    });
    if (
      !attempt.curriculumVersionId ||
      !(await tx.curriculumCourse.findFirst({
        where: {
          curriculumId: attempt.curriculumVersionId,
          courseId: row.courseId,
          curriculum: { status: 'PUBLISHED' },
        },
      }))
    )
      throw new ConflictException('PUBLISHED_CURRICULUM_COURSE_REQUIRED');
    const descriptor = await this.runs.registrationDeliveryPermit(tx, row.id);
    const run = await tx.moodleLiveTestRun.findUniqueOrThrow({
      where: { runId: descriptor.runId },
    });
    if (
      academic
        ? a.scopeType !== 'SCHOOL' ||
          a.scopeRef !== attempt.offering.programme.school
        : a.scopeType !== run.scopeType || a.scopeRef !== run.scopeRef
    )
      throw new ForbiddenException('LIVE_BINDING_SCOPE_REQUIRED');
    return { row, attempt, a, descriptor };
  }
  private async doSources(actor: SessionAuthority) {
    if (!['MOODLE_ADMIN', 'COORDINATOR'].includes(actor.activeRole ?? ''))
      throw new ForbiddenException('LIVE_BINDING_AUTHORITY_REQUIRED');
    const run = await this.prisma.moodleLiveTestRun.findUnique({
      where: { runId: process.env.MOODLE_LIVE_TEST_RUN_ID ?? '' },
      include: { manifest: { include: { entries: true } } },
    });
    if (!run) return { sources: [], mappings: [], state: 'NOT_CONFIGURED' };
    const entries = run.manifest?.entries ?? [];
    const refs = entries
      .filter((e) => e.entity === 'CourseRegistration')
      .map((e) => e.entityId);
    const derived = await this.prisma.courseRegistration.findMany({
      where: {
        status: 'ENROLLED',
        registration: {
          status: 'REGISTERED',
          attemptId: {
            in: entries
              .filter((e) => e.entity === 'ProgrammeAttempt')
              .map((e) => e.entityId),
          },
        },
      },
      select: { id: true },
      take: 100,
      orderBy: { id: 'asc' },
    });
    refs.push(
      ...derived.map((row) => row.id).filter((id) => !refs.includes(id)),
    );
    const sources = [];
    for (const id of refs.slice(0, 100)) {
      try {
        const c = await this.prisma.$transaction((tx) =>
          this.context(tx, actor, id, actor.activeRole === 'COORDINATOR'),
        );
        sources.push({
          courseRegistrationId: id,
          courseCode: c.row.course.code,
          courseTitle: c.row.course.title,
          periodId: c.row.registration.periodId,
          studentId: c.attempt.studentId,
          studentName: c.attempt.student.person.displayName,
          shellKey: `${c.row.courseId}:${c.row.registration.periodId}`,
        });
      } catch {
        /* No cross-scope discovery. */
      }
    }
    if (!sources.length)
      throw new ForbiddenException('LIVE_BINDING_SCOPE_REQUIRED');
    const mappings = await this.prisma.moodleMapping.findMany({
      where: {
        OR: [
          {
            kind: 'SHELL',
            sisType: 'COURSE_PERIOD',
            sisId: { in: sources.map((s) => s.shellKey) },
          },
          {
            kind: 'USER',
            sisType: 'STUDENT',
            sisId: { in: sources.map((s) => s.studentId) },
          },
        ],
      },
      include: { checks: { orderBy: { createdAt: 'asc' } } },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });
    const deliveries = await this.prisma.moodleLiveDeliveryClaim.findMany({
      where: {
        runId: run.id,
        courseRegistrationId: {
          in: sources.map((source) => source.courseRegistrationId),
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 100,
      select: {
        id: true,
        outboxId: true,
        courseRegistrationId: true,
        state: true,
        attempt: true,
        lastCode: true,
        moodleUserId: true,
        deliveredAt: true,
        updatedAt: true,
      },
    });
    return { sources, mappings, deliveries, state: run.state };
  }
  private async doDraft(
    actor: SessionAuthority,
    input: {
      idempotencyKey: string;
      courseRegistrationId: string;
      kind: 'SHELL' | 'USER';
      moodleId?: number;
    },
  ) {
    const c = await this.prisma.$transaction((tx) =>
      this.context(tx, actor, input.courseRegistrationId),
    );
    const remote = new MoodleWriteTransport(c.descriptor);
    await remote.verifyTarget();
    let identity: { id: number; idnumber: string; username?: string };
    if (input.kind === 'SHELL') {
      const id =
        input.moodleId ??
        (await remote.ensureCourse({
          idnumber: `${c.descriptor.cohortPrefix}${c.row.courseId}-${c.row.registration.periodId}`,
          shortname: `${c.descriptor.cohortPrefix}${c.row.course.code}-${c.row.registration.periodId}`,
          fullname: `${c.row.course.code} — ${c.row.course.title}`,
        }));
      identity = await remote.courseIdentity(id);
    } else {
      if (!input.moodleId)
        throw new ConflictException('EXISTING_USER_ID_REQUIRED');
      identity = await remote.userIdentity(input.moodleId);
    }
    return this.integration.command(
      actor,
      input.idempotencyKey,
      'DraftLiveMoodleBinding',
      { ...input },
      async (tx) => {
        const fresh = await this.context(tx, actor, input.courseRegistrationId);
        if (
          fresh.descriptor.configFingerprint !== c.descriptor.configFingerprint
        )
          throw new ConflictException('BINDING_SOURCE_CHANGED');
        const mapping = await tx.moodleMapping.create({
          data: {
            kind: input.kind,
            sisType: input.kind === 'SHELL' ? 'COURSE_PERIOD' : 'STUDENT',
            sisId:
              input.kind === 'SHELL'
                ? `${fresh.row.courseId}:${fresh.row.registration.periodId}`
                : fresh.attempt.studentId,
            moodleId: String(identity.id),
            creatorAccountId: actor.accountId,
            status: 'DRAFT',
          },
        });
        await tx.mappingCheck.create({
          data: {
            mappingId: mapping.id,
            result: 'PASS',
            reasons: {
              courseRegistrationId: input.courseRegistrationId,
              moodleIdnumber: identity.idnumber,
              moodleUsername: identity.username ?? null,
              creatorPersonId: fresh.a.account.personId,
              runId: fresh.descriptor.runId,
            },
          },
        });
        await this.audit(tx, actor, 'MoodleLiveBindingDrafted', mapping.id);
        return {
          body: {
            id: mapping.id,
            status: mapping.status,
            version: mapping.version,
            moodleId: mapping.moodleId,
          },
        };
      },
      async (tx) => {
        await this.context(tx, actor, input.courseRegistrationId);
      },
    );
  }
  private async doDecide(
    actor: SessionAuthority,
    id: string,
    input: { idempotencyKey: string; version: number; password?: string },
    academic: boolean,
  ) {
    const sourceRowId = await this.prisma.$transaction(async (tx) => {
      const proof = await tx.mappingCheck.findFirst({
        where: { mappingId: id, result: 'PASS' },
        orderBy: { createdAt: 'desc' },
      });
      const ref = proof?.reasons as Record<string, unknown> | undefined;
      if (!ref || typeof ref.courseRegistrationId !== 'string')
        throw new NotFoundException('LIVE_BINDING_NOT_FOUND');
      await this.context(tx, actor, ref.courseRegistrationId, academic);
      return ref.courseRegistrationId;
    });
    return this.integration.command(
      actor,
      input.idempotencyKey,
      academic ? 'AttestLiveMoodleBinding' : 'ActivateLiveMoodleBinding',
      { id, version: input.version },
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "MoodleMapping" WHERE id = ${id} FOR UPDATE`;
        const m = await tx.moodleMapping.findUnique({
          where: { id },
          include: {
            checks: {
              where: { result: 'PASS' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });
        const proof = m?.checks[0]?.reasons as
          Record<string, unknown> | undefined;
        if (!m || !proof || typeof proof.courseRegistrationId !== 'string')
          throw new NotFoundException('LIVE_BINDING_NOT_FOUND');
        const c = await this.context(
          tx,
          actor,
          proof.courseRegistrationId,
          academic,
        );
        if (
          m.status !== 'DRAFT' ||
          m.version !== input.version ||
          proof.runId !== c.descriptor.runId
        )
          throw new ConflictException('LIVE_BINDING_VERSION_CHANGED');
        if (
          actor.accountId === m.creatorAccountId ||
          c.a.account.personId === proof.creatorPersonId
        )
          throw new ForbiddenException('INDEPENDENT_BINDING_DECISION_REQUIRED');
        if (academic) {
          if (m.kind !== 'SHELL')
            throw new ConflictException('ACADEMIC_ATTESTATION_NOT_REQUIRED');
          await tx.mappingCheck.create({
            data: {
              mappingId: id,
              result: 'ACADEMIC_APPROVED',
              reasons: {
                accountId: actor.accountId,
                personId: c.a.account.personId,
                assignmentId: c.a.id,
                curriculumVersionId: c.attempt.curriculumVersionId,
              },
            },
          });
        } else {
          const credential = await tx.credential.findFirst({
            where: {
              accountId: actor.accountId,
              kind: 'PASSWORD',
              status: 'ACTIVE',
            },
          });
          if (
            !input.password ||
            !credential ||
            !(await verify(credential.secretHash, input.password))
          )
            throw new ForbiddenException('FRESH_PASSWORD_REQUIRED');
          if (m.kind === 'SHELL') {
            const academicProof = await tx.mappingCheck.findFirst({
              where: { mappingId: id, result: 'ACADEMIC_APPROVED' },
              orderBy: { createdAt: 'desc' },
            });
            const a = academicProof?.reasons as
              Record<string, unknown> | undefined;
            if (
              !a ||
              a.accountId === actor.accountId ||
              a.personId === c.a.account.personId
            )
              throw new ForbiddenException(
                'INDEPENDENT_ACADEMIC_APPROVAL_REQUIRED',
              );
          }
          // Serialize the logical key as well as the draft, so two drafts cannot
          // activate together and both observe no existing active binding.
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${m.kind}:${m.sisType}:${m.sisId}`}, 0))::text`;
          if (m.kind === 'USER') {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`moodle-student-identity:${m.moodleId}`}, 0))::text`;
            if (
              await tx.moodleMapping.findFirst({
                where: {
                  kind: 'USER',
                  sisType: 'STUDENT',
                  moodleId: m.moodleId,
                  status: 'ACTIVE',
                  sisId: { not: m.sisId },
                },
              })
            )
              throw new ConflictException('MOODLE_IDENTITY_ALREADY_BOUND');
          }
          await tx.moodleMapping.updateMany({
            where: {
              kind: m.kind,
              sisType: m.sisType,
              sisId: m.sisId,
              status: 'ACTIVE',
            },
            data: { status: 'SUPERSEDED' },
          });
          await tx.moodleMapping.update({
            where: { id },
            data: {
              status: 'ACTIVE',
              version: { increment: 1 },
              activatorAccountId: actor.accountId,
            },
          });
        }
        await this.audit(
          tx,
          actor,
          academic ? 'MoodleLiveBindingAttested' : 'MoodleLiveBindingActivated',
          id,
        );
        return {
          body: {
            id,
            status: academic ? 'DRAFT' : 'ACTIVE',
            version: academic ? m.version : m.version + 1,
          },
        };
      },
      async (tx) => {
        await this.context(tx, actor, sourceRowId, academic);
      },
    );
  }
  private async audit(
    tx: Prisma.TransactionClient,
    actor: SessionAuthority,
    action: string,
    id: string,
  ) {
    await tx.auditEvent.create({
      data: {
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole,
        action,
        targetRef: id,
        outcome: 'SAVED',
        policyVersion: 'MOODLE-LIVE-TEST-v1',
        correlationId: crypto.randomUUID(),
      },
    });
  }
}
