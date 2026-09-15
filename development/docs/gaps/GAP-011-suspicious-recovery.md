# GAP-011 — Suspicious-recovery pause + security review route

Status: Open
Raised by: Charles
Date: 2026-09-15

## Missing or contradictory design

§12.13 requires pausing suspicious recovery into security review, but no
suspicion signals, pause mechanics, or review queue exist; detection needs
provider/telemetry context from open production decisions.

## Why it blocks or risks implementation

Inventing fraud signals would fabricate security policy.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

§12.13 row, recovery flow, Security Administrator role.

## Bounded options and consequences

Defer to hardening with telemetry; record here and in Gate 11.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH1-004 (Gate 11), hardening plan.
</atem:invoke>
</atem:function_calls> ↓↓↓operand too long (max 25000 chars); reduce output length by 36% and retry↓↓↓oses a risk-level → cadence mapping,
reviewer authority, and revocation-effective-delay policy are unspecified.
The expiry daemon (automatic revocation, review queue) belongs to slice 5
"Access audit and expiry/revocation" and v0.9 privileged-access review.

## Why it blocks or risks implementation

Inventing cadences or a scheduler now would fabricate institutional policy.

## Affected requirements,ors/screens, actions, permissions, data, integrations and tests

REQ-IAM-003 (expiry history), §12.14 acceptance "reviewed", slice-5 scope.

## Bounded options and consequences

Schema stays review-ready (dates/reasons/history queryable); workflow and
daemon deferred with explicit Gate-11 note.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH1-004 (Gate 11), TASK-PH1-005.
