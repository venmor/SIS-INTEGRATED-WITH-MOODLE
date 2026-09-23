# TASK-PH5-003: Payment simulator and request state

## Authority and ownership

User authorization: Phase 5 all-slices implementation request, 2026-09-23. Release v0.6.0 track. Proposed lead Chitindu Milimbo (callback/reconciliation UI + adversarial tests); reviewer Charles Hangoma. Rehearsal duties only. Human review pending.

Controlling sources: roadmap Phase 5 slice 3; Finance Blueprint Journey A step 3 + Journey B (initiation receives idempotency reference; uncertain outcomes user-visible); applicant Part 7 confirmation sequence + duplicate-guard list + uncertain wording ("We are checking your payment status. Do not pay again yet."); student journey Part 2 §4 (pay view contents; method list config-driven; partial-payment warning; never raw card entry; confirmation separates payment-confirmed from clearance-complete); REQ-FIN-002/003; ACT-FIN-001 (immutable payment event; duplicate callbacks return prior outcome); architecture INT-PAY-001 + simulation-first rule (deterministic simulator: success, timeout, duplicate, delayed ack, reconciliation; labelled; no real credentials); security rate-limit/idempotency rules (high-impact lower limit + key; "do not pay again" until outcome known); UI-SUBMIT-001 (idempotency reference before submit; disable repeat; uncertain check-by-reference); UI-CONFIRM-001 not required for initiation but deliberate method/amount review applies. Exact records as prior packets. SUP-001–SUP-013 apply. Depends on TASK-PH5-001 (invoice to pay against). Owning module `finance`.

## User outcome and boundaries

A student reviews amount due, effect on clearance (plain words + partial-payment warning), deadline, and approved demo methods, then initiates once: the server creates a payment request with idempotency reference, blocks a second initiation while the earlier attempt is uncertain, and shows state (Initiated / awaiting confirmation / failed-safe-to-retry) with "do not pay again" wording while uncertain. The deterministic simulator (`FIN-SIM-v1`, labelled demo) settles or holds the callback per requested demo scenario. No real provider, no credentials, no card data entry (methods are selector-only + reference field for offline report).

## Policy and explicit demonstration scope

`FINANCE-DEMO-v1` fictional only. Methods: mobile money, bank transfer/deposit, approved card (simulated), in-person cashier (provisional), all simulated. Simulator secret from env, never logged; signed callbacks only (slice 4 verifies). Amounts bounded by invoice balance; partial allowed only where policy permits (demo: permitted with warning).

## State authorization failure and recovery

Own account only; duplicate initiation while uncertain refused with status + reference; double-click/two-device/connection-loss resolve to the single stored request (check-by-reference); expired requests fail safe-to-retry; rate-limited initiation 429-neutral; CSRF; neutral 404s; denials 403 + audit.

## Proof and documentation

API tests: happy-path initiation (reference + state); uncertain blocks second initiation; double-click/two-device single request; replay returns stored request; expiry → safe retry; offline "I have paid" report creates PaymentReported (not paid); validation/denial/neutral cases; rate-limit evidence; no card-data acceptance. Browser: pay view → initiate → uncertain "do not pay again" journey (mobile/keyboard/SR/reflow). Record in PHASE-5 review + NOTE-PH5-003.

## Out of scope and open gates

Callback verification/matching (slice 4); allocation/clearance (slice 5); reconciliation queue (slice 6); real providers/credentials. Gates as TASK-PH5-001.

## Completion

Pending; see VERIFICATION. Human review pending.
