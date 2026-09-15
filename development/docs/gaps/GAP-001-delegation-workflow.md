# GAP-001 — Full delegation workflow (windows, sub-delegation, reporting-back)

Status: Open
Raised by: Charles
Date: 2026-09-15

## Missing or contradictory design

Temporary delegation needs delegator, delegate, reason, scope and expiry
(`02/.../02:102`), plus sub-delegation permission, reporting-back date,
conflict check and authority basis (`11-quality...:1494-1512`), with
automatic expiry blocking post-expiry decisions. No delegation window store,
sub-delegation rule, or reporting-back flow is specified for IAM grants.

## Why it blocks or risks implementation

§15.21 requires `delegation/authority is active where needed`. Enforcement
without specified windows would invent policy.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

REQ-IAM-005, IAM Administrator, grant screen, ACT-IAM-001, RoleAssignment
delegation fields, TEST-AUTH-004 (marked DEFERRED to expansion).

## Bounded options and consequences

Enforce present fields only (approver, delegationLimit recorded) and defer
the workflow; do not invent window semantics.

## Human decision

Pending — defer workflow to expansion; enforce recorded fields in slice 4.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH1-004 (Gate 11), NOTE-PH1-004, readiness: Dean decisions expansion gate.
