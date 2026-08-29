# Role Blueprint 3 — Lecturer and Tutor Journey Book

This book combines all five recovered parts for teaching workspaces, course delivery, Tutorial Groups, assessment, Moodle handoff, student observations and governed completion of teaching work.

## Recovered part 1

_Source record: `020-role-blueprint-3-lecturer-and-tutor.md`_

## Role Blueprint 3 — Lecturer and Tutor  
### Part 1: Teaching assignment, course workspace, class-list integrity and SIS–Moodle synchronization

This blueprint covers lecturers, tutors, course coordinators and other teaching staff while they are operating in a teaching role.

A person may also be a student, adviser, supervisor, Head of Department or Dean. They use one identity but explicitly switch to:

> Teaching workspace · [Department/School scope] · [Academic period]

Teaching permissions must never appear merely because someone has a staff account.

---

### 1. Role purpose and boundaries

#### 1.1 Lecturer

A lecturer is assigned to teach, assess, coordinate or oversee one or more course offerings.

They may, according to their specific assignment:

- View authorized class lists
- Access Moodle course workspace
- Create or propose assessment plans
- Review Moodle grade-import batches
- Record permitted assessment information
- Communicate with enrolled students
- Request timetable/course changes
- Refer an academic concern
- Submit grades for moderation/approval

They may not:

- Browse unrelated student records
- Change official registration, finance clearance or progression outcomes
- See confidential counselling or disciplinary records
- Unilaterally release official final results
- Alter another lecturer’s course without assignment/authority
- Grant themselves Moodle roles or edit their teaching scope

#### 1.2 Tutor

A tutor is assigned a narrower teaching scope, for example a tutorial group, laboratory group, practical session or course support activity.

A tutor may see only:

- Assigned course offering(s)
- Assigned section/group roster
- Approved assessment/attendance responsibilities
- Moodle tools allowed by their teaching assignment

A tutor cannot automatically view every group in the course, enter final course grades or access lecturer-only moderation details.

#### 1.3 Course coordinator

Where configured, a course coordinator has a course-wide academic coordination role. They may manage the approved assessment-plan configuration, grade-import review, tutor allocations and course-level learning workflow, subject to department/examinations policy.

This role is explicit; it is not assumed from being the most senior lecturer listed on a course.

---

### 2. Teaching assignment lifecycle

A teaching workspace becomes available only after an authorized assignment exists.

| State | Meaning |
|---|---|
| Proposed | Assignment prepared but not active |
| Awaiting approval | Pending authorized confirmation |
| Active | Person may access defined teaching scope |
| Scheduled future assignment | Access begins on configured date |
| Temporarily delegated | Limited delegated role with expiry |
| Suspended | Access temporarily unavailable |
| Ended | Teaching entitlement has ended |
| Reconciliation required | SIS/Moodle role mismatch requires operations review |

Every assignment records:

- Staff person
- Role: lecturer, tutor, coordinator, assessor, moderator, etc.
- Course offering
- Academic period
- Section/group scope
- Effective dates
- Permitted capabilities
- Delegation/acting authority, where applicable
- Authorizing office/role
- Audit history

---

### 3. Teaching workspace home

The lecturer/tutor home page is a work queue, not a generic analytics dashboard.

It answers:

1. Which classes am I teaching now?
2. What teaching, assessment or grading action is due?
3. Is any course/Moodle integration unhealthy?
4. Which student-support or academic issues need my limited action?
5. What timetable or course change affects me?

#### 3.1 Home-page sections

1. **Urgent actions**
   - Assessment plan awaiting approval
   - Grade batch requiring review
   - Submission deadline approaching
   - Moodle synchronization issue affecting students
   - Timetable change requiring acknowledgement

2. **My current course offerings**
   - Course, group/section, enrolment count
   - Next teaching session
   - Moodle state
   - Assessment status
   - `Open course workspace`

3. **Academic support observations to submit**
   - Only concerns the lecturer has authority to create from their course
   - Not a student-risk dashboard

4. **Teaching and integration notices**
   - Roster updates
   - Added/dropped students
   - Moodle role changes
   - Course-shell provisioning status

5. **Completed/recent work**
   - Submitted grade batches
   - Resolved support referrals
   - Recent communications

#### 3.2 Course card

Example:

> **CSC 4792 — Data Mining and Warehousing**  
> Lecturer · Course coordinator  
> 118 registered students · 4 tutorial groups  
> Moodle: Synced 14:32 CAT  
> Assessment plan: Published  
> Next action: Review Quiz 1 grade import  
>
> `Open course workspace`

A tutor card is scoped:

> **CSC 4792 — Tutorial Group B**  
> Tutor · 28 assigned students  
> Moodle group: Synced  
> Next session: Thursday, 10:00 CAT  
>
> `Open group workspace`

---

### 4. Course workspace

#### 4.1 Course header

The course workspace header always displays:

> CSC 4792 · January 2027 · Lecturer workspace · [Course-wide / Group B scope]

It includes:

- Course title/code
- Academic period
- Teaching role and scope
- Moodle synchronization state
- Registration roster freshness time
- Course status: planned, active, assessment period, closed/archived
- `Open Moodle course`
- `Report an issue`

#### 4.2 Navigation

The default course workspace navigation is:

- Overview
- Class list
- Assessment plan
- Learning and Moodle status
- Grade review and submission
- Student communication
- Academic concerns/referrals
- Timetable and teaching sessions
- Course documents
- Course history

Items appear only when the active assignment permits them.

---

### 5. Authoritative class list

#### 5.1 Roster source

The SIS is the authoritative source for official course membership.

The class list is generated from:

- Completed registration
- Approved registration amendments
- Authorized programme/course transfers
- Approved withdrawal/drop effective dates
- Group/section assignments
- Course capacity/waitlist rules

Moodle reflects the roster; it does not decide it.

#### 5.2 Class-list page

The lecturer sees:

- Student name
- Student number, partially masked in compact view where appropriate
- Group/section
- Registration state for that course
- Moodle enrolment state
- Accommodation flag only when the lecturer needs an approved action—not medical/disability detail
- Assessment eligibility/status where permitted
- Contact/message action
- Academic concern action
- Last roster update

A tutor sees only students assigned to their group unless their assignment explicitly permits course-wide access.

#### 5.3 Roster updates

When a student is added, dropped or moved:

> **Roster updated**  
> Chanda M. was added to Tutorial Group B.  
> Effective: 16 January 2027, 09:10 CAT  
> Moodle group synchronization: queued.

The lecturer/tutor cannot manually add an unregistered student to the official class list. If a student appears physically in class but not in the roster, staff use:

> `Report registration mismatch`

This creates a records/registration work item.

---

### 6. Real SIS–Moodle staff integration

#### 6.1 What the lecturer sees

The Moodle integration panel is operational, not decorative.

For each course, it shows:

- Moodle course-shell link/identifier
- Provisioning status
- Student enrolment totals: SIS vs Moodle
- Tutor/lecturer role synchronization state
- Group/section synchronization state
- Assessment-plan/activity mappings
- Grade-import batch status
- Last successful synchronization
- Mismatches requiring action
- `Open Moodle course`
- `View synchronization details`
- `Report integration issue`

Example:

> **Moodle synchronization healthy**  
> SIS registered students: 118  
> Moodle enrolled students: 118  
> Teaching roles: 4 of 4 synchronized  
> Assessment mappings: 5 of 5 active  
> Last synchronized: today, 14:32 CAT

#### 6.2 Staff-useful synchronization

The system synchronizes actual teaching data:

| Direction | Data |
|---|---|
| SIS → Moodle | Course shell, official course code/title, period, registered learners, lecturer/tutor roles, groups/sections, active/inactive status, approved assessment metadata, relevant calendar dates |
| Moodle → SIS | Activity/submission status, mapped grade components into staging, grade-feedback release state, activity schedule changes where permitted, course/group synchronization acknowledgements, integration errors |

The lecturer does not have to manually rebuild each roster, group or gradebook mapping for every course offering.

#### 6.3 Moodle course-shell creation

When a course offering is published, the system:

1. Creates or links a Moodle shell using an approved course template.
2. Applies official code/title/period metadata.
3. Sets course visibility according to academic-period rules.
4. Synchronizes assigned teaching roles.
5. Adds students only after approved registration.
6. Creates configured groups/sections.
7. Records shell and template version in the SIS integration record.

A lecturer sees the result, not a raw integration log:

> Course learning area is ready. Students will receive access after registration synchronization.

#### 6.4 Mapping safety

A Moodle activity can contribute to official CA only when it is mapped to:

- The correct SIS course offering
- The correct academic period
- An approved assessment-plan component
- A defined grade scale/weight
- A configured release and moderation workflow

The interface must block a lecturer from mapping an arbitrary Moodle quiz to an official assessment after results are already under review unless an authorized academic change process approves it.

---

### 7. Lecturer/tutor visibility boundaries

| Information | Lecturer | Tutor | Must not be exposed |
|---|---|---|---|
| Official registered students in assigned scope | Yes | Assigned group only | Other courses/programmes |
| Moodle access/sync state | Yes | Assigned group/course as configured | Unrelated Moodle courses |
| Assessment submission status | Yes | Assigned responsibilities only | Private student activity outside course |
| Approved accommodation instruction | Where needed to teach/assess | Where needed | Diagnosis, counselling notes |
| Official course result after release | Course scope | As assigned | Full academic record by default |
| Finance clearance | Only a minimal “registration valid/invalid” effect where necessary | Same | Balance, sponsor details |
| Student support | Submit limited concern | Submit limited concern | Counselling/discipline case notes |
| Academic adviser relationship | Usually not needed | Usually not needed | Full support case history |

---

### 8. Communication with students

#### 8.1 Course announcement

The lecturer/coordinator may send an approved course announcement to the current roster.

The composer requires:

- Course scope
- Audience: course-wide or selected authorized group
- Message title/body
- Optional Moodle activity/context link
- Delivery channel
- Send time
- Preview as student

Before send, the system shows roster count and warns if a student is pending Moodle synchronization.

Announcements are stored in the authoritative communication record. Moodle may receive a synchronized course announcement where configured, but duplicate sending is suppressed.

#### 8.2 Direct message

A lecturer/tutor may contact an assigned student about course participation or academic matters. The interface reminds staff:

> Do not include counselling, medical, disciplinary or other restricted information in course communication.

Course communication does not become an official academic result or counselling record.

---

### 9. Academic concerns and student-success handoff

A lecturer/tutor may select:

> `Submit academic concern`

They must identify a permitted observable basis, such as:

- Repeated missed assessment submissions
- Attendance concern where attendance data is reliable
- Course-access issue
- Academic-integrity concern through separate approved route
- Student explicitly requested academic help

The staff member cannot label a student mentally unwell, dishonest or “high risk” without an authorized process.

The concern is routed to the adviser/student-success workflow described in Section 12B and Blueprint 2 Part 6. The lecturer sees only the minimum acknowledgement/status permitted for their role.

---

### 10. Failure and recovery catalogue

| Situation | Lecturer/tutor experience | System behaviour |
|---|---|---|
| No active teaching assignment | Explain access is unavailable; show department/admin route | Block course workspace |
| Moodle shell not created | Show provisioning status; teaching assignment remains valid | Create/retry operations task |
| Roster mismatch | Show SIS/Moodle count difference and `Report mismatch` | Reconcile through integration queue |
| Student added after course begins | Show effective date and Moodle sync state | Provision access through event workflow |
| Moodle role wrong | Show no elevated access until reconciled | Correct only from SIS assignment/authorized Moodle admin action |
| Assessment mapping missing | Block official grade import for that component | Route to coordinator/admin approval |
| Student asks why not on roster | Provide records route; no manual enrolment | Preserve official roster integrity |
| Sync delayed | Display last confirmed time; no false “healthy” state | Retry/escalate per operations rule |
| Lecturer attempts course-wide action as group tutor | Explain assignment scope | Deny action and audit if necessary |

---

### 11. Architecture contract

#### 11.1 Core entities

| Entity | Purpose |
|---|---|
| Teaching assignment | Authorized staff role/scope for course offering |
| Course offering | Period-specific official course instance |
| Teaching group/section | Tutorial/lab/teaching subgroup |
| Official course roster | SIS-authoritative student membership |
| Moodle course mapping | Link to Moodle shell/template/version |
| Moodle role projection | Synced lecturer/tutor/student entitlement |
| Assessment activity mapping | Approved SIS-component to Moodle-activity link |
| Course communication | Auditable course message/announcement |
| Academic concern | Limited observable concern routed to support workflow |
| Integration reconciliation item | Mismatch/failure requiring operational handling |

#### 11.2 Commands

| Command | Main result |
|---|---|
| `ActivateTeachingAssignment` | Grants time-bound course workspace scope |
| `GenerateOfficialCourseRoster` | Produces current authorized class list |
| `ProvisionMoodleCourse` | Creates/links Moodle shell |
| `SynchronizeMoodleTeachingRoles` | Applies lecturer/tutor permissions |
| `SynchronizeMoodleCourseRoster` | Applies student/groups enrolments |
| `PublishCourseAnnouncement` | Sends authorized course communication |
| `SubmitAcademicConcern` | Creates limited adviser/student-success handoff |
| `ReportCourseIntegrationMismatch` | Opens reconciliation issue |
| `ViewCourseSynchronizationStatus` | Returns staff-safe integration status |

#### 11.3 Events

- `TeachingAssignmentActivated`
- `OfficialCourseRosterUpdated`
- `MoodleCourseProvisioned`
- `MoodleTeachingRoleSynchronized`
- `MoodleCourseRosterSynchronized`
- `CourseCommunicationPublished`
- `AcademicConcernSubmitted`
- `CourseIntegrationMismatchDetected`
- `CourseIntegrationReconciled`

#### 11.4 Audit requirements

Record:

- Staff identity, active role, course/group scope and effective dates
- Every course-roster view/export and sensitive action
- Moodle role/roster synchronization requests and outcomes
- Assessment mapping changes and approval authority
- Course announcements and selected audience
- Academic-concern basis and routing outcome
- Integration mismatch, retry and reconciliation history
- Denied actions due to scope/authorization where policy requires it

---

### 12. Part 1 acceptance tests

Part 1 is accepted when:

- A lecturer/tutor sees only course and group scopes explicitly assigned to them.
- SIS remains authoritative for teaching assignment, course roster and student registration.
- Moodle course shells, roles, student enrolments and groups are automatically synchronized from SIS events.
- Staff see real synchronization health, counts, mappings and recovery status—not a simple Moodle button.
- A tutor cannot perform course-wide lecturer actions without an explicit expanded assignment.
- Moodle grade activity cannot become official CA without approved assessment-plan mapping.
- Lecturers cannot manually add unregistered students to official rosters.
- Course communication targets only authorized current roster/group membership.
- Academic concerns are limited to observable academic information and route to the governed student-support workflow.
- Moodle failures and roster mismatches have clear operational recovery paths.
- Keyboard, screen-reader, mobile, low-bandwidth, access-boundary and integration-reconciliation tests pass.

---

## Recovered part 2

_Source record: `021-role-blueprint-3-lecturer-and-tutor.md`_

## Role Blueprint 3 — Lecturer and Tutor  
### Part 2: Assessment-plan setup, Moodle activity mapping, gradebook governance, marking workflow and moderated CA submission

This part defines how lecturers, course coordinators and authorized tutors create and manage assessments without allowing Moodle or a single staff member to silently create official results.

The core rule is:

> An assessment may be created in Moodle for learning purposes, but it contributes to official Continuous Assessment (CA) only when it is included in an approved SIS assessment plan and passes the required review/moderation workflow.

---

### 1. Assessment-plan workspace

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

### 2. Assessment component

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

#### 2.1 Component states

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

### 3. Who may create or assign a quiz

#### 3.1 Lecturer/course-coordinator permissions

An assigned lecturer or course coordinator may create, edit, publish, mark and submit assessment components within their course authority.

They can create quizzes for:

- Whole official class list
- One or more Tutorial Groups (TGs)
- Configured assessment cohort, where policy permits

#### 3.2 Tutor quiz permissions

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

#### 3.3 Quiz-creation choice

When the tutor selects `Create quiz`, the first question is:

> What type of quiz are you creating?

Options:

- `Practice quiz — does not count toward CA`
- `Assessment quiz — must be linked to an approved assessment-plan component`

If the tutor chooses an assessment quiz without a valid component:

> This quiz cannot be used for official CA because no approved assessment component is available. Create it as practice, or ask the course coordinator to update the assessment plan.

---

### 4. Moodle activity mapping

#### 4.1 Mapping screen

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

#### 4.2 Example mapping

> **SIS component:** Quiz 1  
> **Contributes to CA:** 10%  
> **Student scope:** CSC 4792, all TGs  
> **Moodle activity:** Quiz 1 — Data Preparation  
> **Moodle maximum mark:** 20  
> **Official CA mapping:** 20 marks mapped to 10%  
>
> `Save mapping`

The screen calculates the transformation visibly. Staff must not guess how Moodle points become official weighted marks.

#### 4.3 TG-specific quiz

A TG-specific quiz is allowed only where the approved plan permits different assessment delivery for that TG or an authorized equivalent assessment arrangement exists.

The system requires the staff member to state:

- Why the quiz applies to specified TG(s)
- Whether all students receive equivalent assessment opportunity
- Whether the quiz is practice-only or CA-contributing
- Coordinator/moderator approval if it affects official CA

This prevents one TG from quietly receiving a different graded assessment without academic authorization.

---

### 5. Assessment-plan change control

#### 5.1 Before publication

Before any assessment is published to students, authorized staff may change the draft plan subject to course rules.

The system records:

- What changed
- Why
- Who changed it
- Approval status
- New plan version

#### 5.2 After publication

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

### 6. Marking workflow

#### 6.1 Moodle-created marks

For Moodle quizzes/assignments:

1. Moodle records attempt/submission/initial mark.
2. Staff mark or review according to component rules.
3. Moodle feedback/mark may be released to students under Moodle rules.
4. The mapped marks are imported into an SIS **grade-import batch**.
5. The lecturer/coordinator checks the batch.
6. Required moderator reviews it.
7. Approved marks become official CA component records.
8. The student sees official CA only when release policy permits.

#### 6.2 Manually entered marks

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

#### 6.3 Bulk marking/import

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

### 7. Gradebook governance

#### 7.1 Grade states

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

#### 7.2 Lecturer/tutor view

The gradebook clearly labels every column. For example:

| Student | Quiz 1 (Moodle) | Quiz 1 official CA | Assignment 1 | CA running total |
|---|---:|---:|---:|---:|
| Student A | 18/20 | Awaiting moderation | 14/15 | Not yet official |
| Student B | 16/20 | Approved | 12/15 | 28/35 provisional |

The staff member cannot mistake a Moodle value for an approved official mark.

#### 7.3 Grade release

A lecturer/tutor may release Moodle feedback if their assignment allows it. They cannot release official CA or final course results unless assigned as an authorized release role.

The screen separates:

- `Release Moodle feedback`
- `Submit official CA for moderation`
- `Release approved CA` — restricted authorized role
- `Submit final course results` — examinations workflow only

---

### 8. Moderation and CA approval

#### 8.1 Batch-review screen

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

#### 8.2 Moderator action

The authorized moderator can:

- Approve batch
- Return batch with explanation
- Request clarification
- Approve with documented condition where policy permits
- Refer to examinations/department authority

They cannot silently modify individual marks without an auditable correction reason and appropriate authority.

#### 8.3 Official CA creation

After approval, the system:

1. Locks the approved grade batch.
2. Creates official CA component records.
3. Recalculates approved CA totals according to assessment-plan rules.
4. Creates an audit event and result-release event.
5. Publishes student-visible information only if permitted.
6. Prevents Moodle from overwriting the official values.

---

### 9. Student visibility

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

### 10. Failure and recovery catalogue

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

### 11. Architecture contract

#### 11.1 Core entities

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

#### 11.2 Commands

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

#### 11.3 Events

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

#### 11.4 Audit requirements

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

### 12. Part 2 acceptance tests

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

---

## Recovered part 3

_Source record: `022-role-blueprint-3-lecturer-and-tutor.md`_

## Role Blueprint 3 — Lecturer and Tutor  
### Part 3: Final-result submission, moderation, examination-board workflow, result correction and controlled student-result release

This part defines how approved CA, final-examination marks and other authorized assessment outcomes become an official course result.

The key rule is:

> A lecturer or tutor may prepare and submit results within their authority. Official results are released only after the required moderation, examination governance and authorized publication workflow.

No Moodle total, spreadsheet upload or individual staff action may directly publish an official final result.

---

### 1. Result-preparation workspace

An authorized lecturer or course coordinator opens:

> CSC 4792 → Final results

The page displays:

- Course offering and academic period
- Assessment-plan version
- Official CA status
- Final-examination/import status
- Student count from the official class list
- Missing/exception cases
- Result formula/version
- Moderation and board stage
- Submission deadline
- Current result-release state

Example:

> **Final results — CSC 4792 · January 2027**  
> Official CA: Approved  
> Final examination marks: Awaiting import  
> Students on official class list: 118  
> Result submission deadline: 25 June 2027, 17:00 CAT  
> Status: Preparing results

A tutor sees this page only to the extent their assignment permits—for example, they may submit an assigned TG’s practical component but not calculate or submit the full course result.

---

### 2. Result inputs and calculation

#### 2.1 Authorized inputs

The final-result calculation uses only approved inputs:

- Official CA component records
- Authorized final-examination marks
- Approved practical/clinical/research assessment records
- Approved supplementary outcome, where applicable
- Authorized deferred/make-up assessment result
- Approved course-credit/exemption status
- Versioned course result rule

The formula is defined by the approved course/programme regulation and assessment plan.

Example:

> Official CA: 50%  
> Final examination: 50%  
> Pass threshold: configured course rule  
> Result formula version: CSC4792-2027-v1

The system must not calculate final results from raw Moodle totals unless those values have completed the official CA process.

#### 2.2 Automatic calculation with human review

The system may calculate proposed result outcomes, such as pass/fail or grade, from approved inputs and configured rules.

However, it must flag—not decide—cases requiring human attention:

- Missing CA component
- Missing final examination mark
- Out-of-range mark
- Student not on official class list
- Inconsistent assessment attempt
- Approved deferred assessment
- Special accommodation result pending
- Formula/version mismatch
- Result changed after prior submission
- Course marked as extended/in progress

The system must never use an AI model to determine an official grade, progression outcome or disciplinary conclusion.

#### 2.3 Extended activities

For research, industrial training or another extended activity:

- The course remains `In progress` where the official completion period has not arrived.
- No final pass/fail result is generated prematurely.
- The result workspace shows applicable milestones and authorized final-assessment date.
- The student is not included in failed-course counts because a final result is not yet due.

---

### 3. Result states

| State | Meaning |
|---|---|
| Preparing results | Course team is assembling authorized inputs |
| Incomplete | One or more required result inputs missing |
| Ready for internal review | All required inputs present; calculations ready |
| Returned for correction | Reviewer found a defined issue |
| Submitted for moderation | Lecturer/coordinator submitted result batch |
| Under moderation | Assigned moderator/examiner reviewing |
| Submitted to examinations | Moderation complete; awaiting examinations process |
| Board review pending | Awaiting authorized academic/examination board |
| Approved for release | Authorized result publication permitted |
| Released | Official result visible to students |
| Amendment under review | A published result needs controlled correction |
| Superseded | Replaced by authorized amended result version |
| In progress | Extended activity not yet ready for final result |

A student-facing result is released only from `Released`.

---

### 4. Lecturer and tutor actions

#### 4.1 Lecturer/course coordinator

A lecturer or coordinator may:

- Review official CA data
- Import/enter authorized final-assessment marks
- Review calculated proposed outcomes
- Identify exceptions
- Attach permitted supporting record
- Submit batch for moderation
- Respond to moderator correction requests
- View status after submission

They may not:

- Bypass moderation/board rules
- Change an approved official result silently
- Release results to students without authority
- Include an unregistered student in the official result batch

#### 4.2 Tutor

A tutor may, only within explicit assignment scope:

- Submit marked component results for their TG
- Confirm attendance/assessment participation
- Correct returned component-mark issues
- View result-submission status relevant to their component

A tutor may not:

- Calculate the complete course final result
- Submit the course-wide official final result
- Release CA/final result
- Override a lecturer/coordinator or moderator
- View another TG’s detailed marks without authorized scope

---

### 5. Final-examination mark handling

#### 5.1 Examination mark source

Final-examination marks enter the result workflow through an authorized examinations process, for example:

- Controlled electronic marking system
- Approved mark-entry batch
- Authorized examination officer import
- Approved manual-entry process with dual review

The lecturer sees whether the marks are:

- Not received
- Imported for review
- Validated
- Returned due to issue
- Approved for result calculation

Raw exam scripts, candidate identifiers and confidential marking material remain within the authorised examination-security boundary.

#### 5.2 Missing or irregular exam result

If a student has no final-examination mark, the lecturer sees a specific reason where permitted:

- Absent
- Deferred examination approved
- Result withheld under authorized examination rule
- Mark not yet entered
- Assessment irregularity under separate restricted process
- Data mismatch requiring examinations reconciliation

The lecturer must not assume absence means failure. The final course outcome follows the configured examination rule and authorized decision.

---

### 6. Moderation workflow

#### 6.1 Submission for moderation

Before sending a result batch, the lecturer/coordinator sees a final checklist:

- Official class-list count reconciled
- CA components approved
- Final-examination status valid
- Formula/version confirmed
- Missing/exception cases resolved or classified
- Extended activities correctly excluded/in progress
- Required comments/evidence attached
- Result-submission declaration accepted

Selecting `Submit for moderation`:

1. Locks the submitted batch version.
2. Creates a moderation case.
3. Records the lecturer/coordinator declaration.
4. Sends the batch to the assigned moderator/examiner.
5. Prevents direct editing until returned.
6. Creates audit and notification events.

#### 6.2 Moderator review

The authorized moderator/examiner sees:

- Course/period and assessment-plan version
- Official class-list reconciliation
- Mark distributions and configured anomaly checks
- Missing/exception cases
- Formula calculation
- Prior result versions
- Supporting evidence/justifications
- Lecturer/coordinator notes
- Actions: `Approve`, `Return for correction`, `Request clarification`, `Refer to examinations`

A moderator may not silently overwrite a result. Any material mark correction requires:

- Reason
- Authority
- Evidence/reference
- Audit event
- Appropriate re-review

#### 6.3 Return for correction

The lecturer sees:

> **Results returned for correction**  
> Reason: Two students have final-examination marks outside the permitted range.  
> Required action: Correct or refer these entries before resubmitting.

The returned batch remains historically traceable. The corrected resubmission becomes a new version, not an erased replacement.

---

### 7. Examination-board workflow

#### 7.1 Board submission

After moderation, the system submits an approved result package to the authorized examinations/board workflow.

The package includes:

- Course/period
- Official class-list reconciliation
- Approved CA and examination outcomes
- Result formula/policy version
- Moderation decision
- Exception cases and authorized handling
- Required sign-off/declarations
- Batch hash/version for integrity

#### 7.2 Board decision

The board or authorized examinations authority may:

- Approve for release
- Return to course team/examinations for correction
- Request clarification
- Approve subject to a recorded condition
- Defer decision
- Refer a restricted matter to another authority

The system records the formal decision, date, authority and applicable conditions.

The student never sees internal board discussion. They see only the official released result or an approved student-facing status such as `Result not yet available`.

#### 7.3 Batch-release safety

Results are released as a controlled batch only when all configured checks pass.

The system prevents:

- Partial accidental release presented as complete
- A course result released before board authority
- A result from the wrong academic period
- Release to a student who is not on the authorized course record
- Unapproved result-file overwrite

If a release job fails, the last certified result state remains intact and operations receives a reconciliation task.

---

### 8. Student-result release

#### 8.1 Lecturer/tutor view after release

After results are officially released, teaching staff see:

> **Official results released**  
> Release date: 3 July 2027, 09:00 CAT  
> Students notified: [delivery summary]  
> Student queries/review requests: [count]

The lecturer can view released results within course scope but cannot alter them through routine grade entry.

#### 8.2 Student experience

Students receive a neutral notice:

> Your official results for January 2027 are available. Sign in to view them securely.

Inside the student portal, the result is labelled:

> **Official result — released**

It includes:

- Course
- Result/outcome
- Published date
- Supplementary eligibility where applicable
- Repeat/progression next action
- `Request result review` where policy permits

---

### 9. Published-result correction

#### 9.1 Correction triggers

An amendment may begin because of:

- Verified clerical/data-entry error
- Authorized result-review outcome
- Examination reconciliation issue
- Approved academic-board decision
- Corrected assessment input with documented authority

It must not begin merely because a staff member changes their mind without the required academic process.

#### 9.2 Amendment workflow

1. Authorized role opens a result-amendment case.
2. System identifies original official result/version.
3. Reason, evidence and affected student/course are recorded.
4. Corrected outcome is calculated using applicable rule version.
5. Required moderation/board approval occurs.
6. New official result version is approved.
7. Student progression, supplementary eligibility, registration and finance effects are recalculated.
8. Student receives secure amended-result notification.
9. Original result remains in immutable audit history as superseded.

Student-facing notice:

> An official result for CSC 4792 has been updated after an authorized review. Sign in to view the current result and next steps.

#### 9.3 Correction impact

If a correction changes a student’s progression/registration:

- The system creates a controlled academic-impact task.
- It does not silently remove student courses or Moodle access.
- Records/academic authority determine the effective action.
- The student sees clear explanation, dates and support route.

---

### 10. Failure and recovery catalogue

| Situation | Staff-facing response | System behaviour |
|---|---|---|
| CA not approved | Identify missing component/batch | Block final result submission |
| Final-exam marks missing | Show exact missing status | Block or apply approved deferred rule |
| Student not on official class list | Show reconciliation route | Prevent result inclusion |
| Tutor enters outside TG scope | Explain permission limit | Reject entry and audit scope denial |
| Formula changed after marking | Require versioned academic change approval | Recalculate only after authority |
| Batch submitted twice | Return original submission status | Idempotent handling |
| Moderator unavailable | Show assigned replacement/escalation route | Enforce delegation authority |
| Board returns batch | Show decision and required action | Preserve prior versions |
| Result-release job fails | Do not show partial release as complete | Retain certified state; reconcile/retry |
| Published result amended | Show amendment case and impact | Preserve original/audit and recalculate dependencies |
| Extended activity not complete | Show `In progress` | Exclude from false fail result |

---

### 11. Architecture contract

#### 11.1 Core entities

| Entity | Purpose |
|---|---|
| Final-result batch | Course-wide proposed official outcomes |
| Result-calculation rule | Versioned course/result formula |
| Final-assessment mark | Authorized examination or final-assessment input |
| Result exception | Missing, deferred, irregular or reconciliation case |
| Moderation case | Controlled academic review |
| Examination-board submission | Formal result package |
| Board decision | Authorized release/return/defer outcome |
| Official course-result version | Released or superseded final result |
| Result-amendment case | Controlled post-release correction |
| Academic-impact task | Follow-up caused by amended result |

#### 11.2 Commands

| Command | Main result |
|---|---|
| `PrepareFinalResultBatch` | Combines approved inputs into proposed results |
| `ValidateFinalResultBatch` | Checks class list, rules and exceptions |
| `SubmitFinalResultsForModeration` | Locks version and starts moderation |
| `RecordModerationDecision` | Approves/returns/refers result batch |
| `SubmitResultsToExaminationsBoard` | Creates formal board package |
| `RecordExaminationsBoardDecision` | Records release authority |
| `ReleaseOfficialCourseResults` | Publishes authorized outcomes |
| `RequestOfficialResultAmendment` | Opens controlled correction case |
| `ApproveOfficialResultAmendment` | Publishes approved revised result |
| `RecalculateAcademicImpact` | Updates affected progression/registration states |

#### 11.3 Events

- `FinalResultBatchPrepared`
- `FinalResultBatchValidated`
- `FinalResultsSubmittedForModeration`
- `FinalResultsReturnedForCorrection`
- `FinalResultsModerated`
- `ResultsSubmittedToExaminationsBoard`
- `ExaminationsBoardDecisionRecorded`
- `OfficialCourseResultsReleased`
- `OfficialResultAmendmentRequested`
- `OfficialResultAmended`
- `AcademicImpactRecalculated`

#### 11.4 Audit requirements

Record:

- Course, academic period, official class-list snapshot and plan/formula version
- CA and final-assessment input sources
- Lecturer/tutor scope and submitted declaration
- Missing/exception classification and authorized handling
- Moderation/board authority, decision and timestamp
- Batch hash/version and release job result
- Every post-release amendment, reason, evidence and impact
- Student notifications and visible result version
- Denied actions, especially cross-TG/cross-course grade access

---

### 12. Part 3 acceptance tests

Part 3 is accepted when:

- Only approved CA, final-assessment and configured rule inputs can produce proposed final results.
- Tutors cannot calculate, submit or release course-wide final results outside their explicit assignment.
- Extended research/industrial-training activity remains `In progress` until final authorized completion.
- Result batches reconcile against the official class list.
- Moderation and board stages are required and versioned before official release.
- Moodle totals cannot directly become official final results.
- Returned batches, duplicate submissions and formula changes preserve traceable versions.
- Student results are released only by the authorized batch-release process.
- Published-result corrections are controlled, auditable and recalculate affected academic/finance states safely.
- Partial release, wrong-period release and silent overwrite failures are prevented.
- Keyboard, screen-reader, mobile, low-bandwidth, authorization-boundary and release-recovery tests pass.

---

## Recovered part 4

_Source record: `023-role-blueprint-3-lecturer-and-tutor.md`_

## Role Blueprint 3 — Lecturer and Tutor  
### Part 4: Course communication, attendance and learning-participation signals, academic concerns, student referrals and follow-up boundaries

This part defines how teaching staff communicate with students, record reliable participation information and raise academic concerns responsibly.

The governing rule is:

> A lecturer or tutor may record what they directly observe in an assigned course or TG. They may offer or request academic support; they may not diagnose, discipline or browse confidential student-support information.

---

### 1. Course communication

#### 1.1 Communication types

Teaching staff choose a clear communication type:

| Type | Purpose | Audience |
|---|---|---|
| Course announcement | Course-wide academic information | Official class list or selected TGs |
| TG announcement | Tutorial/lab-specific information | Assigned TG only |
| Assessment notice | Quiz, assignment, feedback or deadline information | Affected course/TG audience |
| Direct academic message | Student-specific course matter | One student within assigned scope |
| Support invitation | Offer of help after an academic concern | Student through governed support workflow |
| Urgent course change | Cancellation, venue change or essential academic update | Affected official class list/TG |

The staff member cannot use a direct message to send sensitive counselling, medical, disciplinary or financial content.

#### 1.2 Announcement composer

The staff member selects:

> `Create announcement`

The composer contains:

- Course/TG audience
- Title
- Message
- Related assessment or timetable item, if applicable
- Delivery channels
- Send now/schedule
- Student preview
- Accessibility check: meaningful link text and image alternative text

Before sending, the system shows:

> Audience: CSC 4792 · TG 2 · 28 officially registered students  
> Students with Moodle access pending: 1

The system records the announcement centrally and synchronizes it to Moodle where configured. It prevents duplicate notices caused by both systems sending the same message.

#### 1.3 Student experience

A student sees the message in the SIS notification centre and, where configured, in the Moodle course. The message links to the exact assessment, timetable event or course page.

The student is not asked to interpret an internal code or search through unrelated Moodle forums.

---

### 2. Attendance and participation

#### 2.1 Attendance is optional/configured

Attendance is recorded only for courses, activities or programmes where the institution has approved it.

The system supports separate attendance rules for:

- Lecture
- Tutorial Group (TG)
- Laboratory/practical
- Clinical placement
- Field work
- Examination/session attendance
- Orientation or mandatory professional activity

A course may track attendance for one activity type but not another.

#### 2.2 Attendance session setup

An authorized lecturer/tutor selects:

> `Record attendance`

The session page shows:

- Course and TG scope
- Activity type
- Date/time
- Scheduled location
- Official class list
- Attendance rule
- Whether attendance affects eligibility/CA
- Link to approved accommodation/arrangement indicator where needed

The staff member records one approved status per student:

- Present
- Late
- Absent
- Excused absence
- Authorized alternative activity
- Not applicable

A tutor may record attendance only for assigned TGs or sessions.

#### 2.3 Attendance integrity

The system records:

- Who created the session
- Official class-list snapshot used
- Time session was opened/closed
- Staff member who recorded/changed status
- Reason category for later changes
- Whether the attendance is self-reported, staff-confirmed or device-assisted

Students cannot mark themselves present through the ordinary student portal unless an approved attendance process explicitly allows it.

#### 2.4 Corrections

If a student says attendance is incorrect, they select:

> `Request attendance correction`

The request identifies course, session and claimed correction. The lecturer/tutor sees it only within their scope and chooses:

- Approve correction
- Decline with permitted explanation
- Request information
- Refer to coordinator/department

Changes remain auditable; the original attendance entry is preserved.

---

### 3. Learning-participation signals

#### 3.1 Permitted signals

The teaching workspace may summarize reliable, course-relevant signals, for example:

- Repeated missing assessment submissions
- Quiz/assignment completion status
- Approved attendance pattern
- No Moodle access after confirmed enrollment
- Repeatedly missed required practical sessions
- Student’s explicit request for help
- Significant change in course participation, where data is reliable

Every signal shows:

- Exact source
- Date/time or period
- Data freshness
- Scope/course/TG
- Whether it is observed, imported or inferred
- Known limitations

Example:

> **Participation observation**  
> Student: Chanda M. · TG 2  
> Three consecutive CSC 4792 Moodle assessments are recorded as not submitted.  
> Last Moodle confirmation: 16 August 2027, 14:32 CAT.  
> `Review observation`

#### 3.2 Prohibited interpretations

The interface must not convert these observations into:

- Mental-health diagnosis
- “High-risk” label
- Misconduct finding
- Automatic grade penalty
- Automatic discipline case
- Automatic counselling referral
- Prediction presented as fact

A missed Moodle submission may be caused by access issues, teaching changes, authorized extension, accommodation, illness, external outage or an error. It requires human review.

---

### 4. Reviewing an academic concern

#### 4.1 Review page

Selecting `Review observation` opens a focused page:

1. **What happened**
   - Exact activity/attendance/submission events
   - Dates
   - Source system
   - Data freshness

2. **Relevant course context**
   - TG/course membership
   - Assessment deadline
   - Approved extension/alternative arrangement indicator, where teaching staff need it
   - Previous course-level outreach

3. **Existing course actions**
   - Announcement sent
   - Student message sent
   - Assessment support already approved
   - Existing academic-support case status, minimized

4. **Available actions**
   - Contact student about course
   - Correct observation data
   - Record course-support action
   - Submit academic concern to adviser/student-success team
   - Monitor until a chosen date
   - Dismiss as inaccurate/not actionable

The screen must not show counselling details, diagnosis, finance balance or unrelated course history.

#### 4.2 Submit academic concern

Before sending an academic concern, the staff member states:

- Observable basis
- Course/TG
- Student impact
- Any action already taken
- Recommended academic support
- Urgency/deadline based on course event
- Student-visible summary

The system provides a neutral default student message:

> Your teaching team noticed that you may be having difficulty completing recent course activities. Academic support is available if you would like help reviewing your options.

The staff member cannot replace this with threatening, diagnostic or disciplinary wording.

#### 4.3 Human handoff

The concern is routed to the authorized adviser/student-success queue.

The lecturer/tutor receives only an appropriate follow-up state, for example:

- Concern received
- Adviser assigned
- Student contacted
- Support offered
- Closed as inaccurate
- No further lecturer action required

They do not receive counselling notes, appointment content or private student disclosures.

---

### 5. Direct course-support actions

Before escalating, staff may take permitted course-level actions:

- Explain an assessment requirement
- Direct student to Moodle access help
- Refer student to tutorial support
- Record approved extension/alternative assessment arrangement
- Send a reminder
- Invite student to office hour
- Correct an attendance or group-assignment error

Each action appears in the course timeline so students do not receive duplicated messages from lecturer, tutor and adviser.

Example:

> **Course-support action recorded**  
> Tutorial invitation sent to Chanda M. on 17 August 2027.  
> Follow-up: review Moodle access on 20 August 2027.

A lecturer/tutor must not unilaterally waive course rules, alter official CA or change supplementary eligibility through a support action.

---

### 6. Assessment extension and accommodation boundary

A lecturer/tutor may receive an approved academic arrangement, for example:

> Extended Quiz 1 deadline approved until 22 August, 17:00 CAT.

The staff member sees only what is necessary to apply it:

- Affected assessment
- Required adjustment
- Effective dates
- Authorized source
- Whether further action is needed

They must not see:

- Medical diagnosis
- Counselling record
- Disability assessment detail
- Private personal explanation
- Financial hardship evidence

The staff member may request clarification about how to implement the approved arrangement, but not demand unnecessary personal disclosure from the student.

---

### 7. Course communication and data correction by students

A student can:

- Respond to a course message
- Ask a course question
- Request attendance correction
- Report Moodle/course-access issue
- Report an incorrect course-support observation
- Request approved assessment support

The lecturer/tutor sees these items in a course-scoped queue with:

- Student
- Course/TG
- Request type
- Date received
- Deadline
- Current status
- Required staff action

The staff member cannot view requests outside their assignment scope.

---

### 8. Attendance/participation analytics

Course-level summary indicators may help a lecturer manage teaching, such as:

- Attendance rate by TG
- Number of students with incomplete submission
- Moodle access synchronization coverage
- Assessment completion rate
- Number of extension arrangements active

These are operational summaries, not staff performance rankings or student discipline lists.

Individual names are shown only when the lecturer/tutor has a direct educational purpose and course/TG scope.

The system shows source, date range and data quality. A chart never replaces the underlying student list or explanation.

---

### 9. Failure and recovery catalogue

| Situation | Lecturer/tutor experience | System behaviour |
|---|---|---|
| Attendance disabled for course | Explain that no approved attendance process exists | Hide recording action |
| Tutor opens another TG | Explain scope restriction | Deny access |
| Moodle data stale | Show last-confirmed date; prevent unsupported conclusion | Retry/reconcile integration |
| Student has approved extension | Show assessment adjustment, not private reason | Apply mapped Moodle/SIS deadline safely |
| Student reports incorrect absence | Create correction request | Preserve original and decision audit |
| Duplicate support outreach exists | Show existing action; offer note/monitor | Suppress duplicate message |
| Staff tries to refer direct to counselling | Offer counselling-support request path with student consent context | Prevent automatic confidential referral |
| Assessment changes while attendance being recorded | Warn and refresh session context | Preserve valid entries/reconcile |
| Connection drops during attendance save | Show unsaved/saved status and retry | Idempotent session update |
| Course message cannot deliver by email/SMS | Preserve in-system notice | Retry approved channel; do not claim delivered |

---

### 10. Architecture contract

#### 10.1 Core entities

| Entity | Purpose |
|---|---|
| Course communication | Course/TG announcement or direct academic message |
| Attendance session | One approved class/activity attendance event |
| Attendance record | Student’s attendance status for session |
| Participation observation | Explainable course-level signal |
| Academic concern | Human-reviewed concern handed to adviser/student-success workflow |
| Course-support action | Teaching-team intervention/action |
| Assessment arrangement | Approved extension/accommodation instruction |
| Attendance-correction request | Student challenge to recorded attendance |
| Course support queue item | Staff action requiring course/TG response |

#### 10.2 Commands

| Command | Main result |
|---|---|
| `PublishCourseCommunication` | Sends auditable course/TG message |
| `CreateAttendanceSession` | Opens approved attendance activity |
| `RecordCourseAttendance` | Saves scoped attendance entries |
| `RequestAttendanceCorrection` | Creates student correction request |
| `RecordCourseSupportAction` | Logs permitted course-level support |
| `ReviewParticipationObservation` | Displays source/freshness and actions |
| `SubmitAcademicConcern` | Creates governed adviser/student-success handoff |
| `ApplyApprovedAssessmentArrangement` | Enforces limited approved extension/accommodation |
| `DismissParticipationObservation` | Records inaccurate/not-actionable decision |

#### 10.3 Events

- `CourseCommunicationPublished`
- `AttendanceSessionCreated`
- `CourseAttendanceRecorded`
- `AttendanceCorrectionRequested`
- `AttendanceCorrectionResolved`
- `ParticipationObservationDetected`
- `CourseSupportActionRecorded`
- `AcademicConcernSubmitted`
- `AssessmentArrangementApplied`
- `ParticipationObservationDismissed`

#### 10.4 Audit requirements

Record:

- Staff identity, active role, course/TG scope
- Announcement audience/content version/delivery state
- Attendance session/class-list snapshot and every status change
- Attendance-correction request and resolution
- Observation source, freshness, reason and human action
- Course-support action and student-visible communication
- Referral recipient and minimum necessary context
- Approved assessment arrangement and authorizing role
- Access to student course-level participation data

Private counselling information, disability diagnosis, financial detail, disciplinary investigation material and non-course student data remain outside this workspace.

---

### 11. Part 4 acceptance tests

Part 4 is accepted when:

- Lecturers/tutors can communicate only with students in their official class list or assigned TG.
- Attendance is available only for approved activities and staff scope.
- Attendance corrections preserve original entries and decision history.
- Participation signals always show source, date and freshness.
- No signal automatically becomes a diagnosis, discipline case, grade penalty or counselling referral.
- Teaching staff can offer appropriate course-level support and submit a limited academic concern.
- Student-success referrals expose only minimum permitted follow-up status to teaching staff.
- Approved assessment arrangements reveal implementation instructions, not confidential personal detail.
- Duplicate support outreach is prevented.
- Moodle delays/outages cannot falsely create a missing-submission or absence conclusion.
- Keyboard, screen-reader, mobile, low-bandwidth, privacy-boundary and integration-recovery tests pass.

---

## Recovered part 5

_Source record: `024-role-blueprint-3-lecturer-and-tutor.md`_

## Role Blueprint 3 — Lecturer and Tutor  
### Part 5: Teaching timetable, course materials, substitute/acting staff, course closure, archiving and teaching-history access

This part completes the Lecturer and Tutor blueprint. It governs the teaching lifecycle outside direct assessment: scheduled teaching, learning materials, temporary staff cover, closure and secure access to historical course records.

The governing rule is:

> Teaching staff can manage learning delivery within their assignment, but official schedules, staff roles, registration and academic records remain controlled institutional data.

---

### 1. Teaching timetable

#### 1.1 Staff timetable home

The teaching workspace includes:

> My teaching timetable

It shows:

- Day/week/list views
- Course and Tutorial Group (TG)
- Activity type: lecture, tutorial, laboratory, practical, clinical, field activity, examination support
- Start/end time in CAT
- Venue/campus or online location
- Current class-list count
- Course-material/assessment links
- Change/cancellation status
- Last updated time

A lecturer sees only sessions for their active assignments. A tutor sees only assigned TG/session scope.

#### 1.2 Session detail

Selecting a session opens:

> CSC 4792 · TG 2 Tutorial  
> Thursday, 10:00–12:00 CAT  
> Venue: LT-3  
> Official class-list count: 28  
>
> `Open attendance`  
> `Open course materials`  
> `Message TG`  
> `Report session issue`

The page must not show unrelated students, unrelated courses or confidential student records.

#### 1.3 Timetable changes

Teaching staff cannot silently move an official session by editing a calendar entry.

They select:

> `Request timetable change`

The request includes:

- Affected course/TG/session(s)
- Current date/time/location
- Proposed change
- Reason
- Student impact
- Required venue/online resource
- Whether an assessment deadline/event is affected
- Supporting evidence, if required

Before submission, the system displays affected official class-list/TG count and potential clashes.

Approved changes update the authoritative timetable and trigger:

- Student notification
- Staff notification
- Moodle calendar update where mapped
- Venue/resource update
- Audit event

---

### 2. Course materials and Moodle learning content

#### 2.1 Material management boundary

Moodle is the primary learning-content workspace. The SIS does not attempt to duplicate every file, page, discussion or learning activity.

The SIS provides controlled course-material metadata and integration status:

- Moodle course link
- Published/hidden state
- Material category
- Related assessment
- Target audience: full class or TG
- Publish date
- Last synchronization
- Accessibility review status where configured

#### 2.2 Staff course-material view

The teaching workspace shows:

> **Learning materials**  
> Moodle course: linked and synchronized  
> Published materials: 12  
> Materials awaiting scheduled release: 3  
> Accessibility check required: 1  
>
> `Open Moodle content`  
> `View linked material schedule`

A staff member creates/uploads learning materials in Moodle, subject to their Moodle role. The SIS receives and displays only the metadata necessary for the integrated student/course experience.

#### 2.3 Publication rules

Before publishing material to students, Moodle/course workflow prompts staff to confirm:

- Intended course/TG audience
- Availability date
- Accessibility requirements for meaningful content
- Related assessment/learning objective where configured
- Whether material is revised/replacing prior content

The system must not force staff to expose draft materials to students simply because the Moodle course shell exists.

#### 2.4 Accessibility and material quality

Where a material is intended for students, staff receive practical prompts:

- Provide text alternative for meaningful images
- Provide captions/transcript for instructional media
- Use readable document structure/headings
- Avoid image-only instructions
- Provide accessible alternative for scanned/non-selectable content
- Ensure links describe their destination

The system records only compliance support/status; it does not automatically judge academic quality or block all publishing based on an AI score.

---

### 3. Substitute and acting teaching staff

#### 3.1 Requesting cover

A lecturer may select:

> `Request teaching cover`

The request specifies:

- Course/TG/session scope
- Dates and times
- Reason category
- Proposed substitute, if known
- Required capabilities: teach, record attendance, set/mark quiz, grade component, access Moodle material
- Whether the substitute may communicate with students
- Expiry date
- Required departmental approval

The original lecturer cannot simply share their password or Moodle account.

#### 3.2 Approval and temporary assignment

After authorized approval, the substitute receives a separate, time-bound teaching assignment:

> Acting tutor · CSC 4792 · TG 2  
> Effective: 10–17 March 2027  
> Permitted: teach tutorial, access TG materials, record attendance, send TG announcements  
> Not permitted: release official CA or final results

The substitute uses their own account and active teaching workspace.

#### 3.3 Quiz/marking delegation

If the substitute must create or mark a quiz, the temporary assignment must explicitly include:

- Quiz creation permission
- TG/course scope
- Relevant assessment component
- Start/end dates
- Required lecturer/coordinator review

A substitute cannot inherit all original lecturer authority by default.

#### 3.4 End of cover

At the end date:

- Temporary access expires automatically.
- Moodle role is adjusted through synchronization.
- Outstanding marking/attendance work is returned to the responsible teaching role or reassigned explicitly.
- Student communication notes remain in the course record.
- Audit trail remains available to authorized users.

---

### 4. Course closure

#### 4.1 Closure preparation

When teaching ends, the course workspace presents:

> **Course closure checklist**

Items include:

- All required assessments closed
- Grade batches submitted/approved
- Result workflow completed or correctly in progress
- Deferred/supplementary cases identified
- Required course materials retained
- Moodle activities archived/locked according to policy
- Class-list/registration changes finalized
- Outstanding teaching support actions handed off
- Timetable sessions completed/cancelled appropriately
- Integration health checked

The system does not close a course merely because the last timetable date passed.

#### 4.2 Closure states

| State | Meaning |
|---|---|
| Active teaching | Course is being delivered |
| Assessment completion | Teaching ended; assessment/marking continues |
| Results governance | Results are in moderation/board workflow |
| Closed to students | Normal student learning activity ended |
| Archived | Course record retained under policy |
| Reopened under authorization | Limited temporary reopening for approved purpose |

#### 4.3 Student access after closure

The institution configures what students retain after course closure:

- Read-only access to materials
- Feedback access
- Submission history
- No further activity submission
- Continued access until a specified date
- Access removed after archive period

The staff interface explains the selected policy. Closure must not accidentally erase student submissions, feedback, grade evidence or course history.

---

### 5. Course archive and teaching history

#### 5.1 Lecturer/tutor history page

Teaching staff can access:

> My teaching history

It lists prior authorized assignments:

- Course
- Academic period
- Role and TG scope
- Course status
- Student count
- Assessment/result state
- Archive availability
- `View archived course`

Access is time-bound and policy controlled. A former tutor does not retain permanent unrestricted access to student data after their assignment ends.

#### 5.2 Archived-course view

The archived view is read-only by default and clearly marked:

> Archived course · January 2027  
> You are viewing historical records. Changes are not permitted.

It may include:

- Final official class-list snapshot
- Assessment-plan version
- Authorized grade/result status
- Teaching communications
- Attendance records, if retained
- Course materials metadata
- Moodle archive link where permitted
- Integration/audit history

It excludes unrelated current student information and restricted support/disciplinary records.

#### 5.3 Controlled reopening

A course may be reopened only for an approved reason, such as:

- Deferred/supplementary assessment
- Authorized result correction
- Evidence needed for formal review
- Required academic continuity

The reopening request specifies:

- Exact activity/data needed
- Who needs access
- Start/end date
- Student impact
- Authorization

The system grants the smallest possible scope, for the shortest possible period.

---

### 6. Teaching handover

When a lecturer’s assignment ends or a course coordinator changes:

- The incoming staff member receives only the approved current course history.
- Outstanding tasks are transferred explicitly.
- The outgoing staff member’s permissions expire by date/scope.
- No password/account sharing occurs.
- Students are notified only where the staff change affects them.
- The transition is auditable.

Handover may include:

- Assessment-plan state
- Unmarked/returned components
- Approved student arrangements
- Upcoming sessions
- Moodle integration status
- Open support/academic-concern status, minimized to what the incoming staff needs

Confidential counselling, private staff-performance notes and unrelated student information do not transfer through the teaching handover.

---

### 7. Failure and recovery catalogue

| Situation | Staff-facing behaviour | System behaviour |
|---|---|---|
| Timetable update conflicts with another session | Show conflict before request submission | Prevent unsafe approval |
| Moodle calendar sync fails | SIS timetable remains authoritative; show sync delay | Retry/reconcile integration |
| Substitute assignment expires during marking | Explain work must be reassigned | Remove elevated access; create handover task |
| Lecturer tries to share/copy a staff account | Direct to controlled cover request | No shared-account path |
| Course closes with marks incomplete | Identify blocking assessment/result task | Prevent final archive state |
| Archived content needed for result review | Request limited reopening | Grant scoped temporary access after approval |
| Material unavailable/inaccessible | Show student impact and remediation prompt | Preserve original/version history |
| Original lecturer leaves institution | Route uncompleted work to department authority | Preserve access/audit history |
| Moodle archive fails | Preserve SIS closure; flag archive issue | Create operations work item |
| Student access should continue after course closure | Show configured policy | Synchronize retained Moodle entitlement |

---

### 8. Architecture contract

#### 8.1 Core entities

| Entity | Purpose |
|---|---|
| Teaching timetable assignment | Staff-to-session/course/TG schedule entitlement |
| Timetable-change request | Controlled proposal to alter official session |
| Course-material metadata | SIS-visible index of Moodle learning materials |
| Material publication schedule | Controlled student availability state |
| Temporary teaching-cover assignment | Time-bound substitute/acting role |
| Course-closure checklist | Completion/governance tasks before archive |
| Course archive | Retained immutable historical course record |
| Course-reopening request | Limited post-closure access/change authorization |
| Teaching-handover record | Explicit transfer of active responsibilities |

#### 8.2 Commands

| Command | Main result |
|---|---|
| `ViewTeachingTimetable` | Returns staff-scoped official schedule |
| `RequestTeachingTimetableChange` | Opens controlled timetable-change case |
| `SynchronizeMoodleCourseCalendar` | Updates mapped Moodle dates/events |
| `RequestTeachingCover` | Requests temporary staff assignment |
| `ActivateTemporaryTeachingAssignment` | Grants time-bound scoped access |
| `BeginCourseClosure` | Creates closure checklist |
| `ArchiveCourseOffering` | Locks/retains final course record |
| `RequestCourseReopening` | Opens scoped archive-access request |
| `CompleteTeachingHandover` | Transfers authorized outstanding work |

#### 8.3 Events

- `TeachingTimetableChangeRequested`
- `TeachingTimetableChanged`
- `MoodleCourseCalendarSynchronized`
- `TeachingCoverRequested`
- `TemporaryTeachingAssignmentActivated`
- `TemporaryTeachingAssignmentExpired`
- `CourseClosureStarted`
- `CourseOfferingArchived`
- `CourseReopeningApproved`
- `TeachingHandoverCompleted`

#### 8.4 Audit requirements

Record:

- Staff identity, active teaching role, course/TG scope and dates
- Timetable-change request/reason/approver and student impact
- Material publication metadata and accessibility support state
- Substitute assignment capabilities, expiry and approvals
- Course-closure checklist completion and authorized archive date
- Archive/reopening scope, requester and evidence
- Teaching-handover responsibilities and recipients
- Moodle calendar/content/archive synchronization outcomes

---

### 9. Part 5 acceptance tests

Part 5 is accepted when:

- Teaching staff see only their authorized timetable/course/TG sessions.
- Official timetable changes require controlled approval and student notification.
- Moodle is used for learning material, while the SIS provides integrated metadata/status without duplicating content unnecessarily.
- Temporary substitutes use their own accounts with time-bound, capability-specific permissions.
- Substitute quiz/marking authority is explicitly assigned and never inherited wholesale.
- A course cannot be fully archived while required assessment/result work remains unresolved.
- Course closure preserves required submissions, evidence, feedback, result history and audit records.
- Historical course access is read-only by default and expires according to assignment/policy.
- Reopening is limited, approved and auditable.
- Teaching handover transfers necessary operational context without exposing confidential support/disciplinary data.
- Keyboard, screen-reader, mobile, low-bandwidth, substitute-expiry and archive-recovery tests pass.

**Role Blueprint 3 is now complete: Lecturer and Tutor.**

The next blueprint should be:

> **Role Blueprint 4: Academic Adviser** — starting with assigned-advisee list, academic overview, caseload priorities, support observations and advising appointment workflow.
