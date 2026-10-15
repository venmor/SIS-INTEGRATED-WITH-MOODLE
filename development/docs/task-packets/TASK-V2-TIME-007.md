# Governed fictional timetable publication implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans task by task. Track the unchecked steps below. The user's explicit instruction to finish the additional work authorizes implementation; no repeated fictional-policy approval pause is required.

**Goal:** Complete the additional timetable work with genuine synthetic enrolments, independently approved publication and a trustworthy personal timetable.

**Architecture:** The existing immutable master session's registration IDs form its explicit course-registration-to-section allocation manifest under ADR-004. The server resolves and validates that manifest on draft creation and again before publication. Publication pins the exact master/source versions; the student projection retains registration/attempt lineage and intersects the published manifest with current entitlement.

**Tech stack:** Existing Next.js/TypeScript, NestJS, PostgreSQL/Prisma, Tailwind/semantic tokens under ADR-003, and Playwright. No new package/provider is needed.

**Spec:** [DEMO-TIME-PUBLISH-2026.1](../policies/SYNTHETIC-TIMETABLE-PUBLICATION-POLICY.md), [ADR-004](../adr/ADR-004-synthetic-timetable-planning-contract.md), approved [v2 specification](../superpowers/specs/2026-10-02-v2-operating-sis-design.md), and [continuation review](../learning/AGY-CONTINUATION-REVIEW-2026-10-08.md). Packet TASK-V2-TIME-007, 2026-10-08; lead Charles Hangoma, reviewer Chitindu Milimbo. **Status: defined fictional behavior technically verified on 2026-10-12; human/operational/institutional acceptance pending.** This supersedes the proposal preserved in the v2-continuation worktree.

## Global constraints

- Use Chisomo Demonstration University and synthetic students/data only. These are fictional decisions, not UNZA policy or institutional signoff.
- Require the timetable demo opt-in and loopback review/test/CI database boundary for the publication workflow and its fictional student projection. Production stays denied.
- Preserve current setup/Moodle work, legacy official records, assigned curriculum versions, tutorial groups and immutable history. No automatic course/TG-to-section mapping, forced draft status, trigger removal or shared-database reset.
- Missing roster, section coverage, teacher, venue, policy and capacity findings remain blocking. Preserve the original 12-course/24-session preview with its genuine blockers; do not manufacture enrolment for DEM101–110.
- Build a distinct fictional publication period/scenario with the existing published-curriculum courses SWE111 and MTH111 and actual completed synthetic course registrations. Connected test fixture setup is explicitly synthetic; the presentation flow uses supported SIS owner commands wherever implemented.
- A planner-selected manifest is a proposal until independently reviewed and published. A saved conflict-free preview never becomes student authority on its own.
- No Moodle/payment/email/SMS call or false delivery-success claim is introduced. Pending owner handoffs are visible and distinct from authoritative publication.
- Back up the owned review database before additive migration; verify the new schema first on an isolated clone. Only user-authorized Git operations may occur.
- Follow [SUP-009/010/012](../../../unza-sis-moodle-design-handbook-v3.0.0/90-TRACEABILITY-AND-GOVERNANCE/SUPERSESSION-REGISTER.md) and the [readiness matrix](../../../unza-sis-moodle-design-handbook-v3.0.0/90-TRACEABILITY-AND-GOVERNANCE/IMPLEMENTATION-READINESS-MATRIX.md); no original approval text is rewritten.

## Exact source map

| Contract | Controlling record read completely |
|---|---|
| Pinned curriculum, explicit offering/section/period/teaching assignment | [Design Section 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/004-design-section-4-curriculum-programmes-and-academic-delivery.md): principal entities, curriculum lifecycle, offering lifecycle, teaching allocation and timetabling boundary |
| Own current timetable, add/drop changes, history and tests | [Student Blueprint 2 Part 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/015-role-blueprint-2-new-student-and-continuing-undergraduate-student.md): §§3, 5.4 and 8–11 |
| Current authority, separation, approval meaning and audit | [Design Section 10](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/010-design-section-10-security-privacy-audit-records-and-resilience.md): §§11–13, 16, 19–20, 25 and 33; [Permission Part 3A](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/006-cross-blueprint-implementation-set-part-3a-permission-and-information-visibility-matrix-co.md): §§15.5 and 15.9 |
| Exact review, confirmation, retained work and uncertain completion | [UI Part 2B](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/003-cross-blueprint-implementation-set-part-2b-saving-drafts-multi-step-forms-upload-and-forma.md): UI-SAVE-001, UI-REVIEW-001, UI-SUBMIT-001, UI-DRAFT-001 |
| Calendar alternatives, frozen decision, accessible controls | [UI Part 2D](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/005-cross-blueprint-implementation-set-part-2d-controlled-overlays-scheduling-decisions-eviden.md): UI-CALENDAR-001, UI-DECISION-001, UI-A11Y-001 |
| Same-reference recovery, stale facts and notifications | [Recovery Part 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/008-cross-blueprint-implementation-set-part-4-error-recovery-and-notification-catalogue.md): §§16.5, 16.7 and 16.11–16.14 |
| Existing implementation boundaries | [TIME-003](TASK-V2-TIME-003.md), [TIME-006](TASK-V2-TIME-006.md), [SETUP-003](TASK-V2-SETUP-003.md), [TASK-021/101–105](../../plan/feature-sis-expansion-2.0.md), [GAP-021](../gaps/GAP-021-real-timetable-validation.md), [GAP-V2-001](../gaps/GAP-V2-001-institution-configuration-authority.md) |

Application action/model/capability names below are fictional implementation contracts, not invented handbook IDs. Broader configurable section-allocation policy remains a follow-up; a third membership entity is unnecessary for this scoped snapshot-based publication.

## Review focus

- An approver revoked/expired or a credential changed during processing must not complete publication.
- A drop, second programme attempt in the same period or changed section must not reveal stale/unrelated activities.
- A source change after preview must invalidate publication even if stored status is conflict-free.
- A lost response or changed same-key payload must preserve one exact receipt and the prior active publication.
- A schedule across several months must remain usable with bounded date/course traversal and accessible controls.

## Owned files and contracts

| Owner | Files/responsibility |
|---|---|
| Backend agent | prisma/schema.prisma and a reviewed additive publication migration; timetabling/master-preview.service.ts and controller, shared validator/publication helper; registration/registration.service.ts timetable projection only; packages/contracts/src/timetabling.ts and index; focused connected publication tests |
| Root | Synthetic fixture and actor preparation, staff approval/reconfirmation/recovery UI under admin/timetabling/publications; current API/web/database/browser checks and evidence |
| Student UI owner | app/student/timetable/page.tsx and timetable-view.tsx, bounded date/course/list presentation using the real projection contract |
| Documentation owner | This packet, fictional policy and continuation reconciliation note; no source/schema/database writes |

All source paths above are relative to development/apps/api/src, development/apps/web or development/ as appropriate. Concurrent owners must coordinate contracts before editing shared files.

**API:** GET /timetabling/demo-master/:id/publication-review returns the frozen candidate, current source findings, publication predecessor, impact and authority/proof requirements. POST /timetabling/demo-master/:id/publish accepts a UUID request reference, exact contentDigest, nullable expectedPublicationId, reviewed:true, fictionalOnly:true, a bounded reason and fresh password. The same matching command returns its original FICTIONAL_PUBLISHED receipt; changed target/digest/predecessor/decision payload returns 409. Password never enters a stored fingerprint, receipt, audit or event.

**Authority:** Central TIMETABLE_COORDINATOR at SYSTEM:DEMO-UNIVERSITY with timetable-demo-master-draft prepares/reads. Independent DOMAIN_ADMIN at that exact scope with timetable-demo-master-publish reviews/publishes. Legacy drafts without verifiable proposer person/appointment provenance remain unpublishable.

**Event:** DemoTimetablePublished, durable owner handoff, externalDelivery NONE. [NOTIFY-001](TASK-V2-NOTIFY-001.md) now consumes the owned event into actual entitlement-filtered in-system records, with bounded durable progress and replay/concurrency/failure proof. [Notification evidence](../learning/NOTE-V2-NOTIFY-001.md) records the separate owner verification; an outbox event alone still proves no notification creation or external delivery.

## Task 1 — Prepare real source membership, without adding a parallel allocation system

- [x] Add isolated synthetic fixture assertions: SWE111/MTH111 belong to the programme attempt's assigned published curriculum; their genuine enrolled registrations and matching period-bound offerings/sections are available. Confirm the old 12-course preview still retains its missing-roster findings.
- [x] Create a new master through the normal draft API with explicit registration IDs, distinct safe times, source venues/teachers and complete scenario coverage. Verify BLOCKED for omitted/contradictory membership and CONFLICT_FREE_FOR_REVIEW only for the complete valid scenario.
- [x] Persist proposer person and original active appointment for new master versions; verify older provenance-free drafts cannot publish. Preserve the existing append-only trigger.
- [x] Inspect frozen master/course previews against registration/course/period identities. No test may update a blocked draft to conflict-free or grant access from student IDs alone.

## Task 2 — Use one current-source validator for saving and publication

- [ ] Write failing focused tests for teacher expiry/revocation, source capacity/access changes, stale policy/master/calendar, dropped or mismatched registration and missing section coverage after preview.
- [ ] Run those tests and record the expected failures before implementation.
- [x] Extract and reuse existing server-resolved course/period/section/venue/teacher/roster/conflict checks. Rebuild the same canonical manifest at publication and compare reviewed source facts/digest; retain all coverage and conflict findings.
- [x] Verify existing TIME-006 tests and the larger blocked preview remain correct, then prove a genuinely valid source-backed candidate. No client-supplied participant identity or display fact becomes trusted input.

## Task 3 — Publish and replace independently, atomically and recoverably

- [ ] Write failing test/timetable-demo-publication.e2e-spec.ts cases for absent capability/password/credential/CSRF, same person, legacy provenance, stale sources, natural expiry, wrong target/payload replay, concurrent publication and late transaction failure.
- [ ] Run the cases against the isolated clone and record initial failures.
- [x] Add immutable source-linked publication/projection history and exact current-publication replacement. Lock appointments/account/person/credential and relevant source transitions; verify exactly one usable credential and late natural expiry. Store policy, approval meaning, reason, source versions, digest and actual DEMO_PASSWORD_RECONFIRMATION assurance.
- [x] Commit publication, receipt, minimal audit and owner event atomically. Recheck active action authority before a command replay; compare its complete target/decision fingerprint before returning the original receipt and distinguish historical receipt from current publication. Fresh source validation applies to new publication/replacement. Refuse stale bases safely and retain the prior publication after any failure.
- [x] Expose exact candidate/current findings and replacement impact in staff full-page review. Require unticked confirmations and fresh reconfirmation; retain UUID after uncertainty and check history before changing target or retrying.
- [x] Verify append-only history, allow/deny, same-person aliases, stale/current sources, retries, concurrency and rollback with no partial success or false external handoff.

## Task 4 — Complete the student projection and browser story

- [ ] Write failing own-timetable tests for another student's registration, two attempts in one period, course drop/withdrawal, inactive actor, superseded/empty publication and disabled demo gate. Assert timetable preparation never invalidates registration.
- [x] Project the exact latest publication's manifest only for the selected programme attempt's current enrolled registrations. Retain course-registration and publication lineage; no student-ID-only materialization or combination of historical manifests. Newly entitled courses absent from the published manifest remain explicitly being prepared until validated replacement.
- [x] Implement published week/day/list and course filter with CAT times, location/lecturer permitted by policy, publication version/freshness and replacement changes. Offer bounded date navigation and ten-row list pages; show fictional provenance, meaningful loading/empty/error states and registration-preserved wording.
- [x] Run tests/browser/timetable-publication.spec.ts with real proposer, independent approver and student logins at desktop/390px: genuine manifest → review → publish → own classes → lost-response same-reference recovery → changed source/replacement → updated student view. Include keyboard-only completion and reflow/reduced motion.
- [x] Run focused and appropriate complete API tests, isolated database checks, API/web builds, source/secret/lint checks and browser verification. Record exact evidence and any pending human screen-reader/operational review; do not prefill acceptance.

## Verification status — 2026-10-12

[Fresh evidence](../learning/NOTE-V2-TIME-007.md): 23 publication + 3 master + 58 distinct selected regression cases passed across three preserved isolated targets; 483 API unit tests passed with 13 skipped; real staff/student browser 2/2 and student presentation fixture 31/31 passed. API/web builds, whole typecheck, ten script tests and scoped lint/source checks passed. Migrations 72/73 were first verified on the clone, then applied additively to the backed-up retained preview; all 73 are current. No reset, provider mutation or Git operation occurred.

Checked steps above record implemented behavior and fresh verification. The preimplementation RED steps remain unchecked because initial schema failures and later focused timing/source/UI failures do not prove every final semantic case individually failed before implementation. This is a historical process-evidence limit, not an unresolved failing behavior. Human walkthrough, screen-reader acceptance and production gates remain separate and unchecked in the [walkthrough](../demo/TIMETABLE-PUBLICATION-WALKTHROUGH.md).

## Closure and follow-up

This packet closes only when genuine synthetic course registrations lead through valid master creation, fresh independent publication and the correct student's current timetable with failure/replacement evidence. An unchanged blocked 12-course preview is an honest separate planning state, not a failure to complete this defined publication scenario.

Broader governed curriculum/offering/section configuration and high-volume membership allocation, external notification delivery, examination timetables, timetable imports/optimisation, calendar downloads/subscriptions, institutional overrides and production/cloud Moodle rollout retain explicit owner tasks in v2. The bounded in-system notification owner is implemented and verified separately under [NOTIFY-001](TASK-V2-NOTIFY-001.md); this does not close the full notification workstream. Do not mark all TASK-101–105 or institutional authority gaps complete. The user's synthetic-policy authorization removes the need for institutional approval of fictional values; it does not permit fake successes or unverified completion claims.
