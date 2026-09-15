# Learning Note — TASK-PH1-004

- Lead developer: Charles
- Reviewer: Chitindu Milimbo
- Date/release: 2026-09-15 / v0.2.0 Phase 1 slice 4 (policy + denial; e2e pending DB)

## What we built and why

Central §15.21 policy evaluator + SoD/purpose/status gates + denial UX +
grant hardening (approver, idempotency, outbox, resolve), so every
protected action is decided, explained, and audited the same way
(roadmap slice 4).

## Why it belongs in this module

`identity-access` owns the decision for its resources; new
`PolicyService` (pure) + `IdempotencyKey`/`OutboxEvent` tables +
`AuditEvent.purpose` live inside it. No cross-module writes.

## Frontend explanation

`DeniedPanel` (UI-DENIED-001: not-completed + safe reason + 4 routes +
reference, attention tint) for authority failures; resolve-miss uses the
scoped empty variant; grant form is resolve-then-create with a per-open
idempotency key and receipt re-check before any post-outage retry.

## Backend explanation

`evaluatePolicy()` implements the §15.21 arms (role → verb → liveness →
SoD → self-approval/approver, deny-by-default); wired into grant/switch/
resolve. Guard rejections now audit. Sign-in/recovery share the §11.1
status gate (Active allows, Closed never, rest generic-deny).

## Database explanation

Additive migration: `AuditEvent.purpose`, `IdempotencyKey` (key UNIQUE +
receipt), `OutboxEvent` (poll index), `RoleAssignment` composite index,
`AuditEvent(correlationId)` index — every new query indexed per rule.
Grant commits row + Activated/ExpiryScheduled events atomically; worker
delivery is v0.9.

## Security and authorization explanation

Authority from live workspace, never client state; approver mandatory,
real, ≠ target; unknown users undisclosed (resolve 404 scoped-empty to
grantors, uniform 403 to others); grant/switch/resolve rate-limited;
forbidNonWhitelisted DTOs; prior/new refs + purpose on grant audits.

## Tests and what they prove (DB-independent runs green)

Unit 8 files/26 pass (policy matrix RED-watched, status map, contracts).
Builds + lint clean. **E2E NOT yet run — Docker daemon is down on this
machine** (`/var/run/docker.sock` absent, no passwordless sudo): new
`policy.e2e-spec` (approver, idempotency replay, receipts, resolve
200/404/403, guard audits, prior/new, status gating) plus existing suites
await `sudo systemctl start docker` → `demo:reset` → full e2e.

## Demo replay (reviewer copy-paste, once DB is up)

1. Start Docker, `npm run demo:reset` → 5 migrations + 4/4/6/4.
2. Full e2e: `node scripts/with-env.mjs npm run test:e2e --workspace=apps/api`.
3. UI: Mutinta → switch (denial panel on forced failure), Mweene → resolve
   `chanda.k` → grant with approver → double-submit replays one receipt.

## What failed or confused us

1. DB down blocks migration apply + e2e (see above) — everything else
   (offline `prisma validate`, generate, unit, builds, lint) proven.
2. Hand-wrote `ph1_policy` migration offline (shadow DB unavailable) —
   styled exactly to Prisma conventions; deploy fails loudly if drifted,
   and `migrate diff` must confirm once DB returns.
3. Orphaned duplicate body reappeared in `audit.ts` after a signature
   edit (caught by oxlint, not tsc) — lesson: re-read edited regions.
4. Wrote a `'unset'` placeholder reference mid-flow — caught immediately,
   replaced with the real correlationId. No placeholders ship.
5. UI has no test runner (standing gap); tsc + API proofs cover it.

## Seven-layer talk track (2 minutes)

Problem: scattered route-local checks can't prove uniform denial. Policy:
§15.21 arms + SoD + purpose + deny-by-default. Journey: act → decided →
explained with routes → audited with reference. Architecture:
identity-access owns evaluator + tables. Data: purpose/idempotency/outbox
columns. Code: PolicyService, hardened grant/resolve/receipts, denial
panel. Evidence: unit 26 green; e2e pending DB (honest).

## Terms/concepts learned

- §15.21 arms as code; SoD vs overlap; idempotency key + receipt replay;
  outbox vs direct write; UI-ACCESS-001 four routes; §11.1 seven states;
  GAP-* records for unspecified policy (11 filed in docs/gaps/).

## Questions to revise before presentation

1. Why a central evaluator instead of route checks? → One §15.21
   implementation, tested per arm, wired everywhere — no drift.
2. Why can the same form submit twice safely? → Key + UNIQUE + stored
   receipt; repeats replay, `GET /commands/:key` recovers uncertain states.
3. Why does resolve 404 differ from grant 400? → Authorized grantors get
   scoped-empty (UI-EMPTY); everyone else gets uniform denies (no oracle).
4. What is still open? → 11 GAP records (delegation, registries, training,
   delivery, ops queue, review daemon…); Playwright; Chitindu WSL replay.
