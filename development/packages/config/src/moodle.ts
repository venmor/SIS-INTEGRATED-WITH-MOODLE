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

/** Explicit live-test policy (spec §6.1, §7). The token lives in env
 * only, never in config rows, logs, or the database.
 *
 * This object carries policy constants and environment variable NAMES
 * only. The real MoodleCloud test target is deliberately unconfirmed:
 * no hostname, site id, release, role id, category id, or token is
 * recorded here, and none may be invented.
 *
 * `requiredEnv` names every variable an operator must supply. The
 * `.env.example` contract for them, the `MOODLE_INTEGRATION_MODE`
 * selection with its fail-closed validation (spec §8.1), and the
 * `live-test-disabled` resolution kind do not exist yet — Task 3 adds
 * all three. Until then the live path is armed by `selectBackend()`
 * from a base URL and a token, which is the known deviation Task 3
 * removes. This object is not what makes the live path inert, and a
 * reader must not conclude that it already is. */
export const MOODLE_LIVE_V1 = {
  version: "MOODLE-LIVE-TEST-v1",
  demo: false,
  provider: "MOODLE-CLOUD-TEST",
  modes: ["simulator", "live-test"],
  cohortPrefix: "SIS-MOODLE-LIVE-TEST-",
  restPath: "/webservice/rest/server.php",
  tokenParam: "wstoken",
  formatParam: { moodlewsrestformat: "json" },
  timeoutMs: 15000,
  // Target authorised function set (spec §7). This list is not yet
  // enforced: `moodle-live.ts` still calls a thirteenth function,
  // `core_enrol_get_enrolled_users_with_capability`, and swallows the
  // error behind a `.catch()` that substitutes
  // `core_enrol_get_enrolled_users`. Spec §5 and §7 forbid that
  // probe-and-fallback. Task 8 adds `assertAuthorisedFunction` and
  // removes both.
  authorisedFunctions: [
    "core_webservice_get_site_info",
    "core_course_get_courses_by_field",
    "core_course_create_courses",
    "core_user_get_users",
    "core_enrol_get_enrolled_users",
    "enrol_manual_enrol_users",
    "enrol_manual_unenrol_users",
    "core_group_get_course_groups",
    "core_group_create_groups",
    "core_group_add_group_members",
    "core_group_delete_group_members",
    "core_group_get_group_members",
  ],
  runStates: [
    "PREPARED",
    "RUNNING",
    "PAUSED",
    "COMPLETED",
    "FAILED",
    "CLOSED",
  ],
  terminalStates: ["COMPLETED", "FAILED", "CLOSED"],
  requiredEnv: [
    "MOODLE_INTEGRATION_MODE",
    "MOODLE_API_URL",
    "MOODLE_API_TOKEN",
    "MOODLE_ALLOWED_HOST",
    "MOODLE_EXPECTED_SITE_ID",
    "MOODLE_EXPECTED_VERSION",
    "MOODLE_ROLE_IDS",
    "MOODLE_CATEGORY_ID",
    "MOODLE_COURSE_VISIBLE",
    "MOODLE_LIVE_TEST_RUN_ID",
    "MOODLE_LIVE_TEST_DB_FINGERPRINT",
    "MOODLE_LIVE_TEST_COHORT_PREFIX",
  ],
} as const;
