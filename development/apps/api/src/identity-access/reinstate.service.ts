import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import { PrismaService } from './prisma.service.js';
import { ConfigurationService } from './configuration.service.js';
import { auditAuth } from './audit.js';
import { createReviewSchedule, planReviewSchedule } from './review-schedule.js';
import { validReceipt } from './idempotency.js';
import { randomUUID } from 'crypto';

// Controlled reinstatement (slice 5, handbook §12.13: reason + evidence +
// audit, never history edit). Only live IAM grantors (security.grantorRoles)
// may reinstate, and only revoked-but-unlapsed assignments qualify (lapsed
// authority is never resurrected — re-grant instead). The prior row stays
// revoked; a new live row carries the authority forward with prior/new audit
// refs (CMD-IAM-ReinstateAssignment) and a delivered outbox event.
// Idempotent per prior assignment (server key, claim/replay receipts).
@Injectable()
export class ReinstateService {
  private readonly logger = new Logger(ReinstateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigurationService,
  ) {}

  async reinstateAssignment(
    actorId: string,
    assignmentId: string,
    reason: string,
    evidence: string,
  ) {
    const grantorRoles = await this.config.getOrThrow<string[]>(
      'security.grantorRoles',
    );
    const live = await this.prisma.roleAssignment.findMany({
      where: {
        accountId: actorId,
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { role: true },
    });
    if (!live.some((a) => grantorRoles.includes(a.role))) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReinstateAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: assignmentId,
        reason: 'reinstate-forbidden',
        errorCategory: 'ERR-SEC',
      });
      throw new ForbiddenException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    // Idempotency first: server-derived key on the prior assignment. A
    // completed receipt replays (same new row, fresh reference); a fresh
    // in-flight claim waits; a stale claim is taken over.
    const key = `reinstate:${assignmentId}`;
    const priorKey = await this.prisma.idempotencyKey.findUnique({
      where: { key },
    });
    if (priorKey) {
      if (
        priorKey.accountId !== actorId ||
        priorKey.action !== 'CMD-IAM-ReinstateAssignment'
      ) {
        const { correlationId } = await auditAuth(this.prisma, {
          action: 'CMD-IAM-ReinstateAssignment',
          outcome: 'DENY',
          actorAccountId: actorId,
          targetRef: assignmentId,
          reason: 'idempotency-key-mismatch',
          errorCategory: 'ERR-SEC',
          idempotencyRef: key,
        });
        throw new BadRequestException({
          message: AUTH_MESSAGES.grantDenied.text,
          reference: correlationId,
        });
      }
      if (
        priorKey.status === 201 &&
        validReceipt(priorKey.response, ['assignmentId'])
      ) {
        const receipt = priorKey.response as unknown as {
          assignmentId: string;
        };
        const { correlationId } = await auditAuth(this.prisma, {
          action: 'CMD-IAM-ReinstateAssignment',
          outcome: 'ALLOW',
          actorAccountId: actorId,
          targetRef: receipt.assignmentId,
          reason: 'idempotent-replay',
          purpose: 'access-reinstatement',
          idempotencyRef: key,
          newState: { assignmentId: receipt.assignmentId },
        });
        return {
          assignmentId: receipt.assignmentId,
          message: AUTH_MESSAGES.reinstated.text,
          reference: correlationId,
          replay: true,
        };
      }
      const ageMs = Date.now() - priorKey.createdAt.getTime();
      if (ageMs <= 15 * 60 * 1000) {
        const { correlationId } = await auditAuth(this.prisma, {
          action: 'CMD-IAM-ReinstateAssignment',
          outcome: 'DENY',
          actorAccountId: actorId,
          targetRef: assignmentId,
          reason: 'idempotent-in-flight',
          errorCategory: 'ERR-SEC',
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
          accountId: actorId,
          action: 'CMD-IAM-ReinstateAssignment',
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
        winner.accountId === actorId &&
        validReceipt(winner.response, ['assignmentId'])
      ) {
        const receipt = winner.response as unknown as { assignmentId: string };
        const { correlationId } = await auditAuth(this.prisma, {
          action: 'CMD-IAM-ReinstateAssignment',
          outcome: 'ALLOW',
          actorAccountId: actorId,
          targetRef: receipt.assignmentId,
          reason: 'idempotent-replay',
          purpose: 'access-reinstatement',
          idempotencyRef: key,
        });
        return {
          assignmentId: receipt.assignmentId,
          message: AUTH_MESSAGES.reinstated.text,
          reference: correlationId,
          replay: true,
        };
      }
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReinstateAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: assignmentId,
        reason: 'idempotent-in-flight',
        errorCategory: 'ERR-SEC',
        idempotencyRef: key,
      });
      throw new ConflictException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    const prior = await this.prisma.roleAssignment.findUnique({
      where: { id: assignmentId },
    });

    // Terminal failures release the claim (no work done, nothing to replay):
    // a parked status-0 row would otherwise poison retries for 15 minutes.
    if (!prior) {
      await this.prisma.idempotencyKey.delete({ where: { key } });
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReinstateAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: assignmentId,
        reason: 'reinstate-not-found',
        errorCategory: 'ERR-SEC',
      });
      throw new NotFoundException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    if (!prior.revokedAt) {
      await this.prisma.idempotencyKey.delete({ where: { key } });
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReinstateAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: assignmentId,
        reason: 'reinstate-not-revoked',
        errorCategory: 'ERR-SEC',
      });
      throw new BadRequestException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    // Lapsed authority is never resurrected: a past end date means the basis
    // is gone — re-grant instead. Otherwise the new row would be born dead
    // and instantly re-revoked by the daemon.
    if (prior.endsAt && prior.endsAt.getTime() <= Date.now()) {
      await this.prisma.idempotencyKey.delete({ where: { key } });
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReinstateAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: assignmentId,
        reason: 'reinstate-expired',
        errorCategory: 'ERR-SEC',
      });
      throw new BadRequestException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    // No self-reinstatement (self-approval ban, GAP-012 spirit): restoring
    // your own access needs another grantor.
    if (prior.accountId === actorId) {
      await this.prisma.idempotencyKey.delete({ where: { key } });
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReinstateAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: assignmentId,
        reason: 'reinstate-self',
        errorCategory: 'ERR-SEC',
      });
      throw new ForbiddenException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    const now = new Date();
    const correlationId = randomUUID();

    const newAssignment = await this.prisma.$transaction(async (tx) => {
      // Create new assignment linking to the prior
      const created = await tx.roleAssignment.create({
        data: {
          accountId: prior.accountId,
          role: prior.role,
          scopeType: prior.scopeType,
          scopeRef: prior.scopeRef,
          startsAt: now,
          endsAt: prior.endsAt, // unexpired here (guarded above)
          grantedById: actorId,
          appointmentRef: prior.appointmentRef,
          authoritySource: prior.authoritySource,
          capabilities: prior.capabilities,
          employmentType: prior.employmentType,
          delegationLimit: prior.delegationLimit,
          approverId: prior.approverId,
          reason: `Reinstatement of ${prior.id}: ${reason}`,
        },
      });

      await tx.auditEvent.create({
        data: {
          occurredAt: now,
          actorAccountId: actorId,
          action: 'CMD-IAM-ReinstateAssignment',
          targetRef: created.id,
          outcome: 'ALLOW',
          // Machine-readable reason (filterable taxonomy, grants convention);
          // the human text rides in metadata, never in the reason slot.
          reason: 'assignment-reinstated',
          purpose: 'access-reinstatement',
          correlationId,
          priorState: {
            assignmentId: prior.id,
            role: prior.role,
            scopeType: prior.scopeType,
            scopeRef: prior.scopeRef,
            revokedAt: prior.revokedAt,
            revokeReason: prior.revokeReason,
          },
          newState: {
            assignmentId: created.id,
            role: created.role,
            startsAt: created.startsAt,
            endsAt: created.endsAt,
          },
          metadata: { evidence, reason },
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregate: 'RoleAssignment',
          aggregateId: created.id,
          type: 'RoleAssignmentReinstated',
          payload: { priorId: prior.id, newId: created.id, reason },
          deliveredAt: now,
        },
      });

      // Reinstated authority rejoins the review schedules like a grant.
      // Scheduling never breaks the reinstatement: failure only logs.
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
          created.role,
          risks,
          {
            high: cadences['security.reviewCadence.high'] ?? 30,
            medium: cadences['security.reviewCadence.medium'] ?? 90,
            low: cadences['security.reviewCadence.low'] ?? 180,
          },
          now,
        );
        await createReviewSchedule(tx, plan, created.id, actorId);
      } catch (error) {
        this.logger.error(
          `Review schedule skipped for reinstated assignment ${created.id}`,
          error,
        );
      }

      await tx.idempotencyKey.update({
        where: { key },
        data: {
          status: 201,
          response: { assignmentId: created.id },
        },
      });

      return created;
    });

    return {
      assignmentId: newAssignment.id,
      message: AUTH_MESSAGES.reinstated.text,
      reference: correlationId,
      replay: false,
    };
  }
}
