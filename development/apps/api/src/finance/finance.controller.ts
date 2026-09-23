import {
  Body,
  Controller,
  Get,
  Injectable,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { ApplicationRateGuard } from '../admissions/applications.controller.js';
import { RateLimiter } from '../identity-access/rate-limit.js';
import { FINANCE_DEMO_V1 as financePolicy } from '@sis/config';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { KeyDto } from '../admissions/dto.js';
import { FinanceService } from './finance.service.js';
import {
  AssessChargesDto,
  CashConfirmDto,
  CashIntakeDto,
  DecideAdjustmentDto,
  DecideArrangementDto,
  InitiatePaymentDto,
  InvoiceQuery,
  PaymentQuery,
  RecordSponsorshipDto,
  ReportPaymentDto,
  RequestAdjustmentDto,
  RequestArrangementDto,
  ResolveCaseDto,
  UpdateSponsorshipDto,
} from './dto.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority & { scopeType?: string | null; scopeRef?: string | null };
}

// Payment initiation is high-impact: a stricter per-account budget than the
// general finance rate limit (security: rate limits complement authz).
@Injectable()
export class FinanceInitiationRateGuard implements CanActivate {
  private readonly limiter = new RateLimiter();
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'no-store');
    const check = this.limiter.check(
      `${req.auth.accountId}:finance-initiate`,
      financePolicy.rateLimit.initiationPerMinute,
      financePolicy.rateLimit.windowMinutes,
    );
    if (!check.allowed) {
      res.setHeader('Retry-After', check.retryAfterSeconds);
      throw new HttpException(
        'Too many payment attempts. Wait briefly and check your existing request before trying again.',
        429,
      );
    }
    return true;
  }
}

// Phase 5 finance API (TASK-PH5-001 slice 1). Assessment is a finance
// authority act; students read their own invoice only.
@Controller('finance')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Post('assess')
  @UseGuards(CsrfGuard)
  assess(@Req() r: AuthRequest, @Body() dto: AssessChargesDto) {
    return this.finance.assessCharges(r.auth, dto.idempotencyKey, {
      attemptId: dto.attemptId,
      period: dto.period,
    });
  }

  @Get('invoices')
  invoice(@Req() r: AuthRequest, @Query() q: InvoiceQuery) {
    return this.finance.readInvoice(r.auth, q.period);
  }

  @Get('account')
  account(@Req() r: AuthRequest, @Query() q: InvoiceQuery) {
    return this.finance.accountSummary(r.auth, q.period);
  }

  @Get('statement')
  statement(@Req() r: AuthRequest, @Query() q: InvoiceQuery) {
    return this.finance.statement(r.auth, q.period);
  }

  @Get('receipts/:reference')
  receipt(
    @Req() r: AuthRequest,
    @Param('reference') reference: string,
  ) {
    return this.finance.receipt(r.auth, reference);
  }

  @Post('payments/initiate')
  @UseGuards(CsrfGuard, FinanceInitiationRateGuard)
  initiate(@Req() r: AuthRequest, @Body() dto: InitiatePaymentDto) {
    return this.finance.initiatePayment(r.auth, dto.idempotencyKey, {
      period: dto.period,
      amountMinor: dto.amountMinor,
      method: dto.method,
      scenario: dto.scenario,
    });
  }

  @Post('payments/report')
  @UseGuards(CsrfGuard)
  report(@Req() r: AuthRequest, @Body() dto: ReportPaymentDto) {
    return this.finance.reportPayment(r.auth, dto.idempotencyKey, {
      period: dto.period,
      amountMinor: dto.amountMinor,
      method: dto.method,
      payerReference: dto.payerReference,
    });
  }

  @Get('payments')
  payments(@Req() r: AuthRequest, @Query() q: PaymentQuery) {
    return this.finance.listPayments(r.auth, q.period);
  }

  @Get('payments/:reference')
  payment(
    @Req() r: AuthRequest,
    @Param('reference') reference: string,
  ) {
    return this.finance.paymentDetail(r.auth, reference);
  }

  @Get('cases')
  cases(@Req() r: AuthRequest) {
    return this.finance.listCases(r.auth);
  }

  @Get('cases/:id')
  caseDetail(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.finance.caseDetail(r.auth, id);
  }

  @Post('cases/:id/resolve')
  @UseGuards(CsrfGuard)
  resolveCase(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveCaseDto,
  ) {
    return this.finance.resolveCase(r.auth, dto.idempotencyKey, id, {
      action: dto.action,
      note: dto.note,
      requestReference: dto.requestReference,
      acceptedAmountMinor: dto.acceptedAmountMinor,
    });
  }

  @Post('sponsorships')
  @UseGuards(CsrfGuard)
  recordSponsorship(@Req() r: AuthRequest, @Body() dto: RecordSponsorshipDto) {
    return this.finance.recordSponsorship(r.auth, dto.idempotencyKey, {
      attemptId: dto.attemptId,
      period: dto.period,
      sponsorName: dto.sponsorName,
      categories: dto.categories,
      coverageType: dto.coverageType,
      coverageValue: dto.coverageValue,
      evidenceNote: dto.evidenceNote,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
    });
  }

  @Post('sponsorships/:id/confirm')
  @UseGuards(CsrfGuard)
  confirmSponsorship(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KeyDto,
  ) {
    return this.finance.confirmSponsorship(r.auth, dto.idempotencyKey, id);
  }

  @Patch('sponsorships/:id')
  @UseGuards(CsrfGuard)
  updateSponsorship(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSponsorshipDto,
  ) {
    return this.finance.updateSponsorship(r.auth, dto.idempotencyKey, id, {
      coverageValue: dto.coverageValue,
      evidenceNote: dto.evidenceNote,
      effectiveTo: dto.effectiveTo,
    });
  }

  @Get('sponsorships')
  sponsorships(@Req() r: AuthRequest) {
    return this.finance.listSponsorships(r.auth);
  }

  @Post('adjustments')
  @UseGuards(CsrfGuard)
  requestAdjustment(@Req() r: AuthRequest, @Body() dto: RequestAdjustmentDto) {
    return this.finance.requestAdjustment(r.auth, dto.idempotencyKey, {
      attemptId: dto.attemptId,
      period: dto.period,
      kind: dto.kind,
      amountMinor: dto.amountMinor,
      reason: dto.reason,
      evidenceNote: dto.evidenceNote,
    });
  }

  @Post('adjustments/:id/decide')
  @UseGuards(CsrfGuard)
  decideAdjustment(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideAdjustmentDto,
  ) {
    return this.finance.decideAdjustment(r.auth, dto.idempotencyKey, id, {
      approve: dto.approve,
      note: dto.note,
      payoutReference: dto.payoutReference,
    });
  }

  @Get('adjustments')
  adjustments(@Req() r: AuthRequest) {
    return this.finance.listAdjustments(r.auth);
  }

  @Post('arrangements')
  @UseGuards(CsrfGuard)
  requestArrangement(@Req() r: AuthRequest, @Body() dto: RequestArrangementDto) {
    return this.finance.requestArrangement(r.auth, dto.idempotencyKey, {
      period: dto.period,
      terms: dto.terms,
      reason: dto.reason,
    });
  }

  @Get('arrangements')
  arrangements(@Req() r: AuthRequest) {
    return this.finance.listArrangements(r.auth);
  }

  @Post('arrangements/:id/decide')
  @UseGuards(CsrfGuard)
  decideArrangement(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideArrangementDto,
  ) {
    return this.finance.decideArrangement(r.auth, dto.idempotencyKey, id, {
      approve: dto.approve,
      note: dto.note,
    });
  }

  @Post('cashier/intake')
  @UseGuards(CsrfGuard)
  cashIntake(@Req() r: AuthRequest, @Body() dto: CashIntakeDto) {
    return this.finance.recordCashIntake(r.auth, dto.idempotencyKey, {
      requestReference: dto.requestReference,
      amountMinor: dto.amountMinor,
      cashReceiptNo: dto.cashReceiptNo,
    });
  }

  @Post('cashier/confirm')
  @UseGuards(CsrfGuard)
  cashConfirm(@Req() r: AuthRequest, @Body() dto: CashConfirmDto) {
    return this.finance.confirmCashIntake(r.auth, dto.idempotencyKey, {
      requestReference: dto.requestReference,
    });
  }
}
