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
import { OpsService } from './ops.service.js';
import {
  AcknowledgeIncidentDto,
  CloseIncidentDto,
  ListIncidentsQuery,
  OpenIncidentDto,
  ResolveIncidentDto,
  SweepDeadLettersDto,
} from './dto.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority & { scopeType?: string | null; scopeRef?: string | null };
}

// Phase 8 slice 3 ops queue API (TASK-PH8-003). Generic incidents
// over existing domain operations; reads aggregate the queue,
// writes move the evidenced lifecycle. Operator-gated writes,
// support/admin reads, students and outsiders refused.
@Controller('ops')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Post('incidents')
  @UseGuards(CsrfGuard)
  openIncident(@Req() r: AuthRequest, @Body() dto: OpenIncidentDto) {
    return this.ops.openIncident(r.auth, dto.idempotencyKey, {
      title: dto.title,
      severity: dto.severity,
      sourceRef: dto.sourceRef,
      detail: dto.detail,
    });
  }

  @Get('incidents')
  incidents(@Req() r: AuthRequest, @Query() q: ListIncidentsQuery) {
    return this.ops.listIncidents(r.auth, {
      status: q.status,
      openOnly: q.openOnly,
    });
  }

  @Get('incidents/:id')
  incident(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ops.incidentDetail(r.auth, id);
  }

  @Post('incidents/:id/acknowledge')
  @UseGuards(CsrfGuard)
  acknowledgeIncident(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeIncidentDto,
  ) {
    return this.ops.acknowledgeIncident(
      r.auth,
      dto.idempotencyKey,
      id,
      dto.version,
      dto.targetResponseAt,
    );
  }

  @Post('incidents/:id/resolve')
  @UseGuards(CsrfGuard)
  resolveIncident(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveIncidentDto,
  ) {
    return this.ops.resolveIncident(r.auth, dto.idempotencyKey, id, dto.version, {
      rootCause: dto.rootCause,
      recoveryEvidence: dto.recoveryEvidence,
      preventiveAction: dto.preventiveAction,
    });
  }

  @Post('incidents/:id/close')
  @UseGuards(CsrfGuard)
  closeIncident(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseIncidentDto,
  ) {
    return this.ops.closeIncident(r.auth, dto.idempotencyKey, id, dto.version);
  }

  @Post('incidents/sweep')
  @UseGuards(CsrfGuard)
  sweepDeadLetters(@Req() r: AuthRequest, @Body() dto: SweepDeadLettersDto) {
    return this.ops.sweepDeadLetters(r.auth, dto.idempotencyKey, dto.attemptId);
  }

  @Get('queue')
  queue(@Req() r: AuthRequest) {
    return this.ops.queueOverview(r.auth);
  }
}
