# Continuation reconciliation — 2026-10-08

The user reported changes by the AGY Google agent and authorized resolving overlaps before continuing. This note records the inspected work, not an inferred author attribution. Git has no new commit identifying the author of the additional changes.

## Checkout evidence

| Checkout | Inspected state |
|---|---|
| Primary | `main`, `b9fa96d`; only the previously existing untracked `development/docs/findings/BROWSER-TEST-REMAINING-ISSUES.md` |
| Canonical review | `review/phase7-completion`, `f6f797f`; pending SETUP-003 and MOODLE-001 changes |
| Additional continuation | `.worktree/v2-continuation`, `feat/v2-continuation`, `f6f797f`; copied pending work plus timetable publication changes |

The continuation reflog records creation from `b9fa96d` and a fast-forward to `f6f797f` on 2026-10-07. No later commit was found. Eleven application/document paths differ between the two continuation worktrees; the copied SETUP-003 and MOODLE-001 files were byte-identical. No unmerged paths or conflict markers were found. Preserve both working trees and the primary untracked document; there is no Git merge to perform for these uncommitted differences.

## Decision

Retain the additional timetable work as a proposal and preserve its original files. The user subsequently instructed the team to **finish this work**. Implement the corrected publication path in the canonical review worktree under [TIME-007](../task-packets/TASK-V2-TIME-007.md) and [DEMO-TIME-PUBLISH-2026.1](../policies/SYNTHETIC-TIMETABLE-PUBLICATION-POLICY.md). The proposed endpoint/migration require correction; the forced-success test must not be adopted.

The publication-record idea, exact master-draft reference, independent-person intent and student day/list presentation are useful. Their implementation does not yet satisfy the source, authority, recovery or student-entitlement contract. ADR-004 already allows an immutable master session's explicitly validated registration IDs to form its section-allocation snapshot. The least-complex correct scoped implementation reuses that manifest with current-source checks and independent publication; it does not require a third allocation entity. Prepare a distinct fictional period with genuine SWE111/MTH111 current-curriculum registrations, and preserve the larger preview's genuine blockers. Broader configurable academic/section allocation remains separately owned. The user's synthetic-policy authorization supplies a fictional university policy; it does not justify bypassing source validation or claiming institutional approval.

## Decisions by file

Paths in this table refer to `development/` in the preserved `v2-continuation` worktree. Line references describe the inspected proposal and may move during later work.

| Proposed file | Evidence | Integration decision |
|---|---|---|
| `apps/api/src/timetabling/master-preview.service.ts` | Lines 258–266 check request role/scope but no publication capability or authority recheck within the transaction. Lines 345–362 allow absent password or absent/multiple credentials to skip reconfirmation. | Rework with explicit fictional capability, current appointment/account/person and credential checks, independent person, mandatory bounded password reconfirmation and audit of its actual assurance. |
| Same service | Lines 323–332 trust saved status/digest without re-reading current policy, appointments, venues, capacity, registrations or coverage. Lines 295–310 replay any existing actor/request reference without matching its target or payload. | Reuse one current-source validator before publication; bind the complete command and reviewed source versions to its digest. Refuse changed replay payloads and stale publication bases. |
| `apps/api/src/timetabling/master-preview.controller.ts` | The new cookie-authenticated publish mutation has no `CsrfGuard`; no global replacement was found in the inspected entry/module. | Add the existing mutation protection, bounded request/reconfirmation limits and safe denial audit. |
| `prisma/schema.prisma` | Publication rows are labelled immutable, but projections retain only student ID and copied section/course text, losing registration/attempt membership provenance. | Rework the model around exact published schedule, governed allocation and source references. Preserve legacy official registration records. |
| `prisma/migrations/20261008000000_v2_timetable_publication/migration.sql` | No append-only triggers or date/version checks; projection FK at line 61 cascades on publication deletion. | Replace/correct in canonical implementation with reviewed additive history constraints and forward recovery. Do not deploy the uncorrected proposed migration. |
| `apps/api/src/registration/registration.service.ts` | Lines 1318–1350 select by period and student ID only; no current course/attempt/drop/withdrawal filter or fictional-provenance gate. | Preserve existing own-registration/Moodle changes. Add the timetable read only after governed membership, exact publication version and current entitlement are enforced. |
| `apps/api/test/timetable-demo-master.e2e-spec.ts` | Lines 164–167 update an immutable blocked draft. The existing `20261005120000_v2_demo_timetable_master_drafts` trigger forbids this. The test supplies no registration IDs and asserts no student projection. | Reject this test approach. Create genuinely valid synthetic source records through supported owner commands and assert real student visibility, denial and recovery. Never disable the trigger or remove roster findings. |
| `packages/contracts/src/timetabling.ts` | Pending and published cases share required publication fields; source/attempt/allocation/provenance and change state are absent. | Rework as discriminated availability/projection contracts. |
| `packages/contracts/src/index.ts` | Additional timetable export is the only difference from canonical pending exports. | Add the corrected export with its verified implementation; retain current setup/Moodle exports. |
| `apps/web/app/student/timetable/page.tsx` and `timetable-view.tsx` | Useful CAT day/list cards, but fictional publication is called “Official”; all sessions/day controls render together; week/course/revision/cancellation journeys are missing and tab keyboard behaviour is incomplete. | Retain the presentation concept, implement bounded week/day/list/course views with semantic controls, provenance, freshness and actual published data. Do not expose draft sessions. |
| `docs/task-packets/TASK-V2-TIME-007.md` | Claims staff approval UI, current-source revalidation, immutable publication and weekly views that the inspected code does not provide; the unchanged planner still says “Draft preview only.” | Supersede the proposal with the canonical packet linked above. Preserve the original in its worktree. |

The primary untracked browser-findings document is dated 2026-10-01. Its statement that all handbook sections are implemented is not current release evidence and must not determine completion.

## Controlling sources

These exact records were read completely for this review/packet. Their original approval text is unchanged.

- [Design Section 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/004-design-section-4-curriculum-programmes-and-academic-delivery.md): principal academic entities, curriculum lifecycle, course-offering lifecycle, teaching allocation and timetabling boundary.
- [Student Blueprint 2 Part 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/015-role-blueprint-2-new-student-and-continuing-undergraduate-student.md#3-timetable-publication): §§3, 5.4 and 8–11 require authoritative schedules, current changes, retained history, source/version audit and trustworthy student availability.
- [Design Section 10](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/010-design-section-10-security-privacy-audit-records-and-resilience.md): §§11–13, 16, 19–20, 25 and 33 govern authentication, current authority, separation, synthetic environments, immutable audit, approval meaning and production gates.
- [Permission Part 3A](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/006-cross-blueprint-implementation-set-part-3a-permission-and-information-visibility-matrix-co.md): §§15.5 and 15.9 require own/assigned records, explicit capability and immediate expiry enforcement.
- [UI Part 2B](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/003-cross-blueprint-implementation-set-part-2b-saving-drafts-multi-step-forms-upload-and-forma.md): `UI-SAVE-001`, `UI-REVIEW-001`, `UI-SUBMIT-001` and `UI-DRAFT-001` govern exact review and uncertain completion.
- [UI Part 2D](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/005-cross-blueprint-implementation-set-part-2d-controlled-overlays-scheduling-decisions-eviden.md): `UI-CALENDAR-001`, `UI-DECISION-001` and `UI-A11Y-001` govern schedule alternatives, frozen decisions and accessible interactions.
- [Recovery Part 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/03-cross-blueprint/008-cross-blueprint-implementation-set-part-4-error-recovery-and-notification-catalogue.md): §§16.5, 16.7 and 16.11–16.14 govern idempotency, stale facts and authoritative notifications.
- [ADR-004](../adr/ADR-004-synthetic-timetable-planning-contract.md#master-and-course-preview-projection), [TIME-003](../task-packets/TASK-V2-TIME-003.md) and [TIME-006](../task-packets/TASK-V2-TIME-006.md) prohibit inferred membership and require fresh validation before independent publication. Supersession/readiness registers were checked; fictional authorization does not change original institutional sources.

## Verification boundary

This was a read-only source/Git audit. The additional worktree's web `tsc --noEmit --incremental false` and both inspected diff checks passed. No publication API/database/browser test was run by this review, and type checking does not establish publication correctness. No source, schema, environment, database, provider or Git history was changed. Root owns current whole-application verification and subsequent implementation; human walkthrough and production acceptance remain unclaimed.
