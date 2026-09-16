import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AUTH_MESSAGES, SECURITY_V1 } from '@sis/config';
import { CsrfGuard } from './csrf.guard.js';
import { RecoveryConfirmDto, RecoveryRequestDto, SignInDto } from './dto.js';
import { auditAuth } from './audit.js';
import { clearSessionCookie, parseCookies, serializeSessionCookie } from './cookies.js';
import { RateLimiter } from './rate-limit.js';
import { RecoveryService } from './recovery.service.js';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';
import { PrismaService } from './prisma.service.js';
import { WorkspaceService } from './workspace.service.js';

interface ProxyRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  auth?: {
    accountId: string;
    sessionToken: string;
    assignmentId: string | null;
    activeRole: string | null;
    scope: string | null;
  };
}

interface PassthroughResponse {
  setHeader(name: string, value: string): void;
}

// Identity-access session/recovery routes (slice 2a). Controllers delegate to
// services (18.1); every failure uses AUTH-* templates, never invented copy.
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessions: SessionService,
    private readonly recovery: RecoveryService,
    private readonly workspaces: WorkspaceService,
    private readonly prisma: PrismaService,
  ) {}

  private clientIp(request: ProxyRequest): string {
    const forwarded = request.headers?.['x-forwarded-for'];
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
    return (request.ip ?? first ?? 'unknown').trim();
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async signIn(@Body() body: SignInDto, @Req() req: ProxyRequest, @Res({ passthrough: true }) res: PassthroughResponse) {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `signin:${body.username}:${ip}`,
      RateLimiter.signInLimit().maxAttempts,
      RateLimiter.signInLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-SignIn',
        outcome: 'DENY',
        targetRef: body.username,
        reason: 'rate-limited',
        errorCategory: 'ERR-SEC',
      });
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      throw new HttpException(
        { message: AUTH_MESSAGES.rateLimited.text, reference: correlationId },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const headerAgent = req.headers?.['user-agent'];
    const userAgent = Array.isArray(headerAgent) ? headerAgent[0] : headerAgent;
    const result = await this.sessions.signIn(body.username, body.password, ip, userAgent);
    if (!result.ok) {
      throw new UnauthorizedException({ message: AUTH_MESSAGES.signInFailure.text, reference: result.reference });
    }
    // 07/02 rotation: a presented session is retired when a fresh one is
    // minted, so a re-sign-in never leaves two live tokens on one device.
    // (No cookie is sent on a new device, so other devices stay signed in.)
    const rawCookie = req.headers?.['cookie'];
    const presented = parseCookies(Array.isArray(rawCookie) ? rawCookie.join('; ') : (rawCookie ?? ''))[
      SECURITY_V1.session.cookieName
    ];
    if (presented) await this.sessions.revokeSession(presented);
    res.setHeader('Set-Cookie', serializeSessionCookie(result.token));
    return { account: result.account, message: 'Signed in.', reference: result.reference };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async signOut(@Req() req: ProxyRequest, @Res({ passthrough: true }) res: PassthroughResponse) {
    await this.sessions.revokeSession(req.auth?.sessionToken ?? '');
    res.setHeader('Set-Cookie', clearSessionCookie());
    return { message: AUTH_MESSAGES.signedOut.text };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Req() req: ProxyRequest) {
    // Account deleted mid-session: generic 401, never a 500 leak.
    const account = await this.prisma.account.findUnique({
      where: { id: req.auth?.accountId ?? '' },
      include: { person: true },
    });
    if (!account) throw new UnauthorizedException(AUTH_MESSAGES.signInFailure.text);
    const workspaces = await this.workspaces.liveWorkspaces(account.id);
    const active = await this.workspaces.resolveActive(account.id, req.auth?.assignmentId ?? null);
    return {
      account: {
        accountId: account.id,
        personId: account.personId,
        username: account.username,
        displayName: account.person.displayName,
      },
      workspaces,
      activeWorkspace: active
        ? {
            assignmentId: active.assignmentId,
            role: active.role,
            scopeType: active.scopeType,
            scopeRef: active.scopeRef,
          }
        : null,
    };
  }

  @Post('recovery/request')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async recoveryRequest(
    @Body() body: RecoveryRequestDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `recovery:${body.username}:${ip}`,
      RateLimiter.recoveryLimit().maxAttempts,
      RateLimiter.recoveryLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-RequestRecovery',
        outcome: 'DENY',
        targetRef: body.username,
        reason: 'rate-limited',
        errorCategory: 'ERR-SEC',
      });
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      throw new HttpException(
        { message: AUTH_MESSAGES.rateLimited.text, reference: correlationId },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.recovery.requestRecovery(body.username);
  }

  @Post('recovery/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async recoveryConfirm(@Body() body: RecoveryConfirmDto) {
    const result = await this.recovery.confirmRecovery(body.token, body.newPassword);
    if (!result.ok) throw new BadRequestException({ message: result.message, reference: result.reference });
    return { message: result.message, reference: result.reference };
  }

  @Get('demo/recovery-token')
  async demoToken(
    @Query('username') username: string,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `demo:${username}:${ip}`,
      RateLimiter.recoveryLimit().maxAttempts,
      RateLimiter.recoveryLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-RequestRecovery',
        outcome: 'DENY',
        targetRef: username,
        reason: 'rate-limited',
        errorCategory: 'ERR-SEC',
      });
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      throw new HttpException(
        { message: AUTH_MESSAGES.rateLimited.text, reference: correlationId },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const result = await this.recovery.demoToken(username);
    if (!result) {
      await auditAuth(this.prisma, {
        action: 'CMD-IAM-RequestRecovery',
        outcome: 'DENY',
        targetRef: username,
        reason: 'demo-token-unavailable',
        errorCategory: 'ERR-SEC',
      });
      throw new NotFoundException();
    }
    return result;
  }

  @Get('policy')
  policy() {
    // Demo-visible policy facts only — proves UI renders policy from config,
    // never hardcoded minimums (UI-FIELD-003).
    return {
      passwordMinLength: SECURITY_V1.passwordPolicy.minLength,
      passwordGuidance: SECURITY_V1.passwordPolicy.guidance,
      recoveryTokenMinutes: SECURITY_V1.recoveryTokenMinutes,
    };
  }
}
