# Phase 8 Slice 7 Demo Reset and Evidence Capture Implementation Plan

> Executed inline 2026-10-04 (lead Chitundu Milimbo, reviewer
> Charles Hangoma) under `TASK-PH8-007`. This file records the
> approved plan all tasks completed against.

**Goal:** `demo:reset` provably safe (isolated project only,
shared service untouchable), CI runs the backup rehearsal on
the fully seeded database, release-candidate + rollback
references recorded, walkthrough covers the release story.

**Tech Stack:** Node scripts + Docker Compose + PostgreSQL 18
(container tools), GitHub Actions (change only — proof is the
first green post-push run), tags (human action).

**Spec:** `development/docs/task-packets/TASK-PH8-007.md`.

## Global Constraints

- Fail-closed: refusals by name (flag, project, container,
  port); fail-fast steps; never seed a dirty DB.
- Never reset a shared/existing database. Demo data only.
- No production deployment or backup automation. No
  `OpsIncident` automation from drill results.

---

### Task 0: Packet — [x] `TASK-PH8-007.md` drafted 2026-10-04 (human approval pending)

### Task 1: Safe reset — [x]
Rewrote `demo-reset.mjs` (explicit per-invocation flag,
isolated `-p` project, name/port refusals, shared-service
before/after evidence, isolated-only teardown, Windows-safe
direct node calls); parameterized compose
container/port with unchanged shared defaults. Proven: three
refusals exit 2 with zero side effects; full rehearsal green
(51/51 migrations, shared true/true, seed honestly skipped
on Node 22, full teardown, 19 accounts intact). Caught and
fixed a `-p` flag-ordering bug on the first run (fail-fast
fired before anything was created).

### Task 2: CI backup step — [x]
Post-e2e `backup:test` on `sis_ci_review` (approved
addition; doubles as the GAP-024 full-data drill);
pgdg-sourced client-18 avoids the major-mismatch abort.
Structure reviewed; proof = first green post-push run.

### Task 3: Release refs — [x]
Candidate proposal `v0.9.0-rc1` (human tag action);
rollback = redeploy prior build, database stays forward
(additive migrations, no down path — recorded honestly).

### Task 4: Walkthrough + closeout — [x]
Release-rehearsal section in `PHASE-8-WALKTHROUGH.md`;
`NOTE-PH8-007`, Phase 8 review row, `VERIFICATION.md`
slice-7 section, packet completion, DESIGN-INDEX line.

## Self-Review

**1. Spec coverage:** packet outcome (safe reset + CI step +
refs + walkthrough) → Tasks 1–4.
**2. Placeholder scan:** no TBD/TODO.
**3. Proof honesty:** seed skip, CI proof pending, and tag
creation named as human actions, not claimed.
