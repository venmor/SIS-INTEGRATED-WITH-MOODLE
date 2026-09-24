# Phase 6 Implementation Review — Moodle Integration and Recovery

Release v0.7.0 track. Roadmap
`11-…/08-phase-6-moodle-integration-and-recovery.md` slices 0–6, all
implemented in `development/` on local `main` (uncommitted; human review
pending). Simulator-only per the readiness gate and open production
decisions; `MOODLE-DEMO-v1`, `MOODLE-SIM-v1`, `TEACHING-DEMO-v1` are
fictional (SUP-009). Amended plan (user decisions 2026-09-24): Slice 0
adds TG/assignment sources; operations UI built fresh with SCR-*
identifiers; implementation held until constraints landed, then
executed.

## Slice map (requirement → code → test)

| Slice | Requirements | Code | Tests |
|---|---|---|---|
| 0 TG/assignment sources | REQ-LRN-001; BP5 §§5–10; BP3 §§2–4; TEST-AUTH-004 | `teaching` module; TG/Allocation/Assignment | `teaching-tg` 15/15 |
| 1 mappings | REQ-LRN-001; DS9 §§9–10; INT-MDL-001; MOD-SHL-01 | `integration` mappings, four-eyes, shells | `integration-mapping` 12/12 |
| 2 envelopes | REQ-LRN-002/NFR-004; ACT-REG-001; envelope set | envelope writes; attempt table | `integration-envelope` 7/7 |
| 3 simulator+worker | INT-MDL-001 sim-first; MOD-SHL-01/ENR-02; REQ-LRN-002/003 | simulator, worker, sync, states | `integration-sync` 13/13 |
| 4 queues/workspaces | REQ-OPS-003; BP12 navs; UI catalogue | SCR-OPS-MOODLE-001/INT-002/DELIVERY-003; maintenance | `integration-ops` 8/8 |
| 5 dead-letter/replay | INT-EVT-01; ACT-LRN-001; REQ-OPS-005; TEST-REC set | replay page, pause, incidents | `integration-replay` 12/12 |
| 6 reconciliation | MOD-REC-04; INT-REC-02; REG-001/OPS-011/MOD-004 | recon engine, cases, checkpoint | `integration-reconciliation` 13/13 |

Total: 80/80 API e2e sequential on one shared DB; Phase-4/5
regressions (submit, readiness, changes, plan, clearance, payments,
callbacks — 88 tests) green; browser portal/workspace/teaching/
mappings/ops/checkpoint (6 specs) green.

## Authority notes

- Exact records read per packet (evidence 002/004/009/010/012/020–030/
  036/037, journeys 00/02/03/12/13/14, UI 01–09, requirements,
  security, architecture, testing, governance). Later decisions and
  security rules over evidence; SUP-001–SUP-013 respected.
- Two workspaces kept separate with explicit switcher; replay approval
  is a UI-DECISION-001 page, never a modal; incidents close on
  reconciled evidence only.
- Grades excluded (Phase 7 owns staging/release); TG depth beyond
  sync sources deferred; real Moodle/SSO deferred (open decisions).
- New gaps: GAP-021 (TG timetable conflicts), GAP-020 noted for
  replay step-up if required. Prior GAPs unchanged.

## Demo checkpoint (roadmap)

Register → force outage → dead letter → approved replay → reconciled →
no duplicate enrolment: proven in browser (checkpoint spec) and API
(recon-checkpoint). Exit gate: SIS authority preserved, idempotent
retry, ops cannot edit registration, evidence closure.

## Remaining gates

`backup:test`, manual screen-reader/WSL replay, remote CI, Vercel
route check, human walkthrough (both developers must explain every
slice).
