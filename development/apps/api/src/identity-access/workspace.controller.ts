import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
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
export class WorkspaceController {
  constructor(
    private readonly sessions: SessionService,
    private readonly workspaces: WorkspaceService,
    private readonly prisma: PrismaService,
  ) {}

  private clientIp(request: WorkspaceRequest): string {
    const forwarded = request.headers?.['x-forwarded-for'];
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
    return (request.ip ?? first ?? 'unknown').trim();
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
    const result = await this.workspaces.switchWorkspace(req.auth?.sessionToken ?? '', body.assignmentId);
    if (!result.ok) throw new BadRequestException({ message: result.message, reference: result.reference });
    return { activeWorkspace: result.workspace, message: result.message, reference: result.reference };
  }
}
