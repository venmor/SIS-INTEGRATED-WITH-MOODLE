# Learning Note — TASK-PH8-001 (notification record and delivery status)

- Lead developer: unassigned (assign at kickoff)
- Reviewer: Charles Hangoma
- Date/release: 2026-10-03 / v0.9.0 track Phase 8 slice 1
- Branch: worktree (human review pending)

## What was built and why

The authoritative in-system notification centre (§16.11): versioned
templates (supersede, never edit), notification records with the
required fields (event, plain language, action, CAT deadline, link,
office, delivery state), and per-channel deliveries advanced by a
worker through SIM-NOTIFY-v1. Failures retry with backoff,
dead-letter at budget, and escalate mandatory notices to a staff
follow-up record — delivery failure never mutates workflow state
(§16.12). Staff signals are a scoped projection over the same
records, not a parallel table (GAP-016 design note). Assessment
release and amendment approval fan out per-student RESULT notices in
the same transaction as their audit events. No real provider, no
real contact data (GAP-008 stays open for production approval).

## Frontend

- `/notifications` centre (own records + state chips + read/mute
  actions + about card) with `<main id="notifications-content">`.
- `/admin/notifications` staff signals queue (role+scope matched
  server-side) with `<main>`.
- Same-origin `/api/notifications` proxy with narrow read/write
  allow-lists; package detail page links to the signals queue.
- Contracts gain notification views.

## Backend/domain

- New `notifications` module: service (template/record/delivery
  lifecycle, recipient + scope gates, idempotent commands, audit),
  controller (`templates`, `records`, `records/mine`,
  `records/signals`, `records/:id`, `read`, `suppress`,
  `deliveries/:id`, `worker/run`; CsrfGuard on writes), worker
  (Vercel skip, single-flight 30s ticks, SKIP LOCKED claims).
- Assessment module imports it; release + amendment approval fan out
  in-TX with skip-and-audit (never fails the domain write).
- Policy `NOTIFY-DEMO-v1` in `@sis/config` (states, retry budget,
  escalation rule, mandatory categories).

## Database/migration

- `20261003090000_ph8_notifications`: `NotificationTemplate`
  (unique per event+version), `NotificationRecord` (unique dedupeKey;
  indexes on account+status and role/scope/status),
  `NotificationDelivery` (indexes on state+nextRunAt and recordId).
  Prisma client regenerated.

## Security + authz

- Template writes SYSADMIN-governance only; record writes staff or
  governance; reads recipient- or scope-matched; students 403 on
  signals; denials 403 + audit; neutral 404s; version-checked
  transitions + idempotent keys; CSRF; expired grants fail safe.

## Tests and what they prove

- `notifications.e2e-spec.ts` (16 tests): template versioning +
  supersede, OPEN + QUEUED happy path, unknown-template/bad-
  recipient refusals, worker QUEUED→DELIVERED + READ, armed-failure
  retry→dead-letter + escalation, suppression rules (optional mutes,
  mandatory refuses with MANDATORY_NOTICE, dedupe replays),
  recipient isolation + staff-scope signals, role denials, neutrals,
  racing-tick convergence, idempotent replay + key conflict,
  expired-grant 403 + restore, template reads, student signal
  refusal, release/amendment fan-out in-TX. 16/16 on fresh
  `sis_ph8_n2_test`.
- Slice regressions held on separate fresh DBs: `grade-release`
  15/15, `grade-amendment` 12/12. Unit 73/73; typecheck exit 0;
  lint warnings-only (no new warnings); API dist via direct `tsc` +
  web production build exit 0 (new `/notifications`,
  `/admin/notifications` routes).
- Browser `notifications` (mandatory notice → centre → read receipt,
  no mute control) 1/1 on fresh migrated + seeded browser DB with
  rebuilt apps (390px, keyboard/focus, no overflow, empty
  localStorage).

## What failed or confused us

- DTO without a validator is stripped by the whitelist pipe: the
  first `correctedTotal`-class bug here was `forceFail` (spec) vs
  `simulateFailure` (DTO) — spec/DTO names must match exactly.
- Service returning a bare id string while tests need the view:
  every downstream `.id` became `undefined` (wrong URLs, unscoped
  queries). Return views from write endpoints.
- Backoff schedules `nextRunAt` in the future, so repeated worker
  ticks claim nothing: the test advances the clock by resetting
  `nextRunAt` between ticks (white-box, honest).
- Armed-failure marker overwritten on first failure let later ticks
  succeed: the SIM fail condition keys on the `SIMULATED_` prefix,
  which persists.
- Two e2e files on one shared DB collide on the assessment cohort
  (standing lesson): one fresh DB per suite.
- `npx` shims fail on Windows (`shell:false` cannot spawn `.ps1`);
  call `node ./node_modules/<pkg>/build/index.js` or
  `node <path>/vitest.mjs` directly. `nest` CLI crashes on Node 22
  (ora ESM cycle) — API dist via direct `tsc`.

## Questions to revise

- Production provider approval (GAP-008); escalation office mapping
  (currently EXAMINATIONS_OFFICER/PERIOD/GLOBAL for mandatory
  dead-letters); preference UI depth; slices 2–3 packets.
