# Phase 7 Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 7 (slices 1-7) to exit gate: amendment skeleton live with tests, docs synced, replay bug fixed, verification recorded.

**Architecture:** Amendment is a new versioned case entity on released OfficialCourseResult rows (request/approve two-step, supersede-never-edit, impact recalculation stub). Docs sync edits three markdown files. Replay fix moves slice-5 gates inside command() following the slice-6 releaseResults pattern.

**Tech Stack:** NestJS + TypeScript, Prisma + PostgreSQL 18, Next.js + CSS Modules, Vitest e2e, Playwright browser, Node 24.21.0.

**Spec:** `unza-sis-moodle-design-handbook-v3.0.0/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/09-phase-7-assessment-and-official-results.md` slices 1-7; DS5 §18 (amendment creates new official version, impact recalculation); Lecturer/Tutor III §§9.1-9.3 + commands `RequestOfficialResultAmendment` / `ApproveOfficialResultAmendment` + events `OfficialResultAmendmentRequested` / `OfficialResultAmended`; TEST-E2E-EXM-007 (released result never overwritten); perms §§15.6-15.7,15.19; recovery §§16.5,16.7.

## Global Constraints

- Locked stack: Next.js + TS + CSS Modules, NestJS + TS, PostgreSQL + Prisma, Docker Compose, GitHub Actions, Playwright unless approved ADR changes it.
- No Tailwind, microservices, Redis, Kafka/RabbitMQ, Kubernetes, native mobile, AI chatbot, real student data, real production credentials without approved ADR.
- Server-side authz: role + scope + relationship + state + purpose + time-bound authority; denials 403 + audit; neutrals 404.
- Immutable history for high-impact decisions; idempotency keys + row locks + outbox where external effects occur.
- Demo-only: `ASSESSMENT-DEMO-v1` + `weighted-total-v1` + `MOODLE-SIM-v1` (SUP-009, GAP-022); PASS/FAIL is interim display from passMark 50, not institutional scale.
- Never weaken policy/tests to make build pass; record gaps, fail closed.
- Lead Chitundu Milimbo; reviewer Charles Hangoma; release v0.8.0 track.

---

### Task 1: Docs sync (VERIFICATION slice 6, PHASE-7 review, DESIGN-INDEX)

**Files:**
- Modify: `development/docs/learning/VERIFICATION.md` (append Phase 7 slice 6 section after line 405)
- Modify: `development/docs/learning/PHASE-7-IMPLEMENTATION-REVIEW.md:1-11,66-73`
- Modify: `development/DESIGN-INDEX.md:30`

**Interfaces:**
- Consumes: `development/docs/learning/NOTE-PH7-006.md` (slice-6 evidence: 15/15 grade-release, browser board-release 1/1, typecheck/lint/build green)
- Produces: Synced review state for Task 5 verification.

- [ ] **Step 1: Append VERIFICATION slice-6 section**

Content to append to `development/docs/learning/VERIFICATION.md` after line 405:

```markdown
## Phase 7 slice 6 (2026-09-27, fresh `sis_ph7_s6_test` + `sis_ph7_browser_test`)

Official result release + student view (TASK-PH7-006; lead Chitundu
Milimbo, reviewer Charles Hangoma). Typecheck exit 0, web lint clean,
API lint warnings-only, API dist via direct `tsc`, web production
build exit 0 (new `/student/results` route). API e2e `grade-release`
**15/15** on the fresh DB (pre-board/blocking-condition/stale/
unresolved refusals each proving zero rows, happy-path RELEASED count
2 + 64-hex hash + 68.8 PASS rows + outbox chain, six-role denials,
expired-grant 403 + restore, foreign-period 403, neutrals,
racing-release convergence both-201 exactly-2-rows, idempotent replay
+ cross-package key conflict, outbox-deletion-keeps-release
TEST-REC-010, student isolation own-studentRef, second-version
independent release). Slice regressions held on separate fresh DBs:
`assessment-plan` **20/20**, `grade-staging` **18/18**,
`grade-validation` **13/13**, `grade-moderation` **14/14**,
`grade-board` **15/15**. Unit **73/73**. Browser `board-release`
(moderate 3 → assemble → approve → release → student sees official;
pre-release student sees nothing) **1/1** on fresh migrated + seeded
browser DB with rebuilt apps (390px, keyboard/focus, no overflow,
empty localStorage).

`backup:test`, manual screen-reader/WSL replay, remote CI, Vercel
route check, production policy approval, and human walkthrough remain
**not verified**. Detail in [NOTE-PH7-006](NOTE-PH7-006.md).
```

Run: `git diff --check` Expected: clean.

- [ ] **Step 2: Fix PHASE-7 review header + remaining gates**

In `development/docs/learning/PHASE-7-IMPLEMENTATION-REVIEW.md`:
- Line 3-6: replace `implemented in development/ on local main (uncommitted; human review pending)` with `implemented in development/ on local main (slices 1-6 committed in 474ec0f; human review pending)`.
- Lines 66-73 `## Remaining gates`: replace `Slices 6–7 unimplemented (release/student view, amendment)` with `Slice 7 (amendment) unimplemented; slice 6 committed (see NOTE-PH7-006)`.

- [ ] **Step 3: Fix DESIGN-INDEX line 30**

Replace `Phase 7 slices 1–2 review (2026-09-25, uncommitted)` + `validation queue (slice 3) not started` with `Phase 7 slices 1–6 review (2026-09-27, committed in 474ec0f)` + `amendment (slice 7) not started`.

- [ ] **Step 4: Verify docs**

Run: `git diff --check` Expected: clean. No code behavior changed.

### Task 2: Cleanup tmp scripts + student <main> landmark

**Files:**
- Delete: `development/scripts/tmp-mkdb.mjs`, `development/scripts/tmp-withdb.mjs`, `development/scripts/tmp-serve.mjs`, `development/scripts/tmp-probe.mjs`
- Modify: `development/apps/web/app/student/results/page.tsx:55-61`, `development/apps/web/app/student/page.tsx` (wrap in `<main>`)
- Modify: `development/tests/browser/board-release.spec.ts` (replace text-count assertions with `page.locator("main")` scoped assertions after landmark added)

**Interfaces:**
- Consumes: none.
- Produces: Clean tree; landmarked student pages for Task 5 browser rerun.

- [ ] **Step 1: Delete tmp helpers**

```bash
Remove-Item -LiteralPath "development/scripts/tmp-mkdb.mjs"
Remove-Item -LiteralPath "development/scripts/tmp-withdb.mjs"
Remove-Item -LiteralPath "development/scripts/tmp-serve.mjs"
Remove-Item -LiteralPath "development/scripts/tmp-probe.mjs"
```

Note: e2e/browser runs in Task 5 must create fresh DBs via `psql`/`prisma migrate deploy`, not these helpers.

- [ ] **Step 2: Add <main> landmark to student results page**

In `development/apps/web/app/student/results/page.tsx`, wrap the returned fragment in `<main>`:

```tsx
return (
  <main>
    <PageHeader ... />
    ...
  </main>
);
```

- [ ] **Step 3: Add <main> landmark to student home**

Read `development/apps/web/app/student/page.tsx`, wrap its returned content in `<main>` the same way.

- [ ] **Step 4: Update board-release spec to use main-scoped assertions**

In `development/tests/browser/board-release.spec.ts`, replace bare `getByRole("alert")` / text-count assertions on student pages with `page.locator("main").getByRole(...)` / `page.locator("main").getByText(...)` scoped versions.

- [ ] **Step 5: Verify**

Run: `npm run typecheck` Expected: exit 0. Run: `npm run lint` Expected: warnings-only, no errors.

### Task 3: Fix slice-5 decidePackage replay-after-success (409 on retried key)

**Files:**
- Modify: `development/apps/api/src/assessment/assessment.service.ts:2378-2470` (`decidePackage`)
- Test: `development/apps/api/test/grade-board.e2e-spec.ts` (add replay-after-success test)

**Interfaces:**
- Consumes: `command()` idempotency-replay pattern from `releaseResults` (`assessment.service.ts:2501-2535`): replay lookup runs before guarded write; gates live INSIDE `fn()` after row lock + convergence branch.
- Produces: Idempotent board decisions for Task 4 amendment (which reuses `command()`).

- [ ] **Step 1: Write the failing test**

Append to `development/apps/api/test/grade-board.e2e-spec.ts`:

```ts
it('replays a decided package on retried key instead of 409', async () => {
  const pkg = await assemble(lecA).expect(201);
  const id = (pkg.body as { id: string }).id;
  const v = (pkg.body as { version: number }).version;
  const k = key();
  await decide(exam, id, { idempotencyKey: k, version: v, to: 'APPROVE_FOR_RELEASE' }).expect(201);
  await decide(exam, id, { idempotencyKey: k, version: v, to: 'APPROVE_FOR_RELEASE' }).expect(201);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: fresh DB + `npx vitest run apps/api/test/grade-board.e2e-spec.ts -t "replays a decided package"`
Expected: FAIL with 409 REQUEST_CLOSED (gates outside `command()` hit flipped status before replay lookup).

- [ ] **Step 3: Move decidePackage gates inside command() after row lock**

Current shape (lines 2387-2426): NOT_FOUND + SYSADMIN + examiner + SoD + outcome allow-list + reason/condition demands run BEFORE `this.command()`. Only 404/role/scope stay outside (releaseResults pattern lines 2502-2511).

Restructure `decidePackage` to:

```ts
async decidePackage(auth, key, id, version, to, reason?, conditions?) {
  const found = await this.prisma.resultPackage.findUnique({ where: { id } });
  if (!found) this.fail('NOT_FOUND', 'Result package not found.', 404);
  if (auth.activeRole === 'SYSADMIN') this.denied();
  await this.examiner(auth, found.periodCode);
  return this.command(auth, key, 'DecideResultPackage', { id, version, to }, async (db) => {
    await db.$queryRaw`SELECT id FROM "ResultPackage" WHERE id = ${id} FOR UPDATE`;
    // Convergence: retried key after success returns stored decision.
    const replay = await this.replayHit(db, auth, key); // use existing helper if present; else query CommandEvent by key
    if (replay) return { body: this.packageView(replay.resultPackage) };
    const live = await db.resultPackage.findUniqueOrThrow({ where: { id } });
    // SoD + outcome + reason/condition gates moved here (after lock, before write):
    if (live.preparedByAccountId === auth.accountId) throw new HttpException({ code: 'SOD_VIOLATION', ... }, 403);
    if (!(BOARD_DECISIONS as readonly string[]).includes(to)) this.fail('INVALID_TRANSITION', ..., 400);
    ...
    this.checkVersion(live, version);
    if (live.status !== 'ASSEMBLED') this.fail('REQUEST_CLOSED', ..., 409);
    ...
  });
}
```

Keep exactly: 404 outside; SYSADMIN deny + examiner scope outside; SoD + outcome + reason/condition INSIDE after lock. Follow `releaseResults` convergence comment block verbatim style.

- [ ] **Step 4: Run test to verify it passes**

Run: same vitest filter Expected: PASS. Then full `grade-board` suite 16/16 (15 + new) on fresh DB.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/assessment/assessment.service.ts apps/api/test/grade-board.e2e-spec.ts
git commit -m "fix(assessment): idempotent board-decision replay after success"
```

### Task 4: Slice 7 amendment skeleton (TASK-PH7-007 + code + tests + UI + docs)

**Files:**
- Create: `development/docs/task-packets/TASK-PH7-007.md`
- Create: `development/prisma/migrations/20260928090000_ph7_amendment/migration.sql`
- Modify: `development/prisma/schema.prisma` (add `ResultAmendmentCase` + `AcademicImpactTask`)
- Modify: `development/apps/api/src/assessment/dto.ts` (add `AMENDMENT_DECLARATION`, `RequestAmendmentDto`, `DecideAmendmentDto`)
- Modify: `development/apps/api/src/assessment/assessment.service.ts` (add `requestAmendment`, `decideAmendment`, `listAmendments`, `amendmentDetail`; extend `studentResults` to serve current version only)
- Modify: `development/apps/api/src/assessment/assessment.controller.ts` (add `POST /amendments`, `GET /amendments`, `GET /amendments/:id`, `POST /amendments/:id/decide`)
- Modify: `development/packages/contracts/src/assessment.ts` (add `AmendmentCaseView`, `AmendmentCaseDetailView`, `AcademicImpactView`)
- Modify: `development/apps/web/app/api/assessment/[[...path]]/route.ts` (allowlist `amendments` read+write)
- Modify: `development/apps/web/app/admin/assessment/packages/[id]/page.tsx` + `forms.tsx` (amendment request/decide section)
- Modify: `development/apps/web/app/student/results/page.tsx` (show superseded history note: current official + prior version count)
- Create: `development/apps/api/test/grade-amendment.e2e-spec.ts` (~12 tests)
- Create: `development/tests/browser/result-amendment.spec.ts` (request → approve → student sees amended total)
- Create: `development/docs/learning/NOTE-PH7-007.md`
- Modify: `development/docs/learning/PHASE-7-IMPLEMENTATION-REVIEW.md` (add slice-7 row), `development/docs/learning/VERIFICATION.md` (append slice-7 section)

**Interfaces:**
- Consumes: `OfficialCourseResult` rows (immutable; `@@unique([offeringRef, periodCode, studentRef, version])`); `command()` + row-lock + audit + outbox patterns from Tasks 1-3; `examiner()` PERIOD-matched gate + `reader()` gate; `policy.passMark`.
- Produces: `AmendmentCaseView { id, packageId, studentRef, status, version, reason, evidence, correctedTotal, correctedOutcome, requestedBy, decidedBy, createdAt, decidedAt }`; `ReleaseView` unchanged; student view serves latest RELEASED version per student.

Amendment state machine: `OPEN → APPROVED | DECLINED`; approving a case writes a NEW `OfficialCourseResult` row (version = max existing + 1, status RELEASED, `supersedesId` trace link) + `OfficialResultAmended` outbox + `AcademicImpactTask` row (progression recalculation stub per DS5 §18/roadmap proof). Original row keeps status RELEASED with `supersededBy` trace (never edited, never deleted). Student view filters to latest version per (offering, period, student).

Authz: requester LEC/COORDINATOR in offering scope (reuse `submitter`); approver EXAMINATIONS_OFFICER PERIOD-matched four-eyes (decider ≠ requester, reuse SoD shape); moderator/tutor/sysadmin/moodle-admin/student denied on writes; students 403 everywhere except own view; expired grants fail safe; CSRF; idempotent keys; version-checked transitions.

- [ ] **Step 1: Write TASK-PH7-007 packet**

Create `development/docs/task-packets/TASK-PH7-007.md` following TASK-PH7-006 shape (authority/ownership, user outcome/boundaries, policy/demo scope, state authz/failure/recovery, proof/docs, out-of-scope, completion). Controlling sources: roadmap slice 7; DS5 §18; Lecturer/Tutor III §§9.1-9.3; Journey C amendment leg; perms §§15.6-15.7,15.19; recovery §§16.5,16.7; SCR-DEC-ASM-001; TEST-E2E-ASM-001 + TEST-E2E-EXM-007; TEST-REC-005/010. Depends on TASK-PH7-006. Out of scope: GPA/progression engine (stub impact task only), appeal route, real notifications.

- [ ] **Step 2: Write the failing e2e (RED)**

Create `development/apps/api/test/grade-amendment.e2e-spec.ts` with helpers copied from `grade-release.e2e-spec.ts:59-120` (assemble/decide/release/provisionCandidates/fullyModeratedScope/studentUser). First test only:

```ts
it('requests an amendment case on a released result', async () => {
  // ... release a package for s1 ...
  const res = await post('/amendments', { idempotencyKey: key(), packageId, studentRef: s1.ref, correctedTotal: 72.5, reason: 'Verified clerical error: FINAL-EXAM 68 misrecorded as 66.', evidence: 'remark-slip-001' }, lecA).expect(201);
  expect((res.body as { status: string }).status).toBe('OPEN');
});
```

Run on fresh DB: FAIL with 404 (no route).

- [ ] **Step 3: Migration + schema**

`migration.sql`:

```sql
CREATE TABLE "ResultAmendmentCase" (
  "id" TEXT PRIMARY KEY,
  "packageId" TEXT NOT NULL REFERENCES "ResultPackage"("id") ON DELETE RESTRICT,
  "offeringRef" TEXT NOT NULL,
  "periodCode" TEXT NOT NULL,
  "studentRef" TEXT NOT NULL,
  "supersedesId" TEXT REFERENCES "OfficialCourseResult"("id") ON DELETE RESTRICT,
  "correctedTotal" DOUBLE PRECISION NOT NULL,
  "correctedOutcome" TEXT NOT NULL DEFAULT 'PASS',
  "reason" TEXT NOT NULL,
  "evidence" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "version" INTEGER NOT NULL DEFAULT 1,
  "requestedByAccountId" TEXT NOT NULL,
  "decidedByAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "ResultAmendmentCase_package_student_version" ON "ResultAmendmentCase"("packageId", "studentRef", "version");
CREATE TABLE "AcademicImpactTask" (
  "id" TEXT PRIMARY KEY,
  "amendmentCaseId" TEXT NOT NULL REFERENCES "ResultAmendmentCase"("id") ON DELETE RESTRICT,
  "studentRef" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'PROGRESSION_RECALC',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "detail" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Schema additions mirror the SQL with `@@unique([packageId, studentRef, version])`. Run `prisma generate`.

- [ ] **Step 4: DTOs + contracts**

`dto.ts`:

```ts
export const AMENDMENT_DECLARATION = 'I confirm that this official-result amendment is complete for its student and I submit it within my assigned authority.';
export class RequestAmendmentDto extends KeyDto {
  @IsUUID() packageId!: string;
  @IsString() @IsNotEmpty() @MaxLength(64) studentRef!: string;
  @Type(() => Number) correctedTotal!: number;
  @IsString() @IsNotEmpty() @MaxLength(1000) reason!: string;
  @IsOptional() @IsString() @MaxLength(1000) evidence?: string;
  @IsString() @Equals(AMENDMENT_DECLARATION) declaration!: string;
}
export class DecideAmendmentDto extends KeyDto {
  @Type(() => Number) @IsInt() @Min(1) version!: number;
  @IsString() @IsNotEmpty() to!: string; // APPROVE | DECLINE
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}
```

`contracts/assessment.ts`:

```ts
export interface AmendmentCaseView { id: string; packageId: string; studentRef: string; status: string; version: number; correctedTotal: number; correctedOutcome: string; reason: string; requestedBy: string; createdAt: string; }
export interface AmendmentCaseDetailView extends AmendmentCaseView { decisions: Array<{ to: string; reason: string | null; decidedBy: string; decidedAt: string }>; impacts: AcademicImpactView[]; }
export interface AcademicImpactView { id: string; kind: string; status: string; studentRef: string; }
```

- [ ] **Step 5: Service (minimal to green, then full suite)**

Implement in `assessment.service.ts` after `studentResults`:

```ts
async requestAmendment(auth, key, input) { /* examiner|lecturer/coordinator gate; package must be RELEASED; studentRef must have a RELEASED row; correctedTotal 0-100; create OPEN case version 1 (or next), audit, outbox OfficialResultAmendmentRequested */ }
async decideAmendment(auth, key, id, version, to, reason?) { /* EXAMINATIONS_OFFICER PERIOD-matched four-eyes; row lock + version check; APPROVE writes new OfficialCourseResult (version max+1, supersedesId trace, outcome from passMark) + AcademicImpactTask PENDING + outbox OfficialResultAmended; DECLINE demands reason; idempotent replay; */ }
async listAmendments(auth, filters) { /* reader gate */ }
async amendmentDetail(auth, id) { /* reader gate, neutral 404 */ }
```

Extend `studentResults` to return only the latest version per (offeringRef, periodCode): group rows by offering+period, pick max version.

Full e2e list (~12): request happy-path OPEN; request refusals (unreleased package, unknown student, out-of-range total, bad declaration, tutor/sysadmin/student denied); approve happy-path (new version row, old row preserved, outbox chain, impact task PENDING, student sees amended total); decline demands reason; SoD (requester cannot approve); idempotent replay; racing-approve convergence; neutrals; expired-grant 403.

- [ ] **Step 6: Controller + proxy + UI**

Controller:

```ts
@Post('amendments') @UseGuards(CsrfGuard) requestAmendment(@Req() r, @Body() dto: RequestAmendmentDto) { return this.assessment.requestAmendment(r.auth, dto.idempotencyKey, dto); }
@Get('amendments') amendments(@Req() r, @Query() q) { return this.assessment.listAmendments(r.auth, q); }
@Get('amendments/:id') amendment(@Req() r, @Param('id', ParseUUIDPipe) id: string) { return this.assessment.amendmentDetail(r.auth, id); }
@Post('amendments/:id/decide') @UseGuards(CsrfGuard) decideAmendment(@Req() r, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DecideAmendmentDto) { return this.assessment.decideAmendment(r.auth, dto.idempotencyKey, id, dto.version, dto.to, dto.reason); }
```

Proxy `apps/web/app/api/assessment/[[...path]]/route.ts`: add `amendments` to read+write allowlists. Package detail page: amendment request form (examinations/lecturer/coordinator only, exact declaration checkbox) + case list + decide form. Student results page: show `Amended — version N` note when >1 version exists.

- [ ] **Step 7: Browser spec**

Create `development/tests/browser/result-amendment.spec.ts`: release → student sees total 68.8 → request amendment → approve → student sees amended total; pre-approval student still sees original. 390px, keyboard/focus, no overflow, empty localStorage. 1/1.

- [ ] **Step 8: NOTE-PH7-007 + review + docs**

Create `NOTE-PH7-007.md` (what built/why, frontend/backend/db/security/tests/failures/questions — same shape as NOTE-PH7-006). Add slice-7 row to `PHASE-7-IMPLEMENTATION-REVIEW.md` table. Append VERIFICATION slice-7 section.

- [ ] **Step 9: Run full slice-7 proof**

Fresh DB `sis_ph7_s7_test`: `grade-amendment` 12/12; regressions plan 20/20, staging 18/18, validation 13/13, moderation 14/14, board 16/16 (incl. Task 3 replay test), release 15/15 — each on its own DB. Unit 73+/73+. Typecheck 0, lint warnings-only, API dist + web build 0, browser amendment 1/1.

- [ ] **Step 10: Commit**

```bash
git add <all slice-7 files>
git commit -m "feat(assessment): result amendment skeleton with supersede history and impact task"
```

### Task 5: Final verification + handoff

**Files:** none (evidence only).

- [ ] **Step 1: Run repo checks**

Run in order: `npm run typecheck` (exit 0); `npm run lint` (warnings-only); `npm test` (unit green); `npm run test:scripts` (6/6); `npm run scan` (exit 0); `npm run build` (exit 0).

- [ ] **Step 2: Run API e2e sequential on fresh isolated DBs**

One DB per suite (parallel shared-DB runs collide): plan, staging, validation, moderation, board, release, amendment. Record counts in VERIFICATION.

- [ ] **Step 3: Run browser suite on fresh migrated + seeded browser DB with rebuilt apps**

`assessment-plan`, `validation-queue`, `moderation`, `board-packages`, `board-release`, `result-amendment` — 390px, keyboard/focus, no overflow, empty localStorage.

- [ ] **Step 4: Run backup:test**

Run: `npm run backup:test` on an isolated scratch DB (never the shared `sis` DB without a dump first). Record table counts + orphan checks.

- [ ] **Step 5: Self-review**

Spec coverage: roadmap slices 1-7 → tasks above. Placeholder scan: no TBD/TODO. Type consistency: `AmendmentCaseView` field names match service + contracts + UI.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-10-01-phase-7-closeout.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - execute tasks in this session, batch execution with checkpoints

User pre-authorized full completion in build mode: proceeding **Inline**.
