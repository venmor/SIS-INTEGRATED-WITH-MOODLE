import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { SessionGuard } from '../identity-access/session.guard.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { ApplicationRateGuard } from '../admissions/applications.controller.js';
import { PublicationService } from './publication.service.js';
import {
  PublicationQueryDto,
  ReleaseResultsDto,
  RequestAmendmentDto,
} from './publication.dto.js';
interface AuthRequest extends Request {
  auth: ActiveAuthority & { sessionToken: string };
}
@Controller('assessment')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class PublicationController {
  constructor(private readonly results: PublicationService) {}
  @Post('packages/:id/release')
  @UseGuards(CsrfGuard)
  release(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseResultsDto,
  ) {
    return this.results.release(r.auth, id, dto);
  }
  @Post('amendments')
  @UseGuards(CsrfGuard)
  request(@Req() r: AuthRequest, @Body() dto: RequestAmendmentDto) {
    return this.results.requestAmendment(r.auth, dto);
  }
  @Post('amendments/:id/approve')
  @UseGuards(CsrfGuard)
  approve(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseResultsDto,
  ) {
    return this.results.approveAmendment(r.auth, id, dto);
  }
  @Get('publications')
  workspace(@Req() r: AuthRequest, @Query() query: PublicationQueryDto) {
    return this.results.workspace(r.auth, query);
  }
  @Get('amendments/:id')
  detail(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.results.amendmentDetail(r.auth, id);
  }
  @Get('me/results')
  student(@Req() r: AuthRequest) {
    return this.results.studentResults(r.auth);
  }
}
