# Learning Note — TASK-PH6-003 (simulator adapter and worker)

- Lead developer: Charles Hangoma (proposed; TASK-PH6-003)
- Reviewer: Chitindu Milimbo (proposed)
- Date/release: 2026-09-24 / v0.7.0 track Phase 6 slice 3
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

MOODLE-SIM-v1 deterministic adapter plus an in-process delivery
worker (expiry-daemon precedent: claim guard, batches, Vercel skip,
configurable interval). The worker claims PENDING attempts, ensures
one shell per offering+period, enrols students, maps staff roles with
quiz-authority gating (Tutor+QUIZ → Non-editing Teacher, else Tutor;
Lecturer → Teacher), mirrors TG membership, and suspends (never
deletes) on drops. Scenarios: success/timeout/duplicate/mismatch/
outage; capped backoff, dead-letter after budget, manual review for
permanent mapping errors. Registration status reads Queued/Synced/
Delayed/Failed with student-safe wording; registration never reverses.

## Frontend

- Register page already rendered the handoff state; browser asserts
  Queued after submit (Synced proven in API).

## Backend/domain

- `moodle-simulator.ts` (no policy inside), worker claim loop,
  `runWorkerNow` demo trigger, simulator mode control, TG/role event
  producers in teaching, registration delivery-state hookup.

## Database/migration

- `20260925170000_ph6_simulator`: SimShell/Enrolment/StaffRole/
  GroupMember projections ("actual" side).

## Security + authz

- Worker system-owned; controls MOODLE_ADMIN-gated + DEMO_MODE;
  duplicate delivery converges; no HMAC needed on the internal path
  (no inbound callbacks exist; documented).

## Tests and what they prove

- `integration-sync.e2e-spec.ts` (13 tests): delivery → Synced,
  shell-once, role mapping, quiz gating, TG mirror, drop-suspend,
  duplicate convergence, timeout→retry→recover, outage survival,
  states, concurrent ticks, denials, neutrals. Green first run.

## What failed or confused us

- `attempt` is a scalar-only relation on InstitutionalRegistration;
  load attempts separately.
- Stale servers on the wrong DB caused audit-less 401s; kill-all rule.
- Browser DB needed migrate + reseed again.

## Questions to revise

- Claim→deliver→mark cycle; why removals suspend; where replay and
  reconciliation attach (slices 5–6).
