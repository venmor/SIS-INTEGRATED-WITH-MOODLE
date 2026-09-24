/** Fictional Moodle integration demonstration policy. Not UNZA policy.
 * Phase 6 slices 1–6 (TASK-PH6-001..006): simulator-only Moodle
 * integration. Real instance/version/auth/API scope are open production
 * decisions; nothing here connects anywhere real. */
export const MOODLE_DEMO_V1 = {
  version: "MOODLE-DEMO-v1",
  demo: true,
  provider: "MOODLE-SIM-v1",
  // Mapping kinds the registry accepts.
  mappingKinds: ["SHELL", "USER", "ROLE", "GROUP", "SECTION"],
  // Shell identifiers are simulator-side and deterministic per offering.
  shellIdPattern: "SIM-SH-{programme}-{intake}",
  // Simulator scenarios (mirrors FIN-SIM-v1 determinism).
  simulator: {
    scenarios: ["SUCCESS", "TIMEOUT", "DUPLICATE", "MISMATCH", "OUTAGE"],
  },
  // Delivery worker cadence and retry budget (capped backoff with jitter).
  worker: {
    intervalSeconds: 20,
    maxAttempts: 5,
    baseDelaySeconds: 10,
  },
  // SIS→Moodle role map (Blueprint 12 teaching-role table, demo subset).
  roleMap: {
    Lecturer: "Teacher",
    Tutor: "Tutor",
    TutorQuiz: "Non-editing Teacher",
  },
  healthStates: [
    "HEALTHY",
    "DEGRADED",
    "OUTAGE",
    "MAINTENANCE",
    "UNKNOWN",
  ],
} as const;
