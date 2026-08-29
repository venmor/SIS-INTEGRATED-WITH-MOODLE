<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 5f434a7e-b917-56f6-a0ea-13009553baa8; chronological message: 67. -->

## Design Section 5 — Assessment, examinations, results and progression operations

The previous amendment defines how academic rules are configured. This section defines how assessments and official academic decisions move operationally through the system.

### 1. Assessment-scheme instantiation

When a course offering is approved, it receives an immutable assessment-scheme instance based on the applicable approved policy.

The instance contains:

- CA and examination weights.
- Assessment components.
- Minimum component requirements.
- Calculation and rounding rules.
- Supplementary and deferred rules.
- Moderation requirements.
- Result approval route.
- Applicable school, programme, course and policy versions.

Changes after registration begins require an approved amendment and impact analysis. Students must be notified when an authorised change affects them.

### 2. Assessment-component workflow

```text
DRAFT
→ APPROVED
→ OPEN
→ MARK_CAPTURE
→ SUBMITTED
→ MODERATION
→ APPROVED
→ LOCKED
```

Exceptional states:

```text
RETURNED_FOR_CORRECTION
CANCELLED
REPLACED
WITHHELD
```

Rules:

- Only assigned staff can capture marks.
- Marks must remain within the component’s valid range.
- Bulk uploads use a validated staging area before committing.
- The system reports missing, duplicate and out-of-range values.
- Submitted marks become read-only to the marker.
- Corrections after submission require a documented return or amendment.
- Locked components cannot be silently changed.

### 3. Non-numeric assessment outcomes

The system must not store every exceptional outcome as zero.

Supported result conditions include:

```text
MARK_RECORDED
ABSENT
ABSENT_WITH_PERMISSION
DEFERRED
MISSING_MARK
INCOMPLETE
EXEMPT
CARRIED_FORWARD
WITHHELD
MISCONDUCT_PENDING
CANCELLED
```

A numeric zero means the student genuinely received zero. It must not mean absent, missing or withheld.

### 4. Moodle grade ingestion

Moodle assessment data enters an import staging process:

```text
RECEIVED
→ VALIDATED
→ MAPPED
→ REVIEWED
→ ACCEPTED
→ POSTED_AS_PROVISIONAL
```

Failure states:

```text
MAPPING_REQUIRED
CONFLICT
REJECTED
RECONCILIATION_REQUIRED
```

Each imported mark records:

- Moodle instance.
- Moodle course and activity identifiers.
- SIS course offering and assessment component.
- Student and enrolment mapping.
- Original Moodle value.
- Conversion formula where required.
- Import time and source response.
- Reviewing staff member.
- Final accepted SIS value.

Moodle cannot overwrite moderated, board-approved or published results.

### 5. Examination planning

An examination event contains:

- Course offering.
- Examination type.
- Academic and examination period.
- Date, time and duration.
- Venue or delivery channel.
- Candidate list.
- Seating allocation.
- Invigilators.
- Paper and script-control metadata.
- Approved accommodations.
- Conflict and capacity status.

Examination types are configurable and may include:

```text
MID_SEMESTER
END_OF_SEMESTER
MID_YEAR
FINAL
SUPPLEMENTARY
DEFERRED
SPECIAL
PRACTICAL
ORAL
VIVA
```

### 6. Examination-event lifecycle

```text
PLANNED
→ CONFLICT_CHECK
→ APPROVED
→ PUBLISHED
→ READY
→ IN_PROGRESS
→ COMPLETED
→ INCIDENT_REVIEW
→ CLOSED
```

Exceptional states:

```text
RESCHEDULED
POSTPONED
CANCELLED
INVALIDATED
```

Publishing an examination timetable requires:

- Venue-capacity validation.
- Candidate conflict detection.
- Invigilator conflict detection.
- Approved duration.
- Required accommodations.
- Authorised timetable approval.

A published event may only be changed through a controlled rescheduling process with affected-user notification.

### 7. Candidate eligibility

The candidate list is generated from authoritative course registrations.

Eligibility checks include:

- Active course registration.
- Permitted institutional-registration state.
- Applicable examination-entry rules.
- Approved financial or administrative holds.
- Academic misconduct restrictions.
- Deferred or supplementary eligibility.
- Approved special arrangements.

Exclusion from an examination requires a recorded rule, authority and communication. Moodle enrolment alone never establishes examination eligibility.

### 8. Examination accommodations

The examination office receives only the accommodation instructions necessary to arrange the examination, such as:

- Additional time.
- Accessible venue.
- Assistive technology.
- Reader or scribe.
- Rest breaks.
- Alternative assessment arrangement.

Medical or counselling details remain in their protected domains.

### 9. Examination materials and scripts

The system supports:

- Paper setters and moderators.
- Secure paper versions.
- Approval status.
- Controlled release windows.
- Encrypted document storage.
- Printed-copy accountability.
- Script issue and return tracking.
- Anonymous candidate numbers where enabled.
- Marker and moderator allocations.
- Lost-script and compromised-paper incidents.

Access to examination papers must be separately permissioned and strongly audited.

### 10. Examination attendance and incidents

Attendance records distinguish:

```text
PRESENT
ABSENT
LATE
REMOVED
SPECIAL_ARRANGEMENT
ATTENDANCE_UNCONFIRMED
```

Incident records may cover:

- Suspected misconduct.
- Candidate illness.
- Power or network interruption.
- Incorrect paper.
- Venue disruption.
- Lost or damaged script.
- Invigilator irregularity.
- Security compromise.

An incident can place affected results into `WITHHELD` or `REVIEW_REQUIRED` without altering marks.

### 11. Mark calculation

The calculation engine uses the immutable assessment-scheme and policy snapshots.

It must preserve:

- Raw component mark.
- Normalised component mark.
- Weighted contribution.
- Pre-rounded total.
- Rounded total.
- Grade.
- Result code.
- Calculation formula version.
- Calculation trace.

Every calculated result must be reproducible from stored inputs.

### 12. Course-result workflow

```text
INCOMPLETE
→ CALCULATED
→ VALIDATION_REQUIRED
→ VALIDATED
→ MODERATION_COMPLETE
→ BOARD_RECOMMENDED
→ APPROVED
→ PUBLISHED
```

Alternative states include:

```text
MISSING_MARKS
RETURNED_FOR_CORRECTION
WITHHELD
DEFERRED
SUPPLEMENTARY_REQUIRED
MISCONDUCT_PENDING
AMENDMENT_PENDING
```

Publication is a distinct authorised action. A calculated result is not automatically official.

### 13. Configurable result-approval route

An institution may configure an approval route such as:

```text
Course Coordinator
→ Departmental Examination Board
→ School or Faculty Board
→ Senate or Authorised Committee
→ Publication
```

Another institution may use fewer or differently named levels.

Each stage records:

- Submitted result set.
- Exceptions.
- Quorum where required.
- Recommendation.
- Approver or committee.
- Meeting reference.
- Decision date.
- Returned corrections.
- Attached evidence.

### 14. Grade and GPA policies

Grade scales are effective-dated and may define:

- Mark boundaries.
- Letter grades.
- Grade points.
- Pass and fail classifications.
- Non-GPA result codes.
- Repeat treatment.
- Supplementary treatment.
- Credit weighting.
- Rounding precision.

The system stores both numeric results and the applied grade-policy version.

GPA, cumulative GPA, weighted average and degree classification are separate configurable calculations. The system must not assume every programme uses GPA.

### 15. Progression workflow

After applicable official results are approved:

```text
NOT_EVALUATED
→ CALCULATED
→ EXCEPTIONS_IDENTIFIED
→ ACADEMIC_REVIEW
→ BOARD_RECOMMENDED
→ APPROVED
→ PUBLISHED
```

Possible decision outcomes are those approved in the academic-rules amendment, including:

```text
PROCEED
PROCEED_WITH_CARRY
PROCEED_WITH_RESTRICTIONS
SUPPLEMENTARY_PENDING
REPEAT_FAILED_COURSES
REPEAT_STAGE
INTERRUPTION_REQUIRED
EXCLUDE
COMPLETION_PENDING
BOARD_REVIEW_REQUIRED
```

### 16. Academic standing versus progression

These concepts remain separate:

- **Academic standing** describes the student’s academic condition, such as good standing, warning or probation.
- **Progression decision** determines the permitted next action, such as proceeding, carrying courses or repeating a stage.
- **Programme-attempt state** indicates whether the overall programme attempt is active, interrupted, completed or terminated.

An institution configures its standing categories and thresholds.

### 17. Missing marks and incomplete decisions

A progression run must not silently treat missing marks as failures.

When mandatory marks are missing:

1. The affected result becomes `MISSING_MARKS`.
2. The progression decision becomes `BOARD_REVIEW_REQUIRED` or remains pending.
3. A work item is assigned to the responsible academic unit.
4. Escalation deadlines apply.
5. Resolution is audited.
6. Progression is recalculated using the same policy version.

### 18. Appeals and result amendments

```text
DRAFT_APPEAL
→ SUBMITTED
→ ADMISSIBILITY_REVIEW
→ UNDER_REVIEW
→ DECISION
→ IMPLEMENTATION
→ CLOSED
```

Possible decisions include:

```text
UPHELD
PARTIALLY_UPHELD
DISMISSED
RETURNED_FOR_REMARK
PROCEDURAL_REVIEW_REQUIRED
```

A published-result amendment creates a new official version linked to the previous result. It does not overwrite history.

Before approving an amendment, the system identifies impacts on:

- Progression.
- Prerequisites and registrations.
- Academic standing.
- Fees.
- Graduation eligibility.
- Transcript versions.
- Previously issued credentials.
- Student-success alerts.

Affected downstream decisions are recalculated or sent for authorised review.

### 19. Publication and student access

Students may see:

- Provisional marks only when institutional policy permits.
- Official results only after publication.
- Outstanding or withheld statuses with an authorised explanation.
- Progression decisions.
- Supplementary or repeat requirements.
- Appeal instructions and deadlines.

Students must not see internal board comments, confidential misconduct evidence or another student’s results.

### 20. Early detection integration

Student-success rules may use authorised provisional indicators such as:

- Repeated low assessment performance.
- Missing assessments.
- Low attendance or Moodle engagement.
- Failed prerequisite courses.
- Excessive carry load.

These indicators remain support signals, not official results. A risk alert cannot change a mark, standing or progression decision.

Do you approve **Design Section 5: Assessment, examinations, results and progression operations**?

---

## Following user responses before the next design record

### User message 0068

yes i approve the design then we need results to be entered once thats what we mean by integration with moodle,no need to enter results or academic reults from moodle,hence it should pass proper authorities for validation before publication.then we need during exams to evaluate the lecturers and the teaching methodologies by students before they obtain exam slips that they can use as validation in the exams,

### User message 0070

yes i approve the design
