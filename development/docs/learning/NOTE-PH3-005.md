# Learning Note — TASK-PH3-005 (separate decision authority and offer)

- Lead developer: Charles Hangoma (proposed; TASK-PH3-005)
- Reviewer: Chitindu Milimbo (proposed)
- Date/release: 2026-09-21 / v0.4.0 track Phase 3 slice 5
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Approvers (`ADMISSIONS_APPROVER`, `decide-offer`) release versioned decisions with explicit outcome (6-value Design §6 catalogue), structured conditions (text + deadline + matriculation-blocking flag), acceptance deadline, and version 1 on the frozen evidence package. Preconditions: Submitted, an ACTIVE recommendation exists, and the releaser is not its author (self-approval denial). Already-released re-reads return the stored decision; decisions are never overwritten. This slice also closed GAP-017: all three `simulate-*` endpoints, `staffGate`/`simIdempotent`/`staffAudit`, and Sim DTOs deleted; suites seed through officer/approver endpoints and assert 404 on removed paths.

## Frontend

- Staff case page: approver release form (outcome, authorized message, offer deadline, two optional conditions) with released-state notice. Officers see the 403 denial wording (SoD made visible).
- Applicant decision page updated to new outcomes + structured conditions (deadline, registration-blocking note).

## Backend/domain

- `review.service.ts` `releaseDecision` (approver gate before any lookup, neutral 404s, NO_RECOMMENDATION/SELF_APPROVAL/ALREADY_RELEASED/VERSION_CONFLICT/IDEMPOTENCY_CONFLICT, applicant-visible event + neutral notice reusing sim wording, bump, audit with package refs). `extendOffer` lives in slice 6.
- `case.service.ts` `decision()` maps structured conditions (tolerant of legacy strings); sim methods deleted; header comment updated.
- `ApplicationDecision.version` + migration; `DecisionView` widened (6 outcomes, object conditions).

## Database/migration

- `20260923130000_ph3_decision_version` (version default 1).

## Security + authz

- Approver-only release; officer/applicant/sysadmin 403 before any lookup (no disclosure); unknown/out-of-scope neutral 404. Delivery failure never reverses the release (tested by deleting the notice row).

## Tests and what they prove

- `review-decision.e2e-spec.ts` (11 tests): release + structured conditions, neutral notices, denials + neutrality, no-package refusal, self-approval denial (same account, second workspace), all six outcomes, version, idempotency, already-released, delivery-kept, no-leak. Written failing first (11×404), green after.
- `applications-case.e2e-spec.ts` migrated off sims (claim/raise/recommend/release/decide helpers); removed-endpoint 404 test.
- Browser queue spec extended with the approver release leg (kasonde.a sign-in, direct case URL).

## What failed or confused us

- Two whitespace-only edit accidents (one dropped a gate line, one a brace) — caught immediately by re-reading the diff; lesson: never fire edits without a real change, always re-check the hunk.
- Vercel API failure on `e44170a` (33× missing `@sis/config`) is the same stale-dist class fixed locally by the committed prebuild; needs a push to redeploy.

## Terms and concepts

- Recommendation ≠ decision (distinct actors/artifacts); frozen package; SoD as code.

## Questions to revise

- Walk release preconditions and explain each denial code with its test.
