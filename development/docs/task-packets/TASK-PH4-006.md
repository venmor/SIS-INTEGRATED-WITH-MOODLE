# TASK-PH4-006: Add/drop and exception task skeleton

## Authority and ownership

User authorization: Phase 4 slices 1–6 implementation request, 2026-09-22. Release v0.5.0 track. Proposed lead Charles Hangoma; reviewer Chitindu Milimbo. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 6 ("where MVP requires"); Student Part 4 §§5–7,10 (add/drop window, previews, waitlist, late changes, reversals); Design Sec 3 §§4–5; REQ-REG-006/007 (reason + evidence + route, full audit); UI course-changes/waitlist/late screens + SCR-FRM-REG-001/OPS; error/a11y catalogues. Exact records as prior packets. SUP-001–SUP-013 apply. Depends on TASK-PH4-005. Owning module `registration`.

## User outcome and boundaries

After registration, a student previews add/drop effects (load, charge delta, deadline, approval and Moodle/timetable impact) and submits controlled requests: self-service completes only when every check passes, otherwise an approval task with reason + evidence goes to the configured authority; required repeats and compulsory courses are never self-service droppable. Snapshots stay immutable — every change is a new amendment version with roster updates, charge recalculation notes (no postings; Finance owns the ledger), and Moodle add/remove events. Waitlist join/accept revalidates everything; late changes need reason + evidence + authority. Commands: RequestCourseAddition, RequestCourseDrop, ApproveRegistrationAmendment, JoinCourseWaitlist, AcceptWaitlistCoursePlace, RequestLateRegistrationChange.

## Policy and explicit demonstration scope

`STUDENT-DEMO-v1` fictional only (window dates, waitlist order/expiry, late policy). Reversals/withdrawals only via authorized processes; a student cannot delete a completed registration. Confirmations name academic + financial impact.

## State authorization failure and recovery

Own registration only; neutral 404s; denials 403 + audit; expected version + idempotency; CSRF; window-closed routes to late policy; capacity changes never over-enrol; uncertain outcomes by command lookup.

## Proof and documentation

API tests: add/drop previews; self-service success path; approval routing with reason/evidence; repeat/compulsory refusal; waitlist join/accept/expiry; late-window routing; amendment history (never silent edits); idempotent retry; version conflict; foreign/neutral; denials. Browser: course-changes journey. Record in PHASE-4 review.

## Out of scope and open gates

Finance postings/refunds (Phase 5); Moodle provider (Phase 6); verification adapters; real windows/fees/capacities. Gates as TASK-PH4-002.

## Completion

Pending; see VERIFICATION. Human review pending.
