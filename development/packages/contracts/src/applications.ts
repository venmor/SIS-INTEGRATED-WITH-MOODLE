/** Phase 2 application boundary. All dates are ISO server timestamps. */
export type ApplicationSection = "personal" | "contact" | "qualifications";
export interface PersonalDetails {
  givenName: string;
  familyName: string;
  otherNames?: string;
  preferredName?: string;
  dateOfBirth: string;
}
export interface ContactDetails {
  preferredChannel: "PORTAL" | "EMAIL";
  alternateEmail?: string;
  address?: string;
}
export interface QualificationDetails {
  routeCode: string;
  institution: string;
  awardTitle: string;
  completionYear: number;
  status: "COMPLETED" | "AWAITING";
  subjects: { subject: string; grade: number }[];
}
export interface ApplicationPolicy {
  version: string;
  demo: boolean;
  timezone: string;
  maxActivePerIntake: number;
  maxChoices: number;
  fee: { status: "NOT_REQUIRED"; explanation: string };
  contactRequirement: string;
  upload: {
    maxBytes: number;
    mimeTypes: string[];
    extensions: string[];
    minimumStage: string;
    scanner: string;
  };
  declarations: {
    id: string;
    version: string;
    text: string;
    required: boolean;
    owner: string;
    effectiveDate: string;
    purpose: string;
  }[];
  rateLimit: {
    generalPerMinute: number;
    documentsPerMinute: number;
    windowMinutes: number;
  };
  autosaveDelayMs: number;
  routes: { code: string; label: string }[];
  qualifications: {
    subjects: string[];
    grades: number[];
    minimumYear: number;
    allowAwaiting: boolean;
  };
  help: string;
}
export interface ApplicationOffering {
  id: string;
  programmeName: string;
  programmeCode: string;
  intake: string;
  studyMode: string;
  campus: string;
  deadline: string | null;
  requirementVersion: string;
}
export interface ApplicationDocument {
  id: string;
  category: string;
  fileName: string;
  mimeType: string;
  size: number;
  status:
    | "SecurityScanPending"
    | "SecurityScanFailed"
    | "AwaitingQualityCheck"
    | "Withdrawn";
  statusLabel: string;
  version: number;
  replacesId: string | null;
  createdAt: string;
  canPreview: boolean;
  scanner: string | null;
}
export interface ApplicationBlocker {
  section: string;
  field?: string;
  message: string;
}
export interface ApplicationView {
  id: string;
  reference: string;
  state:
    | "Created"
    | "InProgress"
    | "ReadyForReview"
    | "Discarded"
    | "Submitted"
    | "Withdrawn";
  version: number;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
  lockReason: string | null;
  offering: ApplicationOffering;
  policyVersion: string;
  personal: Partial<PersonalDetails>;
  contact: Partial<ContactDetails>;
  qualifications: Partial<QualificationDetails>;
  verifiedContact: {
    email: string | null;
    phone: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  sections: { key: string; label: string; state: string }[];
  completeCount: number;
  requiredCount: number;
  documents: ApplicationDocument[];
  requiredDocuments: { category: string; label: string; purpose: string }[];
  blockers: ApplicationBlocker[];
  receipt: SubmissionReceipt | null;
  requirementChanged: boolean;
}
export interface ApplicationReview {
  application: ApplicationView;
  policy: ApplicationPolicy;
  ready: boolean;
  blockers: ApplicationBlocker[];
}
export interface SubmissionReceipt {
  applicationId: string;
  reference: string;
  submittedAt: string;
  snapshotId: string;
  version: number;
  institution: string;
  applicantName: string;
  offering: ApplicationOffering;
  status: "Submitted";
  policyVersion: string;
  paymentStatus: string;
  documents: { category: string; status: string; version: number }[];
  verificationReference: string;
  help: string;
  nextStep: string;
  declarations: { id: string; version: string; acceptedAt: string }[];
}
export interface ApplicationError {
  code: string;
  message: string;
  saved: boolean;
  supportReference: string;
  nextAction: string;
  fieldErrors?: Record<string, string>;
  currentVersion?: number;
  applicationId?: string;
}
/** Phase 2 slice 6: post-submit case views. All dates ISO server timestamps. */
export interface ApplicationStatusEvent {
  id: string;
  occurredAt: string;
  code: string;
  label: string;
  detail: string | null;
  actorRole: string;
  applicantVisible: boolean;
}
export interface ApplicantTimeline {
  applicationId: string;
  reference: string;
  state: string;
  version: number;
  events: ApplicationStatusEvent[];
}
export type ClarificationStatus = "OPEN" | "ANSWERED" | "CLOSED";
export interface ClarificationView {
  id: string;
  question: string;
  deadline: string | null;
  response: string | null;
  status: ClarificationStatus;
  askedBy: string;
  askedAt: string;
  answeredAt: string | null;
  receipt: string | null;
}
export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface CorrectionRequestView {
  id: string;
  section: string;
  field: string;
  reason: string;
  status: CorrectionStatus;
  createdAt: string;
  decidedAt: string | null;
}
export type DecisionOutcome = "OFFERED" | "NOT_OFFERED" | "WAITLISTED";
export interface DecisionView {
  applicationId: string;
  reference: string;
  outcome: DecisionOutcome;
  message: string;
  conditions: string[];
  decidedAt: string;
}
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export interface TicketMessageView {
  id: string;
  authorRole: string;
  body: string;
  createdAt: string;
}
export interface SupportTicketView {
  id: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  messages: TicketMessageView[];
}
export interface WithdrawalReceipt {
  applicationId: string;
  reference: string;
  reason: string | null;
  receipt: string;
  withdrawnAt: string;
}
export interface ApplicantNotification {
  id: string;
  type: string;
  title: string;
  applicationId: string | null;
  readAt: string | null;
  createdAt: string;
}
/** Phase 3 slice 1: staff review queue views. All dates ISO server timestamps. */
export interface ReviewQueueItem {
  applicationId: string;
  reference: string;
  state: string;
  version: number;
  submittedAt: string | null;
  claimedAt: string | null;
  openClarifications: number;
  openCorrections: number;
  actionNeeded: boolean;
}
export interface ReviewCaseSummary {
  applicationId: string;
  reference: string;
  state: string;
  version: number;
  claimedAt: string | null;
  submittedAt: string | null;
  openClarifications: number;
  openCorrections: number;
  hasDecision: boolean;
}
/** Phase 3 slice 2: evidence comparison views. Dates are ISO server timestamps. */
export interface ReviewDocumentView {
  id: string;
  category: string;
  fileName: string;
  mimeType: string;
  size: number;
  status: string;
  scanner: string | null;
  version: number;
  replacesId: string | null;
  replacementReason: string | null;
  createdAt: string;
  canPreview: boolean;
}
export interface ReviewEvidenceView {
  applicationId: string;
  reference: string;
  state: string;
  version: number;
  policyVersion: string;
  requirementVersion: string;
  offering: {
    programmeCode: string;
    programmeName: string;
    intake: string;
  };
  personal: unknown;
  contact: unknown;
  qualifications: unknown;
  submission: { reference: string; createdAt: string } | null;
  documents: ReviewDocumentView[];
  openClarifications: number;
  openCorrections: number;
  pendingCorrections: {
    id: string;
    section: string;
    field: string;
    reason: string;
    createdAt: string;
  }[];
  hasDecision: boolean;
}
export interface ReviewFindingView {
  id: string;
  kind: string;
  subject: string;
  detail: string;
  severity: string;
  status: string;
  createdAt: string;
}
