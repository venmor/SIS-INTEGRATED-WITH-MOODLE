# Admissions: applicant self-service

Owns the draft → saved sections → quarantined documents → reviewed submission journey for Phase 2 slices 2–5. It does not own credentials, published catalogue configuration, payments, staff decisions, student conversion or Moodle enrolment.

Read [the learning/traceability guide](../../../../docs/learning/PHASE-2-IMPLEMENTATION-REVIEW.md), [ADR-002](../../../../docs/adr/ADR-002-applicant-demonstration-boundaries.md) and task packets TASK-PH2-002 through 005 before changing behavior. Exact Applicant Parts 4–8 in the active handbook evidence control the detailed flow.

`ApplicationsController` handles HTTP guards/DTOs/upload limits; `ApplicationsService` checks live applicant ownership and performs versioned transactions; `validation.ts` handles allowlisted partial fields; `DocumentScanner` is the external boundary. Shared contracts and APPLICATION-DEMO-v1 are under packages. Rules/fee identity are fingerprinted. Command keys are bound to account, action and payload.

`ApplicationSubmission` is immutable in SQL. ApplicationSubmitted outbox rows remain undelivered until a later worker exists. The demo scanner permits only exact fixture bytes under both explicit flags; arbitrary PDFs remain quarantined pending structural validation. Production policy, storage, retention and real identity proof are open in GAP-015.

Tests: `apps/api/test/applications.e2e-spec.ts`, `src/admissions/scanner.spec.ts`, and `tests/browser/applicant.spec.ts`. Run database tests only on isolated fictional test databases; immutable test submissions are intentionally retained.
