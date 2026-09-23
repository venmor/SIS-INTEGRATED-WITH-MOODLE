import {
  Controller,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard } from '../identity-access/session.guard.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { ApplicationRateGuard } from '../admissions/applications.controller.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { RegistrationService } from './registration.service.js';
import {
  AcceptWaitlistDto,
  AmendmentQuery,
  ChangeRequestDto,
  DecideAmendmentDto,
  JoinWaitlistDto,
  PlanQuery,
  ReadinessQuery,
  SavePlanDto,
  SubmitRegistrationDto,
} from './dto.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority;
}

// Phase 4 slice 3 readiness routes (TASK-PH4-003). Read-only assessment:
// session-guarded, no CSRF mutation surface, same rate budget as the rest.
@Controller('registration')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class RegistrationController {
  constructor(private readonly registration: RegistrationService) {}

  @Get('readiness') readiness(
    @Req() r: AuthRequest,
    @Query() q: ReadinessQuery,
  ) {
    return this.registration.readiness(r.auth, q.attemptId, q.period);
  }

  @Get('plan') plan(
    @Req() r: AuthRequest,
    @Query() q: PlanQuery,
  ) {
    return this.registration.getPlan(r.auth, q.attemptId, q.period);
  }

  @Post('plan')
  @UseGuards(CsrfGuard)
  savePlan(
    @Req() r: AuthRequest,
    @Query() q: PlanQuery,
    @Body() dto: SavePlanDto,
  ) {
    return this.registration.savePlan(r.auth, dto.idempotencyKey, {
      attemptId: q.attemptId,
      period: q.period,
      version: dto.version,
      courseCodes: dto.courseCodes,
    });
  }

  @Post('submit')
  @UseGuards(CsrfGuard)
  submit(
    @Req() r: AuthRequest,
    @Query() q: PlanQuery,
    @Body() dto: SubmitRegistrationDto,
  ) {
    return this.registration.submitRegistration(r.auth, dto.idempotencyKey, {
      attemptId: q.attemptId,
      period: q.period,
      version: dto.version,
      declarations: dto.declarations,
    });
  }

  @Get('status')
  status(@Req() r: AuthRequest, @Query() q: PlanQuery) {
    return this.registration.registrationStatus(
      r.auth,
      q.attemptId,
      q.period,
    );
  }

  @Get('timetable')
  timetable(@Req() r: AuthRequest, @Query() q: PlanQuery) {
    return this.registration.timetable(r.auth, q.attemptId, q.period);
  }

  @Post('changes')
  @UseGuards(CsrfGuard)
  requestChange(
    @Req() r: AuthRequest,
    @Query() q: AmendmentQuery,
    @Body() dto: ChangeRequestDto,
  ) {
    return this.registration.requestChange(r.auth, dto.idempotencyKey, {
      attemptId: q.attemptId,
      period: q.period,
      kind: dto.kind,
      courseCode: dto.courseCode,
      reason: dto.reason,
      evidenceNote: dto.evidenceNote,
    });
  }

  @Get('amendments')
  amendments(@Req() r: AuthRequest, @Query() q: AmendmentQuery) {
    return this.registration.listAmendments(r.auth, q.attemptId, q.period);
  }

  @Post('amendments/:amendmentId/decide')
  @UseGuards(CsrfGuard)
  decideAmendment(
    @Req() r: AuthRequest,
    @Param('amendmentId', ParseUUIDPipe) amendmentId: string,
    @Body() dto: DecideAmendmentDto,
  ) {
    return this.registration.decideAmendment(
      r.auth,
      amendmentId,
      dto.idempotencyKey,
      dto.approve,
      dto.note,
    );
  }

  @Post('waitlist')
  @UseGuards(CsrfGuard)
  joinWaitlist(
    @Req() r: AuthRequest,
    @Query() q: AmendmentQuery,
    @Body() dto: JoinWaitlistDto,
  ) {
    return this.registration.joinWaitlist(r.auth, dto.idempotencyKey, {
      attemptId: q.attemptId,
      period: q.period,
      courseCode: dto.courseCode,
    });
  }

  @Get('waitlist')
  waitlist(@Req() r: AuthRequest, @Query() q: AmendmentQuery) {
    return this.registration.listWaitlist(r.auth, q.attemptId, q.period);
  }

  @Post('waitlist/:entryId/decide')
  @UseGuards(CsrfGuard)
  acceptWaitlist(
    @Req() r: AuthRequest,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: AcceptWaitlistDto,
  ) {
    return this.registration.acceptWaitlist(
      r.auth,
      entryId,
      dto.idempotencyKey,
      dto.approve,
      dto.note,
    );
  }
}
