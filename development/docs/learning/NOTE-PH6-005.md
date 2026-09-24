# Learning Note — TASK-PH6-005 (dead letter, replay, incidents)

- Lead developer: Chitindu Milimbo (proposed; TASK-PH6-005)
- Reviewer: Charles Hangoma (proposed)
- Date/release: 2026-09-24 / v0.7.0 track Phase 6 slice 5
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Dead letters with reason (never deleted), replay as a UI-DECISION-001
page (frozen evidence, declaration, four-eyes separation), range
replay, delivery pause/resume, and incidents that close only with
recovery evidence. Replays preserve correlation/idempotency and never
edit source records. Forcing outage opens a HIGH incident
automatically.

## Frontend

- Integration workspace extended (dead letters, replay request/list,
  incidents, pause); replay decision page with frozen evidence +
  declaration; proxy paths added.

## Backend/domain

- deadLetters, request/decideReplay, range replay, setPaused (worker
  honors), open/list/closeIncident (evidence ≥ 20 chars), outage
  auto-incident.

## Database/migration

- `20260925190000_ph6_replay`: ReplayDecision, IntegrationIncident.

## Security + authz

- Support-only throughout; Moodle Admin cannot replay; students see
  safe wording; SoD enforced incl. dual-hat same-account refusal.

## Tests and what they prove

- `integration-replay.e2e-spec.ts` (12 tests): dead-letter landing,
  frozen evidence, four-eyes, replay delivers without duplicating,
  range reset, decline reasons, denials, pause/resume, incident
  lifecycle/evidence/outage/auto-open, denials. Green first run.
- Browser: incident open/close in the workspace. Green.

## What failed or confused us

- Zero failures in API; browser needed the support-role switch
  (incidents are support-only) and visible IDs for the close form.
- Local postgres postmaster died between sessions; `local-db start`
  revives (data intact).

## Questions to revise

- Replay decision matrix; why replays reset budget; where
  reconciliation verifies outcomes (slice 6).
