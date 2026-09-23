# Learning Note — TASK-PH5-005 (allocation, balance, clearance)

- Lead developer: Charles Hangoma (proposed; TASK-PH5-005)
- Reviewer: Chitindu Milimbo (proposed)
- Date/release: 2026-09-23 / v0.6.0 track Phase 5 slice 5
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

The policy calculator: verified payments allocate oldest-due-first under
FINANCE-DEMO-v1 (unique per transaction+line, idempotent reassessment);
balances recompute from posted lines minus allocations (no stored
balance); clearance reassesses on confirm/reversal/mismatch (CLEARED with
expiry, PENDING while part-paid, HELD after reversal with a scoped
finance hold applied, MANUAL_REVIEW while any case is open); confirmed
sponsorship counts as cover (never cash). Reversals void the original
allocations and flip the original transaction to REVERSED — history
preserved as two rows. Holds sync both ways; registration reads the real
writer now (fixtures retired by behavior, not deleted).

## Frontend

- No new screens: finance home/statement/receipt read the real numbers;
  browser asserts clearance-complete + not-blocked after full payment.

## Backend/domain

- `allocateAndAssess` (system-owned, trigger-audited) called from
  confirm, reversal and mismatch paths; `sponsorCover`;
  statement/account/receipt totals from allocations.

## Database/migration

- `20260925120000_ph5_allocation`: `FinanceAllocation` (tx+line unique),
  `FinanceSponsorship` (writer in slice 6), `FinanceClearance`
  policyVersion.

## Security + authz

- Calculation is event-driven and idempotent; no manual-toggle endpoint
  exists (PUT/PATCH 404 + tested); students/finance read results only.

## Tests and what they prove

- `finance-clearance.e2e-spec.ts` (9 tests): full→CLEARED with
  allocations + receipt lines, partial→PENDING with exact remainder,
  sponsor-covered→CLEARED, reversal→HELD + hold + readiness BLOCKED,
  open case→MANUAL_REVIEW, no-toggle-endpoint, readiness READY after
  real writer, idempotent reads, neutrals. 48/48 with all finance specs
  on a fresh DB.
- Browser: clearance-complete wording after payment. Green.

## What failed or confused us

- Reversal left the original POSTED so re-allocation re-covered it;
  the original now flips to REVERSED (slice-4 assertion updated to the
  two-row reality with the link check).
- Reversal dispatch needed the POSTED (not staged) transaction.
- Mismatch never triggered reassessment; it does now (open case →
  MANUAL_REVIEW).
- `refreshedAt` breaks read-equality; excluded in the idempotence test.

## Questions to revise

- Allocate→assess→hold chain; why reversed money un-allocates; where
  arrangements plug in (slice 6).
