import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IncidentInterceptor } from './incident.interceptor.js';
import { AUTH_MESSAGES } from '@sis/config';
import { CsrfGuard } from './csrf.guard.js';
import { GrantRoleDto, ResolveGrantTargetDto } from './dto.js';
import { auditAuth } from './audit.js';
import { RateLimiter } from './rate-limit.js';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';
import { PrismaService } from './prisma.service.js';
import { GrantsService } from './grants.service.js';

interface GrantRequest {
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

// ACT-IAM-001 role grants (slice 3). Authority comes from the grantor's live
// active workspace (REQ-IAM-002), never from client-sent role state.
@Controller('auth/grants')
@UseInterceptors(IncidentInterceptor)
export class GrantsController {
  constructor(
    private readonly sessions: SessionService,
    private readonly grants: GrantsService,
    private readonly prisma: PrismaService,
  ) {}

  private clientIp(request: GrantRequest): string {
    const forwarded = request.headers?.['x-forwarded-for'];
    const first = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0];
    return (request.ip ?? first ?? 'unknown').trim();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(CsrfGuard, SessionGuard)
  async grant(
    @Body() body: GrantRoleDto,
    @Req() req: GrantRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `grant:${req.auth?.accountId}:${ip}`,
      RateLimiter.grantLimit().maxAttempts,
      RateLimiter.grantLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-GrantRole',
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
    const result = await this.grants.grant(
      {
        username: body.username,
        role: body.role,
        scopeType: body.scopeType,
        scopeRef: body.scopeRef,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        appointmentRef: body.appointmentRef,
        authoritySource: body.authoritySource,
        capabilities: body.capabilities,
        employmentType: body.employmentType,
        delegationLimit: body.delegationLimit,
        approverId: body.approverId,
        reason: body.reason,
        idempotencyKey: body.idempotencyKey,
      },
      {
        accountId: req.auth?.accountId ?? '',
        activeRole: req.auth?.activeRole ?? null,
        activeScope: req.auth?.scope ?? null,
      },
    );
    if (!result.ok) {
      // Authority failures are 403; validation/lookup failures stay 400 and
      // neutral so usernames never leak (enumeration resistance).
      if (result.forbidden) {
        throw new ForbiddenException({
          message: result.message,
          reference: result.reference,
        });
      }
      throw new BadRequestException({
        message: result.message,
        reference: result.reference,
      });
    }
    // Idempotent replays answer 200 with the stored receipt; fresh grants 201.
    res.status(result.replay ? HttpStatus.OK : HttpStatus.CREATED);
    return {
      assignmentId: result.assignmentId,
      message: result.message,
      reference: result.reference,
    };
  }

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async resolve(
    @Body() body: ResolveGrantTargetDto,
    @Req() req: GrantRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `grant-resolve:${req.auth?.accountId}:${ip}`,
      RateLimiter.grantResolveLimit().maxAttempts,
      RateLimiter.grantResolveLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-ResolveGrantTarget',
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
    const result = await this.grants.resolveTarget(body.username, {
      accountId: req.auth?.accountId ?? '',
      activeRole: req.auth?.activeRole ?? null,
      activeScope: req.auth?.scope ?? null,
    });
    if (!result.ok) {
      if (result.status === 403) {
        throw new ForbiddenException({
          message: result.message,
          reference: result.reference,
        });
      }
      throw new NotFoundException({
        message: result.message,
        reference: result.reference,
      });
    }
    return {
      username: result.username,
      displayName: result.displayName,
      reference: result.reference,
    };
  }
}
