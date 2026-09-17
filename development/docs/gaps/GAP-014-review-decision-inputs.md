# GAP-014 — Review decisions reduce / reassign / change-end-date lack specified inputs

Status: Open
Raised by: Charles
Date: 2026-09-17

## Missing or contradictory design

Handbook §12.12 lists per-assignment review actions (confirm, reduce scope,
change end date, reassign review, revoke access, request clarification) but
specifies no inputs, authority, or effects for three of them:

- Reduce scope: no target scope field, no floor (how narrow is still valid),
  no approver rule for the reduction itself.
- Change end date: no new-date field, no max-extension rule, no renewal
  workflow reference (only "renewed through the same governed workflow").
- Reassign review: no new-reviewer field, no eligibility rule for the
  recipient, no handover audit shape.

`DecideReviewDto` accepts the full enum (contract-stable) but the service
answers 400 `decision-deferred` for these three; the UI offers confirm /
revoke / clarify only.

## Why it blocks or risks implementation

Inventing scope floors, extension caps, or reviewer eligibility would
fabricate access-control policy.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

§12.12 review queue, IAM Administrator/reviewer, `POST
/auth/reviews/:id/decide`, `ReviewSchedule` rows, TEST-AUTH review rows.

## Bounded options and consequences

A. Institution specifies the three input sets + authority; implement as
slice-5 follow-up (DTO already carries the enum).
B. Defer to domain slices where scoped roles exist to reduce against.
Either way the 400 + UI constraint stay until then; never silently
audit-only a decision presented as effective.

## Human decision

Pending.
