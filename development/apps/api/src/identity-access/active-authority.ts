import type { PrismaService } from './prisma.service.js';

/** Context resolved from the session by SessionGuard, never from request JSON. */
export interface ActiveAuthority {
  accountId: string;
  assignmentId: string | null;
  activeRole: string | null;
  scope: string | null;
}

/** Ordinary IAM administration cannot borrow an unselected or future role,
 * nor turn an incident-only emergency assignment into general administration. */
export async function hasActiveAuthority(
  prisma: PrismaService,
  actor: ActiveAuthority,
  allowedRoles: string[],
): Promise<boolean> {
  if (
    !actor.assignmentId ||
    !actor.activeRole ||
    !allowedRoles.includes(actor.activeRole)
  )
    return false;
  const now = new Date();
  return !!(await prisma.roleAssignment.findFirst({
    where: {
      id: actor.assignmentId,
      accountId: actor.accountId,
      role: actor.activeRole,
      scopeType: { not: 'BREAK_GLASS' },
      startsAt: { lte: now },
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      account: { status: { equals: 'ACTIVE', mode: 'insensitive' } },
    },
    select: { id: true },
  }));
}
