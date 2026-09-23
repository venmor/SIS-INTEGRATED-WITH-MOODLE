# TASK-PH4-003: Registration eligibility summary

## Authority and ownership

User authorization: Phase 4 slices 1–6 implementation request, 2026-09-22. Release v0.5.0 track. Proposed lead Chitindu Milimbo; reviewer Charles Hangoma. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 3; Student Parts 1 §§5,11 + 3 §§3–5; Design Sec 6 §§17–18 (clearance/holds), Sec 3 §4 (institutional registration states); REQ-REG-003/005, REQ-FIN-004, REQ-OPS-004; permission §§15.5/15.8 (clearance-state-only visibility both directions); UI readiness/progression/finance screens; error catalogue §16 business-rule wording. Exact records as prior packets. SUP-001–SUP-013 apply. Depends on TASK-PH4-002. Owning module `registration` (Registration & Progression), consuming Finance clearance status+expiry read-only.

## User outcome and boundaries

A readiness assessment explains, per condition, whether the student may proceed: record active, programme/intake correct, period open, progression available, clearance/arrangement, programme conditions, no blocking hold, course selection complete, declaration accepted. States: AWAITING_STUDENT_INPUT → AWAITING_ACADEMIC_APPROVAL → AWAITING_FINANCIAL_CLEARANCE → REGISTERED (plus CHANGES_REQUIRED/REJECTED/CANCELLED/EXPIRED). Finance clearance: demo rule — fee NOT_REQUIRED implies CLEARED (versioned demo policy); otherwise a clearance row (Phase-5-owned writer; fixtures in tests) with status+expiry. Progression: FIRST_TIME path now; boundary cases return DECISION_REQUIRED (DEC-PROG-001/002 open, never inferred); no raw-grade inference. Commands: GenerateRegistrationReadinessAssessment (computed + audited, idempotent by inputs).

## Policy and explicit demonstration scope

`STUDENT-DEMO-v1` fictional only. Academic/finance clearance independently recorded; payment never flips registration state. Block wording follows the catalogue with policy ref. Stale finance data renders last-confirmed + retry, never as live.

## State authorization failure and recovery

Student reads own assessment; records reads scoped; neutral 404s; denials 403 + audit; no writes in this slice (computed). Disputes would create review cases (later).

## Proof and documentation

API tests: 9-condition matrix (open/closed period, hold blocks, clearance cleared/expired/missing, conditions pending, selection incomplete); boundary DECISION_REQUIRED rows; finance-state-only projection (no balances); stale-clearance labelling; foreign/neutral; denials. Browser: readiness page journey. Record in PHASE-4 review.

## Out of scope and open gates

Selection/submit/amend mechanics (slices 4–6); finance ledger/callbacks (Phase 5); verification adapters; real regulations/fees/holds; Moodle. Gates as TASK-PH4-002.

## Completion

Pending; see VERIFICATION. Human review pending.
