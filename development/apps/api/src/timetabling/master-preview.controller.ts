import { Body, Controller, Get, Param, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { auditAuth } from '../identity-access/audit.js';
import { IncidentInterceptor } from '../identity-access/incident.interceptor.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import { SessionGuard } from '../identity-access/session.guard.js';
import { MasterPreviewService } from './master-preview.service.js';

interface RequestWithAuthority { auth: ActiveAuthority }

@Controller('timetabling/demo-master')
@UseGuards(SessionGuard)
@UseInterceptors(IncidentInterceptor)
export class MasterPreviewController {
  constructor(private readonly preview: MasterPreviewService, private readonly prisma: PrismaService) {}

  private async read<T>(actor: ActiveAuthority, operation: () => Promise<T>) {
    try {
      const result = await operation();
      await auditAuth(this.prisma, { action: 'DemoMasterTimetableViewed', outcome: 'ALLOW',
        actorAccountId: actor.accountId, activeRole: actor.activeRole, scope: actor.scope,
        purpose: 'fictional-timetable-planning' });
      return result;
    } catch (error) {
      await auditAuth(this.prisma, { action: 'DemoMasterTimetableViewed', outcome: 'DENY',
        actorAccountId: actor.accountId, activeRole: actor.activeRole, scope: actor.scope,
        purpose: 'fictional-timetable-planning', reason: 'appointment-or-draft-not-available' });
      throw error;
    }
  }

  @Get('catalogue')
  catalogue(@Req() req: RequestWithAuthority) { return this.read(req.auth, () => this.preview.catalogue(req.auth)); }

  @Get()
  list(@Req() req: RequestWithAuthority) { return this.read(req.auth, () => this.preview.list(req.auth)); }

  @Get(':id/course/:courseCode')
  course(@Req() req: RequestWithAuthority, @Param('id') id: string, @Param('courseCode') courseCode: string) {
    return this.read(req.auth, () => this.preview.course(req.auth, id, courseCode));
  }

  @Post()
  async create(@Req() req: RequestWithAuthority, @Body() body: unknown) {
    try { return await this.preview.create(req.auth, body); }
    catch (error) {
      await auditAuth(this.prisma, { action: 'DemoMasterTimetableDraftSaved', outcome: 'DENY',
        actorAccountId: req.auth.accountId, activeRole: req.auth.activeRole, scope: req.auth.scope,
        purpose: 'fictional-timetable-planning', reason: 'draft-validation-or-authority-denied' });
      throw error;
    }
  }
}
