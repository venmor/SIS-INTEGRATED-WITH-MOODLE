# Learning Note — TASK-PH5-003 (payment simulator and request state)

- Lead developer: Chitindu Milimbo (proposed; TASK-PH5-003)
- Reviewer: Charles Hangoma (proposed)
- Date/release: 2026-09-23 / v0.6.0 track Phase 5 slice 3
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Student payment initiation against the issued invoice: reviewed amount
(defaults to outstanding, editable), explicit unpreselected method choice,
plain clearance effect + deadline, then one deliberate initiation. The
request lands AWAITING_CONFIRMATION with "do not pay again" wording; any
open request blocks re-initiation with its reference. The deterministic
simulator (FIN-SIM-v1, labelled demo) stages provider evidence at
initiation; confirmation arrives only via signed callbacks (slice 4).
Offline bank/cashier reports create REPORTED records that change nothing.
Per-account initiation budget (3/min) complements authorization.

## Frontend

- `/student/finance/pay` page (review + initiate + report forms, open
  request notice, request list) + `/api/finance` POST proxy for the two
  payment writes + finance-home link.

## Backend/domain

- `initiatePayment` (method/scenario/amount validation; open-request
  guard with expiry sweep; serialized per account; PayNumberSeq +
  ProviderRefSeq references; staged FIN-SIM-v1 transaction; partial
  warning), `reportPayment` (offline methods only), `listPayments`,
  `paymentDetail`, `FinanceInitiationRateGuard`.

## Database/migration

- `20260925100000_ph5_payments`: `FinancePaymentRequest` (idempotency
  unique) + `FinancePaymentTransaction` (provider ref unique).

## Security + authz

- Own account only; staff/foreign/applicant 403; unknown refs neutral
  404; CSRF; idempotency; rate-limited initiation; no card data accepted.

## Tests and what they prove

- `finance-payments.e2e-spec.ts` (11 tests): initiate + staged evidence,
  partial warning, uncertain blocks second attempt, replay, concurrent
  single-request, expiry allows retry, offline report stays reported,
  validation bounds, denials, rate-limit 429, neutrals. Green on fresh DB.
- Browser pay leg: method choice → initiate → uncertain wording +
  PAY reference. Green.

## What failed or confused us

- Pipe-level `@Min(1)` would have hidden our INVALID_AMOUNT code;
  amounts validate in the service.
- Shared-account POST count tripped the new rate guard mid-suite —
  became the explicit rate-limit test.
- New web path depths broke relative `lib/` + styles imports; fixed.
- Lint forbids JSX in try/catch; the pay page loads data first.
- Browser DB needed the slice-3 migration; heading assertion needed
  exact match.

## Questions to revise

- Request/transaction state tables; why staging is not payment; where
  confirmation comes from (slice 4).
