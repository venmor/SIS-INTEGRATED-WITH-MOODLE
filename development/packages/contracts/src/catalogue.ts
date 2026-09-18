/**
 * Canonical catalogue shapes (single source). API DTOs implement these
 * interfaces; structural compatibility is asserted by a type-level spec (see
 * api), because cross-package value imports would break isolated builds.
 * No validation logic here (DTOs own it, once). Source: applicant journey
 * Part 2 (search §3, detail §4, compare §5, guidance §6, architecture §8).
 */

export type AvailabilityStatus =
  | "OPEN"
  | "SOON"
  | "CLOSED"
  | "RETIRED";

export interface ProgrammeSummary {
  offeringId: string;
  programmeName: string;
  awardLevel: string;
  school: string;
  duration: string;
  campus: string;
  studyMode: string;
  intake: string;
  availability: AvailabilityStatus;
  deadline: string | null;
  requirementSummary: string;
  /** Non-mandatory labels (handbook §5 additional selection requirements). */
  additionalSummary: string;
  publishedVersion: string;
  lastUpdated: string;
  /** Closed/unavailable explanation; null when open (Part 2 §3.2). */
  statusNote: string | null;
}

export interface ProgrammeOfferingDetail extends ProgrammeSummary {
  programmeCode: string | null;
  overview: string;
  entryRequirements: RequirementRule[];
  checklist: string[];
  feeScheduleRef: string;
  publishedVersion: string;
  effectiveDate: string;
  lastUpdated: string;
  owningOffice: string;
  /** Closed/unavailable explanation (Part 2 §3.2); null when open. */
  statusNote: string | null;
  /** Only OPEN offerings may start an application (Part 2 §4E). */
  canStart: boolean;
}

export type RequirementKind = "GRADE" | "BOOLEAN" | "TEXT";

export interface RequirementRule {
  id: string;
  label: string;
  kind: RequirementKind;
  /** Handbook: mandatory, alternative or recommended. */
  mandatory: boolean;
  /** Lower-is-better grade scale (e.g. 1–9); set for GRADE rules. */
  minGrade: number | null;
  /** True when formal verification is required before a final decision. */
  requiresVerification: boolean;
  evidence: string;
  /** Qualification-route code this rule applies to; null = all routes. */
  routeCode: string | null;
}

export type GuidanceVerdict =
  | "APPEARS_MET"
  | "NEEDS_VERIFICATION"
  | "INFO_MISSING"
  | "NOT_MET"
  | "UNAVAILABLE";

export interface RequirementFact {
  value?: string | number | boolean;
  /** Applicant chose "I do not know this yet" (Part 2 §7). */
  unknown?: boolean;
}

export interface GuidanceResult {
  ruleId: string;
  verdict: GuidanceVerdict;
  /** Only mandatory rules with NOT_MET/INFO_MISSING block submission. */
  blocking: boolean;
  entered: string | number | boolean | null;
}

export interface GuidanceEvaluation {
  results: GuidanceResult[];
  overall: GuidanceVerdict;
}

export interface CataloguePage {
  items: ProgrammeSummary[];
  total: number;
  skip: number;
  take: number;
}

export interface CompareResult {
  items: ProgrammeSummary[];
  /** True when the request exceeded the 3-offering comparison limit. */
  truncated: boolean;
}
