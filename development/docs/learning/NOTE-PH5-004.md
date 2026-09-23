# Learning Note — TASK-PH5-004 (callback normalization and duplicates)

- Lead developer: Charles Hangoma (proposed; TASK-PH5-004)
- Reviewer: Chitindu Milimbo (proposed)
- Date/release: 2026-09-23 / v0.6.0 track Phase 5 slice 4
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Signed simulator callbacks on a session-less, signature-gated endpoint:
HMAC-SHA256 verification, 15-minute replay window, per-(provider, nonce)
exactly-once tracking, amount/currency/reference checks. First valid
callback confirms (transaction POSTED, request CONFIRMED, outbox event);
exact redelivery returns the stored outcome; delayed second channels
converge to DUPLICATE; mismatches/unknown refs open reconciliation cases
with "do not pay again" wording and move no money; reversals are new
REVERSED events with a recalculation flag; late failure after confirmation
becomes governed review. A DEMO_MODE-gated, owner-only dispatch control
drives the same path for demos and tests.

## Frontend

- Finance home receipts section (confirmed payments); pay-leg browser
  flow dispatches and asserts the receipt; `/api/finance` allows the
  dispatch write; `.env.example` documents FIN_SIM_SECRET.

## Backend/domain

- `processCallback` (single transaction, provider-ref serialized),
  `simulatorDispatch`, `FinanceCallbackController` (no session;
  IP-bounded rate guard), receipt view now returns confirmed payments.

## Database/migration

- `20260925110000_ph5_callbacks`: `FinanceCallback` (provider+nonce
  unique) + `FinanceReconciliationCase`.

## Security + authz

- Unknown providers/signatures/stale windows rejected neutrally (nothing
  stored for forgeries); secrets never logged; dispatch demo-gated +
  owner-only; student reads stay caller-bound.

## Tests and what they prove

- `finance-callbacks.e2e-spec.ts` (12 tests): success + receipt + outbox,
  exact-redelivery prior outcome, delayed convergence, mismatch case with
  wording and no confirmation, unmatched case, forgery (nothing stored),
  stale rejection, reversal event + flag, out-of-order review, neutrals,
  dispatch gating + happy path. Green on fresh DB.
- Browser: uncertain → dispatch → receipt on finance home. Green.

## What failed or confused us

- Redelivery first returned DUPLICATE instead of the stored CONFIRMED
  ("repeated request returns the prior outcome"); nonce rows now store
  the terminal outcome.
- Case responses lacked safe wording; added per-kind safeMessage.
- Case lookup needed providerRef scoping on a dirty DB (fresh DBs for
  full runs, as usual).
- Playwright API POSTs omit Origin; the dispatch call sets it.
- Browser DB needed the slice-4 migration.

## Questions to revise

- Callback decision tree (verify → dedupe → match → confirm/case);
  why providers never grant clearance; where allocation happens (slice 5).
