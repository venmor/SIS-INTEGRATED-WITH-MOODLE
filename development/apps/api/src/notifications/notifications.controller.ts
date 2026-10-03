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
import { NotificationsService } from './notifications.service.js';
import {
  CreateRecordDto,
  CreateTemplateDto,
  ListSignalsQuery,
  ListTemplatesQuery,
  SuppressDto,
} from './dto.js';
import { KeyDto } from '../admissions/dto.js';

interface AuthRequest extends Request {
  auth: ActiveAuthority & { scopeType?: string | null; scopeRef?: string | null };
}

// Phase 8 slice 1 notification API (TASK-PH8-001). Versioned
// templates, authoritative records, per-channel deliveries and the
// worker trigger. Reads are recipient- or scope-matched; template
// writes are governance-gated.
@Controller('notifications')
@UseGuards(SessionGuard, ApplicationRateGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('templates')
  @UseGuards(CsrfGuard)
  createTemplate(@Req() r: AuthRequest, @Body() dto: CreateTemplateDto) {
    return this.notifications.createTemplate(r.auth, dto.idempotencyKey, {
      event: dto.event,
      title: dto.title,
      body: dto.body,
      actionLabel: dto.actionLabel,
      office: dto.office,
      category: dto.category,
      mandatory: dto.mandatory,
    });
  }

  @Get('templates')
  templates(@Req() r: AuthRequest, @Query() q: ListTemplatesQuery) {
    return this.notifications.listTemplates(r.auth, { event: q.event });
  }

  @Post('records')
  @UseGuards(CsrfGuard)
  createRecord(@Req() r: AuthRequest, @Body() dto: CreateRecordDto) {
    return this.notifications.createRecord(r.auth, dto.idempotencyKey, {
      templateId: dto.templateId,
      event: dto.event,
      title: dto.title,
      body: dto.body,
      actionPath: dto.actionPath,
      office: dto.office,
      category: dto.category,
      mandatory: dto.mandatory,
      recipientAccountId: dto.recipientAccountId,
      recipientRole: dto.recipientRole,
      scopeType: dto.scopeType,
      scopeRef: dto.scopeRef,
      dedupeKey: dto.dedupeKey,
      channels: dto.channels,
      simulateFailure: dto.simulateFailure,
    });
  }

  @Get('records/mine')
  myRecords(@Req() r: AuthRequest) {
    return this.notifications.listMine(r.auth);
  }

  @Get('records/signals')
  signals(@Req() r: AuthRequest, @Query() q: ListSignalsQuery) {
    return this.notifications.listSignals(r.auth, { status: q.status });
  }

  @Get('records/:id')
  record(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.recordDetail(r.auth, id);
  }

  @Post('records/:id/read')
  @UseGuards(CsrfGuard)
  markRead(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KeyDto,
  ) {
    return this.notifications.markRead(r.auth, dto.idempotencyKey, id);
  }

  @Post('records/:id/suppress')
  @UseGuards(CsrfGuard)
  suppress(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuppressDto,
  ) {
    return this.notifications.suppress(
      r.auth,
      dto.idempotencyKey,
      id,
      dto.optedOut,
    );
  }

  @Get('deliveries/:id')
  delivery(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.deliveryDetail(r.auth, id);
  }

  @Post('worker/run')
  @UseGuards(CsrfGuard)
  runWorker() {
    return this.notifications.runWorker();
  }
}
