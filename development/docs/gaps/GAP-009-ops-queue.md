# GAP-009 — Operations queue / reconciliation screen (v0.9)

Status: Open
Raised by: Charles
Date: 2026-09-15

## Missing or contradictory design

Outbox events need a worker, retry/dead-letter handling, approved replay and
a reconciliation screen (07/01:116-123, 06/04). No operations module exists
in v0.2.0 scope.

## Why it blocks or risks implementation

Building an ops console now would drag v0.9 scope into slice 4.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

OutboxEvent delivery, Integration-support role, v0.9 slices 2-3.

## Bounded options and consequences

Emit correlation IDs now so the later queue can join; defer console to v0.9.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH1-004 (Gate 11), v0.9 plan.
