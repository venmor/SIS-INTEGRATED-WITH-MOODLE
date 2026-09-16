import { Controller, Get, HttpException, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Req, Res, UseGuards } from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import { SessionGuard } from './session.guard.js';
import { PrismaService } from './prisma.service.js';
import { RateLimiter } from './rate-limit.js';
import { SessionService } from './session.service.js';
import { auditAuth } from './audit.js';

interface CommandRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  auth?: { accountId: string; sessionToken: string };
}

interface PassthroughResponse {
  setHeader(name: string, value: string): void;
}

// Uncertain-outcome receipts (UI-SUBMIT-001 step 5): after a connection loss,
// the client checks the stored receipt by idempotency key before retrying.
// Scoped to the requester's own account; misses stay neutral.
@Controller('auth/commands')
export class CommandsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  private clientIp(request: CommandRequest): string {
    const forwarded = request.headers?.['x-forwarded-for'];
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
    return (request.ip ?? first ?? 'unknown').trim();
  }

  @Get(':key')
  @UseGuards(SessionGuard)
  async receipt(
    @Param('key', new ParseUUIDPipe({ version: '4' })) key: string,
    @Req() req: CommandRequest,
    @Res({ passthrough: true }) res: PassthroughResponse,
  ) {
    const ip = this.clientIp(req);
    const limit = this.sessions.limiter.check(
      `receipt:${req.auth?.accountId}:${ip}`,
      RateLimiter.readLimit().maxAttempts,
      RateLimiter.readLimit().windowMinutes,
    );
    if (!limit.allowed) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-Receipt',
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
    const row = await this.prisma.idempotencyKey.findUnique({ where: { key } });
    if (!row || row.accountId !== req.auth?.accountId) {
      throw new NotFoundException({ message: AUTH_MESSAGES.grantDenied.text });
    }
    return { status: row.status, response: row.response };
  }
}
