# TASK-PH6-002: Outbox envelopes and payload standardisation

## Authority and ownership

User authorization: Phase 6 all-slices implementation request, 2026-09-24.
Release v0.7.0 track. Proposed lead Charles Hangoma; reviewer Chitindu
Milimbo. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 2; Design Sec 9 §4 (atomic commit,
envelope fields); REQ-LRN-002 (durable enrolment event); REQ-NFR-004;
ACT-REG-001; student journey envelope set (source event ID, correlation
ID, idempotency key, payload version, delivery status, retry policy,
reconciliation record); CloudEvents-style naming
(`zm.sis.registration.course-enrolled.v1`). Exact records as prior
packets. SUP-001–SUP-013 apply. Depends on TASK-PH4-005 (existing
producers). Owning modules `registration` (envelope fixes) +
`integration` (delivery-attempt table).

## User outcome and boundaries

Every enrolment outbox event carries the exact envelope (source event
ID = outbox row, correlation, idempotency key, payload version,
delivery status, retry policy ref, reconciliation record). The
version-less waitlist payload gains `amendmentVersion`. Legacy rows
without envelopes resolve deterministically (aggregate+type derived
keys). Delivery attempts tracked in `IntegrationDeliveryAttempt`
(outbox stays an immutable log): PENDING→DELIVERING→DELIVERED with
attempt count, next run, last error. No delivery yet (worker slice 3).

## Policy and explicit demonstration scope

Envelope policy version `EVT-1` fictional; event names
`zm.sis.registration.*.v1`. No behavior change to registration
confirmation; Moodle failure still never reverses.

## State authorization failure and recovery

Producer-side only; readers tolerate missing envelopes; unique
(event, idempotency) convergence; neutral 404s preserved.

## Proof and documentation

API tests: envelope completeness on submit/amend/waitlist events;
waitlist version present; legacy derivation deterministic; attempt
lifecycle transitions; concurrent producers single event; registration
API/contract tests green. Record in PHASE-6 review + NOTE-PH6-002.

## Out of scope and open gates

Worker delivery (slice 3); reconciliation (slice 6). Gates as
TASK-PH6-000.

## Completion

Pending; see VERIFICATION. Human review pending.
