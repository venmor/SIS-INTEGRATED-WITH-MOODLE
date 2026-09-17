# Learning Note — TASK-PH1-005 correctness & scope fixes (review findings)

- Lead developer: Charles
- Reviewer: Chitindu Milimbo
- Date/release: 2026-09-17 / v0.2.0 Phase 1 slice 5, fix batch
- Parent note: `NOTE-PH1-005.md` (unchanged record); this file tracks the
  review findings and their fixes, TDD per item, Phases 0–5.

## Deferred ownership (recorded, not built)

- Session idle/absolute timeout warnings (design-12:284, applicant-journey
  modal pattern) belong to slice 2 (sessions), not slice 5 (role expiry).
  Slice 5 delivers role-expiry countdowns only. Slice-2 follow-up: return
  `sessionExpiresAt` from `/auth/me` + idle modal reusing the banner island.

## Fix log

(Filled per phase as built; each entry: finding → RED test → GREEN change →
proof.)

### Phase 0 — governance

- Packet cited TEST-BRK-001 (4 refs), which has zero handbook hits
  (full-handbook grep verified): remapped to TEST-AUTH-011 + TEST-REC-006/008
  with an explicit correction note; also removed the packet's self-contradiction
  listing TEST-AUTH-010 as both covered and deferred.
- GAP-014 filed for reduce / reassign / change-end-date inputs (target scope,
  extension caps, reviewer eligibility all unspecified).
- Session idle/absolute warnings assigned to slice 2 (ownership note above).

### Phase 1 — correctness criticals

- C1 reinstate-expired: `reinstate-expired` 400 + claim release; RED
  `expired-then-revoked stays dead` (was 201, now 400, single row kept).
- C2 reinstate idempotency: server key `reinstate:{priorId}` claim/replay
  (201/200 split like break-glass); terminal failures release the claim
  (a parked status-0 row poisoned reruns for 15 min — found live, fixed).
  RED replay test (was duplicate 201s, now same id + 200).
- C3 concurrent decide: conditional `updateMany {id, pending}` in-tx,
  losers 409; RED race test (was duplicate audits, now 200+409, single trail).
- H6 daemon: guarded `updateMany {id, revokedAt:null}` claims, ordered
  batches looped to exhaustion; RED 105-row batch test (was starvation past
  100, now exact 105/105 with zero misses/duplicates under parallel ticks).
- M4 break-glass receipt moved inside the grant tx (no crash window).
- M6 review-target-dead: revoke on dead assignment 400s without touching
  `revokeReason` (was overwritten — history-adjacent tampering).
- M7 `intervalToCron` throws outside 1–60 (was silent fallback);
  `updateDaemonState` runs on idle ticks too (was going stale).
- M8 partial unique `ExpiryWarning_open_key` (hand-maintained, credential
  precedent); racy creates caught as already-warned. Corrective migration
  `20260917151125_ph1_slice5_review_fixes` also carries retrospective
  columns + `security.roleRiskLevels` seed.
- Ack hardening: `ParseUUIDPipe` (junk → 400) + tolerant ack (repeat → 200).
- Incidental repairs the RED tests exposed: stray `}` syntax error and 5
  type errors in uncommitted config files; stale `@sis/config` dist;
  unseeded dev DB (seed re-run: 4/4/6/4).

### Phase 2 — scope completion

- H2 schedule creation: pure `planReviewSchedule` + `createReviewSchedule`
  (`review-schedule.ts`, unit-tested incl. unknown-role default), wired into
  grants tx (reviewer = grantor) and reinstate tx (reviewer = actor),
  failures log-and-continue so scheduling never breaks authority; seed
  backfill verified (5 pending: 2 high / 1 medium / 2 low). RED grant test
  (was no schedule, now risk/cadence/due asserted).
- H1 decision semantics: confirm completes, clarify audits and stays pending
  (re-decidable, proven), reduce/reassign 400 `decision-deferred` + GAP-014;
  UI offers three options only. RED clarify/deferred tests.
- H3 incident tagging: middleware-established ALS store + post-guard
  interceptor fill + `auditAuth` merge (explicit metadata never clobbered);
  entry-switch tagged service-side (pre-entry sessions have no incident).
  Debugging lesson: the first failing assertion was a TEST bug (emergency
  SYSADMIN legitimately passes reviewer gates — replaced with a ghost-grant
  DENY probe); console-log forensics misled (vitest filters worker output),
  DB-state reasoning + targeted repros did not. RED ghost-grant probe
  (was untagged, now `incidentRef`-tagged).
- H5 rate limits: read budget on timeline/reviews/warnings/ack, grant
  budget on break-glass/reinstate/decide/review (shared `enforceRateLimit`
  helper per controller, same 429 + Retry-After + audited-DENY shape).
  RED hammer-until-held tests (robust to shared-budget consumption across a
  file's tests — exact-count probing flaked, replaced).
- M5 timeline reads audited (`purpose: audit-access`, ALLOW row asserted).
- M3 reason floors: trim + `MinLength(8)` packet-local on review/reinstate/
  break-glass free text (codes untouched); existing short-string probes
  updated. Timeline inverted-range → 400.
- Rate-budget lesson: per-file app instances isolate limiters, but tests in
  one file share them — the mweene 5-sign-in budget forced DEAN-path
  coverage (mutinta reviewer tests), a genuine coverage gain.

### Phase 3 — retrospective

- `POST /auth/break-glass/:id/review` (`justified|excessive|breach` + note):
  grantor-gated, requestor never self-reviews (403), conditional claim
  (repeat → 409), `CMD-IAM-BreakGlass`/`post-use-reviewed` audit +
  delivered `BreakGlassReviewed` outbox. Proxy + contracts extended.
  RED retro test (was 404 no-route, now fields/audit/outbox asserted).

### Phase 4 — UI polish + backup artifact

- Queue take+1 "more available" indicator (no API change); decide 409 gets
  a distinct conflict notice (not a field error); ack button moved out of
  the live region with an assignment-labeled name; timeline pager page
  numbers in `aria-label`s; reason help cites the 8-char floor.
- `backup:test` also writes `sis-backup-reconciliation-<ts>.json` to the
  temp dir (path printed) as CI evidence (scratch dir still removed).

### Reliability notes (standing rules from this batch)

- Verify every edit with grep: two edits silently went missing mid-session
  (ack hardening, review route) and were caught only by failing tests.
  Never trust a success message on load-bearing code.
- `nest build` passed with a duplicated-const file that vitest rejected:
  build + tests are independent gates, always run both.
- E2E exact-count assertions must assume parallel-suite interference
  (guarded claims keep behavior correct; assert exactly-once, not
  per-tick deltas).
- Test sweeps must cover derived rows (schedules, idempotency keys) or
  reruns poison themselves.
