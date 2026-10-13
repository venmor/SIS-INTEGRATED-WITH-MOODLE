# Synthetic university setup policy — DEMO-SETUP-2026.1

Status: fictional rehearsal contract authorized by the user's 2026-10-07 instruction. This is not UNZA policy, an institutional appointment or production signoff. The example uses familiar Zambian university terms and a flexible organisational graph; no real university data is imported.

## Scope and authority

The fictional institution is **Chisomo Demonstration University**, reference `DEMO-UNIVERSITY`. A Domain Administrator appointment in `SYSTEM:DEMO-UNIVERSITY` must explicitly contain `institution-demo-setup-propose` or `institution-demo-setup-approve`. These capabilities do not grant access to admissions, student records, finance, results or restricted support. System Administrator inventory access does not grant either action.

Every read and write requires `DEMO_MODE=true`, `SIS_ENABLE_INSTITUTION_DEMO_SETUP=true`, and a loopback database whose name identifies a review, test or CI environment. Disabling any condition denies the workflow. Appointments are checked from the active session at request and transaction time, including account status, scope, revocation and effective dates.

## Review and activation

1. A proposer edits a typed structure/calendar form. Unit types and period types have configurable codes and labels. Reporting, academic ownership, delivery and location are distinct relationships; there is no compulsory school/department tree.
2. Saving creates an immutable complete draft, reason, content digest, expected preceding draft revision and current activation reference. Invalid references, duplicate codes, cycles, invalid dates and uncontained child periods are rejected with corrections. No arbitrary executable rules are accepted.
3. A different **person**, with an independently active approver appointment, reviews the exact saved version and its comparison with the active version. Separate accounts for the same person cannot satisfy independence.
4. Approval requires the exact digest, current activation reference, explicit confirmation and fresh password reconfirmation. Authentication strength is recorded as `DEMO_PASSWORD_RECONFIRMATION`; it is **not MFA, an institutional digital signature or production step-up proof**. Staff MFA and stronger institutional approval remain live release requirements.
5. Approval and immediate fictional activation are one atomic command. It revalidates source links, appointment, digest, independence and current activation under a transaction lock. Projection, audit and a durable domain event commit together. Replays return the same receipt; changed payloads and stale bases are refused.
6. Activated structure and calendar records retain their setup-version reference. Consumers use that explicit version rather than combining every historical relationship or inferring authority from the latest row. Existing registration windows, curricula, course registrations, fee decisions and results are not rewritten.
7. Correction creates a new draft based on the current activation. Stable unit/period codes cannot disappear or be repurposed through this workflow. Historical versions and approvals remain queryable; there is no emergency bypass, deletion or backdated activation.

The first release owns structure and calendar only. Programme/curriculum, admissions, finance, assessment, support and integration policy families require their own typed owner workflows. The installed setup reports those handoffs as pending; it cannot certify the entire university ready.

## Example structure and calendar

The editable starting example has Main and Health campuses; schools of Computing, Business and Health Sciences; a Computing department; and a shared Academic Skills centre. Reporting and academic ownership remain separate from campus location and teaching delivery. Academic Year 2026 contains a configurable teaching period plus separate registration, examination and result-processing periods. Example dates are fictional; labels and dates can be changed through review.

Current draft teaching identities can be linked by stable codes such as `DEMO-MAIN` and `DEMO-2026-TEACHING`. A setup activation does not turn a draft course offering into an approved offering, a selected timetable roster into an official registration, or a Moodle delivery into an SIS decision. Those owner handoffs are the next slices.

## Recovery and evidence

After a connection loss, retain the same command reference and check the returned history before retrying. Approval failure leaves both configuration and audit lineage intact; partial projection is rolled back. A superseding version is the recovery route, never editing an activated record. Tests cover live-gate denial, expired/revoked/wrong-scope authority, same-person approval, stale/concurrent commands, retries, immutable history and unchanged legacy academic transactions.

Live authority remains open under [GAP-V2-001](../gaps/GAP-V2-001-institution-configuration-authority.md). This explicit synthetic contract supplies demo appointments and decisions only.
