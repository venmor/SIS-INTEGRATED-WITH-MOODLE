import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { createRequire } from 'node:module';
import { AUTH_MESSAGES, SECURITY_V1 } from '@sis/config';
import { PrismaService } from './prisma.service.js';
import { RateLimiter } from './rate-limit.js';
import { auditAuth } from './audit.js';

const require = createRequire(import.meta.url);
const { hash, verify } = require('argon2') as typeof import('argon2');

// Unknown-user sign-ins burn one real argon2 verification so failure timing
// matches a real check (enumeration resistance, REQ-IAM-006).
let dummyHash: string | null = null;
async function dummyVerify(password: string): Promise<void> {
  if (!dummyHash) dummyHash = await hash('dummy-canary-never-a-real-password');
  await verify(dummyHash, password).catch(() => undefined);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class SessionService {
  readonly limiter = new RateLimiter();

  constructor(private readonly prisma: PrismaService) {}

  async signIn(username: string, password: string, ip: string | undefined, userAgent: string | undefined) {
    const account = await this.prisma.account.findUnique({ where: { username } });
    if (!account || account.status !== 'ACTIVE') {
      await dummyVerify(password);
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-SignIn',
        outcome: 'DENY',
        targetRef: username,
        reason: 'invalid-credentials-or-inactive',
        errorCategory: 'ERR-SEC',
      });
      await sleep(RateLimiter.failureDelayMs(1));
      return { ok: false as const, failures: 1, reference: correlationId };
    }
    if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-SignIn',
        outcome: 'DENY',
        actorAccountId: account.id,
        targetRef: username,
        reason: 'account-locked',
        errorCategory: 'ERR-SEC',
      });
      await sleep(RateLimiter.failureDelayMs(account.failedSignInCount));
      return { ok: false as const, failures: account.failedSignInCount, reference: correlationId };
    }
    const credential = await this.prisma.credential.findFirst({
      where: { accountId: account.id, kind: 'PASSWORD', status: 'ACTIVE' },
    });
    const valid = credential ? await verify(credential.secretHash, password).catch(() => false) : false;
    if (!valid) {
      const failures = account.failedSignInCount + 1;
      const locked =
        failures >= SECURITY_V1.lockout.failuresBeforeLock
          ? new Date(Date.now() + SECURITY_V1.lockout.lockMinutes * 60 * 1000)
          : null;
      await this.prisma.account.update({
        where: { id: account.id },
        data: { failedSignInCount: failures, lockedUntil: locked },
      });
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-SignIn',
        outcome: 'DENY',
        actorAccountId: account.id,
        targetRef: username,
        reason: locked ? 'account-locked' : 'invalid-credentials',
        errorCategory: 'ERR-SEC',
      });
      await sleep(RateLimiter.failureDelayMs(failures));
      return { ok: false as const, failures, reference: correlationId };
    }
    await this.prisma.account.update({
      where: { id: account.id },
      data: { failedSignInCount: 0, lockedUntil: null },
    });
    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    await this.prisma.session.create({
      data: {
        tokenHash: hashToken(token),
        accountId: account.id,
        expiresAt: new Date(now.getTime() + SECURITY_V1.session.absoluteSeconds * 1000),
        createdIp: ip,
        userAgent,
        lastSeenAt: now,
      },
    });
    const person = await this.prisma.person.findUniqueOrThrow({ where: { id: account.personId } });
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-SignIn',
      outcome: 'ALLOW',
      actorAccountId: account.id,
      targetRef: username,
    });
    return {
      ok: true as const,
      token,
      reference: correlationId,
      account: {
        accountId: account.id,
        personId: account.personId,
        username: account.username,
        displayName: person.displayName,
      },
    };
  }

  /**
   * REQ-IAM-005 re-auth enforcement point (named here; slices 4+ call it).
   * Privileged/high-impact actions must pass validateSession AND step-up proof
   * (a fresh sign-in or a recovery token — recovery confirm already gates
   * credential change on the single-use token plus session kill). Returns the
   * account id for a live session, else null. Sliding idle window.
   */
  async validateSession(token: string): Promise<string | null> {
    const session = await this.prisma.session.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!session || session.revokedAt) return null;
    const now = Date.now();
    if (session.expiresAt.getTime() <= now) return null;
    if (now - session.lastSeenAt.getTime() > SECURITY_V1.session.idleSeconds * 1000) return null;
    if (now - session.lastSeenAt.getTime() > 60 * 1000) {
      await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
    }
    return session.accountId;
  }

  async revokeSession(token: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(accountId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  failureMessage(): string {
    return AUTH_MESSAGES.signInFailure.text;
  }
}
