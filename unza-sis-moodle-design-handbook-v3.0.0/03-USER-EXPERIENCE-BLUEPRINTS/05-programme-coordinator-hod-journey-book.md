# Role Blueprint 5 — Programme Coordinator and Head of Department Journey Book

This book combines the three recovered programme and department parts: operational oversight, curriculum/policy/calendar work, academic quality actions, handover, approvals and reporting.

## Recovered part 1

_Source record: `028-role-blueprint-5-programme-coordinator-and-head-of-department.md`_

## Role Blueprint 5 — Programme Coordinator and Head of Department  
### Part 1: Programme oversight, course offerings, teaching assignments, adviser allocation, exception decisions and operational work queues

This blueprint covers two related but different roles.

- A **Programme Coordinator** manages the daily academic operation of one programme.
- A **Head of Department (HoD)** manages oversight across programmes and staff within their department.

A Head of Department is not simply a Programme Coordinator with a larger student list. Their approval scope, workload view and escalation duties are different.

---

### 1. Active role and scope

The workspace header always displays the active role and scope.

Examples:

> Programme Coordinator workspace · BSc Computer Science · January 2027

> Head of Department workspace · Department of Computer Science · January 2027

A person who holds both roles must deliberately switch workspace. HoD approval powers do not silently appear while they are working as a lecturer or programme coordinator.

---

### 2. Role boundaries

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

### 3. Home page

#### 3.1 Programme Coordinator home

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

#### 3.2 HoD home

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

### 4. Programme and department overview

#### 4.1 Programme overview

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

#### 4.2 Department overview

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

### 5. Course offerings

#### 5.1 Course-offering planning

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

#### 5.2 Create or change offering

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

#### 5.3 Extended activity courses

Research or industrial-training activities that span years are configured with:

- Start period
- Expected completion period
- Milestones
- Supervisor/assessor assignment requirement
- Course/payment rule
- Result state `In progress` until final authorized assessment

The coordinator must not configure an extended activity as failed merely because it crosses into the next year.

---

### 6. Teaching assignments and Tutorial Groups

#### 6.1 Teaching-assignment page

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

#### 6.2 Tutor permissions

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

#### 6.3 Assignment activation

A teaching assignment becomes active only after:

- Required approval
- Effective dates set
- Course/TG scope defined
- Capability set defined
- Conflict checks completed
- Moodle role synchronization succeeds or enters controlled retry state

The system uses each staff member’s account. No shared lecturer/tutor account is permitted.

---

### 7. Adviser allocation

#### 7.1 Adviser-allocation page

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

#### 7.2 Assignment rules

Before assignment, the system checks:

- Adviser belongs to permitted programme/department scope
- Assignment is effective for the selected period
- Caseload limit
- Acting/delegated authority
- Conflict or existing active adviser
- Student programme/year eligibility
- Required approval for bulk assignment

The student receives a clear notification when their adviser changes.

#### 7.3 Bulk allocation

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

### 8. Academic-exception decisions

#### 8.1 Decision queue

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

#### 8.2 Review screen

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

#### 8.3 Decision effect

A decision creates only the entitlement actually authorized.

Example:

> **Prerequisite override approved**  
> Student may take CSC 3201 in January 2027 while completing CSC 2202 under stated conditions.

The system applies this only to that student, course and period. It does not give a permanent general override.

---

### 9. Operational work queues

#### 9.1 Queue categories

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

#### 9.2 Work-item card

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

### 10. Information boundaries

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

### 11. Failure and recovery catalogue

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

### 12. Architecture contract

#### 12.1 Core entities

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

#### 12.2 Commands

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

#### 12.3 Events

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

#### 12.4 Audit requirements

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

### 13. Part 1 acceptance tests

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

---

## Recovered part 2

_Source record: `029-role-blueprint-5-programme-coordinator-and-head-of-department.md`_

## Role Blueprint 5 — Programme Coordinator and Head of Department  
### Part 2: Curriculum and course-rule management, academic calendars, capacity/TG planning, assessment oversight and programme-level progression monitoring

This part defines how the Programme Coordinator and Head of Department manage academic structures without allowing staff to casually change rules that affect current students.

The core rule is:

> Curriculum, progression, course, assessment and calendar rules are versioned academic policies. A change is proposed, reviewed, approved and made effective for a defined cohort/period; it is never silently applied to historical students.

---

### 1. Curriculum and course-rule workspace

#### 1.1 Programme curriculum page

The coordinator opens:

> BSc Computer Science → Curriculum and course rules

The page shows:

- Programme name and award
- Curriculum version
- Effective academic years/intakes
- Year levels
- Required courses
- Elective groups
- Half-courses, full-year courses and extended activities
- Credit/academic-load rules
- Prerequisites/co-requisites
- Progression rules
- Supplementary-examination rules
- Course-based fee rule references
- Approval status
- Published date
- `Propose change`

Historical curriculum versions remain available as read-only records.

#### 1.2 Course-rule detail

Selecting a course shows:

- Official code/title
- Course type: half-course, full-year or extended activity
- Start/completion period
- Credit value
- Required/elective status
- Prerequisite/co-requisite rules
- Assessment structure reference
- Repeat rule
- Supplementary eligibility rule reference
- Course-based fee rule reference
- Applicable programmes/year levels
- Current/past version history

For an industrial-training course starting in Year 3 and ending in Year 4, the detail page explicitly shows:

> Course type: Extended activity  
> Start: Year 3, Semester 2  
> Final completion: Year 4, Semester 1  
> Progression status before completion: In progress  
> It must not be counted as a failed course before final authorized assessment.

---

### 2. Configurable academic rules

The system stores academic rules as configuration, not source code.

#### 2.1 Progression-rule configuration

The coordinator/HoD can view, propose or approve—according to assigned authority—rules such as:

- Required full-year course must be passed before progression
- Maximum failed half-courses allowed for progression with repeats
- Outcome for exactly three failed half-courses
- Repeat-year course-package logic
- Maximum attempts for a course
- Prerequisite override authority
- Extended-activity progression treatment
- Academic-load limit for students carrying repeats

Each rule includes:

- Rule name
- Programme/course/year-level scope
- Effective start/end date
- Conditions
- Outcome
- Academic-policy reference
- Approval authority
- Test cases
- Version history

#### 2.2 Supplementary-examination configuration

The page shows configurable values:

- Minimum CA score
- Eligible/ineligible CA ranges
- Maximum failed-course count
- Scope of failed-course count: semester, academic year, programme or another approved scope
- Course types excluded from supplementary
- Supplementary attempt limit
- Supplementary fee requirement
- Required publication/confirmation deadline
- Final-result calculation rule after supplementary

Example:

> Supplementary rule: BSc Computer Science · 2027  
> CA minimum: 50  
> Failed-course limit: fewer than 3 applicable courses  
> CA 41–49 treatment: [configured outcome]  
> Effective for: January 2027 intake onward

A coordinator cannot change the rule for current results without the required academic-policy approval and impact review.

---

### 3. Change-control process

#### 3.1 Proposing a change

Staff select:

> `Propose curriculum or rule change`

The form requires:

- Change type
- Current version
- Proposed version
- Reason
- Affected programmes/cohorts
- Effective academic period
- Student/course impact
- Required consultation/approval route
- Test cases
- Migration plan for continuing students
- Supporting documents, including signed memorandum/letter where configured

#### 3.2 Impact preview

Before submission, the system displays:

- Students currently governed by the old version
- Students who would be affected by new rule
- Courses/assessment plans affected
- Registration/progression/fee effects
- Moodle mapping impact
- Required student communication
- Whether current academic period is already active

A policy change cannot silently recalculate an already approved progression outcome or released result.

#### 3.3 Approval and publication

After authorized approval:

1. New rule/curriculum version is stored.
2. Effective cohort/date is recorded.
3. Historical versions remain unchanged.
4. Required course/assessment/Moodle mappings are checked.
5. Student/staff communication tasks are created where needed.
6. New configuration is activated only after validation passes.

---

### 4. Academic calendar

#### 4.1 Programme calendar view

The Programme Coordinator sees a structured academic calendar containing:

- Registration opening/closing
- Add/drop period
- Teaching start/end
- Assessment windows
- Examination period
- Supplementary examination period
- Result-submission deadline
- Moderation/board deadlines
- Progression decision deadline
- Graduation/clearance milestones
- Programme-specific events: clinical placement, fieldwork, industrial training, research milestones

Each event shows source, owner, affected programme/course/TG and last update.

#### 4.2 Calendar change

A programme-specific calendar change requires:

- Affected course/TG/student count
- Assessment/timetable impact
- Moodle calendar impact
- Venue/resource availability
- Authority/approval route
- Student/staff communication plan

The system prevents staff from changing a Moodle date alone when the official SIS academic calendar remains different.

---

### 5. Capacity and Tutorial Group planning

#### 5.1 Capacity planning page

The coordinator sees each course offering:

- Planned capacity
- Current registered students
- Expected demand
- Number of TGs
- TG maximum size
- Assigned tutor/lecturer
- Venue capacity
- Timetable slots
- Waitlist count
- Moodle group synchronization state

Example:

> CSC 4792  
> Registered students: 118  
> TGs required: 4  
> TGs active: 3  
> TG 4 staffing: Action required  
> `Create TG`  `Request tutor`

#### 5.2 Creating a TG

The coordinator selects:

> `Create Tutorial Group`

They define:

- Course offering
- TG name/number
- Capacity
- Meeting pattern
- Tutor requirement
- Venue/online mode
- Student-allocation rule
- Moodle group requirement
- Effective date

The system validates timetable/venue conflicts and requires a tutor before the TG becomes available for student allocation, unless policy allows temporary unassigned grouping.

#### 5.3 Student allocation

Students are allocated using an approved rule, for example:

- Timetable preference where configured
- Capacity balancing
- Programme cohort
- Clinical/lab safety limit
- Explicit staff assignment

The system records the allocation reason. Students see their assigned TG and any approved change route.

The coordinator cannot move students in a way that creates timetable conflict or changes official course registration without validation.

---

### 6. Assessment oversight

#### 6.1 Assessment-readiness view

The coordinator sees course-level assessment status:

- Assessment plan approved/published
- Components mapped to Moodle
- Tutor/marker/moderator assigned
- Assessment dates/deadlines
- TG-specific assessment equivalence confirmation
- Grade-import status
- Moderation status
- Student-impacting change requests
- Missing/late result component

Example:

> **CSC 4792 Quiz 1**  
> Approved CA component: Yes  
> Moodle mapping: Active  
> Tutor marker: Assigned  
> TG equivalence: Confirmed  
> Grade batch: Awaiting moderation

#### 6.2 Coordinator actions

Within authority, the coordinator can:

- Request assessment-plan approval/change
- Allocate marker/moderator
- Check Moodle assessment mapping
- Review missing or delayed components
- Escalate late marking/result risks
- Ensure TG-specific quizzes meet approved equivalence rules
- Communicate approved assessment changes

The coordinator cannot manually alter student marks or release official course results unless separately assigned an examinations role.

#### 6.3 Assessment fairness monitoring

The system may show operational patterns such as:

- Component missing for a TG
- One TG has no published assessment
- Students unable to access Moodle activity after registration
- Mark batch missing after deadline
- Assessment change not communicated
- Unusual mark distribution requiring human review

These are prompts for review, not automatic judgments of staff misconduct or student cheating.

---

### 7. Programme-level progression monitoring

#### 7.1 Overview purpose

The coordinator/HoD sees programme patterns to plan teaching and support:

- Students progressing normally
- Students progressing with repeat courses
- Students requiring repeat year
- Students awaiting progression decision
- Students eligible for supplementary examination
- Students with extended activities in progress
- Unregistered continuing students
- Repeat-course demand for next period
- Adviser follow-up volume
- Courses with repeated prerequisite bottlenecks

#### 7.2 Explainable indicator

Example:

> **Year 2 progression overview**  
> Progressing normally: 86  
> Progressing with repeats: 21  
> Repeat year required: 9  
> Academic decision required: 3  
>  
> Source: authorized released results and progression rules version BSC-CS-2027-v1  
> Last refreshed: 4 July 2027, 10:15 CAT

The page identifies the rule version and source date. It does not hide the calculation behind a generic prediction.

#### 7.3 Individual student drill-down

The coordinator may open individual details only when they have a direct operational or decision purpose, such as:

- Progression decision required
- Academic-exception review
- Adviser assignment problem
- Course-plan validation failure
- Formal escalation

The HoD normally sees aggregate patterns first and opens individual cases only when authorized.

#### 7.4 No automatic adverse action

Programme monitoring must not automatically:

- Withdraw a student
- Remove them from a programme
- Block them from registration beyond the approved rule
- Label them a wellbeing/discipline concern
- Change an official result
- Create a staff performance decision

The system creates a work item for human review where needed.

---

### 8. Failure and recovery catalogue

| Situation | Coordinator/HoD experience | System behaviour |
|---|---|---|
| Rule change affects active students | Show impact and approval route | Prevent direct activation |
| No decision for exactly 3 failed half-courses | Show policy/board decision required | Do not infer outcome |
| CA 41–49 rule absent | Show supplementary rule incomplete | Block automatic eligibility decision |
| TG has no tutor | Show staffing gap | Block unsafe TG activation/flag readiness |
| Moodle group mapping fails | Show affected TG/student count | Retry/reconcile; do not change registration |
| Assessment weight totals invalid | Identify components | Block plan approval |
| Calendar date conflicts with exam window | Show conflict | Require approved resolution |
| Capacity lower than registered students | Show over-capacity work item | Prevent silent allocation |
| Progression data stale | Show last refresh/time | Block unsupported decision action |
| Historical curriculum version missing | Flag records/configuration issue | Prevent incorrect audit/progression calculation |

---

### 9. Architecture contract

#### 9.1 Core entities

| Entity | Purpose |
|---|---|
| Curriculum version | Approved programme requirements for defined cohorts |
| Course-rule version | Prerequisite, progression, repeat and supplementary rule configuration |
| Academic-calendar event | Authoritative programme/period date |
| Tutorial Group plan | TG capacity, session and assignment design |
| TG student allocation | Student-to-TG assignment with reason |
| Assessment-readiness assessment | Course/TG assessment governance status |
| Programme progression summary | Explainable aggregate academic-outcome view |
| Curriculum-change proposal | Controlled version/change case |
| Rule test case | Required validation scenario before activation |

#### 9.2 Commands

| Command | Main result |
|---|---|
| `ProposeCurriculumChange` | Creates new curriculum-version proposal |
| `ProposeAcademicRuleChange` | Creates progression/supplementary rule change |
| `ValidateAcademicRuleTestCases` | Tests proposed configuration |
| `PublishApprovedCurriculumVersion` | Activates approved version by scope/date |
| `CreateTutorialGroupPlan` | Creates TG plan |
| `AllocateStudentsToTutorialGroup` | Applies validated TG allocation |
| `AssessProgrammeAssessmentReadiness` | Produces assessment oversight status |
| `PublishProgrammeCalendarEvent` | Publishes authorized date/event |
| `GenerateProgrammeProgressionSummary` | Produces versioned aggregate results |
| `EscalateProgrammeOperationalRisk` | Opens staffing/assessment/configuration issue |

#### 9.3 Events

- `CurriculumChangeProposed`
- `AcademicRuleChangeProposed`
- `AcademicRuleTestCaseValidated`
- `CurriculumVersionPublished`
- `TutorialGroupPlanCreated`
- `StudentsAllocatedToTutorialGroup`
- `ProgrammeAssessmentReadinessAssessed`
- `ProgrammeCalendarEventPublished`
- `ProgrammeProgressionSummaryGenerated`
- `ProgrammeOperationalRiskEscalated`

#### 9.4 Audit requirements

Record:

- Active staff role and programme/department scope
- Current/proposed curriculum/rule version
- Approval authority, effective cohort/date and migration plan
- Test-case outcomes before activation
- Calendar/TG/capacity changes and affected students
- Assessment mapping/marker/moderator readiness status
- Programme-summary definition, source date and rule version
- Any individual student access from aggregate monitoring
- Configuration/integration failures and resolution

---

### 10. Part 2 acceptance tests

Part 2 is accepted when:

- Curriculum and academic rules are versioned, effective-dated and cohort scoped.
- Historical students continue to be evaluated under their applicable curriculum/rule version.
- Progression and supplementary thresholds are configurable rather than hard-coded.
- Ambiguous or incomplete policy rules produce a decision-required state, not an invented result.
- Extended research/industrial-training courses remain in progress until their approved completion point.
- TG capacity, tutor assignment, timetable and Moodle-group synchronization are checked before activation.
- Assessment oversight identifies missing mappings, TG inequity and delayed marking without altering marks automatically.
- Programme progression summaries state source, rule version and freshness.
- Individual student detail is accessed only for an authorized operational/decision purpose.
- Rule/calendar/capacity changes show student impact, require authority and notify affected users.
- Keyboard, screen-reader, mobile, low-bandwidth, stale-data and configuration-recovery tests pass.

---

## Recovered part 3

_Source record: `030-role-blueprint-5-programme-coordinator-and-head-of-department.md`_

## Role Blueprint 5 — Programme Coordinator and Head of Department  
### Part 3: Programme quality actions, staff handover, departmental approvals, governed reporting, audit and historical programme records

This part completes the Programme Coordinator and Head of Department blueprint.

It focuses on improving programme delivery and meeting governance requirements without allowing dashboards, exports or AI summaries to replace human academic judgment.

The core rule is:

> Coordinators and Heads of Department use evidence to assign, monitor and escalate academic work. They do not alter official statistics, close a quality finding without authority, or make high-impact student decisions from a dashboard alone.

---

### 1. Programme quality actions

#### 1.1 What creates a quality action

A quality action may begin from:

- Missing assessment plan or moderation
- Repeated result-submission delay
- Course without required tutor/TG coverage
- High course withdrawal or failure pattern requiring review
- Moodle/SIS integration problem affecting learning delivery
- Programme-review deadline
- External reviewer or accreditation recommendation
- Student feedback theme after approved anonymisation
- Repeated prerequisite or capacity bottleneck
- Academic-board action
- Department/School improvement initiative

A quality action is not automatically a finding of staff misconduct or programme failure.

#### 1.2 Quality-action page

The coordinator/HoD selects:

> `Create programme quality action`

The form requires:

- Title
- Source/evidence
- Programme/department scope
- Academic period
- Why action is needed
- Responsible owner
- Due date
- Intended result
- Required authority
- Student/staff impact
- Related policy/accreditation requirement
- Supporting documents

Example:

> **Action: Provide tutor for CSC 4792, TG 4**  
> Evidence: 31 registered students lack assigned TG tutor.  
> Owner: Programme Coordinator  
> Due: 18 January 2027  
> Intended result: TG 4 has approved tutor and synchronized Moodle group.

#### 1.3 Action statuses

| Status | Meaning |
|---|---|
| Draft | Not yet assigned |
| Open | Action assigned and active |
| Awaiting information | Owner needs evidence/clarification |
| In progress | Work is underway |
| Awaiting approval | Completed work requires authorized review |
| Completed | Required work verified complete |
| Closed by authority | Authorized quality closure recorded |
| Overdue | Due date passed |
| Cancelled | No longer applicable; reason recorded |

The system does not allow an ordinary coordinator to mark a regulatory/quality finding “closed” without the configured authority.

---

### 2. Departmental approvals

#### 2.1 Approval inbox

The HoD sees:

> Decisions requiring my approval

Examples:

- Course-offering change
- Tutor/lecturer assignment
- Temporary acting/cover assignment
- TG capacity/structure change
- Academic-exception case
- Curriculum/rule-change proposal
- Programme quality action requiring department approval
- Late result-submission exception
- Staff handover/reassignment
- Programme report sign-off

Each decision card includes:

- What is being approved
- Programme/course/student impact
- Relevant policy/version
- Requester
- Required decision by date
- Supporting evidence
- Available actions

#### 2.2 Decision screen

The HoD sees:

- Request summary
- Evidence/documents
- Affected users/count
- Prior decisions/history
- Policy and approval authority
- Risks/impact
- Student/staff communication requirement
- `Approve`
- `Approve with conditions`
- `Return for clarification`
- `Decline`
- `Refer to higher authority`

A HoD must not edit the requester’s original evidence or recommendation. Their decision is a separate, auditable record.

#### 2.3 Approval with conditions

Example:

> **Tutor assignment approved with conditions**  
> Assignment may begin after Moodle role synchronization completes.  
> Expiry: 30 June 2027.  
> Quiz-creation permission: Not granted.

The resulting entitlement is exactly scoped to the decision. It does not grant additional unrelated authority.

---

### 3. Staff handover and operational continuity

#### 3.1 Coordinator or HoD changes

A handover is required when:

- Programme Coordinator term ends
- HoD role changes
- Staff leave/are absent
- Acting coordinator/HoD is appointed
- Programme responsibility is reassigned
- Department is restructured

The system must not rely on informal email handover or continued access to a former staff member’s account.

#### 3.2 Handover workspace

The outgoing role holder sees:

> `Prepare programme handover`

The workspace lists:

- Current course-offering readiness
- Staffing/TG gaps
- Adviser-allocation gaps
- Open academic-exception cases
- Pending approvals
- Results/assessment deadlines
- Moodle/timetable integration issues
- Active quality actions
- Programme calendar milestones
- Reports awaiting sign-off

For each item, the outgoing staff member records:

- Current state
- Next action
- Owner
- Due date
- Necessary context
- Supporting document/reference
- Incoming role/person

#### 3.3 Incoming staff member

The incoming coordinator/HoD sees:

> **Handover received**  
> 14 active operational items require review.  
> `Review handover`

They receive only the information necessary to continue authorized work. They do not automatically receive private counselling, disciplinary, staff-performance or unrelated student records.

#### 3.4 Effective date and access

At the configured handover date:

- Incoming role permissions activate.
- Outgoing active permissions expire or move to read-only historical access.
- Open items transfer to new owner.
- Student-facing communication is sent only where a change affects students.
- Moodle/course/staff authority updates follow controlled assignments.
- Audit events record transfer outcome.

---

### 4. Governed programme reporting

#### 4.1 Report catalogue

The coordinator/HoD can access only approved reports for their scope, such as:

- Registration completion
- Course capacity/TG coverage
- Teaching assignment status
- Assessment-plan readiness
- Result-submission status
- Progression/repeat patterns
- Supplementary-exam demand
- Adviser allocation/workload summary
- Moodle synchronization health
- Programme completion/graduation readiness
- Quality-action progress

Each report displays:

- Metric definition
- Source systems
- Data period
- Filters
- Last refresh time
- Data-quality limitation
- Classification
- Certified/report version
- Export permission/status

#### 4.2 Drill-down

The default view is aggregate. Individual student details appear only when:

- The coordinator/HoD has a direct operational responsibility
- A specific decision/work item requires it
- The report’s permission rule permits it
- The user records a purpose where required

The system does not provide unrestricted “download all students” access.

#### 4.3 Exports

Where an export is permitted, the user chooses:

- Report
- Purpose
- Filters
- Destination/use
- Requested period
- Classification acknowledgement

The export record includes:

- Requester
- Report/metric version
- Filters
- Row count
- Classification
- Authoriser where required
- Download time
- Expiry
- File checksum

Downloaded spreadsheets are labelled as extracts and cannot be uploaded as official corrections.

---

### 5. AI-assisted programme insights

AI may assist coordinators/HoDs only within the approved responsible-AI controls from Section 11.

Permitted examples:

- Summarise anonymised student-feedback themes
- Identify missing evidence for a programme-quality action
- Highlight unusual data-quality patterns
- Draft a plain-language explanation of an approved metric
- Suggest questions for a programme-review meeting

Every AI output must show:

- Source data/report
- Period
- Known limitations
- Human reviewer
- Whether the result is an observation or prediction

AI may not:

- Approve/reject a programme
- Close a quality action
- Rank lecturers solely from student feedback
- Remove a student from a programme
- Determine staff discipline
- Present a forecast as an observed fact
- Change official data or statistics

---

### 6. Historical programme records

#### 6.1 Historical programme view

Past programme records are available in a read-only workspace:

> BSc Computer Science · January 2026 · Historical record

It may include:

- Curriculum/rule version
- Course offerings
- Teaching/TG assignments
- Approved assessment plans
- Result-release status
- Progression summary
- Quality actions
- Approved reports
- Calendar events
- Handover records
- Audit history

The page clearly states:

> Historical record — changes are not permitted.

#### 6.2 Correcting historical configuration

If an error is discovered in historical configuration or report data, staff cannot edit it directly.

They select:

> `Request historical record correction`

The request records:

- Item believed incorrect
- Current value/version
- Proposed correction
- Evidence
- Impact on past/current students
- Required authority
- Need for amended report/result communication

The system preserves the original historical version and records any authorized amendment.

---

### 7. Operational escalation

#### 7.1 Escalation triggers

An issue escalates when:

- Staffing gap reaches configured deadline
- Assessment plan is missing near publication date
- Result submission/moderation is overdue
- Moodle/SIS integration failure affects active teaching
- Adviser allocation remains incomplete
- Quality action becomes overdue
- Capacity/TG shortfall affects registered students
- Required academic decision is awaiting authority
- Regulatory/reporting deadline is at risk

#### 7.2 Escalation path

1. Work-item owner receives reminder.
2. Programme Coordinator sees programme-level overdue item.
3. HoD sees department-level escalation where configured.
4. School Dean/Academic Affairs receives escalation only when role/policy requires it.
5. Each escalation records owner, reason, date and next action.

Escalation does not automatically assign blame or alter student records.

---

### 8. Failure and recovery catalogue

| Situation | Coordinator/HoD experience | System behaviour |
|---|---|---|
| Quality action has no owner | Require assignment before activation | Prevent unowned open action |
| HoD approval expires/unavailable | Show acting/delegated approver route | Do not bypass authority |
| Handover misses active item | Reconciliation shows unassigned work | Create operational task |
| Report data is stale | Show last certified refresh/time | Prevent misrepresentation as current |
| Export too broad/sensitive | Explain permission/reduction requirement | Block or require authorization |
| AI summary has missing source data | Show limitation; require human review | Do not present as authoritative |
| Historical configuration correction impacts results | Route to controlled amendment process | Preserve original/audit |
| Moodle issue persists | Show affected courses/TGs/students and owner | Escalate/retry without changing registration |
| Quality deadline missed | Mark overdue and escalate | Preserve completion evidence |
| User switches from HoD to lecturer workspace | Remove HoD approval actions immediately | Enforce active-role context |

---

### 9. Architecture contract

#### 9.1 Core entities

| Entity | Purpose |
|---|---|
| Programme quality action | Managed improvement/compliance action |
| Department approval request | Scoped request requiring HoD/authority decision |
| Approval decision | Authorized approve/decline/return/referral record |
| Programme handover package | Active operational responsibility transfer |
| Governed programme report | Certified metric/report with scope and definition |
| Report export record | Auditable extract request/download |
| AI insight record | Controlled AI-assisted observation/summary |
| Historical programme record | Read-only prior programme configuration/operation state |
| Historical correction request | Controlled amendment of prior record |
| Operational escalation | Time-bound issue-routing record |

#### 9.2 Commands

| Command | Main result |
|---|---|
| `CreateProgrammeQualityAction` | Opens owned quality action |
| `UpdateProgrammeQualityAction` | Records progress/evidence |
| `CloseProgrammeQualityAction` | Closes action with authorized approval |
| `ReviewDepartmentApprovalRequest` | Opens HoD decision workspace |
| `RecordDepartmentApprovalDecision` | Records scoped authorized decision |
| `PrepareProgrammeHandover` | Creates transfer package |
| `AcceptProgrammeHandover` | Activates incoming responsibility |
| `GenerateGovernedProgrammeReport` | Produces scoped certified report |
| `RequestProgrammeReportExport` | Creates controlled extract |
| `RequestHistoricalProgrammeCorrection` | Opens historical amendment case |
| `EscalateProgrammeOperationalRisk` | Routes overdue/critical issue |

#### 9.3 Events

- `ProgrammeQualityActionCreated`
- `ProgrammeQualityActionOverdue`
- `ProgrammeQualityActionClosed`
- `DepartmentApprovalDecisionRecorded`
- `ProgrammeHandoverPrepared`
- `ProgrammeHandoverAccepted`
- `GovernedProgrammeReportGenerated`
- `ProgrammeReportExportRequested`
- `AIProgrammeInsightGenerated`
- `HistoricalProgrammeCorrectionRequested`
- `ProgrammeOperationalRiskEscalated`

#### 9.4 Audit requirements

Record:

- Active coordinator/HoD role, department/programme scope
- Quality-action evidence, owner, due date and closure authority
- Approval request, policy/version, decision and conditions
- Handover sender/receiver, effective date and transferred items
- Report definition/version, filters, sources and freshness
- Export request, authorization, checksum and expiry
- AI use case, source data, human reviewer and limitations
- Historical record/correction original and amended versions
- Escalation route, timing and resolution

---

### 10. Part 3 acceptance tests

Part 3 is accepted when:

- Quality actions have a clear evidence source, owner, deadline, status and authorized closure.
- HoD approvals are role/scope controlled and can be approved with precise conditions.
- Programme handover transfers open operational work without retaining outgoing unrestricted access.
- Reports identify metric definition, scope, source, period, freshness and data limitations.
- Exports are limited, purpose-recorded and treated as non-authoritative extracts.
- AI can assist with approved summaries/quality checks but cannot make academic, programme, student or staff decisions.
- Historical programme records are read-only, and corrections preserve original versions.
- Operational issues escalate through configured responsibility without changing student data automatically.
- Coordinators/HoDs cannot access restricted counselling, discipline or unnecessary finance records.
- Keyboard, screen-reader, mobile, low-bandwidth, approval-delegation, export-control and handover-recovery tests pass.

**Role Blueprint 5 is now complete: Programme Coordinator and Head of Department.**

The next blueprint should be:

> **Role Blueprint 6: School Dean and Dean of Students** — beginning with decision queues, school/student-affairs oversight, delegated authority, student-success patterns and restricted-case boundaries.
