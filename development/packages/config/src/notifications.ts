/** Fictional notification demonstration policy. This is not UNZA policy.
 * Phase 8 slice 1 (TASK-PH8-001, GAP-008 interim): versioned template
 * registry NOTIFY-DEMO-v1, simulator provider SIM-NOTIFY-v1, retry
 * budget and escalation rule. In-system delivery is real; email/SMS
 * dispatch is simulated with neutral previews only (handbook §§12.13,
 * student §8, quality §11.39). Mandatory academic, financial, safety
 * and regulatory notices cannot be suppressed. */
export const NOTIFY_DEMO_V1 = {
  version: "NOTIFY-DEMO-v1",
  demo: true,
  timezone: "Africa/Lusaka",
  provider: "SIM-NOTIFY-v1",
  // Delivery states per §16.12 (Read applies in-system; provider
  // stages apply to simulated channels).
  deliveryStates: [
    "CREATED",
    "QUEUED",
    "SENT",
    "DELIVERED",
    "READ",
    "FAILED",
    "RETRIED",
    "SUPPRESSED",
    "ESCALATED",
  ],
  // Retry budget (fictional): 3 attempts with backoff, escalation
  // after 2 failures or 60 minutes (§16.13 Moodle precedent).
  retry: { maxAttempts: 3, backoffSeconds: [60, 300, 900] },
  escalation: { afterFailures: 2, afterMinutes: 60 },
  // Mandatory categories can never be suppressed (§§12.13, applicant §9).
  mandatoryCategories: [
    "DECISION",
    "DEADLINE",
    "RESULT",
    "FINANCE",
    "SECURITY",
    "INCIDENT",
  ],
  // Optional categories honor preferences.
  optionalCategories: ["SUPPORT", "SYSTEM", "LEARNING"],
  worker: { intervalSeconds: 30 },
} as const;
