# Phase 8 Slice 6 Backup/Restore Rehearsal Implementation Plan

> Executed inline 2026-10-04 (lead Chitundu Milimbo, reviewer
> Charles Hangoma) under `TASK-PH8-006`. This file records the
> approved plan all tasks completed against.

**Goal:** `backup:test` covers every current table with
domain orphan checks and byte-integrity proof; a full manual
drill reconciles; schedule/retention/encryption recorded as
deployment decisions, not built.

**Tech Stack:** Node script + `pg_dump`/`pg_restore`
(container tools on this box; local pg tools absent —
widened script rerun is a CI/Node-24 follow-up), PostgreSQL 18.

**Spec:** `development/docs/task-packets/TASK-PH8-006.md`.

## Global Constraints

- Local-dev fictional data only (SUP-009); secret-safe
  logging; owner-only artifact.
- No production backup infra, standby, or retention
  automation. No `OpsIncident` automation from drill results.
- Forward-safe fixes only; never delete official records.

---

### Task 0: Packet — [x] `TASK-PH8-006.md` drafted 2026-10-04 (human approval pending)

### Task 1: Widen coverage — [x]
TABLES 34 → all 103 models (script-asserted against
`schema.prisma`: no missing, no extra); domain orphan checks
per verified FK columns (nullable FKs guarded); case-row
union extended (recommendations, offer responses, onboarding).

### Task 2: Byte integrity — [x]
`sha256` hash-aggregate comparison for `ApplicationDocument`
source vs restored; mismatch fails the gate.

### Task 3: Prove it — [x]
`node --check` clean; canary unit green; three full manual
drills green (103/103 counts, zero orphans, hashes match) on
suite-seeded DBs; scratch dropped.

### Task 4: Record decisions — [x]
Schedule/retention/encryption + drill-log fields in
NOTE-PH8-006 as deployment decisions.

### Task 5: Closeout — [x]
`NOTE-PH8-006`, Phase 8 review row, `VERIFICATION.md`
slice-6 section, packet completion, DESIGN-INDEX line,
GAP-024 extension.

## Self-Review

**1. Spec coverage:** packet outcome (full coverage +
orphans + hash + drill + recorded decisions) → Tasks 1–5.
**2. Placeholder scan:** no TBD/TODO.
**3. Proof honesty:** empty finance/assessment/registration
tables and the script's own rerun named as follow-ups.
