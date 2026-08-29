<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 095a45c1-6086-5a8e-a3ac-2bcc608f26ab; chronological message: 155. -->

# Role Blueprint 2 — New Student and Continuing Undergraduate Student  
## Part 5: Learning progress, assessment visibility, Moodle synchronization, official results, supplementary exams and academic-record requests

This part defines a real SIS–Moodle integration and the student experience from course learning through official results.

The core distinction is:

> **Moodle manages teaching and learning activity.**  
> **The SIS manages official registration, assessment governance, approved results, progression and academic records.**

They synchronize useful data in both directions, but Moodle activity data must not automatically become an official result without the approved academic workflow.

---

## 1. Assessment model

Each course offering has a versioned **assessment plan** approved before teaching begins.

The plan defines:

- Assessment components
- Weight/maximum mark
- Due/open/close dates
- Whether individual or group based
- Required submission type
- Marking/moderation requirement
- Whether it contributes to continuous assessment (CA)
- Whether it contributes to final course result
- Late-submission rule
- Make-up/deferred-assessment rule
- Result-release rule
- Moodle activity mapping, where applicable

### 1.1 Assessment types supported

| Assessment type | Typical Moodle role | SIS/official-record role |
|---|---|---|
| Quiz/test | Online quiz, timed test | Approved component score after lecturer/review workflow |
| Assignment | File/text submission | CA component after marking and approval |
| Practical/laboratory assessment | Moodle instructions/evidence where appropriate | Mark entered or imported through controlled workflow |
| Group assignment/project | Group activity/submission | Individual/group result with approved allocation rule |
| Presentation/oral assessment | Booking/materials/rubric support | Official mark entered by authorized assessor |
| Clinical/field assessment | Placement/evidence support where approved | Controlled professional/clinical assessment record |
| Mid-semester examination | Schedule/materials where appropriate | Authorized CA/examination component |
| Final examination | Timetable/notice access only where required | Examination result through examinations workflow |
| Research/dissertation milestone | Milestone activity, feedback and evidence | Progress milestone; final mark follows approved assessment |
| Industrial-training milestone | Logs/evidence/supervisor feedback | `In progress` until final authorized completion |
| Supplementary examination | Candidate information/instructions | Separate linked official assessment attempt |

A course can contain several assessment types. The system must not assume every course is only quizzes and assignments.

---

## 2. Real Moodle integration architecture

### 2.1 Synchronization principle

The integration is event-driven with scheduled reconciliation. It provides near-real-time updates where possible and detects/corrects missed or conflicting updates.

It is **not**:

- A hyperlink to Moodle
- A nightly blind export
- A process where staff retype every enrolment and grade manually
- A process where Moodle silently overwrites official SIS records

### 2.2 SIS → Moodle synchronization

The SIS is authoritative for student identity, official course registration and staff teaching entitlement.

When an approved event occurs, the integration synchronizes:

| SIS event | Moodle update |
|---|---|
| Student registration completed | Create/update student enrolment in correct Moodle course |
| Registration amendment approved | Add/remove student from course |
| Programme/course section assigned | Assign student to Moodle group/cohort where configured |
| Lecturer/tutor teaching assignment approved | Create/update teacher/non-editing teacher role |
| Course offering published | Create/link Moodle course shell using approved template |
| Timetable/assessment-plan update | Update applicable calendar/assessment metadata |
| Student withdrawal/course drop effective | Suspend/remove enrolment according to policy |
| Student identity/contact change | Update minimum permitted profile data |
| Academic period/course closes | Archive/lock access according to policy |

Each outbound update has:

- Source event ID
- Correlation ID
- Idempotency key
- Payload version
- Delivery status
- Retry policy
- Reconciliation record

### 2.3 Moodle → SIS synchronization

Moodle returns approved learning data to the SIS through defined mappings:

| Moodle source | SIS use |
|---|---|
| Course/activity metadata | Displays student learning-plan view and validates assessment mapping |
| Activity due dates | Supports student task calendar |
| Submission status | Shows “submitted/not submitted” learning-progress status |
| Quiz attempt/completion | Supports learning-progress display and authorized CA workflow |
| Gradebook component value | Imported into staging for lecturer/examination approval—not instantly official result |
| Feedback-release status | Shows whether course feedback is available in Moodle |
| Course participation/activity signal | May support explainable adviser observation under Section 12B, never automatic discipline/diagnosis |
| Role/enrolment change reported by Moodle | Reconciled against SIS authoritative entitlement |
| Synchronization failure | Creates operations work item; does not change official registration |

The SIS accepts only mappings approved for that course offering and assessment-plan version.

### 2.4 Reconciliation

At scheduled intervals, the integration compares:

- SIS registered student roster vs Moodle enrolments
- SIS lecturer/tutor assignment vs Moodle teaching roles
- SIS assessment-plan components vs Moodle activities/gradebook items
- Moodle grade-import batch vs expected eligible students
- Moodle course closure status vs academic-period status

Mismatches create a visible operational queue. They never silently become an unofficial second truth.

---

## 3. Student learning area

### 3.1 Course learning card

From `My studies`, the student sees each registered course with both academic and learning status.

Example:

> **CSC 4792 — Data Mining and Warehousing**  
> Registration: Registered  
> Moodle access: Synced 14:32 CAT  
> Learning progress: 3 of 5 published assessments submitted  
> Official result: Not yet released  
>
> `Open learning area`  `View assessment plan`

This is an integrated summary, not merely a Moodle link.

### 3.2 Assessment-plan page

Page title:

> Assessment plan — CSC 4792

The page shows:

- Assessment component
- Type
- Weight
- Due date
- Submission/attendance status
- Mark/feedback availability
- Whether the component contributes to CA
- Source of truth
- Official status

Example:

| Component | Weight | Due date | Learning status | Official status |
|---|---:|---|---|---|
| Assignment 1 | 15% | 10 Mar | Submitted | Mark awaiting release |
| Quiz 1 | 10% | 17 Mar | Completed | CA component pending approval |
| Mid-semester test | 25% | 28 Mar | Scheduled | Not yet assessed |
| Final exam | 50% | 12 Jun | Not yet available | Examinations result pending |

The student can see what counts toward CA without seeing hidden grading formulas, staff moderation notes or other students’ results.

### 3.3 Student action from SIS

For each Moodle-based assessment, the SIS provides contextual actions:

- `Open assignment`
- `Open quiz`
- `View feedback in Moodle`
- `View submission status`
- `Request approved assessment support`
- `Report access problem`

The student returns to the specific Moodle activity through secure single sign-on and course/activity identifiers, not a generic Moodle homepage.

### 3.4 Learning and official result separation

The page labels every value:

- **Moodle learning mark:** provisional/coursework value visible in Moodle
- **Official CA component:** approved/imported component in SIS
- **Official course result:** released through examinations/academic approval

Example:

> Moodle currently shows 18/20 for Quiz 1. This is learning feedback and is not yet your official course result.

This prevents a student from assuming an LMS gradebook total is automatically the official mark.

---

## 4. Student assessment experience

### 4.1 Assessment notifications

The student receives task notifications for:

- Assessment published
- Due date approaching
- Submission confirmed by Moodle
- Submission could not be synchronized
- Mark/feedback released in Moodle
- Official CA component released in SIS where policy permits
- Official course result released
- Supplementary exam eligibility/outcome
- Assessment schedule changed

Notifications distinguish a learning deadline from an official examination event.

### 4.2 Submission status

The SIS displays a privacy-safe mirrored status:

- Not opened, where Moodle provides this and policy permits
- In progress
- Submitted
- Submitted late
- Missing
- Not applicable
- Sync delayed/unavailable

If Moodle is unavailable, the SIS says:

> Moodle submission status could not be refreshed. Check Moodle directly when it is available. Your official registration remains unchanged.

It does not label an assignment “missing” only because a synchronization request failed.

### 4.3 Extensions, deferrals and special arrangements

Students cannot change assessment deadlines themselves.

They may select:

> `Request assessment support or extension`

The request route is configuration driven and may go to a lecturer, programme office, disability-support officer or examinations office, depending on assessment type and policy.

The student sees:

- Request category
- Evidence/privacy notice
- Who will receive the request
- Current deadline
- Decision status
- Approved adjusted arrangement where applicable

Confidential disability/counselling information remains in its restricted workspace. Teaching staff see only the approved accommodation necessary to conduct assessment.

---

## 5. Official CA and result processing

### 5.1 CA import and approval

Moodle grade data can support official CA, but the process is controlled:

1. Moodle activity is mapped to an approved SIS assessment component.
2. Moodle grades are imported into a **staging batch**.
3. The lecturer/tutor reviews completeness, anomalies and mappings.
4. Authorized moderation/examination roles approve the batch according to policy.
5. The approved component becomes an official CA record in the SIS.
6. Students see it only when the release rule permits.

Moodle cannot directly overwrite:

- Official CA
- Final examination mark
- Course result
- Progression outcome
- Supplementary eligibility

### 5.2 Student CA view

When CA visibility is permitted:

> **Continuous assessment — CSC 4792**  
> Official CA currently recorded: 52/100  
> Last approved component: Mid-semester test  
> Status: Provisional until final course result is released.

The system must clarify whether this is:

- Running CA total
- Final CA total
- Published component summary only
- Not yet available

### 5.3 Results publication

Official results are released only after:

- Marks are authorized according to examination governance.
- Required moderation/board process is complete.
- Result-release date is reached.
- Any configured finance/records restrictions are evaluated under policy.
- Publication batch completes successfully.

When results are released, the student receives a secure notification:

> Your official results for January 2027 are available. Sign in to view them.

### 5.4 Results page

Page title:

> Official results — January 2027

For each course, the student sees:

- Course code/title
- Course type: half/full/extended
- Attempt number
- Official outcome: passed, failed, in progress, deferred, etc.
- Official grade/mark where policy permits
- Supplementary eligibility/outcome, where applicable
- Repeat requirement, if any
- Publication date
- `Request result review` where permitted

For an extended activity:

> **Industrial Training — In progress**  
> This activity continues into Year 4. A final result will be released after its approved completion requirements are met.

It must not be presented as an F/failed result simply because a final grade does not yet exist.

---

## 6. Supplementary-examination experience

This applies the configurable policy established in Part 3.

### 6.1 Eligibility display

When official results publish, an eligible student sees:

> **Supplementary examination available**  
> Course: CSC 4792  
> Basis: Your approved CA and applicable failed-course count meet the configured supplementary rule.  
> Confirm participation by [deadline].  
> `View supplementary details`

An ineligible student sees a factual explanation:

> You are not eligible for a supplementary examination for this course under the current approved rule.  
> Next academic action: [repeat/progression decision].

The system never exposes other courses or students’ information to explain a failed-course-count rule.

### 6.2 Candidate workflow

The student can:

- View course, date, time, venue/modality and candidate instructions
- View supplementary fee requirement, if applicable
- Confirm attendance/participation where policy requires
- Pay required fee through Finance workflow
- View approved accommodation information
- Receive final supplementary result

The system prevents booking where eligibility, deadline, payment or capacity conditions fail.

### 6.3 Final outcome

After authorized supplementary processing:

> **Supplementary result released**  
> CSC 4792 — Supplementary passed  
> Your academic progression status has been updated.

The original attempt remains visible historically. The system shows the final official outcome according to transcript/reporting rules but preserves all linked attempts internally.

---

## 7. Result corrections, review and appeal

### 7.1 Student request

Where policy permits, the student selects:

> `Request result review`

The page shows:

- Course/result in question
- Request deadline
- Permitted grounds
- Required explanation/evidence
- Applicable fee, if any
- Responsible office
- Outcome timeline
- What a result review can and cannot do

The student cannot directly edit an official mark.

### 7.2 Controlled review

A request creates a restricted examination-review case.

Possible outcomes:

- No change
- Clerical correction
- Mark amended after authorized review
- Further academic process required
- Request ineligible/out of time
- Withdrawn by student

If a result changes:

- Original published result remains auditable.
- Authorized amended result version is recorded.
- Progression, repeat requirement, supplementary status, course plan and finance effects are recalculated.
- Student receives a clear result-change notice.
- No staff member can silently overwrite a released result.

---

## 8. Academic-record requests

### 8.1 Student academic record

The student can view a read-only academic record showing:

- Programme
- Academic periods
- Registered courses
- Official results/outcomes
- Progression outcomes
- Credits/academic-load information where approved
- Current student status

This view is not a replaceable spreadsheet and does not expose staff notes.

### 8.2 Transcript and confirmation requests

The student may request:

- Official transcript
- Statement of results
- Registration confirmation
- Expected-completion confirmation where permitted
- Other approved academic document

The request page shows:

- Document type
- Purpose/recipient where needed
- Applicable fee
- Delivery method
- Processing time
- Current financial/records prerequisites
- Request status

A document request becomes a controlled work item. Downloaded copies carry authenticity/verification information and do not become editable official records.

---

## 9. Moodle integration failures and recovery

| Situation | Student-facing behaviour | System/integration behaviour |
|---|---|---|
| Registered in SIS but no Moodle course yet | Registration shown as complete; learning access pending | Retry provisioning; create operations task |
| Moodle enrolment exists but SIS registration removed | Explain controlled access update if relevant | Reconcile and suspend/remove Moodle role per policy |
| Moodle mark exists but mapping missing | Student sees Moodle feedback only; no official CA import | Route mapping issue to academic/operations queue |
| Grade import fails | Official result remains unchanged | Preserve batch; retry/reconcile; notify staff only as needed |
| Moodle activity deleted/changed | Show learning-plan mismatch where student impact exists | Require authorized assessment-plan change, not silent re-map |
| Moodle unavailable during deadline | Show Moodle service status and approved contingency route | Record incident; staff apply approved extension/contingency process |
| Duplicate Moodle accounts | Student sees secure access-recovery instruction | Identity/integration administrator resolves controlled merge |
| Lecturer role missing | Student can report learning-access problem | Reconcile teaching assignment; do not grant student staff powers |
| SIS result amended | Student sees official update | Never overwrite Moodle history blindly; publish bounded result status if needed |

---

## 10. Architecture contract

### 10.1 Core entities

| Entity | Purpose |
|---|---|
| Assessment plan | Versioned course assessment design |
| Assessment component | One weighted/ruled assessment item |
| Moodle course mapping | Link between SIS course offering and Moodle course |
| Moodle activity mapping | Link between SIS assessment component and Moodle activity |
| Moodle enrolment projection | Synced learner/teacher entitlement state |
| Learning-progress projection | Student-safe view of activity/submission state |
| Grade-import batch | Staged Moodle grade data awaiting approval |
| Official CA record | Authorized continuous-assessment component/total |
| Official course-result record | Released course outcome |
| Result-review case | Controlled correction/appeal workflow |
| Academic-document request | Transcript/statement/confirmation request |

### 10.2 Commands

| Command | Main result |
|---|---|
| `PublishAssessmentPlan` | Makes authorized assessment plan available |
| `ProvisionMoodleCourse` | Creates/links course shell and template |
| `SynchronizeMoodleEnrolment` | Adds/updates/removes learner/teacher roles |
| `SynchronizeMoodleLearningProgress` | Imports safe activity/submission states |
| `ImportMoodleGradeBatch` | Stages mapped Moodle grade components |
| `ApproveOfficialCABatch` | Converts approved components to official CA records |
| `ReleaseOfficialCourseResults` | Publishes authorized course results |
| `AssessSupplementaryEligibility` | Creates student-specific eligibility outcome |
| `RecordSupplementaryResult` | Records approved supplementary result |
| `RequestResultReview` | Opens controlled result-review case |
| `IssueAcademicDocument` | Produces authorized academic record/document |

### 10.3 Events

- `AssessmentPlanPublished`
- `MoodleCourseProvisioned`
- `MoodleEnrolmentSynchronized`
- `MoodleLearningProgressSynchronized`
- `MoodleGradeBatchImported`
- `OfficialCAApproved`
- `OfficialCourseResultsReleased`
- `SupplementaryEligibilityPublished`
- `SupplementaryResultReleased`
- `ResultReviewRequested`
- `OfficialResultAmended`
- `AcademicDocumentRequested`
- `AcademicDocumentIssued`

### 10.4 Audit and data-governance requirements

Record:

- Course/assessment-plan/mapping version
- Source system and synchronization timestamps
- Enrolment/role change outcome
- Grade import batch, source values, approving role and moderation state
- Official CA/result publication authority
- Result-review requests and amendments
- Student access to results and academic documents
- Integration retries, mismatches and reconciliation outcome

The system must not:

- Train external AI models on identifiable Moodle activity or submitted work without approval.
- Make a progression, discipline, counselling or admission decision from Moodle engagement automatically.
- Let Moodle overwrite official SIS results.
- Expose staff grading notes, peer feedback, private forum content or other students’ activity to unauthorized users.

---

## 11. Part 5 acceptance tests

Part 5 is accepted when:

- Moodle provisioning, enrolment, role assignment and course-group synchronization occur from authoritative SIS events.
- Moodle activities and gradebook items map only to approved versioned assessment components.
- Students see an integrated course view with registration, learning, assessment and official-result status.
- Moodle marks are clearly labelled as learning/provisional until approved through the official CA/result process.
- Grade imports are staged, reviewed and authorized before becoming official.
- Students can see assessment deadlines, submissions and feedback access without Moodle becoming the official academic-record system.
- Moodle outages/sync delays do not falsely affect registration, grades or progression.
- Extended research/industrial training remains `In progress` until approved completion.
- Supplementary eligibility uses the approved configurable policy and appears only after official results are released.
- Result corrections are controlled, versioned and recalculate affected progression/finance outcomes.
- Transcript/academic-document requests use authoritative SIS records and a controlled workflow.
- Moodle/SIS reconciliation, access control, privacy boundaries, keyboard, mobile and low-bandwidth tests pass.

**Please approve Role Blueprint 2, Part 5: Learning progress, assessment visibility, Moodle synchronization, official results, supplementary exams and academic-record requests.**

After approval, I will continue with Part 6: **academic advising, student-success observations, support referrals, wellbeing boundaries, appointments and follow-up from the student’s experience.**

---

## Following user responses before the next design record

### User message 0156

We can proceed to part 6
