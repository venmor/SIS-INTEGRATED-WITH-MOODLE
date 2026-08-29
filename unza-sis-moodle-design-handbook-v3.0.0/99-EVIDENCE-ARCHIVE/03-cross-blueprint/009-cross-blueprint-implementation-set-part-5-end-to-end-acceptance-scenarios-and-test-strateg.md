<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 2a8f29ff-fc48-5b71-81cd-ecb93b24c41e; chronological message: 250. -->

# Cross-Blueprint Implementation Set, Part 5 — End-to-end acceptance scenarios and test strategy

## 17.1 A feature is not accepted because its screen works

Every approved workflow must pass the appropriate combination of:

- Unit tests for rule and state logic
- Component/UI tests
- Authorization tests
- Integration/contract tests
- Accessibility tests
- Performance and low-bandwidth tests
- Recovery/failure tests
- End-to-end role journey tests
- Audit/reproducibility tests
- Human user-acceptance testing

Tests use approved, synthetic data. Production personal data is never copied into ordinary development or test environments.

## 17.2 Required test datasets

The test environment must contain configurable scenarios, not one “normal student.”

| Dataset | Required cases |
|---|---|
| Applicants | New, returning, duplicate identity candidate, incomplete evidence, fee waiver, offer accepted/declined |
| Students | New, continuing, sponsored, partially paid, repeating half-course, full-year-course repeat case, extended research/industrial activity in progress |
| Academic policies | Different programme/cohort/effective dates; configurable exactly-three-half-course and CA 41–49 outcomes |
| Teaching | Lecturer, tutor with quiz permission, tutor without quiz permission, Tutorial Groups, Moodle sync failure |
| Support | Adviser observation, voluntary counselling request, disability plan, welfare request, disciplinary case—strictly separated |
| Finance | Cash, mobile money, bank import, partial payment, duplicate callback, reversal, sponsor coverage, refund, instalment plan |
| Governance | QA evidence gap, corrective action, programme review, audit test, regulatory submission and correction |
| Operations | Failed event, stale data, mapping conflict, credential expiry, rollback, recovery and reconciliation |

## 17.3 Core E2E scenarios

### `TEST-E2E-APP-001` — Applicant submits a complete application

1. Applicant creates account and verifies email/mobile.
2. Searches programme and receives non-binding eligibility guidance.
3. Starts an application draft.
4. Saves, leaves and resumes it.
5. Provides qualifications and required documents.
6. Pays application fee or receives approved waiver.
7. Reviews information, accepts declaration and submits once.
8. Receives application reference and secure status page.
9. Admissions Officer receives a case in the correct queue.

Pass condition: no duplicate application is created; all documents, declaration, payment state and audit entries are linked.

### `TEST-E2E-REG-002` — Student course registration and financial clearance

1. Continuing student opens registration.
2. System evaluates configured progression rule.
3. Student selects permitted new/repeat courses.
4. Course-based charges are created from active fee policy.
5. Student pays a permitted partial amount.
6. Finance clearance is calculated from policy.
7. Student completes registration only if allowed by clearance/arrangement policy.
8. SIS creates Moodle enrolment event.
9. Moodle access becomes active or visible as delayed with recovery state.

Pass condition: academic registration remains authoritative even if Moodle sync is delayed; no balance is exposed to teaching staff.

### `TEST-E2E-PROG-003` — Configurable progression and supplementary rules

Run this test for at least two policy versions.

Cases include:

- Fewer than three failed half-courses with passable full-year outcomes.
- Exactly three failed half-courses.
- More than three failed half-courses.
- Failed full-year course.
- CA 40.
- CA 41–49.
- CA 50 or above with eligible failed-course count.
- Extended research/industrial activity continuing across academic years.

Pass condition: outcome is determined from selected rule version; no outcome is hard-coded; extended activity can remain `In progress`.

### `TEST-E2E-MOD-004` — Moodle tutorial-group and grade-transfer control

1. Programme Coordinator assigns official Tutorial Group.
2. SIS event creates/updates Moodle group membership.
3. Tutor without quiz authority attempts to create a quiz and is blocked.
4. Tutor with explicit TG/course quiz authority creates permitted quiz.
5. Moodle grade batch is staged.
6. Batch includes a Moodle-only student and a missing officially registered student.
7. Technical validation identifies discrepancies.
8. Lecturer reviews approved batch.
9. Examinations workflow controls official result handling.

Pass condition: Moodle never directly changes official CA/final result; all mismatches create reconciliation cases.

### `TEST-E2E-ADV-005` — Adviser support observation and referral boundary

1. Moodle/academic signal creates explainable observation.
2. Adviser reviews source/freshness and sends supportive invitation.
3. Student sees respectful message and accepts counselling offer.
4. Counsellor receives minimal referral.
5. Adviser sees only permitted service status.
6. Adviser attempts to view counselling note and is denied.
7. Student declines a later ordinary support offer.

Pass condition: no diagnosis, discipline record or unrestricted counselling disclosure is created.

### `TEST-E2E-FIN-006` — Payment, reconciliation and sponsor coverage

1. Student receives course-based charges.
2. Mobile-money payment is initiated.
3. Callback arrives twice.
4. System creates one payment record and one reconciliation task where required.
5. Sponsorship covers only configured tuition items.
6. Remaining student charge stays visible.
7. Student requests refund for genuine overpayment.
8. Different authorized officer approves refund.
9. Provider payout confirmation is received.

Pass condition: no duplicate value, no false “paid” state, maker/checker refund control and complete audit history.

### `TEST-E2E-EXM-007` — Results, supplementary and amendment

1. Lecturer submits marks.
2. Examinations Officer validates range, class-list and component rules.
3. Supplementary candidates are derived using configured policy.
4. Board package freezes evidence.
5. External Examiner reviews permitted sample.
6. Authorized results are released.
7. Student views own result and next action.
8. Authorized correction creates result-amendment case.
9. Progression/finance/graduation consequences are recalculated.

Pass condition: released result is never overwritten; original, amendment and approvals remain visible in history.

### `TEST-E2E-GRAD-008` — Award and certificate lifecycle

1. Results create award-evaluation case.
2. Programme completion uses curriculum/award-policy version.
3. Extended activity remains `In progress` where unfinished.
4. Required clearances return minimized status.
5. Award authority reviews frozen package and confirms award.
6. Student chooses ceremony attendance or non-attendance.
7. Certificate is authorized, produced and issued.
8. Replacement request is processed later.

Pass condition: academic completion, award confirmation, ceremony attendance and certificate issue remain separate states.

### `TEST-E2E-QA-009` — Quality review to verified closure

1. QAO starts programme review with standards snapshot.
2. Programme owner submits evidence.
3. QAO identifies evidence gap and issues proposed finding.
4. Owner submits corrective-action plan.
5. Action becomes overdue and escalates.
6. Independent verifier tests evidence.
7. Closure authority records final outcome.

Pass condition: owner cannot alter original finding or self-verify correction; history is immutable and auditable.

### `TEST-E2E-REG-010` — Regulatory submission and correction

1. Reporting User creates submission from certified metrics.
2. One metric becomes stale/un-certified.
3. Validation blocks sign-off.
4. Data steward corrects source through authorized workflow.
5. New certified metric is used in new submission version.
6. Signatory approves frozen package.
7. Delivery acknowledgement is delayed.
8. System checks idempotency before retry.
9. Regulator query leads to linked correction/resubmission.

Pass condition: source data and original submission remain preserved; duplicate regulator return is prevented.

### `TEST-E2E-OPS-011` — Integration failure and recovery

1. Student registration creates Moodle enrolment event.
2. Moodle API is unavailable.
3. Event retries and then enters reconciliation queue.
4. Student sees delayed access, not failed registration.
5. Moodle returns.
6. Integration Support safely replays event.
7. Reconciliation confirms SIS/Moodle alignment.
8. Incident closes only after recovery evidence.

Pass condition: no manual edit changes official registration; retry is idempotent and auditable.

## 17.4 Authorization tests

Each sensitive action needs positive and negative tests.

Examples:

| Test | Expected result |
|---|---|
| Adviser views assigned advisee | Allowed |
| Adviser searches unrelated student | Denied/no existence disclosure |
| Lecturer views own course list | Allowed |
| Tutor without quiz authority changes quiz | Denied |
| Finance Officer views balance | Allowed in assigned scope |
| Dean views counselling notes | Denied |
| Counsellor views unassigned case | Denied and audited |
| QAO views own submitted evidence as independent verifier | Blocked/conflict route |
| System Administrator changes final result | Denied |
| Regulatory User submits without signatory | Denied |
| Break-glass user exceeds requested scope | Denied |

## 17.5 Failure, recovery and resilience tests

Minimum required tests:

- Double-click/refresh during formal submission
- Connection loss after request creation
- Delayed provider callback
- Duplicate provider callback
- Partial import failure
- Dead-letter event and approved replay
- Stale metric/report data
- Concurrent update conflict
- Role expiry during action
- Credential expiry
- Failed deployment and rollback
- Backup restore and reconciliation
- Moodle outage during registration
- Payment reversal after financial clearance
- Result amendment after graduation-readiness evaluation
- Notification delivery failure
- Failed regulatory-delivery acknowledgement

## 17.6 Accessibility and usability acceptance

For every critical journey:

- Keyboard-only completion
- Screen-reader completion
- Zoom/reflow at required level
- Mobile-browser completion
- Slow/intermittent connection test
- Error identification and correction
- Focus order and focus visibility
- Accessible authentication/recovery
- No colour-only status
- Accessible document/chart alternative

Human acceptance testing includes representative:

- Applicants
- New and continuing students
- Students using assistive technology
- Lecturers and tutors
- Advisers
- Admissions, examinations and finance staff
- Counsellors/disability-support staff
- QA/leadership users
- System/Moodle/integration administrators

## 17.7 Test evidence and release gate

Each test run stores:

- Test ID and requirement traceability ID
- Environment and build version
- Policy/configuration version
- Dataset used
- Executor
- Result
- Failure evidence
- Defect reference
- Retest result
- Approval/sign-off where required

A release is blocked when any critical test fails for:

- Authorization
- Official result integrity
- Payment integrity
- Privacy/restricted records
- Regulatory submission
- Backup/recovery
- Data-loss/duplicate-submission prevention
- Accessibility of a critical journey

## 17.8 Part 5 acceptance requirements

Part 5 is accepted only when:

- Tests cover normal, error, recovery, authorization and audit paths.
- Academic policy tests use configurable versions and boundary cases.
- Moodle, payment, notification and reporting integrations are tested under failure.
- Critical support confidentiality boundaries are tested as denials, not assumed.
- Evidence from test runs is retained and traceable to approved requirements.
- No feature is accepted solely from a happy-path demonstration.

Please approve **Part 5**. Next is the final design-handoff stage: **Cross-Blueprint Implementation Set, Part 6 — base-repository blueprint, module boundaries, configuration model and AI-agent development protocol**.

---

## Following user responses before the next design record

### User message 0251

You may proceed
