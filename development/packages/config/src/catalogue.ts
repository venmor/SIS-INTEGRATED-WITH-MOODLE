/**
 * CATALOGUE-v1 — versioned demo catalogue configuration (05/05 config
 * standard, TASK-PH2-001). Fictional demo values, NOT institutional policy.
 * Effective 2026-01-01, owner: Lead Chitindu (demo). Code reads these values;
 * nothing catalogue-related is hardcoded in controllers or components.
 */
export interface CatalogueConfig {
  version: "CATALOGUE-v1";
  owner: string;
  effectiveFrom: string;
  search: {
    defaultTake: number;
    maxTake: number;
  };
  /** Handbook Part 2 §5: at most three offerings compared at once. */
  compareMax: number;
  /** Transient guidance-session lifetime (anonymous-safe, no personal data). */
  sessionTtlMinutes: number;
}

export const CATALOGUE_V1: CatalogueConfig = {
  version: "CATALOGUE-v1",
  owner: "Lead Chitindu (demo)",
  effectiveFrom: "2026-01-01",
  search: {
    defaultTake: 12,
    maxTake: 50,
  },
  compareMax: 3,
  sessionTtlMinutes: 30,
};
