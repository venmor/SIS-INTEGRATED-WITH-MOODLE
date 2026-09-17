# Learning Note — TASK-PH1-005 correctness & scope fixes (review findings)

- Lead developer: Charles
- Reviewer: Chitindu Milimbo
- Date/release: 2026-09-17 / v0.2.0 Phase 1 slice 5, fix batch
- Parent note: `NOTE-PH1-005.md` (unchanged record); this file tracks the
  review findings and their fixes, TDD per item, Phases 0–5.

## Review rounds 2–3 (correctness, scope, handbook-wide audit, 2026-09-17)

Two agents swept all non-roadmap docs and re-audited the code; every
High/Critical claim was re-verified in primary sources before fixing.
Downgraded with reasons: guard-audit incident gaps (unknowable pre-auth —
the store exists but guards run before the value is knowable),
outbox `deliveredAt` marking (packet-mandated), sweep starvation beyond
100 (progress guaranteed by warned-row exclusion), review-list breadth
(campaign model by design), commands in-flight leak (slice-4 code, noted),
migration INSERT idempotency (migrations run once), 409-on-replay (explicit
conflict beats silent success), per-route rate budgets (established
pattern; comment corrected to describe them honestly), duration-cap UX
opacity (maxMinutes rides in audit metadata for admins; response stays
oracle-free), proxy body limits (Express 100kb default + DTO MaxLengths
suffice). Deferred by handbook rule: MFA/step-up (2b, packet qualified),
notifications (GAP-008), hash-linking + retention entities (Phase 8),
counselling/finance deny-lists (no modules yet; TEST-AUTH-006/007/010 stay
deferred), dashboards (no monitoring stack), session-expiry overlay
(slice 2, noted Phase 0), review-list self-scoping, decision-envelope
uniformity.

- Critical: `/config` was session-open (security thresholds readable by any
  login; PATCH crashed 500 with no SessionGuard). Now grantor-gated
  throughout with audited 403s, actor-attributed updates, CSRF on batch;
  RED `config-authz.e2e-spec.ts`. No prior consumers existed (verified).
- Critical: daemon wedged-tick (a fully-failing batch re-fetched forever)
  now breaks with an error log; `processOneExpiry` returns the claim so
  race losses never inflate counts.
- Critical: `reviewBreakGlass` gates before loading (was 404-before-403
  oracle; RED outsider test).
- Grants replays answer 200 with the stored receipt (was always 201);
  `policy.e2e` replay expectation updated.
- Self-decide and self-reinstate refused 403 (GAP-012 spirit); confirm and
  clarify require live targets like revoke does (was confirm-on-dead
  ALLOW). RED tests each; forced DEAN-path coverage via sign-in budgets.
- Ack writes its own audit row; timeline reads carry activeRole/scope.
- Replay receipts shape-guarded (`idempotency.ts`, unit-tested RED→GREEN);
  malformed rows fall through to in-flight/stale handling.
- Approver authority re-checked inside the break-glass tx with claim
  release on loss (TOCTOU window closed).
- `intervalToCron` rejects fractions (unit-tested); warning threshold
  floor aligned to DB minValue 1; daemon-state create races fall back to
  updating the winner.
- Seed backfill excludes `BREAK_GLASS`; backup artifact is 0o600 and now
  includes FK-orphan reconciliation — which immediately caught 5 orphan
  schedules from older suites' sweeps (fixed at the source).
- `GET /reviews/:id` ends the take-100 detail over-fetch (reviewer-gated,
  neutral 404); proxy forwards empty filter strings instead of widening.
- ALLOW audit reasons aligned to the grants taxonomy (codes in `reason`,
  human text in `metadata`); queue page shows the confirmation count line.
- ADR-002 records the `@nestjs/schedule` 19.46 review; packet REQ-IAM-005
  qualified (MFA half = 2b) and phantom TEST-BRK-001 already remapped.
- Reliability notes added: per-file rate budgets force reviewer-role
  spread across seed users; ghost UUIDs must be v4-valid for ParseUUID
  paths; verify every edit with grep (edits went missing mid-session more
  than once — all caught by failing tests, none by messages).

Two agents swept all non-roadmap handbook docs and re-audited the code;
every High/Critical claim was re-verified in primary sources before fixing.
Downgraded with reasons: guard-audit incident gaps (unknowable pre-auth),
outbox `deliveredAt` marking (packet-mandated), sweep starvation (progress
guaranteed), review-list breadth (campaign model), commands in-flight leak
(slice-4 code), migration INSERT idempotency (runs once), 409-on-replay
(explicit conflict beats silent success). Deferred by handbook rule:
MFA/step-up (2b), notifications (GAP-008), hash-linking + retention entities
(Phase 8), counselling deny-list (no module yet), dashboards (no stack),
session-expiry overlay (slice 2, noted Phase 0).

- Critical: `/config` routes were session-open (secrets to any login) and
  PATCH crashed 500 (no SessionGuard). Now grantor-gated throughout with
  audited 403s, actor-attributed updates, CSRF on batch; RED
  `config-authz.e2e-spec.ts` (was 200-leak + 500, now 403/401/200). No
  existing consumers existed (verified).
- Critical: daemon wedged-tick (same failing 100 re-fetched forever) now
  breaks on zero-claim batches with an error log; `processOneExpiry`
  returns the claim result (was overcounting race losses).
- Critical: `reviewBreakGlass` gated before loading (was 404-before-403
  oracle; RED outsider-unknown-id test now 403).
- Grants replays now answer 200 with stored receipt (was always 201);
  `policy.e2e` replay expectation updated.
- Self-decide and self-reinstate refused (403, GAP-012 spirit); confirm and
  clarify now require live targets like revoke does (was confirm-on-dead
  ALLOW). RED tests for each; DEAN-path coverage as a bonus (sign-in
  budget discipline — see standing rules).
- Ack writes its own audit row; timeline reads carry activeRole/scope.
- Replay receipts shape-guarded (`idempotency.ts`, unit-tested RED→GREEN);
  malformed rows fall through to in-flight/stale handling.
- Approver authority re-checked inside the break-glass tx with claim
  release on loss (TOCTOU window closed).
- `intervalToCron` rejects fractions (unit-tested); warning threshold
  floor aligned to DB minValue 1; daemon-state create races fall back to
  updating the winner.
- Seed backfill excludes `BREAK_GLASS`; backup artifact is 0o600 and now
  includes FK-orphan reconciliation (all must be 0); proxy forwards empty
  filter strings instead of widening the query.
- `GET /reviews/:id` ends the take-100 detail over-fetch (reviewer-gated,
  neutral 404); detail page uses it.
- ALLOW audit reasons aligned to the grants taxonomy (codes in `reason`,
  human text in `metadata`); review queue page shows the confirmation
  count line from the packet dashboard story.
- ADR-002 records the `@nestjs/schedule` 19.46 review; packet REQ-IAM-005
  qualified (MFA half = 2b) and phantom TEST-BRK-001 already remapped.
- Standing rules added: per-file rate budgets force reviewer-role spread
  across seed users; ghost UUIDs must be v4-valid for ParseUUID paths;
  exact-count e2e assertions must survive parallel ticks.

## Fix log (per-phase RED→GREEN record)

- Phase 0: packet TEST-BRK-001 remap, GAP-014, session-warning ownership note.
- Phase 1: C1/C2/C3/H6/M4/M6/M7/M8 + ack hardening (see round summaries above).
- Phase 2: H2 schedules + seed backfill; H1/H3/H5/M5/M3 + timeline validation.
- Phase 3: retrospective endpoint + corrective migration + proxy/contracts.
- Phase 4: UI polish + backup artifact.
- Phase 5/rounds 2–3: this file's review-round sections.

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
- Ghost UUIDs in tests must be v4-valid on ParseUUID paths (else 400
  masks the intended 404).

## Deferred ownership (recorded, not built)

- Session idle/absolute timeout warnings (design-12:284, applicant-journey
  modal pattern) belong to slice 2 (sessions), not slice 5 (role expiry).
  Slice 5 delivers role-expiry countdowns only. Slice-2 follow-up: return
  `sessionExpiresAt` from `/auth/me` + idle modal reusing the banner island.
