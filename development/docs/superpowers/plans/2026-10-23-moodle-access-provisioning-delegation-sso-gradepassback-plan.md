# Moodle Access Provisioning, Delegation, SSO Launch and Grade Passback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authorised staff search students by filters and assign persistent, entitlement-based Moodle access (single or cohort) for registered courses, give students a double-login-free launch into the right Moodle course, and sync Moodle grades into SIS staging without ever auto-publishing them.

**Architecture:** Reuse the existing capability/scope/approver-authority model for delegated provisioning, the existing outbox worker for delivery, the existing simulator-first adapter boundary for Moodle writes, and the existing assessment moderation pipeline for grades. New code adds a provisioning request aggregate, an entitlement resolver, an entitlement-checked launch endpoint, and a grade-sync worker step. Live Moodle writes stay fail-closed behind the adapter allowlist.

**Tech Stack:** NestJS + Prisma/PostgreSQL (`development/apps/api`), Next.js app router (`development/apps/web`), Vitest (`npm test`, `npm run test:e2e`), shared contracts in `development/packages/contracts`.

**Spec:** `development/docs/superpowers/specs/2026-10-22-moodle-access-provisioning-delegation-sso-gradepassback-design.md`

**Baseline review:** `development/docs/findings/MOODLE-PROVISION-CLINE-REVIEW.md` (defects 1–21).

## Global Constraints

- Fail closed: no capa bility, scope, entitlement or approver check means deny.
- Official records (registration, results, `OfficialCARecord`) are never written by provisioning, launch or grade-sync code paths.
- Grade sync stops at staging + validation; moderation/officialisation stays a human action.
- Remove access by suspension, never deletion; history is retained.
- Never log or return Moodle tokens, signing keys or adapter secrets.
- Live adapter domain writes remain refused until an approved enablement task.
- Scoped actors never see or act on students outside their authorised scope hierarchy.
- Every provisioning, revocation and launch attempt writes an audit row, including denials.

## Review Focus

- **Student sees another student's access:** launch must be bound to the signed-in account's own student record; a supplied `studentId` that is not theirs returns 403 and an audit DENY.
- **Revoked student still gets in:** a revoked, expired or withdrawn registration must fail the entitlement check on the very next click, not at the next sync.
- **HOD reaches another school's students:** search results and provisioning must be limited to the actor's scope subtree.
- **Duplicate bulk submit:** double-clicking assign must not create a second request or a second enrolment.
- **Grade appears official without review:** a synced grade must leave the batch in staged/validated state with no official CA record.

---

### Task 1: Restore the build and make migration match schema

**Files:**
- Modify: `development/apps/api/src/integration/moodle-provision.controller.ts`
- Modify: `development/prisma/migrations/20261023120000_moodle_provision_requests/migration.sql`
- Test: `development/apps/api/src/integration/moodle-provision.controller.spec.ts`

**Interfaces:**
- Consumes: `MoodleProvisionService`, `MoodleLaunchService`.
- Produces: `MoodleProvisionController` with injected `provisionService` and `launchService`; routes `POST /moodle/provision`, `GET /moodle/provision`, `GET /moodle/provision/:id`, `POST /moodle/provision/:id/revoke`, `GET /moodle/provision/students/search`, `POST /moodle/launch`.

- [ ] **Step 1: Write the failing test**

```ts
it('exposes provision and launch handlers with distinct names', () => {
  expect(typeof MoodleProvisionController.prototype.createProvisionRequest).toBe('function');
  expect(typeof MoodleProvisionController.prototype.issueLaunch).toBe('function');
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd development/apps/api && npx tsc --noEmit -p tsconfig.json`
Expected: `TS2300 Duplicate identifier 'launch'`.

- [ ] **Step 3: Rename the injected field to `launchService` and the handler to `issueLaunch`; add the two missing item columns to the migration**

Add to the item `CREATE TABLE`: `"revokedAt" TIMESTAMP(3)`, `"revokeReason" TEXT`.

- [ ] **Step 4: Verify**

Run: `cd development/apps/api && npx tsc --noEmit -p tsconfig.json`
Expected: exits 0.
Run: `cd development && DATABASE_URL='postgresql://u:p@127.0.0.1:5432/db' npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$SHADOW_URL" --exit-code`
Expected: exit 0 (no diff).

- [ ] **Step 5: Commit** (`fix(moodle): restore build and align provision migration`)

---

### Task 2: Add request scope, reason and per-item policy to the aggregate

**Files:**
- Modify: `development/prisma/schema.prisma`
- Create: `development/prisma/migrations/<ts>_moodle_provision_scope_and_policy/migration.sql`
- Modify: `development/apps/api/src/integration/moodle-provision.service.ts`

**Interfaces:**
- Produces: `MoodleProvisionRequest.scopeType/scopeRef/scopeId/reason/metadata`; `MoodleProvisionRequestItem.validityPolicy/validUntil`. `deriveValidUntil(policy, period): Date | null` on the service.

- [ ] **Step 1: Failing test** — `deriveValidUntil('THIS_PERIOD', { endDate })` returns `endDate`; `'ACADEMIC_YEAR'` returns the academic-year end; `'WHILE_ENROLLED'` returns `null`.
- [ ] **Step 2: Run and see it fail** (`vitest run src/integration/moodle-provision.service.spec.ts`).
- [ ] **Step 3: Implement** the columns, the migration, and `deriveValidUntil`.
- [ ] **Step 4: Pass** the test and `prisma validate`.
- [ ] **Step 5: Commit.**

---

### Task 3: Enforce capability and scope on every provision endpoint

**Files:**
- Modify: `development/apps/api/src/integration/moodle-provision.service.ts`
- Test: `development/apps/api/src/integration/moodle-provision.service.spec.ts`

**Interfaces:**
- Produces: `requireAuthority(db, auth, capability, targetScopeId)`; `scopeSubtree(scopeId)`; all six service methods call it.
- Consumes: `Scope.parentScopeId`, `ApproverAuthority`, `RoleAssignment` (live, non-revoked, unexpired).

- [ ] **Step 1: Write failing tests**

```ts
it('denies list for a student session', ...);          // 403 MOODLE_PROVISION_DENIED
it('denies revoke without live moodle:provision', ...); // 403
it('allows HOD on a child scope of its school', ...);   // 200
it('denies HOD on another school', ...);                // 403
```

- [ ] **Step 2: Confirm failures** (`vitest run`).
- [ ] **Step 3: Implement** ancestor-scope lookup (recursive CTE or iterative parent walk, max depth guard) and call it from `listProvisionRequests`, `getProvisionRequest`, `revokeProvisionRequest`, `searchStudents`, `createProvisionRequest`. Revocation requires the same capability.
- [ ] **Step 4: Pass.**
- [ ] **Step 5: Commit.**

---

### Task 4: Scope-limited student search with filters and registered courses

**Files:**
- Modify: `development/apps/api/src/integration/moodle-provision.service.ts`
- Modify: `development/apps/api/src/integration/moodle-provision.controller.ts`
- Create: `development/packages/contracts/src/moodle-provision.ts` (export from index)
- Test: `development/apps/api/src/integration/moodle-provision.service.spec.ts`

**Interfaces:**
- Produces: `searchStudents(auth, { q, programmeId, offeringId, periodCode, courseCode, registrationState, hasMoodleAccess, cursor, limit })` → `{ items: Array<{ studentId, studentNumber, status, programmeCode, periodCodes, courses: Array<{ courseRegistrationId, courseCode, courseTitle, state, moodleState }> }>, nextCursor }`.

- [ ] **Step 1: Failing tests** — filters narrow results; out-of-scope student never appears; `hasMoodleAccess=false` excludes a student with a `DELIVERED` item; courses list reflects `CourseRegistration`.
- [ ] **Step 2: Confirm failures.**
- [ ] **Step 3: Implement** a real Prisma `where` with scope subtree, `contains` name/number search, period and course joins, and a `moodleProvisionRequestItem` existence subquery for `hasMoodleAccess`. Controller binds query params explicitly (no `any`).
- [ ] **Step 4: Pass.**
- [ ] **Step 5: Commit.**

---

### Task 5: Make provisioning actually deliver

**Files:**
- Modify: `development/apps/api/src/integration/moodle-provision.service.ts`
- Modify: `development/apps/api/src/integration/outbox-delivery.worker.ts`
- Test: `development/apps/api/src/integration/moodle-provision.delivery.spec.ts`

**Interfaces:**
- Produces: outbox type `MoodleProvisionRequested` with payload `{ provisionRequestId, itemId, studentId, courseRegistrationId, offeringId, periodCode, validityPolicy }`; worker marks item `QUEUED → DELIVERED|FAILED` and the request `COMPLETED` when all items settle.
- Consumes: `IntegrationService.deliverOutbox`, `IntegrationService.provisionShell`, `MoodleAdapter.applyEnrolment`.

- [ ] **Step 1: Failing test** — creating a request enqueues exactly one outbox row per item and sets `outboxId`; running the worker flips items to `DELIVERED` against the simulator and the request to `COMPLETED`.
- [ ] **Step 2: Confirm failure** (today: zero outbox rows).
- [ ] **Step 3: Implement** request creation inside one transaction that writes request + items + outbox rows with an idempotency key, then extend the worker's type switch. Resolve the shell from the offering+period; when no offering is given, derive it from the student's active attempt.
- [ ] **Step 4: Pass.**
- [ ] **Step 5: Commit.**

---

### Task 6: Idempotent submission and child-scope targeting

**Files:**
- Modify: `development/apps/api/src/integration/moodle-provision.service.ts`
- Modify: `development/apps/api/src/integration/moodle-provision.controller.ts`
- Test: `development/apps/api/src/integration/moodle-provision.service.spec.ts`

**Interfaces:**
- Consumes: `IdempotencyKey` model/convention used by `RegistrationService`.
- Produces: `createProvisionRequest(auth, input & { targetScope: { type, ref } })`; repeat calls with the same key return the original request (`replayed: true`).

- [ ] **Step 1: Failing tests** — same `idempotencyKey` twice → one request, second response `replayed: true`; target scope must be inside the actor's subtree; positional `studentIds`/`courseRegistrationIds` mismatch → 400; a registration not belonging to the student → 400.
- [ ] **Step 2: Confirm failures.**
- [ ] **Step 3: Implement** idempotency store + validation.
- [ ] **Step 4: Pass.**
- [ ] **Step 5: Commit.**

---

### Task 7: Entitlement resolver and entitlement-checked launch

**Files:**
- Create: `development/apps/api/src/integration/moodle-entitlement.service.ts`
- Modify: `development/apps/api/src/integration/moodle-launch.service.ts`
- Test: `development/apps/api/src/integration/moodle-entitlement.service.spec.ts`, `moodle-launch.service.spec.ts`

**Interfaces:**
- Produces: `resolveEntitlement(db, { studentId, courseRegistrationId })` → `{ entitled: boolean, reason: 'OK'|'NO_ITEM'|'REVOKED'|'EXPIRED'|'WITHDRAWN'|'PERIOD_CLOSED', item?, moodleCourseRef?, shellRef?, validUntil? }`.
- Produces: `POST /student/moodle/launch` → `302` to the Moodle course URL when entitled; `403` with `reason` otherwise. Launch token is single-use (`nonce` consumed) and carries no arbitrary short TTL — validity comes from the entitlement.

- [ ] **Step 1: Failing tests** — entitled → redirect URL contains the mapped course ref; revoked item → 403 `REVOKED`; `validUntil` in the past → 403 `EXPIRED`; student status not ACTIVE → 403 `WITHDRAWN`; a different student's `studentId` → 403 + audit DENY; replaying a consumed nonce → 403.
- [ ] **Step 2: Confirm failures.**
- [ ] **Step 3: Implement** entitlement resolution and rewrite launch to use it; fix the token format/verification mismatch; bind to `auth`'s own student record for student sessions.
- [ ] **Step 4: Pass.**
- [ ] **Step 5: Commit.**

---

### Task 8: Revocation suspends in Moodle; policies lapse on schedule

**Files:**
- Modify: `development/apps/api/src/integration/moodle-provision.service.ts`
- Create: `development/apps/api/src/integration/moodle-provision-expiry.worker.ts`
- Test: `development/apps/api/src/integration/moodle-provision.revocation.spec.ts`

**Interfaces:**
- Produces: revoke enqueues `MoodleProvisionRevoked`; worker calls `adapter.suspendAccess`; expiry worker revokes items whose `validUntil < now` and marks `REVOKED` with reason `POLICY_EXPIRED`.

- [ ] **Step 1: Failing tests** — revoke enqueues an outbox row and the simulator enrolment becomes `SUSPENDED`, not deleted; expired item is revoked by the worker; audit rows written.
- [ ] **Step 2: Confirm failures.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Pass.**
- [ ] **Step 5: Commit.**

---

### Task 9: Admin provisioning UI

**Files:**
- Create: `development/apps/web/app/admin/moodle/provision/page.tsx`
- Create: `development/apps/web/app/admin/moodle/provision/filters.tsx`
- Create: `development/apps/web/app/admin/moodle/provision/assign.tsx`
- Modify: `development/apps/web/app/admin/moodle/page.tsx` (task link)
- Test: `development/tests/browser/moodle-provision.spec.ts`

**Interfaces:**
- Consumes: Task 4 search, Task 5/6 request endpoints.
- Produces: filter form (query, programme, period, course, access state), result table with per-row course selection, bulk select, validity-policy selector, confirm step showing counts, request status panel.

- [ ] **Step 1: Failing browser test** — HOD signs in, filters to a programme, selects two students, chooses "until period end", confirms, and sees the request in `QUEUED`.
- [ ] **Step 2: Confirm failure** (route missing).
- [ ] **Step 3: Implement** server component + client forms following `admin/moodle/mappings` patterns.
- [ ] **Step 4: Pass.**
- [ ] **Step 5: Commit.**

---

### Task 10: Student launch button

**Files:**
- Modify: `development/apps/web/app/student/moodle-access.tsx`
- Modify: `development/apps/web/app/student/courses/page.tsx`
- Modify: `development/apps/web/app/student/page.tsx`
- Test: `development/tests/browser/student-moodle-launch.spec.ts`

- [ ] **Step 1: Failing browser test** — entitled student sees "Open course ↗" and the request hits the launch route; non-entitled sees "Access not assigned".
- [ ] **Step 2: Confirm failure.**
- [ ] **Step 3: Implement** the button as a form POST to the launch route so the browser follows the redirect.
- [ ] **Step 4: Pass.**
- [ ] **Step 5: Commit.**

---

### Task 11: Grade sync with guardrails (staging only)

**Files:**
- Modify: `development/apps/api/src/integration/moodle-adapter.ts` (`fetchActivityGrades`)
- Modify: `development/apps/api/src/integration/moodle-sim-adapter.ts`
- Modify: `development/apps/api/src/integration/moodle-live.ts` (refuse scope)
- Create: `development/apps/api/src/integration/moodle-grade-sync.service.ts`
- Test: `development/apps/api/src/integration/moodle-grade-sync.spec.ts`

**Interfaces:**
- Produces: `syncGrades({ mappingId })` → creates a new `GradeBatch` revision, runs `AssessmentService.validateBatch`, and **never** calls moderation/officialisation. Gated by `MOODLE_GRADE_AUTO_SYNC` (default false) and capability `moodle:grade-sync`.

- [ ] **Step 1: Failing tests** — sync stages lines; a locked batch is never edited (new revision instead); no `OfficialCARecord` is created; sync is refused when the flag is off; live adapter refuses.
- [ ] **Step 2: Confirm failures.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Pass.**
- [ ] **Step 5: Commit.**

---

### Task 12: Delegation of the provisioning capability

**Files:**
- Modify: `development/apps/web/app/admin/grants/form.tsx`
- Modify: `development/apps/api/src/identity-access/grants.service.ts` (only if the capability list needs exposing)
- Test: `development/apps/api/src/identity-access/grants.service.spec.ts`

- [ ] **Step 1: Failing tests** — SYSADMIN can delegate `moodle:provision` to an HOD scoped to a school; an HOD cannot delegate it; SoD conflict blocks.
- [ ] **Step 2: Confirm failures.**
- [ ] **Step 3: Implement** capability selection in the existing grant form, filtered to what the grantor may delegate.
- [ ] **Step 4: Pass.**
- [ ] **Step 5: Commit.**

---

### Task 13: Verification pass

- [ ] `cd development && npm run lint` (api + web)
- [ ] `cd development && npm test`
- [ ] `cd development && npm run test:e2e`
- [ ] `cd development && npm run build --workspace=@sis/api --workspace=@sis/web`
- [ ] Manual: sign in as HOD, provision, then as the student, launch, then revoke and confirm the launch is refused.
- [ ] Record results in `development/docs/learning/VERIFICATION.md`.

## Notes and open decisions carried from the spec

1. **Delivery granularity (review defect 21):** existing enrolment is shell/offering-level. Task 5 resolves the shell from the offering; per-course granularity needs either course-level shells or an approved course→shell mapping. Confirm before Task 5 ships.
2. **LTI 1.3 vs signed bridge:** Task 7 implements the entitlement-checked signed bridge. LTI platform registration remains a separate approved task.
3. **Live adapter writes** remain refused; enabling them is out of scope and requires approval.
