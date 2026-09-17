import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { SECURITY_V1 } from '@sis/config';
import { PrismaService } from './prisma.service.js';
import { currentIncidentRef } from './request-context.js';

// Auth audit rows in final §16.14 shape (11 fields: error category,
// workflow/action ref, actor/role+scope, record ref, idempotency ref, provider
// ref, retry attempts, resolution evidence, notification+delivery, incident ref,
// time+outcome — plus 07/02 actor/active-role/scope/command/target/prior-new/
// policy/reason/time/correlation/outcome; minimized content). Slice 5
// formalizes review; rows start here so no rework is needed. Returns the row
// so callers can surface correlationId as the §16.1 user support reference.
// Never log secrets — payloads stay out of metadata.
export async function auditAuth(
  prisma: PrismaService,
  entry: {
    action: string;
    outcome: 'ALLOW' | 'DENY';
    actorAccountId?: string | null;
    activeRole?: string | null;
    scope?: string | null;
    targetRef?: string;
    reason?: string;
    errorCategory?: string;
    purpose?: string | null;
    idempotencyRef?: string | null;
    priorState?: Prisma.InputJsonObject | null;
    newState?: Prisma.InputJsonObject | null;
    metadata?: Prisma.InputJsonObject | null;
  },
): Promise<{ correlationId: string }> {
  // §12.11 every-action audit: inside an emergency request (interceptor-set
  // incident), tag the row unless the caller already recorded it. Daemon and
  // guard paths run outside any store and pass through untouched.
  const incidentRef = currentIncidentRef();
  const metadata =
    incidentRef && !(entry.metadata && 'incidentRef' in entry.metadata)
      ? { ...(entry.metadata ?? {}), incidentRef }
      : (entry.metadata ?? undefined);
  const row = await prisma.auditEvent.create({
    data: {
      action: entry.action,
      outcome: entry.outcome,
      actorAccountId: entry.actorAccountId ?? null,
      activeRole: entry.activeRole ?? null,
      scope: entry.scope ?? null,
      targetRef: entry.targetRef,
      reason: entry.reason,
      errorCategory: entry.errorCategory,
      purpose: entry.purpose ?? null,
      idempotencyRef: entry.idempotencyRef ?? null,
      priorState: entry.priorState ?? undefined,
      newState: entry.newState ?? undefined,
      metadata,
      policyVersion: SECURITY_V1.version,
      correlationId: randomUUID(),
    },
  });
  return { correlationId: row.correlationId };
}
