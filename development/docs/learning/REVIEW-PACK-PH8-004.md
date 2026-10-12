# Review Pack — TASK-PH8-004 Rate-limit/abuse tuning (for Charles)

Commit `9eb41e5` (17 files, +848/−14). Lead Chitundu Milimbo.
Packet: `docs/task-packets/TASK-PH8-004.md` (draft — your
approval keystroke pending). Note: `NOTE-PH8-004.md`.

## What changed and why (30 seconds)

Every handbook rate row (compendium §19.41) reconciled to
code + test. New: per-user Lusaka-day upload quota
(`UploadQuotaGuard`, 429 + `Retry-After` + audited DENY);
FIN callback budget moved from hard-coded `120, 1` into
versioned config (numbers unchanged — handbook demands limits
as configuration). No migration, no UI change.

## Proof to spot-check

- `upload-quota` 4/4 RED-first on a fresh DB (allow / deny +
  header + audit / yesterday-excluded / per-account).
- `auth` 10/10 regression; unit 78/78; typecheck + lint clean.
- Key files: `admissions/upload-quota.ts` (22 lines),
  `UploadQuotaGuard` in `applications.controller.ts`,
  `upload-quota.e2e-spec.ts` (271 lines).

## Open questions for you

1. Quota value `10/day` (packet-local demo) — acceptable?
2. GAP-023 (anonymous submission row unmappable — reconcile,
   don't code) — agree?
3. GAP-024 follow-ups (proxy trust, initiation DENY audit,
   full-seed reruns) — correctly scoped out?
4. Approve `TASK-PH8-004`? (edit its Completion line)

## Approval (human keystroke only)

- [ ] Charles Hangoma approves TASK-PH8-004 — date: ______
