# GAP-002 — Session concurrency on workspace switch (kill or keep?)

Status: Open
Raised by: Charles
Date: 2026-09-15

## Missing or contradictory design

No handbook sentence states whether switching workspace terminates or keeps
other sessions/devices/tabs/drafts. Specified: authority re-evaluates from
the new active role/scope, old-role actions disappear immediately
(`05-hod-book:1418`), mid-act revocation blocks with draft protection
(§12.12:412-416).

## Why it blocks or risks implementation

Inventing "kill others on switch" would destroy legitimate multi-device use;
inventing "keep everything" is already the implemented behaviour. The rule
itself is unspecified.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

REQ-IAM-002, all multi-role users, switcher, Session model, shared-device tests.

## Bounded options and consequences

Specify per-session active context (implemented) without cross-session kills;
revisit if a risk event demands it.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH1-004 (Gate 11).
