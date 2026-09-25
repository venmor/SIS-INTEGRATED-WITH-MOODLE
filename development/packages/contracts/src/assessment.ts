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
