import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { SECURITY_V1 } from '@sis/config';
import { auditAuth } from './audit.js';
import { MFAService } from './mfa.service.js';

/**
 * StepUpService handles step-up authentication challenges for high-risk actions.
 * Challenges are time-limited and require additional verification (TOTP, backup code, etc.).
 */
@Injectable()
export class StepUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mfaService: MFAService,
  ) {}

  /**
   * Generate a unique challenge ID
   */
  private generateChallengeId(): string {
    return `stepup_${randomBytes(16).toString('hex')}`;
  }

  /**
   * Check if an action requires step-up authentication
   */
  requiresStepUp(action: string): boolean {
    return SECURITY_V1.stepUpActions.includes(action);
  }

  /**
   * List all actions that require step-up authentication
   */
  getStepUpActions(): string[] {
    return [...SECURITY_V1.stepUpActions];
  }

  /**
   * Create a step-up challenge for a high-risk action.
   * Returns the challenge ID and type (TOTP for now, PUSH for future).
   */
  async createChallenge(
    accountId: string,
    targetAction: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ challengeId: string; type: string; expiresAt: Date; reference: string }> {
    // Verify this action requires step-up
    if (!this.requiresStepUp(targetAction)) {
      throw new Error(`Action ${targetAction} does not require step-up authentication`);
    }

    // Check if MFA is enrolled
    const mfaEnabled = await this.mfaService.isMFAEnabled(accountId);
    if (!mfaEnabled) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-StepUpChallenge',
        outcome: 'DENY',
        actorAccountId: accountId,
        targetRef: targetAction,
        reason: 'mfa-not-enrolled',
        errorCategory: 'ERR-SEC',
      });
      throw new Error(`MFA required for step-up. Reference: ${correlationId}`);
    }

    // Invalidate any existing unverified challenges for this account+action
    await this.prisma.stepUpChallenge.updateMany({
      where: {
        accountId,
        targetAction,
        verifiedAt: null,
      },
      data: {
        verifiedAt: new Date(), // Mark as superseded
      },
    });

    const challengeId = this.generateChallengeId();
    const expiresAt = new Date(Date.now() + SECURITY_V1.stepUpExpiryMinutes * 60 * 1000);

    await this.prisma.stepUpChallenge.create({
      data: {
        accountId,
        challengeId,
        type: 'TOTP', // Currently only TOTP supported
        targetAction,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-StepUpChallenge',
      outcome: 'ALLOW',
      actorAccountId: accountId,
      targetRef: targetAction,
      reason: 'challenge-created',
    });

    return { challengeId, type: 'TOTP', expiresAt, reference: correlationId };
  }

  /**
   * Verify a step-up challenge using TOTP or backup code
   */
  async verifyChallenge(
    accountId: string,
    challengeId: string,
    code: string,
    codeType: 'TOTP' | 'BACKUP_CODE' = 'TOTP',
    targetAction?: string,
  ): Promise<{ ok: boolean; reference: string; message?: string }> {
    const challenge = await this.prisma.stepUpChallenge.findUnique({
      where: { challengeId },
    });

    if (!challenge) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-StepUpVerify',
        outcome: 'DENY',
        actorAccountId: accountId,
        reason: 'challenge-not-found',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, reference: correlationId, message: 'Challenge not found' };
    }

    if (challenge.accountId !== accountId) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-StepUpVerify',
        outcome: 'DENY',
        actorAccountId: accountId,
        reason: 'challenge-account-mismatch',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, reference: correlationId, message: 'Challenge not for this account' };
    }

    if (targetAction && challenge.targetAction !== targetAction) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-StepUpVerify',
        outcome: 'DENY',
        actorAccountId: accountId,
        targetRef: targetAction,
        reason: 'challenge-action-mismatch',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, reference: correlationId, message: 'Challenge is for another action' };
    }

    if (challenge.verifiedAt) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-StepUpVerify',
        outcome: 'DENY',
        actorAccountId: accountId,
        reason: 'challenge-already-used',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, reference: correlationId, message: 'Challenge already used' };
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-StepUpVerify',
        outcome: 'DENY',
        actorAccountId: accountId,
        reason: 'challenge-expired',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, reference: correlationId, message: 'Challenge expired' };
    }

    // Verify the code based on type
    let verified = false;
    if (codeType === 'TOTP') {
      const result = await this.mfaService.verifyTOTP(accountId, code);
      verified = result.ok;
    } else if (codeType === 'BACKUP_CODE') {
      const result = await this.mfaService.verifyBackupCode(accountId, code);
      verified = result.ok;
    }

    if (!verified) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-StepUpVerify',
        outcome: 'DENY',
        actorAccountId: accountId,
        targetRef: challenge.targetAction,
        reason: 'invalid-step-up-code',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, reference: correlationId, message: 'Invalid verification code' };
    }

    // Mark challenge as verified
    const consumed = await this.prisma.stepUpChallenge.updateMany({
      where: { challengeId, accountId, targetAction: challenge.targetAction, verifiedAt: null, expiresAt: { gt: new Date() } },
      data: { verifiedAt: new Date() },
    });

    if (consumed.count !== 1) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-StepUpVerify', outcome: 'DENY', actorAccountId: accountId,
        targetRef: challenge.targetAction, reason: 'challenge-no-longer-active', errorCategory: 'ERR-SEC',
      });
      return { ok: false, reference: correlationId, message: 'Challenge no longer active' };
    }

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-StepUpVerify',
      outcome: 'ALLOW',
      actorAccountId: accountId,
      targetRef: challenge.targetAction,
      reason: 'step-up-verified',
    });

    return { ok: true, reference: correlationId };
  }

  /**
   * Get a challenge by ID (for status checking)
   */
  async getChallenge(challengeId: string) {
    return this.prisma.stepUpChallenge.findUnique({ where: { challengeId } });
  }

  /**
   * Clean up expired challenges (scheduled job)
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.stepUpChallenge.deleteMany({
      where: {
        verifiedAt: null,
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}
