# GAP-013 — §12.13 leftover rows (duplicate identity, recovery alternative, reinstatement)

Status: Open
Raised by: Charles
Date: 2026-09-15

## Missing or contradictory design

Three §12.13 rows have no specified flow or store: duplicate-identity
matching-review cases (no case table; merge correctly absent), inaccessible
recovery-method alternatives (single token path only), and controlled
reinstatement after erroneous revocation (no endpoint; overlap check only
blocks duplicates).

## Why it blocks or risks implementation

Inventing case tables, alternative channels, or reinstatement semantics
would fabricate domain.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

§12.13 rows, IAM Administrator, recovery flow, RoleAssignment history.

## Bounded options and consequences

Defer with explicit TEST-AUTH DEFERRED rows; never drop (05-traceability).

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH1-004 (Gate 11 + DEFERRED table).

## Factual implementation update — 2026-09-19

Controlled reinstatement now exists in reinstate.service.ts and has API tests; it creates a new assignment and preserves old history. Duplicate-identity matching cases and accessible alternative recovery remain open. The original no-endpoint statement is historical.
