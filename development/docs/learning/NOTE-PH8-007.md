# Learning Note — TASK-PH8-007 (demo reset and evidence capture)

- Lead developer: Chitundu Milimbo
- Reviewer: Charles Hangoma
- Date/release: 2026-10-04 / v0.9.0 track Phase 8 slice 7
- Branch: worktree (human review pending)

## What was built and why

Roadmap slice 7 against the exit gate (deterministic demo
reset; release candidate + rollback reference) and TEST-REC-007
(failed deployment returns to last known-good release). The
motivating incident: an earlier accidental `demo:reset`
destroyed a shared local volume — this slice makes that
unrepeatable by construction.

## Reset hardening (`scripts/demo-reset.mjs` + compose)

- Refuses without `ALLOW_DEMO_RESET=true` per invocation
  (proven: exits 2 with no side effects).
- Refuses the shared project (`development`), the shared
  container (`sis-postgres-18`) and the shared port (5432)
  by name (all three refusals proven).
- Isolated project by default (`sis-demo-reset` /
  `sis-postgres-reset` / 55433); compose file interpolates
  container name + host port with unchanged shared defaults,
  so the normal `db` flow is byte-identical.
- Reports shared-service status before/after in the evidence
  JSON; aborts the release if a running shared service went
  missing mid-reset.
- Windows-safe direct `node` invocations (no `npx` shims);
  always tears down only the isolated `-p` project.

## Rehearsal evidence (2026-10-04, this box)

Full `ALLOW_DEMO_RESET=true` run: isolated network/volume/
container created → 51/51 migrations applied on :55433 →
full seed skipped honestly (needs Node 24 type stripping;
CI proves it every push) → evidence
`{sharedServiceBefore: true, sharedServiceAfter: true,
seedSkipped: true, durationMs: 31086}` → isolated project
fully removed (container, network, volume gone) →
shared `development_pgdata` intact, all 40 databases present,
`sid` `Account` count still 19.

## Release candidate + rollback reference (proposals)

- Candidate tag proposal: `v0.9.0-rc1` (follows the
  `v0.1.0-foundation` convention). Tag creation is a human
  git action — not created here.
- Rollback reference: redeploy the pre-release build; the
  database stays forward because every migration in the
  chain is additive (no down path exists — recorded
  honestly, not as a downgrade rehearsal).
- CI addition (approved): `backup:test` runs post-e2e on the
  fully seeded `sis_ci_review` — this is also the full-data
  drill (finance/assessment rows) GAP-024 asked for. Proof
  is the first green post-push run (Actions cannot run here);
  pgdg-sourced client-18 avoids the major-mismatch abort.

## Security + authz

- No change. Reset never touches real data (none exists);
  never run it against a shared/existing database.

## Tests and what they prove

- Three refusal paths proven (exit 2, zero side effects);
  full rehearsal green with evidence JSON; shared service +
  data verified intact after.
- `node --check` clean on the rewritten script. No API/web
  code changed: typecheck/build state unchanged from slice 5
  (recorded, not rerun).

## What failed or confused us

- First rewrite passed `-p` to `docker` instead of `docker
  compose` — caught on the first rehearsal run (fail-fast
  worked as designed: nothing was created or destroyed).
- `seedSkipped` was first derived from the Node version
  string; replaced with the actual catch outcome (evidence,
  not inference).

## Questions to revise

- Human tag creation (`v0.9.0-rc1`); first green CI run with
  the backup step; GAP-009/GAP-024; UAT participants.
