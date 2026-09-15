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
