# Governed Programme Catalogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution or superpowers:subagent-driven-development for per-task implementation/review. Steps use checkbox syntax for tracking.

**Goal:** We create a programme and first intake through staff UI, independently approve/publish it, and start a real applicant draft from its public listing.

**Architecture:** We keep proposed academic/intake versions private in the Catalogue module. Publication projects the first public programme, offering, entry requirements and initial curriculum atomically. Existing Institution Setup and Identity Access remain the source of structure/calendar and authority.

**Tech Stack:** Existing Node 24.21.0, TypeScript, NestJS, Next.js, PostgreSQL/Prisma, shared CSS Modules/UI components, Vitest and Playwright. No new package or paid provider.

**Spec:** [Our approved written design](../specs/2026-10-17-catalogue-authoring-design.md), approved by the user on 17 October 2026.

## Global constraints

- We create a new programme and its first intake only; we do not edit existing programme identities, migrate continuing students or invent qualification/progression approval.
- We use generated demonstration records, `DEMO-CATALOGUE-2026.1`, the existing institution-demo environment gate and exact selected appointments/capabilities from the spec.
- We require three different people/accounts for author, academic approver and publisher. Generic staff roles or navigation links grant no catalogue authority.
- We preserve existing programmes, applications, curricula, registrations, finance, results, timetable history, private credentials and handbook evidence.
- We keep draft data outside the public catalogue tables and reject unsupported admissions/fee/rule combinations before publication.
- We keep writes atomic, audited and idempotent; we preserve unknown-outcome command references and never store passwords in recovery payloads.
- We test only named new isolated databases until a completed, backed-up cloud rollout. No shared database reset.

## Review focus

1. A draft UUID is guessed through detail/compare/guidance/application routes, or a private preview accidentally offers Start application (Tasks 1–4).
2. A subject display label changes or a fee reference looks valid but the published listing cannot support the real applicant form (Tasks 1–3).
3. A future opening or just-passed closing time is interpreted differently by discovery and direct application commands (Task 3).
4. Original author/approver authority expires, source setup/course material changes, or the same person uses another account between review and publication (Tasks 2, 4).
5. Concurrent publication, a failed projection, or a lost response creates duplicate/public partial records or loses the exact receipt (Tasks 2, 4–5).

## Execution workspace and baseline

We use the existing isolated worktree `.worktree/release-student-moodle-20261017`, now on `feat/v2-catalogue-authoring-20261017`, based on main `2016fc5` (tree `5cd729c`). We preserve other worktrees and untracked supervisor/report files. Paths below are relative to `development/`.

We use local PostgreSQL on port 5547 with new database `sis_catalogue_authoring_review_20261017`, and fresh browser/restore databases derived from that name. Operator credentials remain in ignored local environment files. We install from the existing lockfile/cache if dependencies are absent; we do not copy another worktree's generated Prisma client. We build `@sis/config` before the API.

## Task 1: Private academic drafts, typed sources and immutable storage

**Files:**
- Create `docs/task-packets/TASK-V2-CATALOGUE-001.md`, `docs/policies/SYNTHETIC-CATALOGUE-PUBLICATION-POLICY.md`.
- Create `packages/contracts/src/catalogue-authoring.ts`; update `packages/contracts/src/index.ts` and package exports if required by the existing package convention.
- Modify `prisma/schema.prisma`; create `prisma/migrations/20261017120000_catalogue_authoring/migration.sql`.
- Create `apps/api/src/catalogue/authoring-policy.ts`, `authoring-policy.spec.ts`, `authoring-sources.service.ts`, `authoring-authority.service.ts`, `authoring-drafts.service.ts`.
- Create `apps/api/test/catalogue-authoring.e2e-spec.ts`; extend `scripts/backup-test.mjs` only if its current table discovery does not cover the new tables automatically.

**Interfaces:**
- Contracts define `CatalogueAcademicProfile`, `CatalogueIntakeProfile`, `CatalogueAcademicVersionView`, `CatalogueIntakeVersionView`, `CataloguePublicationReceipt`, `CatalogueAuthoringPermissions`, `CatalogueAuthoringSources` and bounded `CatalogueProposalPage`.
- `parseAcademicDraft(raw)` returns `{clientRequestId, proposalId: string|null, expectedVersion, baseActivationId, reason, profile}` with strict allow-list validation and original field/row corrections.
- `CatalogueAuthoringSourcesService.options(actor)` returns only activated-setup unit/campus/period options, supported admission/fee policy references, qualification routes/subjects, and reusable published synthetic curriculum/course material.
- `CatalogueAuthoringAuthorityService.require(db, actor, capability?)` verifies the exact selected live appointment/person/account/session context and environment; `lock(db, actor)` holds the relevant IAM rows for a command.
- `CatalogueAuthoringDraftsService.save(actor, raw)` returns an immutable academic version; `list(actor, query)` returns at most 20 scoped rows plus a signed context-bound cursor; `detail(actor,id)` returns the exact private proposal/version view.

- [ ] Read all task-linked exact Design Sections 4/6/10, applicant discovery/application, coordinator/HoD, permission core/restricted, UI constitution, security, recovery and traceability records completely; record the exact file checklist, lead/reviewer and exclusions in the task packet. Preserve original handbook text.
- [ ] Add parser tests named `rejects_unknown_fields_and_unsupported_subjects`, `requires_rules_for_every_route`, `rejects_duplicate_courses_and_rules`, `retains_original_error_row` and `canonical_digest_is_stable`; assert no executable expressions or arbitrary fee-policy strings are accepted.
- [ ] Add connected tests named `saves_private_version_without_public_rows`, `denies_student_foreign_scope_expired_and_unselected_assignments`, `source_choices_require_current_activation`, `draft_replay_is_actor_assignment_and_payload_bound` and `history_pages_twenty_with_stable_order`.
- [ ] Run the focused new tests and retain the expected RED results before implementation.
- [ ] Add private models `DemoCatalogueProposal`, `DemoCatalogueAcademicVersion`, `DemoCatalogueSubmission`, `DemoCatalogueAcademicDecision`, `DemoCatalogueIntakeDraft` and `DemoCataloguePublication`. Apply foreign keys, target/version/request uniqueness, immutable-payload/receipt protection and indexes for scoped bounded history. Add nullable public source references, offering opening timestamp and typed subject reference needed by Tasks 2–3; legacy rows remain compatible.
- [ ] Implement the parsers, source reads, authority checks and immutable save/read methods. Use configured unit references instead of a compulsory school/department hierarchy. Derive public names only when later projecting the selected source version.
- [ ] Run parser and connected draft tests, Prisma generation/validation and a fresh migration application. Expected: all focused cases pass and no public programme/offering/rule rows are created by Save.
- [ ] Record the evidence and commit only the named task files after those checks pass.

## Task 2: Independent academic review, intake configuration and atomic publication

**Files:**
- Create `apps/api/src/catalogue/authoring-decisions.service.ts`, `authoring-publication.service.ts`, `authoring.controller.ts`.
- Update `apps/api/src/catalogue/catalogue.module.ts` and Task 1 contracts/parsers as required by these exact commands.
- Extend `apps/api/test/catalogue-authoring.e2e-spec.ts`; create `apps/api/test/catalogue-publication-recovery.e2e-spec.ts`.

**Interfaces:**
- `submit(actor, versionId, {clientRequestId, contentDigest})` records the exact current academic review target.
- `review(actor, versionId, {clientRequestId,contentDigest,decision:'APPROVE'|'RETURN',reason,reviewed,password})` returns the immutable academic decision.
- `saveIntake(actor, {clientRequestId,academicDecisionId,expectedVersion,reason,profile:CatalogueIntakeProfile})` returns an immutable intake version.
- `preview(actor,intakeId)` returns exact approved academic/intake data, public preview, source freshness and current publication blockers; it never exposes applicant actions.
- `publish(actor,intakeId,{clientRequestId,contentDigest,reviewed,password})` returns `CataloguePublicationReceipt` containing exact proposal/version/decision/intake/public programme/offering/curriculum references and publication time.
- `receipt(actor,action,clientRequestId)` reconciles only that actor/assignment's exact command. Changed payload/context cannot borrow a receipt.
- Controller endpoints: `GET /catalogue/authoring/{permissions,sources,proposals}`, `POST /catalogue/authoring/proposals`, `GET /catalogue/authoring/proposals/:id`, `POST /catalogue/authoring/versions/:id/{submit,review}`, `POST /catalogue/authoring/intakes`, `GET /catalogue/authoring/intakes/:id/preview`, `POST /catalogue/authoring/intakes/:id/publish`, `GET /catalogue/authoring/receipts/:action/:clientRequestId`.

- [ ] Add failing connected tests for return/successor/reapproval, self/alternate-account approval denial, publisher independence, invalid password, stale version/digest, revoked/expired original author or reviewer, and changed setup/course/policy source.
- [ ] Add failing tests `publication_projects_complete_initial_records`, `publication_failure_rolls_back_every_projection`, `concurrent_publish_returns_one_public_intake`, `competing_programme_code_is_never_overwritten`, and `same_reference_recovery_returns_exact_receipt`.
- [ ] Implement separate review and intake commands using the Task 1 authority/parser contracts, current source comparison, action-bound password reconfirmation and short locked transactions. Keep review and publication receipts append-only.
- [ ] Implement publication with one domain transaction/lock: recheck all authority and source state, create the first Programme/ProgrammeOffering/RequirementRule/CurriculumVersion/CurriculumCourse projection and source lineage, then write receipt, audit and owned outbox event. A failure anywhere rolls everything back. Do not create a Moodle enrolment, admission offer or institutional signoff.
- [ ] Add controller session/CSRF guards, no-store responses, bounded read/write/password rate limits and correlated deny audit without payload/password disclosure. Foreign private IDs return neutral errors.
- [ ] Run both connected suites against the isolated migrated database. Expected: allow, denial, concurrency, rollback and recovery cases pass; draft/privacy counts remain unchanged before publication.
- [ ] Record checks and commit the reviewed Task 2 files.

## Task 3: Published catalogue and actual applicant compatibility

**Files:**
- Create `apps/api/src/catalogue/offering-window.ts`, `offering-window.spec.ts` as an explicit reusable catalogue read contract.
- Modify `apps/api/src/catalogue/catalogue.service.ts`, `apps/api/src/admissions/applications.service.ts`.
- Extend `packages/contracts/src/catalogue.ts` only with compatible optional metadata where needed.
- Extend `apps/api/test/catalogue.e2e-spec.ts` and `apps/api/test/applications.e2e-spec.ts`; add `apps/api/test/catalogue-applicant-handoff.e2e-spec.ts` for the new full handoff.

**Interfaces:**
- `effectiveOfferingAvailability({availability,applicationOpenAt,deadline},now)` derives OPEN/SOON/CLOSED/RETIRED consistently; `canApplyToOffering(offering,now)` requires effective OPEN and a future closing deadline.
- New entry rules use an explicit typed subject reference; applicant subject-result matching uses it with a deliberate compatibility fallback for legacy labels. Staff cannot turn an arbitrary display label into executable eligibility logic.
- New catalogue-origin programmes retain the exact supported admissions-policy/fee reference and publication lineage; `supportsPolicy()` validates that contract while preserving the legacy path's fail-closed behavior.

- [ ] Add failing tests for a future opening, the exact opening instant, a just-passed deadline, explicit CLOSED/RETIRED, and null legacy opening. Assert search/detail/compare/guidance and direct applicant start/change/save/submit agree.
- [ ] Add a connected three-stage publication → public discovery → authenticated applicant start/save test. Assert the actual saved Application points to the new offering and retains the correct requirement/policy fingerprint.
- [ ] Add direct guessed-private-version tests across every public catalogue and application-start path; no draft data or actionable preview escapes.
- [ ] Implement the shared window interpretation and typed subject/policy compatibility. A descriptive title or fee-prefix resemblance is not authority. An unsupported proposal remains private and cannot be published.
- [ ] Run the new handoff/window tests plus existing discovery, application edit/submission and curriculum-conversion/registration regressions. Expected: real application starts for the published supported intake, early/closed requests deny, legacy paths remain correct.
- [ ] Record evidence and commit the Task 3 changes.

## Task 4: Staff authoring, review and publication UI

**Files:**
- Create `apps/web/app/admin/catalogue/page.tsx`, `catalogue-workbench.tsx`, `catalogue.module.css`, `loading.tsx`.
- Create `apps/web/app/admin/catalogue/proposals/[id]/page.tsx`, `academic-editor.tsx`, `academic-review.tsx`, `intake-editor.tsx`, `publication-review.tsx` in this feature directory, split by responsibility.
- Create `apps/web/app/api/catalogue/authoring/[[...path]]/route.ts` with a strict implemented-route/method allow-list.
- Create `apps/web/lib/catalogue-authoring-permissions.ts`; update `apps/web/app/admin/layout.tsx`, `apps/web/lib/workspace-home.ts`, `apps/web/lib/workspace-session.ts`, `apps/web/app/workspaces/page.tsx`, `apps/web/app/admin/staff-breadcrumbs.tsx` and `apps/web/app/navigation-icon.tsx`.
- Create `tests/browser/catalogue-authoring.spec.ts`, `catalogue-authoring-fixture.ts`, `catalogue-authoring.config.ts`.

**Interfaces:**
- `catalogueAuthoringPermissions(active)` consumes the Task 2 guarded permissions endpoint; it returns the three current action flags or an unavailable state, never infers permissions from a title.
- The workbench consumes `CatalogueProposalPage`. The editor/review components consume Task 1–2 typed views and commands. Private previews use the same approved public field projection without Start application.
- Navigation selects `/admin/catalogue` for a catalogue-only appointment and retains explicit safe return links. It does not borrow unselected capabilities.

- [ ] Add failing browser tests for author Save/Submit, reviewer Return/Approve, publisher Save intake/Publish, real public link, and applicant Start application. Use separate people and browser contexts; no test-side insertion of an approval/publication.
- [ ] Add browser tests for field-linked hidden-row errors, retained cross-page course choices, keyboard flow, 390px no-overflow, pending controls, read failure and stale history restart.
- [ ] Add a lost-response test that lets the real publish request commit, hides its response and verifies Check status/same-reference retry returns one receipt. Include account/assignment change denial and absence of passwords in storage.
- [ ] Implement the workbench and four concise editing/review sections with shared cards, tables, icons, controls and clear state/next-action labels. Use bounded course/rule/history lists and progressive disclosure; keep the persistent sidebar/account footer behavior.
- [ ] Implement strict proxy routes, permission-backed sidebar/landing links and neutral denied/unavailable states. Preserve browser routing/session recovery conventions from UI-012/UI-013.
- [ ] Run the actual API+browser scenario on a fresh isolated database, inspect desktop/mobile screenshots, run sampled axe/keyboard checks and record their limits. Expected: a programme is created and published through UI and an actual applicant draft is saved; no browser error/overflow or private-preview action leak.
- [ ] Commit the reviewed Task 4 files after the connected browser checks pass.

## Task 5: Demonstration actors, release evidence and backed-up deployment

**Files:**
- Create `scripts/catalogue-demo-accounts.mjs`, `scripts/catalogue-demo-accounts.test.mjs`, `docs/demo/PROGRAMME-CATALOGUE-WALKTHROUGH.md`, `docs/learning/NOTE-V2-CATALOGUE-001.md`.
- Update `DESIGN-INDEX.md`, `docs/roadmap/MODULE-MATURITY.md` and existing workflow/backup test inventory only where fresh evidence supports the change.
- Store private operator/cloud receipts and backups under ignored `var/`; never include credentials/hashes or backup contents in the public Git tree.

**Interfaces:**
- The account preparer uses the exact existing demo-target gate and the three capabilities from the approved spec. It adds only new matching generated actors and refuses changed credentials, merged people, stale/revoked appointments or unrelated existing usernames. It does not auto-approve a programme.
- The walkthrough identifies all actor logins, the source setup prerequisite, the exact author → reviewer → publisher → applicant steps and recovery behavior. It distinguishes automatic checks, synthetic password confirmation and human/institutional acceptance.

- [ ] Add preparer allow/deny/replay tests, including an unpinned cloud target and an existing changed credential. Implement only additive preparation after the tests are RED.
- [ ] Run parser/unit/script checks, connected catalogue/privacy/recovery tests, catalogue/applicant regression, actual browser story, API/web build/typecheck, configured lint/source scan and backup/restore reconciliation including every new table. Record exact counts, source commit/tree and skipped checks without claiming full v2 completion.
- [ ] Obtain an independent whole-branch code review, address material findings and rerun affected checks. Preserve Charles/Chitundu human acceptance as pending unless actually supplied.
- [ ] Commit/push/merge the verified branch using the user's standing release authorization; require green exact-head CI before merge. Use the authenticated connector if local CLI credentials remain invalid and verify local/remote tree equality.
- [ ] Before cloud schema/data changes, verify the exact demonstration target, preserve a fresh private recoverable backup and reconcile the known 77/79 migration baseline and historical checksum difference. Apply reviewed additive migrations without altering old checksums or resetting records. If target access or schema compatibility fails, report the precise blocker and retain the local tested slice.
- [ ] Enable the existing explicitly pinned institution-demo gate if necessary, prepare the new actors additively, and demonstrate a real generated programme/intake through the deployed UI. Keep institutional signoff and external Moodle delivery separate. Verify exact-commit Vercel builds and normal web/API availability plus the authenticated new workflow.
- [ ] Give the user the deployed link, tested staff/applicant logins, what to click, what passed, remaining limitations and a self-contained release report.

## Our plan self-review

We mapped every approved design section to a task: private/source/version contracts (1), decisions/publication/atomicity (2), public/applicant timing and policy compatibility (3), workflow/recovery/navigation/UI (4), and actors/evidence/release (5). The five review-focus risks each have explicit named tests in their owning tasks. We reuse existing owner services instead of a generic configuration writer and avoid a new runtime dependency. Our first code changes must be failing tests after the plan review; no product implementation is represented as complete by this document.

Our focused unchanged-source baseline on the previously verified identical source tree passed 70 tests in `guidance.spec.ts`, `catalogue-contract.spec.ts` and `demo-setup-policy.spec.ts` on 17 October. This is a baseline check, not evidence that the new slice exists or that the new connected/browser tests have passed.
