<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: cc6b714c-e89c-5005-8e73-ce5a5766d3ed; chronological message: 152. -->

# Role Blueprint 2 — New Student and Continuing Undergraduate Student  
## Part 4: Final registration, add/drop, timetable publication and Moodle handoff

This part begins after the student has an academically valid course plan and the required financial-clearance condition is satisfied.

It defines how a proposed course plan becomes official registration, how changes are controlled and how the student receives a trustworthy timetable and learning-system access.

---

## 1. Registration review

Before final registration, the student sees:

> Review registration for January 2027

The review shows:

- Programme and current year level
- Academic-period dates
- Progression outcome
- Required repeat courses
- New courses
- Extended research/industrial-training activities in progress
- Total academic load/credits
- Prerequisite and timetable validation result
- Course-based charges and financial-clearance status
- Registration deadline
- Required registration declaration

Each course is labelled clearly:

| Course | Status | Reason |
|---|---|---|
| CSC 2101 | Repeat required | Previous attempt not passed |
| CSC 2202 | New required course | Year 2 programme requirement |
| Industrial Training | In progress | Continues from Year 3 to Year 4 |
| CSC 2250 | Elective | Selected by student |

The student cannot confuse a repeat, new course and in-progress extended activity.

---

## 2. Final registration

### 2.1 Preconditions

The system permits `Submit registration` only when:

- Student record is active.
- Registration period is open.
- Progression outcome is authorized.
- Required repeat courses are included.
- Course plan passes prerequisite, co-requisite, load, capacity and timetable checks.
- Financial clearance is complete or an authorized exception applies.
- Required declarations are accepted.
- No registration-blocking hold exists.
- Current course-plan version is the one reviewed by the student.

### 2.2 Registration declaration

The student confirms versioned declarations such as:

- I have reviewed my registered courses.
- I understand that course changes follow approved add/drop rules.
- My information remains accurate to my knowledge.
- I understand the academic and financial obligations for this period.

These declarations are separate from payment consent and optional communication preferences.

### 2.3 Submit-registration interaction

When the student selects `Submit registration`:

1. The button becomes `Submitting registration…`.
2. Duplicate taps/clicks are blocked.
3. The server repeats all precondition checks.
4. The course-plan snapshot becomes the official registration record.
5. Course places are confirmed/allocated.
6. Course-based financial allocations are finalized according to policy.
7. Registration hold state is recalculated.
8. Student-registration receipt is generated.
9. Timetable-generation and Moodle-enrolment events are placed in the reliable integration outbox.
10. The student sees success only after authoritative registration completes.

Success screen:

> **Registration completed**  
> You are registered for January 2027.  
> Registered courses: 5  
> Registration reference: REG-2027-…  
>
> `View timetable`  
> `View registered courses`  
> `Download registration receipt`

### 2.4 Registration receipt

The receipt includes:

- Student number
- Programme and academic period
- Registration reference and timestamp
- Official registered course list
- Repeat/new/extended-activity labels
- Current financial-clearance status
- Relevant approved conditions
- Receipt verification reference
- Responsible office/help route

It does not include confidential finance, disciplinary, counselling or staff-only data.

---

## 3. Timetable publication

### 3.1 Student timetable page

Page title:

> My timetable

The page offers:

- Week view
- Day view
- List view
- Course filter
- Location/campus details
- Lecturer/tutor contact only where authorized
- Delivery mode: in-person, online or hybrid
- Link to course learning area when available
- Last updated time
- `Download calendar` only where approved

Each activity shows:

- Course
- Activity type: lecture, tutorial, laboratory, clinical session, examination, etc.
- Start/end time in CAT
- Venue or online link
- Instructor/teaching team where policy permits
- Changes/cancellation status

### 3.2 Timetable integrity

The timetable is generated from authoritative course-offering, registration and room/activity data. It must not be manually assembled in the student UI.

The system checks and flags:

- Student timetable collisions
- Room conflicts
- Lecturer conflicts
- Capacity issues
- Campus/travel-time rules where configured
- Changed/cancelled activity

If a timetable cannot be generated:

> Your registration is complete, but timetable information is still being prepared. Check again later. Your registration has not been affected.

### 3.3 Timetable updates

If an activity changes:

> **Timetable updated**  
> CSC 2202 tutorial now starts at 10:00 on Thursday in LT-3.  
> Updated: 12 January 2027, 15:20 CAT

The system preserves prior event history for operational audit but shows students the latest authoritative timetable.

---

## 4. Moodle and learning-system handoff

### 4.1 Separation of systems

The SIS remains authoritative for:

- Official registration
- Course entitlement
- Programme/course record
- Official results and progression

Moodle remains authoritative for:

- Learning materials
- Learning activities
- Assignment participation
- Classroom discussion
- Course-level learning workflow

The student UI must not present Moodle marks as official final results unless they have passed through the authorized examinations workflow.

### 4.2 Enrollment synchronization

After registration, the system sends a controlled course-enrolment event to Moodle.

Student-facing status:

| State | Student sees |
|---|---|
| Queued | Course access is being prepared |
| Synced | Moodle access available |
| Delayed | Registration is complete; Moodle access is delayed |
| Failed | Moodle access needs support; registration remains valid |
| Removed after approved change | Course access ended because registration changed |

Example:

> **CSC 2202 Moodle access — Being prepared**  
> Your registration is complete. Course access normally appears after synchronization.  
> Last checked: 14:32 CAT

The student must never be told to pay/register again merely because Moodle synchronization is delayed.

### 4.3 First Moodle entry

Selecting `Open learning area`:

- Opens Moodle through approved single sign-on where available.
- Sends the minimum necessary identity/course-enrolment information.
- Returns the student to the SIS on sign-out where appropriate.
- Does not expose SIS payment/discipline/support data to Moodle.

---

## 5. Add/drop and late-change workflow

### 5.1 Add/drop window

When the configured add/drop period is open, the student sees:

> Course changes are open until 2 February 2027, 17:00 CAT.

The page separates:

- Currently registered courses
- Available courses
- Pending change requests
- Financial/timetable effect
- Add/drop deadline

### 5.2 Adding a course

Selecting `Add course` triggers validation before a request can be submitted:

- Course availability/capacity
- Programme/year rule
- Prerequisites/co-requisites
- Academic-load limit
- Timetable collision
- Financial effect
- Required adviser/department approval

The student sees the effect before confirming:

> Adding CSC 2250 will increase your academic load by 3 credits and add ZMW [amount] to your provisional charges.  
> `Request add`  `Cancel`

Where self-service addition is allowed, the system completes it only after all checks pass. Otherwise it creates a controlled request for academic approval.

### 5.3 Dropping a course

Selecting `Drop course` shows:

- Whether the course is required, repeat, elective or extended activity
- Academic progression effect
- Financial/refund/credit effect
- Deadline
- Need for adviser/department approval
- Impact on Moodle access and timetable

A required repeat or compulsory course cannot be casually dropped.

Example:

> You cannot drop CSC 2101 through self-service because it is a required repeat course. Request academic advice if you believe an exception applies.

### 5.4 Change approval and effect

Approved course changes:

- Create a new registration amendment version.
- Update course roster and timetable.
- Recalculate charges/clearance.
- Send Moodle enrolment/removal events.
- Notify the student of the exact result.

A student is not told “Course added” until the final authorized registration amendment is complete.

### 5.5 Late registration/change

After the normal deadline, the student sees a controlled request route if policy permits:

> The normal add/drop period has closed. Request a late change only if you have an approved reason.

The request records reason, evidence where applicable, authority and decision. It does not grant automatic late access.

---

## 6. Waitlists and capacity

Where a course offering uses a waitlist:

- The student sees their waitlist status and the course’s next review point.
- The system does not promise a place.
- Offer of a place has a configurable response period.
- Accepting a waitlist place triggers a fresh prerequisite, timetable, load and finance check.
- If the student does not respond in time, the offer expires according to policy.

Applicant-facing wording:

> You are on the waitlist for CSC 2250. We will notify you if a place becomes available. Your registration for other courses remains unchanged.

---

## 7. Registration reversal and withdrawal from period

A final registration may need reversal only through authorized processes, for example:

- Confirmed administrative error
- Authorized programme/period withdrawal
- Fraud/identity-resolution outcome
- Academic decision
- Finance reversal under approved rule

The student cannot “delete” a completed registration.

The portal instead provides contextual requests:

- `Request registration review`
- `Request academic withdrawal`
- `Ask Finance`
- `Contact Records`

Each request shows likely consequences for courses, fees, Moodle access, accommodation and academic record according to approved policy.

---

## 8. Failure and recovery catalogue

| Situation | Student-facing behaviour | System behaviour |
|---|---|---|
| Financial clearance lost during registration | Explain exact change; preserve course plan | Block final registration and recalculate status |
| Course becomes full before submission | Explain capacity change and alternatives | Prevent over-enrolment |
| Timetable conflict emerges | Identify conflicting activities | Require plan correction/authorized override |
| Moodle sync delayed | Show registration complete and access pending | Retry integration; create operations task |
| Moodle sync fails | Offer support route; do not undo registration | Reconcile through integration queue |
| Course add changes charge | Show revised fee before confirmation | Recalculate invoice/clearance |
| Course drop has refund effect | Explain that Finance review may be required | Create approved credit/refund workflow |
| Add/drop period closed | Show late-change policy route | Prevent ordinary self-service change |
| Two devices submit registration | One registration succeeds; other sees final result | Idempotent transaction |
| Browser disconnects during submission | Check registration status; do not retry blindly | Resolve through submission reference |
| Timetable data unavailable | Show last known data/date and service status | Avoid false timetable completion |

---

## 9. Accessibility and low-bandwidth requirements

- Registration steps, course status and timetable changes use plain text in addition to colour.
- Course cards provide accessible course title, type, time, location and action labels.
- Tables have accessible headers; mobile view uses equivalent structured cards.
- Drag-and-drop is never the only way to arrange/change courses.
- Timetable has a list view for screen readers and low-bandwidth users.
- Registration receipt and timetable have accessible HTML views before optional download.
- Moodle access delays are explained without requiring the student to navigate a separate support site.
- Course-change confirmations state academic and financial impact before irreversible actions.

---

## 10. Architecture contract

### 10.1 Core entities

| Entity | Purpose |
|---|---|
| Registration snapshot | Immutable official period-registration record |
| Registration amendment | Authorized add/drop/late-change version |
| Course roster membership | Student entitlement to a course offering |
| Timetable activity | Authoritative scheduled learning activity |
| Student timetable projection | Student-specific timetable read model |
| Moodle enrolment state | Integration status for registered course |
| Course-change request | Controlled addition/drop request |
| Course waitlist entry | Managed capacity queue |
| Registration receipt | Official proof of period registration |

### 10.2 Commands

| Command | Main result |
|---|---|
| `SubmitStudentRegistration` | Creates official registration snapshot |
| `GenerateStudentTimetable` | Builds timetable from authoritative data |
| `PublishTimetableChange` | Makes updated activity visible |
| `RequestCourseAddition` | Validates/creates add request |
| `RequestCourseDrop` | Validates/creates drop request |
| `ApproveRegistrationAmendment` | Applies authorized course change |
| `SynchronizeMoodleEnrolment` | Updates learning-system entitlement |
| `JoinCourseWaitlist` | Creates controlled waitlist entry |
| `AcceptWaitlistCoursePlace` | Converts offered place after revalidation |
| `RequestLateRegistrationChange` | Opens policy-controlled late-change case |

### 10.3 Events

- `StudentRegistrationCompleted`
- `RegistrationReceiptIssued`
- `StudentTimetableGenerated`
- `StudentTimetableChanged`
- `CourseAdditionRequested`
- `CourseDropRequested`
- `RegistrationAmendmentApproved`
- `MoodleEnrolmentQueued`
- `MoodleEnrolmentSynchronized`
- `MoodleEnrolmentFailed`
- `CourseWaitlistJoined`
- `CourseWaitlistPlaceOffered`

### 10.4 Audit requirements

Record:

- Student, programme and academic-period scope
- Registration snapshot/version
- Courses, repeat/new/extended labels and academic-load calculation
- Precondition-check outcome
- Student declarations and submission time
- Timetable source/version and material change history
- Course-change request, authority, impact and result
- Charge/finance effect
- Moodle integration request/result
- Waitlist ordering and offer/expiry outcome
- Any override, reason and authorizing role

---

## 11. Part 4 acceptance tests

Part 4 is accepted when:

- Final registration is possible only after all authorized academic, finance, declaration and hold conditions pass.
- Registration turns a validated course plan into an immutable official snapshot with receipt.
- A student can tell required repeats, new courses and extended activities apart.
- Timetable availability/delay is clearly separated from registration completion.
- Moodle delay/failure never falsely suggests that registration failed.
- Add/drop requests show academic, timetable and financial consequences before confirmation.
- Required repeat/compulsory courses cannot be casually dropped.
- Course capacity, waitlist, prerequisite, load and timetable rules are enforced server-side.
- All post-registration changes create controlled amendments, never silent edits.
- Registration and Moodle events are traceable and recover from duplicate/disconnected submissions.
- Keyboard, screen-reader, mobile, low-bandwidth and cross-system tests pass.

**Please approve Role Blueprint 2, Part 4: Final registration, add/drop, timetable publication and Moodle handoff.**

After approval, I will continue with Part 5: **student learning progress, assessment visibility, official results release, supplementary-exam experience, result corrections and academic-record requests.**

---

## Following user responses before the next design record

### User message 0153

We can move to part 5

Here we have different types of accesments ,and we need actual Moodle integration not just a mere button link of Moodle, synchronous and useful for both students and staff users
