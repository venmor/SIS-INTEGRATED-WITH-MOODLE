import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import { PrismaService } from './prisma.service.js';
import { ConfigurationService } from './configuration.service.js';
import { auditAuth } from './audit.js';
import {
  hasActiveAuthority,
  type ActiveAuthority,
} from './active-authority.js';
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

  async getTimeline(actor: ActiveAuthority, filters: AuditTimelineQueryDto) {
    const actorId = actor.accountId;
    const grantorRoles = await this.config.getOrThrow<string[]>(
      'security.grantorRoles',
    );
    if (!(await hasActiveAuthority(this.prisma, actor, grantorRoles))) {
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
    // ALLOW row (admin-only surface, low volume — no flood risk), fully
    // attributed with the reader's active role and scope.
    await auditAuth(this.prisma, {
      action: 'CMD-IAM-AuditTimeline',
      outcome: 'ALLOW',
      actorAccountId: actorId,
      activeRole: actor.activeRole,
      scope: actor.scope,
      reason: 'timeline-read',
      purpose: 'audit-access',
    });

    return { events, total };
  }

  private async liveRoleAssignment(
    actor: ActiveAuthority,
    role: string,
    capability: string,
  ) {
    if (!actor.assignmentId) return null;
    const now = new Date();
    return this.prisma.roleAssignment.findFirst({
      where: {
        id: actor.assignmentId,
        accountId: actor.accountId,
        role,
        capabilities: { has: capability },
        startsAt: { lte: now },
        revokedAt: null,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        account: { status: 'ACTIVE' },
      },
    });
  }

  private neutralNotFound(): never {
    // Entity timelines never confirm whether a hidden record exists.
    throw new NotFoundException({ message: 'Timeline unavailable.' });
  }

  /**
   * Phase 8 slice 2 entity timeline (TASK-PH8-002). Joins every source
   * the caller may already read — same allow-lists and filters as the
   * direct endpoints, merged newest-first. Unknown kinds refuse 400;
   * unknown or foreign ids stay neutral 404s. Reads are audited.
   */
  async getEntityTimeline(
    actor: ActiveAuthority,
    kind: string,
    id: string,
    take = 100,
  ) {
    if (!['application', 'result-package'].includes(kind)) {
      throw new BadRequestException({ message: 'Unknown timeline entity.' });
    }
    if (kind === 'application') {
      return this.applicationTimeline(actor, id, take);
    }
    return this.packageTimeline(actor, id, take);
  }

  private async applicationTimeline(
    actor: ActiveAuthority,
    id: string,
    take: number,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });
    if (!application) {
      await this.denyEntityRead(actor, id, 'timeline-foreign-application');
      this.neutralNotFound();
    }
    const owned =
      !!actor.accountId && application.accountId === actor.accountId;
    let staff = false;
    if (!owned) {
      const officer = await this.liveRoleAssignment(
        actor,
        'ADMISSIONS_OFFICER',
        'review-assigned',
      );
      const approver = await this.liveRoleAssignment(
        actor,
        'ADMISSIONS_APPROVER',
        'decide-offer',
      );
      staff = !!(officer || approver);
      if (!staff) {
        await this.denyEntityRead(actor, id, 'timeline-foreign-application');
        this.neutralNotFound();
      }
    }
    const [audits, statuses] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where: { targetRef: id },
        orderBy: { occurredAt: 'desc' },
        take: 100,
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
      this.prisma.applicationStatusEvent.findMany({
        where: {
          applicationId: id,
          ...(owned && !staff ? { applicantVisible: true } : {}),
        },
        orderBy: { occurredAt: 'desc' },
        take: 100,
      }),
    ]);
    const items = [
      ...audits.map((a) => ({
        source: 'AUDIT',
        occurredAt: a.occurredAt.toISOString(),
        actorRole: a.activeRole,
        summary: `${a.action} — ${a.outcome}`,
        applicantVisible: true as boolean | undefined,
        action: a.action,
      })),
      ...statuses.map((s) => ({
        source: 'STATUS_EVENT',
        occurredAt: s.occurredAt.toISOString(),
        actorRole: s.actorRole,
        summary: `${s.code}: ${s.label}`,
        applicantVisible: s.applicantVisible,
        code: s.code,
      })),
    ]
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
      .slice(0, Math.min(Math.max(take, 1), 100));
    await auditAuth(this.prisma, {
      action: 'CMD-IAM-EntityTimeline',
      outcome: 'ALLOW',
      actorAccountId: actor.accountId,
      activeRole: actor.activeRole,
      scope: actor.scope,
      reason: 'entity-timeline-read',
      purpose: 'audit-access',
    });
    return { kind: 'application', id, items };
  }

  private async packageTimeline(
    actor: ActiveAuthority,
    id: string,
    take: number,
  ) {
    const pkg = await this.prisma.resultPackage.findUnique({
      where: { id },
    });
    if (!pkg) {
      await this.denyEntityRead(actor, id, 'timeline-foreign-package');
      this.neutralNotFound();
    }
    const candidates: Array<[string, string]> = [
      ['LEC', 'stage-marks'],
      ['COORDINATOR', 'approve-assessment'],
      ['EXAMINATIONS_OFFICER', 'validate-results'],
      ['MODERATOR', 'moderate-results'],
      ['MOODLE_ADMIN', 'manage-mapping'],
    ];
    let staff = false;
    for (const [role, capability] of candidates) {
      const assignment = await this.liveRoleAssignment(
        actor,
        role,
        capability,
      );
      if (assignment && actor.activeRole === role) {
        staff = true;
        break;
      }
    }
    if (!staff) {
      await this.denyEntityRead(actor, id, 'timeline-foreign-package');
      this.neutralNotFound();
    }
    const [audits, decisions, results] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where: { targetRef: id },
        orderBy: { occurredAt: 'desc' },
        take: 100,
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
      this.prisma.boardDecision.findMany({
        where: { packageId: id },
        orderBy: { decidedAt: 'desc' },
        take: 100,
      }),
      this.prisma.officialCourseResult.findMany({
        where: { packageId: id },
        orderBy: { publishedAt: 'desc' },
        take: 100,
      }),
    ]);
    const items = [
      ...audits.map((a) => ({
        source: 'AUDIT',
        occurredAt: a.occurredAt.toISOString(),
        actorRole: a.activeRole,
        summary: `${a.action} — ${a.outcome}`,
      })),
      ...decisions.map((d) => ({
        source: 'BOARD_DECISION',
        occurredAt: d.decidedAt.toISOString(),
        actorRole: 'EXAMINATIONS_OFFICER' as string | null,
        summary: `Board decision ${d.to}${d.reason ? ` — ${d.reason}` : ''}`,
      })),
      ...results.map((r) => ({
        source: 'OFFICIAL_RESULT',
        occurredAt: r.publishedAt.toISOString(),
        actorRole: null as string | null,
        summary: `Official result v${r.version}: ${r.total} ${r.outcome}`,
      })),
    ]
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
      .slice(0, Math.min(Math.max(take, 1), 100));
    await auditAuth(this.prisma, {
      action: 'CMD-IAM-EntityTimeline',
      outcome: 'ALLOW',
      actorAccountId: actor.accountId,
      activeRole: actor.activeRole,
      scope: actor.scope,
      reason: 'entity-timeline-read',
      purpose: 'audit-access',
    });
    return { kind: 'result-package', id, items };
  }

  private async denyEntityRead(
    actor: ActiveAuthority,
    id: string,
    reason: string,
  ) {
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-EntityTimeline',
      outcome: 'DENY',
      actorAccountId: actor.accountId,
      reason,
      errorCategory: 'ERR-SEC',
    });
    void correlationId;
  }
}
