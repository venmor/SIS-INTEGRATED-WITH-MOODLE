# Role Blueprint 7 — Admissions, Registry, Examinations and Graduation Operations

> **Source mode:** composite approved blueprint. It assembles the approved Admissions, Student Registry, Assessment/Examinations, Results/Progression and Graduation controls into role-specific operational journeys.

## Roles and boundaries

| Role | Owns operational work | Must not do |
|---|---|---|
| Admissions Officer/Reviewer | Completeness checks, evidence verification, clarification, recommendation | Create official student results or bypass admission authority |
| Admissions Decision Authority | Approved offer/decision within configured scope | Rewrite applicant evidence or decide own conflicted case |
| Academic Records Officer | Authoritative student-record corrections, status history and document basis | Change marks, finance or Moodle activity directly |
| Examinations Officer | Assessment readiness, candidate lists, mark validation, boards and release preparation | Author marks or publish without required approvals |
| Graduation/Senate Officer | Completion/clearance packages, award approval routing, conferral and credentials | Manufacture eligibility or alter source results/finance |
| Registrar/Academic Affairs | Governed oversight and configured higher authority | Use title as unrestricted database access |

## Shared operational workspace pattern

Each role begins with assigned queues, deadlines, returned work and reconciliation exceptions. A work item shows reference, state, owner, age, priority reason, source/freshness, policy version, conflict flags and next permitted action. Search reveals only records in permitted scope and does not disclose the existence of denied records.

## Journey A — submitted application to offer

1. Admissions receives a submitted snapshot with receipt and immutable declaration version.
2. The officer validates completeness, payment/waiver status and document safety/quality.
3. Declared qualification data is compared with uploaded evidence; differences become explicit review items.
4. The reviewer requests a scoped clarification or records an evidence outcome with reason.
5. Eligibility rules produce explainable guidance; a human records the recommendation.
6. A separate authorized role reviews the decision package and conflict checks.
7. The system issues an offer, waitlist or not-offered outcome according to approved policy.
8. Applicant-visible wording is separated from internal notes; delivery state is tracked.

## Journey B — applicant conversion and record correction

An accepted offer creates onboarding tasks, not an immediate student record. Conversion occurs only after required conditions and identity checks. The Registry receives a conversion request, verifies uniqueness and creates the student number, programme attempt and curriculum assignment in one controlled transaction.

A correction request states affected field, reason, evidence, requester and downstream impact. Approved corrections create a new version, preserve old values and publish an event; they never silently overwrite historical official data.

## Journey C — assessment to official result

1. Approved assessment plan and candidate eligibility are confirmed.
2. Moodle/provisional marks enter a staging snapshot with source and mapping version.
3. Validation identifies missing, duplicate, out-of-range or unmapped values.
4. Lecturer/tutor corrects permitted source data; examinations staff do not invent marks.
5. Moderation and required approvals create a board-ready result package.
6. The authorized board/official records a decision; conflicts and incomplete cases remain explicit.
7. Official release is idempotent, audited and separated from notification delivery.
8. Later amendment follows appeal/correction authority, reason, evidence and version history.

## Journey D — graduation and credentials

Completion evaluation reads approved curriculum, official results, progression/award rules, clearance requirements and unresolved holds. Exceptions route to the correct authority. Award approval, conferral, transcript/certificate generation, verification, replacement and revocation are separate governed events.

## Failure and recovery

- Duplicate submission or provider callback is idempotently recognized.
- Unsafe files remain quarantined and cannot be opened by reviewers.
- Missing evidence returns to a named owner; it does not become a vague pending state.
- A Moodle outage preserves staged/official separation and resumes through reconciliation.
- A role expiring during action blocks commitment and keeps an audit-safe draft.
- Failed result notification does not roll back the official release.
- A post-release amendment triggers recalculation of affected progression/graduation packages.

## Acceptance requirements

- Evidence reviewer and final decision authority can be separated.
- Registry corrections preserve history and downstream reconciliation.
- Examinations staff cannot change lecturer-owned evidence without the defined route.
- Moodle cannot publish official results.
- Award/conferral actions require configured authority and complete evidence.
- Every positive authorization test has a corresponding denial/out-of-scope test.
- Each journey proves normal, failure, recovery, audit and accessibility paths.

## Controlling sources

Design Sections 3, 5, 6 and 10; Applicant and Student journey books; core/restricted permission matrices; error/recovery catalogue; acceptance strategy.
