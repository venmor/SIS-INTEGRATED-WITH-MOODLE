<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 2bb845eb-caa7-5850-8c8c-38c050882428; chronological message: 141. -->

# Role Blueprint 2 — New Student and Continuing Undergraduate Student  
## Part 1: Student identity, portal entry, first-registration readiness and student home experience

This blueprint covers a person who has been converted from an accepted applicant into a student record, as well as a continuing undergraduate student returning for a later academic period.

It begins before registration is complete and will later progress through registration, billing, courses, timetable, results, support and graduation.

---

## 1. Student identity and lifecycle

A student account remains connected to the same underlying person identity and applicant history. The system does not create a separate unrelated identity merely because the person becomes a student.

The student portal header always shows:

> Student portal · [Active academic period] · [Student number] · [Current registration status]

A person who is also a lecturer, adviser or staff member uses the explicit workspace switcher. Student privileges must not silently combine with staff privileges.

### 1.1 Critical distinction

| State | Meaning |
|---|---|
| Accepted applicant | Offer accepted; onboarding may still be incomplete |
| Student record created | Student number exists; person is entitled to enter student portal |
| Registration eligible | Institution has opened and permitted first/next registration |
| Registration in progress | Student has started but not completed registration |
| Registered student | Registration has completed for the academic period |
| Continuing student | Student has prior academic history and is preparing or completing another period’s registration |
| Inactive/not registered | Student record exists, but no active registration for the selected period |
| Completed/awarded | Programme completion recorded; normal student actions are restricted |
| Withdrawn, suspended or otherwise held | Access/actions follow authorized academic and disciplinary rules |

A student record, student number or accepted offer does **not** by itself mean the person is currently registered for classes.

---

## 2. Portal-entry experience

### 2.1 First sign-in after conversion

When the student first signs in after applicant conversion, the system recognizes the transition.

Page title:

> Welcome to the student portal

The page explains:

> Your student record has been created. Complete the required steps below before you can register for your first academic period.

It shows:

- Student number
- Programme, intake, campus and mode
- Current academic period
- Registration opening date or current registration deadline
- Remaining onboarding/registration-readiness tasks
- `Go to my student home`

The user is not forced to learn a new account/password if the institution uses the same approved identity account. If a separate identity activation is required, the transition uses a secure, auditable linking flow—not an unexplained second account.

### 2.2 Continuing-student entry

A continuing student signs in directly to student home. If a new academic period is open:

> Registration for [period] is now open. Complete registration by [deadline].

If the period has not opened:

> Your next registration period opens on [date]. You can still view your current academic record and prepare any required information.

### 2.3 Entry after session expiry

If a session expires, the student returns to secure sign-in. After successful sign-in, the system returns them to their intended task only if:

- Their permission remains valid
- The academic period is still active
- The task is still available
- No sensitive operation, such as payment authorization, must be restarted

---

## 3. Student home page

The student home page is task-focused. It is not a decorative dashboard and does not bury urgent actions under charts or announcements.

It answers:

1. Am I registered for the current period?
2. What must I do next?
3. What deadline or hold affects me?
4. What academic information is available now?
5. Where do I continue a task I started?

### 3.1 Home-page order

The page displays sections in this order:

1. **Registration status and required action**
2. **Urgent tasks and deadlines**
3. **Holds and what they mean**
4. **Current period summary**
5. **Academic, finance and learning shortcuts**
6. **Recent updates**
7. **Support and help**

### 3.2 Registration-status card

Examples:

> **Not yet registered — January 2027**  
> Registration is open until 20 January 2027, 17:00 CAT.  
> Complete programme, financial and course-registration requirements.  
> `Start registration`

> **Registration in progress**  
> You have completed 2 of 5 registration steps.  
> Next: Review your financial clearance status.  
> `Continue registration`

> **Registered — January 2027**  
> You are registered for 5 courses.  
> `View timetable`  `View registered courses`

The status card must never use a vague word such as only `Active`.

### 3.3 Tasks and deadlines

Tasks are shown as cards with:

- What is needed
- Why it is needed
- Deadline
- Current owner: student or institution
- Direct action
- Consequence of no action, where policy allows

Example:

> **Select your courses — Required**  
> You need to select approved courses for Semester 1 before registration can be finalized.  
> Due: 18 January 2027, 17:00 CAT  
> `Choose courses`

Institution-owned tasks are also visible:

> **Finance is reconciling your sponsorship confirmation**  
> No action is required from you now. Last updated today at 09:20 CAT.

### 3.4 Holds

A hold is an authorized restriction that prevents a defined action. It must never appear as an unexplained red label.

Each hold displays:

- Hold name
- What it affects
- Why it exists
- Responsible office
- Required student action, if any
- Whether a review/appeal route exists
- Last updated

Example:

> **Financial-clearance hold**  
> This currently prevents final registration.  
> Finance is awaiting sponsorship confirmation.  
> `View financial clearance`

The student must not be able to see confidential disciplinary, health or counselling detail merely because a hold exists.

### 3.5 Current-period summary

Once registered, the home page provides:

- Registered programme
- Academic year/semester
- Course count
- Timetable shortcut
- Moodle synchronization status
- Financial balance/clearance summary
- Released-results shortcut
- Adviser contact, where assigned
- Open support appointments or agreed actions visible to the student

This section gives a summary; it does not replace the authoritative detail pages.

---

## 4. Navigation

The student portal uses consistent primary navigation:

- Home
- Registration
- My studies
- Timetable and learning
- Finance
- Results and academic record
- Requests and support
- Notifications
- Help
- Profile and workspace switcher

Navigation is permission and state aware.

Examples:

- `Registration` remains available during registration preparation.
- `Results` may show historical results even when the current period is not registered.
- `Timetable` clearly distinguishes “not available until registration is complete” from a technical failure.
- `Finance` does not expose staff-only reconciliation or sponsorship notes.
- A research section appears only for students with approved postgraduate/research context.

The system must not remove an important feature merely because it is temporarily blocked. It should show the feature and explain the prerequisite where doing so helps the student progress.

---

## 5. Registration-readiness experience

### 5.1 Readiness page

Selecting `Start registration` opens:

> Registration readiness

The page lists the conditions that must be met before final registration.

Typical conditions:

- Student record active
- Correct programme/intake
- Registration period open
- Required prior result/progression decision available
- Financial clearance or authorized payment arrangement
- Required programme conditions satisfied
- No blocking academic/administrative hold
- Course selection complete
- Required declaration accepted

Each item has a state:

- Ready
- Action required
- Awaiting institution
- Blocked
- Not applicable
- Complete

### 5.2 New-student readiness

For a new student, the system may show:

- Student record created
- Offer conditions met
- Official contact details confirmed
- Orientation information available
- First-registration period open
- Financial clearance status
- Initial course package ready for review

It must not assume every new student manually selects every course. Some programmes may use an institution-defined initial course package, while others require student selection. This is configured by programme and period.

### 5.3 Continuing-student readiness

For a continuing student, readiness may include:

- Prior period progression outcome
- Required repeat or prerequisite course status
- Outstanding academic decision
- Financial clearance
- Programme change/leave-of-absence return condition
- Registration opening and deadline

The system must not infer a progression outcome from raw grades alone; it uses the authorized progression decision.

---

## 6. First-registration handoff from applicant onboarding

When a converted applicant follows `Go to student portal`, the system creates one of two experiences:

| Situation | Student experience |
|---|---|
| Registration not open | Welcome page with opening date, preparation tasks and help |
| Registration open; no blocking conditions | Registration readiness with `Start registration` |
| Registration open; conditions pending | Readiness page showing exact pending conditions |
| Conversion/integration still reconciling | “Student record preparation in progress”; no false registration action |
| Applicant onboarding incomplete | Return to narrow onboarding task; student registration remains unavailable |

The portal must not show a student an empty home page after conversion. There must always be an explanation of their current academic state and next expected institutional step.

---

## 7. Profile, identity and contact changes

### 7.1 Student profile

The student profile contains:

- Official name
- Preferred name where supported
- Student number
- Programme information
- Verified contact methods
- Communication preference
- Address/contact details where the student is permitted to maintain them
- Account security settings
- Privacy/help information

The profile distinguishes personal contact changes from academic-record changes.

### 7.2 Controlled changes

| Change | Student action | System handling |
|---|---|---|
| Mobile/email change | Request secure contact change | Requires verification; updates communication record |
| Address change | Update permitted contact address | Validates and audits change |
| Preferred name | Request/update according to policy | Does not overwrite legal/official record without approval |
| Official/legal name | Submit controlled correction request with evidence | Requires authorized records review |
| Programme change | Submit separate programme-change request | Never edited as profile text |
| Student number | No self-service change | Controlled records process only |

A change to a student’s primary contact method must not silently overwrite the original applicant history; the system maintains effective dates and audit records.

---

## 8. Student notifications

The notification centre is the authoritative record.

It categorizes messages:

- Required task
- Deadline reminder
- Academic update
- Finance update
- Learning/timetable update
- Support update
- System/service update
- Security notice

Each notification includes:

- What happened
- Whether student action is required
- Deadline
- Direct secure link
- Responsible office
- Delivery status where relevant

Example:

> **Registration is now open**  
> Complete your January 2027 registration by 20 January 2027, 17:00 CAT.  
> `Start registration`

Email/SMS are delivery channels. They must be neutral and never reveal results, balance details, disciplinary information or support/counselling details.

---

## 9. Empty, blocked and recovery states

| Situation | Student-facing response |
|---|---|
| No current registration period | “There is no registration period open for your programme right now.” Show next expected period where configured |
| Registration not yet open | Show opening date, preparation tasks and support route |
| No adviser assigned | “An academic adviser has not yet been assigned.” Show responsible department route |
| Timetable not yet generated | Explain whether course selection/registration is pending or timetable publication is pending |
| Finance status unavailable | State that status could not refresh; show last confirmed status and retry/help route |
| Moodle sync delayed | Show SIS registration state separately; do not imply that Moodle delay cancels registration |
| Account role/scope issue | Explain current portal access and secure support route without exposing internal permission logic |
| Connection lost during task | Preserve safe draft; show whether changes were saved and allow retry |
| Service outage | Display service status/reference and prevent false completion messages |

---

## 10. Accessibility and low-bandwidth requirements

- Student identity, registration state and next action appear in text, not colour alone.
- Home-page priority content loads before secondary content.
- Tables convert to structured cards on narrow screens where necessary.
- All navigation, cards, holds and tasks are keyboard operable.
- Status changes and task counts are announced to screen readers.
- The portal works at high zoom and with reduced motion.
- Important registration actions remain usable on mobile browsers without installing an application.
- Slow external systems, including Moodle and payment providers, display last-confirmed status and retry options.
- Essential tasks do not depend on image-only CAPTCHAs, hover-only controls or drag-and-drop alone.

---

## 11. Architecture contract

### 11.1 Core entities

| Entity | Purpose |
|---|---|
| Student record | Official academic identity after conversion |
| Student-period status | Student state for a particular academic period |
| Registration readiness assessment | Conditions required before registration |
| Registration hold | Authorized restriction on a specified action |
| Student task | Action assigned to student or institution |
| Student profile version | Time-bound profile/contact data |
| Student portal entitlement | Access to student workspace |
| Student notification | Authoritative communication record |
| External-service status | Moodle/payment/integration freshness and state |

### 11.2 Commands

| Command | Main result |
|---|---|
| `OpenStudentPortalSession` | Resolves active student role, scope and current period |
| `GenerateRegistrationReadinessAssessment` | Evaluates current registration prerequisites |
| `CreateStudentRegistrationTask` | Creates a required/optional readiness task |
| `PublishStudentHold` | Publishes permitted hold summary and action |
| `UpdateStudentContactDetails` | Saves controlled contact/profile change |
| `RequestOfficialStudentRecordCorrection` | Opens authorized records-correction request |
| `PublishStudentNotification` | Creates in-system notice and delivery event |
| `RefreshExternalServiceStatus` | Updates Moodle/finance/service state safely |

### 11.3 Events

- `StudentPortalAccessGranted`
- `StudentPeriodStatusChanged`
- `RegistrationReadinessAssessed`
- `StudentRegistrationTaskCreated`
- `StudentHoldPublished`
- `StudentContactDetailsUpdated`
- `StudentRecordCorrectionRequested`
- `StudentNotificationPublished`
- `ExternalServiceStatusUpdated`

### 11.4 Audit requirements

The system records:

- Student/person identifier
- Active role and academic-period context
- Portal-entry and registration-readiness outcomes
- Holds and permitted applicant-visible explanations
- Profile/contact effective-date changes
- Student-task creation/completion
- Notification and delivery events
- External-service refresh time/source
- Access to sensitive profile or academic information

Internal hold rationale, counselling records, disciplinary investigation notes and staff-only financial details remain excluded from standard student views and audit extracts.

---

## 12. Part 1 acceptance tests

Part 1 is accepted when:

- A newly converted applicant can enter the student portal without being incorrectly shown as registered.
- New and continuing students receive state-appropriate home pages.
- The header always identifies current student role, academic period and registration status.
- Registration readiness explains each condition, owner and next action.
- Holds describe their effect and recovery route without exposing restricted details.
- Student profile changes are separated from academic-record changes.
- The portal distinguishes SIS registration, finance, timetable and Moodle synchronization states.
- Empty, delayed, blocked and service-failure states are actionable.
- No student is shown a blank portal after conversion.
- Mobile, keyboard, screen-reader, high-zoom, slow-network and session-recovery testing pass.
- Architecture events and audit records provide traceability for every state shown to the student.

**Please approve Role Blueprint 2, Part 1: Student identity, portal entry, first-registration readiness and the student home experience.**

After approval, I will continue with Part 2: **financial clearance, sponsorship status, payment options and registration holds from the student’s perspective.**

---

## Following user responses before the next design record

### User message 0142

Yes continue with part 2
