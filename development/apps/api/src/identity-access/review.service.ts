import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import { PrismaService } from './prisma.service.js';
import { ConfigurationService } from './configuration.service.js';
import { auditAuth } from './audit.js';
import { randomUUID } from 'crypto';
import type { ReviewDecision, ReviewQueryDto } from './dto.js';

// Quarterly access review (slice 5, handbook §12.12, REQ-IAM-002/003).
// Reviewers (security.reviewRoles, demo-mapped IAM Administrators) confirm,
// reduce, reassign, revoke or clarify each due assignment with a reason.
// Revoke drops the assignment to null-workspace (sessions stay valid — safe
// reads keep working, protected acts answer §12.12); every decision is
// audited CMD-IAM-ReviewAssignment with purpose + prior/new refs and a
// delivered outbox event. History is never edited (reinstatement is slice 5b).
@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigurationService,
  ) {}

  private async liveRoles(accountId: string): Promise<string[]> {
    const assignments = await this.prisma.roleAssignment.findMany({
      where: {
        accountId,
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { role: true },
    });
    return assignments.map((a) => a.role);
  }

  private async requireReviewer(actorId: string): Promise<void> {
    const reviewRoles = await this.config.getOrThrow<string[]>(
      'security.reviewRoles',
    );
    const roles = await this.liveRoles(actorId);
    if (!roles.some((r) => reviewRoles.includes(r))) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReviewAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        reason: 'reviewer-forbidden',
        errorCategory: 'ERR-SEC',
      });
      throw new ForbiddenException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }
  }

  async getReviews(actorId: string, filters: ReviewQueryDto) {
    await this.requireReviewer(actorId);
    const where: { riskLevel?: string; status?: string; reviewerId?: string } =
      {};
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;
    if (filters.status) where.status = filters.status;
    if (filters.reviewerId) where.reviewerId = filters.reviewerId;

    return this.prisma.reviewSchedule.findMany({
      where,
      orderBy: { nextDueAt: 'asc' },
      skip: filters.skip ?? 0,
      take: filters.take ?? 50,
    });
  }

  // Single-review read for the decide page (avoids list over-fetch): same
  // reviewer gate, neutral 404 for unknown ids.
  async getReviewById(actorId: string, scheduleId: string) {
    await this.requireReviewer(actorId);
    const schedule = await this.prisma.reviewSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReviewAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: scheduleId,
        reason: 'review-not-found',
        errorCategory: 'ERR-SEC',
      });
      throw new NotFoundException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }
    return schedule;
  }

  async decideReview(
    actorId: string,
    scheduleId: string,
    decision: ReviewDecision,
    reason: string,
  ) {
    await this.requireReviewer(actorId);
    const schedule = await this.prisma.reviewSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReviewAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: scheduleId,
        reason: 'review-not-found',
        errorCategory: 'ERR-SEC',
      });
      throw new NotFoundException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    if (schedule.status === 'completed') {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReviewAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: schedule.assignmentId,
        reason: 'review-already-completed',
        errorCategory: 'ERR-SEC',
      });
      throw new ConflictException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    // Specified inputs pending (GAP-014): reduce, reassign and change-end-date
    // ride the stable enum but fail closed instead of pretending effect.
    if (decision === 'reduce' || decision === 'reassign') {
      const { correlationId: deferredRef } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReviewAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: schedule.assignmentId,
        reason: 'decision-deferred',
        errorCategory: 'ERR-SEC',
        purpose: 'access-review',
        metadata: { scheduleId, decision, gap: 'GAP-014' },
      });
      throw new BadRequestException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: deferredRef,
      });
    }

    // Target liveness for every decision (confirming or clarifying a dead
    // assignment is nonsense): fail closed instead of auditing fiction.
    // Reviewers also never decide their own assignments (self-approval ban,
    // GAP-012 spirit).
    const target = await this.prisma.roleAssignment.findUnique({
      where: { id: schedule.assignmentId },
    });
    const targetLive =
      !!target &&
      !target.revokedAt &&
      target.startsAt.getTime() <= Date.now() &&
      (!target.endsAt || target.endsAt.getTime() > Date.now());
    if (!targetLive) {
      const { correlationId: deadRef } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReviewAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: schedule.assignmentId,
        reason: 'review-target-dead',
        errorCategory: 'ERR-SEC',
        purpose: 'access-review',
      });
      throw new BadRequestException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: deadRef,
      });
    }
    if (target.accountId === actorId) {
      const { correlationId: selfRef } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReviewAssignment',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: schedule.assignmentId,
        reason: 'review-self-decision',
        errorCategory: 'ERR-SEC',
        purpose: 'access-review',
      });
      throw new ForbiddenException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: selfRef,
      });
    }

    // Clarification requests evidence without closing the review: the row
    // stays pending so a follow-up decide still works.
    if (decision === 'clarify') {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ReviewAssignment',
        outcome: 'ALLOW',
        actorAccountId: actorId,
        targetRef: schedule.assignmentId,
        reason: 'clarify',
        purpose: 'access-review',
        metadata: { scheduleId, reason },
      });
      return { ...schedule, clarificationReference: correlationId };
    }

    const now = new Date();
    const correlationId = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      // Conditional claim: exactly one concurrent decider wins. Losers see
      // zero rows and answer 409 instead of duplicating audit + outbox.
      const claimed = await tx.reviewSchedule.updateMany({
        where: { id: scheduleId, status: 'pending' },
        data: {
          status: 'completed',
          decision,
          decidedAt: now,
          decidedBy: actorId,
        },
      });
      if (claimed.count === 0) {
        const { correlationId: raceRef } = await auditAuth(this.prisma, {
          action: 'CMD-IAM-ReviewAssignment',
          outcome: 'DENY',
          actorAccountId: actorId,
          targetRef: schedule.assignmentId,
          reason: 'review-already-completed',
          errorCategory: 'ERR-SEC',
        });
        throw new ConflictException({
          message: AUTH_MESSAGES.grantDenied.text,
          reference: raceRef,
        });
      }
      const updatedSchedule = await tx.reviewSchedule.findUniqueOrThrow({
        where: { id: scheduleId },
      });

      if (decision === 'revoke') {
        const prior = await tx.roleAssignment.findUnique({
          where: { id: schedule.assignmentId },
        });
        // Never rewrite history: revoking an already-dead assignment fails
        // closed instead of overwriting its revoke reason.
        if (!prior || prior.revokedAt) {
          const { correlationId: deadRef } = await auditAuth(this.prisma, {
            action: 'CMD-IAM-ReviewAssignment',
            outcome: 'DENY',
            actorAccountId: actorId,
            targetRef: schedule.assignmentId,
            reason: 'review-target-dead',
            errorCategory: 'ERR-SEC',
          });
          throw new BadRequestException({
            message: AUTH_MESSAGES.grantDenied.text,
            reference: deadRef,
          });
        }
        await tx.roleAssignment.update({
          where: { id: schedule.assignmentId },
          data: {
            revokedAt: now,
            revokeReason: `Revoked by review ${scheduleId}: ${reason}`,
          },
        });

        // Sessions stay valid (null-workspace degradation, never logout):
        // validateSession resolves the dead assignment to no workspace.

        await tx.auditEvent.create({
          data: {
            occurredAt: now,
            actorAccountId: actorId,
            action: 'CMD-IAM-ReviewAssignment',
            targetRef: schedule.assignmentId,
            outcome: 'DENY',
            reason: 'revoked-by-review',
            purpose: 'access-review',
            correlationId,
            priorState: {
              assignmentId: schedule.assignmentId,
              role: prior?.role ?? null,
              revokedAt: null,
            },
            newState: {
              assignmentId: schedule.assignmentId,
              revokedAt: now,
              scheduleId: schedule.id,
            },
            metadata: { scheduleId, reason },
          },
        });
      } else {
        await tx.auditEvent.create({
          data: {
            occurredAt: now,
            actorAccountId: actorId,
            action: 'CMD-IAM-ReviewAssignment',
            targetRef: schedule.assignmentId,
            outcome: 'ALLOW',
            reason: decision,
            purpose: 'access-review',
            correlationId,
            metadata: { scheduleId, reason },
          },
        });
      }

      await tx.outboxEvent.create({
        data: {
          aggregate: 'ReviewSchedule',
          aggregateId: schedule.id,
          type: 'RoleAssignmentReviewCompleted',
          payload: {
            scheduleId: schedule.id,
            assignmentId: schedule.assignmentId,
            decision,
          },
          deliveredAt: now,
        },
      });

      return updatedSchedule;
    });
  }
}
