# Learning Note — TASK-PH6-000 (TG and teaching-assignment sources)

- Lead developer: Charles Hangoma (proposed; TASK-PH6-000)
- Reviewer: Chitindu Milimbo (proposed)
- Date/release: 2026-09-24 / v0.7.0 track Phase 6 slice 0
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

SIS-authoritative tutorial groups and teaching assignments (Moodle
mirrors from slice 3 on): coordinator creates groups with the
Blueprint-5 field set, allocates students with reasons under capacity
(never over-enrols, duplicates refused, history preserved on remove),
activates only with an active tutor; assignments run
Proposed→Active→Suspended/Ended with authorizer + audit. Quiz authority
derives from explicit capability + TG scope + effective dates, and is
consumed by Moodle role mapping. Timetable-conflict validation has no
source model (GAP-021).

## Frontend

- `/admin/teaching/groups` coordinator workspace (create/allocate/
  activate) + `/api/teaching` proxy + coordinator demo login + home and
  shell nav links.

## Backend/domain

- `teaching` module: group CRUD/activate/close, allocation with
  per-group serialization, assignment lifecycle, quiz-authority
  predicate (TG vs course-wide), programme-scoped coordinator gate.

## Database/migration

- `20260925140000_ph6_teaching`: `TutorialGroup`, `TGAllocation`,
  `TeachingAssignment` + opposites.

## Security + authz

- Coordinator-only writes (programme-scoped); students read assigned
  groups only; tutors see nothing unassigned; neutral 404s; idempotency.

## Tests and what they prove

- `teaching-tg.e2e-spec.ts` (15 tests, shared helper): lifecycle,
  tutor gate, allocation, capacity refusal, history-preserving remove,
  assignment states, quiz allow/deny-scope/deny-dates/substitute,
  denials, neutrals, concurrency, idempotence. Green on fresh DB.
- Browser coordinator create-draft leg. Green.

## What failed or confused us

- Helper import depth (`test/helpers/` needs `../../src`); raw-server
  vs supertest wrapper in the new spec.
- Stale dev servers got reused by Playwright; kill before reruns.
- Browser DB had lost its seed (empty catalogue); re-seeded.
- CSS path depth on new admin pages (same lesson as Phase 5).

## Questions to revise

- TG/assignment field map; why activation needs a tutor; where quiz
  authority is consumed (slice 3 mapping).
