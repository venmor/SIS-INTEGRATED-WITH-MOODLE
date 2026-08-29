<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: e4eac17d-1e78-53d1-9c90-f46b1476c768; chronological message: 147. -->

# Role Blueprint 2 — New Student and Continuing Undergraduate Student  
## Part 3: Programme progression, course selection, prerequisite checks, repeats, supplementary eligibility and registration workflow

This part defines how the system determines a student’s academic path and permits registration. It covers full-year courses, half-courses, repeats, progression, supplementary exams, course-based payment and long-running activities such as research or industrial training.

The system must use a versioned academic-rule engine. These rules must never be hard-coded in screens or scattered through application code.

---

## 1. Course and academic-period model

### 1.1 Course types

| Course type | Meaning | Result/progression handling |
|---|---|---|
| Half-course | A course taught and assessed within one semester/half of the academic year | Has a result in that semester; may be passed, failed, deferred, supplementary-eligible, etc. |
| Full-year course | A course taught and assessed across the full academic year | Final progression result is recorded only at its defined completion point |
| Extended activity course | A course introduced in one year but formally completed in a later year, such as research or industrial training | Remains `In progress` until its approved completion point; it is not marked failed merely because it continues into the next year |
| Repeat course | A previously failed course the student must take again | Linked to original attempt and repeat rule |
| Prerequisite course | A course that must be completed or meet a configured condition before another course can be taken | Enforced by rules, with authorized overrides only |
| Co-requisite course | A course that must be taken before or alongside another course | Enforced at selection/registration time |

The official catalogue defines the type, credits, year level, semester, prerequisites, assessment rules, payment basis and progression implications of each course version.

---

## 2. Academic-result states

A course attempt must use a specific result state. `Failed` is not the default for unfinished activity.

| State | Meaning |
|---|---|
| Not started | Student has not begun the registered course |
| In progress | Learning/research/training remains legitimately underway |
| Assessment pending | Teaching complete; authorized result not yet published |
| Passed | Student met the approved pass rule |
| Failed | Final authorized result is below the approved pass rule |
| Supplementary eligible | Student may sit supplementary assessment under approved rules |
| Supplementary passed | Student passed via approved supplementary assessment |
| Supplementary failed | Student did not pass supplementary assessment |
| Deferred | Authorized postponement; not yet a fail |
| Withdrawn | Authorized withdrawal from the course |
| Incomplete | Required academic work remains; distinct from fail |
| Exempted/credited | Course requirement met through approved credit/exemption |
| Repeat required | Student must register a further attempt |
| Not applicable | Course does not apply to this student/pathway |

A research or industrial-training course that begins in Year 3 and completes in Year 4 remains `In progress` during the approved period. It must not be labelled `Failed` because it does not have a final mark at the end of Year 3.

---

## 3. Progression policy supplied for this system

The following rules are now captured as explicit policy requirements from your design direction.

### 3.1 Progression with failed half-courses

A student may progress to the next academic year and register for permitted next-year courses when all applicable conditions are met:

- The student has **passed the relevant full-year course(s)**.
- The student has failed **fewer than three half-courses**.
- The failed half-courses are registered as repeats.
- The student meets all prerequisites/co-requisites for new courses.
- There is no academic, financial or administrative hold.
- Course-based payment/financial clearance is satisfied for both repeat and newly selected courses.

The student’s outcome is:

> **Progress with repeat courses**

They remain in the next academic year but carry the failed half-courses alongside permitted new courses.

Example:

> You passed your full-year course and have two failed half-courses. You may progress to Year 2, subject to registering and paying for the two repeat courses and your approved Year 2 courses.

### 3.2 Full-year course failure

If a student fails a full-year course, the system produces:

> **Repeat year required**

The student registers the required repeat-year course package according to the approved programme regulation. They must not be offered ordinary next-year courses merely because a UI screen has a generic “Add courses” button.

### 3.3 More than three failed half-courses

If a student fails **more than three half-courses**, the system produces:

> **Repeat year required**

The repeat-year course package contains the failed courses and any other courses required by approved regulations. The system does not assume that every previously passed course must be repeated.

### 3.4 Important unresolved boundary: exactly three failed half-courses

Your stated rules specify:

- Fewer than three failed half-courses → progression with repeats
- More than three failed half-courses → repeat year

This leaves **exactly three failed half-courses** undecided.

Developers must not guess. The academic policy configuration requires an explicit rule before production use:

| Rule option | Effect |
|---|---|
| Treat three as progression with repeats | Student progresses and repeats three half-courses |
| Treat three as repeat year | Student repeats year requirements |
| Refer three to an academic board | System creates an academic-decision case |

Until the authorised regulation chooses one, the system status is:

> **Progression decision required**

The student sees that a decision is pending, not an incorrect repeat/progression result.

### 3.5 Extended research/industrial-training course

Where a course begins in Year 3 but is completed in Year 4:

- The course catalogue marks it as `Extended activity course`.
- It has an approved start period and completion period.
- The Year 3 progression engine recognizes it as legitimately `In progress`.
- It does not count as a failed course, repeat or failed prerequisite unless an authorized final assessment later records a fail.
- The student can progress to Year 4 where other rules permit.
- The student home displays the course as an active milestone, for example:

> **Industrial Training — In progress**  
> Started: Year 3, Semester 2  
> Completion due: Year 4, Semester 1  
> Next milestone: Submit supervisor evaluation by 15 February 2027.

---

## 4. Supplementary-examination policy supplied for this system

### 4.1 Eligibility rule

After official results publication, a student may be eligible for supplementary examinations only when all configured requirements are met.

Your stated policy requirements are:

- The student must have a **continuous-assessment (CA) score of 50 or above** for the failed course.
- The student must have failed **fewer than three courses** within the applicable supplementary assessment scope.
- Supplementary eligibility is assessed only after the authorized result-publication process.
- A student with **CA of 40** is not eligible to sit a supplementary examination.

The student sees a course-specific status, for example:

> **CSC 4792 — Supplementary eligible**  
> Your CA score meets the supplementary requirement. You have met the applicable failed-course limit.  
> Supplementary examination date: [date]  
> `View supplementary instructions`

Or:

> **CSC 4792 — Not eligible for supplementary examination**  
> Your CA score does not meet the minimum requirement for supplementary eligibility.  
> Next academic action: register the course as a repeat, subject to the progression decision.

### 4.2 Unresolved CA boundary

Your direction explicitly sets:

- CA **50 or above** → eligible, if other conditions are met
- CA **40** → ineligible

It does not yet define CA scores **41–49**.

The rule configuration must therefore contain an approved value before production:

- `CA ≥ 50: eligible; CA < 50: ineligible`, or
- another regulation-approved threshold/exception rule.

Until confirmed, the system must show:

> **Supplementary eligibility awaiting rule confirmation**

It must not permit or refuse supplementary examination based on developer assumption.

### 4.3 Failed-course-count boundary for supplementary

The phrase “failed less than 3 courses” is encoded as:

- 0–2 failed applicable courses → may be eligible if CA rule and all other conditions pass.
- 3 or more → not eligible, unless a formal academic rule says otherwise.

The exact scope must be configured:

- Failed courses in one semester,
- Failed courses in one academic year,
- Failed half-courses only,
- All courses including full-year courses.

The student-facing explanation must name the rule scope.

### 4.4 Supplementary workflow

1. Official course results are published.
2. The rule engine assesses course-level CA, result, failed-course count and any exclusions.
3. Eligible students receive a supplementary task.
4. Student views date, venue/online instructions, fee requirement if any and deadline.
5. Student confirms participation where policy requires it.
6. Finance confirms any supplementary fee requirement.
7. Examinations records supplementary attendance and result.
8. Final course outcome updates to `Supplementary passed` or `Supplementary failed`.
9. The progression decision recalculates if the supplementary result changes the course outcome.

A supplementary result must never overwrite the original result. It is a linked subsequent assessment outcome.

---

## 5. Progression outcome page

After authorized results/progression processing, the student sees:

> Academic progression for 2026/2027

The page explains the conclusion, not merely a classification.

### 5.1 Progress with repeats

> **Outcome: Progress to Year 2 with repeat courses**  
> You passed the required full-year course(s).  
> You must repeat:  
> - [Half-course A]  
> - [Half-course B]  
>
> You may now review your Year 2 courses and repeats. Course choices remain subject to prerequisites, capacity and financial clearance.  
> `Plan my registration`

### 5.2 Repeat year required

> **Outcome: Repeat year required**  
> You must repeat the required course package before progressing to the next academic year.  
> Reason: [approved explanation, such as “A required full-year course was not passed.”]  
>
> `View repeat-year course plan`  
> `Get academic-advice support`

### 5.3 Decision pending

> **Outcome: Academic progression decision required**  
> Your result pattern requires an authorized academic decision under the applicable regulation.  
> No action is required from you now unless a task appears below.

The student does not see staff recommendations, board deliberations or another student’s outcome.

---

## 6. Course planning and selection

### 6.1 Course-plan page

Page title:

> Plan your courses for [academic period]

The page separates:

1. **Required repeat courses**
2. **Required new-year courses**
3. **Available elective courses**
4. **Extended activities already in progress**
5. **Courses unavailable and why**

Each course card shows:

- Course code/title
- Credit value
- Course type: half/full/extended
- Semester/period
- Requirement status: mandatory, elective, repeat
- Prerequisite/co-requisite status
- Payment amount/fee category, where course-based payment applies
- Capacity/waitlist status, where relevant
- `Add course`, `Remove`, or `View requirement`

### 6.2 Repeat courses

Repeat courses are automatically proposed, not hidden among electives.

The student sees:

> **Repeat courses required**  
> These courses are required because of your prior authorized results. They cannot be removed without an approved academic decision.

Where regulations permit sequencing alternatives, the system explains those choices rather than forcing an opaque package.

### 6.3 New courses while carrying repeats

For a student allowed to progress with fewer than three failed half-courses:

- Required repeats appear first.
- Permitted next-year courses appear separately.
- The system checks timetable conflicts, credit/academic-load limits, prerequisites and payment requirements across the combined package.
- The student cannot remove a repeat course merely to make the schedule easier, unless an authorized academic exception exists.

### 6.4 Prerequisite check

When the student selects a course, the system evaluates:

- Passed prerequisite
- Approved co-requisite selection
- Authorized exemption/credit
- Permitted concurrent enrolment rule
- Progression-year rule
- Attempt limit
- Course capacity
- Timetable conflict
- Academic-load limit
- Financial/payment readiness

Blocked example:

> You cannot add Advanced Database Systems yet because Database Systems must be passed first.  
> `View prerequisite`  `Review available courses`

Permitted concurrent example:

> You may take Research Methods while Industrial Training remains in progress. Industrial Training is an extended activity and is not a failed prerequisite.

### 6.5 Course-selection confirmation

Before selection is saved, the student sees:

- Selected course list
- Repeat/new/elective labels
- Credit or academic-load summary
- Per-course charge and total provisional charge
- Conflicts and warnings
- Conditions still preventing final registration

Selecting `Save course plan` saves a draft plan; it does not finalise registration.

---

## 7. Course-based payment

### 7.1 Charge generation

Each selected, required repeat, or institution-assigned course can generate a course-based financial obligation according to the approved fee schedule.

The student’s provisional course-plan summary shows:

| Course | Type | Fee basis | Amount |
|---|---|---|---|
| CSC 2101 | Repeat half-course | Repeat-course fee | ZMW [configured amount] |
| CSC 2202 | New half-course | Standard course fee | ZMW [configured amount] |
| Industrial Training | Extended activity | No new course charge this period / configured charge | ZMW [configured amount] |

The exact amounts and billing logic are versioned configuration. No UI component calculates fees itself.

### 7.2 Payment effect

The system explains:

> Your provisional course plan creates charges based on the selected and required courses. Financial clearance will be reassessed after the plan is confirmed and payment/sponsorship rules are met.

Adding or removing an elective before final registration recalculates provisional charges. Any payment already received is handled by Finance allocation rules, not silently deleted or reassigned by the student interface.

### 7.3 Repeat-year billing

For repeat-year outcomes:

- Only courses required by the approved repeat package generate charges.
- Previously passed courses are not automatically billed again.
- Extended activities are charged only according to their configured period/rule.
- Sponsors/payment plans are re-evaluated for the new period.

---

## 8. First/continuing registration workflow

### 8.1 Steps

The registration workflow is a controlled sequence:

1. Confirm academic progression/entry status
2. Review required repeats and continuing activities
3. Build or review course plan
4. Resolve prerequisite/load/timetable issues
5. Save provisional course plan
6. Generate/refresh course-based financial obligation
7. Meet financial-clearance requirement
8. Review registration summary and required declaration
9. Submit registration
10. Receive registration receipt and timetable/Moodle synchronization status

The system shows completion status for every step. It never silently registers a course because it appeared in a list.

### 8.2 Registration lock

After final registration:

- The course set becomes the official registered course load.
- Changes use controlled add/drop/late-registration workflows.
- Charges and entitlement updates are recalculated through authorized rules.
- Moodle/course-roster events are sent through integration controls.
- The student receives an official registration receipt.

### 8.3 Academic advice route

When course selection is blocked by complex repeat/prerequisite patterns, the student sees:

> Your course plan needs academic review. Your adviser or department must confirm the permitted academic load.

The student can request advice, but the system does not automatically override academic rules or assign them to a random staff member.

---

## 9. Error and recovery catalogue

| Situation | Student-facing response | System behaviour |
|---|---|---|
| Failed full-year course | Explain repeat-year outcome and required package | Block normal next-year course selection |
| Fewer than three failed half-courses plus passed full-year course | Show progress-with-repeats package | Permit only valid combined course plan |
| More than three failed half-courses | Explain repeat-year outcome | Generate repeat-plan requirements |
| Exactly three failed half-courses | Show decision pending until regulation is configured/decision made | Do not infer outcome |
| CA 50+ and eligible failed-course count | Show supplementary task after results publication | Create exam/fee workflow |
| CA 40 | Show ineligible explanation and repeat-path action | Do not create supplementary booking |
| CA 41–49 | Show rule-pending state until policy is defined | Do not infer eligibility |
| Extended research/industrial training | Display `In progress` with milestone | Exclude from fail count until final result |
| Prerequisite missing | Identify exact course/rule and alternatives | Block selection |
| Timetable conflict | Show conflicting activities and alternatives | Prevent conflicting final registration |
| Capacity full | Explain waitlist or alternative, where authorized | Do not over-enrol |
| Course plan changes fee | Show updated provisional charge before confirmation | Recalculate finance obligation |
| Finance not cleared | Preserve course plan; direct to clearance | Block final registration only |
| Results amended after plan | Explain changed progression impact | Recalculate plan and require review |

---

## 10. Architecture contract

### 10.1 Core entities

| Entity | Purpose |
|---|---|
| Course catalogue version | Approved definition of course type, credits, prerequisites and rules |
| Course offering | Course available in a specified period |
| Course attempt | Student’s linked attempt/result for a course |
| Continuous-assessment record | Authorized CA component used under supplementary rule |
| Supplementary eligibility assessment | Explainable evaluation of eligibility |
| Supplementary examination attempt | Subsequent assessment linked to original course attempt |
| Progression assessment | Versioned academic-year outcome |
| Repeat-course requirement | Course student must repeat |
| Extended-activity enrolment | Long-running research/training course record |
| Student course plan | Draft/proposed set of period courses |
| Registration record | Final authorized period registration |
| Course-based charge | Financial obligation generated by selected/required course |

### 10.2 Commands

| Command | Main result |
|---|---|
| `PublishAuthorizedCourseResults` | Makes approved results available |
| `AssessSupplementaryEligibility` | Evaluates CA, fail count and course rules |
| `RecordSupplementaryResult` | Records authorized supplementary outcome |
| `AssessStudentProgression` | Determines progress/repeat/decision-pending outcome |
| `GenerateRepeatCourseRequirements` | Creates mandatory repeats |
| `CreateOrUpdateStudentCoursePlan` | Saves provisional plan |
| `ValidateCoursePlan` | Tests prerequisites, load, conflicts and availability |
| `GenerateCourseBasedCharges` | Creates/recalculates fee obligation |
| `SubmitStudentRegistration` | Locks valid course plan after clearance/declarations |
| `RecordExtendedActivityMilestone` | Tracks research/industrial-training progress without false fail |

### 10.3 Events

- `AuthorizedCourseResultsPublished`
- `SupplementaryEligibilityAssessed`
- `SupplementaryExamScheduled`
- `SupplementaryResultRecorded`
- `StudentProgressionAssessed`
- `RepeatCourseRequirementsCreated`
- `ExtendedActivityMilestoneRecorded`
- `StudentCoursePlanSaved`
- `StudentCoursePlanValidationFailed`
- `CourseBasedChargesGenerated`
- `StudentRegistrationSubmitted`
- `StudentRegistrationCompleted`

### 10.4 Audit requirements

The system records:

- Regulation/policy and course-catalogue version
- Authorized source of results and CA score
- Supplementary eligibility inputs and result
- Progression calculation inputs, exclusions and outcome
- Human academic-board decision where required
- Course-plan changes, rules checked and overrides
- Fee schedule/course-charge version
- Registration declaration and final course package
- Extended-activity milestone/status changes
- Acting role, organizational scope and timestamp for every override

---

## 11. Part 3 acceptance tests

Part 3 is accepted when:

- A full-year course, half-course and extended activity have distinct result/progression handling.
- A Year 3 activity legitimately completing in Year 4 stays `In progress` and is not counted as a failure before final assessment.
- A student who passed required full-year courses and failed fewer than three half-courses can progress with required repeats and valid next-year courses.
- A failed full-year course produces repeat-year requirements.
- More than three failed half-courses produces repeat-year requirements.
- Exactly three failed half-courses cannot be silently classified until the institutional rule is set.
- CA 50+ with permitted failed-course count produces supplementary eligibility after official result release.
- CA 40 does not produce supplementary eligibility.
- CA 41–49 cannot be silently decided until the institutional threshold is approved.
- Supplementary results remain linked to, rather than overwrite, original results.
- Course selection checks prerequisites, co-requisites, repeat obligations, capacity, timetable conflict, load and payment effects.
- Charges are generated from course-based financial rules, including repeat courses.
- Final registration remains blocked until academic, finance and declaration conditions are satisfied.
- All decisions, exceptions and rule versions are traceable and testable.

**Please approve Role Blueprint 2, Part 3: Programme progression, course selection, prerequisite checks, repeats, supplementary eligibility and registration workflow.**

Before this is implemented, the academic office must formally confirm two currently open policy values:

1. The progression outcome for **exactly three failed half-courses**.  
2. The supplementary-exam rule for **CA scores from 41 to 49**.

---

## Following user responses before the next design record

### User message 0148

Before this is implemented, the academic office must formally confirm two currently open policy values:
The progression outcome for exactly three failed half-courses.
The supplementary-exam rule for CA scores from 41 to 49.


These should be a rule that's configurable not hard coded.

### User message 0150

Approved and contineu
