/** Fictional isolated rehearsal only; never institutional approval or MFA. */
export interface DemoTimetablePublicationCommand {
  clientRequestId: string;
  contentDigest: string;
  expectedPublicationId: string | null;
  reviewed: true;
  fictionalOnly: true;
  reason: string;
  password: string;
}
export interface DemoTimetablePublicationReceipt {
  publicationId: string;
  masterDraftId: string;
  periodId: string;
  version: number;
  publishedAt: string;
  status: "FICTIONAL_PUBLISHED";
  contentDigest: string;
  commandDigest: string;
  reason: string;
  previousPublicationId: string | null;
  clientRequestId: string | null;
  ownDecision: boolean;
  isCurrent: boolean;
}
export interface TimetablePublishedSession {
  id: string;
  courseCode: string;
  courseTitle: string;
  sectionCode: string;
  campusCode: string;
  venueCode: string;
  teacherName: string;
  deliveryMode: string;
  activityType: "Teaching session";
  startAt: string;
  endAt: string;
}
export interface TimetablePublicationChange {
  kind: "ADDED" | "CHANGED" | "REMOVED";
  sessionId: string;
  before: TimetablePublishedSession | null;
  after: TimetablePublishedSession | null;
}
export interface DemoTimetablePublicationReview {
  mode: "FICTIONAL_REHEARSAL";
  policyVersion: string;
  canPublish: boolean;
  ownProposal: boolean;
  draft: {
    id: string;
    periodId: string;
    version: number;
    contentDigest: string;
    status: string;
    createdAt: string;
    proposerName: string;
  };
  currentReady: boolean;
  currentIssues: { code: string; occurrenceIds: string[] }[];
  sourceCheckedAt: string;
  sources: {
    sourceFingerprint: string | null;
    currentFingerprint: string | null;
    matchesReviewedSources: boolean;
    /** Immutable rule saved with the proposal. */
    rule: {
      id: string;
      version: number;
      contentDigest: string;
      campusCode: string;
      periodCode: string | null;
      teachingStartDate: string | null;
      teachingEndDate: string | null;
      dailyStartTime: string | null;
      dailyEndTime: string | null;
      allowedWeekdays: number[];
      maxSessionMinutes: number | null;
      roomTurnaroundMinutes: number;
      maxOccurrences: number;
      campusTravelMinutes: {
        fromCampus: string;
        toCampus: string;
        minutes: number;
      }[];
    };
    /** Current checked facts; equality with the saved fingerprint pins them. */
    calendar: {
      id: string;
      version: number;
      startDate: string;
      endDate: string;
    } | null;
    units: {
      id: string;
      code: string;
      versionId: string;
      kind: string;
      status: string;
    }[];
    /** Historical facts retained with the immutable proposal. */
    savedCalendar: {
      id: string;
      version: number;
      startDate: string;
      endDate: string;
    } | null;
    savedUnits: {
      id: string;
      code: string;
      versionId: string;
      kind: string;
      status: string;
    }[];
    /** Exact references retained in the immutable master manifest. */
    sessionVersions: {
      sessionId: string;
      sectionId: string;
      offeringId: string;
      courseVersionId: string;
      teacherAssignmentId: string;
      venueId: string;
    }[];
  };
  latestPublication: DemoTimetablePublicationReceipt | null;
  publications: DemoTimetablePublicationReceipt[];
  olderVersionCursor: number | null;
  requestReceipt: DemoTimetablePublicationReceipt | null;
  impact: {
    added: number;
    changed: number;
    removed: number;
    affectedLearners: number;
    changes: {
      kind: "ADDED" | "CHANGED" | "REMOVED";
      sessionId: string;
      before: TimetablePublishedSession | null;
      after: TimetablePublishedSession | null;
      membershipChanged: boolean;
      membershipAdded: number;
      membershipRemoved: number;
    }[];
  };
  limits: string[];
}
export interface TimetableSourceContext {
  rule: DemoTimetablePublicationReview["sources"]["rule"];
  calendar: DemoTimetablePublicationReview["sources"]["calendar"];
  units: DemoTimetablePublicationReview["sources"]["units"];
}
