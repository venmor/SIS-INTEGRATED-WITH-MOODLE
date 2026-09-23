# TASK-PH5-004: Callback normalization and duplicate protection

## Authority and ownership

User authorization: Phase 5 all-slices implementation request, 2026-09-23. Release v0.6.0 track. Proposed lead Charles Hangoma; reviewer Chitindu Milimbo. Rehearsal duties only. Human review pending.

Controlling sources: roadmap Phase 5 slice 4; Design Sec 6 §15 (RECEIVED→…→RECONCILED plus DUPLICATE_SUSPECTED/UNMATCHED/FAILED/REVERSED; provider refs + idempotency keys prevent duplicate posting); Finance Blueprint Journey A step 4 + Journey B (normalize; check signature/amount/currency/reference/duplicate; officer sees evidence/SIS-request/callbacks/differences/safe actions; cannot delete original or fabricate confirmation); applicant Part 7 confirmation sequence (validate signature/amount/currency/reference/uniqueness/obligation state) + amount-mismatch wording; REQ-FIN-002/003; ACT-FIN-001; INT-PAY-001 (signature, replay window, unique provider ref, idempotency, reversal events, reconciliation query); security provider-callback rules (signed, replay detection, bounded processing; TEST-REC-002 one financial effect); architecture payment flow (notification → checks → staged → duplicate detection → verified → posted); UI-ERROR-001 finance example; UI constitution ("Payment confirmation is still in progress… Do not pay again… FIN-20418"). Exact records as prior packets. SUP-001–SUP-013 apply. Depends on TASK-PH5-003 (requests to confirm). Owning module `finance`.

## User outcome and boundaries

Signed simulator callbacks land on a dedicated endpoint and are normalized: signature/replay/amount/currency/reference/uniqueness checked; first valid callback advances the payment (VERIFIED→POSTED); duplicates return the prior outcome without new effects; mismatches (amount/currency/unknown reference) open reconciliation cases with "do not pay again" wording; reversals create new REVERSED events (never edits) and flag clearance for governed recalculation. Delayed/out-of-order callbacks converge to one outcome. Every callback audited with provider ref, idempotency ref, attempts.

## Policy and explicit demonstration scope

`FINANCE-DEMO-v1` + `FIN-SIM-v1` fictional only. HMAC-SHA256 demo secret via env; replay window 15 minutes (config); unknown/unsigned callbacks rejected neutrally and logged without secrets. No auto-marking paid from screenshots/redirects/self-reports.

## State authorization failure and recovery

Callback endpoint: signature-gated (no session); reconciliation cases readable by finance scope + owning student (student-safe wording); duplicate delivery converges; dead-letter after bounded retries with approved manual replay (slice 6 UI); concurrent callbacks serialized per provider reference (unique constraint); audit every transition.

## Proof and documentation

API tests (TEST-REC-002 shape): duplicate callback one effect; delayed callback converges; mismatched amount opens case + wording; unknown reference → UNMATCHED case, no payment; bad signature/replay rejected; reversal creates event + flags recalculation; out-of-order delivery single outcome; idempotent replay; neutral rejections. Browser: uncertain payment resolves to confirmed with receipt link (mobile/keyboard/SR). Record in PHASE-5 review + NOTE-PH5-004.

## Out of scope and open gates

Allocation/clearance math (slice 5); officer resolution UI (slice 6); real providers. Gates as TASK-PH5-001.

## Completion

Pending; see VERIFICATION. Human review pending.
