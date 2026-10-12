# Phase 8 Slice 3 Operations Health and Incident Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A generic ops console over existing domain operations: convergent auto-open incidents from dead-letters plus manual opens, with an evidenced lifecycle.

**Architecture:** New `ops` NestJS module owns `OpsIncident` (partial-unique one-OPEN-per-source for structural dedupe); notification and integration workers call `opsService.openFromDeadLetter()` in-transaction on dead-lettering; the console aggregates open incidents plus linked-row counts from existing domain queries; UI under `/admin/ops` reuses admin patterns.

**Tech Stack:** NestJS + TypeScript, Prisma + PostgreSQL 18, Next.js + CSS Modules, Vitest e2e, Playwright browser, Node 24.21.0.

**Spec:** `development/docs/task-packets/TASK-PH8-003.md`, which argues from the incident-lifecycle clause, worker-recovery clause, §§16.5/16.10/16.14, and the GAP-009 interim decisions recorded in the packet. Executors read both.

## Global Constraints

- Locked stack: Next.js + TS + CSS Modules, NestJS + TS, PostgreSQL + Prisma, Docker Compose, GitHub Actions, Playwright unless approved ADR changes it.
- No Tailwind, microservices, Redis, Kafka/RabbitMQ, Kubernetes, native mobile, AI chatbot, real student data, real production credentials without approved ADR.
- Server-side authz: role + scope + relationship + state + purpose + time-bound authority; denials 403 + audit; neutrals 404.
- Immutable history for high-impact decisions; idempotency keys + row locks + outbox where external effects occur (transitions here are internal + audited only, per packet).
- Demo data only (SUP-009). Release v0.9.0 track. Lead Chitundu Milimbo; reviewer Charles Hangoma.

---

### Task 1: Migration + Prisma model

**Files:**
- Create: `development/prisma/migrations/20261003120000_ph8_ops_queue/migration.sql`
- Modify: `development/prisma/schema.prisma` (append `OpsIncident`)
- Test: `migrate deploy` on scratch + `prisma generate` + typecheck

**Interfaces:**
- Consumes: nothing.
- Produces: `OpsIncident` model used by Task 2.

- [ ] **Step 1: Write the migration SQL**

```sql
-- TASK-PH8-003: generic ops incident queue (slice 3). Cross-domain
-- incidents auto-opened convergently from dead-letters plus manual
-- operator opens. One OPEN per (sourceKind, sourceRef) structurally.
-- Demo values only (SUP-009, GAP-009).
CREATE TABLE "OpsIncident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "sourceKind" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "ownerAccountId" TEXT,
    "ownerRole" TEXT,
    "targetResponseAt" TIMESTAMP(3),
    "detail" JSONB NOT NULL DEFAULT '{}',
    "rootCause" TEXT,
    "recoveryEvidence" TEXT,
    "preventiveAction" TEXT,
    "linkedRef" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpsIncident_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpsIncident_open_source_key" ON "OpsIncident"("sourceKind", "sourceRef") WHERE status = 'OPEN';
CREATE INDEX "OpsIncident_status_idx" ON "OpsIncident"("status", "createdAt");
```

- [ ] **Step 2: Append Prisma model mirroring the SQL**

```prisma
// Phase 8 slice 3: generic ops incidents (TASK-PH8-003). Cross-domain
// auto-open from dead-letters plus manual operator opens; one OPEN
// per (sourceKind, sourceRef) structurally. Lifecycle
// OPEN→ACKNOWLEDGED→RESOLVED→CLOSED with recovery evidence.
model OpsIncident {
  id String @id @default(uuid())
  title String
  severity String
  status String @default("OPEN")
  sourceKind String
  sourceRef String
  ownerAccountId String?
  ownerRole String?
  targetResponseAt DateTime?
  detail Json @default("{}")
  rootCause String?
  recoveryEvidence String?
  preventiveAction String?
  linkedRef String?
  version Int @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([status, createdAt])
}
```

Note: Prisma does not express partial unique indexes; enforce the
one-OPEN rule in `openFromDeadLetter` via `findFirst({where:
{sourceKind, sourceRef, status: 'OPEN'}})` replay before create,
inside the caller's transaction (convergent under row locks).

- [ ] **Step 3: Generate + typecheck** (`prisma generate` via direct node; `npm run typecheck` exit 0).

### Task 2: OpsService + controller + module (RED first)

**Files:**
- Create: `development/apps/api/src/ops/ops.module.ts`
- Create: `development/apps/api/src/ops/ops.service.ts`
- Create: `development/apps/api/src/ops/ops.controller.ts`
- Create: `development/apps/api/src/ops/dto.ts`
- Modify: `development/apps/api/src/app.module.ts` (add `OpsModule`)
- Test: `development/apps/api/test/ops-incidents.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`; `ActiveAuthority`; `command()` idempotency (copy from `notifications.service.ts`); ops gate = live INTEGRATION_SUPPORT+`replay-event` OR live MOODLE_ADMIN+`sync-moodle` (mirror `opsRole()`), SYSADMIN denied on writes.
- Produces: `openIncident`, `acknowledgeIncident`, `resolveIncident`, `closeIncident`, `listIncidents`, `queueOverview`, `openFromDeadLetter(db, input)` (Tx overload for worker in-TX calls).

Method contracts:

```ts
openIncident(auth, key, { title, severity, sourceKind: 'MANUAL', sourceRef, detail? })
  // severity in LOW|MEDIUM|HIGH|CRITICAL else 400; title >= 8 chars else 400
acknowledgeIncident(auth, key, id, version, { targetResponseAt? })
  // OPEN only; sets owner = caller, status ACKNOWLEDGED, version+1
resolveIncident(auth, key, id, version, { rootCause, recoveryEvidence (>=20 chars), preventiveAction? })
  // ACKNOWLEDGED only; sets RESOLVED
closeIncident(auth, key, id, version)
  // RESOLVED only; sets CLOSED (immutable after)
openFromDeadLetter(db, { sourceKind: 'NOTIFICATION_DELIVERY'|'INTEGRATION_DELIVERY', sourceRef, title, severity, detail? })
  // findFirst OPEN same source → return it (dedupe); else create OPEN. No auth (worker context); audited as system.
queueOverview(auth)
  // counts: openIncidents, acknowledgedIncidents, pendingNotificationDeadLetters, pendingIntegrationDeadLetters, pendingReplays, openEscalations, openReconCases + latest 20 OPEN incidents. Support/MOODLE_ADMIN reads.
```

- [ ] **Step 1: Write the failing e2e first (RED)**

Create `development/apps/api/test/ops-incidents.e2e-spec.ts` (standard header: isolated-DB guard, ValidationPipe whitelist, `user()` helper; INTEGRATION_SUPPORT users need capability `replay-event`, scopeType `SYSTEM`, scopeRef `MOODLE` per fixtures precedent) with the full ~12-test list from the packet, starting with:

```ts
it('open-happy-path: manual incident opens with owner + target', async () => {
  const res = await post('/ops/incidents', {
    idempotencyKey: key(),
    title: 'Simulator provider timeouts',
    severity: 'HIGH',
    sourceRef: `manual-${key()}`,
  }, supportCookie).expect(201);
  expect((res.body as { status: string }).status).toBe('OPEN');
});
```

Run on fresh DB: FAIL with 404 (no route).

- [ ] **Step 2-4:** DTOs (CreateIncidentDto/TransitionDtos with MaxLength caps + MinLength(8) title, MinLength(20) evidence — reuse the packet-local anti-garbage pattern from `identity-access/dto.ts:24-26`), service, controller (`@Controller('ops')`, SessionGuard + ApplicationRateGuard, CsrfGuard on writes), module, app.module wiring.
- [ ] **Step 5:** Full file green on fresh DB.
- [ ] **Step 6:** Typecheck + lint (no new warnings).

### Task 3: Worker auto-open hooks

**Files:**
- Modify: `development/apps/api/src/notifications/notifications.service.ts` (call `opsService.openFromDeadLetter` on dead-letter for NON-mandatory records; mandatory stay examinations-lane, console links them)
- Modify: `development/apps/api/src/integration/integration.service.ts` (same hook where attempts dead-letter; find the exact site — the attempt state flip to DEAD_LETTER)
- Modify: `development/apps/api/src/notifications/notifications.module.ts` + `integration.module.ts` (import `OpsModule`)
- Test: extend `ops-incidents.e2e-spec.ts` (auto-open on armed notification dead-letter with dedupe; mandatory dead-letter creates NO OpsIncident)

**Interfaces:**
- Consumes: `OpsService.openFromDeadLetter(db, ...)` from Task 2.
- Produces: dead-letters that convergently open exactly one incident each.

- [ ] **Step 1: Failing tests** (auto-open + dedupe + mandatory-lane assertions).
- [ ] **Step 2: Hook both dead-letter sites** (same TX, skip-never-fails-domain rule: wrap in try/catch that audits-and-continues? No — openFromDeadLetter is convergent and total; let it throw only on programmer error. Keep in-TX, no swallow).
- [ ] **Step 3: Green + notification/integration regression files green on fresh DBs.**

### Task 4: Console UI + proxy + browser proof

**Files:**
- Create: `development/apps/web/app/api/ops/[[...path]]/route.ts` (same-origin proxy, narrow allow-list)
- Create: `development/apps/web/app/admin/ops/page.tsx` (queue: incidents table + linked counts + open/ack/resolve/close forms, `<main>`)
- Create: `development/tests/browser/ops-queue.spec.ts` (dead-letter → incident → ack → resolve w/ evidence → CLOSED; 390px/keyboard/focus/no-overflow/empty localStorage)
- Modify: `development/packages/contracts/src/` (add `ops.ts` views + index export)
- Test: web build exit 0 + browser 1/1 on fresh migrated + seeded browser DB

- [ ] **Step 1-3:** proxy (copy notifications proxy shape), console page, browser spec. For the browser journey, arm a notification dead-letter via API (template + record with `simulateFailure`, run worker to dead-letter) then drive the incident lifecycle through the UI.
- [ ] **Step 4: Build + run green.**

### Task 5: Docs + verification closeout

**Files:**
- Create: `development/docs/learning/NOTE-PH8-003.md`
- Modify: `development/docs/learning/PHASE-8-IMPLEMENTATION-REVIEW.md` (slice-3 row green, totals)
- Modify: `development/docs/learning/VERIFICATION.md` (append slice-3 section, evidence only)
- Test: unit 73/73+, lint warnings-only, per-suite fresh-DB e2e, backup drill incl. OpsIncident table

## Self-Review

**1. Spec coverage:** packet outcome (lifecycle, auto-open, dedupe, console, proof) → Tasks 1–5. Incident-lifecycle fields → Task 1 schema. Interim decisions → packet + Task 2 gates. Mandatory-lane rule → Task 3.
**2. Placeholder scan:** no TBD/TODO; exact files, code, commands, expected outputs throughout.
**3. Type consistency:** `openFromDeadLetter(db, input)` signature identical in Tasks 2–3; view names shared via contracts.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-10-03-phase-8-slice-3-ops-queue.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
