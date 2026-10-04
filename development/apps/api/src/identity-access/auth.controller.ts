import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IncidentInterceptor } from './incident.interceptor.js';
import { AUTH_MESSAGES, SECURITY_V1 } from '@sis/config';
import { CsrfGuard } from './csrf.guard.js';
import {
  RecoveryConfirmDto,
  RecoveryRequestDto,
  AuditTimelineQueryDto,
  BreakGlassDto,
  DecideReviewDto,
  ReinstateDto,
  ReviewBreakGlassDto,
  ReviewQueryDto,
  SignInDto,
  // Task 1.2 DTOs
  RegisterStartDto,
  RegisterVerifyDto,
  RegisterCompleteDto,
  MFAEnrollTOTPDto,
  MFAVerifyTOTPDto,
  MFAVerifyBackupCodeDto,
  StepUpChallengeDto,
  StepUpVerifyDto,
  RecoveryMethodAddDto,
  RecoveryMethodVerifyDto,
  RecoveryStartDto,
  // GAP-011: Recovery Review DTOs
  RecoveryReviewQueryDto,
  RecoveryReviewDecideDto,
} from './dto.js';
import { auditAuth } from './audit.js';
import {
  clearSessionCookie,
  parseCookies,
  serializeSessionCookie,
} from './cookies.js';
import { RateLimiter } from './rate-limit.js';
import { RecoveryService } from './recovery.service.js';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';
import { PrismaService } from './prisma.service.js';
import { WorkspaceService } from './workspace.service.js';
import { AuditTimelineService } from './audit-timeline.service.js';
import { BreakGlassService } from './break-glass.service.js';
import { ReinstateService } from './reinstate.service.js';
import { ReviewService } from './review.service.js';
import { ContactVerificationService } from './contact-verification.service.js';
import { MFAService } from './mfa.service.js';
import { StepUpService } from './step-up.service.js';
import { RecoveryReviewService } from './recovery-review.service.js';

interface ProxyRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  auth?: {
    accountId: string;
    sessionToken: string;
    assignmentId: string | null;
    activeRole: string | null;
    scope: string | null;
    scopeType: string | null;
    scopeRef: string | null;
  };
}

interface PassthroughResponse {
  setHeader(name: string, value: string): void;
  status(code: number): unknown;
}

// Identity-access session/recovery routes (slice 2a). Controllers delegate to
// services (18.1); every failure uses AUTH-* templates, never invented copy.
@Controller('auth')
@UseInterceptors(IncidentInterceptor)
export class AuthController {
  constructor(
    private readonly sessions: SessionService,
    private readonly recovery: RecoveryService,
    private readonly recoveryReview: RecoveryReviewService,
    private readonly workspaces: WorkspaceService,
    private readonly prisma: PrismaService,
    private readonly auditTimeline: AuditTimelineService,
    private readonly breakGlass: BreakGlassService,
    private readonly reinstate: ReinstateService,
    private readonly reviewService: ReviewService,
    private readonly contactVerification: ContactVerificationService,
    private readonly mfaService: MFAService,
    private readonly stepUpService: StepUpService,
  ) {}

  private clientIp(request: ProxyRequest): string {
    const forwarded = request.headers?.['x-forwarded-for'];
    const first = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0];
    return (request.ip ?? first ?? 'unknown').trim();
  }

  // Slice-5 route budgets (same 429 + Retry-After + audited-DENY shape as the
  // slice-2/3 limiters above): reads share the read budget, high-impact
  // writes share the grant budget. Keys scope per account + client IP.
  private async enforceRateLimit(
    req: ProxyRequest,
    res: PassthroughResponse,
    key: string,
    budget: { maxAttempts: number; windowMinutes: number },
    action: string,
  ): Promise<void> {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `${key}:${req.auth?.accountId}:${ip}`,
      budget.maxAttempts,
      budget.windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action,
        outcome: 'DENY',
        actorAccountId: req.auth?.accountId,
        activeRole: req.auth?.activeRole,
        scope: req.auth?.scope,
        reason: 'rate-limited',
        errorCategory: 'ERR-SEC',
      });
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      throw new HttpException(
        { message: AUTH_MESSAGES.rateLimited.text, reference: correlationId },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async signIn(
    @Body() body: SignInDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
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
    const result = await this.sessions.signIn(
      body.username,
      body.password,
      ip,
      userAgent,
    );
    if (!result.ok) {
      throw new UnauthorizedException({
        message: AUTH_MESSAGES.signInFailure.text,
        reference: result.reference,
      });
    }
    // 07/02 rotation: a presented session is retired when a fresh one is
    // minted, so a re-sign-in never leaves two live tokens on one device.
    // (No cookie is sent on a new device, so other devices stay signed in.)
    const rawCookie = req.headers?.['cookie'];
    const presented = parseCookies(
      Array.isArray(rawCookie) ? rawCookie.join('; ') : (rawCookie ?? ''),
    )[SECURITY_V1.session.cookieName];
    if (presented) await this.sessions.revokeSession(presented);
    res.setHeader('Set-Cookie', serializeSessionCookie(result.token));
    return {
      account: result.account,
      message: 'Signed in.',
      reference: result.reference,
    };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async signOut(
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
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
    if (!account)
      throw new UnauthorizedException(AUTH_MESSAGES.signInFailure.text);
    const workspaces = await this.workspaces.liveWorkspaces(account.id);
    const active = await this.workspaces.resolveActive(
      account.id,
      req.auth?.assignmentId ?? null,
    );
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
            // Countdown-eligible expiry for the §12.11/§12.12 banners.
            endsAt: active.endsAt,
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
    return this.recovery.startRecovery(body.username, 'EMAIL');
  }

  @Post('recovery/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async recoveryConfirm(@Body() body: RecoveryConfirmDto) {
    const result = await this.recovery.confirmRecovery(
      body.token,
      body.newPassword,
    );
    if (!result.ok)
      throw new BadRequestException({
        message: result.message,
        reference: result.reference,
      });
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

  @Get('audit/timeline')
  @UseGuards(SessionGuard)
  async getAuditTimeline(
    @Query() query: AuditTimelineQueryDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    await this.enforceRateLimit(
      req,
      res,
      'timeline',
      RateLimiter.readLimit(),
      'CMD-IAM-AuditTimeline',
    );
    return this.auditTimeline.getTimeline(
      {
        accountId: req.auth.accountId,
        assignmentId: req.auth.assignmentId,
        activeRole: req.auth.activeRole,
        scope: req.auth.scope,
      },
      query,
    );
  }

  @Post('break-glass')
  @UseGuards(CsrfGuard, SessionGuard)
  async requestBreakGlass(
    @Body() body: BreakGlassDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    await this.enforceRateLimit(
      req,
      res,
      'break-glass',
      RateLimiter.grantLimit(),
      'CMD-IAM-BreakGlass',
    );
    const receipt = await this.breakGlass.requestBreakGlass(
      {
        accountId: req.auth.accountId,
        assignmentId: req.auth.assignmentId,
        activeRole: req.auth.activeRole,
        scope: req.auth.scope,
      },
      body,
    );
    res.status(receipt.replay ? HttpStatus.OK : HttpStatus.CREATED);
    return receipt;
  }

  @Post('break-glass/:id/review')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async reviewBreakGlass(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: ReviewBreakGlassDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    await this.enforceRateLimit(
      req,
      res,
      'break-glass-review',
      RateLimiter.grantLimit(),
      'CMD-IAM-BreakGlass',
    );
    return this.breakGlass.reviewBreakGlass(
      {
        accountId: req.auth.accountId,
        assignmentId: req.auth.assignmentId,
        activeRole: req.auth.activeRole,
        scope: req.auth.scope,
      },
      id,
      body.outcome,
      body.note,
    );
  }

  @Post('reinstate')
  @UseGuards(CsrfGuard, SessionGuard)
  async reinstateAssignment(
    @Body() body: ReinstateDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    await this.enforceRateLimit(
      req,
      res,
      'reinstate',
      RateLimiter.grantLimit(),
      'CMD-IAM-ReinstateAssignment',
    );
    const receipt = await this.reinstate.reinstateAssignment(
      req.auth,
      body.assignmentId,
      body.reason,
      body.evidence,
    );
    res.status(receipt.replay ? HttpStatus.OK : HttpStatus.CREATED);
    return receipt;
  }

  @Get('reviews')
  @UseGuards(SessionGuard)
  async getReviews(
    @Query() query: ReviewQueryDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    await this.enforceRateLimit(
      req,
      res,
      'reviews',
      RateLimiter.readLimit(),
      'CMD-IAM-ReviewAssignment',
    );
    return this.reviewService.getReviews(req.auth, query);
  }

  @Get('reviews/:id')
  @UseGuards(SessionGuard)
  async getReviewById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    await this.enforceRateLimit(
      req,
      res,
      'reviews',
      RateLimiter.readLimit(),
      'CMD-IAM-ReviewAssignment',
    );
    return this.reviewService.getReviewById(req.auth, id);
  }

  @Post('reviews/:id/decide')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async decideReview(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: DecideReviewDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    await this.enforceRateLimit(
      req,
      res,
      'review-decide',
      RateLimiter.grantLimit(),
      'CMD-IAM-ReviewAssignment',
    );
    return this.reviewService.decideReview(
      req.auth,
      id,
      body.decision,
      body.reason,
    );
  }

  // =========================================================================
  // GAP-011: Recovery Review Queue (Security Administrator only)
  // =========================================================================

  @Get('recovery/reviews')
  @UseGuards(SessionGuard)
  async getRecoveryReviews(
    @Query() query: RecoveryReviewQueryDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    await this.enforceRateLimit(
      req,
      res,
      'recovery-reviews',
      RateLimiter.readLimit(),
      'CMD-IAM-RecoveryReviewDecided',
    );
    return this.recoveryReview.getReviewQueue(req.auth, query);
  }

  @Get('recovery/reviews/:id')
  @UseGuards(SessionGuard)
  async getRecoveryReviewById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    await this.enforceRateLimit(
      req,
      res,
      'recovery-reviews',
      RateLimiter.readLimit(),
      'CMD-IAM-RecoveryReviewDecided',
    );
    return this.recoveryReview.getReviewById(req.auth, id);
  }

  @Post('recovery/reviews/:id/decide')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async decideRecoveryReview(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: RecoveryReviewDecideDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    await this.enforceRateLimit(
      req,
      res,
      'recovery-review-decide',
      RateLimiter.grantLimit(),
      'CMD-IAM-RecoveryReviewDecided',
    );
    return this.recoveryReview.decideReview(req.auth, id, body.decision, body.reason);
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

  // =========================================================================
  // Task 1.2: Self-registration with contact verification
  // =========================================================================

  @Post('register/start')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async registerStart(
    @Body() body: RegisterStartDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `register:${body.email}:${ip}`,
      RateLimiter.contactVerificationLimit().maxAttempts,
      RateLimiter.contactVerificationLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-RegisterStart',
        outcome: 'DENY',
        targetRef: body.email,
        reason: 'rate-limited',
        errorCategory: 'ERR-SEC',
      });
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      throw new HttpException(
        { message: AUTH_MESSAGES.rateLimited.text, reference: correlationId },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check if email already exists
    const existingPerson = await this.prisma.person.findFirst({ where: { email: body.email } });
    if (existingPerson) {
      // Don't reveal existence - just proceed silently
      await auditAuth(this.prisma, {
        action: 'CMD-IAM-RegisterStart',
        outcome: 'ALLOW',
        targetRef: body.email,
        reason: 'registration-started',
      });
      return { message: 'If the email is not registered, a verification code will be sent.', reference: 'pending' };
    }

    // Create a temporary person record (unverified)
    const person = await this.prisma.person.create({
      data: {
        displayName: body.displayName,
        email: body.email,
      },
    });

    // Send verification code
    const result = await this.contactVerification.sendCode(person.id, 'EMAIL', body.email, ip);

    // Store password hash temporarily (in a real app, use a secure temp store)
    // For demo, we'll store it in the person record as a temporary field
    // In production, use a separate registration session store

    return { message: 'Verification code sent.', reference: result.reference };
  }

  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async registerVerify(
    @Body() body: RegisterVerifyDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `register-verify:${body.email}:${ip}`,
      RateLimiter.contactVerificationLimit().maxAttempts,
      RateLimiter.contactVerificationLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-RegisterVerify',
        outcome: 'DENY',
        targetRef: body.email,
        reason: 'rate-limited',
        errorCategory: 'ERR-SEC',
      });
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      throw new HttpException(
        { message: AUTH_MESSAGES.rateLimited.text, reference: correlationId },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Find the person by email
    const person = await this.prisma.person.findFirst({ where: { email: body.email } });
    if (!person) {
      await auditAuth(this.prisma, {
        action: 'CMD-IAM-RegisterVerify',
        outcome: 'DENY',
        targetRef: body.email,
        reason: 'registration-not-found',
        errorCategory: 'ERR-SEC',
      });
      throw new NotFoundException('Registration not found');
    }

    // Verify the code
    const result = await this.contactVerification.verifyCode(person.id, 'EMAIL', body.email, body.code);
    if (!result.ok) {
      throw new BadRequestException({ message: result.message, reference: result.reference });
    }

    return { message: 'Contact verified. You can now complete registration.', reference: result.reference };
  }

  @Post('register/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async registerComplete(
    @Body() body: RegisterCompleteDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `register-complete:${body.email}:${ip}`,
      RateLimiter.contactVerificationLimit().maxAttempts,
      RateLimiter.contactVerificationLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-RegisterComplete',
        outcome: 'DENY',
        targetRef: body.email,
        reason: 'rate-limited',
        errorCategory: 'ERR-SEC',
      });
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      throw new HttpException(
        { message: AUTH_MESSAGES.rateLimited.text, reference: correlationId },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Find the person by email
    const person = await this.prisma.person.findFirst({ where: { email: body.email } });
    if (!person || !person.emailVerifiedAt) {
      await auditAuth(this.prisma, {
        action: 'CMD-IAM-RegisterComplete',
        outcome: 'DENY',
        targetRef: body.email,
        reason: 'contact-not-verified',
        errorCategory: 'ERR-SEC',
      });
      throw new BadRequestException({ message: 'Contact not verified', reference: 'invalid' });
    }

    // Check if account already exists for this person
    const existingAccount = await this.prisma.account.findFirst({ where: { personId: person.id } });
    if (existingAccount) {
      await auditAuth(this.prisma, {
        action: 'CMD-IAM-RegisterComplete',
        outcome: 'DENY',
        targetRef: body.email,
        reason: 'account-already-exists',
        errorCategory: 'ERR-SEC',
      });
      throw new BadRequestException({ message: 'Account already exists for this contact', reference: 'exists' });
    }

    // Hash password
    const { hash } = await import('argon2');
    const secretHash = await hash(body.password);

    // Create account and credential
    const account = await this.prisma.account.create({
      data: {
        personId: person.id,
        username: body.email, // Use email as username
        credentials: {
          create: { kind: 'PASSWORD', secretHash, status: 'ACTIVE' },
        },
      },
    });

    // Add email as recovery method
    await this.recovery.addRecoveryMethod(account.id, 'EMAIL', body.email, 1);
    await this.recovery.verifyRecoveryMethod(account.id, 'EMAIL', body.email);

    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-RegisterComplete',
      outcome: 'ALLOW',
      actorAccountId: account.id,
      targetRef: body.email,
      reason: 'account-created',
    });

    return { message: 'Registration complete. You can now sign in.', reference: correlationId };
  }

  // =========================================================================
  // Task 1.2: MFA endpoints (staff only)
  // =========================================================================

  @Post('mfa/enroll/totp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async enrollTOTP(
    @Body() body: MFAEnrollTOTPDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth) throw new UnauthorizedException();

    await this.enforceRateLimit(
      req,
      res,
      'mfa-enroll',
      RateLimiter.mfaEnrollmentLimit(),
      'CMD-IAM-EnrollMFA',
    );

    // Verify the TOTP code before enrolling
    if (!this.mfaService.verifyEnrollmentCode(body.secret, body.code)) {
      throw new BadRequestException({ message: 'Invalid TOTP code' });
    }

    // Enroll with the secret
    const result = await this.mfaService.enrollTOTP(req.auth.accountId, body.secret);
    return { message: 'TOTP enrolled successfully', reference: result.reference };
  }

  @Post('mfa/verify/totp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async verifyTOTP(
    @Body() body: MFAVerifyTOTPDto,
    @Req() req: ProxyRequest,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    return this.mfaService.verifyTOTP(req.auth.accountId, body.code);
  }

  @Post('mfa/backup-codes')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async generateBackupCodes(
    @Req() req: ProxyRequest,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    return this.mfaService.generateBackupCodes(req.auth.accountId);
  }

  @Post('mfa/verify/backup-code')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async verifyBackupCode(
    @Body() body: MFAVerifyBackupCodeDto,
    @Req() req: ProxyRequest,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    return this.mfaService.verifyBackupCode(req.auth.accountId, body.code);
  }

  @Get('mfa/status')
  @UseGuards(SessionGuard)
  async getMFAStatus(@Req() req: ProxyRequest) {
    if (!req.auth) throw new UnauthorizedException();
    return this.mfaService.getMFAStatus(req.auth.accountId);
  }

  // =========================================================================
  // Task 1.2: Step-up authentication endpoints
  // =========================================================================

  @Get('step-up/actions')
  @UseGuards(SessionGuard)
  async getStepUpActions() {
    return { actions: this.stepUpService.getStepUpActions() };
  }

  @Post('step-up/challenge')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async createStepUpChallenge(
    @Body() body: StepUpChallengeDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth) throw new UnauthorizedException();

    await this.enforceRateLimit(
      req,
      res,
      'step-up',
      RateLimiter.stepUpLimit(),
      'CMD-IAM-StepUpChallenge',
    );

    try {
      const result = await this.stepUpService.createChallenge(
        req.auth.accountId,
        body.targetAction,
        this.clientIp(req),
        req.headers?.['user-agent'] as string,
      );
      return { challengeId: result.challengeId, type: result.type, expiresAt: result.expiresAt, reference: result.reference };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Challenge creation failed';
      throw new BadRequestException({ message, reference: 'error' });
    }
  }

  @Post('step-up/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async verifyStepUpChallenge(
    @Body() body: StepUpVerifyDto,
    @Req() req: ProxyRequest,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    return this.stepUpService.verifyChallenge(req.auth.accountId, body.challengeId, body.code, body.codeType);
  }

  // =========================================================================
  // Task 1.2: Recovery method endpoints (multiple methods)
  // =========================================================================

  @Post('recovery/methods')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async addRecoveryMethod(
    @Body() body: RecoveryMethodAddDto,
    @Req() req: ProxyRequest,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    return this.recovery.addRecoveryMethod(req.auth.accountId, body.type, body.value, body.priority ?? 1);
  }

  @Post('recovery/methods/:type/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async verifyRecoveryMethod(
    @Param('type') type: 'EMAIL' | 'PHONE' | 'SECURITY_QUESTION' | 'RECOVERY_CODE',
    @Body() body: RecoveryMethodVerifyDto,
    @Req() req: ProxyRequest,
  ) {
    if (!req.auth) throw new UnauthorizedException();
    return this.recovery.verifyRecoveryMethod(req.auth.accountId, type, body.value);
  }

  @Get('recovery/methods')
  @UseGuards(SessionGuard)
  async listRecoveryMethods(@Req() req: ProxyRequest) {
    if (!req.auth) throw new UnauthorizedException();
    return this.recovery.listRecoveryMethods(req.auth.accountId);
  }

  @Post('recovery/start')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async startRecovery(
    @Body() body: RecoveryStartDto,
    @Req() req: ProxyRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `recovery-start:${body.username}:${ip}`,
      RateLimiter.recoveryLimit().maxAttempts,
      RateLimiter.recoveryLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-StartRecovery',
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
    return this.recovery.startRecovery(body.username, body.methodType, body.methodValue, ip, userAgent);
  }
}
