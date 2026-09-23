# TASK-PH5-006: Finance reconciliation queue

## Authority and ownership

User authorization: Phase 5 all-slices implementation request, 2026-09-23. Release v0.6.0 track. Proposed lead Chitindu Milimbo (queue UI + adversarial tests); reviewer Charles Hangoma. Rehearsal duties only. Human review pending.

Controlling sources: roadmap Phase 5 slice 6 + demonstration checkpoint (uncertain→"do not pay again"→reconcile→clearance→reversal→governed recalculation); Finance Blueprint Journey B/C/D (uncertain case handling; sponsorship versions/expiry; adjustment 5-step with compensating records) + workspace priorities + acceptance requirements; SCR-REC-FIN-001 (charge/payment evidence, allocation, callback history, exception, authorized action); UI-TASK-001/UI-RECORD-001/UI-TABLE-001/UI-TIMELINE-001/UI-DECISION-001/UI-CONFIRM-001 (refund approval confirmation; no bulk refund approval); Design Sec 6 §§16,20 (sponsorship versions; refund chain; requester ≠ sole approver); permission Part 3A §15.8 + segregation (threshold approvals; maker/checker; cashier provisional only; step-up re-auth for adjustments/refunds); security recovery rules (approved manual replay; TEST-REC-001/004/005/006/008/010); TEST-E2E-FIN-006 (maker/checker refund; audit history); student journey Part 2 §§5–6,8 (sponsorship outcomes; arrangement request/approve; review-case wording; no uncontrolled auto-refund). Exact records as prior packets. SUP-001–SUP-013 apply. Depends on TASK-PH5-001–005. Owning modules `finance` + web finance workspace.

## User outcome and boundaries

Finance workspace prioritizes unreconciled/uncertain/duplicate/mismatch cases, expiring sponsorships, adjustment/refund approvals, clearance-impacting holds, deadlines. Reconciliation case page (SCR-REC-FIN-001) shows evidence, allocation, callback history, exception, authorized actions: link verified evidence, request information, retry allowed query, resolve match, escalate — never delete originals or fabricate confirmations. Officers record versioned sponsorships (expiry/coverage recalculates obligation with explanation); adjustments/waivers/refunds follow request→review→threshold-approval (maker/checker, step-up re-auth) creating compensating records only; cashier records provisional intake; students request arrangements/refund-reviews and see safe wording. Dead-letter callbacks replayable (approved) without changing decisions.

## Policy and explicit demonstration scope

`FINANCE-DEMO-v1` fictional only: demo approval thresholds (e.g. officer ≤ ZMW 5,000-equivalent minor units; above → Finance Approver; refunds always maker/checker), demo sponsor categories, demo hold codes. All configured + versioned, never hard-coded. Simulator only.

## State authorization failure and recovery

Finance scope + capability + threshold + SoD enforced server-side (requester≠approver; configurer≠activator for fee versions); cashier cannot approve; reconciliation officer cannot approve waivers/refunds unless assigned; export separately permitted; every action audited with authority + policy version; conflicts version-checked; neutral 404s; denials 403 + audit; replay idempotent.

## Proof and documentation

API tests: queue prioritization + scoping; case resolution paths (match/resolve/escalate) with history preserved; sponsorship versioning + expiry recalculation; adjustment/waiver/refund approval chain (threshold routing, SoD denials, step-up); cashier provisional → reconcile flow; arrangement request/approve/decline → clearance effect; dead-letter replay; duplicate/uncertain/reversed/mismatched callback proof set (roadmap required proof); connection-lost-after-initiation; rounding/allocation invariants (integer math); scope/threshold denials; restore/reconciliation scenario. Browser: full checkpoint demo (uncertain → do not-pay-again → reconcile → clearance → reversal → recalculation) + queue triage (mobile/keyboard/SR/reflow). Record in PHASE-5 review + NOTE-PH5-006.

## Out of scope and open gates

Moodle provider/reconciliation (Phase 6); GL export (design §21, expansion); real sponsors/providers/thresholds/authorities (open decisions; GAP if blocking). Gates as TASK-PH5-001.

## Completion

Pending; see VERIFICATION. Human review pending.
