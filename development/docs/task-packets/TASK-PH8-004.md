# TASK-PH8-004: Rate-limit/abuse tuning

## Authority and ownership

User authorization: Phase 8 slice 4 implementation request, 2026-10-04.
Release v0.9.0 track. Lead Chitundu Milimbo; reviewer Charles Hangoma.
Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 4 (`11-…/10-phase-8-
hardening-operations-and-evidence.md`); rate-limit baseline
(`07-security-privacy-resilience/04-rate-limiting-redundancy-
abuse-and-recovery.md` §Rate-limit baseline: versioned
configuration, measured-traffic review, enumeration-neutral
responses); exact evidence: compendium §19.41 (lines
28153–28172, active requirements — limits are configuration not
hard-code; per-row initial controls; rate limiting complements
but never replaces authorization; duplicate submission prevented
by idempotency key + uniqueness constraint); perms §§15.6–15.7.
SUP-001–SUP-013 apply. Depends on TASK-PH8-001..003 (their
behavior is unchanged; slices 1–3 suites are regressions).

## User outcome and boundaries

Every baseline row reconciled to code + test: login,
password-reset, submission, upload, search, ordinary API,
high-impact commands, provider callbacks. New: per-user daily
document-upload quota (handbook-authorized) and a per-IP
application-submission budget (handbook row is anonymous
per-IP; our start flow is authenticated — reconcile explicitly,
gap what does not map). Tuned budgets remove legit-flow 429s
with measured evidence. Abuse stays neutral (no account
enumeration via 429s; `Retry-After` everywhere; audited-DENY on
sensitive routes). Load/burst/recovery proof on runnable
suites. No Redis, no WAF, no production numbers, no
`OpsIncident` auto-creation from 429s (see interim decisions).

## Interim demo decisions (fail-closed until approved)

- Values are versioned demo configuration only (SUP-009);
  existing SECURITY-v1/APPLICATION_DEMO-v1/FIN budgets change
  only with measured evidence from a green suite run.
- No automatic `OpsIncident` from rate-limit hits: an attacker
  could flood the incident queue (self-DoS amplification).
  Rate events stay in audit rows; operators open incidents
  manually. Recorded here as a deliberate exclusion, not an
  oversight.
- In-memory sliding-window limiter retained (locked stack
  forbids Redis; single-instance demo limit documented in
  `rate-limit.ts`).
- Trust-proxy default (`loopback`) unchanged: widening proxy
  trust has security implications unprovable in tests; recorded
  as a deployment gap, not code.
- API-only proof: rate behavior is not UI-visible beyond the
  existing too-many-requests handling; no browser journey, no
  UI change.

## Policy and explicit demonstration scope

One new versioned demo budget: upload per-user per-day
(packet-local, NOT a handbook value — the handbook names the
row, not the number). The submission per-IP row was NOT
implemented as a budget: the flow here is authenticated, so it
became GAP-023 instead of guessed policy. Demo data only
(SUP-009).

## State authorization failure and recovery

Rate limits complement authorization and database constraints;
they never replace them. 429 + `Retry-After` on breach;
audited-DENY on sensitive-route breaches (auth/grants
precedent); neutral shapes (no validity/lock-state disclosure);
idempotency keys + uniqueness constraints keep duplicate
submits from double-applying; CSRF unchanged.

## Proof and documentation

API e2e on fresh isolated DBs: new daily-quota allow/deny/
day-scoped/per-account tests; submission row reconciled as
GAP-023 (not a budget); tuning regression (no legit-flow 429
on runnable suites); quota burst-to-deny e2e; window-recovery
at unit level (production windows cannot be waited out in e2e);
enumeration-neutrality assertions on runnable suites
(catalogue/finance burst e2e stays a Node-24 follow-up —
GAP-024). Unit 78/78. Typecheck + lint (no new warnings); no
web changes (`apps/web` does not import `@sis/config`), so no
web rebuild. Record in PHASE-8 review + NOTE-PH8-004.

## Out of scope and open gates

Redis/distributed limiting; WAF; production capacity numbers;
trust-proxy widening; 429→incident auto-creation; finance recon
auto-sweep; paging/alerting; RPO/RTO. Gates: GAP-009, open
decisions (monitoring/escalation ownership, UAT participants).

## Completion

Implemented in the worktree 2026-10-04 (uncommitted, human
review pending): `UploadQuotaGuard` + Lusaka-day helpers +
`maxUploadsPerDay: 10` demo value, versioned FIN callback
budget, `upload-quota` 4/4 on fresh `sis_ph8_s4_quota_final_test`
(RED first), unit 78/78, `auth` 10/10 regression, GAP-023/024
filed; see VERIFICATION Phase 8 slice 4 and NOTE-PH8-004.
Human review pending.
