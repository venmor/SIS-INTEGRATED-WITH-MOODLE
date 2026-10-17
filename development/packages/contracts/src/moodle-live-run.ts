/** Synthetic foundation control plane. RUNNING does not certify live delivery. */
export type MoodleLiveRunState =
  "PREPARED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CLOSED";
export type MoodleLiveRunAction =
  | "add-entry"
  | "seal"
  | "technical-approval"
  | "start"
  | "pause"
  | "resume"
  | "fail"
  | "complete"
  | "close-technical"
  | "close";
export type MoodleManifestEntity =
  | "Account"
  | "Student"
  | "ProgrammeOffering"
  | "ProgrammeAttempt"
  | "CourseRegistration"
  | "TutorialGroup"
  | "TeachingAssignment";
export interface MoodleRunDecisionView {
  id: string;
  command: string;
  fromState: string;
  toState: string;
  actorAccountId: string;
  actorRole: string;
  reason: string;
  evidenceChecksum: string;
  freshAuthRef: string | null;
  createdAt: string;
}
export interface MoodleLiveRunView {
  id: string;
  runId: string;
  state: MoodleLiveRunState;
  version: number;
  policyVersion: string;
  dbFingerprint: string;
  schemaChecksum: string;
  configFingerprint: string;
  expectedHost: string;
  expectedSiteId: number;
  expectedRelease: string;
  actualNumericVersion: string | null;
  cohortPrefix: string;
  nonProductionConfirmed: boolean;
  creatorAccountId: string;
  technicalApproverAccountId: string | null;
  operationalApproverAccountId: string | null;
  identityStatus: string;
  identityCheckedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  requiredBinding: { runId: string; dbFingerprint: string };
  manifest: {
    checksum: string;
    entryCount: number;
    sealedAt: string | null;
    entries: Array<{
      entity: MoodleManifestEntity;
      entityId: string;
      addedAt: string;
    }>;
  };
  decisions: MoodleRunDecisionView[];
  permittedActions: MoodleLiveRunAction[];
  actionEvidence: Partial<Record<MoodleLiveRunAction, string>>;
  blockers: string[];
  deliveryReadiness: { outcome: "NOT_PROVISIONED"; detail: string };
}
export interface MoodleLiveRunSetupView {
  target: {
    kind: "simulator" | "live-test" | "live-test-disabled";
    reasons?: string[];
  };
  databaseReady: boolean;
  current: MoodleLiveRunView | null;
}
