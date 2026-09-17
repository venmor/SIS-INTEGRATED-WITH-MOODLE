# Learning Note — TASK-PH1-005

- Lead developer: Charles
- Reviewer: Chitindu Milimbo
- Date/release: 2026-09-17 / v0.2.0 Phase 1 slice 5 (access audit, expiry daemon, reviews, reinstatement, break-glass; e2e 50/50 green after fix batch — see NOTE-PH1-005-FIXES.md)

## What we built and why

Slice 5 closes Phase 1: every role assignment is now time-bounded,
auditable and reversible without data loss (roadmap slice 5,
`03-phase-1-identity-and-scoped-access.md:24-30`). Expiry daemon
auto-revokes lapsed assignments with warnings; quarterly-by-risk reviews
decide (confirm/revoke/clarify effective; reduce/reassign/change-end-date
deferred per GAP-014 — see fix note); erroneous revocations are
reinstated with reason + evidence (history preserved); break-glass grants
minimal time-bound emergency access with enhanced audit and full revocation
on expiry; the audit timeline is paginated, filtered and shape-stable; a
`backup:test` gate proves restore usability.

## Why it belongs in this module

`identity-access` owns expiry, review, reinstatement, break-glass and the
audit read-model; new tables `ReviewSchedule`/`BreakGlassRequest`/
`ExpiryWarning`/`ExpiryDaemonState` + rebuilt additive-only migration
`20260917140705_ph1_slice_5` live inside it. No cross-module writes. The
scheduler is in-process (`ScheduleModule`, no Redis/Kafka per AGENTS.md).

## Frontend explanation

Minimal slice scope (packet out-of-scope honoured): `admin/reviews`
(server-gated queue + per-review decide form with consequence preview for
revoke), `admin/audit` (filterable, paginated timeline with Lusaka time and
reference disclosure), home-page expiry countdown banner (ARIA-live polite,
acknowledge keeps session) and break-glass active banner (assertive, incident

- expiry + enhanced-audit notice). Proxy allowlist extended deny-by-default
  (new GET/POST paths + dynamic `reviews/:id/decide` and warning-ack paths +
  per-family query keys). Canonical `review.ts`/`audit.ts` contracts added and
  barrel-exported (also fixed missing `Me`/`Grant` barrel exports);
  `ActiveWorkspace.endsAt` added for countdowns. No invented copy: new
  `WORKSPACE-006/007` templates live in the controlled catalog.

## Backend explanation

- Daemon (`ExpiryDaemonService`, NestJS scheduler): per-tick config read +
  `resyncSchedule()` (no frozen interval), transactional revoke (assignment
  - `CMD-IAM-ExpiryDaemon` audit with purpose/prior/new + delivered outbox +
    one-open-warning), pre-expiry sweep inside
    `security.expiryWarningThresholdMinutes`, `ExpiryDaemonState`
    observability. Regular expiry degrades sessions to null-workspace (never
    logout); `BREAK_GLASS` expiry additionally kills bound sessions, marks the
    request expired and emits `BreakGlassRevoked` (DoD session-401).
- Review (`ReviewService`): reviewer gate on list + decide (audited 403),
  `DecideReviewDto` enum + `ParseUUIDPipe`, `CMD-IAM-ReviewAssignment` with
  purpose/prior/new, delivered outbox, 409 replay, revoke drops to
  null-workspace (no session kill).
- Reinstate (`ReinstateService`): grantor gate, `ReinstateDto`
  reason+evidence, new live row (old stays revoked),
  `CMD-IAM-ReinstateAssignment` prior/new, delivered outbox, session
  restored via switch.
- Break-glass (`BreakGlassService`): `BreakGlassDto`, self/duration/approver
  gates (uniform 403, no oracle), server-derived idempotency
  (`breakglass:{requestor}:{incident}`, claim/replay like grants),
  `CMD-IAM-BreakGlass` enhanced audit, delivered outbox, 201/200
  create/replay split.
- Timeline (`AuditTimelineService`): grantor gate (audited 403),
  `AuditTimelineQueryDto` (whitelist ⇒ unknown keys 400), §15.19 field list
  - purpose, `{events,total}`.
- Warnings (`WorkspaceController`): strictly caller-scoped list (with
  assignment facts for countdowns) and ack (foreign ⇒ 404).
- `auditAuth` gained optional `metadata`; `correlationId` is now
  schema-`@unique` (matches hardening — see below).

## Database explanation

Rebuilt slice-5 migration from the weakened draft: 4 tables + 3 composite
indexes, NO `AuditEvent` alteration (the draft's `DROP NOT NULL/UNIQUE` on
`correlationId` is reverted and now impossible — schema enforces `@unique`).
Also repaired the committed `ph1_config_system` migration's duplicated
`CREATE TABLE ConfigurationVersion` in the working tree (fresh
`demo:reset` would have failed on it). Verified live: 8 migrations, status
clean, all indexes present including `AuditEvent_correlationId_key`.
Seed re-run (DB had zero accounts): 4/4/6/4.

## Security and authorization explanation

Deny-by-default everywhere (§15.21 untouched, policy-first ordering kept —
the §12.12 sentence still answers from the liveness arm). No existence
oracles (uniform 403/404 with references; unknown approvers ≡ unauthorized).
`forbidNonWhitelisted` DTOs on all new routes; CSRF on mutations; sessions
never trust client role state; break-glass is the only session-killing
expiry (documented exception). Audit is append-only with purpose/prior/new/
correlation references; one correlationId per row (UNIQUE).

## Tests and what they prove

TDD throughout (RED watched before every GREEN; brownfield gaps dejar fixed
only after a failing test named them). Unit 9 files/39 pass. **E2E: 11
files, 50/50 green** (23 pre-existing + 27 slice-5: daemon 5, scheduler 2,
review 6, reinstate 5, break-glass 5, timeline 3, warning 2 — see
NOTE-PH1-005-FIXES.md for the review-findings batch that followed this
note). New suites
prove: revoke→null-workspace→§12.12→audit-shape→delivered-outbox→warning→
state→idempotent-replay; scheduler registration + config reschedule;
reviewer gating; reinstatement with history preserved + session restore;
break-glass idempotency + auto-revoke→401; timeline gating/shape/filtering;
warning scoping + ack-without-interruption. `backup:test` green (15/15
tables reconcile after scratch restore). Builds (API+web) + lint + tsc +
`diff --check` clean; new code prettier-clean (3 pre-existing spec files
left untouched). 19.49: allow/deny, validation, idempotency,
migration-deploy, critical API E2E, secret scan (fictional seed creds only),
backup/restore green; vuln scan → mysql2 transitive only (standing accepted
risk) + Prisma chain, nothing from new deps. **Approved deviation, recorded:
`@nestjs/schedule@12.0.2` + `cron@4.4.0` added** (packet said `node-cron`,
DoD said no new deps) — Nest-idiomatic DI/testing/lifecycle + per-tick
config refresh beats both `setInterval` (frozen interval, drift, weak
shutdown) and raw `node-cron` (manual wiring); still in-process, no new
services. `vitest.config.e2e.ts` timeout 5s→30s (argon2id + Nest boot × 11
parallel files starved the default; 30s fails real hangs only).

## Demo replay (reviewer copy-paste)

1. `npx prisma migrate status` → 9 migrations, up to date; seed accounts
   `mweene.t` (SYSADMIN reviewer), `mutinta.l` (LEC+DEAN).
2. Unit: `npm run test --workspace=apps/api` → 39/39. E2E:
   `node scripts/with-env.mjs npm run test:e2e --workspace=apps/api` →
   50/50. Backup: `npm run backup:test` → 15/15 reconcile.
3. UI: Mweene → Access reviews → decide revoke with reason → audit trail
   shows `CMD-IAM-ReviewAssignment`; grant break-glass (incident
   INC-2026-041, 25 min) → home shows emergency banner → expiry ends it.

## What failed or confused us

1. Slice-5 migration was applied AND weakened audit (dropped NOT NULL/UNIQUE)
   — rebuilt after proving empty tables, restored hardening, deleted the
   stray `sis_backup_before_reset.sql`.
2. `config_system` migration hides a duplicated `CREATE TABLE` (applied once
   so invisible until fresh deploy) — deduped in working tree.
3. Draft claimed config keys missing — evidence (DB query) proved all 9
   present; corrected the plan instead of hallucinating.
4. Daemon killed whole sessions on expiry — test proved it contradicts the
   specified null-workspace design; removed (break-glass keeps the kill).
5. Two audit rows sharing one correlationId rolled back the transaction
   (UNIQUE) — one correlationId per row, now a standing rule.
6. `dist/` staleness (`@sis/config` lacked new exports) and a stray `}` +
   bad types in uncommitted config files broke boot/build — repaired
   minimally; `setInterval` replaced by scheduler per your best-fit call.
7. Full-suite timeouts under 12 parallel workers — environment, not code
   (solo greens); fixed with documented 30s e2e timeout.
8. Prettier was already dirty on 3 untouched specs — formatted only owned
   files; no scope creep.

## Seven-layer talk track (2 minutes)

Problem: time-unbounded access with no review, recovery or emergency path.
Policy: §15.20/§15.21 + §12.11–12.13 as code. Journey: lapse → warned →
revoked → §12.12 sentence, draft safe; reviewed quarterly; wrongly revoked
→ reinstated with reason; emergency → bannered, audited, auto-ended.
Architecture: identity-access owns daemon/scheduler/reviews/audit. Data: 4
tables + delivered outbox + immutable audit. Code: 5 services, 6 DTOs,
scheduler resync, scoped UI. Evidence: 39 unit + 50 e2e + backup green.

## Terms/concepts learned

- Cron expressions from config minutes (`*/N`, hourly clamp); SchedulerRegistry
  add/delete resync; `enableShutdownHooks` for cron; claim/replay idempotency
  receipts; null-workspace degradation vs session kill; pre-expiry horizon
  sweeps; scratch-DB restore reconciliation; barrel exports; proxy query-key
  allowlists; ARIA-live banner levels (polite countdown, assertive emergency).

## Questions to revise before presentation

1. Why does regular expiry keep the session but break-glass kills it? →
   Degradation preserves safe work (§12.13); emergency closure must end the
   privileged session completely (DoD 401).
2. Why `@nestjs/schedule` instead of the packet's `node-cron`? → Same
   in-process guarantees, plus DI/testability/lifecycle/config refresh;
   recorded deviation, no new services.
3. Why can `correlationId` never be shared? → UNIQUE support reference;
   one row, one reference, or the transaction rolls back.
4. What still needs institutional decisions? → GAP-010 (review cadences +
   schedule-creation job), GAP-012 (SoD pair table), notification delivery
   (v0.9), break-glass retrospective UI, Playwright UI tests (no web runner
   yet — tsc/lint/build + API proofs cover Slice 5).
