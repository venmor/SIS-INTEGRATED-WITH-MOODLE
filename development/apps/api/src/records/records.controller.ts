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
import { RecordsService } from './records.service.js';
import {
  ConvertDto,
  DecideCorrectionDto,
  RequestCorrectionDto,
  ResolveMatchDto,
  UpdateContactDto,
} from './dto.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority;
}

// Phase 4 slice 2 conversion routes (TASK-PH4-002). Same guard stack as the
// other domains: session on everything, CSRF marker on every POST. The
// records module never serves applicant self-service paths.
@Controller('records')
@UseGuards(SessionGuard)
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Post('applications/:id/convert')
  @UseGuards(CsrfGuard)
  convert(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertDto,
  ) {
    return this.records.convert(r.auth, id, dto.idempotencyKey);
  }

  @Get('duplicates') candidates(@Req() r: AuthRequest) {
    return this.records.listCandidates(r.auth);
  }

  @Post('duplicates/:candidateId/resolve')
  @UseGuards(CsrfGuard)
  resolveMatch(
    @Req() r: AuthRequest,
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Body() dto: ResolveMatchDto,
  ) {
    return this.records.resolveMatch(
      r.auth,
      candidateId,
      dto.idempotencyKey,
      dto.decision,
      dto.reason,
    );
  }

  @Get('me/home') home(@Req() r: AuthRequest) {
    return this.records.studentHome(r.auth);
  }

  @Get('me/contact') contact(@Req() r: AuthRequest) {
    return this.records.getContact(r.auth);
  }

  @Post('me/contact')
  @UseGuards(CsrfGuard)
  updateContact(
    @Req() r: AuthRequest,
    @Body() dto: UpdateContactDto,
  ) {
    return this.records.updateContact(
      r.auth,
      dto.idempotencyKey,
      { email: dto.email, phone: dto.phone },
    );
  }

  @Get('me/corrections') corrections(@Req() r: AuthRequest) {
    return this.records.listCorrections(r.auth);
  }

  @Post('me/corrections')
  @UseGuards(CsrfGuard)
  requestCorrection(
    @Req() r: AuthRequest,
    @Body() dto: RequestCorrectionDto,
  ) {
    return this.records.requestCorrection(
      r.auth,
      dto.idempotencyKey,
      {
        field: dto.field,
        requestedValue: dto.requestedValue,
        reason: dto.reason,
      },
    );
  }

  @Post('corrections/:correctionId/decide')
  @UseGuards(CsrfGuard)
  decideCorrection(
    @Req() r: AuthRequest,
    @Param('correctionId', ParseUUIDPipe) correctionId: string,
    @Body() dto: DecideCorrectionDto,
  ) {
    return this.records.decideCorrection(
      r.auth,
      correctionId,
      dto.idempotencyKey,
      dto.approve,
      dto.note,
    );
  }
}
