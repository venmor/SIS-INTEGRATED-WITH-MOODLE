import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AUTH_MESSAGES, SECURITY_V1 } from '@sis/config';
import { auditAuth } from './audit.js';
import { parseCookies } from './cookies.js';
import { PrismaService } from './prisma.service.js';
import { SessionService } from './session.service.js';

// Rejects missing/invalid/expired sessions with the generic approved message.
// Resolves the live active assignment per request (slice 3): authority is
// always evaluated from the active role and scope (REQ-IAM-002), never from
// client-sent role state. Rejections are audited (slice 4: denied sensitive
// access is logged); tokens never enter audit rows.
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const raw = request.headers?.cookie;
    const token = parseCookies(Array.isArray(raw) ? raw.join('; ') : raw)[SECURITY_V1.session.cookieName];
    if (!token) {
      await auditAuth(this.prisma, {
        action: 'CMD-IAM-Guard',
        outcome: 'DENY',
        reason: 'missing-session',
        errorCategory: 'ERR-SEC',
      });
      throw new UnauthorizedException(AUTH_MESSAGES.signInFailure.text);
    }
    const session = await this.sessions.validateSession(token);
    if (!session) {
      await auditAuth(this.prisma, {
        action: 'CMD-IAM-Guard',
        outcome: 'DENY',
        reason: 'invalid-session',
        errorCategory: 'ERR-SEC',
      });
      throw new UnauthorizedException(AUTH_MESSAGES.signInFailure.text);
    }
    request.auth = {
      accountId: session.accountId,
      sessionToken: token,
      assignmentId: session.assignmentId,
      activeRole: session.assignment?.role ?? null,
      scope: session.assignment ? `${session.assignment.scopeType}:${session.assignment.scopeRef}` : null,
    };
    return true;
  }
}
