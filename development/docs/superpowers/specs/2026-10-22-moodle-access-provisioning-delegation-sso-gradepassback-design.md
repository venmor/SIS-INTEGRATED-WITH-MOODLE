# Design: Moodle access provisioning, delegation, SSO launch, and grade passback (2026-10-22)

> Status: draft for review. No code changes yet.  
> Repo: `/home/hangoma/SIS-INTEGRATED-WITH-MOODLE/development`  
> Handbook authority: follow `unza-sis-moodle-design-handbook-v3.0.0/` (supersession/readiness registers). Exact approved evidence takes precedence.

## Goal
Make Moodle access assignable by authorised staff with flexible search/filters, support single-student+course and cohort/bulk assignment, delegate authority by institutional hierarchy (configurable/policy-driven), enable SSO deep-link launch from SIS (student dashboard/courses) to specific Moodle course/activity, and establish a safe grade passback pipeline (automatic sync with guardrails; never auto-publish as official).

## Current state (from inventory)
- **Provisioning/delivery**: event-driven via `OutboxEvent` + `IntegrationService`/worker; adapters (`SimulatorAdapter` vs `LiveMoodleAdapter`). Live adapter **refuses** domain writes (enrol/create/group/staff) — only `core_webservice_get_site_info` implemented. Simulator is demo path.
- **No existing admin UI/API** to “assign Moodle access” ad-hoc by searching students/rosters with filters; no bulk/cohort assignment controller.
- **SSO/LTI/launch**: none implemented in app code; handbook says **LTI 1.3/LTI Advantage planned** for contextual launch/role-aware access.
- **Grades**: **manual staging only** via `POST /assessment/batches` (`stageBatch`) creating `GradeBatch`/`GradeLine` with frozen coords, validation/findings, moderation/official CA; **no automatic pull/push** implemented.
- **Delegation/RBAC**: `RoleAssignment`, `Capability`, `Scope` (hierarchy), `CapabilityScope`, `ApproverAuthority`, `SoDPair` exist with enforcement in `GrantsService`/`PolicyService`/guards. UI at `apps/web/app/admin/grants/`; grantor roles limited by `SECURITY_V1.grantorRoles` (currently `["SYSADMIN"]`). Scoping exists but not uniformly applied to all lists.
- **Student search**: no staff-facing student search/list with filters found; `admin/records` exists but not the required roster search.

## Requirements (agreed)
1. **Search students by many filters** (admin/staff UI) to find students to provision.
2. **Assign Moodle access to any student or a group of students taking the same courses after registration** (single+courses or bulk/cohort).
3. **Courses registered are synced to Moodle** for assigned students.
4. **From studies dashboard, click a button to open Moodle directly without logging in twice** (SSO deep-link). Access is entitlement-based and persists based off of the selected policy (e.g. until semester ends, until end of academic year, or while enrolled) rather than a short-lived token.
5. **Grade changes from one course automatically change in SIS as well** (grade passback with guardrails; results not official until review/moderation).
6. **Admin can assign that function to any staff that qualifies per university structure** (e.g. Moodle Admin, Lecturer, HOD of certain school) — **configurable per policy** (ApproverAuthority/Capabilities/Scopes).

## Non-negotiable constraints
- **Fail-closed/security**: delegation uses `ApproverAuthority` + `Capability` + `Scope` hierarchy; SoD respected; audit all actions. Official records (registration/results/grades becoming official) never edited implicitly.
- **Authority precedence**: handbook supersession/readiness; exact approved evidence active. Demo-only config not institutional approval.
- **Idempotent/auditable**: provisioning actions produce audit events; outbox/idempotency preserved; replay/reconciliation paths unchanged.
- **No secrets logged**: SSO tokens/launch secrets never logged.
- **Existing flows intact**: live-test run fingerprinting, reconciliation, maintenance, incidents, replays remain compatible.

## Design

### 1) Delegated provisioning authority (configurable per policy)
**Model (extend existing):**
- Use `Capability` with names like `moodle:provision:student`, `moodle:provision:course`, `moodle:provision:cohort`, `moodle:launch:sso`, `moodle:grades:sync`. 
- Use `Scope` hierarchy (SYSTEM:GLOBAL, SCHOOL:*, DEPARTMENT:*, PROGRAMME:*, COURSE/OFFERING context as needed). 
- Use `ApproverAuthority` to grant which roles (e.g. `MOODLE_ADMIN`, `HOD`, `DEAN`, `LECTURER`, `COORDINATOR`) can exercise capabilities over target scopes. 
- `RoleAssignment` already supports `capabilities[]`, `scopeId`, `approverId`, `delegationLimit`, `employmentType` — use them.
- **Granting the “provision Moodle access” function**: extend grants UI/API or add a provisioning-delegation screen that uses existing `GrantsService` patterns (policy evaluation, approver authority check, SoD). Grantor set remains policy-driven via `ApproverAuthority` (not hardcoded to SYSADMIN only) — UI must respect the configured approver authority, not just `SECURITY_V1.grantorRoles`.

**Enforcement:** guards/services check live assignment + capability + scope (hierarchy) before provisioning actions.

### 2) Student search & roster (staff-facing)
**Need new API + UI (admin/staff):**
- **Endpoint(s)**: e.g. `GET /admin/students/search` with filters: `q` (name/id/email), `programmeId`, `schoolId/departmentId` (via scope), `academicPeriodId`, `courseCode/offeringId`, `registrationStatus` (REGISTERED/...), `hasMoodleAccess` (true/false/pending), pagination/cursor.
- **Data source**: `Student`, `Person`, `Account`, `CourseRegistration`, `InstitutionalRegistration`, `Course`, `CourseOffering`, `AcademicPeriod`, `Programme`, `Scope`/org units. Must respect staff scope (only students in scopes they’re authorised to manage).
- **UI**: new page under `apps/web/app/admin/moodle/provision/` (or `apps/web/app/admin/students/moodle-provision/`) with filters, results table (selectable), “courses registered” per student, bulk select, assignment panel.

### 3) Provisioning: single + bulk/cohort assignment
**Flow:**
1. Staff searches/selects students and sees their **registered courses** (from `CourseRegistration` for current/selected period).
2. Staff selects target courses (or all registered). 
3. **Choose validity policy**: staff selects `THIS_PERIOD` (until `AcademicPeriod.endDate`), `ACADEMIC_YEAR` (until end of academic year), or `WHILE_ENROLLED` (permanent until student is no longer enrolled/active). This is recorded on the request/items.
4. **Validate authority**: check `moodle:provision:*` for staff’s scope vs student/course scopes.
5. **Create provisioning intent**: record `MoodleProvisionRequest` (new model) with status PENDING/APPROVED/EXECUTING/COMPLETED/FAILED/CANCELLED, requestedBy, scope, studentIds (or cohort criteria), courseRegistrationIds/offeringIds, `validityPolicy` (`THIS_PERIOD|ACADEMIC_YEAR|WHILE_ENROLLED`), `validUntil` (computed), reason, audit.
6. **Enqueue delivery**: create `OutboxEvent`(s) of type `MoodleEnrolmentRequested` (or extend existing) with idempotency key; worker processes via `IntegrationService.deliverEnrolment()` → adapter. For bulk, process in batches with progress/retry. **Ensure persistent enrolment**: where Moodle supports enrolment end dates, set them per policy; otherwise rely on SIS entitlement checks.
7. **Track state**: expose status per student/course (WAITING/QUEUED/DELIVERED/FAILED/REVOKED) in UI; reconciliation compares expected entitlements against actual Moodle enrolments.

**Models (new):**
- `MoodleProvisionRequest` (id, requestedByAccountId, status, scopeType/scopeRef/scopeId, criteriaJson, studentIds Json, courseRefs Json, `validityPolicy` String, `validUntil` DateTime?, reason, metadata, createdAt/updatedAt/completedAt)
- `MoodleProvisionRequestItem` (requestId, studentId, courseRegistrationId/offeringId, state, outboxId, `validityPolicy` String, `validUntil` DateTime?, `revokedAt` DateTime?, `revokeReason` String?, deliveredAt, error, lastCheckedAt) — enables per-item tracking, policy-driven expiry, and revocation history.

**Revocation:** On withdrawal/deregistration/suspension/graduation/no longer registered, emit events to **suspend** enrolments in Moodle (preserve history) and mark items as REVOKED with reason/audit. Reconciliation will also enforce revocation.

**API:** `POST /integration/moodle/provision/requests` (create), `GET /integration/moodle/provision/requests`, `GET /integration/moodle/provision/requests/:id` (with items), `POST /integration/moodle/provision/requests/:id/cancel` (if not executing/completed), all guarded by capability+scope.

**Integration changes:** extend `IntegrationService` to accept provision requests (not only domain events), enqueue outbox with correlation/requestId, update items on delivery, add revocation/suspension paths. Keep existing event-driven paths working.

### 4) SSO deep-link launch (student dashboard/courses)
**Goal:** “click a button from their studies dashboard to open Moodle directly without logging in twice”. Access is **entitlement-based** (persisted until policy expiry/revocation), not a short-lived click token. Prefer **LTI 1.3** per handbook; design for OIDC launch as fallback.

**Architecture:**
- **Entitlement source of truth**: `Student`, `CourseRegistration`, `CourseOffering`, `AcademicPeriod`. Entitlement is valid if student is actively registered for the course in an active period and not withdrawn/deregistered/suspended/graduated/revoked.
- **Launch service**: `MoodleLaunchService` generates a **signed** launch request/JWT bound to (accountId, studentId, courseId/offeringId, moodleCourseRef, nonce, redirectUrl). The JWT does **not** need a 60s expiry to enforce access — access validity comes from real-time entitlement checks. If we need to rotate keys, use standard JWT key rotation.
- **Endpoint**: `GET /student/moodle/launch?courseRegistrationId=...` (or `offeringId`) — authenticated as student. **On every launch click**, validate entitlement against current SIS state (active registration, period valid, not revoked/suspended). If valid, generate signed launch and `302` to Moodle (or return launch form). If not entitled, return 403 with clear reason.
- **LTI 1.3 flow (target):** generate LTI launch request (iss, client_id, deployment_id, target_link_uri to course, login_hint/prompt, lti_message_hint) signed with platform key, POST to Moodle login/initiation or tool launch endpoint; Moodle validates and creates session. Need LTI platform registration config (keys, issuer/audience).
- **Moodle session bridge (if LTI not immediately available):** signed SSO bridge with short-lived nonce/state and **replay prevention**, but the *authorization* is the entitlement check above. Avoid long-lived tokens; prefer single-use nonces.
- **UI changes:** `apps/web/app/student/page.tsx` (dashboard) and `apps/web/app/student/courses/page.tsx` / `apps/web/app/student/moodle-access.tsx` — show **“Open course ↗”** when entitled per policy; show “Access pending”/“Request access” when not provisioned or revoked.
- **Security:** audit every launch (accountId, courseRegistrationId/offeringId, result, reason), nonce replay prevention, state parameter, PKCE if OIDC, fail closed if not entitled. No persistent tokens exposed to client.

**Config:** add `MOODLE_SSO_MODE` (disabled|oidc|lti13), issuer/client/deployment keys, tool URL, launch TTL.

### 5) Grade passback with guardrails (auto-sync, not auto-publish)
**Goal:** grade changes from Moodle automatically change in SIS; **results not official** until review/moderation.

**Pipeline:**
1. **Detection**: scheduled job/worker polls Moodle for grade changes per mapped activity (`GradeActivityMapping` ACTIVE). Track `lastSyncAt`/`sourceRevision` per mapping. Use web services if available; if not, design for webhook/callback.
2. **Staging**: create/update `GradeBatch` with new `sourceRevision` (immutable snapshot). Map Moodle grades to SIS via mapping; resolve students (`resolvedStudentId`). Write `GradeLine` rows.
3. **Validation**: run validation (existing `validateBatch()`) producing `GradeFinding`s (lanes TECHNICAL/ACADEMIC/ENROLMENT), set `resultState` if missing marks.
4. **Review gate**: **never auto-approve/moderate/officialise**. Batches stay in staged/validated states; require lecturer/coordinator/moderator actions via existing moderation flow (`begin/decide`), four-eyes where required. `OfficialCARecord` only created on approved moderation.
5. **Sync strategy**: upsert staging only; if lines change, create new revision/batch or update unsubmitted batch with versioning (respect immutability: don’t edit locked batches). Prefer **new revision** on changes.
6. **Safety**: feature-flag `MOODLE_GRADE_AUTO_SYNC` (default false), per-mapping toggle, dry-run, reconciliation alerts on discrepancies, audit all sync actions.

**Integration:** extend `IntegrationService` with `syncGrades()` called by worker/scheduler; use adapter to fetch grades (add methods to adapter interface, implement in simulator first, live methods **refuse scope** until authorised). Keep `stageBatch` API for manual fallback.

### 6) Admin UI to assign function to qualified staff
- **Grants/workspace**: extend `/admin/grants` or add `/admin/moodle/delegation` to assign `moodle:provision:*` capabilities with scope selection (school/department). Use `ApproverAuthority` to determine who can delegate.
- **Moodle admin workspace**: add “Provision access” tab to `apps/web/app/admin/moodle/` linking to provisioning UI and showing pending requests/status.

## API surface (proposed)
**Admin/Staff (provisioning):**
- `GET /admin/students/search` - student roster search with filters
- `POST /integration/moodle/provision/requests` - create provision request
- `GET /integration/moodle/provision/requests` - list requests
- `GET /integration/moodle/provision/requests/:id` - request details/items
- `POST /integration/moodle/provision/requests/:id/cancel` - cancel request

**Student (launch):**
- `GET /student/moodle/launch` - generate SSO launch to course

**Integration (grades):**
- `POST /integration/moodle/grades/sync` - trigger manual sync (admin/support) or worker scheduled
- `GET /integration/moodle/grades/status` - sync status per mapping

All endpoints require session + capability + scope; audited.

## Data model additions (proposed)
```prisma
model MoodleProvisionRequest {
  id String @id @default(uuid())
  requestedByAccountId String
  requestedBy RoleAssignment? @relation(fields: [requestedByAccountId], references: [id])
  status String @default("PENDING") // PENDING|APPROVED|EXECUTING|COMPLETED|FAILED|CANCELLED
  scopeType String?
  scopeRef String?
  scopeId String?
  scope Scope? @relation(fields: [scopeId], references: [id])
  criteriaJson Json?
  studentIds Json @default("[]")
  courseRefs Json @default("[]")
  validityPolicy String @default("WHILE_ENROLLED") // THIS_PERIOD|ACADEMIC_YEAR|WHILE_ENROLLED
  validUntil DateTime?
  reason String
  metadata Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  completedAt DateTime?
  items MoodleProvisionRequestItem[]
}

model MoodleProvisionRequestItem {
  id String @id @default(uuid())
  requestId String
  request MoodleProvisionRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  studentId String
  student Student @relation(fields: [studentId], references: [id])
  courseRegistrationId String?
  courseRegistration CourseRegistration? @relation(fields: [courseRegistrationId], references: [id])
  offeringId String?
  offering CourseOffering? @relation(fields: [offeringId], references: [id])
  state String @default("WAITING") // WAITING|QUEUED|DELIVERED|FAILED|CANCELLED|REVOKED
  validityPolicy String @default("WHILE_ENROLLED") // THIS_PERIOD|ACADEMIC_YEAR|WHILE_ENROLLED
  validUntil DateTime?
  revokedAt DateTime?
  revokeReason String?
  outboxId String?
  outbox OutboxEvent? @relation(fields: [outboxId], references: [id])
  deliveredAt DateTime?
  error String?
  lastCheckedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([requestId, studentId, courseRegistrationId])
  @@index([requestId, state])
  @@index([studentId, state])
}
```

Also need relations: `RoleAssignment` has many `MoodleProvisionRequest`; `OutboxEvent` has many `MoodleProvisionRequestItem`; `Scope` has many requests; `Student`/`CourseRegistration`/`CourseOffering` relations added.

## Implementation plan (high level)
1. **Authz/delegation** - Extend capability registry and ApproverAuthority checks for Moodle provisioning; update grants UI to allow delegation by policy (respect hierarchy). Add tests.
2. **Student search API/UI** - Implement `GET /admin/students/search` with filters and scope enforcement; add provisioning UI page with selection.
3. **Provisioning flow** - Models/migrations, request creation API, outbox integration, worker updates to track items, status UI.
4. **SSO launch** - `MoodleLaunchService` + launch endpoint + student UI buttons + config/keys + audit; start with signed token bridge if LTI not configured, design for LTI 1.3.
5. **Grade passback** - Adapter grade-fetch methods (sim first), scheduler/worker sync, validation gating (never auto-publish), reconciliation; feature-flagged.
6. **Testing** - unit/integration/e2e, audit tests, scope/SoD tests, fail-closed tests.

## Risks & mitigations
- **Live adapter write scope**: currently refuses domain writes — need to extend carefully with allowlists, tests, and maybe require live-test approval; simulator-first.
- **SSO complexity**: LTI 1.3 requires platform registration; start with signed bridge + feature flag.
- **Grade auto-sync safety**: must never bypass moderation/official CA; use guardrails + flags + review gates.
- **Scope creep/uniform scoping**: enforce scope on search/provisioning first; don't assume global student visibility.
- **Governance**: demo-only not approval; follow handbook gates.

## Acceptance criteria
- [ ] Staff with delegated `moodle:provision:*` can search students by filters and assign access to single student+courses or cohort.
- [ ] Registered courses sync to Moodle via outbox/worker; status visible per student/course.
- [ ] Student dashboard/courses show “Open course ↗” that launches Moodle via SSO/deep-link without separate login (when entitled).
- [ ] Grade changes sync to SIS staging automatically (guardrailed) but never become official without review/moderation.
- [ ] Delegation assignable to qualified staff per university structure via configurable policy (ApproverAuthority/Capabilities/Scopes) with audit.
- [ ] All actions audited, scope/SoD enforced, fail-closed.

## Open questions (to confirm)
1. **LTI vs signed bridge first?** Do we have Moodle LTI platform registration available now, or implement signed SSO bridge first behind flag?
2. **Student search scope**: should staff see all students or only those in their assigned scopes/programmes?
3. **Cohort criteria**: confirm supported filters for bulk (programme+period+year+course offering)?
4. **Grade sync frequency**: polling interval / webhook?
5. **Live Moodle write enablement**: process to enable domain writes in `LiveMoodleAdapter` (allowlist expansion, approvals)?
