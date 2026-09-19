<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: b00b5aaf-6e16-50e7-80c7-51dce8a5f140; chronological message: 183. -->

# Role Blueprint 3 — Lecturer and Tutor  
## Part 5: Teaching timetable, course materials, substitute/acting staff, course closure, archiving and teaching-history access

This part completes the Lecturer and Tutor blueprint. It governs the teaching lifecycle outside direct assessment: scheduled teaching, learning materials, temporary staff cover, closure and secure access to historical course records.

The governing rule is:

> Teaching staff can manage learning delivery within their assignment, but official schedules, staff roles, registration and academic records remain controlled institutional data.

---

## 1. Teaching timetable

### 1.1 Staff timetable home

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

### 1.2 Session detail

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

### 1.3 Timetable changes

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

## 2. Course materials and Moodle learning content

### 2.1 Material management boundary

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

### 2.2 Staff course-material view

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

### 2.3 Publication rules

Before publishing material to students, Moodle/course workflow prompts staff to confirm:

- Intended course/TG audience
- Availability date
- Accessibility requirements for meaningful content
- Related assessment/learning objective where configured
- Whether material is revised/replacing prior content

The system must not force staff to expose draft materials to students simply because the Moodle course shell exists.

### 2.4 Accessibility and material quality

Where a material is intended for students, staff receive practical prompts:

- Provide text alternative for meaningful images
- Provide captions/transcript for instructional media
- Use readable document structure/headings
- Avoid image-only instructions
- Provide accessible alternative for scanned/non-selectable content
- Ensure links describe their destination

The system records only compliance support/status; it does not automatically judge academic quality or block all publishing based on an AI score.

---

## 3. Substitute and acting teaching staff

### 3.1 Requesting cover

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

### 3.2 Approval and temporary assignment

After authorized approval, the substitute receives a separate, time-bound teaching assignment:

> Acting tutor · CSC 4792 · TG 2  
> Effective: 10–17 March 2027  
> Permitted: teach tutorial, access TG materials, record attendance, send TG announcements  
> Not permitted: release official CA or final results

The substitute uses their own account and active teaching workspace.

### 3.3 Quiz/marking delegation

If the substitute must create or mark a quiz, the temporary assignment must explicitly include:

- Quiz creation permission
- TG/course scope
- Relevant assessment component
- Start/end dates
- Required lecturer/coordinator review

A substitute cannot inherit all original lecturer authority by default.

### 3.4 End of cover

At the end date:

- Temporary access expires automatically.
- Moodle role is adjusted through synchronization.
- Outstanding marking/attendance work is returned to the responsible teaching role or reassigned explicitly.
- Student communication notes remain in the course record.
- Audit trail remains available to authorized users.

---

## 4. Course closure

### 4.1 Closure preparation

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

### 4.2 Closure states

| State | Meaning |
|---|---|
| Active teaching | Course is being delivered |
| Assessment completion | Teaching ended; assessment/marking continues |
| Results governance | Results are in moderation/board workflow |
| Closed to students | Normal student learning activity ended |
| Archived | Course record retained under policy |
| Reopened under authorization | Limited temporary reopening for approved purpose |

### 4.3 Student access after closure

The institution configures what students retain after course closure:

- Read-only access to materials
- Feedback access
- Submission history
- No further activity submission
- Continued access until a specified date
- Access removed after archive period

The staff interface explains the selected policy. Closure must not accidentally erase student submissions, feedback, grade evidence or course history.

---

## 5. Course archive and teaching history

### 5.1 Lecturer/tutor history page

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

### 5.2 Archived-course view

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

### 5.3 Controlled reopening

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

## 6. Teaching handover

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

## 7. Failure and recovery catalogue

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

## 8. Architecture contract

### 8.1 Core entities

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

### 8.2 Commands

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

### 8.3 Events

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

### 8.4 Audit requirements

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

## 9. Part 5 acceptance tests

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

---

## Following user responses before the next design record

### User message 0184

we can proceed to **Role Blueprint 4: Academic Adviser** — starting with assigned-advisee list, academic overview, caseload priorities, support observations and advising appointment workflow.
