<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: abef72a9-5d89-54a1-b4ac-1beadb24b196; chronological message: 198. -->

# Role Blueprint 5 — Programme Coordinator and Head of Department  
## Part 2: Curriculum and course-rule management, academic calendars, capacity/TG planning, assessment oversight and programme-level progression monitoring

This part defines how the Programme Coordinator and Head of Department manage academic structures without allowing staff to casually change rules that affect current students.

The core rule is:

> Curriculum, progression, course, assessment and calendar rules are versioned academic policies. A change is proposed, reviewed, approved and made effective for a defined cohort/period; it is never silently applied to historical students.

---

## 1. Curriculum and course-rule workspace

### 1.1 Programme curriculum page

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

### 1.2 Course-rule detail

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

## 2. Configurable academic rules

The system stores academic rules as configuration, not source code.

### 2.1 Progression-rule configuration

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

### 2.2 Supplementary-examination configuration

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

## 3. Change-control process

### 3.1 Proposing a change

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

### 3.2 Impact preview

Before submission, the system displays:

- Students currently governed by the old version
- Students who would be affected by new rule
- Courses/assessment plans affected
- Registration/progression/fee effects
- Moodle mapping impact
- Required student communication
- Whether current academic period is already active

A policy change cannot silently recalculate an already approved progression outcome or released result.

### 3.3 Approval and publication

After authorized approval:

1. New rule/curriculum version is stored.
2. Effective cohort/date is recorded.
3. Historical versions remain unchanged.
4. Required course/assessment/Moodle mappings are checked.
5. Student/staff communication tasks are created where needed.
6. New configuration is activated only after validation passes.

---

## 4. Academic calendar

### 4.1 Programme calendar view

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

### 4.2 Calendar change

A programme-specific calendar change requires:

- Affected course/TG/student count
- Assessment/timetable impact
- Moodle calendar impact
- Venue/resource availability
- Authority/approval route
- Student/staff communication plan

The system prevents staff from changing a Moodle date alone when the official SIS academic calendar remains different.

---

## 5. Capacity and Tutorial Group planning

### 5.1 Capacity planning page

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

### 5.2 Creating a TG

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

### 5.3 Student allocation

Students are allocated using an approved rule, for example:

- Timetable preference where configured
- Capacity balancing
- Programme cohort
- Clinical/lab safety limit
- Explicit staff assignment

The system records the allocation reason. Students see their assigned TG and any approved change route.

The coordinator cannot move students in a way that creates timetable conflict or changes official course registration without validation.

---

## 6. Assessment oversight

### 6.1 Assessment-readiness view

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

### 6.2 Coordinator actions

Within authority, the coordinator can:

- Request assessment-plan approval/change
- Allocate marker/moderator
- Check Moodle assessment mapping
- Review missing or delayed components
- Escalate late marking/result risks
- Ensure TG-specific quizzes meet approved equivalence rules
- Communicate approved assessment changes

The coordinator cannot manually alter student marks or release official course results unless separately assigned an examinations role.

### 6.3 Assessment fairness monitoring

The system may show operational patterns such as:

- Component missing for a TG
- One TG has no published assessment
- Students unable to access Moodle activity after registration
- Mark batch missing after deadline
- Assessment change not communicated
- Unusual mark distribution requiring human review

These are prompts for review, not automatic judgments of staff misconduct or student cheating.

---

## 7. Programme-level progression monitoring

### 7.1 Overview purpose

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

### 7.2 Explainable indicator

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

### 7.3 Individual student drill-down

The coordinator may open individual details only when they have a direct operational or decision purpose, such as:

- Progression decision required
- Academic-exception review
- Adviser assignment problem
- Course-plan validation failure
- Formal escalation

The HoD normally sees aggregate patterns first and opens individual cases only when authorized.

### 7.4 No automatic adverse action

Programme monitoring must not automatically:

- Withdraw a student
- Remove them from a programme
- Block them from registration beyond the approved rule
- Label them a wellbeing/discipline concern
- Change an official result
- Create a staff performance decision

The system creates a work item for human review where needed.

---

## 8. Failure and recovery catalogue

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

## 9. Architecture contract

### 9.1 Core entities

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

### 9.2 Commands

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

### 9.3 Events

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

### 9.4 Audit requirements

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

## 10. Part 2 acceptance tests

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

**Please approve Role Blueprint 5, Part 2: Curriculum and course-rule management, academic calendars, capacity/TG planning, assessment oversight and programme-level progression monitoring.**

After approval, I will continue with Part 3: **programme quality actions, staff handover, departmental approvals, reporting, audit and historical programme records.**

---

## Following user responses before the next design record

### User message 0199

You can proceed, part 2 is approved
