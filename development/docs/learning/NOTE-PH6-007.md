# Learning Note — Live Moodle adapter path (Phase 6 follow-up)

- Date: 2026-09-24. Follows TASK-PH6-001..006 (no new packet; adapter
  surface was specified by INT-MDL-001 and the authority matrix).
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

No Moodle instance exists here and production credentials are open
decisions, so a live connection cannot be demonstrated end to end.
Instead the real adapter path now exists in code: `MoodleAdapter`
interface (idempotent applies, suspending removals, actual-state
queries, secret-free validation), `LiveMoodleAdapter` implementing
Moodle External Services REST (shells, enrolments, groups, staff
roles, queries, version check), and `SimulatorAdapter` wrapping the
existing deterministic simulator. The worker, reconciliation engine
and suspension flow route through the selected backend;
`selectBackend()` engages live only with explicit URL + token.

## Mapping decisions (reviewable)

- Suspend maps to manual unenrol (no suspend flag in supported WS).
- Role shortnames resolve via `MOODLE_ROLE_IDS` (instance ids cannot
  be guessed; missing entries refuse instead of inventing).
- Identity: studentNumber/staff-username as idnumber, resolved from
  SIS rows (never names or emails).
- Token travels as a request parameter per Moodle REST convention;
  never logged, audited, or stored.
- Simulator scenarios and mode controls refuse on a live backend.

## Verification

- Contract tests vs stub HTTP server (5/5): token parameter, WS
  function names, shell idempotence, exception mapping, timeout
  retryability, unknown-role refusal.
- Full Phase-6 e2e (80/80) + regressions green after the refactor;
  browser mappings/checkpoint/portal green.

## To go live (open production decisions)

`MOODLE_API_URL`, `MOODLE_API_TOKEN`, `MOODLE_ROLE_IDS`, instance
version, auth scope, and SSO expectations. Until then the labelled
simulator stays the default and the live path is inert.

## What failed or confused us

- Concurrent delivery ticks collided on find-or-create shell mapping
  and enrolment rows: P2002 read-back on shells/mappings, atomic
  upserts on projections.
- Reconciliation ghost cases needed per-external-key dedupe (distinct
  drift rows deserve distinct cases) and student-scoped assertions
  for shared-DB runs.
