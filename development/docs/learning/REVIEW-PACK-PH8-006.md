# Review Pack — TASK-PH8-006 Backup/restore rehearsal (for Charles)

Commit `1151886` (8 files, +822/−5, mostly the script).
Lead Chitundu Milimbo.
Packet: `docs/task-packets/TASK-PH8-006.md` (draft — your
approval keystroke pending). Note: `NOTE-PH8-006.md`.

## What changed and why (30 seconds)

- `backup:test` TABLES 34 → all 103 models (script-asserted
  both ways against the schema — hand count said 105, script
  proved 103).
- ~70 domain orphan checks with schema-verified FK columns;
  one apparent hit investigated and proven a false positive
  by design (`SYSTEM` provenance marker) — check removed,
  not data "fixed".
- Document `sha256` hash check (counts alone bless silent
  corruption) + fail-closed schema-drift guard (future tables
  outside TABLES fail the gate).
- No migration, no API/web change, no production infra.

## Proof to spot-check

- Canary unit green; `node --check` clean; all 84 orphan SQL
  executed read-only (zero rows) on all three drill DBs;
  three full drills green (103/103 counts, hashes match).
- Key file: `scripts/backup-test.mjs` (+566).
- Honest limit: finance/assessment rows empty on every DB
  this box builds — full-data drill + script's own run are
  GAP-024 CI follow-ups, not claimed.

## Open questions for you

1. False-positive handling (remove check vs codify SYSTEM
   exception) — agree?
2. Drift guard strictness (any unknown table fails) — agree?
3. Approve `TASK-PH8-006`? (edit its Completion line)

## Approval (human keystroke only)

- [ ] Charles Hangoma approves TASK-PH8-006 — date: ______
