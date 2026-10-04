# TASK-PH8-006: Backup/restore rehearsal

## Authority and ownership

User authorization: Phase 8 slice 6 implementation request, 2026-10-04.
Release v0.9.0 track. Lead Chitundu Milimbo; reviewer Charles Hangoma.
Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 6 (`11-…/10-phase-8-
hardening-operations-and-evidence.md`); backup and recovery
(`07-security-privacy-resilience/04-rate-limiting-redundancy-
abuse-and-recovery.md` §Backup and recovery: approved
schedule, encrypt/restrict, restore tested per phase and
before presentation, recorded source/target/executor/duration/
reconciliation, forward-safe fixes); TEST-REC-008 (restoration
produces reconciled records/files/audit evidence). Exact
evidence: Phase 1 slice 5 DoD (§12.14: restore testing proves
backup usability). SUP-001–SUP-013 apply. Depends on
TASK-PH8-001..005 (their tables join the covered set; prior
suites are regressions).

## User outcome and boundaries

`backup:test` covers every current table (34 → all models),
orphan checks span all domains, and document bytes carry a
hash-integrity check (counts alone would bless silent
corruption). A full manual drill on a data-bearing database
reconciles; the widened script itself reruns in CI / on a box
with PostgreSQL tools. Schedule/retention/encryption and the
drill log are recorded as deployment decisions, not built.

## Interim demo decisions (fail-closed until approved)

- Local-dev, fictional data only (SUP-009); secret-safe
  logging kept (no connection values, owner-only artifact).
- No production backup infrastructure, standby, replication,
  or retention automation — recorded, not implemented.
- No `OpsIncident` automation from drill results; failures
  fail the gate and are fixed, not auto-filed.

## Policy and explicit demonstration scope

No new policy values. No schema change (the script reads;
migrations untouched). Demo data only (SUP-009).

## State authorization failure and recovery

No authorization change. A mismatch fails the gate
(non-zero exit); scratch databases are dropped best-effort; the drill never deletes
official records merely to pass.

## Proof and documentation

`test:scripts` green (incl. the password-canary unit);
manual drill via container tools on a data-bearing DB — all
tables match, zero orphans, document hashes match; widened
script rerun recorded as CI/Node-24 follow-up. Record in
PHASE-8 review + NOTE-PH8-006.

## Out of scope and open gates

Standby/failover, replication, retention automation, real
schedules. Gates: GAP-009, GAP-024, open decisions
(monitoring/escalation ownership, UAT participants).

## Completion

Implemented in the worktree 2026-10-04 (uncommitted, human
review pending): `TABLES` widened 34 → 103 models (script
asserted against schema), domain orphan checks, document
`sha256` hash check, canary unit green, three full manual
drills green (103/103 counts, zero orphans, hashes match);
see VERIFICATION Phase 8 slice 6 and NOTE-PH8-006. Human
review pending.
