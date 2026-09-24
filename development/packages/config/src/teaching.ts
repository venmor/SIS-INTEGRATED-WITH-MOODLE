/** Fictional teaching demonstration policy. This is not UNZA policy.
 * Phase 6 slice 0 (TASK-PH6-000): tutorial groups and teaching
 * assignments are SIS-authoritative academic data; Moodle mirrors them.
 * Quiz authority derives from explicit assignment capability + scope +
 * dates. Timetable-conflict validation has no source (GAP-021). */
export const TEACHING_DEMO_V1 = {
  version: "TEACHING-DEMO-v1",
  demo: true,
  // Capability key granting quiz creation and marking within scope.
  quizCapability: "QUIZ_CREATE_MARK",
  // Assignment roles the demo coordinator may grant.
  assignableRoles: [
    "Lecturer",
    "Tutor",
    "Marker",
    "Moderator",
    "Coordinator",
  ],
  // States a teaching assignment may occupy (Blueprint 3 lifecycle).
  assignmentStates: [
    "PROPOSED",
    "AWAITING_APPROVAL",
    "ACTIVE",
    "SUSPENDED",
    "ENDED",
    "DELEGATED",
  ],
  // TG states (activation-gated; no separate TG state table in design).
  groupStates: ["DRAFT", "ACTIVE", "CLOSED"],
} as const;
