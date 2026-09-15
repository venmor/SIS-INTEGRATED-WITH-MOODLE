# GAP-004 — Scope registry (org/offering/position tables)

Status: Open
Raised by: Charles
Date: 2026-09-15

## Missing or contradictory design

"Scope validity" (§12.9) has no registry: org-unit graph shape is specified
(`01/.../01:10-15`) and a `Scope` entity is listed (`05/.../05:17`), but no
seeded org/offering/position ID tables exist. DEMO-ACADEMIC-2026-v1 carries
only school/programme names.

## Why it blocks or risks implementation

Strict validity checks would reference tables that do not exist.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

REQ-IAM-003, grant screen, RoleAssignment scope fields.

## Bounded options and consequences

Enforce presence/format + self-consistency now; strict registry validation
when curriculum/organisation tables land.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH1-004 (Gate 11).
