import { Injectable } from '@nestjs/common';
import { AUTH_MESSAGES, SECURITY_V1 } from '@sis/config';
import { PrismaService } from './prisma.service.js';
import { auditAuth } from './audit.js';
import type { GrantRoleDto } from './dto.js';

// ACT-IAM-001 grants (slice 3). Authority rule: the grantor must act under a
// live grantor-role workspace (demo mapping of the IAM Administrator,
// SECURITY-v1 grantorRoles — the handbook names the role, not a person).
// High-risk self-assignment is denied; unknown users get the neutral reply.
@Injectable()
export class GrantsService {
  constructor(private readonly prisma: PrismaService) {}

  async grant(
    dto: GrantRoleDto,
    grantor: { accountId: string; activeRole: string | null; activeScope: string | null },
  ) {
    const deny = async (reason: string, targetRef?: string, forbidden = false) => {
      const { correlationId } = await auditAuth(this.prisma, {
        action: 'CMD-IAM-GrantRole',
        outcome: 'DENY',
        actorAccountId: grantor.accountId,
        activeRole: grantor.activeRole,
        scope: grantor.activeScope,
        targetRef,
        reason,
        errorCategory: 'ERR-SEC',
      });
      return {
        ok: false as const,
        forbidden,
        message: AUTH_MESSAGES.grantDenied.text,
        reference: correlationId,
      };
    };
    if (!grantor.activeRole || !SECURITY_V1.grantorRoles.includes(grantor.activeRole)) {
      return deny('grantor-not-authorized', undefined, true);
    }
    const target = await this.prisma.account.findUnique({ where: { username: dto.username } });
    if (!target || target.status !== 'ACTIVE') {
      return deny('unknown-or-inactive-account', dto.username);
    }
    if (target.id === grantor.accountId) {
      return deny('self-assignment-denied', target.username, true);
    }
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt))) {
      return deny('invalid-effective-period', target.username);
    }
    const overlap = await this.prisma.roleAssignment.findFirst({
      where: {
        accountId: target.id,
        role: dto.role,
        scopeType: dto.scopeType,
        scopeRef: dto.scopeRef,
        revokedAt: null,
        startsAt: { lte: endsAt ?? new Date(8640000000000000) },
        OR: [{ endsAt: null }, { endsAt: { gte: startsAt } }],
      },
    });
    if (overlap) {
      return deny('duplicate-or-overlap', target.username);
    }
    const row = await this.prisma.roleAssignment.create({
      data: {
        accountId: target.id,
        role: dto.role,
        scopeType: dto.scopeType,
        scopeRef: dto.scopeRef,
        startsAt,
        endsAt,
        grantedById: grantor.accountId,
        appointmentRef: dto.appointmentRef,
        authoritySource: dto.authoritySource,
        capabilities: dto.capabilities ?? [],
        employmentType: dto.employmentType,
        delegationLimit: dto.delegationLimit,
        approverId: dto.approverId,
        reason: dto.reason,
      },
    });
    const { correlationId } = await auditAuth(this.prisma, {
      action: 'CMD-IAM-GrantRole',
      outcome: 'ALLOW',
      actorAccountId: grantor.accountId,
      activeRole: grantor.activeRole,
      scope: grantor.activeScope,
      targetRef: row.id,
      reason: 'role-assigned',
    });
    return {
      ok: true as const,
      assignmentId: row.id,
      message: AUTH_MESSAGES.grantCreated.text,
      reference: correlationId,
    };
  }
}
