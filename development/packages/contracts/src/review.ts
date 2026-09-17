/**
 * Canonical slice-5 review shapes (TASK-PH1-005). Mirrors the Prisma
 * ReviewSchedule model and the /auth/reviews endpoints; UI renders these,
 * never invented fields.
 */

export type ReviewDecision =
  "confirm" | "reduce" | "reassign" | "revoke" | "clarify";

export interface ReviewSchedule {
  id: string;
  assignmentId: string;
  reviewerId: string;
  riskLevel: string;
  cadence: string;
  nextDueAt: string;
  status: string;
  decision: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
}

export interface DecideReviewBody {
  decision: ReviewDecision;
  reason: string;
}

export interface ReinstateBody {
  assignmentId: string;
  reason: string;
  evidence: string;
}

export interface ReinstateResponse {
  assignmentId: string;
  message: string;
  reference: string;
}

export interface BreakGlassBody {
  incidentRef: string;
  reason: string;
  scope: string;
  durationMinutes: number;
  approverId: string;
}

export interface BreakGlassResponse {
  breakGlassId: string;
  assignmentId: string;
  expiresAt: string;
  message: string;
  reference: string;
  replay: boolean;
}

export type BreakGlassOutcome = "justified" | "excessive" | "breach";

export interface BreakGlassReviewBody {
  outcome: BreakGlassOutcome;
  note: string;
}

export interface BreakGlassReviewResponse {
  breakGlassId: string;
  reviewOutcome: string | null;
  message: string;
  reference: string;
}

export interface ExpiryWarningView {
  id: string;
  assignmentId: string;
  warnedAt: string;
  endsAt: string | null;
  role: string;
  scopeType: string;
  scopeRef: string;
}
