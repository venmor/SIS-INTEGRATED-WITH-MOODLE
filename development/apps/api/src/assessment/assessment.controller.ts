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
import { SessionGuard } from '../identity-access/session.guard.js';
import { CsrfGuard } from '../identity-access/csrf.guard.js';
import { ApplicationRateGuard } from '../admissions/applications.controller.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { AssessmentService } from './assessment.service.js';
import {
  ApprovePlanDto,
  DraftGradeMappingDto,
  DraftPlanDto,
  ListBatchesQuery,
  ListFindingsQuery,
  ListMappingsQuery,
  ListPlansQuery,
  StageBatchDto,
  TransitionFindingDto,
} from './dto.js';
import { KeyDto } from '../admissions/dto.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority & { scopeType?: string | null; scopeRef?: string | null };
}

// Phase 7 slice 1 assessment API (TASK-PH7-001). Versioned scheme
// registry per offering+period with four-eyes approval; grade-activity
// mappings with synthetic validation before four-eyes activation.
@Controller('assessment')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class AssessmentController {
  constructor(private readonly assessment: AssessmentService) {}

  @Post('plans')
  @UseGuards(CsrfGuard)
  draftPlan(@Req() r: AuthRequest, @Body() dto: DraftPlanDto) {
    return this.assessment.draftPlan(r.auth, dto.idempotencyKey, {
      offeringRef: dto.offeringRef,
      periodCode: dto.periodCode,
      components: dto.components,
    });
  }

  @Post('plans/:id/approve')
  @UseGuards(CsrfGuard)
  approvePlan(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovePlanDto,
  ) {
    return this.assessment.approvePlan(r.auth, dto.idempotencyKey, id, dto.version);
  }

  @Get('plans')
  plans(@Req() r: AuthRequest, @Query() q: ListPlansQuery) {
    return this.assessment.listPlans(r.auth, {
      offeringRef: q.offeringRef,
      periodCode: q.periodCode,
    });
  }

  @Post('mappings')
  @UseGuards(CsrfGuard)
  draftMapping(@Req() r: AuthRequest, @Body() dto: DraftGradeMappingDto) {
    return this.assessment.draftMapping(r.auth, dto.idempotencyKey, {
      componentId: dto.componentId,
      moodleActivityId: dto.moodleActivityId,
      moodleCourseRef: dto.moodleCourseRef,
    });
  }

  @Post('mappings/:id/test')
  @UseGuards(CsrfGuard)
  testMapping(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KeyDto,
  ) {
    return this.assessment.testMapping(r.auth, dto.idempotencyKey, id);
  }

  @Post('mappings/:id/activate')
  @UseGuards(CsrfGuard)
  activateMapping(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KeyDto,
  ) {
    return this.assessment.activateMapping(r.auth, dto.idempotencyKey, id);
  }

  @Get('mappings')
  mappings(@Req() r: AuthRequest, @Query() q: ListMappingsQuery) {
    return this.assessment.listMappings(r.auth, {
      componentId: q.componentId,
    });
  }

  @Post('batches')
  @UseGuards(CsrfGuard)
  stageBatch(@Req() r: AuthRequest, @Body() dto: StageBatchDto) {
    return this.assessment.stageBatch(r.auth, dto.idempotencyKey, {
      mappingId: dto.mappingId,
      sourceRevision: dto.sourceRevision,
      lines: dto.lines.map((l) => ({
        studentRef: l.studentRef,
        rawValue: l.rawValue,
        outcome: l.outcome,
      })),
    });
  }

  @Get('batches')
  batches(@Req() r: AuthRequest, @Query() q: ListBatchesQuery) {
    return this.assessment.listBatches(r.auth, {
      mappingId: q.mappingId,
    });
  }

  @Get('batches/:id')
  batch(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assessment.batchDetail(r.auth, id);
  }

  @Post('batches/:id/validate')
  @UseGuards(CsrfGuard)
  validateBatch(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KeyDto,
  ) {
    return this.assessment.validateBatch(r.auth, dto.idempotencyKey, id);
  }

  @Get('findings')
  findings(@Req() r: AuthRequest, @Query() q: ListFindingsQuery) {
    return this.assessment.listFindings(r.auth, {
      batchId: q.batchId,
      code: q.code,
      status: q.status,
    });
  }

  @Get('findings/:id')
  finding(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assessment.findingDetail(r.auth, id);
  }

  @Post('findings/:id/transition')
  @UseGuards(CsrfGuard)
  transitionFinding(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionFindingDto,
  ) {
    return this.assessment.transitionFinding(
      r.auth,
      dto.idempotencyKey,
      id,
      dto.version,
      dto.to,
      dto.reason,
    );
  }
}
