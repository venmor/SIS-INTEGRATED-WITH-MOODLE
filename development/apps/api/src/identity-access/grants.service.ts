import { Injectable, Logger } from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import { PrismaService } from './prisma.service.js';
import { auditAuth } from './audit.js';
import { accountStatusPolicy, evaluatePolicy } from './policy.service.js';
import { ConfigurationService } from './configuration.service.js';
import { WorkspaceService } from './workspace.service.js';
import { createReviewSchedule, planReviewSchedule } from './review-schedule.js';
import type { GrantRoleDto } from './dto.js';

// ACT-IAM-001 grants (slices 3-4). Authority rule: the grantor must act under
// a live grantor-role workspace (demo mapping of the IAM Administrator,
// SECURITY-v1 grantorRoles — the handbook names the role, never a person).
// High-impact hardening (slice 4): §15.21 policy evaluation, mandatory
// approver (real account, never the target), idempotency keys with stored
// receipts, same-transaction outbox events, prior/new audit refs, purpose.
// High-risk self-assignment is denied; unknown users get the neutral reply.
@Injectable()
export class GrantsService {
  private readonly logger = new Logger(GrantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspaceService,
    private readonly config: ConfigurationService,
  ) {}

  private async deny(
    grantor: {
      accountId: string;
      activeRole: string | null;
      activeScope: string | null;
    },
    reason: string,
    targetRef?: string,
    forbidden = false,
    purpose?: string,
    idempotencyKey?: string,
  ) {
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-GrantRole',
      outcome: 'DENY',
      actorAccountId: grantor.accountId,
      activeRole: grantor.activeRole,
      scope: grantor.activeScope,
      targetRef,
      reason,
      errorCategory: 'ERR-SEC',
      purpose: purpose ?? null,
      idempotencyRef: idempotencyKey ?? null,
    });
    return {
      ok: false as const,
      forbidden,
      message: AUTH_MESSAGES.grantDenied.text,
      reference: correlationId,
    };
  }

  async grant(
    dto: GrantRoleDto,
    grantor: {
      accountId: string;
      activeRole: string | null;
      activeScope: string | null;
    },
  ) {
    // Idempotency first: claim the key row (status 0 = in-flight) so
    // concurrent double-submits converge; the loser replays the winner's
    // receipt instead of double-creating (UI-SUBMIT-001 + 19.41).
    if (dto.idempotencyKey) {
      const prior = await this.prisma.idempotencyKey.findUnique({
        where: { key: dto.idempotencyKey },
      });
      if (prior) {
        if (
          prior.accountId !== grantor.accountId ||
          prior.action !== 'CMD-IAM-GrantRole'
        ) {
          return this.deny(
            grantor,
            'idempotency-key-mismatch',
            undefined,
            false,
            dto.reason,
            dto.idempotencyKey,
          );
        }
        if (prior.status === 201) {
          const receipt = prior.response as {
            assignmentId: string;
            message: string;
          };
          const { correlationId } = await auditAuth(this.prisma, {
            action: 'CMD-IAM-GrantRole',
            outcome: 'ALLOW',
            actorAccountId: grantor.accountId,
            activeRole: grantor.activeRole,
            scope: grantor.activeScope,
            targetRef: receipt.assignmentId,
            reason: 'idempotent-replay',
            purpose: dto.reason,
            idempotencyRef: dto.idempotencyKey ?? null,
            priorState: null,
            newState: { assignmentId: receipt.assignmentId },
          });
          return {
            ok: true as const,
            assignmentId: receipt.assignmentId,
            message: receipt.message,
            reference: correlationId,
            replay: true as const,
          };
        }
        // Pending claim: a crashed first attempt leaves status 0 behind.
        // Claims older than 15 minutes are taken over; fresh ones wait.
        const ageMs = Date.now() - prior.createdAt.getTime();
        if (ageMs <= 15 * 60 * 1000) {
          return this.deny(
            grantor,
            'idempotent-in-flight',
            undefined,
            false,
            dto.reason,
            dto.idempotencyKey,
          );
        }
        await this.prisma.idempotencyKey.delete({
          where: { key: dto.idempotencyKey },
        });
      }
      try {
        await this.prisma.idempotencyKey.create({
          data: {
            key: dto.idempotencyKey,
            accountId: grantor.accountId,
            action: 'CMD-IAM-GrantRole',
            status: 0,
            response: {},
          },
        });
      } catch {
        // Lost the claim race: re-read the winner's row and replay it.
        const winner = await this.prisma.idempotencyKey.findUnique({
          where: { key: dto.idempotencyKey as string },
        });
        if (
          winner &&
          winner.status === 201 &&
          winner.accountId === grantor.accountId
        ) {
          const receipt = winner.response as {
            assignmentId: string;
            message: string;
          };
          const { correlationId } = await auditAuth(this.prisma, {
            action: 'CMD-IAM-GrantRole',
            outcome: 'ALLOW',
            actorAccountId: grantor.accountId,
            activeRole: grantor.activeRole,
            scope: grantor.activeScope,
            targetRef: receipt.assignmentId,
            reason: 'idempotent-replay',
            purpose: dto.reason,
            idempotencyRef: dto.idempotencyKey ?? null,
            priorState: null,
            newState: { assignmentId: receipt.assignmentId },
          });
          return {
            ok: true as const,
            assignmentId: receipt.assignmentId,
            message: receipt.message,
            reference: correlationId,
            replay: true as const,
          };
        }
        return this.deny(
          grantor,
          'idempotent-in-flight',
          undefined,
          false,
          dto.reason,
          dto.idempotencyKey,
        );
      }
    }
    // §15.21 central decision (verb, SoD, self-approval, approver presence).
    const actorRoles = (
      await this.workspaces.liveWorkspaces(grantor.accountId)
    ).map((w) => w.role);
    const decision = evaluatePolicy({
      action: 'iam.grant.create',
      activeRole: grantor.activeRole,
      scope: grantor.activeScope,
      assignmentLive: grantor.activeRole !== null,
      actorRoles,
      approverAccountId: dto.approverId ?? null,
      targetAccountId: null,
      approverRequired: true,
    });
    if (!decision.allow) {
      return this.deny(
        grantor,
        decision.reason ?? 'policy-denied',
        undefined,
        decision.reason === 'verb-denied',
        dto.reason,
        dto.idempotencyKey,
      );
    }
    const target = await this.prisma.account.findUnique({
      where: { username: dto.username },
    });
    if (!target || !accountStatusPolicy(target.status).allow) {
      return this.deny(
        grantor,
        'unknown-or-inactive-account',
        dto.username,
        false,
        dto.reason,
        dto.idempotencyKey,
      );
    }
    if (target.id === grantor.accountId) {
      return this.deny(
        grantor,
        'self-assignment-denied',
        target.username,
        true,
        dto.reason,
        dto.idempotencyKey,
      );
    }
    // Approver must be a real account and never the target (self-approval
    // ban); approver scope-authority has no registry (GAP-006).
    const approver = await this.prisma.account.findUnique({
      where: { id: dto.approverId },
    });
    if (!approver) {
      return this.deny(
        grantor,
        'approver-unknown',
        target.username,
        false,
        dto.reason,
        dto.idempotencyKey,
      );
    }
    if (approver.id === target.id) {
      return this.deny(
        grantor,
        'self-approval',
        target.username,
        true,
        dto.reason,
        dto.idempotencyKey,
      );
    }
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (
      Number.isNaN(startsAt.getTime()) ||
      (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt))
    ) {
      return this.deny(
        grantor,
        'invalid-effective-period',
        target.username,
        false,
        dto.reason,
        dto.idempotencyKey,
      );
    }
    const overlap = await this.prisma.roleAssignment.findFirst({
      where: {
        accountId: target.id,
        role: dto.role,
        scopeType: dto.scopeType,
        scopeRef: dto.scopeRef,
        revokedAt: null,
        startsAt: { lte: endsAt ?? new Date(8640000000000000) },
        OR: [{ endsAt: null }, { endsAt: { gte: startsAt } }],
      },
    });
    if (overlap) {
      return this.deny(
        grantor,
        'duplicate-or-overlap',
        target.username,
        false,
        dto.reason,
        dto.idempotencyKey,
      );
    }
    // Same transaction: assignment row + outbox events (architecture §18.7).
    // Single-step demo mapping: an authorized admin's grant is request and
    // approval in one act (approver recorded); multi-step approval workflow
    // is a later slice. Expiry scheduling rides the outbox (daemon: slice 5).
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.roleAssignment.create({
        data: {
          accountId: target.id,
          role: dto.role,
          scopeType: dto.scopeType,
          scopeRef: dto.scopeRef,
          startsAt,
          endsAt,
          grantedById: grantor.accountId,
          appointmentRef: dto.appointmentRef,
          authoritySource: dto.authoritySource,
          capabilities: dto.capabilities ?? [],
          employmentType: dto.employmentType,
          delegationLimit: dto.delegationLimit,
          approverId: dto.approverId,
          reason: dto.reason,
        },
      });
      const occurredAt = new Date();
      // §12.9 lifecycle: single-step demo grants request and approve in one
      // authorized act, so Requested/Approved share the grant timestamp.
      await tx.outboxEvent.create({
        data: {
          aggregate: 'RoleAssignment',
          aggregateId: row.id,
          type: 'RoleAssignmentRequested',
          payload: {
            assignmentId: row.id,
            accountId: target.id,
            actorAccountId: grantor.accountId,
          },
          occurredAt,
        },
      });
      await tx.outboxEvent.create({
        data: {
          aggregate: 'RoleAssignment',
          aggregateId: row.id,
          type: 'RoleAssignmentApproved',
          payload: {
            assignmentId: row.id,
            approverId: dto.approverId,
            actorAccountId: grantor.accountId,
          },
          occurredAt,
        },
      });
      await tx.outboxEvent.create({
        data: {
          aggregate: 'RoleAssignment',
          aggregateId: row.id,
          type: 'RoleAssignmentActivated',
          payload: {
            assignmentId: row.id,
            accountId: target.id,
            role: row.role,
            scopeType: row.scopeType,
            scopeRef: row.scopeRef,
            actorAccountId: grantor.accountId,
          },
          occurredAt,
        },
      });
      if (endsAt) {
        await tx.outboxEvent.create({
          data: {
            aggregate: 'RoleAssignment',
            aggregateId: row.id,
            type: 'RoleAssignmentExpiryScheduled',
            payload: { assignmentId: row.id, runAt: endsAt.toISOString() },
            occurredAt,
          },
        });
      }
      // §12.12 journey: every grant joins the access-review schedules.
      // Scheduling never breaks the grant: config failure only logs.
      try {
        const risks = await this.config.getOrThrow<Record<string, string>>(
          'security.roleRiskLevels',
        );
        const cadences = await this.config.getMany<number>([
          'security.reviewCadence.high',
          'security.reviewCadence.medium',
          'security.reviewCadence.low',
        ]);
        const plan = planReviewSchedule(
          row.role,
          risks,
          {
            high: cadences['security.reviewCadence.high'] ?? 30,
            medium: cadences['security.reviewCadence.medium'] ?? 90,
            low: cadences['security.reviewCadence.low'] ?? 180,
          },
          occurredAt,
        );
        await createReviewSchedule(tx, plan, row.id, grantor.accountId);
      } catch (error) {
        this.logger.error(
          `Review schedule skipped for assignment ${row.id}`,
          error,
        );
      }
      return row;
    });
    const newState = {
      assignmentId: created.id,
      role: created.role,
      scopeType: created.scopeType,
      scopeRef: created.scopeRef,
    };
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-GrantRole',
      outcome: 'ALLOW',
      actorAccountId: grantor.accountId,
      activeRole: grantor.activeRole,
      scope: grantor.activeScope,
      targetRef: created.id,
      reason: 'role-assigned',
      purpose: dto.reason,
      idempotencyRef: dto.idempotencyKey ?? null,
      priorState: null,
      newState,
    });
    // Receipt carries ref/date/type/status/next per §14.17:351-359 —
    // assignmentId + message + type + occurredAt (+ reference per replay).
    const receipt = {
      assignmentId: created.id,
      message: AUTH_MESSAGES.grantCreated.text,
      type: 'CMD-IAM-GrantRole',
      occurredAt: new Date().toISOString(),
    };
    if (dto.idempotencyKey) {
      await this.prisma.idempotencyKey.update({
        where: { key: dto.idempotencyKey },
        data: { status: 201, response: receipt },
      });
    }
    return {
      ok: true as const,
      ...receipt,
      reference: correlationId,
      replay: false as const,
    };
  }

  /**
   * Grantor-only exact-username resolve (§12.9 minimized search, §15.19).
   * Authority is checked BEFORE any lookup so non-grantors get a uniform
   * denial with no existence oracle. Returns username + displayName only —
   * never academic/finance/support content, never contact details.
   */
  async resolveTarget(
    username: string,
    grantor: {
      accountId: string;
      activeRole: string | null;
      activeScope: string | null;
    },
  ) {
    const actorRoles = (
      await this.workspaces.liveWorkspaces(grantor.accountId)
    ).map((w) => w.role);
    const decision = evaluatePolicy({
      action: 'iam.account.resolve',
      activeRole: grantor.activeRole,
      scope: grantor.activeScope,
      assignmentLive: grantor.activeRole !== null,
      actorRoles,
    });
    if (!decision.allow) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ResolveGrantTarget',
        outcome: 'DENY',
        actorAccountId: grantor.accountId,
        activeRole: grantor.activeRole,
        scope: grantor.activeScope,
        reason: decision.reason ?? 'policy-denied',
        errorCategory: 'ERR-SEC',
        purpose: 'grant-target-resolution',
      });
      return {
        ok: false as const,
        status: 403,
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      };
    }
    // REQ-NFR-005: select only the required fields — never the full row.
    const target = await this.prisma.account.findUnique({
      where: { username },
      select: {
        username: true,
        status: true,
        person: { select: { displayName: true } },
      },
    });
    if (!target || !accountStatusPolicy(target.status).allow) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ResolveGrantTarget',
        outcome: 'DENY',
        actorAccountId: grantor.accountId,
        activeRole: grantor.activeRole,
        scope: grantor.activeScope,
        targetRef: username,
        reason: 'unknown-or-inactive-account',
        purpose: 'grant-target-resolution',
      });
      // Scoped empty state for authorized grantors (UI-EMPTY-001 permission
      // variant), never failure wording.
      return {
        ok: false as const,
        status: 404,
        message: AUTH_MESSAGES.scopedEmpty.text,
        reference: correlationId,
      };
    }
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-ResolveGrantTarget',
      outcome: 'ALLOW',
      actorAccountId: grantor.accountId,
      activeRole: grantor.activeRole,
      scope: grantor.activeScope,
      targetRef: username,
      reason: 'grant-target-resolved',
      purpose: 'grant-target-resolution',
    });
    return {
      ok: true as const,
      username: target.username,
      displayName: target.person.displayName,
      reference: correlationId,
    };
  }
}
