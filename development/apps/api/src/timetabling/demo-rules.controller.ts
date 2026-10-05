import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { auditAuth } from '../identity-access/audit.js';
import { IncidentInterceptor } from '../identity-access/incident.interceptor.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import { SessionGuard } from '../identity-access/session.guard.js';
import { DemoTimetableRulesService } from './demo-rules.service.js';

interface RulesRequest {
  auth: ActiveAuthority;
}

@Controller('timetabling/demo-rules')
@UseGuards(SessionGuard)
@UseInterceptors(IncidentInterceptor)
export class DemoTimetableRulesController {
  constructor(
    private readonly rules: DemoTimetableRulesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(@Req() request: RulesRequest) {
    try {
      const result = await this.rules.list(request.auth);
      await auditAuth(this.prisma, {
        action: 'DemoTimetableRulesViewed',
        outcome: 'ALLOW',
        actorAccountId: request.auth.accountId,
        activeRole: request.auth.activeRole,
        scope: request.auth.scope,
        purpose: 'fictional-timetable-rules',
      });
      return result;
    } catch (error) {
      await auditAuth(this.prisma, {
        action: 'DemoTimetableRulesViewed',
        outcome: 'DENY',
        actorAccountId: request.auth?.accountId,
        activeRole: request.auth?.activeRole,
        scope: request.auth?.scope,
        purpose: 'fictional-timetable-rules',
        reason: 'demo-gate-or-appointment-denied',
      });
      throw error;
    }
  }

  @Post()
  async create(@Req() request: RulesRequest, @Body() body: unknown) {
    try {
      return await this.rules.create(request.auth, body);
    } catch (error) {
      await auditAuth(this.prisma, {
        action: 'DemoTimetableRuleDraftSaved',
        outcome: 'DENY',
        actorAccountId: request.auth?.accountId,
        activeRole: request.auth?.activeRole,
        scope: request.auth?.scope,
        purpose: 'fictional-timetable-rules',
        reason: 'draft-validation-or-authority-denied',
      });
      throw error;
    }
  }
}
