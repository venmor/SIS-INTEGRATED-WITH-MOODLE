# SETUP-003 — Governed fictional structure and calendar

2026-10-07; review worktree `review/phase7-completion`, base `f6f797f`. Lead Charles Hangoma; reviewer Chitindu Milimbo; human acceptance pending. [Packet](../task-packets/TASK-V2-SETUP-003.md), [policy](../policies/SYNTHETIC-UNIVERSITY-SETUP-POLICY.md), [scoped plan](../superpowers/plans/2026-10-07-synthetic-university-setup-plan.md), [operator walkthrough](../demo/UNIVERSITY-SETUP-WALKTHROUGH.md).

## Behavior and data ownership

An explicitly appointed fictional proposer edits a complete structure/calendar profile in `/admin/setup/university`. Unit and period codes/labels are configurable; reporting, academic ownership, delivery and location relationships are separate. The server validates references, cycles, stable identities and ordered/contained dates, canonicalizes the profile and saves an immutable version with its reason, digest and current activation reference. Seed fixtures are editable starting material, never automatic approvals.

Another person reviews the exact saved profile and changes, explicitly confirms its fictional purpose and reconfirms their password. Activation locks the domain and current IAM rows, checks the original proposer and independent person, revalidates source dependencies and records source-linked unit/calendar projections, approval, audit and outbox event together. Revocation, natural appointment expiry, changed credentials, stale base, altered digest and failed projection refuse or roll back the command. Correction creates a successor rather than editing history. Replaying a matching request returns its receipt; a changed payload cannot reuse that reference.

The event is `DemoInstitutionSetupActivated`, with owner reconciliation **PENDING** and external delivery **NONE**. It cannot activate registrations, rewrite old registration windows, adopt curricula/fees/grading rules or publish a timetable. Calendar versions retain their dates/type/parent and exact setup provenance without altering legacy `AcademicPeriod` fields. Structure consumers must select one source version, never union all historical relationships.

## Decisions improved during implementation

- Use stable semantic `unitKind` separately from configurable `unitType` codes. A campus labelled `SITE` must still work in the timetable rules engine. Existing legacy `CAMPUS` rows remain compatible; a connected regression verified the actual consumer.
- Reconcile explicitly managed unit identities, rather than treating every `DEMO-*` record as belonging to this university. Existing unrelated fixtures would otherwise create false activation blockers.
- Lock appointment/account/person and active password credential rows through the transaction. The setup advisory lock alone cannot serialize IAM revocation. Recheck appointments after projection because a row lock cannot prevent time from passing.
- Page immutable history on the server in batches of 20, retain globally current/latest references, and preserve unsaved fields while inspecting older pages. An arbitrary latest-20 cutoff would make retained decisions inaccessible.
- Retain and display the activation UUID after an uncertain response, lock the selected decision, warn before leaving and offer history reconciliation or same-key retry with a fresh password. Do not discard an unresolved high-impact command when switching versions.
- Report authentication as `DEMO_PASSWORD_RECONFIRMATION`. This is an explicitly fictional approval mechanism, not MFA or an institutional digital signature.
- Validate existing demo account status, appointment dates, independent people and actual password hashes. A seed rerun refuses drift instead of silently replacing credentials or granting privileges.
- Return a typed collection/original-row/field correction with validation failures. The editor links the error to its actual control, opens the relevant collection/page and retains all entries. Canonical sorting must not change the index reported to the operator. A generic alert for a hidden row would miss approved recovery catalogue §16.3.

## Verification

Parser and connected route tests were observed failing before implementation. Review findings received targeted regression tests: custom campus code, expired/revoked original proposer, more than 20 historical versions, final-outbox failure rollback and natural expiry during projection. The lost-response browser story executes the real API twice with the same command reference and verifies one stored result. Its two actors use separate people/accounts.

Final command results are recorded in the dated [verification entry](VERIFICATION.md). Database tests use only `sis_setup003_test_20261007`, cloned from the existing review database without reset. The additive migration was applied to that clone and to the retained presentation database after a private backup. The main checkout and its other agent's findings were preserved.

Local validation used installed Node **26.10.0** while the repository pins **24.21.0**. Manual assistive-technology/low-bandwidth review, institutional authority/MFA, scheduled activation, policy-family writers, historical migration reconciliation and human acceptance remain open. This closes the fictional structure/calendar increment only.
