/** Phase 7 slice 1: assessment views (TASK-PH7-001). Versioned
 * assessment-scheme registry per offering+period with a DRAFT→APPROVED
 * lifecycle (approval supersedes, never edits); grade-activity mappings
 * bind one Moodle activity to one approved component. ISO date strings. */
export interface AssessmentComponentView {
  id: string;
  planId: string;
  code: string;
  maxMark: number;
  weight: number;
  scaleRef: string;
  moderationRequired: boolean;
  status: string;
}
export interface AssessmentPlanView {
  id: string;
  offeringRef: string;
  periodCode: string;
  version: number;
  status: string;
  policyVersion: string;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  approvedAt: string | null;
  components: AssessmentComponentView[];
}
export interface GradeMappingView {
  id: string;
  componentId: string;
  moodleActivityId: string;
  moodleCourseRef: string;
  status: string;
  version: number;
  testResult: unknown;
  createdAt: string;
}
export interface GradeMappingTestView {
  id: string;
  result: 'PASS' | 'FAIL';
  reasons: string[];
  conditions: Array<{ condition: string; passed: boolean }>;
}
/** Phase 7 slice 2: staged grade snapshot views (TASK-PH7-002). Batches
 * freeze DS5 §4 provenance (source + SIS coordinates in force at stage
 * time); lines carry the raw value, outcome code, converted value (null
 * until validation), resolved SIS identity (null stays MOODLE_ONLY
 * evidence) and the applied conversion formula. Quarantine flags isolate
 * invalid lines. ISO date strings. */
export interface GradeLineView {
  id: string;
  studentRef: string;
  rawValue: number | null;
  outcome: string;
  convertedValue: number | null;
  conversionFormula: string | null;
  resolvedStudentId: string | null;
  resolvedAccountId: string | null;
  status: string;
  flagCode: string | null;
}
export interface GradeBatchView {
  id: string;
  mappingId: string;
  sourceRevision: string;
  status: string;
  version: number;
  createdAt: string;
  moodleInstance: string;
  moodleCourseRef: string;
  moodleActivityId: string;
  offeringRef: string;
  periodCode: string;
  componentCode: string;
  planVersion: number;
  policyVersion: string;
  sourceResponse: unknown;
  resultState: string | null;
  validatedAt: string | null;
  validatedByAccountId: string | null;
  lines: GradeLineView[];
  findings: GradeFindingView[];
}
/** Phase 7 slice 3: immutable validation findings (TASK-PH7-003).
 * Findings triage OPEN→ACKNOWLEDGED→RESOLVED/DISMISSED; lanes scope
 * queue visibility (TECHNICAL/ACADEMIC/ENROLMENT). Missing marks carry
 * the owned, deadline-bound work item; nothing is stored as zero. */
export interface GradeFindingView {
  id: string;
  batchId: string;
  lineId: string | null;
  code: string;
  lane: string;
  status: string;
  version: number;
  ownerUnit: string | null;
  escalationDeadline: string | null;
  createdAt: string;
}
export interface GradeValidationView {
  id: string;
  resultState: string | null;
  validatedAt: string;
  findings: GradeFindingView[];
}
/** Phase 7 slice 4: moderation handoff views (TASK-PH7-004). Cases move
 * SUBMITTED→UNDER_MODERATION→APPROVED/RETURNED/CLARIFICATION_REQUESTED/
 * REFERRED; approval writes immutable official CA records (versioned per
 * student+component). Candidate lists carry expected participants. */
export interface ModerationCaseView {
  id: string;
  batchId: string;
  status: string;
  version: number;
  declaration: string;
  submittedBy: string;
  submittedAt: string;
  reviewer: string | null;
  reviewedAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
}
export interface CandidateListView {
  id: string;
  offeringRef: string;
  periodCode: string;
  version: number;
  status: string;
  studentRefs: string[];
}
/** Phase 7 slice 5: board/decision package views (TASK-PH7-005). Packages
 * freeze approved official CA refs, the weighted-total-v1 preview + trace,
 * moderation refs, candidate-list reconciliation, declarations and a
 * SHA-256 hash. Board decisions record one of six outcomes with reasons
 * and stored conditions (slice-6 enforcement). ISO date strings. */
export interface ResultPackageView {
  id: string;
  offeringRef: string;
  periodCode: string;
  version: number;
  status: string;
  packageHash: string;
  trace: unknown;
  candidateListId: string;
  declaration: string;
  preparedBy: string;
  createdAt: string;
}
export interface BoardDecisionView {
  version: number;
  to: string;
  reason: string | null;
  conditions: unknown;
  decidedBy: string;
  decidedAt: string;
}
export interface ResultPackageDetailView extends ResultPackageView {
  decisions: BoardDecisionView[];
}
/** Phase 7 slice 6: official release views (TASK-PH7-006). Students see
 * only their own RELEASED rows; outcome PASS/FAIL derives from the demo
 * pass mark (interim, SUP-009). ISO date strings. */
export interface OfficialResultView {
  offeringRef: string;
  periodCode: string;
  studentRef: string;
  total: number;
  outcome: string;
  version: number;
  publishedAt: string;
}
export interface ReleaseView {
  packageId: string;
  version: number;
  status: string;
  studentCount: number;
  releaseHash: string;
  publishedAt: string;
}
/** Phase 7 slice 7: result amendment skeleton views (TASK-PH7-007).
 * Cases move OPEN→APPROVED/DECLINED; approval writes a new immutable
 * official row (supersede link in trace) + an academic-impact stub
 * task (progression recalculation queue). Students see only the
 * latest RELEASED version. ISO date strings. */
export interface AmendmentCaseView {
  id: string;
  packageId: string;
  studentRef: string;
  status: string;
  version: number;
  correctedTotal: number;
  correctedOutcome: string;
  reason: string;
  requestedBy: string;
  createdAt: string;
}
export interface AcademicImpactView {
  id: string;
  kind: string;
  status: string;
  studentRef: string;
}
export interface AmendmentCaseDetailView extends AmendmentCaseView {
  decidedBy: string | null;
  decidedAt: string | null;
  impacts: AcademicImpactView[];
}
