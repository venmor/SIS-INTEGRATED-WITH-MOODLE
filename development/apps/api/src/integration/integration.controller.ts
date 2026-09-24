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
import { ApplicationRateGuard } from '../admissions/applications.controller.js';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { IntegrationService } from './integration.service.js';
import {
  CloseIncidentDto,
  DecideReplayDto,
  ResolveReconCaseDto,
  DraftMappingDto,
  OpenIncidentDto,
  PauseDeliveryDto,
  ProvisionShellDto,
  RequestReplayDto,
  ScheduleMaintenanceDto,
  SimulatorModeDto,
} from './dto.js';
import { KeyDto } from '../admissions/dto.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority & { scopeType?: string | null; scopeRef?: string | null };
}

// Phase 6 slice 1 integration API (TASK-PH6-001). Mapping registry with
// four-eyes lifecycle, synthetic validation, connection health.
@Controller('integration')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class IntegrationController {
  constructor(private readonly integration: IntegrationService) {}

  @Get('health')
  health(@Req() r: AuthRequest) {
    return this.integration.connectionHealth(r.auth);
  }

  @Post('connection/validate')
  @UseGuards(CsrfGuard)
  validateConnection(@Req() r: AuthRequest) {
    return this.integration.validateConnection(r.auth);
  }

  @Post('mappings')
  @UseGuards(CsrfGuard)
  draftMapping(@Req() r: AuthRequest, @Body() dto: DraftMappingDto) {
    return this.integration.draftMapping(r.auth, dto.idempotencyKey, {
      kind: dto.kind,
      sisType: dto.sisType,
      sisId: dto.sisId,
      moodleId: dto.moodleId,
    });
  }

  @Post('mappings/:id/test')
  @UseGuards(CsrfGuard)
  testMapping(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KeyDto,
  ) {
    return this.integration.testMapping(r.auth, dto.idempotencyKey, id);
  }

  @Post('mappings/:id/activate')
  @UseGuards(CsrfGuard)
  activateMapping(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KeyDto,
  ) {
    return this.integration.activateMapping(r.auth, dto.idempotencyKey, id);
  }

  @Get('mappings')
  mappings(@Req() r: AuthRequest) {
    return this.integration.listMappings(r.auth);
  }

  @Post('shells/provision')
  @UseGuards(CsrfGuard)
  provisionShell(@Req() r: AuthRequest, @Body() dto: ProvisionShellDto) {
    return this.integration.provisionShell(r.auth, dto.idempotencyKey, {
      offeringId: dto.offeringId,
      period: dto.period,
    });
  }

  @Post('worker/run')
  @UseGuards(CsrfGuard)
  runWorker(@Req() r: AuthRequest) {
    return this.integration.runWorkerNow(r.auth);
  }

  @Post('simulator/mode')
  @UseGuards(CsrfGuard)
  simulatorMode(@Req() r: AuthRequest, @Body() dto: SimulatorModeDto) {
    return this.integration.setSimulatorMode(r.auth, dto.mode);
  }

  @Get('deliveries')
  deliveries(@Req() r: AuthRequest) {
    return this.integration.listDeliveries(r.auth);
  }

  @Get('deliveries/:id')
  deliveryDetail(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.integration.deliveryDetail(r.auth, id);
  }

  @Get('shells')
  shells(@Req() r: AuthRequest) {
    return this.integration.listShells(r.auth);
  }

  @Get('enrolments')
  enrolments(@Req() r: AuthRequest) {
    return this.integration.listEnrolments(r.auth);
  }

  @Post('maintenance')
  @UseGuards(CsrfGuard)
  scheduleMaintenance(
    @Req() r: AuthRequest,
    @Body() dto: ScheduleMaintenanceDto,
  ) {
    return this.integration.scheduleMaintenance(r.auth, dto.idempotencyKey, {
      reason: dto.reason,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
    });
  }

  @Get('maintenance')
  maintenance(@Req() r: AuthRequest) {
    return this.integration.listMaintenance(r.auth);
  }

  @Post('maintenance/:id/cancel')
  @UseGuards(CsrfGuard)
  cancelMaintenance(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KeyDto,
  ) {
    return this.integration.cancelMaintenance(r.auth, dto.idempotencyKey, id);
  }

  @Get('dead-letters')
  deadLetters(@Req() r: AuthRequest) {
    return this.integration.deadLetters(r.auth);
  }

  @Post('replays')
  @UseGuards(CsrfGuard)
  requestReplay(@Req() r: AuthRequest, @Body() dto: RequestReplayDto) {
    return this.integration.requestReplay(r.auth, dto.idempotencyKey, {
      attemptId: dto.attemptId,
      rangeFrom: dto.rangeFrom,
      rangeTo: dto.rangeTo,
      reason: dto.reason,
      declaration: dto.declaration,
    });
  }

  @Get('replays')
  replays(@Req() r: AuthRequest) {
    return this.integration.listReplays(r.auth);
  }

  @Post('replays/:id/decide')
  @UseGuards(CsrfGuard)
  decideReplay(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideReplayDto,
  ) {
    return this.integration.decideReplay(r.auth, dto.idempotencyKey, id, {
      approve: dto.approve,
      note: dto.note,
    });
  }

  @Post('delivery/pause')
  @UseGuards(CsrfGuard)
  pauseDelivery(@Req() r: AuthRequest, @Body() dto: PauseDeliveryDto) {
    return this.integration.setPaused(r.auth, dto.idempotencyKey, dto.paused);
  }

  @Post('incidents')
  @UseGuards(CsrfGuard)
  openIncident(@Req() r: AuthRequest, @Body() dto: OpenIncidentDto) {
    return this.integration.openIncident(r.auth, dto.idempotencyKey, {
      title: dto.title,
      severity: dto.severity,
      detail: dto.detail,
    });
  }

  @Get('incidents')
  incidents(@Req() r: AuthRequest) {
    return this.integration.listIncidents(r.auth);
  }

  @Post('incidents/:id/close')
  @UseGuards(CsrfGuard)
  closeIncident(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseIncidentDto,
  ) {
    return this.integration.closeIncident(
      r.auth,
      dto.idempotencyKey,
      id,
      dto.evidence,
    );
  }

  @Post('reconciliation/runs')
  @UseGuards(CsrfGuard)
  runReconciliation(@Req() r: AuthRequest) {
    return this.integration.runReconciliation(r.auth);
  }

  @Get('reconciliation/runs')
  reconRuns(@Req() r: AuthRequest) {
    return this.integration.listReconRuns(r.auth);
  }

  @Get('reconciliation/cases')
  reconCases(@Req() r: AuthRequest) {
    return this.integration.listReconCases(r.auth);
  }

  @Post('reconciliation/cases/:id/resolve')
  @UseGuards(CsrfGuard)
  resolveReconCase(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReconCaseDto,
  ) {
    return this.integration.resolveReconCase(r.auth, dto.idempotencyKey, id, {
      action: dto.action,
      note: dto.note,
    });
  }
}
