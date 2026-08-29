# Acceptance Test Catalogue

## Test philosophy

No feature is accepted solely from a happy-path demonstration. Tests cover normal, validation, authorization, conflict, failure, recovery, audit, privacy and accessibility paths.

## Critical end-to-end journeys

### TEST-E2E-APP-001 — Applicant submission

1. Applicant creates and saves a draft.
2. Valid input remains after validation failure.
3. Approved document is uploaded; disallowed/oversized content is rejected.
4. Applicant reviews and submits.
5. Refresh/double-click repeats the same authoritative outcome.
6. Receipt and audit record identify the submitted version.

**Pass:** exactly one submission; no other applicant is visible; recovery and accessibility work.

### TEST-E2E-REG-001 — Registration and Moodle recovery

1. Accepted applicant converts to student.
2. Student selects only eligible courses.
3. Finance simulation confirms required state.
4. Registration confirms exactly once.
5. Moodle simulator fails; registration remains confirmed.
6. Integration Support replays after recovery.
7. Reconciliation shows SIS/Moodle alignment.

**Pass:** retry is idempotent/audited; operators never manually edit registration.

### TEST-E2E-ASM-001 — Official result release

1. Lecturer stages marks in an assigned offering.
2. Invalid/unauthorized marks are rejected.
3. Examinations validates package.
4. Authorized approver releases.
5. Student sees official result.
6. Sysadmin/lecturer direct alteration is denied.
7. Amendment creates an approved new version and reevaluation.

## Authorization tests

- **TEST-AUTH-001:** Adviser views assigned advisee — allowed.
- **TEST-AUTH-002:** Adviser searches unrelated student — denied/no existence disclosure.
- **TEST-AUTH-003:** Lecturer views own course roster — allowed.
- **TEST-AUTH-004:** Tutor without delegated quiz authority changes quiz/marks — denied.
- **TEST-AUTH-005:** Finance Officer views balance in assigned scope — allowed.
- **TEST-AUTH-006:** Dean views counselling notes — denied.
- **TEST-AUTH-007:** Counsellor views unassigned case — denied and audited.
- **TEST-AUTH-008:** QAO verifies own submitted evidence — blocked/conflict route.
- **TEST-AUTH-009:** System Administrator changes final result — denied.
- **TEST-AUTH-010:** Regulatory User submits without signatory authority — denied.
- **TEST-AUTH-011:** Break-glass user exceeds approved scope/time — denied and reviewed.

## Recovery/resilience tests

- **TEST-REC-001:** Connection loss after request creation produces a retrievable outcome.
- **TEST-REC-002:** Duplicate provider callback applies one financial effect.
- **TEST-REC-003:** Partial import isolates invalid items and preserves valid evidence.
- **TEST-REC-004:** Dead-letter event requires approved replay and reconciliation.
- **TEST-REC-005:** Concurrent update returns a conflict; no silent overwrite.
- **TEST-REC-006:** Expired role/credential during action fails safely.
- **TEST-REC-007:** Failed deployment returns to last known-good release.
- **TEST-REC-008:** Backup restoration produces reconciled records/files/audit evidence.
- **TEST-REC-009:** Payment reversal recalculates clearance and downstream state safely.
- **TEST-REC-010:** Notification failure leaves domain decision intact.
- **TEST-REC-011:** Failed regulatory acknowledgement remains recoverable, not falsely submitted.

## Accessibility acceptance

For every critical journey verify keyboard-only, screen reader, visible/logical focus, zoom/reflow, mobile browser, slow/intermittent connection, accessible errors, accessible authentication/recovery, non-colour status and alternatives to charts/documents.

Representative human acceptance includes applicants, students, assistive-technology users, teaching staff, advisers, administrative/examination/finance staff, support staff, QA/leadership and technical/integration administrators.

## Test evidence record

Each run stores test ID and linked requirement, environment/build, policy/configuration version, dataset, executor, result, failure/defect, retest result and required sign-off.

## Release blockers

Release is blocked by critical failure in authorization, official result integrity, payment integrity, restricted records, regulatory submission, backup/recovery, duplicate/data-loss prevention or accessibility of a critical journey.
