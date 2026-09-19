<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 7fc00f59-dd25-54d3-ac8b-0d01c822b2f2; chronological message: 189. -->

# Role Blueprint 4 — Academic Adviser  
## Part 2: Adviser outreach, course-plan and progression guidance, referral decisions, follow-up process and escalation rules

This part explains the adviser’s action after opening a student’s academic overview or reviewing an academic-support observation.

The core rule is:

> Advisers guide and support. They do not override academic regulations, change official results, diagnose wellbeing conditions or make disciplinary decisions.

---

## 1. Contacting a student

### 1.1 Starting point

From an academic observation or student overview, the adviser selects:

> `Contact student`

The system first checks:

- Student is currently assigned to the adviser.
- The observation/follow-up is still active.
- No recent identical message is awaiting response.
- Student has a verified permitted contact method.
- Adviser has not lost assignment/scope while the page was open.

If a condition fails, the action remains visible with a clear reason.

Example:

> A support invitation was sent on 15 August and the student has not responded yet. Review the existing message before sending another.

### 1.2 Message composer

The page contains:

- Reason for contact
- Course/progression context
- Communication channel
- Approved message template
- Student-visible message
- Available student response choices
- Follow-up date
- Internal adviser note, clearly separated
- `Preview as student`
- `Send support invitation`

Default message:

> I would like to help you review your current academic situation and available options. You can book an advising appointment, ask me to contact you, or request another type of support.

The adviser may personalize the message but cannot add:

- Diagnosis
- Threats
- Disciplinary warning not authorized by the correct process
- Private counselling information
- Unverified assumptions about the student

### 1.3 Student preview

Before sending, the adviser can select:

> `Preview as student`

The preview shows:

- Notification title
- Full secure-portal message
- Student response buttons
- Adviser identity
- What is visible in SMS/email
- What happens after each student response

This prevents accidental use of internal staff language in messages to students.

---

## 2. Sending and delivery status

### 2.1 Send sequence

When the adviser selects `Send support invitation`:

1. The button becomes `Sending invitation…`.
2. Duplicate clicks are blocked.
3. The system creates an adviser-outreach request.
4. The observation/follow-up updates to `Invitation queued`.
5. A follow-up task with due date is created.
6. An audit record and communication-delivery event are written.
7. The adviser sees:

> Invitation recorded and queued for delivery.

The adviser must not immediately see `Student contacted` until delivery is confirmed.

### 2.2 Delivery states

| Status | Adviser sees |
|---|---|
| Queued | Invitation recorded and queued |
| Sent | Invitation sent through [channel] |
| Delivered | Delivery confirmed, where provider supports it |
| Read in portal | Student opened the secure message, where policy permits |
| Failed | Delivery failed; choose a recovery action |
| Student responded | View student response |
| Expired/no response | Follow-up is due |

### 2.3 Delivery failure

Example:

> The invitation was recorded but could not be delivered by SMS. Nothing needs to be re-entered.

Actions:

- `Retry SMS`
- `Use verified email`
- `Create manual contact task`
- `View contact details status`

The system never marks the student as contacted because the adviser pressed Send.

---

## 3. Course-plan and progression guidance

### 3.1 Adviser guidance page

The adviser can select:

> `Review course plan and progression`

The page shows:

- Current programme and applicable curriculum version
- Current year level
- Official progression outcome
- Full-year-course outcome
- Failed/repeat half-courses
- Extended research/industrial-training activity marked `In progress`
- Prerequisite/co-requisite restrictions
- Current course plan
- Academic-load summary
- Registration deadline
- Finance-clearance effect only where it blocks registration
- Existing academic exceptions/decisions, where adviser may view them

### 3.2 Guidance outcome: progression with repeats

For a student who may progress with repeat half-courses, the adviser sees:

> **Progression outcome: Progress with repeats**  
> Required repeat courses: 2  
> New-year courses available: 4  
> Course-plan validation: 1 prerequisite issue  
>
> `Open course plan`  `Create student action`

The adviser can explain the plan and help the student select valid courses. The adviser cannot remove required repeats or override prerequisites without the authorized academic-exception workflow.

### 3.3 Guidance outcome: repeat year

For a student who must repeat:

> **Progression outcome: Repeat year required**  
> Reason: A required full-year course was not passed.  
> Required repeat-year course package: [summary]

The adviser can:

- Explain the official outcome
- Help the student understand the repeat package
- Create an appointment/follow-up task
- Refer the student to programme/department authority
- Request academic review only through the approved process

The adviser cannot manually enrol the student in next-year courses.

### 3.4 Extended activity course

For a research or industrial-training activity that started in Year 3 and is completed in Year 4:

> **Industrial Training — In progress**  
> This activity is not a failed course.  
> Next milestone: Submit supervisor evaluation by [date].

The adviser sees milestone status and can offer support. They cannot record the final result unless separately assigned as assessor/supervisor.

### 3.5 Rule uncertainty

When policy configuration cannot determine an outcome—for example, exactly three failed half-courses before the policy rule is set—the adviser sees:

> **Academic progression decision required**  
> The system cannot apply a final progression outcome until the authorized academic rule or decision is recorded.

The adviser must not tell the student they have progressed or must repeat until the authorized outcome is available.

---

## 4. Creating academic-support actions

### 4.1 Student-visible action

From an appointment or academic overview, the adviser may create an action for the student.

Examples:

- Review repeat-course registration
- Book an academic-skills session
- Attend a tutorial
- Submit a permitted assessment-support request
- Contact Finance about a registration hold
- Upload required evidence
- Book a further advising appointment

Each action includes:

- Clear title
- Plain-language explanation
- Owner: student, adviser or another office
- Due date
- Secure action link
- Status
- What happens when it is completed

Example:

> **Review your repeat-course plan**  
> Confirm your required repeat courses before 20 January 2027.  
> Owner: You  
> `Open course plan`

### 4.2 Adviser-owned action

An adviser may create their own follow-up action:

> Contact student if no appointment is booked by 18 January 2027.

The student cannot see private staff task wording unless the adviser deliberately creates a student-visible action.

### 4.3 Completion

A student may mark a student-confirmable action complete. The adviser sees:

> Student marked this action complete on 17 January 2027.  
> `Review completion`

Actions requiring official verification remain:

> Awaiting adviser/office confirmation.

---

## 5. Referral decisions

### 5.1 Adviser choice

The adviser selects:

> `Offer another support service`

They choose a service based on the student’s stated need or relevant academic situation:

- Academic-skills support
- Programme coordinator/department support
- Finance guidance
- Disability-support guidance
- Accommodation/residence support
- Career support
- Counselling support
- Other approved service

The adviser does not select a counselling referral as the automatic response to poor grades, missed assignments or a finance issue.

### 5.2 Referral offer

The adviser writes a student-visible explanation:

> This service may help you review your options. You may accept, decline or ask for more information.

The student sees:

- Service name
- Why it is being offered
- What minimum information will be shared
- Who receives the request if accepted
- Whether the service is optional
- Appointment/request route

### 5.3 Counselling referral boundary

For ordinary counselling support:

1. Adviser offers the referral.
2. Student accepts or self-refers.
3. Counselling Centre receives required minimum context.
4. Adviser sees only service status, if permitted.
5. Counselling notes remain private.

The adviser cannot read:

- Counselling-session notes
- Diagnosis
- Personal disclosure
- Clinical risk assessment
- Counsellor-only follow-up

---

## 6. Follow-up process

### 6.1 Required fields

Every active adviser follow-up has:

- Student
- Adviser owner
- Reason
- Current status
- Next action
- Due date
- Contact history
- Student response
- Escalation route
- Closure reason

No follow-up may remain indefinitely as only `Open`.

### 6.2 Follow-up statuses

| Status | Meaning |
|---|---|
| New | Adviser has not reviewed it yet |
| Under review | Adviser is checking academic context |
| Invitation queued | Contact request recorded; delivery pending |
| Awaiting student response | Invitation delivered; student action awaited |
| Appointment requested | Student requested an appointment |
| Appointment booked | Meeting is scheduled |
| Adviser action required | Adviser has a defined next action |
| Referred to service | Student accepted/was routed to approved service |
| Monitoring | Adviser will recheck on defined date |
| Resolved | Academic-support purpose completed |
| Closed without contact | Follow-up closed under approved reason |
| Dismissed as inaccurate | Underlying observation found incorrect/not actionable |

### 6.3 Monitoring

Monitoring is used only when there is a defined reason and review date.

The adviser selects:

- What will be rechecked
- Review date
- Responsible person
- Possible next action

Example:

> Monitor Moodle submission status until 20 August 2027. If another required assessment is not submitted, review again.

Monitoring does not mean indefinite passive surveillance.

---

## 7. Escalation rules

### 7.1 Overdue adviser action

If an adviser follow-up passes its due date:

1. Adviser receives an in-system reminder.
2. The adviser’s supervisor/programme coordinator sees an overdue work item.
3. Escalation occurs according to configured academic-service rule.
4. Individual student details are shown only to roles permitted to manage that case.

### 7.2 Escalation to academic authority

An adviser may escalate a case to a programme coordinator, Head of Department or authorized academic board when:

- Progression rule requires formal decision
- Course-plan exception is requested
- Prerequisite/credit issue cannot be resolved
- Repeat-year package needs authority
- Student requests review of academic decision
- Required academic action is beyond adviser authority

The escalation includes:

- Student-safe summary
- Relevant academic evidence
- Adviser action taken
- Requested decision
- Deadline
- Supporting documents, if relevant

### 7.3 Safeguarding escalation

If an adviser encounters an immediate safety concern, the system directs them to the approved urgent safeguarding/emergency process. It does not treat an ordinary advising note as an emergency case.

The exact emergency contacts, roles and response rules are configuration controlled and audited.

---

## 8. Closure

Before closing a follow-up, the adviser selects a reason:

- Student received academic guidance
- Course-plan issue resolved
- Student completed agreed action
- Referred service accepted responsibility
- Student declined optional support
- Student no longer assigned/applicable
- Duplicate case merged
- Observation inaccurate
- Other authorized reason

The system checks that any required next action is either complete, transferred to an authorized service or deliberately retained as another active task.

The student sees a respectful closure message where appropriate:

> This academic-support follow-up is complete. You can request further support at any time.

---

## 9. Failure and recovery catalogue

| Situation | Adviser experience | System behaviour |
|---|---|---|
| No verified student contact | Create contact-update or approved manual-contact task | Do not send message |
| Duplicate invitation | Show prior outreach and status | Suppress duplicate delivery |
| Student contact changes during message drafting | Require refresh/verify before send | Prevent message to obsolete contact |
| Course plan changes after advice | Show new version and request review | Preserve prior advice history |
| Progression rule not configured | Show decision-required state | Block final adviser recommendation |
| Finance clearance blocks registration | Show minimal effect and Finance route | Do not expose balance |
| Student declines support | Record choice respectfully | No disciplinary record |
| Referral capacity unavailable | Offer next available/support route | Keep request active |
| Adviser action overdue | Remind/escalate under configured rule | Keep audit trail |
| Adviser assignment ends | Transfer active follow-ups or close under rule | Remove access safely |

---

## 10. Architecture contract

### 10.1 Core entities

| Entity | Purpose |
|---|---|
| Adviser outreach | A controlled invitation/contact attempt |
| Delivery attempt | Channel-specific send/delivery record |
| Advising follow-up | Managed academic-support case |
| Student-visible academic action | Action agreed with/assigned to student |
| Adviser-owned task | Internal adviser responsibility |
| Course-plan guidance record | Advising context linked to official plan/progression |
| Referral offer | Adviser offer of another support service |
| Escalation request | Request to academic authority/safeguarding route |
| Follow-up closure | Authorized end state and reason |

### 10.2 Commands

| Command | Main result |
|---|---|
| `RequestStudentSupportOutreach` | Creates idempotent adviser invitation |
| `RecordOutreachDeliveryStatus` | Updates queued/sent/delivered/failed state |
| `CreateStudentVisibleAcademicAction` | Creates student task |
| `CreateAdviserFollowUpTask` | Creates adviser-owned next action |
| `OfferStudentServiceReferral` | Sends student-aware service offer |
| `SetAdviserFollowUpMonitoring` | Records defined monitoring plan |
| `EscalateAcademicAdvisingCase` | Routes case to authorized academic authority |
| `CloseAdviserFollowUp` | Records controlled closure outcome |
| `TransferAdviserFollowUp` | Moves active case under authorized handover |

### 10.3 Events

- `StudentSupportOutreachRequested`
- `StudentSupportOutreachDelivered`
- `StudentSupportOutreachFailed`
- `StudentVisibleAcademicActionCreated`
- `AdviserFollowUpTaskCreated`
- `StudentServiceReferralOffered`
- `AdviserFollowUpMonitoringSet`
- `AcademicAdvisingCaseEscalated`
- `AdviserFollowUpClosed`
- `AdviserFollowUpTransferred`

### 10.4 Audit requirements

Record:

- Adviser identity, role, assignment/scope
- Student and source observation
- Final student-visible message/template/version
- Delivery channel/outcome
- Follow-up reason, owner, due date and status changes
- Student response and agreed actions
- Referral service/minimum necessary context
- Escalation authority and decision
- Closure/transfer reason
- Attempts to act outside adviser authority

---

## 11. Part 2 acceptance tests

Part 2 is accepted when:

- Advisers can contact only currently assigned students through controlled, non-duplicated outreach.
- Student messages are previewable, respectful and separate from internal adviser notes.
- Delivery status never falsely states that a student was contacted.
- Advisers can explain officially calculated progression/course-plan outcomes without changing them.
- Unconfigured or ambiguous academic rules lead to decision-required status, not guesswork.
- Student-visible actions clearly state owner, deadline and next step.
- Counselling is offered through a privacy-aware acceptance/referral route.
- Advisers do not see confidential counselling, discipline or unnecessary finance information.
- Every follow-up has an owner, due date, status and closure reason.
- Overdue academic work escalates through configured authority without exposing data broadly.
- Keyboard, screen-reader, mobile, low-bandwidth, duplicate-message and referral-capacity tests pass.

**Please approve Role Blueprint 4, Part 2: Adviser outreach, course-plan and progression guidance, referral decisions, follow-up process and escalation rules.**

After approval, I will continue with Part 3: **advising notes, academic exceptions, case handover, adviser workload management and historical access.**

---

## Following user responses before the next design record

### User message 0190

continue with Part 3: **advising notes, academic exceptions, case handover, adviser workload management and historical access**
