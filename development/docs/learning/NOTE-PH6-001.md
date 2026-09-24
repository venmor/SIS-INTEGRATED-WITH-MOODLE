# Learning Note — TASK-PH6-001 (mapping registry and lifecycle)

- Lead developer: Charles Hangoma (proposed; TASK-PH6-001)
- Reviewer: Chitindu Milimbo (proposed)
- Date/release: 2026-09-24 / v0.7.0 track Phase 6 slice 1
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Versioned Moodle mapping registry binding both SIS and Moodle
identifiers (kinds SHELL/USER/ROLE/GROUP/SECTION): draft with the full
identifier pair, synthetic validation that checks the SIS side without
writing anything, and four-eyes activation (activator ≠ creator,
passing test required, old versions supersede). Shell provisioning is
idempotent per offering + period with deterministic simulator IDs.
Connection health reports state only, never secrets.

## Frontend

- `/admin/moodle/mappings` registry (health notice, list, draft/test/
  activate forms) + `/api/integration` proxy + Moodle admin demo login
  + home/shell nav links.

## Backend/domain

- `integration` module: draft/test/activate/list, provisionShell,
  connectionHealth; `MOODLE-DEMO-v1` config.

## Database/migration

- `20260925150000_ph6_mapping`: `MoodleConnection`, `MoodleMapping`,
  `MappingCheck`.

## Security + authz

- MOODLE_ADMIN + capability gates; self-activation refused with
  SOD_VIOLATION; support staff read mappings/health only; neutral 404s.

## Tests and what they prove

- `integration-mapping.e2e-spec.ts` (12 tests): draft/versioning,
  closed kinds, synthetic pass/fail (fail writes nothing), four-eyes,
  test-required refusal, shell idempotency + concurrency, health
  without secrets, denials, neutrals. Green first run.
- Browser draft-shell-mapping leg. Green.

## What failed or confused us

- Stale servers on the wrong database answered sign-in with audit-less
  401s; kill-all + fresh servers fixed it (lesson: verify DB target
  when auth fails mysteriously).
- Browser DB needed migrate + reseed (empty catalogue).
- Fixed browser fixture names collide on reruns; uniquified.

## Questions to revise

- Mapping kind table; why tests never write; where mappings are
  consumed (slices 3/6).
