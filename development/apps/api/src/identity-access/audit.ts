import { randomUUID } from 'node:crypto';
import { SECURITY_V1 } from '@sis/config';
import { PrismaService } from './prisma.service.js';

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
    targetRef?: string;
    reason?: string;
    errorCategory?: string;
  },
): Promise<{ correlationId: string }> {
  const row = await prisma.auditEvent.create({
    data: {
      action: entry.action,
      outcome: entry.outcome,
      actorAccountId: entry.actorAccountId ?? null,
      targetRef: entry.targetRef,
      reason: entry.reason,
      errorCategory: entry.errorCategory,
      policyVersion: SECURITY_V1.version,
      correlationId: randomUUID(),
    },
  });
  return { correlationId: row.correlationId ?? '' };
}
