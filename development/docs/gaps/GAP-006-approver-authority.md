# GAP-006 — Approver scope-authority check

Status: Open
Raised by: Charles
Date: 2026-09-15

## Missing or contradictory design

Approver must be a real account ≠ target (enforced), but no rule states the
approver must hold authority over the target scope, nor which capability
that is (results-domain analogue exists; IAM analogue does not).

## Why it blocks or risks implementation

Inventing "approver must be Dean/HoD" would fabricate authority rules.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

ACT-IAM-001, IAM Administrator, grant screen, approverId.

## Bounded options and consequences

Enforce existence + non-self now; scope-authority when a registry exists.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH1-004 (Gate 11).

## Factual implementation update — 2026-09-19

Grant/break-glass code now checks the configured approver role plus current effective dates, revocation and active account; the earlier existence-only description is historical. Institutional hierarchy and approver authority over the exact target scope remain unresolved.
