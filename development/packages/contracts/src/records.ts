/** Phase 4 slice 2: student conversion views (records module). Dates are ISO
 * server timestamps. Student numbers are human-readable but carry no
 * authority beyond identifying the record. */
export interface ConvertedStudentView {
  id: string;
  personId: string;
  studentNumber: string;
  status: string;
  attemptId: string;
  applicationId: string;
  intake: string;
  curriculumVersion: number | null;
  createdAt: string;
}
export interface IdentityCandidateView {
  id: string;
  applicationId: string;
  personId: string;
  candidatePersonId: string;
  reason: string;
  status: string;
  createdAt: string;
}
/** Phase 4 slice 3: readiness assessment views. Computed on demand; the
 * pendingRegulations list names open regulation boundaries that route to
 * academic decisions instead of inferred outcomes. */
export interface ReadinessConditionView {
  key: string;
  label: string;
  status: string;
  owner: string;
  detail: string;
  next: string;
}
export interface ReadinessView {
  attemptId: string;
  period: string;
  overall: string;
  pendingRegulations: string[];
  conditions: ReadinessConditionView[];
  assessedAt: string;
}
/** Phase 4 slice 4: draft course plan views. Validation results carry a
 * stable code plus a plain explanation; nothing here is official. */
export interface PlanCourseView {
  courseId: string;
  code: string;
  title: string;
  credits: number;
  courseType: string;
  semester: string | null;
  required: boolean;
  capacity: number;
  seatsRemaining: number | null;
  prerequisites: string[];
}
export interface PlanValidationView {
  courseId: string;
  code: string;
  result: 'PASS' | 'WARNING' | 'BLOCK' | 'APPROVAL_REQUIRED';
  resultCode: string;
  explanation: string;
}
export interface CoursePlanView {
  planId: string | null;
  attemptId: string;
  period: string;
  version: number;
  status: string;
  items: PlanCourseView[];
  available: PlanCourseView[];
  validation: PlanValidationView[];
  loadHalves: number;
  notices: string[];
}
/** Phase 4 slice 5: formal registration receipt and status views. The
 * snapshot is write-once; the receipt is the human-readable handle. */
export interface RegistrationReceiptView {
  id: string;
  receipt: string;
  attemptId: string;
  period: string;
  version: number;
  status: string;
  courses: Array<{
    code: string;
    title: string;
    credits: number;
    courseType: string;
    semester: string | null;
  }>;
  loadHalves: number;
  clearance: string;
  decidedAt: string;
}
export interface RegistrationStatusView {
  registration: RegistrationReceiptView | null;
  amendments: AmendmentView[];
  moodle: {
    state: string;
    detail: string;
  };
}
/** Phase 4 slice 6: amendment and waitlist views. Snapshots stay immutable;
 * every change is a versioned row with authority and impact recorded. */
export interface AmendmentView {
  id: string;
  version: number;
  kind: string;
  courseCode: string;
  courseTitle: string;
  reason: string;
  evidenceNote: string | null;
  status: string;
  createdAt: string;
}
export interface WaitlistView {
  id: string;
  courseCode: string;
  courseTitle: string;
  position: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}
/** Phase 4 slice 1: student portal home. Period-aware display plus the
 * applicant-onboarding remainder carried into student life. */
export interface StudentHomeView {
  studentNumber: string;
  status: string;
  displayName: string;
  programmeName: string;
  intake: string;
  campus: string;
  studyMode: string;
  period: string;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  onboardingRequiredTotal: number;
  onboardingRequiredComplete: number;
  pendingCorrections: number;
}
export interface StudentContactView {
  displayName: string;
  email: string | null;
  emailVerifiedAt: string | null;
  phone: string | null;
  phoneVerifiedAt: string | null;
}
export interface StudentCorrectionView {
  id: string;
  field: string;
  requestedValue: string;
  reason: string;
  status: string;
  createdAt: string;
}
