# Learning Note — TASK-PH6-002 (outbox envelopes)

- Lead developer: Charles Hangoma (proposed; TASK-PH6-002)
- Reviewer: Chitindu Milimbo (proposed)
- Date/release: 2026-09-24 / v0.7.0 track Phase 6 slice 2
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Exact enrolment envelopes on every Moodle outbox event: source event
ID (= row id), CloudEvents-style type (`zm.sis.registration.*.v1`),
correlation + idempotency keys, payload version, delivery status,
retry-policy ref. The version-less waitlist payload gains the
registration version; legacy rows resolve keys deterministically from
aggregate + type + id. Delivery attempts tracked in a new table; the
outbox stays an immutable log. No delivery yet (worker slice 3); no
behavior change to confirmation.

## Backend/domain

- Envelope writes in submit/amend/waitlist paths; legacy `type`
  retained for readers; `IntegrationDeliveryAttempt` table.

## Database/migration

- `20260925160000_ph6_delivery`: attempts table + outbox relation.

## Tests and what they prove

- `integration-envelope.e2e-spec.ts` (7 tests): envelope completeness
  on all three producers, waitlist version, legacy determinism,
  attempt lifecycle, concurrent single event, confirmation preserved.
  Green (shared helper in use).

## What failed or confused us

- Concurrent submits both 201 (resource-idempotent), not 201+409;
  asserted single stored result instead.
- Single-course plans fail load bands; concurrent test uses two.

## Questions to revise

- Envelope field map; where delivery consumes it (slice 3).
