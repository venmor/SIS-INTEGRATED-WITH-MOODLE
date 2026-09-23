import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Injectable,
  Post,
  Req,
  UseGuards,
  HttpException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { SessionGuard } from '../identity-access/session.guard.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { RateLimiter } from '../identity-access/rate-limit.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { FinanceService } from './finance.service.js';
import { CallbackDto, DispatchDto } from './dto.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority & { scopeType?: string | null; scopeRef?: string | null };
}

// Provider callbacks are signature-gated, never session-gated, with a
// bounded per-source budget (security: signed, replay-checked, queued).
@Injectable()
export class FinanceCallbackRateGuard implements CanActivate {
  private readonly limiter = new RateLimiter();
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'no-store');
    const forwarded = req.headers?.['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() ??
      req.ip ??
      'unknown';
    const check = this.limiter.check(`finance-callback:${ip}`, 120, 1);
    if (!check.allowed) {
      res.setHeader('Retry-After', check.retryAfterSeconds);
      throw new HttpException(
        'Too many callbacks. Delivery will be retried by the provider.',
        429,
      );
    }
    return true;
  }
}

// Slice 4 callback surface (TASK-PH5-004). No session: HMAC signature,
// replay window and nonce tracking authenticate the simulator.
@Controller('finance')
@UseGuards(FinanceCallbackRateGuard)
export class FinanceCallbackController {
  constructor(private readonly finance: FinanceService) {}

  @Post('callbacks')
  @HttpCode(HttpStatus.OK)
  async callback(@Body() dto: CallbackDto) {
    const result = await this.finance.processCallback({
      provider: dto.provider,
      providerRef: dto.providerRef,
      requestReference: dto.requestReference,
      amountMinor: dto.amountMinor,
      currency: dto.currency,
      status: dto.status,
      occurredAt: dto.occurredAt,
      nonce: dto.nonce,
      signature: dto.signature,
    });
    if (result.outcome === 'CASE_OPENED')
      throw new HttpException(result, HttpStatus.ACCEPTED);
    return result;
  }

  @Post('simulator/dispatch')
  @UseGuards(SessionGuard, CsrfGuard)
  async dispatch(@Req() r: AuthRequest, @Body() dto: DispatchDto) {
    const result = await this.finance.simulatorDispatch(
      r.auth,
      dto.idempotencyKey,
      {
        requestReference: dto.requestReference,
        outcome: dto.outcome,
      },
    );
    if (result.status === 202) throw new HttpException(result.body, 202);
    return result.body;
  }
}
