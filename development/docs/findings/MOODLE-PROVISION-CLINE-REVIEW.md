# Verification: Cline Moodle provisioning implementation (2026-10-23)

Scope: work-in-progress tree at `/home/hangoma/SIS-INTEGRATED-WITH-MOODLE` (HEAD `c3141b7`).
Design: `development/docs/superpowers/specs/2026-10-22-moodle-access-provisioning-delegation-sso-gradepassback-design.md`.

## What exists (uncommitted, written by Cline)

| Area | Files | State |
|---|---|---|
| Schema models | `prisma/schema.prisma` (`MoodleProvisionRequest`, `MoodleProvisionRequestItem` + relations) | Present, `prisma validate` passes |
| Migration | `prisma/migrations/20261023120000_moodle_provision_requests/` | Present, **out of sync with schema** |
| Provision service | `apps/api/src/integration/moodle-provision.service.ts` | Partial, **inert** |
| Provision controller | `apps/api/src/integration/moodle-provision.controller.ts` | **Does not compile** |
| Launch service | `apps/api/src/integration/moodle-launch.service.ts` | Partial, **non-functional** |
| Module wiring | `integration.module.ts` | Present |
| Capabilities/authority seed | `prisma/seed/capabilities-scopes-sod.ts` (`moodle:provision`, `moodle:launch`, `moodle:grade-sync`; SYSADMIN/HOD/LEC authorities) | Present |
| Tests | — | **None** |
| Admin/student UI | — | **None** |
| Grade sync | — | **Not started** |
| Delegation UI | — | **Not started** |

Unrelated in the same tree: registration warning-copy changes (`registration.service.ts`, course-plan e2e, `board.tsx`, `register/form.tsx`, browser spec). These are prior work, not part of this feature.

## Defects found

### Blocking
1. **TypeScript build fails.** `moodle-provision.controller.ts:35` injects `private readonly launch: MoodleLaunchService` while also declaring method `launch()` → `TS2300 Duplicate identifier 'launch'` (x2). `npx tsc --noEmit -p apps/api/tsconfig.json` fails.
2. **Migration drift.** `MoodleProvisionRequestItem` in `schema.prisma` has `revokedAt` and `revokeReason`; `migration.sql` does not create those columns. A migrated database will not match the Prisma client.
3. **Provisioning never delivers.** `createProvisionRequest()` writes request + items but enqueues **no** `OutboxEvent` and sets no `outboxId`. Items stay `WAITING` forever; nothing reaches the adapter or Moodle. The feature has no effect.
4. **`idempotencyKey` accepted and ignored.** Duplicate submissions create duplicate requests; the repo's `IdempotencyKey` pattern is not used.

### Authorization
5. **`GET /moodle/provision`, `GET /moodle/provision/:id`, `POST /moodle/provision/:id/revoke` have no capability check.** `SessionGuard` only proves *some* session. Any signed-in user (including a student) can list every provision request (with student numbers) and revoke them.
6. **Student search scope filter is a no-op.** For non-`SYSTEM` actors the code sets `where.attempts = { some: { offering: { programme: {} } } }` — an empty `programme` filter matches everything. Scope isolation is not implemented, so an HOD can see all students.
7. **Launch endpoint trusts client-supplied `studentId`.** Any authenticated account can mint a launch token for any other student.
8. **Scope is taken from the caller's session, not the request target.** `create()` passes `r.auth.scopeType/scopeRef`; `resolveScope` then re-resolves the caller's own scope. Staff cannot act on a child scope, and hierarchy (parent authority over child) is unsupported — `roleAssignment.scopeId` must equal the target exactly.
9. **`ApproverAuthority` is misused as an execution check** rather than grant authority, and is queried only for the exact scope (no ancestor walk).

### Launch / SSO correctness
10. **`verifyLaunchToken()` can never succeed.** It requires 3 `.`-separated parts; `createLaunchToken()` emits 2 (`payload.signature`).
11. **Access still uses an arbitrary 5-minute TTL**, contradicting the agreed entitlement-based design (`validityPolicy` / `validUntil` / `revokedAt` are never checked).
12. **No real deep link.** The endpoint returns a JSON token; nothing consumes it, no Moodle URL is produced, and no redirect occurs. There is no SSO.
13. **No single-use/nonce enforcement**, no `validUntil`/student-status/registration-state check at launch.

### Revocation and lifecycle
14. **Revoke only flips DB state.** It does not suspend the Moodle enrolment (spec: suspend, retain history) and does not enqueue an outbox event.
15. **`validUntil` is never derived** from `validityPolicy`; per-item policy columns from the spec are absent.
16. **No expiry sweep.** `THIS_PERIOD` / `ACADEMIC_YEAR` items never lapse.

### Search and data integrity
17. **Controller ignores all query filters.** `searchStudents()` returns no registered courses, despite the requirement to assign per registered course.
18. **`studentIds[i]` ↔ `courseRegistrationIds[i]` positional pairing** — no validation that the registration belongs to that student or is in a registrable state.
19. **`MoodleProvisionRequest.requestId` duplicates `id`** (`@unique`, set to the same value) — redundant key.
20. **Scope columns from the spec (`scopeType`, `scopeRef`, `scopeId`) and `reason` are missing** from the request model, so no scope/reason is recorded on the record itself.

### Model mismatch (design-level, needs a decision)
21. **Delivery granularity.** Existing `IntegrationService.deliverEnrolment()` enrols per `registrationId` + `attemptId` + `period` into an **offering shell**, not per `CourseRegistration`/course. The new per-course item model does not line up with the existing delivery path. Course-level assignment needs either a course-level shell/enrolment path or an explicit mapping of course → shell.

## Verdict

Baseline only. Schema and seed scaffolding are usable; the controller, service, launch flow and delivery path are not. Nothing is tested, nothing is wired to the worker, and every endpoint either fails to compile or lacks the authorization the spec requires. Proceeding to repair before extending.

Repair order: build → migration → authorization → delivery wiring → entitlement launch → search/filters → revocation/expiry → UI → grade sync → delegation → tests.
