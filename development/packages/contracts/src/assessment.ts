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
/** Phase 7 slice 2: staged grade snapshot views (TASK-PH7-002). Lines
 * carry provenance (raw value, outcome code, converted value kept null
 * until validation); quarantine flags isolate invalid lines. */
export interface GradeLineView {
  id: string;
  studentRef: string;
  rawValue: number | null;
  outcome: string;
  convertedValue: number | null;
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
  lines: GradeLineView[];
}
