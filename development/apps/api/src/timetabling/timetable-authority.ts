import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ActiveAuthority } from '../identity-access/active-authority.js';
import { timetableDemoDraftsEnabled } from './demo-rules.service.js';
export async function lockTimetableAuthority(
  db: Prisma.TransactionClient,
  actor: ActiveAuthority,
) {
  await db.$queryRaw`SELECT r."id" FROM "RoleAssignment" r JOIN "Account" a ON a."id" = r."accountId" JOIN "Person" p ON p."id" = a."personId"
    WHERE r."id" = ${actor.assignmentId ?? ''} AND a."id" = ${actor.accountId} FOR SHARE OF r,a,p`;
}
export async function timetableAppointment(
  db: Prisma.TransactionClient,
  actor: ActiveAuthority,
  action: 'read' | 'draft' | 'publish',
) {
  if (!timetableDemoDraftsEnabled()) throw new NotFoundException();
  const coordinator = actor.activeRole === 'TIMETABLE_COORDINATOR';
  const publisher = actor.activeRole === 'DOMAIN_ADMIN';
  if (
    !actor.assignmentId ||
    !(action === 'draft'
      ? coordinator
      : action === 'publish'
        ? publisher
        : coordinator || publisher)
  )
    throw new ForbiddenException(
      'Switch to your appointed fictional timetable workspace.',
    );
  const now = new Date();
  const assignment = await db.roleAssignment.findFirst({
    where: {
      id: actor.assignmentId,
      accountId: actor.accountId,
      role: coordinator ? 'TIMETABLE_COORDINATOR' : 'DOMAIN_ADMIN',
      scopeType: 'SYSTEM',
      scopeRef: 'DEMO-UNIVERSITY',
      capabilities: {
        has: coordinator
          ? 'timetable-demo-master-draft'
          : 'timetable-demo-master-publish',
      },
      startsAt: { lte: now },
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      account: {
        status: { equals: 'ACTIVE', mode: 'insensitive' },
        person: { status: 'ACTIVE' },
      },
    },
    select: { id: true, account: { select: { personId: true } } },
  });
  if (!assignment)
    throw new ForbiddenException(
      'Your timetable appointment is inactive or outside this action. No timetable was published.',
    );
  return assignment;
}
