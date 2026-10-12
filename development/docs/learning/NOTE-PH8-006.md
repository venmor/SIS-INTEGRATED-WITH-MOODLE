# Learning Note — TASK-PH8-006 (backup/restore rehearsal)

- Lead developer: Chitundu Milimbo
- Reviewer: Charles Hangoma
- Date/release: 2026-10-04 / v0.9.0 track Phase 8 slice 6
- Branch: worktree (human review pending)

## What was built and why

Roadmap slice 6 against the backup-and-recovery requirements
and TEST-REC-008: `backup:test` now covers all 103 models
(was 34), orphan checks span every domain, and document bytes
carry a hash-integrity check (counts alone would bless silent
corruption). Verified by script: a Node script asserted the
TABLES list against `schema.prisma` — 103/103, no missing, no
extras.

## Drill evidence (manual, container tools)

The widened script needs local `pg_dump`/`psql` (absent on
this box), so the drill drove the container tools with the
same checks on three data-bearing DBs (seeded by green suite
runs: `upload-quota` 4/4 + `auth` 10/10 on A;
`ops-incidents` 15/15 on B; `notifications` 16/16 on C):

| DB | Tables matched | Non-empty | Orphans | Doc hash |
|---|---|---|---|---|
| `sis_ph8_s6_a_test` | 103/103 | 13 | 0 | match |
| `sis_ph8_s6_b_test` | 103/103 | 13 | 0 | match |
| `sis_ph8_s6_c_test` | 103/103 | 29 | 0 | match |

Scratch databases dropped afterwards. Honest limit:
finance/assessment/registration/teaching rows are empty in
every database this box can build (full demo seed needs Node
24) — those tables are proven present-and-empty, not
data-bearing. A full-data drill plus the widened script's own
run are CI/Node-24 follow-ups (GAP-024 extended below).

## Deployment decisions (recorded, not built)

- Schedule/retention/encryption are deployment decisions for
  human approval; nothing is automated here.
- Drill log fields per handbook: source, restoration target,
  executor, duration, reconciliation result — the script
  prints the reconciliation JSON and writes the owner-only
  artifact; executor/duration are recorded by whoever runs it.
- Forward-safe fixes only; official records are never deleted
  to make a deployment pass.

## Security + authz

- No change. Secret-safe logging kept (the password-canary
  unit passes); the reconciliation artifact stays owner-only
  (credential/token hashes).

## Tests and what they prove

- `test:scripts` password-canary unit green; `node --check`
  clean on the script.
- No API/web code changed: typecheck/build state unchanged
  from slice 5 (recorded, not rerun).

## What failed or confused us

- Hand count said 105 models; the script said 103/103 — trust
  the script (both directions checked: no missing, no extra).
- Review pass caught what the drills could not: the widened
  script itself cannot run on this box, so every new orphan SQL
  string was extracted and executed read-only instead — 84/84
  clean with zero rows on all three drill DBs, except one
  true-looking hit: a `MoodleMapping` with creator `SYSTEM`.
  Investigation proved it a false positive by design
  (`integration.service.ts` writes the `SYSTEM` provenance
  marker in production code; the column has no Account FK).
  The check was removed rather than the data "fixed", and the
  same marker pattern was audited for sibling columns (only
  relation-backed account columns are checked).
- Same review added a fail-closed schema-drift guard: any
  future table outside TABLES fails the gate (the exact
  staleness this slice fixed). Drift query proven: returns
  exactly the 103 covered tables today.
- PowerShell `Remove-Item` takes one path per call here;
  `docker exec` + quoted SQL needs heredoc-via-stdin, not
  inline quoting (standing Windows lessons).

## Questions to revise

- GAP-024 extended: full-data drill + widened script run on a
  tooled box; GAP-009 stays open; UAT participants.
