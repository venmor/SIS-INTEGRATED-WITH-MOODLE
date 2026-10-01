import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { ConfigurationService } from './configuration.service.js';
import { SECURITY_V1, AUTH_MESSAGES } from '@sis/config';
import { auditAuth } from './audit.js';
import { accountStatusPolicy } from './policy.service.js';

/**
 * RecoveryService handles multiple recovery methods (email, phone, security questions, recovery codes).
 * Provides accessible alternatives beyond just email tokens.
 * Includes suspicion detection (GAP-011) for suspicious recovery attempts.
 */
@Injectable()
export class RecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigurationService,
  ) {}

  /**
   * Add a recovery method for an account
   */
  async addRecoveryMethod(
    accountId: string,
    type: 'EMAIL' | 'PHONE' | 'SECURITY_QUESTION' | 'RECOVERY_CODE',
    value: string,
    priority: number = 1,
  ): Promise<{ reference: string }> {
    // Hash the value for storage
    const valueHash = createHash('sha256').update(value.toLowerCase().trim()).digest('hex');

    // Check for existing method at this priority
    const existing = await this.prisma.recoveryMethod.findUnique({
      where: { accountId_type_priority: { accountId, type, priority } },
    });

    if (existing) {
      await this.prisma.recoveryMethod.update({
        where: { id: existing.id },
        data: { valueHash, verifiedAt: null, updatedAt: new Date() },
      });
    } else {
      await this.prisma.recoveryMethod.create({
        data: { accountId, type, valueHash, priority },
      });
    }

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-AddRecoveryMethod',
      outcome: 'ALLOW',
      actorAccountId: accountId,
      reason: `${type.toLowerCase()}-recovery-added`,
    });

    return { reference: correlationId };
  }

  /**
   * Verify a recovery method (mark as verified)
   */
  async verifyRecoveryMethod(
    accountId: string,
    type: 'EMAIL' | 'PHONE' | 'SECURITY_QUESTION' | 'RECOVERY_CODE',
    value: string,
  ): Promise<{ reference: string }> {
    const valueHash = createHash('sha256').update(value.toLowerCase().trim()).digest('hex');

    const method = await this.prisma.recoveryMethod.findFirst({
      where: { accountId, type, valueHash },
    });

    if (!method) {
      throw new Error('Recovery method not found');
    }

    await this.prisma.recoveryMethod.update({
      where: { id: method.id },
      data: { verifiedAt: new Date() },
    });

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-VerifyRecoveryMethod',
      outcome: 'ALLOW',
      actorAccountId: accountId,
      reason: `${type.toLowerCase()}-recovery-verified`,
    });

    return { reference: correlationId };
  }

  /**
   * List all recovery methods for an account (without sensitive values)
   */
  async listRecoveryMethods(accountId: string): Promise<Array<{
    id: string;
    type: string;
    priority: number;
    verified: boolean;
    createdAt: Date;
  }>> {
    const methods = await this.prisma.recoveryMethod.findMany({
      where: { accountId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    return methods.map((m) => ({
      id: m.id,
      type: m.type,
      priority: m.priority,
      verified: !!m.verifiedAt,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Remove a recovery method
   */
  async removeRecoveryMethod(accountId: string, methodId: string): Promise<{ reference: string }> {
    const method = await this.prisma.recoveryMethod.findUnique({ where: { id: methodId } });

    if (!method || method.accountId !== accountId) {
      throw new Error('Recovery method not found');
    }

    // Prevent removing the last verified recovery method
    const verifiedCount = await this.prisma.recoveryMethod.count({
      where: { accountId, verifiedAt: { not: null } },
    });

    if (verifiedCount <= 1 && method.verifiedAt) {
      throw new Error('Cannot remove the last verified recovery method');
    }

    await this.prisma.recoveryMethod.delete({ where: { id: methodId } });

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-RemoveRecoveryMethod',
      outcome: 'ALLOW',
      actorAccountId: accountId,
      reason: `${method.type.toLowerCase()}-recovery-removed`,
    });

    return { reference: correlationId };
  }

  /**
   * Start recovery using a specific method.
   * Returns a token or initiates the recovery flow for that method.
   * Includes suspicion detection (GAP-011) - suspicious attempts are paused and routed to security review.
   */
  async startRecovery(
    username: string,
    methodType: 'EMAIL' | 'PHONE' | 'SECURITY_QUESTION' | 'RECOVERY_CODE',
    methodValue?: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ message: string; reference: string; token?: string; paused?: boolean }> {
    const account = await this.prisma.account.findUnique({
      where: { username },
      include: { recoveryMethods: true },
    });

    // Always return generic message (no account enumeration)
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-StartRecovery',
      outcome: 'ALLOW',
      actorAccountId: account?.id ?? null,
      targetRef: username,
      reason: 'recovery-started',
    });

    if (!account || !accountStatusPolicy(account.status).allow) {
      return { message: AUTH_MESSAGES.recoveryRequested.text, reference: correlationId };
    }

    // Find the recovery method
    let method = account.recoveryMethods.find((m) => m.type === methodType);

    // If methodValue provided, find specific method
    if (methodValue && method) {
      const valueHash = createHash('sha256').update(methodValue.toLowerCase().trim()).digest('hex');
      method = account.recoveryMethods.find((m) => m.type === methodType && m.valueHash === valueHash);
    }

    if (!method || !method.verifiedAt) {
      // Method not found or not verified - still return generic message
      return { message: AUTH_MESSAGES.recoveryRequested.text, reference: correlationId };
    }

    // GAP-011: Check suspicion signals before proceeding
    if (ip) {
      const { riskScore, signals } = await this.checkSuspicionSignals(account.id, ip, userAgent);
      const { suspicionId, queued } = await this.createSuspicionRecord(account.id, riskScore, signals);

      if (queued) {
        // Recovery paused - routed to security review queue
        await auditAuth(this.prisma, {
          action: 'CMD-IAM-StartRecovery',
          outcome: 'DENY',
          actorAccountId: account.id,
          targetRef: username,
          reason: 'recovery-paused-suspicious-activity',
          errorCategory: 'ERR-SEC',
          purpose: 'recovery-security-review',
          metadata: { suspicionId, riskScore, signals },
        });

        return {
          message: AUTH_MESSAGES.recoveryRequested.text,
          reference: correlationId,
          paused: true,
        };
      }
    }

    // For RECOVERY_CODE, the code itself IS the token (single-use)
    if (methodType === 'RECOVERY_CODE') {
      // In a real implementation, we'd verify the code here
      // For now, return a token that can be used for recovery confirm
      const token = randomBytes(32).toString('base64url');
      const recoveryToken = await this.prisma.recoveryToken.create({
        data: {
          tokenHash: createHash('sha256').update(token).digest('hex'),
          accountId: account.id,
          expiresAt: new Date(Date.now() + SECURITY_V1.recoveryTokenMinutes * 60 * 1000),
        },
      });

      // Update suspicion record with token ID if it was created
      if (ip) {
        const { riskScore, signals } = await this.checkSuspicionSignals(account.id, ip, userAgent);
        await this.createSuspicionRecord(account.id, riskScore, signals, recoveryToken.id);
      }

      return { message: AUTH_MESSAGES.recoveryRequested.text, reference: correlationId, token };
    }

    // For EMAIL/PHONE/SECURITY_QUESTION, we'd send a code or prompt
    // For now, create a recovery token (demo path)
    const token = randomBytes(32).toString('base64url');
    const recoveryToken = await this.prisma.recoveryToken.create({
      data: {
        tokenHash: createHash('sha256').update(token).digest('hex'),
        accountId: account.id,
        expiresAt: new Date(Date.now() + SECURITY_V1.recoveryTokenMinutes * 60 * 1000),
      },
    });

    // Update suspicion record with token ID if it was created
    if (ip) {
      const { riskScore, signals } = await this.checkSuspicionSignals(account.id, ip, userAgent);
      await this.createSuspicionRecord(account.id, riskScore, signals, recoveryToken.id);
    }

    // In production, send code via email/SMS or prompt for security answer
    // For demo, return token
    return { message: AUTH_MESSAGES.recoveryRequested.text, reference: correlationId, token };
  }

  /**
   * Confirm recovery with a token (from any method)
   */
  async confirmRecovery(token: string, newPassword: string): Promise<{ ok: boolean; message: string; reference: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const burned = await this.prisma.recoveryToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    if (burned.count === 0) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ConfirmRecovery',
        outcome: 'DENY',
        reason: 'invalid-or-expired-token',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, message: AUTH_MESSAGES.recoveryLinkExpired.text, reference: correlationId };
    }

    const row = await this.prisma.recoveryToken.findUniqueOrThrow({ where: { tokenHash } });
    const account = await this.prisma.account.findUnique({ where: { id: row.accountId } });

    if (!account || !accountStatusPolicy(account.status).allow) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ConfirmRecovery',
        outcome: 'DENY',
        targetRef: row.accountId,
        reason: 'account-inactive',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, message: AUTH_MESSAGES.recoveryLinkExpired.text, reference: correlationId };
    }

    // Import argon2 dynamically
    const { hash } = await import('argon2');

    const secretHash = await hash(newPassword);
    try {
      await this.prisma.$transaction([
        this.prisma.credential.updateMany({
          where: { accountId: account.id, kind: 'PASSWORD', status: 'ACTIVE' },
          data: { status: 'SUPERSEDED', supersededAt: new Date() },
        }),
        this.prisma.credential.create({
          data: { accountId: account.id, kind: 'PASSWORD', secretHash, status: 'ACTIVE' },
        }),
        this.prisma.session.updateMany({
          where: { accountId: account.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        this.prisma.account.update({
          where: { id: account.id },
          data: { failedSignInCount: 0, lockedUntil: null },
        }),
        this.prisma.recoveryToken.updateMany({
          where: { accountId: account.id, usedAt: null },
          data: { usedAt: new Date() },
        }),
      ]);
    } catch {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ConfirmRecovery',
        outcome: 'DENY',
        targetRef: row.accountId,
        reason: 'confirm-commit-failed',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false, message: AUTH_MESSAGES.recoveryLinkExpired.text, reference: correlationId };
    }

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-ConfirmRecovery',
      outcome: 'ALLOW',
      actorAccountId: account.id,
      targetRef: account.username,
      reason: 'password-changed-sessions-revoked',
    });

    return { ok: true, message: AUTH_MESSAGES.passwordChanged.text, reference: correlationId };
  }

  /**
   * Check suspicion signals for a recovery attempt (GAP-011).
   * Analyzes: failed attempts, geo anomaly, device change, rate limit proximity.
   * Returns risk score (0-100) and signal details.
   */
  async checkSuspicionSignals(
    accountId: string,
    ip: string,
    userAgent: string | undefined,
  ): Promise<{ riskScore: number; signals: Array<{ type: string; details: any }> }> {
    const suspicionConfig = await this.config.getOrThrow<{
      failedAttemptsThreshold: number;
      failedAttemptsWindowMinutes: number;
      geoAnomalyEnabled: boolean;
      geoAnomalyRiskScore: number;
      deviceChangeEnabled: boolean;
      deviceChangeRiskScore: number;
      rateLimitProximityThreshold: number;
      rateLimitRiskScore: number;
      riskScoreThreshold: number;
      maxRiskScore: number;
    }>('security.suspicion');

    const signals: Array<{ type: string; details: any }> = [];
    let riskScore = 0;
    const now = new Date();
    const windowStart = new Date(now.getTime() - suspicionConfig.failedAttemptsWindowMinutes * 60 * 1000);

    // 1. Failed recovery attempts in window
    const failedAttempts = await this.prisma.recoverySuspicion.count({
      where: {
        accountId,
        createdAt: { gte: windowStart },
        signalType: { in: ['FAILED_ATTEMPTS', 'MULTIPLE_SIGNALS'] },
      },
    });
    if (failedAttempts >= suspicionConfig.failedAttemptsThreshold) {
      const score = Math.min(
        suspicionConfig.geoAnomalyRiskScore + (failedAttempts - suspicionConfig.failedAttemptsThreshold) * 10,
        suspicionConfig.maxRiskScore,
      );
      riskScore += score;
      signals.push({
        type: 'FAILED_ATTEMPTS',
        details: { count: failedAttempts, threshold: suspicionConfig.failedAttemptsThreshold, windowMinutes: suspicionConfig.failedAttemptsWindowMinutes, score },
      });
    }

    // 2. Geographic anomaly - check if IP country differs from recent sessions
    if (suspicionConfig.geoAnomalyEnabled) {
      const recentSession = await this.prisma.session.findFirst({
        where: { accountId, createdIp: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { createdIp: true, createdAt: true },
      });
      if (recentSession?.createdIp && recentSession.createdIp !== ip) {
        // Simple heuristic: different /24 subnet = potential geo anomaly
        const recentSubnet = recentSession.createdIp.split('.').slice(0, 3).join('.');
        const currentSubnet = ip.split('.').slice(0, 3).join('.');
        if (recentSubnet !== currentSubnet) {
          riskScore += suspicionConfig.geoAnomalyRiskScore;
          signals.push({
            type: 'GEO_ANOMALY',
            details: { previousIp: recentSession.createdIp, currentIp: ip, previousSubnet: recentSubnet, currentSubnet, score: suspicionConfig.geoAnomalyRiskScore },
          });
        }
      }
    }

    // 3. Device fingerprint change - check user agent difference
    if (suspicionConfig.deviceChangeEnabled && userAgent) {
      const recentSession = await this.prisma.session.findFirst({
        where: { accountId, userAgent: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { userAgent: true, createdAt: true },
      });
      if (recentSession?.userAgent && recentSession.userAgent !== userAgent) {
        // Simple heuristic: different browser/OS family
        const isDifferentDevice = !this.similarUserAgent(recentSession.userAgent, userAgent);
        if (isDifferentDevice) {
          riskScore += suspicionConfig.deviceChangeRiskScore;
          signals.push({
            type: 'DEVICE_CHANGE',
            details: { previousUserAgent: recentSession.userAgent, currentUserAgent: userAgent, score: suspicionConfig.deviceChangeRiskScore },
          });
        }
      }
    }

    // 4. Rate limit proximity - check how close to recovery rate limit
    const recoveryLimit = SECURITY_V1.rateLimits.recovery;
    const recentRecoveryAttempts = await this.prisma.recoveryToken.count({
      where: {
        accountId,
        createdAt: { gte: new Date(now.getTime() - recoveryLimit.windowMinutes * 60 * 1000) },
      },
    });
    const proximityPercent = (recentRecoveryAttempts / recoveryLimit.maxAttempts) * 100;
    if (proximityPercent >= suspicionConfig.rateLimitProximityThreshold) {
      riskScore += suspicionConfig.rateLimitRiskScore;
      signals.push({
        type: 'RATE_LIMIT',
        details: { attempts: recentRecoveryAttempts, maxAttempts: recoveryLimit.maxAttempts, windowMinutes: recoveryLimit.windowMinutes, proximityPercent, score: suspicionConfig.rateLimitRiskScore },
      });
    }

    // Cap risk score
    riskScore = Math.min(riskScore, suspicionConfig.maxRiskScore);

    return { riskScore, signals };
  }

  /**
   * Simple user agent similarity check (browser/OS family)
   */
  private similarUserAgent(ua1: string, ua2: string): boolean {
    const extractFamily = (ua: string) => {
      const lower = ua.toLowerCase();
      if (lower.includes('firefox')) return 'firefox';
      if (lower.includes('chrome') || lower.includes('chromium')) return 'chrome';
      if (lower.includes('safari') && !lower.includes('chrome')) return 'safari';
      if (lower.includes('edge')) return 'edge';
      return 'unknown';
    };
    return extractFamily(ua1) === extractFamily(ua2);
  }

  /**
   * Create a suspicion record and optionally queue for security review (GAP-011).
   */
  async createSuspicionRecord(
    accountId: string,
    riskScore: number,
    signals: Array<{ type: string; details: any }>,
    recoveryTokenId?: string,
  ): Promise<{ suspicionId: string; queued: boolean }> {
    const suspicionConfig = await this.config.getOrThrow<{
      riskScoreThreshold: number;
    }>('security.suspicion');

    const primarySignal = signals.length > 0 ? signals[0].type : 'MULTIPLE_SIGNALS';
    const signalDetails = { signals, totalRiskScore: riskScore };

    const suspicion = await this.prisma.recoverySuspicion.create({
      data: {
        recoveryTokenId,
        accountId,
        signalType: primarySignal,
        signalDetails: signalDetails as any,
        riskScore,
        status: riskScore >= suspicionConfig.riskScoreThreshold ? 'QUEUED' : 'PENDING',
      },
    });

    let queued = false;
    if (riskScore >= suspicionConfig.riskScoreThreshold) {
      // Create review queue entry
      await this.prisma.recoveryReviewQueue.create({
        data: {
          suspicionId: suspicion.id,
          accountId,
          priority: riskScore >= 80 ? 'HIGH' : riskScore >= 60 ? 'MEDIUM' : 'LOW',
          status: 'PENDING',
        },
      });

      // Audit: suspicion detected and queued
      await auditAuth(this.prisma, {
        action: 'CMD-IAM-RecoverySuspicionDetected',
        outcome: 'ALLOW',
        actorAccountId: accountId,
        targetRef: suspicion.id,
        reason: 'suspicious-recovery-queued-for-review',
        purpose: 'recovery-security-review',
        metadata: { riskScore, signals: signalDetails, reviewQueued: true },
      });

      queued = true;
    } else {
      // Audit: suspicion detected but below threshold
      await auditAuth(this.prisma, {
        action: 'CMD-IAM-RecoverySuspicionDetected',
        outcome: 'ALLOW',
        actorAccountId: accountId,
        targetRef: suspicion.id,
        reason: 'suspicious-recovery-logged-below-threshold',
        purpose: 'recovery-security-review',
        metadata: { riskScore, signals: signalDetails, reviewQueued: false },
      });
    }

    return { suspicionId: suspicion.id, queued };
  }

  /**
   * Get suspicion history for an account
   */
  async getSuspicionHistory(accountId: string): Promise<Array<{
    id: string;
    signalType: string;
    riskScore: number;
    status: string;
    createdAt: Date;
    reviewedAt: Date | null;
    reviewDecision: string | null;
  }>> {
    const suspicions = await this.prisma.recoverySuspicion.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return suspicions.map((s) => ({
      id: s.id,
      signalType: s.signalType,
      riskScore: s.riskScore,
      status: s.status,
      createdAt: s.createdAt,
      reviewedAt: s.reviewedAt,
      reviewDecision: s.reviewDecision,
    }));
  }

  /**
   * Demo-only token completion (existing method, kept for compatibility)
   */
  async demoToken(username: string): Promise<{ token: string; expiresAt: Date } | null> {
    if (process.env.NODE_ENV === 'production') return null;
    if (process.env.DEMO_MODE !== 'true') return null;

    const account = await this.prisma.account.findUnique({ where: { username } });
    if (!account || !accountStatusPolicy(account.status).allow) return null;

    await this.prisma.recoveryToken.updateMany({
      where: { accountId: account.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('base64url');
    const row = await this.prisma.recoveryToken.create({
      data: {
        tokenHash: createHash('sha256').update(token).digest('hex'),
        accountId: account.id,
        expiresAt: new Date(Date.now() + SECURITY_V1.recoveryTokenMinutes * 60 * 1000),
      },
    });

    await auditAuth(this.prisma, {
      action: 'CMD-IAM-RequestRecovery',
      outcome: 'ALLOW',
      actorAccountId: account.id,
      targetRef: username,
      reason: 'demo-token-issued',
    });

    return { token, expiresAt: row.expiresAt };
  }
}