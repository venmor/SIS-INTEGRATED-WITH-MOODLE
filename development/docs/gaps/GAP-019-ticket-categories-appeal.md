# GAP-019 — Support ticket categories and decision appeal route

Status: Open
Raised by: handbook audit of slices 3–6, 2026-09-21
Date: 2026-09-21

## Missing or contradictory design

Part 9 §7 lists ticket categories (technical, form, upload, payment,
clarification question, decision question, other) with category-scoped
attachment rules; §6.1 allows a review/appeal route “only when permitted”.
Tickets are currently free-subject/message with uniform attachment handling,
and no appeal flow exists. No approved category list, routing/SLA table, or
appeal policy is configured.

## Why it blocks or risks implementation

Inventing categories or an appeal workflow would fabricate admissions policy.
An unscoped appeal path could imply decisions are negotiable outside the
authorized process.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

`SupportTicket`/`SupportTicketMessage`, ticket forms, tickets page,
`TASK-PH2-006`, Part 9 §§6–7, `UI-TASK-001` help routing.

## Bounded options and consequences

Approve a category catalogue with attachment/SLA rules plus an appeal policy
(form, grounds, deadline, authority); add category select, scoped attachments,
and the appeal flow with tests. Until then tickets stay generic and decisions
link to support without an appeal route.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH2-006, Phase 2/3 exit review.
