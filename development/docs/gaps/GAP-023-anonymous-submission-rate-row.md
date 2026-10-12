# GAP-023 — Anonymous application-submission rate row has no mappable flow

Status: Open
Raised by: implementation (TASK-PH8-004 reconciliation)
Date: 2026-10-04

## Missing or contradictory design

Compendium §19.41 requires "Public application submission: 5 per IP
per hour, plus duplicate detection". Application start in this system
is authenticated (SessionGuard + APP role + verified contact); there
is no anonymous submission flow to key per IP. No authority exists
for an additional per-account start cap beyond the general budget.

## Why it blocks or risks implementation

Inventing a per-account submission cap would guess policy. The
authenticated flow already has duplicate protection (idempotency
key + one-active-application-per-offering), `maxActivePerIntake`,
ownership checks, and the per-account general budget.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

REQ-ADM-002, APP start, `POST /applications`, general budget.

## Bounded options and consequences

Reconcile as not-applicable with reasons (chosen), or add an
explicit per-account start budget as a packet-local demo value
(requires packet decision, not taken).

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH8-004, NOTE-PH8-004.
