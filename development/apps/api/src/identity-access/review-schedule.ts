// Quarterly review scheduling (slice 5, handbook §12.12, journey :330-339:
// every grant adds its assignment to the access-review schedules).
// Rule (packet-local, GAP-010 institutional override pending): risk comes
// from security.roleRiskLevels, cadence days from security.reviewCadence.*,
// high-risk reviews quarterly, medium/low annually. Unknown roles default to
// medium — scheduling is workflow state, never access, so fail-open here is
// safe (fail-closed would break grants over a config typo).
export interface ReviewPlan {
  riskLevel: string;
  cadence: string;
  nextDueAt: Date;
}

const KNOWN_RISKS = ['high', 'medium', 'low'] as const;

export function planReviewSchedule(
  role: string,
  riskLevels: Record<string, string>,
  cadenceDays: { high: number; medium: number; low: number },
  now: Date,
): ReviewPlan {
  const raw = riskLevels[role];
  const riskLevel: string = (KNOWN_RISKS as readonly string[]).includes(raw)
    ? raw
    : 'medium';
  const cadence = riskLevel === 'high' ? 'quarterly' : 'annual';
  const days = cadenceDays[riskLevel as keyof typeof cadenceDays];
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error(`Invalid review cadence for risk ${riskLevel}: ${days}`);
  }
  return {
    riskLevel,
    cadence,
    nextDueAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
  };
}

// Minimal structural type for the Prisma interactive-transaction client, so
// unit fakes stay honest without importing the whole client.
export interface ScheduleWriter {
  reviewSchedule: {
    create(args: {
      data: {
        assignmentId: string;
        reviewerId: string;
        riskLevel: string;
        cadence: string;
        nextDueAt: Date;
        status: string;
      };
    }): Promise<unknown>;
  };
}

export async function createReviewSchedule(
  tx: ScheduleWriter,
  plan: ReviewPlan,
  assignmentId: string,
  reviewerId: string,
): Promise<void> {
  await tx.reviewSchedule.create({
    data: {
      assignmentId,
      reviewerId,
      riskLevel: plan.riskLevel,
      cadence: plan.cadence,
      nextDueAt: plan.nextDueAt,
      status: 'pending',
    },
  });
}
