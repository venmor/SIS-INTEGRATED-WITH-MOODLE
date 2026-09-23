/** Fictional student-records fixture policy. This is not UNZA policy. */
export const STUDENT_DEMO_V1 = {
  version: "STUDENT-DEMO-v1",
  demo: true,
  timezone: "Africa/Lusaka",
  // Human-readable numbers: STU-2026-0001, ... . The sequence lives in the
  // database so concurrent conversions never collide.
  studentNumberPrefix: "STU-2026-",
  // Exact-match identity signals that raise a human-review candidate.
  // Never auto-merge: a candidate blocks conversion until resolved.
  identityMatchFields: ["email", "phone"],
  // Published demo curricula, one row per programme in seed.
  curriculumVersion: 1,
  // Demo load bands in half-course equivalents (full/extended count 2).
  loadBands: { minHalves: 2, maxHalves: 6 },
  courseTypeWeights: { half: 1, full: 2, extended: 2 },
  // Current teaching period for the portal home (period-aware display).
  // Registration windows live on AcademicPeriod rows, not here.
  currentPeriod: "2026S1",
  // Phase 4 slice 5: versioned registration declarations, separate from any
  // payment consent. The service requires every key at submit and records
  // the version in the snapshot. Fictional, never policy.
  registration: {
    version: "DEMO-REGISTRATION-v1",
    declarations: [
      {
        key: "PLAN_ACCURATE",
        text: "My course selection is accurate to my knowledge.",
      },
      {
        key: "RULES_UNDERSTOOD",
        text: "I understand the registration rules for this period.",
      },
      {
        key: "FINANCE_UNDERSTOOD",
        text: "I understand my fee obligations are handled separately.",
      },
    ],
  },
} as const;
