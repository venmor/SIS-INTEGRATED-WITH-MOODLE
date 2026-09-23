export type { HealthResponse } from "./health.js";
// Types-only barrel: every consumer imports `import type`, erased before
// emit, so package.json exports target this source directly (no dist).
// Non-spec sources import these shapes since TASK-PH2-001.
export type {
  SignInBody,
  AuthAccount,
  SignInResponse,
  RecoveryRequestBody,
  RecoveryConfirmBody,
  RecoveryResponse,
  WorkspaceAssignment,
  ActiveWorkspace,
  MeResponse,
  SwitchWorkspaceBody,
  SwitchWorkspaceResponse,
  GrantRoleBody,
  GrantRoleResponse,
  ResolveGrantTargetBody,
  ResolveGrantTargetResponse,
} from "./auth.js";
export type {
  ReviewDecision,
  ReviewSchedule,
  DecideReviewBody,
  ReinstateBody,
  ReinstateResponse,
  BreakGlassBody,
  BreakGlassResponse,
  BreakGlassOutcome,
  BreakGlassReviewBody,
  BreakGlassReviewResponse,
  ExpiryWarningView,
} from "./review.js";
export type { AuditTimelineRow, AuditTimelineResponse } from "./audit.js";
export type {
  AvailabilityStatus,
  CataloguePage,
  CompareResult,
  GuidanceEvaluation,
  GuidanceResult,
  GuidanceVerdict,
  ProgrammeOfferingDetail,
  ProgrammeSummary,
  RequirementFact,
  RequirementKind,
  RequirementRule,
} from "./catalogue.js";
export type * from "./applications.js";
export type * from "./records.js";
export type * from "./finance.js";
