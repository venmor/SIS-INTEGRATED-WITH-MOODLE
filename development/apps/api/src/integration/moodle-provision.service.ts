import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../identity-access/prisma.service.js';
import { PolicyService } from '../identity-access/policy.service.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { auditAuth } from '../identity-access/audit.js';
import { IntegrationService } from './integration.service.js';

type Tx = Prisma.TransactionClient;
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

interface ProvisionAuthority extends ActiveAuthority {
  scopeType?: string | null;
  scopeRef?: string | null;
}

const PROVISION_CAPABILITY = 'moodle:provision';

function fail(code: string, message: string, status: number): never {
  throw new HttpException(
    { code, message, saved: false, supportReference: randomUUID() },
    status,
  );
}

/**
 * Moodle access provisioning service (design 2026-10-22).
 *
 * Staff with delegated `moodle:provision:*` authority can assign Moodle
 * access to students for specific registered courses. Every action is
 * audited, scope/SoD enforced, fail-closed. Access is entitlement-based
 * (THIS_PERIOD/ACADEMIC_YEAR/WHILE_ENROLLED), not time-limited tokens.
 * Removals suspend; history is retained.
 */
@Injectable()
export class MoodleProvisionService {
  private readonly logger = new Logger(MoodleProvisionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly integration: IntegrationService,
  ) {}

  /**
   * Fail closed unless the caller's live assignment carries the capability.
   * Used by sibling Moodle features (launch, grade sync) so capability
   * checks live in one place.
   */
  async assertCapability(auth: ProvisionAuthority, capabilityName: string) {
    const assignment = await this.prisma.$transaction(async (db) =>
      this.liveAssignment(db, auth),
    );
    if (!assignment) {
      fail('ASSIGNMENT_INACTIVE', 'Your role assignment is not live.', 403);
    }
    if (!assignment!.capabilities.includes(capabilityName)) {
      fail(
        'CAPABILITY_REQUIRED',
        `Your role does not include ${capabilityName}.`,
        403,
      );
    }
  }

  /** Derive validUntil from the policy and period/year end dates. */
  deriveValidUntil(
    policyVal: string,
    periodEnd?: Date | null,
    yearEnd?: Date | null,
  ): Date | null {
    if (policyVal === 'THIS_PERIOD') return periodEnd ?? null;
    if (policyVal === 'ACADEMIC_YEAR') return yearEnd ?? periodEnd ?? null;
    if (policyVal === 'WHILE_ENROLLED') return null;
    return null;
  }

  /** Collect a scope and every descendant scope id (depth-guarded). */
  private async scopeSubtree(db: Tx, rootScopeId: string): Promise<Set<string>> {
    const ids = new Set<string>();
    const queue = [rootScopeId];
    let guard = 0;
    while (queue.length > 0 && guard < 500) {
      guard += 1;
      const current = queue.shift()!;
      if (ids.has(current)) continue;
      ids.add(current);
      const children = await db.scope.findMany({
        where: { parentScopeId: current },
        select: { id: true },
      });
      for (const child of children) queue.push(child.id);
    }
    return ids;
  }

  /** The caller's live role assignment, or null when it is not in force. */
  private async liveAssignment(db: Tx, auth: ProvisionAuthority) {
    const now = new Date();
    return db.roleAssignment.findFirst({
      where: {
        ...(auth.assignmentId ? { id: auth.assignmentId } : {}),
        accountId: auth.accountId,
        role: auth.activeRole ?? '',
        revokedAt: null,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        account: { status: 'ACTIVE' },
      },
      select: {
        id: true,
        scopeId: true,
        scopeType: true,
        scopeRef: true,
        capabilities: true,
      },
    });
  }

  private async assignmentScopeId(
    db: Tx,
    assignment: {
      scopeId: string | null;
      scopeType: string;
      scopeRef: string;
    } | null,
  ): Promise<string | null> {
    if (!assignment) return null;
    if (assignment.scopeId) return assignment.scopeId;
    const scope = await db.scope.findUnique({
      where: { name: `${assignment.scopeType}:${assignment.scopeRef}` },
      select: { id: true },
    });
    return scope?.id ?? null;
  }

  /**
   * Ensure the caller's live role assignment carries the capability and that
   * the target scope is the assignment scope or a descendant of it.
   * Returns the actor's scope id so callers can limit their own queries.
   */
  private async requireAuthority(
    db: Tx,
    auth: ProvisionAuthority,
    targetScopeId: string,
    capabilityName = PROVISION_CAPABILITY,
  ): Promise<string> {
    const assignment = await this.liveAssignment(db, auth);
    if (!assignment) {
      fail('ASSIGNMENT_INACTIVE', 'Your role assignment is not live.', 403);
    }
    if (!assignment!.capabilities.includes(capabilityName)) {
      fail(
        'MOODLE_PROVISION_DENIED',
        `Your role does not include ${capabilityName}.`,
        403,
      );
    }
    const actorScopeId = await this.assignmentScopeId(db, assignment!);
    if (!actorScopeId) {
      fail('SCOPE_REQUIRED', 'A live scope assignment is required.', 403);
    }
    if (actorScopeId !== targetScopeId) {
      const allowed = await this.scopeSubtree(db, actorScopeId!);
      if (!allowed.has(targetScopeId)) {
        fail('MOODLE_PROVISION_DENIED', 'Authority does not extend to this scope.', 403);
      }
    }
    return actorScopeId!;
  }

  /** Actor scope plus every scope it covers, for filtering own queries. */
  private async scopeAccess(
    db: Tx,
    auth: ProvisionAuthority,
  ): Promise<{ actorScopeId: string; allowed: Set<string> }> {
    const assignment = await this.liveAssignment(db, auth);
    if (!assignment) {
      fail('ASSIGNMENT_INACTIVE', 'Your role assignment is not live.', 403);
    }
    if (!assignment!.capabilities.includes(PROVISION_CAPABILITY)) {
      fail(
        'MOODLE_PROVISION_DENIED',
        `Your role does not include ${PROVISION_CAPABILITY}.`,
        403,
      );
    }
    const actorScopeId = await this.assignmentScopeId(db, assignment!);
    if (!actorScopeId) {
      fail('SCOPE_REQUIRED', 'A live scope assignment is required.', 403);
    }
    const allowed = await this.scopeSubtree(db, actorScopeId!);
    return { actorScopeId: actorScopeId!, allowed };
  }

  private async actorScopeId(db: Tx, auth: ProvisionAuthority): Promise<string | null> {
    const assignment = await this.liveAssignment(db, auth);
    return this.assignmentScopeId(db, assignment);
  }

  private async resolveScopeId(
    db: Tx,
    scopeType: string | null | undefined,
    scopeRef: string | null | undefined,
  ): Promise<string> {
    if (!scopeType || !scopeRef) {
      fail('SCOPE_REQUIRED', 'A target scope is required.', 400);
    }
    const scopeName = `${scopeType}:${scopeRef}`;
    const scope = await db.scope.findUnique({ where: { name: scopeName }, select: { id: true } });
    if (!scope) fail('SCOPE_NOT_FOUND', 'Target scope not found.', 404);
    return scope.id;
  }

  /** End date of a period's latest published version, when one exists. */
  private async periodEnd(db: Tx, periodId: string): Promise<Date | null> {
    const version = await db.academicPeriodVersion.findFirst({
      where: { periodId },
      orderBy: { version: 'desc' },
      select: { endDate: true },
    });
    return version?.endDate ?? null;
  }

  /** End of the enclosing academic year, found by walking period parents. */
  private async academicYearEnd(db: Tx, periodId: string): Promise<Date | null> {
    const version = await db.academicPeriodVersion.findFirst({
      where: { periodId },
      orderBy: { version: 'desc' },
      select: { parentCode: true, periodType: true, endDate: true },
    });
    if (!version) return null;
    if (/YEAR/i.test(version.periodType)) return version.endDate;
    if (!version.parentCode) return this.periodEnd(db, periodId);
    const parent = await db.academicPeriod.findUnique({
      where: { code: version.parentCode },
      select: { id: true },
    });
    if (!parent) return this.periodEnd(db, periodId);
    return this.periodEnd(db, parent.id);
  }

  private async audit(
    auth: ProvisionAuthority,
    outcome: 'ALLOW' | 'DENY',
    scopeName: string | null,
    targetRef: string | undefined,
    reason: string,
    idempotencyRef?: string,
  ) {
    await auditAuth(this.prisma, {
      action: 'CMD-Moodle-ProvisionRequest',
      outcome,
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: scopeName,
      targetRef,
      reason,
      purpose: 'moodle-provision-request',
      idempotencyRef: idempotencyRef ?? null,
    });
  }

  /**
   * Create a Moodle provisioning request with one item per student+course.
   * Request, items and outbox events commit atomically so a committed
   * request always has a delivery route. Repeats with the same idempotency
   * key replay the original request instead of double-enrolling anyone.
   */
  async createProvisionRequest(
    auth: ProvisionAuthority,
    input: {
      idempotencyKey?: string;
      studentIds: string[];
      courseRegistrationIds: string[];
      offeringId?: string | null;
      scopeType?: string | null;
      scopeRef?: string | null;
      validityPolicy?: string;
      validUntil?: Date | null;
      reason?: string;
      targetScopeType?: string | null;
      targetScopeRef?: string | null;
    },
  ) {
    if (!input.studentIds?.length)
      fail('EMPTY_REQUEST', 'At least one student is required.', 400);
    if (!input.courseRegistrationIds?.length)
      fail('EMPTY_REQUEST', 'At least one course registration is required.', 400);
    if (input.studentIds.length !== input.courseRegistrationIds.length) {
      fail('MISMATCHED_LISTS', 'studentIds and courseRegistrationIds must align.', 400);
    }

    const policy = input.validityPolicy ?? 'WHILE_ENROLLED';
    if (!['THIS_PERIOD', 'ACADEMIC_YEAR', 'WHILE_ENROLLED'].includes(policy)) {
      fail('INVALID_VALIDITY_POLICY', 'Unknown access validity policy.', 400);
    }

    const scopeType = input.targetScopeType ?? input.scopeType ?? auth.scopeType ?? null;
    const scopeRef = input.targetScopeRef ?? input.scopeRef ?? auth.scopeRef ?? null;
    const scopeName = scopeType && scopeRef ? `${scopeType}:${scopeRef}` : null;
    const ACTION = 'CMD-Moodle-ProvisionRequest';

    // Idempotency first: claim the key so concurrent double-submits converge.
    if (input.idempotencyKey) {
      const prior = await this.prisma.idempotencyKey.findUnique({
        where: { key: input.idempotencyKey },
      });
      if (prior) {
        if (prior.accountId !== auth.accountId || prior.action !== ACTION) {
          await this.audit(auth, 'DENY', scopeName, undefined, 'idempotency-key-mismatch', input.idempotencyKey);
          fail('IDEMPOTENCY_MISMATCH', 'This request key belongs to another action.', 409);
        }
        if (prior.status === 201) {
          const receipt = prior.response as { requestId?: string };
          const existing = receipt.requestId
            ? await this.prisma.moodleProvisionRequest.findUnique({
                where: { id: receipt.requestId },
                include: { items: true },
              })
            : null;
          await this.audit(auth, 'ALLOW', scopeName, receipt.requestId, 'idempotent-replay', input.idempotencyKey);
          if (existing) {
            return {
              ok: true as const,
              requestId: existing.id,
              request: existing,
              items: existing.items,
              replayed: true,
            };
          }
        }
        const ageMs = Date.now() - prior.createdAt.getTime();
        if (ageMs <= 15 * 60 * 1000) {
          fail('IDEMPOTENT_IN_FLIGHT', 'This request is still being processed.', 409);
        }
        await this.prisma.idempotencyKey.delete({ where: { key: input.idempotencyKey } });
      }
      try {
        await this.prisma.idempotencyKey.create({
          data: {
            key: input.idempotencyKey,
            accountId: auth.accountId,
            action: ACTION,
            status: 0,
            response: {},
          },
        });
      } catch {
        fail('IDEMPOTENT_IN_FLIGHT', 'This request is still being processed.', 409);
      }
    }

    try {
      const result = await this.prisma.$transaction(async (db) => {
        const targetScopeId = await this.resolveScopeId(db, scopeType, scopeRef);
        await this.requireAuthority(db, auth, targetScopeId);

        // Validate every pairing before writing anything.
        const prepared: Array<{
          studentId: string;
          courseRegistrationId: string;
          offeringId: string | null;
          periodCode: string | null;
          validUntil: Date | null;
        }> = [];
        for (let i = 0; i < input.studentIds.length; i++) {
          const studentId = input.studentIds[i]!;
          const courseRegistrationId = input.courseRegistrationIds[i];
          if (!courseRegistrationId) {
            fail('REGISTRATION_REQUIRED', 'Every student needs a registered course.', 400);
          }
          const student = await db.student.findUnique({
            where: { id: studentId },
            select: { status: true },
          });
          if (!student) fail('STUDENT_NOT_FOUND', 'Student not found.', 404);
          if (student.status !== 'ACTIVE') {
            fail('STUDENT_NOT_ACTIVE', 'Moodle access can only be assigned to active students.', 409);
          }

          const course = await db.courseRegistration.findUnique({
            where: { id: courseRegistrationId },
            select: { id: true, status: true, registrationId: true },
          });
          if (!course) fail('REGISTRATION_NOT_FOUND', 'Course registration not found.', 404);
          if (course.status !== 'ENROLLED') {
            fail('COURSE_NOT_ENROLLED', 'The course registration is not active.', 409);
          }
          const registration = await db.institutionalRegistration.findUnique({
            where: { id: course.registrationId },
            select: { attemptId: true, periodId: true, status: true },
          });
          if (!registration || registration.status !== 'REGISTERED') {
            fail('REGISTRATION_NOT_ACTIVE', 'Course registration is not active.', 409);
          }
          const attempt = await db.programmeAttempt.findUnique({
            where: { id: registration.attemptId },
            select: { studentId: true, offeringId: true },
          });
          if (!attempt || attempt.studentId !== studentId) {
            fail('REGISTRATION_MISMATCH', 'Course registration does not belong to the student.', 400);
          }
          const period = await db.academicPeriod.findUnique({
            where: { id: registration.periodId },
            select: { code: true, id: true },
          });
          const periodEnd = period ? await this.periodEnd(db, period.id) : null;
          const yearEnd = period ? await this.academicYearEnd(db, period.id) : null;
          prepared.push({
            studentId,
            courseRegistrationId,
            offeringId: input.offeringId ?? attempt.offeringId,
            periodCode: period?.code ?? null,
            validUntil: input.validUntil ?? this.deriveValidUntil(policy, periodEnd, yearEnd),
          });
        }

        const requestId = randomUUID();
        const validUntil =
          input.validUntil ?? prepared.map((p) => p.validUntil).filter(Boolean)[0] ?? null;
        const request = await db.moodleProvisionRequest.create({
          data: {
            id: requestId,
            requestId,
            requestedByAccountId: auth.accountId,
            state: 'WAITING',
            scopeType,
            scopeRef,
            scopeId: targetScopeId,
            reason: input.reason ?? null,
            validityPolicy: policy,
            validUntil,
            outboxId: null,
          },
          include: { items: true },
        });

        const items = [];
        for (const entry of prepared) {
          const item = await db.moodleProvisionRequestItem.create({
            data: {
              requestId,
              studentId: entry.studentId,
              courseRegistrationId: entry.courseRegistrationId,
              offeringId: entry.offeringId,
              state: 'WAITING',
              moodleRole: 'Student',
              validityPolicy: policy,
              validUntil: entry.validUntil,
            },
          });
          const outbox = await db.outboxEvent.create({
            data: {
              aggregate: 'MoodleProvisionRequest',
              aggregateId: requestId,
              type: 'MoodleProvisionRequested',
              payload: json({
                eventId: randomUUID(),
                eventType: 'zm.sis.moodle.provision-requested.v1',
                correlationId: input.idempotencyKey ?? requestId,
                idempotencyKey: `${input.idempotencyKey ?? requestId}:${item.id}`,
                payloadVersion: 1,
                deliveryStatus: 'QUEUED',
                retryPolicy: 'MOODLE-DEMO-v1',
                provisionRequestId: requestId,
                itemId: item.id,
                studentId: entry.studentId,
                courseRegistrationId: entry.courseRegistrationId,
                offeringId: entry.offeringId,
                periodCode: entry.periodCode,
                validityPolicy: policy,
              }),
            },
          });
          items.push(
            (await db.moodleProvisionRequestItem.update({
              where: { id: item.id },
              data: { outboxId: outbox.id },
              include: { student: { select: { studentNumber: true } } },
            })) as (typeof item & { student: { studentNumber: string } }),
          );
        }

        return {
          ok: true as const,
          requestId,
          request,
          items,
          replayed: false,
        };
      });

      if (input.idempotencyKey) {
        await this.prisma.idempotencyKey.update({
          where: { key: input.idempotencyKey },
          data: { status: 201, response: { requestId: result.requestId } },
        });
      }
      await this.audit(auth, 'ALLOW', scopeName, result.requestId, input.reason ?? 'provision-request-created', input.idempotencyKey);
      return result;
    } catch (error) {
      if (input.idempotencyKey) {
        await this.prisma.idempotencyKey
          .delete({ where: { key: input.idempotencyKey } })
          .catch(() => undefined);
      }
      const reason =
        error instanceof HttpException
          ? String((error.getResponse() as { code?: string }).code ?? 'denied')
          : 'unexpected-error';
      await this.audit(auth, 'DENY', scopeName, undefined, reason, input.idempotencyKey).catch(
        () => undefined,
      );
      throw error;
    }
  }

  /** Requests are only visible inside the caller's scope subtree. */
  private async assertRequestInScope(
    db: Tx,
    allowed: Set<string>,
    request: { scopeId: string | null },
  ): Promise<void> {
    if (request.scopeId && allowed.has(request.scopeId)) return;
    if (!request.scopeId) {
      const global = await db.scope.findUnique({
        where: { name: 'SYSTEM:GLOBAL' },
        select: { id: true },
      });
      if (global && allowed.has(global.id)) return;
    }
    // Do not disclose that a request exists outside the caller's authority.
    fail('REQUEST_NOT_FOUND', 'Provision request not found.', 404);
  }

  async listProvisionRequests(
    auth: ProvisionAuthority,
    filter?: { state?: string; studentId?: string; offeringId?: string; limit?: number; cursor?: string },
  ) {
    const access = await this.prisma.$transaction((db) => this.scopeAccess(db, auth));

    const where: Prisma.MoodleProvisionRequestWhereInput = {
      scopeId: { in: [...access.allowed] },
    };
    if (filter?.state) where.state = filter.state;
    if (filter?.studentId) where.items = { some: { studentId: filter.studentId } };
    if (filter?.offeringId) where.items = { some: { offeringId: filter.offeringId } };

    const scopeName = auth.scopeType && auth.scopeRef ? `${auth.scopeType}:${auth.scopeRef}` : null;
    await auditAuth(this.prisma, {
      action: 'QRY-Moodle-ProvisionList',
      outcome: 'ALLOW',
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: scopeName,
      purpose: 'moodle-provision-list',
    });

    return this.prisma.moodleProvisionRequest.findMany({
      where,
      include: {
        items: { include: { student: { select: { studentNumber: true, status: true } } } },
        requester: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(filter?.limit ?? 50, 200),
      cursor: filter?.cursor ? { id: filter.cursor } : undefined,
    });
  }

  async getProvisionRequest(auth: ProvisionAuthority, requestId: string) {
    const access = await this.prisma.$transaction((db) => this.scopeAccess(db, auth));

    const request = await this.prisma.moodleProvisionRequest.findUnique({
      where: { id: requestId },
      include: {
        items: { include: { student: { select: { studentNumber: true, status: true } } } },
        requester: { select: { username: true } },
      },
    });
    if (!request) fail('REQUEST_NOT_FOUND', 'Provision request not found.', 404);
    await this.assertRequestInScope(this.prisma, access.allowed, request!);

    const scopeName = auth.scopeType && auth.scopeRef ? `${auth.scopeType}:${auth.scopeRef}` : null;
    await auditAuth(this.prisma, {
      action: 'QRY-Moodle-ProvisionDetail',
      outcome: 'ALLOW',
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: scopeName,
      targetRef: requestId,
      purpose: 'moodle-provision-detail',
    });
    return request;
  }

  async revokeProvisionRequest(auth: ProvisionAuthority, requestId: string, reason: string) {
    if (!reason || reason.trim().length < 3) {
      fail('REASON_REQUIRED', 'A revocation reason is required.', 400);
    }
    const now = new Date();
    const result = await this.prisma.$transaction(async (db) => {
      const access = await this.scopeAccess(db, auth);
      const request = await db.moodleProvisionRequest.findUnique({
        where: { id: requestId },
        include: { items: true },
      });
      if (!request) fail('REQUEST_NOT_FOUND', 'Provision request not found.', 404);
      await this.assertRequestInScope(db, access.allowed, request!);
      if (request!.state === 'REVOKED') {
        return { ok: true as const, requestId, state: 'REVOKED' };
      }

      for (const item of request!.items) {
        if ((item.state === 'DELIVERED' || item.state === 'QUEUED') && item.studentId) {
          await db.moodleProvisionRequestItem.update({
            where: { id: item.id },
            data: { state: 'REVOKED', revokedAt: now, revokeReason: reason },
          });
          // Suspension goes through the outbox; Moodle history is retained.
          await db.outboxEvent.create({
            data: {
              aggregate: 'MoodleProvisionRequestItem',
              aggregateId: item.id,
              type: 'MoodleProvisionRevoked',
              payload: json({
                eventId: randomUUID(),
                eventType: 'zm.sis.moodle.provision-revoked.v1',
                correlationId: requestId,
                idempotencyKey: `${requestId}:${item.id}:revoke`,
                payloadVersion: 1,
                deliveryStatus: 'QUEUED',
                retryPolicy: 'MOODLE-DEMO-v1',
                provisionRequestId: requestId,
                itemId: item.id,
                studentId: item.studentId,
                reason,
              }),
            },
          });
        } else if (item.state === 'WAITING') {
          await db.moodleProvisionRequestItem.update({
            where: { id: item.id },
            data: { state: 'CANCELLED' },
          });
        }
      }

      const updated = await db.moodleProvisionRequest.update({
        where: { id: requestId },
        data: { state: 'REVOKED', revokedAt: now, revokeReason: reason },
        include: { items: true },
      });
      return { ok: true as const, request: updated };
    });
    await this.auditRevoke(auth, requestId, reason);
    return result;
  }

  private async auditRevoke(auth: ProvisionAuthority, requestId: string, reason: string) {
    const scopeName = auth.scopeType && auth.scopeRef ? `${auth.scopeType}:${auth.scopeRef}` : null;
    await auditAuth(this.prisma, {
      action: 'CMD-Moodle-ProvisionRevoke',
      outcome: 'ALLOW',
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: scopeName,
      targetRef: requestId,
      reason,
      purpose: 'moodle-provision-revoke',
    });
  }

  /**
   * Why a delivered assignment no longer matches SIS state, if it does not.
   * Entitlement is re-derived from the institution's own records, so drift
   * is corrected from the SIS side — Moodle is never the source of truth.
   */
  private async driftReason(item: {
    studentId: string;
    courseRegistrationId: string | null;
    requestId: string;
  }): Promise<string | null> {
    const request = await this.prisma.moodleProvisionRequest.findUnique({
      where: { id: item.requestId },
      select: { revokedAt: true },
    });
    if (request?.revokedAt) return 'request-withdrawn';

    const student = await this.prisma.student.findUnique({
      where: { id: item.studentId },
      select: { status: true },
    });
    if (!student || student.status !== 'ACTIVE') return 'student-inactive';

    if (!item.courseRegistrationId) return null;
    const course = await this.prisma.courseRegistration.findUnique({
      where: { id: item.courseRegistrationId },
      select: { status: true, registrationId: true },
    });
    if (!course) return 'course-registration-removed';
    if (course.status !== 'ENROLLED') return 'course-dropped';
    const registration = await this.prisma.institutionalRegistration.findUnique({
      where: { id: course.registrationId },
      select: { status: true },
    });
    if (!registration || registration.status !== 'REGISTERED') return 'registration-closed';
    return null;
  }

  /**
   * Revoke one delivered item transactionally: guarded claim, audit, and an
   * outbox event that suspends the Moodle enrolment. Moodle history stays.
   */
  private async revokeDeliveredItem(
    item: { id: string; requestId: string; studentId: string },
    reason: string,
    now: Date,
    actor?: { accountId: string; activeRole: string | null; scope: string | null },
  ): Promise<boolean> {
    const claimed = await this.prisma.$transaction(async (db) => {
      const update = await db.moodleProvisionRequestItem.updateMany({
        where: { id: item.id, state: 'DELIVERED', revokedAt: null },
        data: { state: 'REVOKED', revokedAt: now, revokeReason: reason, lastCheckedAt: now },
      });
      if (update.count === 0) return false;
      await db.outboxEvent.create({
        data: {
          aggregate: 'MoodleProvisionRequestItem',
          aggregateId: item.id,
          type: 'MoodleProvisionRevoked',
          payload: json({
            eventId: randomUUID(),
            eventType: 'zm.sis.moodle.provision-revoked.v1',
            correlationId: item.requestId,
            idempotencyKey: `${item.requestId}:${item.id}:revoke`,
            payloadVersion: 1,
            deliveryStatus: 'QUEUED',
            retryPolicy: 'MOODLE-DEMO-v1',
            provisionRequestId: item.requestId,
            itemId: item.id,
            studentId: item.studentId,
            reason,
          }),
        },
      });
      // A request is withdrawn once nothing in it is still live.
      const live = await db.moodleProvisionRequestItem.count({
        where: {
          requestId: item.requestId,
          state: { in: ['WAITING', 'QUEUED', 'DELIVERED', 'FAILED'] },
        },
      });
      if (live === 0) {
        await db.moodleProvisionRequest.updateMany({
          where: { id: item.requestId, revokedAt: null },
          data: { state: 'REVOKED', revokedAt: now, revokeReason: reason },
        });
      }
      return true;
    });

    if (claimed) {
      await auditAuth(this.prisma, {
        action: 'CMD-Moodle-AccessSweep',
        outcome: 'ALLOW',
        actorAccountId: actor?.accountId ?? 'SYSTEM',
        activeRole: actor?.activeRole ?? null,
        scope: actor?.scope ?? null,
        targetRef: item.id,
        reason,
        purpose: 'moodle-access-sweep',
      });
    }
    return claimed;
  }

  /**
   * Expiry and drift sweep. Two passes:
   *  1. items whose validity policy end date has passed;
   *  2. a rotating batch of delivered items re-checked against live SIS
   *     state (student active, course enrolled, registration registered).
   * Idempotent: guarded updates mean concurrent sweeps never double-write
   * audit or outbox rows. Runs scoped (manual trigger) or system-wide.
   */
  async sweepExpiredAccess(options?: {
    allowedScopeIds?: Set<string>;
    actorAccountId?: string;
    activeRole?: string | null;
    scopeName?: string | null;
    limit?: number;
    now?: Date;
  }) {
    const now = options?.now ?? new Date();
    const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
    const scopeFilter: Prisma.MoodleProvisionRequestItemWhereInput =
      options?.allowedScopeIds
        ? { request: { scopeId: { in: [...options.allowedScopeIds] } } }
        : {};
    const actor = options?.actorAccountId
      ? {
          accountId: options.actorAccountId,
          activeRole: options.activeRole ?? null,
          scope: options.scopeName ?? null,
        }
      : undefined;

    const expired = await this.prisma.moodleProvisionRequestItem.findMany({
      where: {
        state: 'DELIVERED',
        revokedAt: null,
        validUntil: { lte: now },
        ...scopeFilter,
      },
      orderBy: { validUntil: 'asc' },
      take: limit,
      select: { id: true, requestId: true, studentId: true },
    });

    let revoked = 0;
    for (const item of expired) {
      if (await this.revokeDeliveredItem(item, 'access-period-ended', now, actor)) {
        revoked += 1;
      }
    }

    const batch = await this.prisma.moodleProvisionRequestItem.findMany({
      where: { state: 'DELIVERED', revokedAt: null, ...scopeFilter },
      orderBy: [{ lastCheckedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
      take: limit,
      select: {
        id: true,
        requestId: true,
        studentId: true,
        courseRegistrationId: true,
      },
    });

    let corrected = 0;
    for (const item of batch) {
      const reason = await this.driftReason(item);
      if (reason) {
        if (await this.revokeDeliveredItem(item, reason, now, actor)) corrected += 1;
      } else {
        await this.prisma.moodleProvisionRequestItem.update({
          where: { id: item.id },
          data: { lastCheckedAt: now },
        });
      }
    }

    if (revoked + corrected > 0) {
      this.logger.log(
        `Moodle access sweep: ${revoked} expired, ${corrected} drifted, ${batch.length} checked.`,
      );
    }
    return { expired: expired.length, checked: batch.length, revoked, corrected };
  }

  /** Manual sweep trigger: capability-checked and limited to the actor's scope. */
  async sweepExpiredAccessForActor(auth: ProvisionAuthority) {
    const access = await this.prisma.$transaction((db) => this.scopeAccess(db, auth));
    const scopeName =
      auth.scopeType && auth.scopeRef ? `${auth.scopeType}:${auth.scopeRef}` : null;
    return this.sweepExpiredAccess({
      allowedScopeIds: access.allowed,
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole ?? null,
      scopeName,
    });
  }

  async searchStudents(
    auth: ProvisionAuthority,
    filters?: {
      q?: string;
      studentNumber?: string;
      programmeId?: string;
      offeringId?: string;
      periodCode?: string;
      courseCode?: string;
      registrationState?: string;
      hasMoodleAccess?: boolean;
      limit?: number;
      cursor?: string;
    },
  ) {
    const access = await this.prisma.$transaction((db) => this.scopeAccess(db, auth));

    // Scope restriction: map scope names to programme/school/department
    // attributes. A global actor is unrestricted; anything unmapped matches
    // nothing (fail closed).
    const scopeRows = await this.prisma.scope.findMany({
      where: { id: { in: [...access.allowed] } },
      select: { name: true },
    });
    const programmeCodes: string[] = [];
    const schools: string[] = [];
    const departments: string[] = [];
    let unrestricted = false;
    for (const row of scopeRows) {
      const [kind, ...rest] = row.name.split(':');
      const value = rest.join(':');
      if (kind === 'SYSTEM') unrestricted = true;
      else if (kind === 'PROGRAMME' && value) programmeCodes.push(value);
      else if (kind === 'SCHOOL' && value) schools.push(value);
      else if (kind === 'DEPARTMENT' && value) departments.push(value);
    }
    if (!unrestricted && programmeCodes.length === 0 && schools.length === 0 && departments.length === 0) {
      return { items: [], total: 0, nextCursor: null };
    }

    const and: Prisma.StudentWhereInput[] = [{ status: 'ACTIVE' }];

    const term = filters?.q?.trim() || filters?.studentNumber?.trim();
    if (term) {
      and.push({
        OR: [
          { studentNumber: { contains: term, mode: 'insensitive' } },
          { person: { displayName: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    if (!unrestricted) {
      const programmeFilters: Prisma.ProgrammeWhereInput[] = [];
      if (programmeCodes.length) programmeFilters.push({ code: { in: programmeCodes } });
      if (schools.length) programmeFilters.push({ school: { in: schools } });
      if (departments.length) programmeFilters.push({ department: { in: departments } });
      and.push({
        attempts: {
          some: { offering: { programme: { OR: programmeFilters } } },
        },
      });
    }

    if (filters?.programmeId) {
      and.push({ attempts: { some: { offering: { programmeId: filters.programmeId } } } });
    }
    if (filters?.offeringId) {
      and.push({ attempts: { some: { offeringId: filters.offeringId } } });
    }

    // Period/course/state filters live on institutional registration, which
    // has no Prisma relation from ProgrammeAttempt; resolve attempt ids first.
    if (filters?.periodCode || filters?.courseCode || filters?.registrationState) {
      const period = filters.periodCode
        ? await this.prisma.academicPeriod.findUnique({
            where: { code: filters.periodCode },
            select: { id: true },
          })
        : null;
      if (filters.periodCode && !period) {
        return { items: [], total: 0, nextCursor: null };
      }
      const registrations = await this.prisma.institutionalRegistration.findMany({
        where: {
          ...(period ? { periodId: period.id } : {}),
          status: filters.registrationState ?? 'REGISTERED',
          ...(filters.courseCode
            ? {
                roster: {
                  some: {
                    status: 'ENROLLED',
                    course: { code: filters.courseCode },
                  },
                },
              }
            : {}),
        },
        select: { attemptId: true },
      });
      const attemptIds = [...new Set(registrations.map((r) => r.attemptId))];
      if (attemptIds.length === 0) return { items: [], total: 0, nextCursor: null };
      and.push({ attempts: { some: { id: { in: attemptIds } } } });
    }

    if (filters?.hasMoodleAccess === true) {
      and.push({ moodleProvisionItems: { some: { state: 'DELIVERED' } } });
    } else if (filters?.hasMoodleAccess === false) {
      and.push({ moodleProvisionItems: { none: { state: 'DELIVERED' } } });
    }

    const where: Prisma.StudentWhereInput = { AND: and };
    const limit = Math.min(Math.max(filters?.limit ?? 25, 1), 100);
    const [students, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        select: {
          id: true,
          studentNumber: true,
          status: true,
          person: { select: { displayName: true } },
          attempts: {
            where: { status: { in: ['ADMITTED', 'ACTIVE'] } },
            select: {
              id: true,
              offering: {
                select: {
                  id: true,
                  intake: true,
                  studyMode: true,
                  campus: true,
                  programme: { select: { code: true, name: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { studentNumber: 'asc' },
        take: limit + 1,
        ...(filters?.cursor
          ? { cursor: { id: filters.cursor }, skip: 1 }
          : {}),
      }),
      this.prisma.student.count({ where }),
    ]);

    const page = students.slice(0, limit);
    const nextCursor = students.length > limit ? page[page.length - 1]!.id : null;

    const attemptIds = page
      .map((s) => s.attempts[0]?.id)
      .filter((id): id is string => Boolean(id));
    const registrations = attemptIds.length
      ? await this.prisma.institutionalRegistration.findMany({
          where: { attemptId: { in: attemptIds }, status: 'REGISTERED' },
          select: {
            attemptId: true,
            periodId: true,
            roster: {
              where: { status: 'ENROLLED' },
              select: {
                id: true,
                courseId: true,
                status: true,
                course: { select: { code: true, title: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const latestByAttempt = new Map<string, (typeof registrations)[number]>();
    for (const reg of registrations) {
      if (!latestByAttempt.has(reg.attemptId)) latestByAttempt.set(reg.attemptId, reg);
    }
    const periodIds = [...new Set(registrations.map((r) => r.periodId))];
    const periods = periodIds.length
      ? await this.prisma.academicPeriod.findMany({
          where: { id: { in: periodIds } },
          select: { id: true, code: true },
        })
      : [];
    const periodCode = new Map(periods.map((p) => [p.id, p.code]));

    const courseIds = registrations.flatMap((r) => r.roster.map((c) => c.id));
    const provisionItems = courseIds.length
      ? await this.prisma.moodleProvisionRequestItem.findMany({
          where: { courseRegistrationId: { in: courseIds } },
          select: { courseRegistrationId: true, state: true, validUntil: true, revokedAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const moodleStateByCourse = new Map<string, string>();
    for (const item of provisionItems) {
      if (!item.courseRegistrationId) continue;
      if (!moodleStateByCourse.has(item.courseRegistrationId)) {
        moodleStateByCourse.set(item.courseRegistrationId, item.state);
      }
    }

    await auditAuth(this.prisma, {
      action: 'QRY-Moodle-StudentSearch',
      outcome: 'ALLOW',
      actorAccountId: auth.accountId,
      activeRole: auth.activeRole,
      scope: auth.scope ?? null,
      purpose: 'moodle-student-search',
    });

    return {
      items: page.map((s) => {
        const attempt = s.attempts[0];
        const reg = attempt ? latestByAttempt.get(attempt.id) : undefined;
        return {
          studentId: s.id,
          studentNumber: s.studentNumber,
          displayName: s.person.displayName,
          status: s.status,
          programmeCode: attempt?.offering?.programme?.code ?? null,
          programmeName: attempt?.offering?.programme?.name ?? null,
          periodCodes: reg ? [periodCode.get(reg.periodId) ?? reg.periodId] : [],
          courses: (reg?.roster ?? []).map((c) => ({
            courseRegistrationId: c.id,
            courseId: c.courseId,
            courseCode: c.course.code,
            courseTitle: c.course.title,
            state: c.status,
            moodleState: moodleStateByCourse.get(c.id) ?? null,
          })),
          currentAttempt: attempt?.offering
            ? {
                offeringId: attempt.offering.id,
                intake: attempt.offering.intake,
                studyMode: attempt.offering.studyMode,
                campus: attempt.offering.campus,
              }
            : null,
        };
      }),
      total,
      nextCursor,
    };
  }
}
