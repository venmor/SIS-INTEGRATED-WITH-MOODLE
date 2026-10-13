import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { auditAuth } from '../identity-access/audit.js';
import { IncidentInterceptor } from '../identity-access/incident.interceptor.js';
import { PrismaService } from '../identity-access/prisma.service.js';
import { SessionGuard } from '../identity-access/session.guard.js';
import { InstitutionReadinessService } from './readiness.service.js';

interface SetupRequest {
  auth?: ActiveAuthority;
}

@Controller('institution-setup')
@UseInterceptors(IncidentInterceptor)
export class InstitutionReadinessController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readiness: InstitutionReadinessService,
  ) {}

  @Get('readiness')
  @UseGuards(SessionGuard)
  async report(@Req() req: SetupRequest) {
    const actor = req.auth;
    const now = new Date();
    const allowed =
      actor?.activeRole === 'SYSADMIN' &&
      actor.assignmentId &&
      (await this.prisma.roleAssignment.findFirst({
        where: {
          id: actor.assignmentId,
          accountId: actor.accountId,
          role: 'SYSADMIN',
          scopeType: 'SYSTEM',
          scopeRef: 'GLOBAL',
          startsAt: { lte: now },
          revokedAt: null,
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          account: { status: { equals: 'ACTIVE', mode: 'insensitive' } },
        },
        select: { id: true },
      }));
    if (!allowed) {
      await auditAuth(this.prisma, {
        action: 'InstitutionSetupReadinessViewed',
        outcome: 'DENY',
        actorAccountId: actor?.accountId,
        activeRole: actor?.activeRole,
        scope: actor?.scope,
        reason: 'inactive-or-out-of-scope-setup-operator',
        purpose: 'institution-setup-readiness',
      });
      throw new ForbiddenException(
        'This operational readiness report needs an active global System Administrator workspace.',
      );
    }
    await auditAuth(this.prisma, {
      action: 'InstitutionSetupReadinessViewed',
      outcome: 'ALLOW',
      actorAccountId: actor.accountId,
      activeRole: actor.activeRole,
      scope: actor.scope,
      purpose: 'institution-setup-readiness',
    });
    return this.readiness.report();
  }
}
