# Learning Note — TASK-PH7-002 (Moodle grade staging snapshot)

- Lead developer: Chitundu Milimbo (user correction 2026-09-25; TASK-PH7-002/003 packets updated to match)
- Reviewer: Charles Hangoma
- Date/release: 2026-09-25 / v0.8.0 track Phase 7 slice 2
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Staged batches now freeze the DS5 §4 provenance in force at stage
time (`GradeBatch`: Moodle instance/course/activity, SIS
offering/period/component, plan + policy versions, source response;
`GradeLine`: resolved SIS identity + conversion formula), so later
plan/mapping supersedes never rewrite the snapshot. Identity
resolution records `resolvedStudentId` (student number) or
`resolvedAccountId` (username fallback); unmatched stays MOODLE_ONLY
evidence and converts to nothing. Enrolment-truth disputes belong to
the slice-3 swimlanes (Registry), not staging.

Fail-closed outage survival: staging through a mapping whose Moodle
course has no ACTIVE shell binding is refused with 503
`SOURCE_UNAVAILABLE` and writes nothing, preserving the last
confirmed batch; the same payload stages once the source recovers.
The outbox event carries the GAP-022 canonical chain
(ACT-ASM-001 + CMD-LRN-StageMoodleGradeTransfer +
INT-Moodle-GradeTransfer-v1 + EVT-MoodleGradeTransferStaged-v1).

Deliberately not built (later slices): batch transitions past
VALIDATED (slice 3 owns the validation queue; 4+ own moderation,
board, release, amendment); no live Moodle pull (simulator-sourced
only, `MOODLE-SIM-v1` provenance).

## Frontend

- Batch detail page: frozen provenance block (instance, course,
  activity, offering, period, component + plan version, policy) and a
  Converted preview column next to Raw/Outcome/State/Flag. Quarantined
  lines stay visible as evidence; nothing edits or publishes.

## Backend/domain

- `assessment` service `stageBatch`: shell-outage guard, identity
  resolution, frozen provenance write, chained outbox payload.
  Slice-1 plan/mapping paths untouched.

## Database/migration

- `20260927110000_ph7_staging_provenance`: provenance columns on
  `GradeBatch`/`GradeLine` + restrictive FKs to `Student`/`Account`
  (Prisma 7 required the opposite `resolvedGradeLines` fields).

## Security + authz

- Lecturer-only staging inside offering scope unchanged; outage
  refusal is neutral-safe (503 + support reference, no existence
  leak beyond what staging already reveals to authorized readers).

## Tests and what they prove

- `grade-staging.e2e-spec.ts` now 18 tests (+5): frozen provenance
  snapshot, outage refusal + preservation + resume, lost-response
  replay with a single outbox row (timeout→retry→recover),
  superseded-mapping `MAPPING_REQUIRED`, per-revision outbox events
  with the canonical chain. 18/18 on fresh `sis_ph7_s2_test`.
- Slice-1 regression `assessment-plan` 20/20; unit 73/73; typecheck
  exit 0; API lint warnings-only (pre-existing); web lint clean; API
  dist via direct `tsc` + web production build exit 0.
- Browser `assessment-plan` (incl. staging leg + new provenance
  assertions) 1/1 on migrated `sis_ph7_browser_test` with rebuilt
  apps (390px, keyboard/focus, no overflow, empty localStorage).

## What failed or confused us

- `prisma generate` rejected one-sided relations (P1012): Prisma 7
  wants the opposite fields, so `Student`/`Account` gained
  `resolvedGradeLines`. No new migration needed for that (schema-only
  back-refs).
- Playwright's `npm`-based webServer cannot start on Windows
  (`with-env` uses `shell:false`) and stale servers on 3101/3100 get
  silently reused with the wrong DB. Fix used twice now: kill
  orphans, start API + `next start` directly against the target DB,
  let Playwright reuse the healthy servers. Worth a permanent Windows
  note in the walkthrough before slice 3.
- The `npm run start --workspace=web` detached wrapper dies while its
  parent survives; launching `next start` directly with a log file is
  reliable.

## Questions to revise

- Batch-review screen (§8.1: expected-vs-received, distribution,
  moderator actions) — which parts does the slice-3 queue own vs
  slice 4; where the VALIDATED→MAPPED transition lives.
