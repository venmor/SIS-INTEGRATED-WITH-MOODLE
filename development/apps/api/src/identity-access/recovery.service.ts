import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { createRequire } from 'node:module';
import { AUTH_MESSAGES, SECURITY_V1 } from '@sis/config';
import { PrismaService } from './prisma.service.js';
import { auditAuth } from './audit.js';

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
    if (account && account.status === 'ACTIVE') {
      await this.prisma.recoveryToken.updateMany({
        where: { accountId: account.id, usedAt: null },
        data: { usedAt: new Date() },
      });
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

  async confirmRecovery(token: string, newPassword: string, sessionService: { revokeAllSessions(id: string): Promise<void> }) {
    const row = await this.prisma.recoveryToken.findUnique({
      where: { tokenHash: createHash('sha256').update(token).digest('hex') },
    });
    if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
      if (row && !row.usedAt) {
        await this.prisma.recoveryToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
      }
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ConfirmRecovery',
        outcome: 'DENY',
        targetRef: row?.accountId,
        reason: 'invalid-or-expired-token',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false as const, message: AUTH_MESSAGES.recoveryLinkExpired.text, reference: correlationId };
    }
    const account = await this.prisma.account.findUnique({ where: { id: row.accountId } });
    if (!account || account.status !== 'ACTIVE') {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ConfirmRecovery',
        outcome: 'DENY',
        targetRef: row.accountId,
        reason: 'account-inactive',
        errorCategory: 'ERR-SEC',
      });
      return { ok: false as const, message: AUTH_MESSAGES.recoveryLinkExpired.text, reference: correlationId };
    }
    await this.prisma.recoveryToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    await this.prisma.credential.updateMany({
      where: { accountId: account.id, kind: 'PASSWORD', status: 'ACTIVE' },
      data: { status: 'SUPERSEDED', supersededAt: new Date() },
    });
    await this.prisma.credential.create({
      data: { accountId: account.id, kind: 'PASSWORD', secretHash: await hash(newPassword), status: 'ACTIVE' },
    });
    await sessionService.revokeAllSessions(account.id);
    await this.prisma.account.update({
      where: { id: account.id },
      data: { failedSignInCount: 0, lockedUntil: null },
    });
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-ConfirmRecovery',
      outcome: 'ALLOW',
      actorAccountId: account.id,
      targetRef: account.username,
      reason: 'password-changed-sessions-revoked',
    });
    return { ok: true as const, message: AUTH_MESSAGES.passwordChanged.text, reference: correlationId };
  }

  /** Demo-only token completion (no delivery provider yet). 404 unless DEMO_MODE. */
  async demoToken(username: string): Promise<{ token: string; expiresAt: Date } | null> {
    if (process.env.DEMO_MODE !== 'true') return null;
    const account = await this.prisma.account.findUnique({ where: { username } });
    if (!account || account.status !== 'ACTIVE') return null;
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
