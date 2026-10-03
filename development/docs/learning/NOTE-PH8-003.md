# Learning Note — TASK-PH8-003 (operations health and incident queue)

- Lead developer: Chitundu Milimbo
- Reviewer: Charles Hangoma
- Date/release: 2026-10-03 / v0.9.0 track Phase 8 slice 3
- Branch: worktree (human review pending)

## What was built and why

One generic ops console over existing domain operations
(incident lifecycle §Incident lifecycle; worker-recovery clause;
§§16.5/16.10/16.14; §§15.6–15.7,15.19): `OpsIncident` rows
(OPEN→ACKNOWLEDGED→RESOLVED→CLOSED) auto-opened convergently from
notification and integration delivery dead-letters plus manual
operator opens, with owner, target response, root cause, recovery
evidence, preventive action and linked refs. The queue aggregates
open incidents, pending dead-letters (both domains), pending
replays, OPEN escalation records and OPEN recon cases as linked
rows into their owning queues. Mandatory-notification
dead-letters stay on the examinations lane (slice-1 escalation
records); the console links them read-only instead of
duplicating. No paging/alerting, no RPO/RTO, no production
incident ownership (GAP-009 stays open). Interim demo authority
(INTEGRATION_SUPPORT + live `replay-event` for all ops writes,
MOODLE_ADMIN reads via the `opsRole()` precedent) is recorded in
the packet as GAP-009 interim, not an institutional grant.
Transitions are internal + audited only (no outbox), matching the
`IntegrationIncident` precedent.

## Frontend

- `/admin/ops` console (open/acknowledged counts, linked-row
  counts, OPEN incidents list, manual-open form, recently-resolved
  list with root cause + recovery evidence) with `<main>`.
- Same-origin `/api/ops` proxy with narrow read/write
  allow-lists; browser never talks to the API directly.
- Contracts gain `OpsIncidentView` + `OpsQueueView` (barrel
  export included).

## Backend/domain

- New `ops` module: service (open/ack/resolve/close lifecycle,
  `openFromDeadLetter` convergent dedupe, `sweepDeadLetters`,
  list/detail, queue overview), controller (`incidents`,
  `incidents/:id`, acknowledge/resolve/close, `incidents/sweep`,
  `queue`; SessionGuard + ApplicationRateGuard, CsrfGuard on
  writes), DTOs (severity allow-list, MinLength(8) title,
  MinLength(20) recovery evidence).
- Notification worker dead-letters non-mandatory deliveries via
  `opsService.openFromDeadLetter` in the same transaction;
  mandatory notices skip it (examinations lane only).
- Integration dead-letter site hooks the same call in-transaction.
  Both modules import `OpsModule`; `OpsModule` imports only
  `IdentityAccessModule`, so there is no dependency cycle.
- One OPEN per (sourceKind, sourceRef) structurally via the
  partial-unique index (`OpsIncident_open_source_key`); the
  service replays before create inside the caller transaction
  (Prisma cannot express partial uniques).

## Database/migration

- `20261003120000_ph8_ops_queue`: `OpsIncident` (partial-unique
  one-OPEN-per-source index + status/created index). Prisma
  client regenerated. 51 migrations apply in order on fresh DBs.

## Security + authz

- Writes: live INTEGRATION_SUPPORT + `replay-event` only;
  SYSADMIN denied on writes (governance uses the IAM trail);
  students/tutors/lecturers denied; expired grants fail safe;
  denials 403 + audit; neutral 404s; version-checked
  transitions + idempotent keys; CSRF.
- Reads: support or MOODLE_ADMIN (`sync-moodle`) via the
  `opsRole()` precedent; support reads OPEN escalation and
  dead-letter rows regardless of scope for console purposes,
  audited.

## Tests and what they prove

- `ops-incidents.e2e-spec.ts` (15 tests): manual open + owner,
  severity/title refusals, ack ownership + resolve evidence
  demands + close sealing, notification dead-letter auto-open
  (two dead-letters → one incident), integration dead-letter
  sweep dedupe, mandatory lane stays examinations-only (zero
  OpsIncident rows), role denials, moodle reads + neutrals,
  list scoping (`status`/`openOnly` filters, detail happy path,
  moodle parity, outsider refusal), target-response persistence,
  racing-resolve convergence, idempotent replay + key conflict,
  expired-grant 403 + restore. 15/15 on fresh
  `sis_ph8_s3_final2_test`.
- Slice regressions held on separate fresh DBs: `notifications`
  16/16 on `sis_ph8_s3_regress_test` (auto-open hooks do not
  disturb slice-1 behavior). Unit 73/73; typecheck exit 0 (API +
  web); lint warnings-only, no errors (5 new
  `no-base-to-string` notes in `forms.tsx` match the identical
  pre-existing `String(data.get(...) ?? "")` pattern across the
  app); API dist via direct `tsc`; web production build exit 0
  (new `/admin/ops`, `/api/ops` routes).
- Browser `ops-queue` (armed SMS_SIM failure → worker
  dead-letter → incident → ack → resolve with evidence → CLOSE)
  1/1 on fresh migrated + min/curriculum-seeded
  `sis_ph8_browser_s3_test` with rebuilt apps (390px,
  keyboard/focus, no overflow, empty localStorage).
- Backup drill (`sis_ph8_s3_test` ops + notification data):
  `pg_dump` → restore into scratch → per-table counts match on
  all 10 checked tables (OpsIncident 8, NotificationTemplate 2,
  NotificationRecord 3, NotificationDelivery 3,
  IntegrationDeliveryAttempt 1, OutboxEvent 3, AuditEvent 17,
  ApplicationCommand 17, Person 9, Account 9) with zero orphans
  (deliveries, records). Scratch dropped afterwards. Note: `npm
  run backup:test` itself still predates Phase 3–8 tables —
  widening the script is a follow-up, not done here.

## What failed or confused us

- `openOnly=false` never filtered: the list DTO used
  `@Type(() => Boolean)` and `Boolean('false')` is `true`, so
  every query behaved as `openOnly=true`. Replaced with an
  explicit `'true'` coercion plus a discriminating test (a
  CLOSED incident is excluded by `openOnly=true` but returned
  by `openOnly=false`) — green on a fresh DB.
- Audit-trail review (raised during reviewer pass, no change
  made): worker auto-open writes no `auditEvent`, which is
  correct and consistent — both domain precedents record worker
  state transitions via outbox/state rows, not audit (notification
  `NotificationDeadLettered` outbox event and the
  `IntegrationDeliveryAttempt` DEAD_LETTER flip land in the same
  transaction as the incident). Operator transitions
  (open/ack/resolve/close/sweep) are the audited ones, per the
  packet. Auto-open provenance is traceable through the
  incident's `sourceKind`/`sourceRef` back to the dead-letter
  row. No system-actor audit was invented.
- `linkedRef` (schema + migration) is reserved and unwired:
  linking today is done via queue counts, not the column. Left
  untouched rather than inventing packet semantics; wiring it
  (e.g., owning-queue ref on auto-open) is a follow-up.

- Browser `ops-queue` timed out at 22:04 waiting for the Close
  button: the served web build predated the Recently-resolved
  close form (OPEN list correctly empty, RESOLVED row rendered,
  but no transition form under it). Rebuilt web from the current
  worktree (`next build` exit 0, `/admin/ops` present) and reran
  on a fresh browser DB → 1/1 green. Lesson: rebuild both apps
  after UI changes; the 22:04 trace is kept in
  `test-results/` as evidence of the stale build, not the code.
- Phase 6 `integration-ops`/`integration-replay` fail 7/8+ on a
  min-seeded DB (`convertedStudent` 409 at application start,
  `simulator/mode` 404) — reproduced byte-identically on clean
  HEAD with our changes stashed, so it is a pre-existing
  seed/environment limit, not a slice-3 regression. The full
  demo seed (curriculum + courses for the applicant→student
  journey) needs Node 24 type stripping and cannot run on this
  Node 22.13.1 box. Recorded as a remaining gate, not hidden.
- Parallel multi-file e2e on one shared DB collides again
  (global simulator mode, unique package keys): one fresh DB
  per suite, suites run separately.
- `next start` must run with CWD `apps/web` (build output
  lives in `apps/web/.next`); starting from `development/`
  reports no production build.
- `node --eval` quoting breaks in PowerShell 5.1; use temp
  `.mjs` helpers (untracked, for deletion before commit) like
  the existing `.seed-min-tmp.mjs` pattern.

## Questions to revise

- Production incident ownership, paging, and RPO/RTO approval
  (GAP-009); monitoring/escalation ownership and UAT
  participants (open decisions); widening `backup:test` to
  Phase 3–8 tables (follow-up).
