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
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IncidentInterceptor } from './incident.interceptor.js';
import { AUTH_MESSAGES } from '@sis/config';
import { CsrfGuard } from './csrf.guard.js';
import { SwitchWorkspaceDto } from './dto.js';
import { auditAuth } from './audit.js';
import { RateLimiter } from './rate-limit.js';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';
import { PrismaService } from './prisma.service.js';
import { WorkspaceService } from './workspace.service.js';

interface WorkspaceRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  auth?: { accountId: string; sessionToken: string };
}

interface PassthroughResponse {
  setHeader(name: string, value: string): void;
}

// Workspace switching (slice 3, REQ-IAM-002). Every failure uses templates,
// never invented copy; every outcome is audited with a surfaced reference.
@Controller('auth/workspace')
@UseInterceptors(IncidentInterceptor)
export class WorkspaceController {
  constructor(
    private readonly sessions: SessionService,
    private readonly workspaces: WorkspaceService,
    private readonly prisma: PrismaService,
  ) {}

  private clientIp(request: WorkspaceRequest): string {
    const forwarded = request.headers?.['x-forwarded-for'];
    const first = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0];
    return (request.ip ?? first ?? 'unknown').trim();
  }

  // Slice-5 read budgets (same 429 + Retry-After + audited-DENY shape as the
  // switch limiter above). Keys scope per account + client IP.
  private async enforceRateLimit(
    req: WorkspaceRequest,
    res: PassthroughResponse,
    key: string,
    action: string,
  ): Promise<void> {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `${key}:${req.auth?.accountId}:${ip}`,
      RateLimiter.readLimit().maxAttempts,
      RateLimiter.readLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action,
        outcome: 'DENY',
        actorAccountId: req.auth?.accountId,
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

  @Post('switch')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async switch(
    @Body() body: SwitchWorkspaceDto,
    @Req() req: WorkspaceRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `switch:${req.auth?.accountId}:${ip}`,
      RateLimiter.workspaceSwitchLimit().maxAttempts,
      RateLimiter.workspaceSwitchLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-SwitchWorkspace',
        outcome: 'DENY',
        actorAccountId: req.auth?.accountId,
        targetRef: body.assignmentId,
        reason: 'rate-limited',
        errorCategory: 'ERR-SEC',
      });
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      throw new HttpException(
        { message: AUTH_MESSAGES.rateLimited.text, reference: correlationId },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const result = await this.workspaces.switchWorkspace(
      req.auth?.sessionToken ?? '',
      body.assignmentId,
    );
    if (!result.ok)
      throw new BadRequestException({
        message: result.message,
        reference: result.reference,
      });
    return {
      activeWorkspace: result.workspace,
      message: result.message,
      reference: result.reference,
    };
  }

  // Expiry warnings are strictly scoped: a caller sees only warnings for
  // their own assignments, with the assignment facts needed for the §12.12
  // countdown banner. Foreign ids answer 404 (never 403-oracle).
  @Get('expiry-warnings')
  @UseGuards(SessionGuard)
  async getExpiryWarnings(
    @Req() req: WorkspaceRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth?.accountId) return [];
    await this.enforceRateLimit(req, res, 'warnings', 'CMD-IAM-ExpiryWarnings');
    const mine = await this.prisma.roleAssignment.findMany({
      where: { accountId: req.auth.accountId },
      select: {
        id: true,
        role: true,
        scopeType: true,
        scopeRef: true,
        endsAt: true,
      },
    });
    const byId = new Map(mine.map((a) => [a.id, a]));
    const warnings = await this.prisma.expiryWarning.findMany({
      where: { assignmentId: { in: [...byId.keys()] }, acknowledgedAt: null },
      orderBy: { warnedAt: 'desc' },
    });
    return warnings.flatMap((w) => {
      const assignment = byId.get(w.assignmentId);
      if (!assignment) return [];
      return [
        {
          id: w.id,
          assignmentId: w.assignmentId,
          warnedAt: w.warnedAt,
          endsAt: assignment.endsAt,
          role: assignment.role,
          scopeType: assignment.scopeType,
          scopeRef: assignment.scopeRef,
        },
      ];
    });
  }

  @Post('expiry-warnings/:id/ack')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, SessionGuard)
  async acknowledgeWarning(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: WorkspaceRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    if (!req.auth?.accountId) throw new BadRequestException();
    await this.enforceRateLimit(
      req,
      res,
      'warnings-ack',
      'CMD-IAM-ExpiryWarnings',
    );
    const mine = await this.prisma.roleAssignment.findMany({
      where: { accountId: req.auth.accountId },
      select: { id: true },
    });
    // Tolerant ack: repeat acknowledgements stay 200 (no error swell on
    // double-click); unknown or foreign ids stay 404 (no oracle).
    const warning = await this.prisma.expiryWarning.findFirst({
      where: { id, assignmentId: { in: mine.map((a) => a.id) } },
    });
    if (!warning) throw new NotFoundException();
    await this.prisma.expiryWarning.updateMany({
      where: { id: warning.id, acknowledgedAt: null },
      data: { acknowledgedAt: new Date() },
    });
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-ExpiryWarnings',
      outcome: 'ALLOW',
      actorAccountId: req.auth?.accountId,
      targetRef: warning.assignmentId,
      reason: 'warning-acknowledged',
      purpose: 'expiry-warning',
    });
    return { message: 'Warning acknowledged', reference: correlationId };
  }
}
