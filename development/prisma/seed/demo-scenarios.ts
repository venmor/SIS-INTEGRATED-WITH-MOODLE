// Stable fictional references for the Phase-6 demonstration story pack.
// This file contains labels/keys only; seed mechanics stay in seed.ts.
export const DEMO_SCENARIOS = {
  applicants: {
    draft: {
      username: "bwalya.m",
      applicationReference: "APP-DEMO-DRAFT",
      label: "Applicant draft",
    },
    submitted: {
      username: "daka.c",
      applicationReference: "APP-DEMO-SUBMITTED",
      submissionReference: "SUB-DEMO-SUBMITTED",
      label: "Submitted application awaiting review",
    },
    offer: {
      username: "lombe.a",
      applicationReference: "APP-DEMO-OFFER",
      submissionReference: "SUB-DEMO-OFFER",
      label: "Released offer awaiting response",
    },
  },
  students: {
    cleared: {
      username: "phiri.n",
      studentNumber: "STU-DEMO-0001",
      applicationReference: "APP-DEMO-CLEARED",
      registrationReceipt: "REG-DEMO-CLEARED",
      invoiceReference: "INV-DEMO-CLEARED",
      paymentReference: "PAY-DEMO-CLEARED",
      label: "Registered and financially cleared student",
    },
    held: {
      username: "chanda.k",
      studentNumber: "STU-DEMO-0002",
      applicationReference: "APP-DEMO-HELD",
      registrationReceipt: "REG-DEMO-HELD",
      invoiceReference: "INV-DEMO-HELD",
      label: "Registered student with financial hold",
    },
  },
  teaching: {
    coordinatorUsername: "mwila.t",
    lecturerUsername: "mutinta.l",
    groupName: "SWE Demo Tutorial A",
    label: "Teaching and tutorial-group assignment",
  },
  integration: {
    moodleAdminUsername: "mumba.s",
    supportUsername: "kunda.b",
    delayedMarker: "DEMO-MOODLE-DELAY",
    deadLetterMarker: "DEMO-MOODLE-DEAD-LETTER",
    replayDeclaration:
      "Fictional demo replay evidence reviewed for an idempotent retry.",
    reconciliationKind: "ENROLMENT_MISMATCH",
    label: "Moodle delay, dead letter and reconciliation mismatch",
  },
  finance: {
    officerUsername: "kabwe.f",
    approverUsername: "mulenga.g",
  },
} as const;

export const DEMO_POLICY_VERSION = "DEMO-ACADEMIC-2026-v1";
export const DEMO_PERIOD = "2026S1";
