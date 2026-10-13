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
import {
  hasActiveAuthority,
  type ActiveAuthority,
} from './active-authority.js';
import { randomUUID } from 'crypto';
import type { RecoveryReviewDecision, RecoveryReviewQueryDto } from './dto.js';

/**
 * RecoveryReviewService handles security review of suspicious recovery attempts (GAP-011).
 * Security Administrators review paused recoveries and decide: approve, deny, or escalate.
 */
@Injectable()
export class RecoveryReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigurationService,
  ) {}

  private async requireSecurityAdmin(actor: ActiveAuthority): Promise<void> {
    const actorId = actor.accountId;
    const reviewRoles = await this.config.getOrThrow<string[]>('security.reviewRoles');
    if (!(await hasActiveAuthority(this.prisma, actor, reviewRoles))) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-RecoveryReviewDecided',
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

  async getReviewQueue(actor: ActiveAuthority, filters: RecoveryReviewQueryDto) {
    await this.requireSecurityAdmin(actor);
    const where: { status?: string; priority?: string; assignedTo?: string } = {};
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;

    return this.prisma.recoveryReviewQueue.findMany({
      where,
      include: {
        suspicion: {
          include: {
            account: { select: { id: true, username: true, personId: true } },
          },
        },
        account: { select: { id: true, username: true, personId: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      skip: filters.skip ?? 0,
      take: filters.take ?? 50,
    });
  }

  async getReviewById(actor: ActiveAuthority, queueId: string) {
    const actorId = actor.accountId;
    await this.requireSecurityAdmin(actor);
    const queueItem = await this.prisma.recoveryReviewQueue.findUnique({
      where: { id: queueId },
      include: {
        suspicion: {
          include: {
            account: { select: { id: true, username: true, personId: true } },
          },
        },
        account: { select: { id: true, username: true, personId: true } },
      },
    });
    if (!queueItem) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-RecoveryReviewDecided',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: queueId,
        reason: 'review-not-found',
        errorCategory: 'ERR-SEC',
      });
      throw new NotFoundException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }
    return queueItem;
  }

  async decideReview(
    actor: ActiveAuthority,
    queueId: string,
    decision: RecoveryReviewDecision,
    reason: string,
  ) {
    const actorId = actor.accountId;
    await this.requireSecurityAdmin(actor);
    const queueItem = await this.prisma.recoveryReviewQueue.findUnique({
      where: { id: queueId },
      include: { suspicion: true },
    });

    if (!queueItem) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-RecoveryReviewDecided',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: queueId,
        reason: 'review-not-found',
        errorCategory: 'ERR-SEC',
      });
      throw new NotFoundException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    if (queueItem.status === 'DECIDED') {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-RecoveryReviewDecided',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: queueItem.accountId,
        reason: 'review-already-decided',
        errorCategory: 'ERR-SEC',
      });
      throw new ConflictException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    // Prevent self-review
    if (queueItem.accountId === actorId) {
      const { correlationId: selfRef } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-RecoveryReviewDecided',
        outcome: 'DENY',
        actorAccountId: actorId,
        targetRef: queueItem.accountId,
        reason: 'review-self-decision',
        errorCategory: 'ERR-SEC',
      });
      throw new ForbiddenException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: selfRef,
      });
    }

    const now = new Date();
    const correlationId = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      // Claim the review (prevent concurrent decisions)
      const claimed = await tx.recoveryReviewQueue.updateMany({
        where: { id: queueId, status: 'PENDING' },
        data: {
          status: 'CLAIMED',
          assignedTo: actorId,
          claimedAt: now,
        },
      });
      if (claimed.count === 0) {
        // Try again with CLAIMED status (another admin may have claimed)
        const recheck = await tx.recoveryReviewQueue.findUnique({ where: { id: queueId } });
        if (recheck?.status === 'CLAIMED' && recheck.assignedTo !== actorId) {
          const { correlationId: raceRef } = await auditAuth(this.prisma, {
            action: 'CMD-IAM-RecoveryReviewDecided',
            outcome: 'DENY',
            actorAccountId: actorId,
            targetRef: queueItem.accountId,
            reason: 'review-claimed-by-another',
            errorCategory: 'ERR-SEC',
          });
          throw new ConflictException({
            message: AUTH_MESSAGES.grantDenied.text,
            reference: raceRef,
          });
        }
      }

      const updatedQueue = await tx.recoveryReviewQueue.findUniqueOrThrow({
        where: { id: queueId },
        include: { suspicion: true },
      });

      // Update suspicion record
      await tx.recoverySuspicion.update({
        where: { id: updatedQueue.suspicionId },
        data: {
          status: 'REVIEWED',
          reviewedAt: now,
          reviewedBy: actorId,
          reviewDecision: decision,
          reviewNote: reason,
        },
      });

      let recoveryTokenCreated = false;
      let newRecoveryToken: string | null = null;

      if (decision === 'APPROVE') {
        // Create a new recovery token for the account
        const token = randomBytes(32).toString('base64url');
        const recoveryToken = await tx.recoveryToken.create({
          data: {
            tokenHash: createHash('sha256').update(token).digest('hex'),
            accountId: updatedQueue.accountId,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 60 minutes default
          },
        });
        recoveryTokenCreated = true;
        newRecoveryToken = token;

        await tx.auditEvent.create({
          data: {
            occurredAt: now,
            actorAccountId: actorId,
            action: 'CMD-IAM-RecoveryReviewDecided',
            targetRef: updatedQueue.accountId,
            outcome: 'ALLOW',
            reason: 'recovery-approved-after-review',
            purpose: 'recovery-security-review',
            correlationId,
            priorState: { queueId, status: updatedQueue.status, decision: null },
            newState: { queueId, status: 'DECIDED', decision: 'APPROVE', recoveryTokenCreated: true },
            metadata: { queueId, reason, suspicionId: updatedQueue.suspicionId, recoveryTokenId: recoveryToken.id },
          },
        });
      } else if (decision === 'DENY') {
        // Mark all pending recovery tokens for this account as used (block recovery)
        await tx.recoveryToken.updateMany({
          where: { accountId: updatedQueue.accountId, usedAt: null },
          data: { usedAt: now },
        });

        await tx.auditEvent.create({
          data: {
            occurredAt: now,
            actorAccountId: actorId,
            action: 'CMD-IAM-RecoveryReviewDecided',
            targetRef: updatedQueue.accountId,
            outcome: 'DENY',
            reason: 'recovery-denied-after-review',
            purpose: 'recovery-security-review',
            correlationId,
            priorState: { queueId, status: updatedQueue.status, decision: null },
            newState: { queueId, status: 'DECIDED', decision: 'DENY', recoveryTokensRevoked: true },
            metadata: { queueId, reason, suspicionId: updatedQueue.suspicionId },
          },
        });
      } else if (decision === 'ESCALATE') {
        // Create SecurityEvent for higher authority (if model exists)
        // For now, audit as escalated
        await tx.auditEvent.create({
          data: {
            occurredAt: now,
            actorAccountId: actorId,
            action: 'CMD-IAM-RecoveryReviewDecided',
            targetRef: updatedQueue.accountId,
            outcome: 'ALLOW',
            reason: 'recovery-escalated',
            purpose: 'recovery-security-review',
            correlationId,
            priorState: { queueId, status: updatedQueue.status, decision: null },
            newState: { queueId, status: 'DECIDED', decision: 'ESCALATE', escalated: true },
            metadata: { queueId, reason, suspicionId: updatedQueue.suspicionId, escalated: true },
          },
        });
      }

      // Update queue item with decision
      const finalQueue = await tx.recoveryReviewQueue.update({
        where: { id: queueId },
        data: {
          status: 'DECIDED',
          decidedAt: now,
          decidedBy: actorId,
          decision,
          decisionReason: reason,
        },
      });

      // Outbox event for review completion
      await tx.outboxEvent.create({
        data: {
          aggregate: 'RecoveryReviewQueue',
          aggregateId: queueId,
          type: 'RecoveryReviewCompleted',
          payload: {
            queueId,
            suspicionId: updatedQueue.suspicionId,
            accountId: updatedQueue.accountId,
            decision,
            recoveryTokenCreated,
          },
          occurredAt: now,
        },
      });

      return { ...finalQueue, recoveryToken: newRecoveryToken };
    });
  }
}

// Need to import createHash for token creation
import { createHash, randomBytes } from 'node:crypto';