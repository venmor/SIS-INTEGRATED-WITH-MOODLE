/** DEMO-SETUP-2026.1. Fictional structure/calendar; not institutional authority. */
/** Safe correction target; row indexes refer to the submitted input order. */
export interface DemoSetupValidationIssue {
  collection:
    | "profile"
    | "unitTypes"
    | "units"
    | "relationships"
    | "periodTypes"
    | "periods"
    | "command";
  /** Zero-based original input row; omitted for a collection or command field. */
  index?: number;
  field: string;
}
export type DemoUnitKind =
  "INSTITUTION" | "CAMPUS" | "ACADEMIC" | "ADMINISTRATIVE";
export type DemoUnitRelationship =
  "REPORTS_TO" | "ACADEMICALLY_OWNED_BY" | "DELIVERED_BY" | "LOCATED_AT";
export interface DemoUniversityProfile {
  name: string;
  rootUnitCode: string;
  unitTypes: { code: string; label: string; kind: DemoUnitKind }[];
  units: { code: string; name: string; typeCode: string }[];
  relationships: {
    fromCode: string;
    toCode: string;
    type: DemoUnitRelationship;
  }[];
  periodTypes: { code: string; label: string }[];
  periods: {
    code: string;
    name: string;
    typeCode: string;
    parentCode: string | null;
    startDate: string;
    endDate: string;
  }[];
}
export interface SaveDemoUniversityCommand {
  clientRequestId: string;
  expectedVersion: number;
  expectedActivationId: string | null;
  reason: string;
  profile: DemoUniversityProfile;
}
export interface ActivateDemoUniversityCommand {
  clientRequestId: string;
  contentDigest: string;
  expectedActivationId: string | null;
  confirmFictionalActivation: true;
  password: string;
}
export interface DemoUniversityVersion {
  id: string;
  version: number;
  profile: DemoUniversityProfile;
  reason: string;
  contentDigest: string;
  baseActivationId: string | null;
  createdAt: string;
  createdByName: string;
  ownProposal: boolean;
  activation: { id: string; approvedAt: string; approvedByName: string } | null;
}
export interface DemoUniversitySetupReport {
  mode: "FICTIONAL_REHEARSAL";
  policyVersion: string;
  canPropose: boolean;
  canApprove: boolean;
  latestVersion: number;
  activeActivationId: string | null;
  activeVersion: DemoUniversityVersion | null;
  versions: DemoUniversityVersion[];
  olderVersionCursor: number | null;
  template: DemoUniversityProfile;
  impact: {
    deliveryOfferings: number;
    buildings: number;
    timetableRules: number;
    masterPreviews: number;
  };
  handoffs: { label: string; status: "PENDING"; reason: string }[];
}
