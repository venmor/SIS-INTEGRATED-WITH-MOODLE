/** Fictional finance demonstration policy. This is not UNZA policy.
 * Phase 5 slice 1 (TASK-PH5-001): versioned fee assessment inputs only.
 * Money is integer minor units (tambala) + ZMW; never floating point.
 * DEC-FIN-001: billing strategy is configuration. The demo selects
 * per-course billing; the schema also accepts a per-period strategy. */
export const FINANCE_DEMO_V1 = {
  version: "FINANCE-DEMO-v1",
  demo: true,
  currency: "ZMW",
  timezone: "Africa/Lusaka",
  // Billing strategy for the demo: each enrolled course generates a charge
  // plus one flat registration fee per period.
  billing: {
    strategy: "PER_COURSE",
    registrationFeeMinor: 150000,
    courseFeeMinor: 85000,
    // Course codes mapped to a different per-course fee; absent codes use
    // courseFeeMinor. Fictional placeholders, never institutional amounts.
    courseFeeOverridesMinor: {
      SWE150: 170000,
    },
  },
  // Official invoice references: INV-2026-0001, ... . The sequence lives in
  // the database so concurrent assessments never collide.
  invoiceNumberPrefix: "INV-2026-",
  // Payment deadline per period (CAT rendered from these UTC instants).
  dueDates: {
    "2026S1": "2027-01-18T15:00:00Z",
  } as Record<string, string>,
  // Charge categories the demo invoice may carry (journey-book Part 2 §3).
  chargeCategories: [
    "Registration fee",
    "Tuition",
  ],
  // Demo payment methods offered by the simulator (slice 3). Never real.
  methods: [
    { key: "MOBILE_MONEY", label: "Mobile money (simulated)" },
    { key: "BANK_TRANSFER", label: "Bank transfer / deposit (simulated)" },
    { key: "CARD", label: "Online card (simulated)" },
    { key: "CASHIER", label: "In-person cashier (simulated)" },
  ],
  // Slice 5 clearance inputs (declared here so the whole policy is one
  // versioned record; enforced from slice 5 onward).
  clearance: {
    version: "DEMO-CLEARANCE-v1",
    // Full allocated ratio (percent of period invoice) that clears outright.
    clearRatioPercent: 100,
    // Explicit expiry for demo clearances (Africa/Lusaka rendering).
    expiresAt: "2027-02-15T00:00:00Z",
  },
  // Student-facing clearance wording (journey-book Part 2 §2). Every status
  // names the period; wording is policy, never hard-coded in components.
  wording: {
    NOT_ASSESSED: "Clearance is being prepared",
    NOT_EVALUATED: "Clearance is being prepared",
    PENDING: "Payment or funding action required",
    CLEARED: "Financial clearance complete",
    HELD: "Registration is currently blocked",
    MANUAL_REVIEW: "Finance is reviewing your case",
  } as Record<string, string>,
  // Slice 3 rate budgets (security: high-impact initiation is stricter).
  rateLimit: { initiationPerMinute: 3, generalPerMinute: 30, windowMinutes: 1 },
  // Slice 6 approval governance (fictional thresholds, never policy).
  // Maker/checker always: officers request, the approver decides, and the
  // requester can never decide their own case. Evidence is mandatory above
  // the high-value line.
  approvals: {
    highValueMinor: 1000000,
    sponsorCategories: ["Tuition", "Registration fee", "Accommodation fee"],
  },
  // Slice 3 simulator scenarios (FIN-SIM-v1, labelled demo, no credentials).
  // The scenario is recorded on the request; dispatch happens in slice 4.
  simulator: {
    provider: "FIN-SIM-v1",
    scenarios: ["SUCCESS", "DELAYED", "DUPLICATE", "MISMATCH", "REVERSAL"],
    // Requests awaiting confirmation expire after this many minutes.
    requestTtlMinutes: 60,
  },
} as const;
