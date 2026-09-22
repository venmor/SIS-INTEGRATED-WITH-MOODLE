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
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { ApplicationRateGuard } from './applications.controller.js';
import { ReviewService } from './review.service.js';
import {
  ClaimReviewDto,
  CorrectionDecideDto,
  ExtendOfferDto,
  RecommendationDto,
  ReleaseDecisionDto,
  ReleaseReviewDto,
  ReviewFindingDto,
  ReviewQueueQuery,
  StaffClarificationDto,
} from './dto.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority;
}

// Phase 3 slices 1-2 staff review routes (TASK-PH3-001/002). Same guard stack
// as the applicant routes: session + per-minute rate budget on everything,
// CSRF marker on every POST. Static `queue` paths are declared before `:id`
// so they win over the parameter route.
@Controller('review')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class ReviewController {
  constructor(private readonly reviews: ReviewService) {}

  @Get('queue') queue(@Req() r: AuthRequest, @Query() q: ReviewQueueQuery) {
    return this.reviews.queue(
      r.auth,
      q.scope ?? 'mine',
      q.state,
      q.actionNeeded,
      q.take,
    );
  }

  @Get('queue/:id') summary(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviews.summary(r.auth, id);
  }

  @Post(':id/claim')
  @UseGuards(CsrfGuard)
  claim(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClaimReviewDto,
  ) {
    return this.reviews.claim(r.auth, id, dto.idempotencyKey, dto.version);
  }

  @Post(':id/release')
  @UseGuards(CsrfGuard)
  release(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseReviewDto,
  ) {
    return this.reviews.release(r.auth, id, dto.idempotencyKey, dto.version);
  }

  @Get(':id/evidence') evidence(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviews.evidence(r.auth, id);
  }

  @Get(':id/findings') findings(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviews.listFindings(r.auth, id);
  }

  @Post(':id/findings')
  @UseGuards(CsrfGuard)
  recordFinding(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewFindingDto,
  ) {
    return this.reviews.recordFinding(
      r.auth,
      id,
      dto.idempotencyKey,
      dto.version,
      {
        kind: dto.kind,
        subject: dto.subject,
        detail: dto.detail,
        severity: dto.severity,
      },
    );
  }

  @Post(':id/clarifications')
  @UseGuards(CsrfGuard)
  raiseClarification(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StaffClarificationDto,
  ) {
    return this.reviews.raiseClarification(
      r.auth,
      id,
      dto.idempotencyKey,
      dto.version,
      dto.question,
      dto.deadlineDays,
    );
  }

  @Post('corrections/:correctionId/decide')
  @UseGuards(CsrfGuard)
  decideCorrection(
    @Req() r: AuthRequest,
    @Param('correctionId', ParseUUIDPipe) correctionId: string,
    @Body() dto: CorrectionDecideDto,
  ) {
    return this.reviews.decideCorrection(
      r.auth,
      correctionId,
      dto.idempotencyKey,
      dto.approve,
      dto.note,
    );
  }

  @Get(':id/recommendations') recommendations(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviews.listRecommendations(r.auth, id);
  }

  @Post(':id/recommendations')
  @UseGuards(CsrfGuard)
  recordRecommendation(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecommendationDto,
  ) {
    return this.reviews.recordRecommendation(
      r.auth,
      id,
      dto.idempotencyKey,
      dto.version,
      {
        eligibilityOutcome: dto.eligibilityOutcome,
        recommendation: dto.recommendation,
        criteria: dto.criteria,
        rationale: dto.rationale,
        supersedesId: dto.supersedesId,
      },
    );
  }

  @Post(':id/decision/release')
  @UseGuards(CsrfGuard)
  releaseDecision(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseDecisionDto,
  ) {
    return this.reviews.releaseDecision(
      r.auth,
      id,
      dto.idempotencyKey,
      dto.version,
      {
        outcome: dto.outcome,
        message: dto.message,
        acceptBy: dto.acceptBy,
        conditions: dto.conditions,
      },
    );
  }

  @Post(':id/offer/extend')
  @UseGuards(CsrfGuard)
  extendOffer(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendOfferDto,
  ) {
    return this.reviews.extendOffer(
      r.auth,
      id,
      dto.idempotencyKey,
      dto.version,
      dto.newDeadline,
      dto.reason,
    );
  }
}
