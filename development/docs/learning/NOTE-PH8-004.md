# Learning Note — TASK-PH8-004 (rate-limit/abuse tuning)

- Lead developer: Chitundu Milimbo
- Reviewer: Charles Hangoma
- Date/release: 2026-10-04 / v0.9.0 track Phase 8 slice 4
- Branch: worktree (human review pending)

## What was built and why

Roadmap slice 4 reconciles every handbook rate-limit baseline
row (07/04 §Rate-limit baseline; compendium §19.41 lines
28153–28172) to code + test. New: per-user Lusaka-calendar-day
document-upload quota (`maxUploadsPerDay: 10`, packet-local demo
value — the handbook names the row, not the number), enforced
by an `UploadQuotaGuard` on `POST /applications/:id/documents`
with the catalogue 429 shape (`Retry-After` until next Lusaka
midnight + audited `ApplicationDocumentQuotaDenied` DENY +
neutral message). Also versioned: the finance callback budget
(`callbackPerMinute: 120`, numbers unchanged) moves out of the
controller into FIN config — the handbook requires limits as
configuration, never hard-coded. No migration: the quota counts
existing `ApplicationDocument` rows; config changes are code.

## Reconciliation outcome (row → code → test)

- Login 5/15min + progressive delay → `signInLimit` +
  `failureDelayMs`; `auth` 10/10 rerun on a fresh DB.
- Password reset 3/hour → `recoveryLimit`; same rerun.
- Public submission 5/IP/hour → **GAP-023**: the flow here is
  authenticated (no anonymous submission exists to key per IP);
  authenticated starts already have idempotency + uniqueness +
  `maxActivePerIntake` + ownership + general budget. No code
  guessed.
- Document upload → size/type/count pre-existing + new daily
  quota; `upload-quota` 4/4 (allow, deny with header + audit,
  yesterday-rows-excluded, per-account isolation).
- Search 60/min, ordinary API 120/min → `catalogueSearch`,
  `read` budgets; unit-pinned to SECURITY-v1.
- High-impact commands → finance initiation 3/min (unchanged);
  general 180/min unchanged (no measured evidence to move it).
- Provider callbacks → HMAC + replay + queue + now-versioned
  120/min budget; `finance-callbacks` rerun needs full seed
  (GAP-024).

## Tuning and hardening notes

- No legit-flow 429 on any runnable suite; the grade-board
  alternating-preparers workaround and full-seed reruns
  (`catalogue`, `finance-payments`, `finance-callbacks`) stay
  Node-24 follow-ups (GAP-024).
- Abuse sweep by inspection: auth/workspace/commands/grants/
  catalogue all return 429 + `Retry-After` + audited-DENY with
  neutral shapes. Two deliberate non-changes: finance
  initiation 429s carry no DENY audit (needs e2e proof —
  GAP-024), and trust-proxy stays `loopback` (deployment gap —
  GAP-024).
- No `OpsIncident` auto-creation from 429s (packet interim
  decision): an attacker could flood the incident queue.
- Load proof without waiting out production windows:
  `RateLimiter` window-expiry/recovery unit test (60ms window +
  sleep), quota burst-to-deny e2e (10 allowed, 11th 429),
  bucket-map bound test (10k cap vs distinct-key spam).
  Intermittent-network proof stays with the existing Phase 6
  outage suites (not re-proven here).

## Database/migration

- None. Browser: none (API-only slice per packet; rate
  behavior is not UI-visible beyond existing handling).

## Security + authz

- Quota is per-account across all owned applications, checked
  after ownership (`own()`); denials never disclose other
  accounts. Guard runs after SessionGuard + CsrfGuard, beside
  the per-minute guard. Check-then-act race bounded by the same
  documented single-instance approximation as `RateLimiter`.

## Tests and what they prove

- `upload-quota.e2e-spec.ts` (4 tests) RED first (11th upload
  201; replacement-chain 409s fixed in the spec, not the
  code), GREEN after the guard on fresh
  `sis_ph8_s4_quota_final_test`.
- `upload-quota.spec.ts` (3 tests): Lusaka day-boundary math
  incl. midnight edge.
- `rate-limit.spec.ts` (+2 tests): window recovery, FIN
  callback budget versioned.
- Regressions on separate fresh DBs: `auth` 10/10 (first run
  missed `DEMO_MODE=true` on the demo-recovery route — the
  documented 404 gate, green on rerun), unit 78/78 (73 + 5
  new), typecheck exit 0, lint clean on touched files, API dist
  via direct `tsc`. `npm run scan` cannot run on this box
  (ripgrep unavailable); no web changes so no web rebuild.

## What failed or confused us

- New-spec path bug (`../../packages/...` from `test/` —
  one level too few; helpers live one deeper) and an async
  wrapper swallowing the supertest chain: both spec-only,
  fixed before any implementation.
- Dirty-DB rerun tripped a DB-wide count assertion
  (`auto-open-notify` style lesson again): one fresh DB per
  suite run, no exceptions.
- `vitest.config.ts` vs `vitest.config.e2e.ts` cwd mix-up
  produced a MODULE_NOT_FOUND scare: run unit config from
  `apps/api`, e2e config from `apps/api` too (not repo root).

## Questions to revise

- GAP-023 (anonymous submission row) and GAP-024 (proxy
  trust, initiation audit, full-seed reruns); production
  capacity numbers; UAT participants.
