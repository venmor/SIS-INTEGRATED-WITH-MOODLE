# Learning Note — TASK-PH6-006 (reconciliation and closure)

- Lead developer: Charles Hangoma (proposed; TASK-PH6-006)
- Reviewer: Chitindu Milimbo (proposed)
- Date/release: 2026-09-24 / v0.7.0 track Phase 6 slice 6
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Expected-vs-actual reconciliation: scheduled/on-demand runs compare
SIS roster, TG allocations and staff truth against simulator
projections, emitting MISSING/UNEXPECTED/MISMATCH/MAPPING diffs. Safe
diffs auto-repair by requeueing idempotent delivery; the rest open
governed cases (requeue, governed suspension, escalate, evidence-backed
resolve). Forbidden resolutions (activating SIS records, editing
payloads, deleting rows) are refused by allow-list. Runs and cases are
idempotent across reruns.

## Frontend

- `/admin/integration/reconciliation` (runs + cases + resolve),
  linked from both workspaces; proxy paths added.

## Backend/domain

- runReconciliation/listReconRuns/listReconCases/resolveReconCase;
  closure evidence ≥ 20 chars; rerun convergence via open-case dedupe.

## Database/migration

- `20260925200000_ph6_reconciliation`: ReconciliationRun/Case.

## Security + authz

- Operations-only runs/resolutions; students see own sync states;
  neutral 404s; denials audited.

## Tests and what they prove

- `integration-reconciliation.e2e-spec.ts` (13 tests): clean runs,
  missing→repair, unexpected/mismatch cases, rerun convergence,
  requeue idempotence, governed suspension (SIS untouched),
  escalation, forbidden MAKE_ACTIVE, evidence-gated closure, denials,
  neutrals, full outage→replay→alignment checkpoint with single
  enrolment. Green.
- Browser checkpoint: Queued → outage → dead letter → approved replay
  → Synced → clean recon run. Green first run.

## What failed or confused us

- `attempt` is scalar-only on InstitutionalRegistration (repeat
  lesson — check relations before including).
- Suite needed student-scoped assertions for shared-DB runs, not just
  fresh-DB reliance.
- CSS path depth on the new page (checklist item by now).

## Questions to revise

- Diff taxonomy; why repairs requeue instead of writing; what closes
  a case; where grade staging attaches (Phase 7).
