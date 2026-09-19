<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 6d56cbd3-0494-5647-a556-b8354feb91e2; chronological message: 169. -->

# Role Blueprint 3 — Lecturer and Tutor  
## Part 1: Teaching assignment, course workspace, class-list integrity and SIS–Moodle synchronization

This blueprint covers lecturers, tutors, course coordinators and other teaching staff while they are operating in a teaching role.

A person may also be a student, adviser, supervisor, Head of Department or Dean. They use one identity but explicitly switch to:

> Teaching workspace · [Department/School scope] · [Academic period]

Teaching permissions must never appear merely because someone has a staff account.

---

## 1. Role purpose and boundaries

### 1.1 Lecturer

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

### 1.2 Tutor

A tutor is assigned a narrower teaching scope, for example a tutorial group, laboratory group, practical session or course support activity.

A tutor may see only:

- Assigned course offering(s)
- Assigned section/group roster
- Approved assessment/attendance responsibilities
- Moodle tools allowed by their teaching assignment

A tutor cannot automatically view every group in the course, enter final course grades or access lecturer-only moderation details.

### 1.3 Course coordinator

Where configured, a course coordinator has a course-wide academic coordination role. They may manage the approved assessment-plan configuration, grade-import review, tutor allocations and course-level learning workflow, subject to department/examinations policy.

This role is explicit; it is not assumed from being the most senior lecturer listed on a course.

---

## 2. Teaching assignment lifecycle

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

## 3. Teaching workspace home

The lecturer/tutor home page is a work queue, not a generic analytics dashboard.

It answers:

1. Which classes am I teaching now?
2. What teaching, assessment or grading action is due?
3. Is any course/Moodle integration unhealthy?
4. Which student-support or academic issues need my limited action?
5. What timetable or course change affects me?

### 3.1 Home-page sections

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

### 3.2 Course card

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

## 4. Course workspace

### 4.1 Course header

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

### 4.2 Navigation

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

## 5. Authoritative class list

### 5.1 Roster source

The SIS is the authoritative source for official course membership.

The class list is generated from:

- Completed registration
- Approved registration amendments
- Authorized programme/course transfers
- Approved withdrawal/drop effective dates
- Group/section assignments
- Course capacity/waitlist rules

Moodle reflects the roster; it does not decide it.

### 5.2 Class-list page

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

### 5.3 Roster updates

When a student is added, dropped or moved:

> **Roster updated**  
> Chanda M. was added to Tutorial Group B.  
> Effective: 16 January 2027, 09:10 CAT  
> Moodle group synchronization: queued.

The lecturer/tutor cannot manually add an unregistered student to the official class list. If a student appears physically in class but not in the roster, staff use:

> `Report registration mismatch`

This creates a records/registration work item.

---

## 6. Real SIS–Moodle staff integration

### 6.1 What the lecturer sees

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

### 6.2 Staff-useful synchronization

The system synchronizes actual teaching data:

| Direction | Data |
|---|---|
| SIS → Moodle | Course shell, official course code/title, period, registered learners, lecturer/tutor roles, groups/sections, active/inactive status, approved assessment metadata, relevant calendar dates |
| Moodle → SIS | Activity/submission status, mapped grade components into staging, grade-feedback release state, activity schedule changes where permitted, course/group synchronization acknowledgements, integration errors |

The lecturer does not have to manually rebuild each roster, group or gradebook mapping for every course offering.

### 6.3 Moodle course-shell creation

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

### 6.4 Mapping safety

A Moodle activity can contribute to official CA only when it is mapped to:

- The correct SIS course offering
- The correct academic period
- An approved assessment-plan component
- A defined grade scale/weight
- A configured release and moderation workflow

The interface must block a lecturer from mapping an arbitrary Moodle quiz to an official assessment after results are already under review unless an authorized academic change process approves it.

---

## 7. Lecturer/tutor visibility boundaries

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

## 8. Communication with students

### 8.1 Course announcement

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

### 8.2 Direct message

A lecturer/tutor may contact an assigned student about course participation or academic matters. The interface reminds staff:

> Do not include counselling, medical, disciplinary or other restricted information in course communication.

Course communication does not become an official academic result or counselling record.

---

## 9. Academic concerns and student-success handoff

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

## 10. Failure and recovery catalogue

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

## 11. Architecture contract

### 11.1 Core entities

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

### 11.2 Commands

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

### 11.3 Events

- `TeachingAssignmentActivated`
- `OfficialCourseRosterUpdated`
- `MoodleCourseProvisioned`
- `MoodleTeachingRoleSynchronized`
- `MoodleCourseRosterSynchronized`
- `CourseCommunicationPublished`
- `AcademicConcernSubmitted`
- `CourseIntegrationMismatchDetected`
- `CourseIntegrationReconciled`

### 11.4 Audit requirements

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

## 12. Part 1 acceptance tests

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

**Please approve Role Blueprint 3, Part 1: Teaching assignment, course workspace, class-list integrity and SIS–Moodle synchronization.**

After approval, I will continue with Part 2: **assessment-plan setup, Moodle activity mapping, gradebook governance, marking workflow and moderated CA submission.**

---

## Following user responses before the next design record

### User message 0170

Okay we need to use words that mean the same eg roster I don't know what that is.here we have TG groups for tutorial groups and some tutors can assign quizzes

### User message 0172

Alright we can proceed now
