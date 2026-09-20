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
    "Created" | "InProgress" | "ReadyForReview" | "Discarded" | "Submitted";
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
