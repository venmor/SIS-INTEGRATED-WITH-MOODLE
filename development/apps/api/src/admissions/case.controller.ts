import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard } from '../identity-access/session.guard.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { ApplicationRateGuard } from './applications.controller.js';
import { ApplicationCaseService } from './case.service.js';
import {
  ClarificationRespondDto,
  CorrectionRequestDto,
  SimClarificationDto,
  SimCorrectionDecisionDto,
  SimDecisionDto,
  TicketDto,
  TicketReplyDto,
  WithdrawDto,
} from './dto.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority;
}

// Post-submit applicant case routes (Part 9). Same guard stack as the
// application routes: session + per-minute rate budget on everything, CSRF
// marker on every POST. Registered before ApplicationsController so the
// static `notifications` path wins over `:id`.
@Controller('applications')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class ApplicationCaseController {
  constructor(private readonly cases: ApplicationCaseService) {}

  @Get('notifications') notifications(@Req() r: AuthRequest) {
    return this.cases.notifications(r.auth);
  }

  @Post('notifications/:notifId/read')
  @UseGuards(CsrfGuard)
  markRead(
    @Req() r: AuthRequest,
    @Param('notifId', ParseUUIDPipe) notifId: string,
  ) {
    return this.cases.markNotificationRead(r.auth, notifId);
  }

  @Get(':id/timeline') timeline(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cases.timeline(r.auth, id);
  }

  @Get(':id/decision') decision(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cases.decision(r.auth, id);
  }

  @Get(':id/clarifications') clarifications(    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cases.listClarifications(r.auth, id);
  }

  @Get(':id/corrections') corrections(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cases.listCorrections(r.auth, id);
  }

  @Get(':id/tickets') tickets(    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cases.listTickets(r.auth, id);
  }

  @Post(':id/tickets')
  @UseGuards(CsrfGuard)
  createTicket(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TicketDto,
  ) {
    return this.cases.createTicket(
      r.auth,
      id,
      dto.idempotencyKey,
      dto.version,
      dto.subject,
      dto.message,
    );
  }

  @Post(':id/tickets/:ticketId/replies')
  @UseGuards(CsrfGuard)
  replyTicket(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: TicketReplyDto,
  ) {
    return this.cases.replyTicket(
      r.auth,
      id,
      ticketId,
      dto.idempotencyKey,
      dto.version,
      dto.message,
    );
  }

  @Post(':id/clarifications/:clarId/respond')
  @UseGuards(CsrfGuard)
  respond(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('clarId', ParseUUIDPipe) clarId: string,
    @Body() dto: ClarificationRespondDto,
  ) {
    return this.cases.clarificationRespond(
      r.auth,
      id,
      clarId,
      dto.idempotencyKey,
      dto.version,
      dto.response,
    );
  }

  @Post(':id/corrections')
  @UseGuards(CsrfGuard)
  correct(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CorrectionRequestDto,
  ) {
    return this.cases.correctionRequest(
      r.auth,
      id,
      dto.idempotencyKey,
      dto.version,
      dto.section,
      dto.field,
      dto.reason,
    );
  }

  @Post(':id/withdraw')
  @UseGuards(CsrfGuard)
  withdraw(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WithdrawDto,
  ) {
    return this.cases.withdraw(
      r.auth,
      id,
      dto.idempotencyKey,
      dto.version,
      dto.confirmed,
      dto.reason,
    );
  }

  @Post(':id/simulate-clarification')
  @UseGuards(CsrfGuard)
  simulateClarification(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SimClarificationDto,
  ) {
    return this.cases.simulateClarification(
      r.auth,
      id,
      dto.idempotencyKey,
      dto.question,
      dto.deadlineDays,
    );
  }

  @Post(':id/simulate-correction-decision')
  @UseGuards(CsrfGuard)
  simulateCorrectionDecision(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SimCorrectionDecisionDto,
  ) {
    return this.cases.simulateCorrectionDecision(
      r.auth,
      id,
      dto.idempotencyKey,
      dto.correctionId,
      dto.approve,
      dto.note,
    );
  }

  @Post(':id/simulate-decision')
  @UseGuards(CsrfGuard)
  simulateDecision(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SimDecisionDto,
  ) {
    return this.cases.simulateDecision(
      r.auth,
      id,
      dto.idempotencyKey,
      dto.outcome,
      dto.message,
      dto.conditions ?? [],
    );
  }
}
