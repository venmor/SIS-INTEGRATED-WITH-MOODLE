import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { createRequire } from 'node:module';
import { AUTH_MESSAGES, SECURITY_V1 } from '@sis/config';
import { PrismaService } from './prisma.service.js';
import { auditAuth } from './audit.js';
import { accountStatusPolicy } from './policy.service.js';

const require = createRequire(import.meta.url);
const { hash } = require('argon2') as typeof import('argon2');

// Recovery follows §12.10 states (requested → … → restored/denied). Only the
// token HASH is stored; the raw token is returned once (demo path) or sent
// via the future delivery provider. Responses never disclose account
// existence (REQ-IAM-006); expiry is explained with a fresh-request route
// (UI-FIELD-003 table).
@Injectable()
export class RecoveryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Always resolves to the generic message — existence stays hidden. */
  async requestRecovery(username: string): Promise<{ message: string; reference: string }> {
    const account = await this.prisma.account.findUnique({ where: { username } });
    // No pre-delivery invalidation: burning prior tokens on every request
    // lets anyone with a rotated IP continuously kill a victim's legitimate
    // token. Stale tokens die on confirm (single-use burn + sweep below).
    if (account && accountStatusPolicy(account.status).allow) {
      const token = randomBytes(32).toString('base64url');
      await this.prisma.recoveryToken.create({
        data: {
          tokenHash: createHash('sha256').update(token).digest('hex'),
          accountId: account.id,
          expiresAt: new Date(Date.now() + SECURITY_V1.recoveryTokenMinutes * 60 * 1000),
        },
      });
    }
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-RequestRecovery',
      outcome: 'ALLOW',
      actorAccountId: account?.id ?? null,
      targetRef: username,
      reason: 'request-accepted',
    });
    return { message: AUTH_MESSAGES.recoveryRequested.text, reference: correlationId };
  }

  async confirmRecovery(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    // Atomic single-use burn: concurrent replays of one token converge here
    // and only one caller wins (count 1); losers take the generic path.
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
      return { ok: false as const, message: AUTH_MESSAGES.recoveryLinkExpired.text, reference: correlationId };
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
      return { ok: false as const, message: AUTH_MESSAGES.recoveryLinkExpired.text, reference: correlationId };
    }
    // One transaction: supersede old credentials, create the new one,
    // revoke all sessions, clear lockout. A crash can no longer leave a new
    // password beside live old sessions (violated the changed promise).
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
        // Sweep every other unused token of this account: exactly one live
        // token lineage per confirm, so earlier requests cannot linger.
        this.prisma.recoveryToken.updateMany({
          where: { accountId: account.id, usedAt: null },
          data: { usedAt: new Date() },
        }),
      ]);
    } catch {
      // Partial-unique guard (one ACTIVE credential per account/kind) or any
      // commit failure: generic reply, security audit, no state assumed.
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ConfirmRecovery',
        outcome: 'DENY',
        targetRef: row.accountId,
        reason: 'confirm-commit-failed',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false as const, message: AUTH_MESSAGES.recoveryLinkExpired.text, reference: correlationId };
    }
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-ConfirmRecovery',
      outcome: 'ALLOW',
      actorAccountId: account.id,
      targetRef: account.username,
      reason: 'password-changed-sessions-revoked',
    });
    return { ok: true as const, message: AUTH_MESSAGES.passwordChanged.text, reference: correlationId };
  }

  /**
   * Demo-only token completion (no delivery provider yet). Triple-gated:
   * never in production (NODE_ENV hard kill-switch — remove this route
   * before any shared-env merge), DEMO_MODE must be 'true', account ACTIVE.
   * Misses are audited; callers rate-limit. 404 unless all gates pass.
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
