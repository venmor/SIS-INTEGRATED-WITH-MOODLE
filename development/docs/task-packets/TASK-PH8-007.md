# TASK-PH8-007: Demo reset and evidence capture

## Authority and ownership

User authorization: Phase 8 slice 7 implementation request, 2026-10-04.
Release v0.9.0 track. Lead Chitundu Milimbo; reviewer Charles Hangoma.
Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 7 (`11-…/10-phase-8-
hardening-operations-and-evidence.md`); exit gate (no
critical release-blocking failure, deterministic demo reset,
known limitations documented, release candidate + rollback
reference); TEST-REC-007 (failed deployment returns to last
known-good release); TEST-REC-008 (restore reconciles).
SUP-001–SUP-013 apply. Depends on TASK-PH8-001..006 (their
suites are regressions; their evidence joins the release
bundle).

## User outcome and boundaries

`demo:reset` is provably safe: it refuses the shared service
and only rebuilds an explicitly-authorized isolated project,
rehearsed end-to-end with evidence (source/target/executor/
duration/reconciliation). CI runs `backup:test` against the
post-e2e seeded database (approved addition). Release
candidate tag proposal + rollback reference recorded
(humans create tags). Demo walkthrough covers the reset and
rollback story. No production deployment, no data retention
automation.

## Interim demo decisions (fail-closed until approved)

- Reset requires explicit `ALLOW_DEMO_RESET=true` per
  invocation (in addition to `ALLOW_DEMO_SEED`) and an
  isolated compose project (own container, port, volume);
  the shared `development` project (`sis-postgres-18`) is
  refused by name. A prior accidental reset destroyed a
  local volume — this slice exists so it cannot recur.
- Rollback reference is redeploy-prior-build: migrations are
  additive-forward (no down path), so the database stays
  forward while the app build rolls back. Recorded honestly,
  not as a downgrade rehearsal.
- CI backup step runs post-e2e on `sis_ci_review` (full seed
  + suite data = the full-data drill); first green CI run
  after push is the proof (cannot run Actions here).

## Policy and explicit demonstration scope

No new policy values. No schema change. Demo data only
(SUP-009). Never reset a shared/existing database for a
demonstration.

## State authorization failure and recovery

Reset aborts fail-fast on any step (never seeds a dirty DB);
scratch databases drop best-effort; backup mismatches fail
the gate. Rollback never deletes official records.

## Proof and documentation

Isolated reset rehearsal green with evidence log; CI diff
reviewed (proof = first green post-push run); release +
rollback refs recorded; walkthrough refreshed. Record in
PHASE-8 review + NOTE-PH8-007.

## Out of scope and open gates

Production deployment, real schedules, standby/failover.
Tag creation is a human git action. Gates: GAP-009,
GAP-024, open decisions (monitoring/escalation ownership,
UAT participants).

## Completion

Implemented in the worktree 2026-10-04 (uncommitted, human
review pending): fail-closed `demo:reset` (3 refusal paths
proven, isolated rehearsal green with evidence JSON, shared
service + 19 accounts verified intact), compose
parameterization with unchanged shared defaults, CI backup
step (proof = first green post-push run), release-candidate
proposal (`v0.9.0-rc1`, human tag action) + rollback
reference, walkthrough release-rehearsal section; see
VERIFICATION Phase 8 slice 7 and NOTE-PH8-007. Human review
pending.
