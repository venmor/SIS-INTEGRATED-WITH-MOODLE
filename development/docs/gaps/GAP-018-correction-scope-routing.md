# GAP-018 — Correction outcome routing (Part 9 §5.2)

Status: Open
Raised by: handbook audit of slices 3–6, 2026-09-21
Date: 2026-09-21

## Missing or contradictory design

Part 9 §5.2 routes corrections by situation (narrow self-service task vs
approval request vs impact explanation vs deny-with-support vs document
replacement vs redirect to an open clarification). The demo implements only
“creates an approval request”; category-to-outcome mapping, impact rules,
and clarification-overlap matching have no approved policy values.

## Why it blocks or risks implementation

Inventing matching rules (e.g. which section/field equals which clarification
question) would fabricate workflow beyond the packet. A wrong redirect could
lose an applicant correction.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

`correctionRequest` (`case.service.ts`), correction form
(`correction-form.tsx`), `TASK-PH2-006`, `TASK-PH3-003`, Part 9 §§5.1–5.5,
`DUPLICATE_TASK` semantics.

## Bounded options and consequences

Approve a per-category outcome table (personal/contact, qualification,
programme choice, document, other) with overlap-matching rules; implement
routing + redirect tests. Until then every correction stays an approval
request and the UI copy says so.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH2-006, TASK-PH3-003, Phase 2/3 exit review.
