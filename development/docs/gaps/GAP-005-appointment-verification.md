# GAP-005 — Appointment/authority cross-check (no HR adapter)

Status: Open
Raised by: Charles
Date: 2026-09-15

## Missing or contradictory design

HR/staff records are authoritative for appointments
(`02/.../11:69`), but no HR-system adapter, Senate-records table, or lookup
rule exists (integration contracts cover Moodle/payment/regulatory only).

## Why it blocks or risks implementation

"Active appointment/authority evidence" (§12.9) cannot be cross-checked;
inventing an HR API check would fabricate integration.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

ACT-IAM-001, IAM Administrator, grant screen, appointmentRef/authoritySource.

## Bounded options and consequences

Enforce presence (mandatory fields; missing evidence never yields a
workspace) without external verification.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH1-004 (Gate 11).
