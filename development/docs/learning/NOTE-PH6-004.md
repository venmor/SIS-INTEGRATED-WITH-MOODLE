# Learning Note — TASK-PH6-004 (delivery queue, workspaces, maintenance)

- Lead developer: Chitindu Milimbo (proposed; TASK-PH6-004)
- Reviewer: Charles Hangoma (proposed)
- Date/release: 2026-09-24 / v0.7.0 track Phase 6 slice 4
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Two separated operations workspaces (never merged): Moodle
administration (SCR-OPS-MOODLE-001: health, shells, mappings,
maintenance) and Integration support (SCR-OPS-INT-002: event-delivery
queue; SCR-OPS-DELIVERY-003: envelope/attempt detail). Maintenance
windows schedule through approved change, defer deliveries to the
window end without consuming retry budget, flip health to MAINTENANCE
with student-safe wording, and cancel (never edit).

## Frontend

- Fresh pages per user decision (preview fixtures untouched):
  admin/moodle (+maintenance), admin/integration (+delivery detail);
  home + shell nav links for both roles; proxy extended.

## Backend/domain

- listDeliveries/deliveryDetail/listShells/listEnrolments,
  schedule/cancel/listMaintenance, worker deferral inside windows.

## Database/migration

- `20260925180000_ph6_maintenance`: MoodleMaintenance.

## Security + authz

- Role-separated queue visibility; students/academics 403 everywhere;
  neutral 404s; replay/decision execution stays in slice 5.

## Tests and what they prove

- `integration-ops.e2e-spec.ts` (8 tests): queue + envelopes for both
  roles, health/outage/recovery without secrets, shells + enrolments,
  maintenance schedule/defer/cancel + invalid windows, student reads,
  denials, neutrals. Green.
- Browser: admin health/shells/maintenance + support queue. Green.

## What failed or confused us

- Browser DB needed the newer migrations (P2021).
- Dirty-DB duplicates in lists; scoped assertions.
- No "Switch account" link on sign-in; clear cookies instead.
- CSS path depth (repeat lesson — checklist it for new admin pages).

## Questions to revise

- Queue field map; why windows cancel instead of editing; where
  replay attaches (slice 5).
