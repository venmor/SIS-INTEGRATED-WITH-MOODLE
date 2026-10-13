/** Discovery is an owned navigation choice, never registration eligibility. */
export interface RegistrationContextKey {
  attemptId: string;
  period: string;
}
export interface RegistrationContextItem extends RegistrationContextKey {
  attemptStatus: "ACTIVE" | "ADMITTED";
  programmeCode: string;
  programmeName: string;
  intake: string;
  periodName: string | null;
  startDate: string | null;
  endDate: string | null;
  configuredCurrent: boolean;
  registrationStatus:
    "NOT_STARTED" | "DRAFT" | "REGISTERED" | "REVIEW_REQUIRED";
}
export interface RegistrationContextsResponse {
  source: "OWN_REGISTRATION_CONTEXTS";
  checkedAt: string;
  configuredPeriod: { code: string };
  items: RegistrationContextItem[];
  /** Across all owned contexts, not only this page. ACTIVE attempts only. */
  soleRegisteredContext: RegistrationContextKey | null;
  nextCursor: string | null;
}
