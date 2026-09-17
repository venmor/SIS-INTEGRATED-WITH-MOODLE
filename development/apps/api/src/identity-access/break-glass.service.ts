import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import type { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service.js';
import { ConfigurationService } from './configuration.service.js';
import { auditAuth } from './audit.js';
import { randomUUID } from 'crypto';
import type { BreakGlassDto, BreakGlassOutcome } from './dto.js';

export interface BreakGlassActor {
  accountId: string;
  activeRole: string | null;
  scope: string | null;
}

export interface BreakGlassReceipt {
  breakGlassId: string;
  assignmentId: string;
  expiresAt: Date;
  message: string;
  reference: string;
  replay: boolean;
}

// Emergency access (slice 5, handbook §15.20/§12.11, REQ-SUP-005): minimal
// (one SYSADMIN assignment scoped to the incident), time-bound
// (security.breakGlassMaxMinutes demo cap), reasoned, approver-gated (live
// approver role, never self), idempotent per incident+requestor
// (server-derived key, claim/replay receipts), enhanced-audited
// (CMD-IAM-BreakGlass, purpose emergency-access, incident metadata) with a
// delivered BreakGlassGranted outbox event. Expiry ends it completely — the
// daemon revokes bound sessions and marks the request expired.
@Injectable()
export class BreakGlassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigurationService,
  ) {}

  private keyOf(requestorId: string, incidentRef: string): string {
    return `breakglass:${requestorId}:${incidentRef}`;
  }

  private async deny(
    actor: BreakGlassActor,
    reason: string,
    targetRef: string | undefined,
    metadata: Prisma.InputJsonObject,
    forbidden: boolean,
  ): Promise<never> {
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-BreakGlass',
      outcome: 'DENY',
      actorAccountId: actor.accountId,
      activeRole: actor.activeRole,
      scope: actor.scope,
      targetRef,
      reason,
      errorCategory: 'ERR-SEC',
      purpose: 'emergency-access',
      metadata,
    });
    const body = {
      message: AUTH_MESSAGES.grantDenied.text,
      reference: correlationId,
    };
    throw forbidden
      ? new ForbiddenException(body)
      : new BadRequestException(body);
  }

  async requestBreakGlass(
    actor: BreakGlassActor,
    dto: BreakGlassDto,
  ): Promise<BreakGlassReceipt> {
    const meta = {
      incidentRef: dto.incidentRef,
      scope: dto.scope,
      approverId: dto.approverId,
    };
    if (dto.approverId === actor.accountId) {
      await this.deny(
        actor,
        'break-glass-self-approval',
        undefined,
        meta,
        false,
      );
    }

    const maxMinutes = await this.config.getOrThrow<number>(
      'security.breakGlassMaxMinutes',
    );
    if (dto.durationMinutes > maxMinutes) {
      await this.deny(
        actor,
        'break-glass-duration-exceeded',
        undefined,
        { ...meta, maxMinutes },
        false,
      );
    }

    // Approver must be a real account holding a live approver role. Unknown
    // and unauthorized approvers share one refusal (no account oracle).
    const approverRoles = await this.config.getOrThrow<string[]>(
      'security.breakGlass.approverRoles',
    );
    const approverLive = await this.prisma.roleAssignment.findMany({
      where: {
        accountId: dto.approverId,
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { role: true },
    });
    if (!approverLive.some((a) => approverRoles.includes(a.role))) {
      await this.deny(
        actor,
        'break-glass-approver-forbidden',
        undefined,
        meta,
        true,
      );
    }

    // Idempotency: server-derived key from incident+requestor (packet source
    // map). A completed receipt replays; a fresh in-flight claim waits.
    const key = this.keyOf(actor.accountId, dto.incidentRef);
    const prior = await this.prisma.idempotencyKey.findUnique({
      where: { key },
    });
    if (prior) {
      if (
        prior.accountId !== actor.accountId ||
        prior.action !== 'CMD-IAM-BreakGlass'
      ) {
        await this.deny(
          actor,
          'idempotency-key-mismatch',
          undefined,
          meta,
          false,
        );
      }
      if (prior.status === 201) {
        const receipt = prior.response as unknown as {
          breakGlassId: string;
          assignmentId: string;
          expiresAt: string;
        };
        const { correlationId } = await auditAuth(this.prisma, {
          action: 'CMD-IAM-BreakGlass',
          outcome: 'ALLOW',
          actorAccountId: actor.accountId,
          activeRole: actor.activeRole,
          scope: actor.scope,
          targetRef: receipt.assignmentId,
          reason: 'idempotent-replay',
          purpose: 'emergency-access',
          idempotencyRef: key,
          newState: {
            breakGlassId: receipt.breakGlassId,
            assignmentId: receipt.assignmentId,
          },
          metadata: { ...meta, durationMinutes: dto.durationMinutes },
        });
        return {
          breakGlassId: receipt.breakGlassId,
          assignmentId: receipt.assignmentId,
          expiresAt: new Date(receipt.expiresAt),
          message: AUTH_MESSAGES.breakGlassGranted.text,
          reference: correlationId,
          replay: true,
        };
      }
      const ageMs = Date.now() - prior.createdAt.getTime();
      if (ageMs <= 15 * 60 * 1000) {
        const { correlationId } = await auditAuth(this.prisma, {
          action: 'CMD-IAM-BreakGlass',
          outcome: 'DENY',
          actorAccountId: actor.accountId,
          reason: 'idempotent-in-flight',
          errorCategory: 'ERR-SEC',
          purpose: 'emergency-access',
          idempotencyRef: key,
        });
        throw new ConflictException({
          message: AUTH_MESSAGES.grantDenied.text,
          reference: correlationId,
        });
      }
      await this.prisma.idempotencyKey.delete({ where: { key } });
    }
    try {
      await this.prisma.idempotencyKey.create({
        data: {
          key,
          accountId: actor.accountId,
          action: 'CMD-IAM-BreakGlass',
          status: 0,
          response: {},
        },
      });
    } catch {
      const winner = await this.prisma.idempotencyKey.findUnique({
        where: { key },
      });
      if (
        winner &&
        winner.status === 201 &&
        winner.accountId === actor.accountId
      ) {
        const receipt = winner.response as unknown as {
          breakGlassId: string;
          assignmentId: string;
          expiresAt: string;
        };
        const { correlationId } = await auditAuth(this.prisma, {
          action: 'CMD-IAM-BreakGlass',
          outcome: 'ALLOW',
          actorAccountId: actor.accountId,
          targetRef: receipt.assignmentId,
          reason: 'idempotent-replay',
          purpose: 'emergency-access',
          idempotencyRef: key,
        });
        return {
          breakGlassId: receipt.breakGlassId,
          assignmentId: receipt.assignmentId,
          expiresAt: new Date(receipt.expiresAt),
          message: AUTH_MESSAGES.breakGlassGranted.text,
          reference: correlationId,
          replay: true,
        };
      }
      await this.deny(actor, 'idempotent-in-flight', undefined, meta, false);
    }

    const now = new Date();
    const correlationId = randomUUID();
    const expiresAt = new Date(now.getTime() + dto.durationMinutes * 60 * 1000);

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.breakGlassRequest.create({
        data: {
          requestorId: actor.accountId,
          incidentRef: dto.incidentRef,
          reason: dto.reason,
          scope: dto.scope,
          durationMinutes: dto.durationMinutes,
          approverId: dto.approverId,
          status: 'active',
          expiresAt,
        },
      });

      // Grant the minimal capability: SYSADMIN scoped to the incident only.
      const assignment = await tx.roleAssignment.create({
        data: {
          accountId: actor.accountId,
          role: 'SYSADMIN',
          scopeType: 'BREAK_GLASS',
          scopeRef: dto.incidentRef,
          startsAt: now,
          endsAt: expiresAt,
          grantedById: dto.approverId,
          reason: `Break-glass request ${request.id}: ${dto.reason}`,
        },
      });

      await tx.auditEvent.create({
        data: {
          occurredAt: now,
          actorAccountId: actor.accountId,
          activeRole: actor.activeRole,
          scope: actor.scope,
          action: 'CMD-IAM-BreakGlass',
          targetRef: assignment.id,
          outcome: 'ALLOW',
          reason: dto.reason,
          purpose: 'emergency-access',
          correlationId,
          newState: {
            breakGlassId: request.id,
            assignmentId: assignment.id,
            incidentRef: dto.incidentRef,
            expiresAt,
          },
          metadata: {
            breakGlassId: request.id,
            incidentRef: dto.incidentRef,
            durationMinutes: dto.durationMinutes,
            scope: dto.scope,
            approverId: dto.approverId,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregate: 'RoleAssignment',
          aggregateId: assignment.id,
          type: 'BreakGlassGranted',
          payload: {
            assignmentId: assignment.id,
            breakGlassId: request.id,
            incidentRef: dto.incidentRef,
            expiresAt,
          },
          deliveredAt: now,
        },
      });

      // The receipt commits atomically with the grant: no crash window can
      // leave completed work parked as in-flight.
      await tx.idempotencyKey.update({
        where: { key },
        data: {
          status: 201,
          response: {
            breakGlassId: request.id,
            assignmentId: assignment.id,
            expiresAt: expiresAt.toISOString(),
            message: AUTH_MESSAGES.breakGlassGranted.text,
          } as Prisma.InputJsonValue,
        },
      });

      return { request, assignment };
    });

    const receipt = {
      breakGlassId: created.request.id,
      assignmentId: created.assignment.id,
      expiresAt: expiresAt.toISOString(),
      message: AUTH_MESSAGES.breakGlassGranted.text,
    };

    return { ...receipt, expiresAt, reference: correlationId, replay: false };
  }

  // Post-use review (§15.20 "reviewed", TEST-AUTH-011 shape): closes the
  // incident audit chain. Reviewer must hold a live grantor role and must
  // not be the requestor (no self-review, mirroring approver ≠ requestor).
  // Exactly one review lands (conditional claim); full retrospective UI
  // stays a hardening-slice concern per the packet.
  async reviewBreakGlass(
    actor: BreakGlassActor,
    requestId: string,
    outcome: BreakGlassOutcome,
    note: string,
  ) {
    const grantorRoles = await this.config.getOrThrow<string[]>(
      'security.grantorRoles',
    );
    const live = await this.prisma.roleAssignment.findMany({
      where: {
        accountId: actor.accountId,
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { role: true },
    });
    const request = await this.prisma.breakGlassRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-BreakGlass',
        outcome: 'DENY',
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole,
        scope: actor.scope,
        targetRef: requestId,
        reason: 'break-glass-not-found',
        errorCategory: 'ERR-SEC',
        purpose: 'emergency-access',
      });
      throw new NotFoundException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }
    if (
      !live.some((a) => grantorRoles.includes(a.role)) ||
      actor.accountId === request.requestorId
    ) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-BreakGlass',
        outcome: 'DENY',
        actorAccountId: actor.accountId,
        activeRole: actor.activeRole,
        scope: actor.scope,
        targetRef: requestId,
        reason: 'break-glass-review-forbidden',
        errorCategory: 'ERR-SEC',
        purpose: 'emergency-access',
      });
      throw new ForbiddenException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    const now = new Date();
    const correlationId = randomUUID();
    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.breakGlassRequest.updateMany({
        where: { id: requestId, reviewedAt: null },
        data: {
          reviewedAt: now,
          reviewedBy: actor.accountId,
          reviewOutcome: outcome,
          reviewNote: note,
        },
      });
      if (claimed.count === 0) {
        const { correlationId: raceRef } = await auditAuth(this.prisma, {
          action: 'CMD-IAM-BreakGlass',
          outcome: 'DENY',
          actorAccountId: actor.accountId,
          targetRef: requestId,
          reason: 'break-glass-already-reviewed',
          errorCategory: 'ERR-SEC',
          purpose: 'emergency-access',
        });
        throw new ConflictException({
          message: AUTH_MESSAGES.grantDenied.text,
          reference: raceRef,
        });
      }
      await tx.auditEvent.create({
        data: {
          occurredAt: now,
          actorAccountId: actor.accountId,
          activeRole: actor.activeRole,
          scope: actor.scope,
          action: 'CMD-IAM-BreakGlass',
          targetRef: requestId,
          outcome: 'ALLOW',
          reason: 'post-use-reviewed',
          purpose: 'emergency-access',
          correlationId,
          priorState: { breakGlassId: requestId, reviewedAt: null },
          newState: {
            breakGlassId: requestId,
            reviewedAt: now,
            reviewOutcome: outcome,
          },
          metadata: {
            breakGlassId: requestId,
            incidentRef: request.incidentRef,
            outcome,
          },
        },
      });
      await tx.outboxEvent.create({
        data: {
          aggregate: 'BreakGlassRequest',
          aggregateId: requestId,
          type: 'BreakGlassReviewed',
          payload: {
            breakGlassId: requestId,
            incidentRef: request.incidentRef,
            outcome,
          },
          deliveredAt: now,
        },
      });
      return tx.breakGlassRequest.findUniqueOrThrow({
        where: { id: requestId },
      });
    });

    return {
      breakGlassId: updated.id,
      reviewOutcome: updated.reviewOutcome,
      message: AUTH_MESSAGES.breakGlassReviewed.text,
      reference: correlationId,
    };
  }
}
