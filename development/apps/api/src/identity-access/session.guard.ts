import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AUTH_MESSAGES, SECURITY_V1 } from '@sis/config';
import { parseCookies } from './cookies.js';
import { SessionService } from './session.service.js';

// Rejects missing/invalid/expired sessions with the generic approved message.
// Active assignment resolution arrives with slice 3 (workspace switch).
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = parseCookies(request.headers?.cookie)[SECURITY_V1.session.cookieName];
    if (!token) throw new UnauthorizedException(AUTH_MESSAGES.signInFailure.text);
    const accountId = await this.sessions.validateSession(token);
    if (!accountId) throw new UnauthorizedException(AUTH_MESSAGES.signInFailure.text);
    request.auth = { accountId, sessionToken: token };
    return true;
  }
}
