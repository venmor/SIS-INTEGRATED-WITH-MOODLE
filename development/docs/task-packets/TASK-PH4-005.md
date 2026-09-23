# TASK-PH4-005: Formal registration and immutable snapshot

## Authority and ownership

User authorization: Phase 4 slices 1–6 implementation request, 2026-09-22. Release v0.5.0 track. Proposed lead Charles Hangoma; reviewer Chitindu Milimbo. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 5; Student Part 4 §§1–2,8,10–11 (preconditions, interaction, receipt, failure table, acceptance); Design Sec 3 §§4–6 (states, snapshot discipline); ACT-REG-001 (verifies status/period/eligibility/policy/finance; creates registration exactly once; durable enrolment event; Moodle failure never reverses); REQ-REG-003/004, REQ-LRN-002/003, REQ-OPS-001/004; permission §§15.5/15.9/15.10; UI review/completed/receipt/timetable/Moodle-handoff screens; declarations versioned apart from payment consent. Exact records as prior packets. SUP-001–SUP-013 apply. Depends on TASK-PH3-004 (selection). Owning module `registration`.

## User outcome and boundaries

A student with a validated plan, complete clearance (or authorized exception), accepted declarations, no blocking hold, and a reviewed version matching the submitted version submits once: the server rechecks all 9 preconditions, locks an immutable snapshot with receipt (`REG-YYYY-…`), allocates places, finalizes finance state, recalculates holds, and queues a durable Moodle enrolment event — or rolls everything back. Success only after authoritative completion. Timetable derives from authoritative data. Commands: SubmitStudentRegistration (idempotent), GenerateStudentTimetable (derived read).

## Policy and explicit demonstration scope

`STUDENT-DEMO-v1` fictional only. Moodle handoff is a queued outbox event with Queued/Synced/Delayed/Failed/Removed states (no provider; Phase 6 reconciles). Receipt carries number, programme/period, ref/timestamp, labelled course list, clearance status, conditions, verification ref, help route — never finance/discipline/counselling/staff internals.

## State authorization failure and recovery

Own attempt/period; neutral 404s; denials 403 + audit; expected version + idempotency key; CSRF; double-tap/two-device/disconnect resolve to the single stored result (check-by-reference, no blind retry); clearance lost preserves plan and blocks final; stale data blocks high-impact action. Concurrent submit serialized on the attempt row.

## Proof and documentation

API tests: happy path (snapshot + receipt + roster + outbox event); each precondition denial names its cause; duplicate/double-tap/two-device single-result; stale version; idempotency replay/conflict; clearance-lost preservation; timetable derivation; Moodle-failure-keeps-registration; foreign/neutral; denials. Browser: review → submit → receipt journey (mobile/keyboard/SR/reflow, error persistence). Record in PHASE-4 review.

## Out of scope and open gates

Amendments (slice 6); finance postings/callbacks (Phase 5); Moodle provider/reconciliation (Phase 6); verification adapters; real curricula/fees/periods. Gates as TASK-PH4-002.

## Completion

Pending; see VERIFICATION. Human review pending.
