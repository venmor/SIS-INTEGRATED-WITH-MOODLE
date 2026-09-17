import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import { PrismaService } from './prisma.service.js';
import { ConfigurationService } from './configuration.service.js';
import { auditAuth } from './audit.js';
import type { AuditTimelineQueryDto } from './dto.js';

// Immutable audit timeline (slice 5, §15.19 admin rows, §14.26 timeline).
// IAM administrators (security.grantorRoles) read a paginated, server-side
// filtered trail with the permitted field list only: workflow content
// (purpose) rides along, but raw payloads (metadata) and state diffs
// (prior/new) stay out of the list view. Every refusal is audited.
@Injectable()
export class AuditTimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigurationService,
  ) {}

  async getTimeline(actorId: string, filters: AuditTimelineQueryDto) {
    const grantorRoles = await this.config.getOrThrow<string[]>(
      'security.grantorRoles',
    );
    const live = await this.prisma.roleAssignment.findMany({
      where: {
        accountId: actorId,
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { role: true },
    });
    if (!live.some((a) => grantorRoles.includes(a.role))) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-AuditTimeline',
        outcome: 'DENY',
        actorAccountId: actorId,
        reason: 'timeline-forbidden',
        errorCategory: 'ERR-SEC',
      });
      throw new ForbiddenException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    if (
      filters.startDate &&
      filters.endDate &&
      new Date(filters.startDate).getTime() >
        new Date(filters.endDate).getTime()
    ) {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-AuditTimeline',
        outcome: 'DENY',
        actorAccountId: actorId,
        reason: 'timeline-inverted-range',
        errorCategory: 'ERR-SEC',
      });
      throw new BadRequestException({
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      });
    }

    const where: {
      actorAccountId?: string;
      activeRole?: string;
      scope?: string;
      action?: string;
      correlationId?: string;
      occurredAt?: { gte?: Date; lte?: Date };
    } = {};
    if (filters.actorAccountId) where.actorAccountId = filters.actorAccountId;
    if (filters.role) where.activeRole = filters.role;
    if (filters.scope) where.scope = filters.scope;
    if (filters.action) where.action = filters.action;
    if (filters.correlationId) where.correlationId = filters.correlationId;
    if (filters.startDate || filters.endDate) {
      where.occurredAt = {};
      if (filters.startDate) where.occurredAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.occurredAt.lte = new Date(filters.endDate);
    }

    const [events, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
        select: {
          id: true,
          occurredAt: true,
          actorAccountId: true,
          activeRole: true,
          scope: true,
          action: true,
          targetRef: true,
          outcome: true,
          reason: true,
          purpose: true,
          correlationId: true,
          errorCategory: true,
        },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    // §19 access-to-audit is itself audited: successful reads leave one
    // ALLOW row (admin-only surface, low volume — no flood risk).
    await auditAuth(this.prisma, {
      action: 'CMD-IAM-AuditTimeline',
      outcome: 'ALLOW',
      actorAccountId: actorId,
      reason: 'timeline-read',
      purpose: 'audit-access',
    });

    return { events, total };
  }
}
