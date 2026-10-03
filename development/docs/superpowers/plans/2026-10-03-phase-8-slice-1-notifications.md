# Phase 8 Slice 1 Notification Record and Delivery Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the authoritative in-system notification centre with versioned templates, a delivery worker, and a staff-signal projection, closing GAP-008/GAP-016 for the demo track.

**Architecture:** New `notifications` NestJS module owns three tables (template registry, records, deliveries); a `NotificationsWorker` claims due deliveries with row locks and drives them through a simulator provider; domain writes (assessment release/amend) fan out notification records in the same transaction as their audit events; staff signals are a scoped projection over the same records, not a parallel system.

**Tech Stack:** NestJS + TypeScript, Prisma + PostgreSQL 18, Next.js + CSS Modules, Vitest e2e, Playwright browser, Node 24.21.0.

**Spec:** `development/docs/task-packets/TASK-PH8-001.md`, which argues from handbook §§16.11–16.14, UX §12.13, applicant journey §9, student journey §8, quality §11.39, and exact compendium §§12.13/applicant-§9/student-§8/quality-§11.39. Executors read both.

## Global Constraints

- Locked stack: Next.js + TS + CSS Modules, NestJS + TS, PostgreSQL + Prisma, Docker Compose, GitHub Actions, Playwright unless approved ADR changes it.
- No Tailwind, microservices, Redis, Kafka/RabbitMQ, Kubernetes, native mobile, AI chatbot, real student data, real production credentials without approved ADR.
- Server-side authz: role + scope + relationship + state + purpose + time-bound authority; denials 403 + audit; neutrals 404.
- Immutable history for high-impact decisions; idempotency keys + row locks + outbox where external effects occur.
- Demo-only: `NOTIFY-DEMO-v1` + `SIM-NOTIFY-v1` (SUP-009); no real providers, contacts, or thresholds claimed.
- Never weaken policy/tests to make build pass; record gaps, fail closed.
- Release v0.9.0 track. Lead/reviewer unassigned (assign at kickoff).

---

### Task 1: Policy config `NOTIFY_DEMO_V1`

**Files:**
- Create: `development/packages/config/src/notifications.ts`
- Modify: `development/packages/config/src/index.ts` (add export line)
- Test: typecheck only (config package has no spec files; `npm run typecheck` covers it)

**Interfaces:**
- Consumes: `MessageTemplate` from `./messages.js` (id/version/owner/text shape for template registry precedent).
- Produces: `NOTIFY_DEMO_V1` const used by Task 3 (worker retry budget, escalation rule) and Task 2 seed values.

- [ ] **Step 1: Write the config file**

```ts
/** Fictional notification demonstration policy. This is not UNZA policy.
 * Phase 8 slice 1 (TASK-PH8-001, GAP-008 interim): versioned template
 * registry NOTIFY-DEMO-v1, simulator provider SIM-NOTIFY-v1, retry
 * budget and escalation rule. In-system delivery is real; email/SMS
 * dispatch is simulated with neutral previews only (handbook §§12.13,
 * student §8, quality §11.39). */
export const NOTIFY_DEMO_V1 = {
  version: "NOTIFY-DEMO-v1",
  demo: true,
  timezone: "Africa/Lusaka",
  provider: "SIM-NOTIFY-v1",
  // Delivery states per §16.12 (Read applies in-system; provider
  // stages apply to simulated channels).
  deliveryStates: [
    "CREATED",
    "QUEUED",
    "SENT",
    "DELIVERED",
    "READ",
    "FAILED",
    "RETRIED",
    "SUPPRESSED",
    "ESCALATED",
  ],
  // Retry budget (fictional): 3 attempts with backoff, escalation
  // after 2 failures or 60 minutes (§16.13 Moodle precedent).
  retry: { maxAttempts: 3, backoffSeconds: [60, 300, 900] },
  escalation: { afterFailures: 2, afterMinutes: 60 },
  // Mandatory categories can never be suppressed (§§12.13, applicant §9).
  mandatoryCategories: [
    "DECISION",
    "DEADLINE",
    "RESULT",
    "FINANCE",
    "SECURITY",
    "INCIDENT",
  ],
  // Optional categories honor preferences.
  optionalCategories: ["SUPPORT", "SYSTEM", "LEARNING"],
  worker: { intervalSeconds: 30 },
} as const;
```

- [ ] **Step 2: Export from index**

Add `export { NOTIFY_DEMO_V1 } from "./notifications.js";` after the assessment line in `development/packages/config/src/index.ts`.

- [ ] **Step 3: Verify**

Run: `npm run build --workspace=@sis/config`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add development/packages/config/src/notifications.ts development/packages/config/src/index.ts
git commit -m "feat(notifications): NOTIFY-DEMO-v1 policy registry"
```

### Task 2: Migration + Prisma models

**Files:**
- Create: `development/prisma/migrations/20261003090000_ph8_notifications/migration.sql`
- Modify: `development/prisma/schema.prisma` (append three models)
- Test: `prisma migrate deploy` on a scratch DB + `prisma generate` + typecheck

**Interfaces:**
- Consumes: `NOTIFY_DEMO_V1` version string for the seed template rows (seeded in-test, not in migration).
- Produces: `NotificationTemplate`, `NotificationRecord`, `NotificationDelivery` models used by Task 3.

- [ ] **Step 1: Write the migration SQL**

```sql
-- TASK-PH8-001: notification record and delivery status (slice 1).
-- Authoritative in-system records (§16.11) with versioned templates
-- and per-channel delivery states (§16.12). Demo values only
-- (SUP-009, GAP-008).
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionLabel" TEXT,
    "office" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationTemplate_event_version_key" ON "NotificationTemplate"("event", "version");

CREATE TABLE "NotificationRecord" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL REFERENCES "NotificationTemplate"("id") ON DELETE RESTRICT,
    "templateVersion" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionPath" TEXT,
    "deadlineAt" TIMESTAMP(3),
    "office" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT FALSE,
    "recipientKind" TEXT NOT NULL,
    "recipientAccountId" TEXT,
    "recipientRole" TEXT,
    "scopeType" TEXT,
    "scopeRef" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationRecord_dedupe_key" ON "NotificationRecord"("dedupeKey");
CREATE INDEX "NotificationRecord_recipient_idx" ON "NotificationRecord"("recipientAccountId", "status");
CREATE INDEX "NotificationRecord_signal_idx" ON "NotificationRecord"("recipientRole", "scopeType", "scopeRef", "status");

CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL REFERENCES "NotificationRecord"("id") ON DELETE RESTRICT,
    "channel" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CREATED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "providerRef" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NotificationDelivery_due_idx" ON "NotificationDelivery"("state", "nextRunAt");
CREATE INDEX "NotificationDelivery_record_idx" ON "NotificationDelivery"("recordId");
```

- [ ] **Step 2: Append Prisma models mirroring the SQL**

```prisma
// Phase 8 slice 1: notification record and delivery status
// (TASK-PH8-001). Versioned templates (supersede, never edit);
// authoritative in-system records; per-channel delivery states.
// Staff signals are a scoped projection over NotificationRecord,
// not a parallel table (GAP-016 design note).
model NotificationTemplate {
  id        String   @id @default(uuid())
  event     String
  version   Int      @default(1)
  status    String   @default("ACTIVE")
  title     String
  body      String
  actionLabel String?
  office    String
  category  String
  mandatory Boolean  @default(false)
  @@unique([event, version])
}

model NotificationRecord {
  id                 String    @id @default(uuid())
  templateId         String
  templateVersion    Int
  event              String
  title              String
  body               String
  actionPath         String?
  deadlineAt         DateTime?
  office             String
  category           String
  mandatory          Boolean   @default(false)
  recipientKind      String
  recipientAccountId String?
  recipientRole      String?
  scopeType          String?
  scopeRef           String?
  dedupeKey          String    @unique
  status             String    @default("OPEN")
  version            Int       @default(1)
  createdAt          DateTime  @default(now())
  @@index([recipientAccountId, status])
  @@index([recipientRole, scopeType, scopeRef, status])
}

model NotificationDelivery {
  id         String    @id @default(uuid())
  recordId   String
  channel    String
  state      String    @default("CREATED")
  attempts   Int       @default(0)
  nextRunAt  DateTime?
  lastError  String?
  providerRef String?
  sentAt     DateTime?
  deliveredAt DateTime?
  readAt     DateTime?
  createdAt  DateTime  @default(now())
  @@index([state, nextRunAt])
  @@index([recordId])
}
```

- [ ] **Step 3: Generate client and verify**

Run: `node ./node_modules/prisma/build/index.js generate` (direct node: the `npx` shim fails on Windows)
Expected: `Generated Prisma Client`.

- [ ] **Step 4: Commit**

```bash
git add development/prisma/migrations/20261003090000_ph8_notifications development/prisma/schema.prisma
git commit -m "feat(notifications): template/record/delivery tables"
```

### Task 3: NotificationsService + worker + SIM provider

**Files:**
- Create: `development/apps/api/src/notifications/notifications.module.ts`
- Create: `development/apps/api/src/notifications/notifications.service.ts`
- Create: `development/apps/api/src/notifications/notifications.worker.ts`
- Create: `development/apps/api/src/notifications/dto.ts`
- Create: `development/apps/api/src/notifications/notifications.controller.ts`
- Modify: `development/apps/api/src/app.module.ts` (add `NotificationsModule` import)
- Test: `development/apps/api/test/notifications.e2e-spec.ts` (Task 5)

**Interfaces:**
- Consumes: `NOTIFY_DEMO_V1` (retry/escalation budgets); `PrismaService`; `ActiveAuthority`; `command()`-style idempotency via `ApplicationCommand` table (copy the pattern from `assessment.service.ts:159-216`: hash payload, `findUnique({where:{key}})`, replay-or-run inside `$transaction`).
- Produces: `NotificationsService.createFromEvent(db, auth, input)` (transaction-client overload for in-TX fan-out), `listMine()`, `listSignals()`, `markRead()`, `setPreference()` (suppression), `runWorker()` (claimed by the worker tick).

Key method contracts (exact names/params implementers and callers share):

```ts
// Creates ONE record + IN_SYSTEM delivery (QUEUED) + optional SIM
// channel deliveries, in the caller's transaction.
createFromEvent(
  db: Tx,
  auth: ActiveAuthority,
  input: {
    event: string;               // e.g. 'RESULT_RELEASED'
    title: string; body: string;  // rendered from template, neutral previews
    actionPath?: string; deadlineAt?: Date;
    office: string; category: string; mandatory: boolean;
    recipientAccountId?: string;  // ACCOUNT kind
    recipientRole?: string; scopeType?: string; scopeRef?: string; // ROLE_SCOPE kind
    dedupeKey: string;            // idempotency: duplicates suppress
    channels?: Array<'IN_SYSTEM' | 'EMAIL_SIM' | 'SMS_SIM'>;
  },
): Promise<{ id: string; deduped: boolean }>
```

Worker `runWorker()`: `SELECT ... FOR UPDATE SKIP LOCKED` over due deliveries (`state IN ('QUEUED','RETRIED') AND nextRunAt <= now`, limit 25); SIM provider marks SENT→DELIVERED immediately (in-system READ on `markRead`); SIM channels record provider attempts with neutral body; failures increment attempts, schedule `nextRunAt` by `backoffSeconds`, transition FAILED after `maxAttempts`; mandatory-record failures at/after `escalation.afterFailures` create a ROLE_SCOPE record for the responsible office + audit (never mutates workflow state).

- [ ] **Step 1: Write the failing e2e first (RED)**

Create `development/apps/api/test/notifications.e2e-spec.ts` with the standard header (isolated-DB guard, ValidationPipe whitelist, `user()` helper roles) and this first test only:

```ts
it('record-happy-path: template version + OPEN record + QUEUED delivery', async () => {
  const tpl = await post('/notifications/templates', {
    idempotencyKey: key(),
    event: 'RESULT_RELEASED',
    title: 'Official results released',
    body: 'Your official results are available securely in the portal.',
    office: 'Examinations',
    category: 'RESULT',
    mandatory: true,
  }, sysadminGovernanceCookie).expect(201);
  expect((tpl.body as { version: number }).version).toBe(1);
});
```

Run on a fresh DB: FAIL with 404 (no route). (Template writes are governance-gated: reuse the `security.grantorRoles` gate from `audit-timeline.service.ts` — SYSADMIN with a live grantor assignment.)

- [ ] **Step 2: DTOs** (`dto.ts`): `CreateTemplateDto extends KeyDto` (event/title/body/office/category/mandatory/actionLabel), `ListNotificationsQuery` (status?, take?), `MarkReadDto extends KeyDto`, `SuppressDto extends KeyDto` (recordId + optedOut bool; service refuses mandatory), `DecideEscalationDto` if needed. All string fields `@MaxLength` capped (title 200, body 2000, office 120).

- [ ] **Step 3: Service** implementing the contracts above, following `assessment.service.ts` conventions: `fail(code,message,status)` + `denied()` helpers, `reader`-style recipient gates (own accountId OR live role+scope assignment for ROLE_SCOPE rows), `checkVersion` on transitions, `audit()` rows on every decision, outbox `NotificationDelivered`-family events where external effects occur.

- [ ] **Step 4: Controller** `@Controller('notifications')` with `SessionGuard + ApplicationRateGuard`, `CsrfGuard` on writes: `POST /templates`, `GET /templates`, `POST /records` (governance/staff fan-out entry; domain fan-out uses the service directly), `GET /records/mine`, `GET /records/signals`, `GET /records/:id`, `POST /records/:id/read`, `POST /records/:id/suppress`, `GET /deliveries/:id`.

- [ ] **Step 5: Module + worker** (`notifications.module.ts` imports `IdentityAccessModule`, provides service + `NotificationsWorker` mirroring `delivery.worker.ts:12-47` with interval from `NOTIFY_DEMO_V1.worker.intervalSeconds`, Vercel skip, single-flight tick calling `service.runWorker()`); register in `app.module.ts` imports.

- [ ] **Step 6: Run the RED test, watch it pass, then add the remaining ~13 tests** (state machine, escalation task, suppression rules, isolation, denials, neutrals, concurrency, idempotence, expired-grant) and run the full file green on a fresh DB.

- [ ] **Step 7: Commit**

```bash
git add development/apps/api/src/notifications development/apps/api/src/app.module.ts development/packages/contracts/src/notifications.ts
git commit -m "feat(notifications): records, deliveries, worker, SIM provider"
```

### Task 4: Assessment fan-out (release + amendment)

**Files:**
- Modify: `development/apps/api/src/assessment/assessment.service.ts` (call `notifications.createFromEvent` inside the release + approve-amendment transactions)
- Modify: `development/apps/api/src/assessment/assessment.module.ts` (import `NotificationsModule`)
- Test: extend `notifications.e2e-spec.ts` with fan-out tests (release creates RESULT_RELEASED record in-TX; amendment approval creates RESULT_AMENDED record)

**Interfaces:**
- Consumes: `NotificationsService.createFromEvent(db, auth, input)` from Task 3.
- Produces: release/amend transactions that also write notification records (audit + notification in the same TX per compendium line 9717).

Fan-out mapping (dedupeKey includes the domain row id so replays suppress):
- `releaseResults` success → event `RESULT_RELEASED`, title `Official results released`, body `Your official results are available securely in the portal.`, category RESULT mandatory, one ACCOUNT record per released student (recipientAccountId resolved from the Student→Person→Account chain already used by `studentResults`), actionPath `/student/results`, office `Examinations`.
- `decideAmendment` APPROVE → event `RESULT_AMENDED`, body `An official result was updated after an authorized review. Sign in to view the current result.`, category RESULT mandatory, ACCOUNT record for the amended student, actionPath `/student/results`.
- Release/amendment for unresolvable accounts: skip the ACCOUNT record (never fail the domain write), audit the skip.

- [ ] **Step 1: Failing test** — `fan-out: release writes per-student records in-TX` (release a package, then `GET /records/mine` as the student shows the RESULT_RELEASED record; delete the outbox row first to prove the record persists independently).
- [ ] **Step 2: Minimal implementation** (import module, call service in both TX blocks, skip-and-audit on unresolvable).
- [ ] **Step 3: Full fan-out tests green**, slice regressions held (grade-release 15/15, grade-amendment 12/12 on fresh DBs).
- [ ] **Step 4: Commit** (`feat(notifications): assessment release/amend fan-out`).

### Task 5: Web UI + proxy + browser proof

**Files:**
- Create: `development/apps/web/app/api/notifications/[[...path]]/route.ts` (same-origin proxy, allow-listed reads/writes only)
- Create: `development/apps/web/app/notifications/page.tsx` (own centre: state chips, read/suppress actions, empty + about cards; `<main id="notifications-content">`)
- Modify: `development/apps/web/app/admin/assessment/packages/[id]/page.tsx` (link staff to signals where relevant — read-only link, no new writes)
- Create: `development/apps/web/app/admin/notifications/page.tsx` (staff signals queue: role-scoped rows + delivery states; `<main>`)
- Create: `development/tests/browser/notifications.spec.ts` (event → inbox → read receipt; mandatory survives suppression)
- Test: typecheck + web lint + production build + browser 1/1 on fresh migrated + seeded browser DB

**Interfaces:**
- Consumes: controller routes from Task 3; `OfficialResultView`-style contract views added to `packages/contracts/src/notifications.ts` in Task 3.
- Produces: user-visible proof for NOTE-PH8-001.

- [ ] **Step 1-4:** proxy (copy assessment proxy shape, narrow regexes), centre page, signals page, browser spec (390px, keyboard/focus, no overflow, empty localStorage).
- [ ] **Step 5: Commit** (`feat(notifications): centre, signals queue, browser proof`).

### Task 6: Docs + verification closeout

**Files:**
- Create: `development/docs/learning/NOTE-PH8-001.md` (what/why, frontend/backend/db/security/tests/failures/questions — NOTE-PH7-007 shape)
- Create: `development/docs/learning/PHASE-8-IMPLEMENTATION-REVIEW.md` (slice-1 row; slices 2–3 marked planned with packet links)
- Modify: `development/docs/learning/VERIFICATION.md` (append slice-1 section with real counts)
- Modify: `development/DESIGN-INDEX.md` (Phase 8 review line)
- Test: full verification battery (typecheck, lint, unit, per-suite fresh-DB e2e, browser, backup drill)

- [ ] **Step 1-2:** note + review + VERIFICATION with evidence-only claims.
- [ ] **Step 3: Commit** (`docs(phase8): slice-1 evidence closeout`).

## Self-Review

**1. Spec coverage:** TASK-PH8-001 outcome (record + worker + states + suppression + escalation + staff projection + proof) → Tasks 1–6. §16.11 contents → Task 3 record fields + Task 2 schema. §16.12 states → Task 1 policy + Task 3 machine. §16.13 recovery rules → Task 3 escalation + owner/deadline fields. §16.14 audit → Task 3 audit rows. Mandatory-rule → Tasks 3/5 suppression tests.
**2. Placeholder scan:** no TBD/TODO; every step names exact files, code, commands, expected outputs.
**3. Type consistency:** `createFromEvent(db, auth, input)` signature identical in Task 3 definition and Task 4 consumption; view names (`NotificationRecordView`, `NotificationDeliveryView`) shared via contracts.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-10-03-phase-8-slice-1-notifications.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
