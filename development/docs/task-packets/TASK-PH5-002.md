# TASK-PH5-002: Student account and statement

## Authority and ownership

User authorization: Phase 5 all-slices implementation request, 2026-09-23. Release v0.6.0 track. Proposed lead Chitindu Milimbo (statement/callback UI track); reviewer Charles Hangoma. Rehearsal duties only. Human review pending.

Controlling sources: roadmap Phase 5 slice 2; student journey Part 2 §§1–2,8 (finance home summary; clearance status model; payment history; receipt after completion); REQ-FIN-006 (understandable balances, allocations, status, last update, dispute/support route); permission Part 3A §15.8 (student: own charges/payments/sponsorship summary/clearance; own statement/receipt export; never other students); UI-RECORD-001 (9-region case page); UI-STATUS-001 (state/reason/time/owner/next action); UI-STALE-001 (last confirmed data); UI constitution privacy (mask references; no finance detail in academic screens). Exact records as prior packets. SUP-001–SUP-013 apply. Depends on TASK-PH5-001 (charges/invoice). Owning modules `finance` (reads) + web student finance pages.

## User outcome and boundaries

A student opens Finance home for a period and sees student number, period, clearance status (student-facing wording with period), outstanding amount only where permitted with block-explanation, next action, deadline, sponsorship status, latest refresh time, finance support route. Statement lists charge/payment/credit/refund lines with date, description, amount/currency, applied charges, status, reference; receipt view per confirmed payment. Every money figure carries currency, source, effective time, allocation state. Red balances always say whether registration is blocked. Reads only; no state changes here.

## Policy and explicit demonstration scope

`FINANCE-DEMO-v1` fictional only. Balances derive from posted lines (no stored balance column). Receipt identifiers are payment references (masked where full display is unnecessary). No export beyond own statement/receipt view (export permission separate; no bulk download in this slice).

## State authorization failure and recovery

Own record + period only; other students 404-neutral; staff without finance scope 403; stale/failed refresh shows last confirmed data with retry route, never presented as real-time; empty states distinguish no-data from load-failure.

## Proof and documentation

API tests: account summary contents + wording; statement ordering + masking; receipt view; foreign-student neutral 404; lecturer/academic-role denial of amounts (clearance-only elsewhere); failed-refresh wording. Browser: finance home → statement → receipt journey (mobile/keyboard/SR/reflow, no-overflow). Record in PHASE-5 review + NOTE-PH5-002.

## Out of scope and open gates

Payment initiation (slice 3); callbacks (slice 4); clearance calculation (slice 5); disputes create review cases (slice 6). Gates as TASK-PH5-001.

## Completion

Pending; see VERIFICATION. Human review pending.
