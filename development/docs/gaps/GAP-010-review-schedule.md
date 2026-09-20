# GAP-010 — Access-review schedules + expiry daemon (slice 5 / v0.9)

Status: Open
Raised by: Charles
Date: 2026-09-15

## Missing or contradictory design

§12.9 requires review schedules by role risk level and §12.12 review actions
(confirm/reduce/reassign/revoke/clarify); risk-level→cadence mapping,
reviewer authority, and revocation-effective-delay policy are unspecified.
The expiry daemon (automatic revocation, review queue) belongs to slice 5
"Access audit and expiry/revocation" and v0.9 privileged-access review.

## Why it blocks or risks implementation

Inventing cadences or a scheduler now would fabricate institutional policy.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

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

## Factual implementation update — 2026-09-19

The bounded Phase 1 slice 5 implementation now includes ReviewSchedule, the Nest expiry scheduler, basic review UI and configured demo cadence. The earlier statement that all of this was deferred is historical. Production cadence/authority policy and advanced review controls remain open; see TASK-PH1-005 and GAP-014.
