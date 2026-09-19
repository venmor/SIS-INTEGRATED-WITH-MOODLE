<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 782112d3-c8d2-5f34-8769-602d759e3c04; chronological message: 195. -->

# Role Blueprint 5 — Programme Coordinator and Head of Department  
## Part 1: Programme oversight, course offerings, teaching assignments, adviser allocation, exception decisions and operational work queues

This blueprint covers two related but different roles.

- A **Programme Coordinator** manages the daily academic operation of one programme.
- A **Head of Department (HoD)** manages oversight across programmes and staff within their department.

A Head of Department is not simply a Programme Coordinator with a larger student list. Their approval scope, workload view and escalation duties are different.

---

## 1. Active role and scope

The workspace header always displays the active role and scope.

Examples:

> Programme Coordinator workspace · BSc Computer Science · January 2027

> Head of Department workspace · Department of Computer Science · January 2027

A person who holds both roles must deliberately switch workspace. HoD approval powers do not silently appear while they are working as a lecturer or programme coordinator.

---

## 2. Role boundaries

| Activity | Programme Coordinator | Head of Department |
|---|---|---|
| Monitor one programme’s registration/course delivery | Yes | Department-wide view |
| Propose course offerings and teaching needs | Yes | Review/approve where authorized |
| Allocate tutors/TGs within approved staffing plan | Yes, where authorized | Approve/resolve staffing gaps |
| Assign/rebalance advisers | Yes, where authorized | Oversight and approval for department rules |
| Review programme-level academic exceptions | May recommend/decide if configured | Decide/escalate under authority |
| View department workload and course-delivery issues | Programme only | Yes |
| Release final official results | No | No, unless separately assigned examination authority |
| View counselling notes or discipline files | No | No |
| Change student finance balances or sponsor records | No | No |
| Override university regulation without authority | No | No |

All authority is configuration driven by role, programme/department scope, effective dates and delegated authority.

---

## 3. Home page

### 3.1 Programme Coordinator home

The Programme Coordinator home answers:

1. Is the programme ready for the academic period?
2. Which courses have staffing, timetable or Moodle issues?
3. Are students assigned to advisers?
4. Which academic decisions need review?
5. Which deadlines are at risk?

Sections:

- Urgent programme actions
- Course-offering readiness
- Teaching assignments and TG coverage
- Adviser allocation
- Registration and course-plan issues
- Academic-exception decisions
- Results/assessment governance status
- Moodle integration health
- Programme notices and deadlines

### 3.2 HoD home

The HoD home starts with decisions and exceptions, then department patterns.

Sections:

- Decisions requiring HoD action
- Department operational risks
- Programme delivery overview
- Teaching/staffing gaps
- Adviser capacity and unassigned students
- Assessment/result-submission deadlines
- Course/Moodle integration issues
- Academic-exception escalations
- Department calendar and committee deadlines

The HoD sees department patterns first. Individual student details appear only when a formal case requires their decision or escalation.

---

## 4. Programme and department overview

### 4.1 Programme overview

The Programme Coordinator sees:

- Current active students by year level
- Registration completion
- Students with repeat-course requirements
- Students awaiting progression decisions
- Required courses and elective availability
- Course capacity and Tutorial Group (TG) coverage
- Teaching assignments
- Adviser assignments
- Assessment-plan readiness
- Result-submission status
- Moodle synchronization health
- Upcoming academic deadlines

Each indicator includes:

- Definition
- Academic period
- Source
- Last updated time
- Direct link to the underlying permitted work list

Example:

> **Course staffing gap**  
> CSC 3201 has no approved tutor for TG 3.  
> Students affected: 31  
> Academic period: January 2027  
> `Assign tutor`  `Request staffing decision`

### 4.2 Department overview

The HoD sees comparable information across programmes:

- Programmes with unstaffed required courses
- Tutor/lecturer workload distribution
- Unassigned advisees
- Overdue academic follow-ups
- Courses with missing assessment plans
- Courses with late result submission
- Moodle/schedule integration failures
- Programme-change or exception cases requiring HoD decision
- Aggregate progression/repeat patterns

The HoD does not receive unrestricted access to every student’s academic-support notes merely because a department metric is poor.

---

## 5. Course offerings

### 5.1 Course-offering planning

A course offering is a specific instance of a course for a defined academic period, programme/year, campus/mode and delivery pattern.

The Programme Coordinator selects:

> `Manage course offerings`

For each offering, the page shows:

- Course code/title
- Programme and year level
- Half-course, full-year or extended activity type
- Academic period/semester
- Required/elective status
- Planned capacity
- Existing student demand/registration count
- TG requirement
- Lecturer/tutor assignment status
- Timetable status
- Assessment-plan status
- Moodle status
- Course-based fee rule reference
- `View` / `Request change`

### 5.2 Create or change offering

The coordinator can propose:

- New offering
- Capacity change
- TG addition/removal
- Delivery-mode change
- Course cancellation
- Timetable requirement
- Teaching-assignment change
- Moodle template requirement

Before submitting, the system shows affected students, prerequisite/course-plan impact, fees and timetable/Moodle consequences.

High-impact changes require the configured approval route. A coordinator cannot silently cancel a required course after students have planned or registered.

### 5.3 Extended activity courses

Research or industrial-training activities that span years are configured with:

- Start period
- Expected completion period
- Milestones
- Supervisor/assessor assignment requirement
- Course/payment rule
- Result state `In progress` until final authorized assessment

The coordinator must not configure an extended activity as failed merely because it crosses into the next year.

---

## 6. Teaching assignments and Tutorial Groups

### 6.1 Teaching-assignment page

The coordinator selects:

> `Manage teaching assignments`

The page shows each course offering and required roles:

- Course coordinator
- Lecturer
- Tutor
- TG tutor
- Quiz creator/marker
- Assessor
- Moderator
- Substitute/acting staff

Example:

| Course | Required role | Assigned staff | Status |
|---|---|---|---|
| CSC 4792 | Lecturer | Dr. Banda | Active |
| CSC 4792 | TG 1 Tutor | Mr. Phiri | Active |
| CSC 4792 | TG 2 Tutor | — | Action required |
| CSC 4792 | Quiz moderator | Dr. Mbewe | Active |

### 6.2 Tutor permissions

For each tutor, the coordinator configures only the required capability:

- Teach assigned TG
- View assigned TG official class list
- Record attendance
- Create practice quiz
- Create CA-contributing quiz
- Mark assigned component
- Submit marks for moderation
- Send TG announcement
- View course-wide information, only if explicitly needed

A tutor who can assign quizzes receives that permission by explicit assignment. It is not assumed from their job title.

### 6.3 Assignment activation

A teaching assignment becomes active only after:

- Required approval
- Effective dates set
- Course/TG scope defined
- Capability set defined
- Conflict checks completed
- Moodle role synchronization succeeds or enters controlled retry state

The system uses each staff member’s account. No shared lecturer/tutor account is permitted.

---

## 7. Adviser allocation

### 7.1 Adviser-allocation page

The coordinator sees:

> Adviser allocation — BSc Computer Science

The page shows:

- Students with assigned adviser
- Students without adviser
- Adviser caseload count
- Caseload limit
- Active/acting adviser status
- Year level/cohort
- Open follow-ups requiring handover
- `Assign adviser` / `Rebalance assignments`

### 7.2 Assignment rules

Before assignment, the system checks:

- Adviser belongs to permitted programme/department scope
- Assignment is effective for the selected period
- Caseload limit
- Acting/delegated authority
- Conflict or existing active adviser
- Student programme/year eligibility
- Required approval for bulk assignment

The student receives a clear notification when their adviser changes.

### 7.3 Bulk allocation

Bulk allocation may be used only when the same safe rule applies to all selected students.

The coordinator previews:

- Students affected
- Proposed adviser
- Caseload before/after
- Effective date
- Existing active follow-ups
- Students needing special handover

High-impact active cases are not silently transferred in bulk. They require individual handover review.

---

## 8. Academic-exception decisions

### 8.1 Decision queue

The coordinator/HoD sees only cases within authority:

- Prerequisite override
- Academic-load exception
- Late add/drop request
- Repeat-course sequencing request
- Progression decision requiring review
- Curriculum substitution/credit issue
- Readmission academic plan
- Other approved exception

Each decision card shows:

- Student
- Programme/period
- Request type
- Applicable rule/policy version
- Student’s signed handwritten letter status where required
- Adviser recommendation
- Supporting evidence
- Deadline
- Current decision authority
- `Review case`

### 8.2 Review screen

The reviewer sees:

1. Student request and student-visible explanation  
2. Signed letter/supporting-document status  
3. Relevant academic facts  
4. Applicable policy and version  
5. Adviser/programme recommendation  
6. Course-plan/progression impact  
7. Available decisions  

Available actions are explicit:

- `Approve`
- `Approve with conditions`
- `Decline`
- `Return for information`
- `Refer to Head of Department`
- `Refer to academic board`

The decision-maker cannot edit the student’s original request or adviser recommendation.

### 8.3 Decision effect

A decision creates only the entitlement actually authorized.

Example:

> **Prerequisite override approved**  
> Student may take CSC 3201 in January 2027 while completing CSC 2202 under stated conditions.

The system applies this only to that student, course and period. It does not give a permanent general override.

---

## 9. Operational work queues

### 9.1 Queue categories

The coordinator/HoD workspace organizes work into clear queues:

- Course offering needs approval
- Teaching/TG staffing gap
- Adviser assignment gap
- Registration/course-plan exception
- Assessment-plan issue
- Grade/result deadline issue
- Moodle synchronization failure
- Timetable issue
- Student case requiring authorized academic decision
- Programme/department deadline

### 9.2 Work-item card

Each card shows:

- What is wrong or needed
- Affected programme/course/student count
- Owner
- Due date
- Current status
- Blocking reason
- Recommended action
- `Open item`

Example:

> **Moodle group synchronization failed**  
> CSC 4792 · TG 2  
> 28 registered students affected  
> Owner: Integration Support  
> Last update: today, 12:10 CAT  
> `View issue`

The coordinator can assign/monitor the issue but cannot manually force an unsafe Moodle update outside the integration controls.

---

## 10. Information boundaries

| Information | Coordinator | HoD |
|---|---|---|
| Programme course delivery data | Own programme | Department programmes |
| Teaching assignments/TG coverage | Own programme | Department-wide |
| Adviser workload | Own programme | Department aggregate/detail where needed |
| Student course/progression facts | Within active case/operational purpose | Only authorized decision/escalation cases |
| Counselling notes/diagnosis | No | No |
| Discipline investigation notes | No | No |
| Full finance balance/sponsor detail | No | No |
| Official final-result release control | No | No |
| Department staffing aggregate | Limited to programme needs | Yes |

---

## 11. Failure and recovery catalogue

| Situation | Coordinator/HoD experience | System behaviour |
|---|---|---|
| Required course has no lecturer/tutor | Show staffing gap and affected count | Prevent unsafe course readiness sign-off |
| Tutor assigned beyond capability | Explain required permission/approval | Block activation |
| TG capacity exceeded | Show demand/capacity and timetable impact | Prevent automatic over-enrolment |
| Course offering change affects registered students | Show impact review | Require approval/communication |
| Adviser caseload limit exceeded | Show reassignment options | Block unsafe bulk assignment |
| Exception letter missing | Return for student action | Do not allow final decision |
| Decision authority insufficient | Show referral route | Prevent decision |
| Moodle sync failure | Show issue owner/status | Retry and reconcile, not manual bypass |
| Timetable change conflicts | Show conflict | Block approval until resolved |
| Results deadline missed | Show course and responsible role | Escalate through academic governance rule |

---

## 12. Architecture contract

### 12.1 Core entities

| Entity | Purpose |
|---|---|
| Programme operational profile | Current programme configuration/read model |
| Course-offering proposal | Proposed new/changed offering |
| Teaching assignment | Lecturer/tutor/capability/TG assignment |
| Tutorial Group | Approved teaching subgroup |
| Adviser-allocation plan | Student-to-adviser assignment plan |
| Academic-exception decision case | Authorized decision workflow |
| Programme operational work item | Managed issue/action |
| Programme readiness assessment | Course/staffing/timetable/Moodle readiness state |
| Department oversight view | HoD-scoped aggregate operational data |

### 12.2 Commands

| Command | Main result |
|---|---|
| `ProposeCourseOfferingChange` | Creates controlled offering change |
| `AssignTeachingStaff` | Creates scoped teaching assignment |
| `ConfigureTutorCapability` | Sets tutor quiz/marking/TG permissions |
| `CreateTutorialGroup` | Creates approved TG structure |
| `AllocateAcademicAdviser` | Assigns/rebalances adviser |
| `ReviewAcademicExceptionCase` | Opens authorized decision view |
| `RecordAcademicExceptionDecision` | Approves/declines/refers case |
| `CreateProgrammeOperationalWorkItem` | Tracks staffing/integration/timetable issue |
| `AssessProgrammeReadiness` | Evaluates period readiness |
| `ViewDepartmentOperationalOverview` | Produces HoD-scoped overview |

### 12.3 Events

- `CourseOfferingChangeProposed`
- `TeachingAssignmentCreated`
- `TutorCapabilityConfigured`
- `TutorialGroupCreated`
- `AcademicAdviserAllocated`
- `AcademicExceptionDecisionRecorded`
- `ProgrammeOperationalWorkItemCreated`
- `ProgrammeReadinessAssessed`
- `DepartmentOperationalIssueEscalated`
- `MoodleTeachingGroupSynchronizationRequested`

### 12.4 Audit requirements

Record:

- Active coordinator/HoD role and scope
- Course/TG configuration versions
- Teaching assignment/capability/effective dates
- Adviser allocation/handover and caseload impact
- Academic-exception policy, letter/evidence, recommendation and final authority
- Work-item owner, due date, escalation and closure
- Programme readiness result and source freshness
- Access to student-specific academic case detail
- All denied actions due to insufficient scope or authority

---

## 13. Part 1 acceptance tests

Part 1 is accepted when:

- Programme Coordinator and HoD have distinct workspace scopes and decision powers.
- Course offerings show staffing, TG, timetable, assessment and Moodle readiness clearly.
- Tutor capabilities—especially quiz creation/marking—are explicit and TG/course scoped.
- Adviser allocation respects caseload, effective dates and controlled handover.
- Academic exceptions display policy, student letter/evidence, adviser recommendation and required authority.
- Decisions create only the precise approved entitlement.
- Operational work queues make staffing, Moodle, timetable and deadline issues actionable.
- Coordinators/HoDs cannot access counselling notes, discipline investigations or unnecessary finance data.
- Bulk actions preview impact and do not silently transfer high-impact student cases.
- Keyboard, screen-reader, mobile, low-bandwidth, role-boundary and integration-recovery tests pass.

**Please approve Role Blueprint 5, Part 1: Programme oversight, course offerings, teaching assignments, adviser allocation, exception decisions and operational work queues.**

After approval, I will continue with Part 2: **curriculum and course-rule management, academic calendars, capacity/TG planning, assessment oversight and programme-level student progression monitoring.**

---

## Following user responses before the next design record

### User message 0196

You can proceed please
