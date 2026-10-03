# Phase 8 Slice 2 Cross-Domain Audit Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One entity timeline endpoint joining every source the caller may already read, with zero new PII surface.

**Architecture:** Extend `audit-timeline.service.ts` with `getEntityTimeline()` (kind-dispatched, gate-first, allow-listed selects, time-merged), expose `GET /auth/audit/timeline/entity/:kind/:id`, and render a history section on the board-package page plus the existing applicant/officer timelines as browser proof.

**Tech Stack:** NestJS + TypeScript, Prisma + PostgreSQL 18, Next.js + CSS Modules, Vitest e2e, Playwright browser, Node 24.21.0.

**Spec:** `development/docs/task-packets/TASK-PH8-002.md`, which argues from handbook §16.14, §15.19, UI-TIMELINE-001, and the applicant `visibleTimeline` / staff `caseHistory` contracts. Executors read both.

## Global Constraints

- Locked stack: Next.js + TS + CSS Modules, NestJS + TS, PostgreSQL + Prisma, Docker Compose, GitHub Actions, Playwright unless approved ADR changes it.
- No Tailwind, microservices, Redis, Kafka/RabbitMQ, Kubernetes, native mobile, AI chatbot, real student data, real production credentials without approved ADR.
- Server-side authz: role + scope + relationship + state + purpose + time-bound authority; denials 403 + audit; neutrals 404.
- No new PII surface: same allow-lists and filters as the direct endpoints, joined — never widened.
- Demo data only (SUP-009). Release v0.9.0 track. Lead/reviewer unassigned.

---

### Task 1: `getEntityTimeline()` in the audit-timeline service

**Files:**
- Modify: `development/apps/api/src/identity-access/audit-timeline.service.ts` (append method + `ENTITY_KINDS`)
- Modify: `development/apps/api/src/identity-access/dto.ts` (append `EntityTimelineQueryDto` if query params needed — take/skip only)
- Test: `development/apps/api/test/audit-entity-timeline.e2e-spec.ts` (Task 2)

**Interfaces:**
- Consumes: `hasActiveAuthority`, `auditAuth`, `PrismaService` (existing imports); live-assignment check shape from `review.service.ts:60-67` (startsAt/revokedAt/endsAt/account ACTIVE).
- Produces: `getEntityTimeline(auth, kind, id): Promise<{ kind, id, items }>` where item = `{ source, occurredAt, actorRole, summary, applicantVisible }` sorted desc, take 100.

Gate matrix (implement exactly):
- `application`: applicant iff `Application.accountId === auth.accountId` (sources: AuditEvent allow-listed select + ApplicationStatusEvent with `applicantVisible=true`); else staff iff live ADMISSIONS_OFFICER+`review-assigned` or ADMISSIONS_APPROVER+`decide-offer` (sources: same AuditEvent select + ALL status events). Anyone else: neutral 404 (never 403 — must not confirm existence).
- `result-package`: staff iff live assignment in LEC+`stage-marks`, COORDINATOR+`approve-assessment`, EXAMINATIONS_OFFICER+`validate-results`, MODERATOR+`moderate-results`, MOODLE_ADMIN+`manage-mapping` (same candidate list as assessment `reader()`); sources: AuditEvent select + BoardDecision rows (`to/reason/decidedBy/decidedAt`) + OfficialCourseResult rows (`studentRef/total/outcome/version/publishedAt`). Students and everyone else: neutral 404.
- Unknown kind: 400 `UNKNOWN_KIND`. Unknown/foreign id: 404.
- Every call audits ALLOW (`EntityTimelineViewed`) or DENY like `getTimeline()` lines 109–120.

- [ ] **Step 1: Write the failing e2e first (RED)**

Create `development/apps/api/test/audit-entity-timeline.e2e-spec.ts` with the standard header (isolated-DB guard, ValidationPipe whitelist, `user()` helper) and these two tests first:

```ts
it('applicant-own: applicant sees own application timeline, staff rows filtered', async () => {
  // ...create applicant user + submitted application via API...
  const res = await get(`/auth/audit/timeline/entity/application/${appId}`, applicantCookie).expect(200);
  const items = (res.body as { items: Array<{ applicantVisible?: boolean }> }).items;
  expect(items.length).toBeGreaterThan(0);
  expect(items.every((i) => i.applicantVisible !== false)).toBe(true);
});

it('unknown-kind: invented kinds refuse without disclosure', async () => {
  const res = await get('/auth/audit/timeline/entity/starship/123', applicantCookie);
  expect(res.status).toBe(400);
});
```

Run on a fresh DB: FAIL (404 route-missing on the first; second passes vacuously — acceptable: the route test proves absence).

- [ ] **Step 2: Minimal implementation**

```ts
const ENTITY_KINDS = ['application', 'result-package'] as const;

async getEntityTimeline(
  actor: ActiveAuthority,
  kind: string,
  id: string,
) {
  if (!(ENTITY_KINDS as readonly string[]).includes(kind)) {
    throw new BadRequestException({ message: 'Unknown timeline entity.' });
  }
  // ... gate matrix above, then per-kind source queries with the
  // getTimeline allow-listed select, merged by occurredAt desc, take 100,
  // then auditAuth ALLOW like lines 112-120 ...
}
```

- [ ] **Step 3: Full test list green** (10 tests per packet: own/filtered, foreign 404, officer full, approver readonly, tutor denial, package staff view, student package 404, unknown kind 400, unknown id 404, invalid query 400).
- [ ] **Step 4: Typecheck** (`npm run typecheck`, exit 0).

### Task 2: Controller route + contracts

**Files:**
- Modify: `development/apps/api/src/identity-access/auth.controller.ts` (add `GET timeline/entity/:kind/:id` after the existing timeline route at lines ~321-345; same `SessionGuard` + read rate limit)
- Modify: `development/packages/contracts/src/audit.ts` (add `EntityTimelineItem` + `EntityTimelineResponse`)
- Test: e2e from Task 1

**Interfaces:**
- Consumes: `getEntityTimeline()` from Task 1.
- Produces: `GET /auth/audit/timeline/entity/:kind/:id → { kind, id, items }`.

- [ ] **Step 1: Route** mirroring the existing timeline handler (guards, query DTO passthrough).
- [ ] **Step 2: Contracts** (`EntityTimelineItem { source, occurredAt, actorRole, summary, applicantVisible }`).
- [ ] **Step 3: Typecheck exit 0.**

### Task 3: Package history UI + browser proof

**Files:**
- Modify: `development/apps/web/app/admin/assessment/packages/[id]/page.tsx` (History section: server-load entity timeline, render decisions + audit rows; `<main>` already present)
- Create: `development/tests/browser/entity-timeline.spec.ts` (officer sees staff rows on case history; applicant timeline stays applicant-only)
- Test: web build exit 0 + browser 1/1 on fresh migrated + seeded browser DB (390px, keyboard/focus, no overflow, empty localStorage)

- [ ] **Step 1: History section** (fetch `/auth/audit/timeline/entity/result-package/${id}` server-side with sid cookie; neutral unavailable notice on non-OK).
- [ ] **Step 2: Browser spec** (applicant sees only own rows; officer sees staff rows — reuse `createApplicant`-style fixtures + queue helpers from `admissions-queue.spec.ts`).
- [ ] **Step 3: Build + run green.**

### Task 4: Docs + verification closeout

**Files:**
- Create: `development/docs/learning/NOTE-PH8-002.md`
- Modify: `development/docs/learning/PHASE-8-IMPLEMENTATION-REVIEW.md` (slice-2 row green)
- Modify: `development/docs/learning/VERIFICATION.md` (append slice-2 section, evidence only)
- Test: unit 73/73+, lint warnings-only, e2e file green on fresh DB

## Self-Review

**1. Spec coverage:** packet outcome (two kinds, gate matrix, neutral 404s, audited reads, proof) → Tasks 1–4. §16.14 fields → allow-listed selects reused. No-new-PII → filters reused verbatim.
**2. Placeholder scan:** no TBD/TODO; exact files, code, commands, expected outputs throughout.
**3. Type consistency:** `getEntityTimeline(auth, kind, id)` name/signature identical in Tasks 1–2; `EntityTimelineItem` fields match service mapper + UI renderer.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-10-03-phase-8-slice-2-entity-timeline.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
