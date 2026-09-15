# GAP-003 — Capability registry (allowed values + Role→capability mapping)

Status: Open
Raised by: Charles
Date: 2026-09-15

## Missing or contradictory design

The grant form requires "Approved capabilities" but no allowed-values table
or Role→capability mapping exists. Only 18 Section-2 namespaced IDs exist
(`02/.../02:67-91`); seed/demo values (`teach`, `stage-marks`) match none of
them, so hard-restricting would break seed and invent mapping.

## Why it blocks or risks implementation

REQ-IAM-004 denies unless capability permits — without a registry the check
cannot run.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

REQ-IAM-004, IAM Administrator, grant screen, RoleAssignment.capabilities.

## Bounded options and consequences

Validate shape only (string array, lengths); file this GAP; enforce the
18-ID list when a registry is approved.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH1-004 (Gate 11).
