import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { Equals, IsBoolean, IsIn, IsInt, IsISO8601, IsNotEmpty, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import type { Request } from 'express';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { SessionGuard } from '../identity-access/session.guard.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { ApplicationRateGuard } from '../admissions/applications.controller.js';
import { ResultDemoPolicyService, ResultReleaseProofService } from './result-release-security.service.js';
import { KeyDto } from '../admissions/dto.js';
import { PUBLICATION_DECLARATION } from './publication-ports.js';
class ProofDto {
  @IsUUID() targetId!: string;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
  @Equals(PUBLICATION_DECLARATION) declaration!: string;
  @IsIn(['ReleaseOfficialCourseResults', 'ApproveOfficialResultAmendment']) action!: string;
  @IsString() @IsNotEmpty() @MaxLength(256) password!: string;
}
class PolicyDto extends KeyDto {
  @IsString() @IsNotEmpty() @MaxLength(100) offeringRef!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) periodCode!: string;
  @IsISO8601({ strict: true }) releaseAt!: string;
  @IsBoolean() showMarks!: boolean;
  @IsString() @IsNotEmpty() @MaxLength(500) reviewInstructions!: string;
}
class PolicyQueryDto { @IsString() @IsNotEmpty() @MaxLength(100) periodCode!: string; }
interface AuthRequest extends Request { auth: ActiveAuthority & { sessionToken: string } }
@Controller('assessment/result-publication')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class ResultPublicationSecurityController {
  constructor(private readonly proofs: ResultReleaseProofService, private readonly policies: ResultDemoPolicyService) {}
  @Post('proofs') @UseGuards(CsrfGuard)
  proof(@Req() req: AuthRequest, @Body() dto: ProofDto) { return this.proofs.issue(req.auth, dto); }
  @Get('demo-policies')
  policiesList(@Req() req: AuthRequest, @Query() query: PolicyQueryDto) { return this.policies.list(req.auth, query.periodCode); }
  @Post('demo-policies') @UseGuards(CsrfGuard)
  prepare(@Req() req: AuthRequest, @Body() dto: PolicyDto) { return this.policies.prepare(req.auth, dto); }
  @Post('demo-policies/:id/approve') @UseGuards(CsrfGuard)
  approve(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.policies.approve(req.auth, id); }
}
