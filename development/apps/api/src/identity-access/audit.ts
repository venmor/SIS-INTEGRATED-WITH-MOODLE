import { randomUUID } from 'node:crypto';
import { SECURITY_V1 } from '@sis/config';
import { PrismaService } from './prisma.service.js';

// Auth audit rows in final §16.14 shape (category/action/actor/idempotency/
// outcome, minimized content). Slice 5 formalizes review; rows start here so
// no rework is needed. Never log secrets — payloads stay out of metadata.
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
): Promise<void> {
  await prisma.auditEvent.create({
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
}
