/** Fictional assessment demonstration policy. This is not UNZA policy.
 * Phase 7 slice 1 (TASK-PH7-001, GAP-022 interim): versioned scheme
 * ASSESSMENT-DEMO-v1 per offering+period. Components extend
 * DEMO-ACADEMIC-2026-v1 (CA 40 / exam 60 / pass 50); scale 0–100;
 * rounding half-up 2dp; moderation route coordinator→examinations (demo
 * only); provisional marks hidden from students (config choice).
 * Non-numeric outcomes allow-listed per DS5 §3 (never stored as zero). */
export const ASSESSMENT_DEMO_V1 = {
  version: "ASSESSMENT-DEMO-v1",
  demo: true,
  timezone: "Africa/Lusaka",
  // Scheme components: code, maximum mark, contribution weight (percent).
  // Weights sum to 100; CA-QUIZ1 + CA-ASSIGN carry the CA 40, FINAL-EXAM
  // carries the exam 60 (DEMO-ACADEMIC-2026-v1).
  components: [
    { code: "CA-QUIZ1", maxMark: 20, weight: 20 },
    { code: "CA-ASSIGN", maxMark: 30, weight: 20 },
    { code: "FINAL-EXAM", maxMark: 100, weight: 60 },
  ],
  passMark: 50,
  scale: "0-100",
  rounding: { mode: "half-up", decimals: 2 },
  // Demo-only moderation route (GAP-022): coordinator captures, the
  // examinations office operates; nobody invents marks.
  moderationRoute: ["COORDINATOR", "EXAMINATIONS_OFFICER"],
  // Provisional (staged) marks stay hidden from students until official
  // release (config choice, not an institutional claim).
  provisionalVisibility: "hidden",
  // DS5 §3 non-numeric outcomes: a numeric zero means genuinely zero, never
  // absent/missing/withheld. Closed allow-list, eleven codes.
  nonNumericOutcomes: [
    "MARK_RECORDED",
    "ABSENT",
    "ABSENT_WITH_PERMISSION",
    "DEFERRED",
    "MISSING_MARK",
    "INCOMPLETE",
    "EXEMPT",
    "CARRIED_FORWARD",
    "WITHHELD",
    "MISCONDUCT_PENDING",
    "CANCELLED",
  ],
  // Plan and mapping lifecycles enforced by the assessment service.
  planStates: ["DRAFT", "APPROVED", "SUPERSEDED"],
  componentStates: ["DRAFT", "APPROVED", "CLOSED", "SUPERSEDED"],
  mappingStates: ["DRAFT", "TESTED", "ACTIVE", "SUPERSEDED"],
} as const;
