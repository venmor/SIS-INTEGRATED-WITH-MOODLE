<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: a200c6f2-0b89-5beb-8e94-014fa19ec6c4; chronological message: 174. -->

# Role Blueprint 3 — Lecturer and Tutor  
## Part 2: Assessment-plan setup, Moodle activity mapping, gradebook governance, marking workflow and moderated CA submission

This part defines how lecturers, course coordinators and authorized tutors create and manage assessments without allowing Moodle or a single staff member to silently create official results.

The core rule is:

> An assessment may be created in Moodle for learning purposes, but it contributes to official Continuous Assessment (CA) only when it is included in an approved SIS assessment plan and passes the required review/moderation workflow.

---

## 1. Assessment-plan workspace

The course coordinator or assigned lecturer opens:

> CSC 4792 → Assessment plan

The page shows:

- Course and academic period
- Assessment-plan version
- Current status
- Total approved weighting
- CA contribution
- Final-exam contribution
- Assessment components
- Related Moodle activities
- Required approvals
- Students/TGs affected
- Last updated and published date

Example:

> **Assessment plan — CSC 4792 · January 2027**  
> Status: Draft awaiting course-coordinator approval  
> Continuous Assessment: 50%  
> Final Examination: 50%  
>  
> `Add assessment component`  `Review plan`  `Submit for approval`

The total weighting must be validated against the approved course rule. The system does not assume every course has a 50/50 CA/final-exam structure.

---

## 2. Assessment component

Each component in the plan records:

- Name, for example `Quiz 1`
- Assessment type
- Maximum mark
- Weight toward CA/final course result
- Applicable student group: whole class or selected TG(s)
- Opening, due and close dates
- Expected marking/release date
- Late-submission rule
- Deferred/special-arrangement rule
- Assigned creator/marker/moderator
- Moodle activity mapping, if applicable
- Result-visibility rule
- Whether it is practice only or contributes to official CA

### 2.1 Component states

| Status | Meaning |
|---|---|
| Draft | Being prepared; not visible to students |
| Awaiting approval | Submitted for authorized review |
| Approved | May be published/used under the plan |
| Published | Students can see the assessment/instructions |
| Open | Students may complete or submit |
| Closed | Student activity window ended |
| Marking in progress | Marks are being recorded |
| Awaiting moderation | Marks require approved review |
| Approved for CA | Component marks can contribute to official CA |
| Released to students | Permitted marks/feedback visible |
| Superseded | Replaced through approved change control |
| Cancelled | Authorized cancellation with student communication |

---

## 3. Who may create or assign a quiz

### 3.1 Lecturer/course-coordinator permissions

An assigned lecturer or course coordinator may create, edit, publish, mark and submit assessment components within their course authority.

They can create quizzes for:

- Whole official class list
- One or more Tutorial Groups (TGs)
- Configured assessment cohort, where policy permits

### 3.2 Tutor quiz permissions

A tutor may create or assign quizzes only when their teaching assignment explicitly includes:

> **Quiz creation and marking permitted**

The assignment defines the scope:

| Tutor assignment | Quiz scope |
|---|---|
| Tutor · CSC 4792 · TG 2 | Quiz for TG 2 only |
| Tutor · CSC 4792 · TG 1 and TG 2 | Quiz for assigned TGs only |
| Tutor · CSC 4792 · course-wide quiz permission | Quiz for all officially registered students, subject to coordinator rules |
| Tutor · teaching only | Cannot create/assign official or graded quiz |

A tutor can create:

- **Practice quiz** — learning-only, does not count toward CA.
- **Approved quiz** — counts toward CA only if it is in the approved assessment plan.

The user interface must make this difference impossible to miss.

### 3.3 Quiz-creation choice

When the tutor selects `Create quiz`, the first question is:

> What type of quiz are you creating?

Options:

- `Practice quiz — does not count toward CA`
- `Assessment quiz — must be linked to an approved assessment-plan component`

If the tutor chooses an assessment quiz without a valid component:

> This quiz cannot be used for official CA because no approved assessment component is available. Create it as practice, or ask the course coordinator to update the assessment plan.

---

## 4. Moodle activity mapping

### 4.1 Mapping screen

For an approved assessment component, staff select:

> `Link Moodle activity`

The page displays:

- SIS assessment component
- Component weight/max mark
- Student scope: official class list or named TGs
- Expected dates
- Existing linked Moodle activity, if any
- Available Moodle activities in the correct course
- Grade scale/mapping
- Marking/release rule

A valid mapping requires:

- Same course offering and academic period
- Moodle activity belongs to the linked Moodle course
- Student scope matches or is an authorized subset
- Grade scale can be mapped safely
- Assessment component is approved
- Mapping is not already bound to another incompatible official component

### 4.2 Example mapping

> **SIS component:** Quiz 1  
> **Contributes to CA:** 10%  
> **Student scope:** CSC 4792, all TGs  
> **Moodle activity:** Quiz 1 — Data Preparation  
> **Moodle maximum mark:** 20  
> **Official CA mapping:** 20 marks mapped to 10%  
>
> `Save mapping`

The screen calculates the transformation visibly. Staff must not guess how Moodle points become official weighted marks.

### 4.3 TG-specific quiz

A TG-specific quiz is allowed only where the approved plan permits different assessment delivery for that TG or an authorized equivalent assessment arrangement exists.

The system requires the staff member to state:

- Why the quiz applies to specified TG(s)
- Whether all students receive equivalent assessment opportunity
- Whether the quiz is practice-only or CA-contributing
- Coordinator/moderator approval if it affects official CA

This prevents one TG from quietly receiving a different graded assessment without academic authorization.

---

## 5. Assessment-plan change control

### 5.1 Before publication

Before any assessment is published to students, authorized staff may change the draft plan subject to course rules.

The system records:

- What changed
- Why
- Who changed it
- Approval status
- New plan version

### 5.2 After publication

After students can see an assessment, changes are controlled.

The staff member selects:

> `Request assessment change`

They specify:

- Component affected
- Proposed change
- Reason
- Student impact
- Whether deadline, weight, scope, question set or marking rule changes
- Required approval route

Examples of changes requiring approval:

- Changing weight
- Moving deadline
- Cancelling assessment
- Changing which TGs are assessed
- Replacing quiz activity
- Changing grade scale
- Changing CA contribution

Student-visible message after approval:

> Quiz 1 deadline changed to 18 March 2027, 17:00 CAT. The course assessment plan has been updated.

The system must not silently edit a published assessment rule after students have acted on it.

---

## 6. Marking workflow

### 6.1 Moodle-created marks

For Moodle quizzes/assignments:

1. Moodle records attempt/submission/initial mark.
2. Staff mark or review according to component rules.
3. Moodle feedback/mark may be released to students under Moodle rules.
4. The mapped marks are imported into an SIS **grade-import batch**.
5. The lecturer/coordinator checks the batch.
6. Required moderator reviews it.
7. Approved marks become official CA component records.
8. The student sees official CA only when release policy permits.

### 6.2 Manually entered marks

For presentations, clinical work, practical assessments or other non-Moodle assessments, the assigned staff member uses a secure marking form.

The form shows only the permitted student scope:

- Whole official class list, for lecturer/coordinator
- Assigned TG, for tutor
- Assigned assessment group, where configured

Each entry includes:

- Student
- Assessment component
- Mark
- Absence/non-submission status
- Approved reason/arrangement where applicable
- Internal marker note, restricted
- Student-visible feedback, where permitted

The system validates the mark against the component maximum and approved grade scale.

### 6.3 Bulk marking/import

Authorized staff may upload marks using a controlled template only when policy permits.

The template contains:

- Student number/reference
- Component identifier
- Mark/status
- No confidential profile data

Before import, the system displays:

- Recognized students
- Unknown/duplicate student identifiers
- Out-of-range marks
- Missing required entries
- Changes from previously staged marks
- TG/course scope mismatch

Nothing becomes official until the batch is reviewed and approved.

---

## 7. Gradebook governance

### 7.1 Grade states

| State | Meaning |
|---|---|
| Moodle learning mark | Learning-system mark/feedback only |
| Imported for review | Entered SIS staging batch; not official |
| Returned for correction | Lecturer/tutor must correct issue |
| Awaiting moderation | Required reviewer has not approved |
| Approved official CA component | Official approved component mark |
| Released to student | Approved mark may be displayed |
| Locked | Cannot be changed without formal correction workflow |
| Superseded | Replaced by authorized correction version |

### 7.2 Lecturer/tutor view

The gradebook clearly labels every column. For example:

| Student | Quiz 1 (Moodle) | Quiz 1 official CA | Assignment 1 | CA running total |
|---|---:|---:|---:|---:|
| Student A | 18/20 | Awaiting moderation | 14/15 | Not yet official |
| Student B | 16/20 | Approved | 12/15 | 28/35 provisional |

The staff member cannot mistake a Moodle value for an approved official mark.

### 7.3 Grade release

A lecturer/tutor may release Moodle feedback if their assignment allows it. They cannot release official CA or final course results unless assigned as an authorized release role.

The screen separates:

- `Release Moodle feedback`
- `Submit official CA for moderation`
- `Release approved CA` — restricted authorized role
- `Submit final course results` — examinations workflow only

---

## 8. Moderation and CA approval

### 8.1 Batch-review screen

The lecturer/coordinator opens:

> Grade batch review — Quiz 1

The page displays:

- Assessment component and plan version
- Student/TG scope
- Expected vs received marks
- Missing/late/absent cases
- Mark distribution
- Changes after prior review
- Moodle source/import time or manual-entry source
- Required moderator
- `Return for correction`
- `Submit for moderation`

The system can flag unusual patterns, but does not label them as errors automatically or make academic decisions.

### 8.2 Moderator action

The authorized moderator can:

- Approve batch
- Return batch with explanation
- Request clarification
- Approve with documented condition where policy permits
- Refer to examinations/department authority

They cannot silently modify individual marks without an auditable correction reason and appropriate authority.

### 8.3 Official CA creation

After approval, the system:

1. Locks the approved grade batch.
2. Creates official CA component records.
3. Recalculates approved CA totals according to assessment-plan rules.
4. Creates an audit event and result-release event.
5. Publishes student-visible information only if permitted.
6. Prevents Moodle from overwriting the official values.

---

## 9. Student visibility

The student sees the assessment plan and permitted statuses, but not staff-only workflow detail.

| Student may see | Student must not see |
|---|---|
| Assessment title, weight, deadline and instructions | Internal draft versions |
| Submission/completion status | Other students’ marks |
| Moodle feedback when released | Marker/moderator private notes |
| Approved CA component/total when released | Grade-import anomalies |
| Official course result after examinations release | Internal moderation discussion |
| Approved assessment change | Staff assignment/authority details |

---

## 10. Failure and recovery catalogue

| Situation | Staff-facing response | System behaviour |
|---|---|---|
| Tutor lacks quiz permission | Explain assignment scope and coordinator route | Block quiz creation |
| Tutor tries course-wide quiz from one TG scope | Show TG limitation | Prevent publication outside assigned scope |
| Assessment quiz has no approved component | Offer practice quiz or plan-update route | Block official mapping |
| Moodle activity deleted/changed | Show broken mapping and student impact | Block grade import; create integration issue |
| Weight total exceeds rule | Identify components causing total | Prevent plan approval |
| Mark exceeds maximum | Highlight entry and permitted range | Prevent batch submission |
| Student not on official class list | Show registration-mismatch route | Prevent official mark entry |
| Moodle import incomplete | Show missing student/source data | Keep batch non-official |
| Moderator returns marks | Show reason and correction task | Preserve prior version/audit |
| Published deadline change requested | Require approval and student communication | Version plan/change record |
| Connection fails during batch submit | Show checking status; prevent duplicate batch | Use idempotency/correlation record |

---

## 11. Architecture contract

### 11.1 Core entities

| Entity | Purpose |
|---|---|
| Assessment plan version | Approved course assessment structure |
| Assessment component | One controlled assessment item |
| Assessment audience | Whole official class list, named TG(s) or approved group |
| Moodle activity mapping | SIS component to Moodle activity link |
| Gradebook entry | Mark/status for one student and component |
| Grade-import batch | Staged Moodle/manual marks |
| Moderation review | Authorized review outcome |
| Official CA component | Approved, immutable academic record component |
| Assessment-plan change request | Controlled post-publication adjustment |
| Quiz permission assignment | Tutor’s explicit creation/marking scope |

### 11.2 Commands

| Command | Main result |
|---|---|
| `CreateAssessmentPlanDraft` | Creates versioned plan draft |
| `AddAssessmentComponent` | Adds permitted component |
| `AssignAssessmentAudience` | Defines official class list/TG scope |
| `MapMoodleActivityToAssessment` | Creates approved activity mapping |
| `PublishAssessmentComponent` | Makes approved assessment visible |
| `ImportMoodleGradeBatch` | Stages Moodle marks |
| `RecordManualAssessmentMarks` | Records marks within staff scope |
| `SubmitGradeBatchForModeration` | Sends batch to required reviewer |
| `ApproveOfficialCABatch` | Creates approved official CA |
| `RequestAssessmentPlanChange` | Starts controlled post-publication change |
| `ReleaseApprovedCA` | Publishes approved CA where authorized |

### 11.3 Events

- `AssessmentPlanDraftCreated`
- `AssessmentComponentApproved`
- `AssessmentComponentPublished`
- `MoodleAssessmentActivityMapped`
- `MoodleGradeBatchImported`
- `GradeBatchSubmittedForModeration`
- `GradeBatchReturnedForCorrection`
- `OfficialCABatchApproved`
- `OfficialCAReleased`
- `AssessmentPlanChangeRequested`
- `AssessmentPlanChangeApproved`

### 11.4 Audit requirements

Record:

- Course, academic period, plan version and component
- Staff identity, role, TG/course scope and assigned permission
- Audience definition
- Moodle mapping/version and import source
- Every mark change, batch status and reason
- Moderation authority and outcome
- Official CA calculation/release version
- Assessment change reason, approval and student notification
- Denied actions due to insufficient tutor scope

---

## 12. Part 2 acceptance tests

Part 2 is accepted when:

- Assessment plans are versioned, approved and visible before official assessments are published.
- A tutor can create/assign a quiz only within explicitly assigned TG/course scope.
- Practice quizzes are unmistakably separate from CA-contributing quizzes.
- A Moodle activity contributes to CA only through an approved component mapping.
- TG-specific graded quizzes require authorized equivalent-assessment rules and approval.
- Moodle marks are staged and moderated before they become official CA.
- Lecturers/tutors cannot enter marks for students outside their official class-list/TG scope.
- Weight, grade-scale, deadline and mark-range errors block unsafe publication or approval.
- Students see only approved assessment information and permitted marks/feedback.
- Grade changes, moderation actions and post-publication assessment changes are auditable.
- Moodle mapping/import failures have clear recovery paths.
- Keyboard, screen-reader, mobile, low-bandwidth and access-boundary tests pass.

**Please approve Role Blueprint 3, Part 2: Assessment-plan setup, Moodle activity mapping, gradebook governance, marking workflow and moderated CA submission.**

After approval, I will continue with Part 3: **final result submission, moderation, examination-board workflow, result correction and controlled student-result release.**

---

## Following user responses before the next design record

### User message 0175

Thank you so much, I have reviewer and approved the implementation  we can proceed
