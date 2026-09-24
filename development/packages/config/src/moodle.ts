/** Moodle integration policy. The deterministic simulator remains the
 * default for demos and CI. The live External Services adapter is engaged
 * only by explicit environment configuration and is read-only until live
 * writes are separately enabled. */
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
    // A provider request times out at 15s; 60s leaves ample margin while
    // allowing a crashed process claim to be recovered automatically.
    claimLeaseSeconds: 60,
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
  // Live-adapter connection (TASK-MOODLE-LIVE). The simulator stays the
  // default when URL + token are both absent. Partial live configuration is
  // rejected. The token lives in env only and is never persisted by SIS.
  live: {
    // URL + token together enable live reads/connection validation.
    urlEnvVar: "MOODLE_API_URL",
    tokenEnvVar: "MOODLE_API_TOKEN",
    writesEnvVar: "MOODLE_LIVE_WRITES",
    categoryIdEnvVar: "MOODLE_CATEGORY_ID",
    timeoutMs: 15000,
    // Moodle External Services REST endpoint layout.
    restPath: "/webservice/rest/server.php",
    tokenParam: "wstoken",
    formatParam: { moodlewsrestformat: "json" },
  },
} as const;
