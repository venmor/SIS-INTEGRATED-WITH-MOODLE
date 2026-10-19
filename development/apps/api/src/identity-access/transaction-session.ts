import { createHash } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import { SECURITY_V1 } from '@sis/config';
import type { Prisma } from '@prisma/client';
import type { ActiveAuthority } from './active-authority.js';

export type SessionAuthority = ActiveAuthority & { sessionToken?: string };
/** Call inside the final mutation transaction, including receipt replays.
 * Keep account → assignment → session lock order consistent with publication.
 * Provider I/O must happen outside this transaction; recheck afterwards.
 */
export async function requireActiveTransactionSession(
  db: Prisma.TransactionClient,
  actor: SessionAuthority,
): Promise<void> {
  if (!actor.sessionToken || !actor.assignmentId || !actor.activeRole)
    throw new ForbiddenException('CURRENT_SESSION_REQUIRED');
  const tokenHash = createHash('sha256')
    .update(actor.sessionToken)
    .digest('hex');
  await db.$queryRaw`SELECT id FROM "Account" WHERE id = ${actor.accountId} FOR SHARE`;
  await db.$queryRaw`SELECT id FROM "RoleAssignment" WHERE id = ${actor.assignmentId} FOR SHARE`;
  await db.$queryRaw`SELECT id FROM "Session" WHERE "tokenHash" = ${tokenHash} FOR SHARE`;
  const now = new Date();
  const session = await db.session.findFirst({
    where: {
      tokenHash,
      accountId: actor.accountId,
      activeAssignmentId: actor.assignmentId,
      revokedAt: null,
      expiresAt: { gt: now },
      lastSeenAt: {
        gt: new Date(now.getTime() - SECURITY_V1.session.idleSeconds * 1000),
      },
      account: { status: 'ACTIVE' },
      activeAssignment: {
        accountId: actor.accountId,
        role: actor.activeRole,
        revokedAt: null,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
    },
    include: { activeAssignment: true },
  });
  const assignment = session?.activeAssignment;
  if (
    !assignment ||
    actor.scope !== `${assignment.scopeType}:${assignment.scopeRef}`
  )
    throw new ForbiddenException('CURRENT_SESSION_REQUIRED');
}
