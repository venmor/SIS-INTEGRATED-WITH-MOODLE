# REG-001 — Preserve academic context and correct registration review

2026-10-12. User-reported defect: opening the student's timetable led to registration for `2026S1`; an unsaved empty plan submitted version zero, and a later prerequisite/capacity-blocked plan still offered formal submission. Lead Charles Hangoma; reviewer Chitindu Milimbo. Implementation is authorized by the bug report and the previously approved own-context navigation direction. Human acceptance remains pending.

## Authority and limits

Follow [PH4-003](TASK-PH4-003.md), [PH4-004](TASK-PH4-004.md), [PH4-005](TASK-PH4-005.md), [TIME-007](TASK-V2-TIME-007.md), and the unchanged approved [Student Part 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/015-role-blueprint-2-new-student-and-continuing-undergraduate-student.md), especially §§1–3, 8–11. The exact security/permission, review/submit/calendar and recovery records linked by TIME-007 still control. SUP-009/010/012 and current readiness gates still apply. This is a correction to existing own-student reads and registration UI; it grants no new registration, teaching, publication or institutional policy authority.

Preserve capacity/prerequisite/load/holds/clearance/server-version checks, official records, source history and other worktrees. Do not invent completed grades, automatically select/remove courses, infer semester eligibility from a period code, floor an unsaved version at formal submit, change the configured current period, or reset a database. Use synthetic records, installed dependencies and isolated runtime only. No providers, schema migration or Git operation is required.

## Behavior and decision refinement

1. Add bounded server-authorized discovery of the student's own programme-attempt/period pairs: configured-current options for eligible existing own attempts and existing own draft/registration pairs. A choice is discovery, not a grant of eligibility. Exclude foreign, withdrawn/inactive identity contexts and orphan legacy links. Validate current active STUDENT/study authority and ownership at read time. Academic period names/dates come only from authoritative versions; absent facts remain absent.
2. Preserve an explicit attempt and period through timetable, course planning, readiness, review, save, submit, status recovery and their navigation. Repeated/malformed/foreign explicit context fails closed instead of silently reverting to defaults. Keep the registration policy's default unchanged.
3. For a generic timetable link only, a single confirmed own active registered context may be selected when the configured default has no registration. Several registered contexts require a visible choice; do not guess the newest or blend attempts. This refines the previous explicit-link-only rehearsal into discoverable ordinary navigation. An unavailable context inventory cannot establish absence or redirect to a guessed context.
4. Review an empty/unsaved/non-draft plan without declarations or submission. Show a concise explanation and **Choose courses**/**Edit course plan** in the same context. Display prerequisite, capacity, approval and load blockers before a command and disable formal submission while known blockers remain. Warnings remain warnings. All declarations are required; the server repeats every check.
5. A valid formal command uses its genuine saved version and exact attempt/period. Retain one exact nonsecret UUID/payload after an uncertain result, freeze the reviewed decision, and check authoritative status before offering any retry. Success is an actual receipt and links to the same context. A failed status read is unknown, not proof of no registration.

## Ownership and contracts

- Backend owner: additive `GET /registration/contexts`, minimal shared contract and focused connected tests. Existing session/rate guards apply. Cursor-bounded traversal must disclose/load more; no silent truncation. No registration mutation semantics change.
- Registration UI owner: `student/register/page.tsx`, `form.tsx`, course-board context writes and dedicated real-page fixture tests. Preserve submitted plans and do not relabel them as editable drafts.
- Root: shared query/context helpers, student context selector, timetable/course/readiness loaders and navigation, real connected browser reproduction, build/runtime and documentation.

Only academic routes consume these filters. Finance/results/support retain their existing separate context and authorization contracts. Query parameters are navigation context, never proof of entitlement.

## Verification plan

- [ ] Observe the reported generic-timetable and empty/blocked-review cases failing before repair.
- [ ] Verify own inventory, current authority, foreign/inactive/orphan exclusions, multiple attempts/periods, cursor traversal and safe default discovery on isolated PostgreSQL.
- [x] Verify empty/blocked/approval/load/declaration gating, exact context/version, unavailable status and lost-response recovery with actual registration pages (nine fixture cases; see NOTE-V2-REG-001).
- [ ] Complete ordinary sign-in → My timetable → correct published period → same-context registration/course/readiness navigation with real API/database; cover explicit wrong context and keyboard/mobile reflow.
- [ ] Run relevant registration/timetable regressions, unit suite, API/web production builds, typecheck, lint/source/diff checks; record actual counts and limitations.
- [ ] Update the learning note/walkthrough and pending ownership. Human screen-reader/operational/production acceptance is not supplied by automation.

No original handbook approval text changes. Broader curriculum/offering eligibility, period policy configuration, successor timetable editor, notification ownership and institutional rollout remain separate tasks.
