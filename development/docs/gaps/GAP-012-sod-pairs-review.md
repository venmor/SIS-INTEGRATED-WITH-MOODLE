# GAP-012 — SoD pair table + review workflow

Status: Open
Raised by: Charles
Date: 2026-09-15

## Missing or contradictory design

No mutually-exclusive role-pair table exists (only rules/examples at
`02/.../02:93-102`), and no SoD review workflow/queue is specified
(§12.13: "Require segregation-of-duties review"). The demo
`sodPairs: []` never denies. (Distinct from GAP-003, which is the
capability registry.)

## Why it blocks or risks implementation

Inventing conflict pairs would fabricate institutional policy.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

§15.21 hold/conflict/SoD arm, IAM Administrator, grant screen,
SECURITY-v1 sodPairs, TEST-AUTH-008 pattern.

## Bounded options and consequences

Mechanism + unit tests ship (slice 4); pair data + review queue await
institutional matrix.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH1-004 (Gate 11).
