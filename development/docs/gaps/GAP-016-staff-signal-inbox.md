# GAP-016 — Staff-side signals and inbox (Phase 3 follow-up)

Status: Open
Raised by: implementation review, Phase 3 slices 1–2
Date: 2026-09-21

## Missing or contradictory design

Applicant actions (clarification response, correction request, withdrawal,
ticket reply) write applicant-visible timeline events and pollable applicant
inbox rows only. No staff table, staff inbox UI, or signal tells a reviewer
that their claimed case needs attention; the queue exposes
`openClarifications/openCorrections/actionNeeded` counts that require manual
refresh. GAP-008/009 cover the delivery worker and ops queue but not the
staff-inbox scope.

## Why it blocks or risks implementation

Inventing a staff notification model, badge counts, or push semantics would
fabricate workflow beyond the packet. The demo stalls after a clarification
round-trip unless the officer polls.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

ROLE-ADM-OFF queue/case screens, `ReviewQueueItem.actionNeeded`,
`ApplicantNotification` consumers, Phase 3 slices 3–5.

## Bounded options and consequences

Pollable staff signal derived from existing counts (slice 6 pattern) with
explicit refresh affordances; real inbox + templates + retry in v0.9
hardening alongside GAP-008/009.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH3-001, TASK-PH3-002, v0.9 plan.
