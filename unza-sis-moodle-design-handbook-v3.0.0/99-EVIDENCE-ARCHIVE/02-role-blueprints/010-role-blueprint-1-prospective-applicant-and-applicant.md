<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 674239ae-7743-5191-b011-795185c9adbb; chronological message: 135. -->

# Role Blueprint 1 — Prospective Applicant and Applicant  
## Part 9: Application status tracking, clarification requests, controlled post-submission corrections, decision viewing and applicant support

This part begins immediately after formal submission. The applicant no longer edits an ordinary draft; they track a controlled case with clear status, tasks and secure communication.

The governing principle is:

> A submitted application remains authoritative. Any later change is a controlled, scoped and auditable response—not a return to unrestricted draft editing.

---

## 1. Post-submission application home

Selecting `View application` opens an application status page.

Page title:

> Application APP-2027-001842

The top summary always displays:

- Selected programme(s) and intake
- Current status
- Plain-language explanation
- Whether applicant action is required
- Current/next deadline
- Last updated time
- Responsible office or service route
- Application submission receipt link

Example:

> **Under review**  
> Admissions is assessing your submitted application and supporting documents.  
> **No action is required from you now.**  
> Last updated: 4 September 2026, 10:16 CAT  
> Responsible office: Admissions

The applicant must never see only `Pending`, `Processing` or an internal status code.

---

## 2. Applicant-facing status model

| Internal state | Applicant-facing status | Required explanation |
|---|---|---|
| `Submitted` | Application received | Submission date/time, what happens next and whether an initial check is pending |
| `InitialChecks` | Initial checks in progress | What is being checked, whether applicant action is needed |
| `ClarificationRequired` | Action needed: provide information | Exact request, reason, deadline and secure response action |
| `AwaitingApplicantResponse` | Waiting for your response | Same request, remaining time and consequence of no response where policy permits |
| `ClarificationReceived` | Information received | Receipt time and next review step |
| `UnderAssessment` | Under review | Review stage, last update and no-action/required-action statement |
| `ExternalVerificationPending` | Verification in progress | External dependency, last update and whether application assessment can continue |
| `DecisionApproved` | Decision being prepared | Only where this internal state may safely be exposed; no premature offer promise |
| `Offered` | Admission offer available | Offer deadline and `View offer` action |
| `NotOffered` | Admission decision available | Allowed explanation, next options and support route |
| `Waitlisted` | Waiting-list decision | Position is not shown unless policy permits; expected review point and next steps |
| `Withdrawn` | Application withdrawn | Withdrawal time, reason category where appropriate and payment-review route |
| `Closed` | Application closed | Closure reason, final date and permitted further action |

Public wording is configured and approved by Admissions/Registrar. Developers must not expose staff workflow steps that could mislead applicants or compromise assessment integrity.

---

## 3. Status timeline

The status page includes a chronological timeline. Each event contains:

- Date/time in CAT
- Plain-language title
- Explanation
- Required action, if any
- Relevant document/payment/task link
- Responsible office, where appropriate

Example:

> **4 September 2026, 10:16 CAT — Under review**  
> Admissions has started assessing your application and supporting evidence. No action is required now.

The timeline distinguishes:

- **Applicant-visible events**: submission received, clarification request, document replacement request, payment confirmation, decision available.
- **Staff-only events**: internal assignment, verification notes, fraud flags, internal recommendations, quality-control steps.

Applicant-visible timelines must not expose staff names unless their role in applicant communication is approved.

---

## 4. Clarification requests

### 4.1 Purpose

An authorized staff member may request clarification when the submitted application lacks required, readable, consistent or sufficiently supported information.

A clarification request is not an invitation for an applicant to rewrite their entire application.

### 4.2 Request card

An open request appears at the top of the application status page:

> **Action needed by 10 October 2026, 17:00 CAT**  
> Provide a complete Grade 12 result statement. The document you submitted does not include all required pages.  
>
> `Respond to request`

It shows:

- Request reference
- Exact item(s) required
- Plain-language reason
- Deadline
- Whether the response is mandatory
- Consequence of no response where approved
- Allowed response types: explanation, corrected field, replacement document, both
- Responsible office/help route
- Previous communication related to the request

### 4.3 Scoped response workspace

Selecting `Respond to request` opens a limited task workspace. Only permitted sections are editable.

Example:

> **Provide a complete Grade 12 result statement**  
> You may upload a replacement document and add an explanation. Other submitted application details cannot be changed from this page.

Available actions may include:

- `Upload replacement document`
- `Correct requested qualification field`
- `Add explanation`
- `Ask a question`
- `Submit response`

The page does not show an unrestricted `Edit application` button.

### 4.4 Clarification response

Before submission, the applicant reviews the response:

- Requested item
- New/replacement evidence
- Field corrections, with old and new values
- Applicant explanation
- Declaration that the response is accurate
- Response deadline

Selecting `Submit response`:

1. Locks the response version.
2. Records old/new values.
3. Updates request status to `Clarification received`.
4. Adds event/audit records.
5. Routes the response to the authorized work queue.
6. Returns a response receipt.

Confirmation:

> Your response has been received. Admissions will review it and update your application status.

### 4.5 Request expiry

When a clarification deadline approaches, the applicant receives an in-system reminder and neutral email/SMS notice.

If the deadline passes:

> The response deadline has passed. Your application is awaiting an Admissions decision under the applicable rule.

The system does not automatically fabricate a rejection. It follows the configured policy: extension, closure, assessment using available evidence or authorized staff decision.

---

## 5. Controlled post-submission corrections

### 5.1 Applicant-initiated correction request

An applicant may discover an error after submission. They select:

> `Request a correction`

The form first asks what needs correction:

- Personal/contact information
- Qualification/result information
- Programme choice
- Uploaded document
- Other approved category

The system then evaluates whether self-service correction is allowed for that category and stage.

### 5.2 Correction policy outcomes

| Situation | Applicant experience |
|---|---|
| Correction allowed before assessment begins | Opens a narrow, controlled correction task |
| Correction requires Admissions approval | Creates request; applicant cannot directly overwrite submitted data |
| Change affects programme rules/fee/deadline | Explains impact; routes to authorized review |
| Change is not permitted after submission | Explains rule and offers support/appeal route where applicable |
| Applicant only needs to replace a document | Routes to document-replacement task |
| Existing clarification already covers issue | Directs applicant to that open task instead of creating duplicate work |

### 5.3 Correction request

The applicant provides:

- Correction category
- Current submitted value, displayed securely
- Proposed correction
- Reason
- Supporting evidence where required
- Confirmation

The system shows:

> Your requested correction will be reviewed. Your submitted application remains unchanged until an authorized officer approves the request.

### 5.4 Approved correction

When an officer approves a correction:

- The original submitted snapshot remains immutable.
- A controlled amendment version is created.
- The old and new value, authority, reason and effective date are recorded.
- Any affected requirements are recalculated.
- The applicant sees an update in the timeline.

Example:

> Your contact-details correction was approved on 8 October 2026. The updated mobile number is now used for application communication.

### 5.5 Declined correction

Where policy permits an explanation:

> Your requested programme-choice correction could not be approved because programme choices were locked after the published deadline.

The system shows the relevant policy/help route and does not expose restricted internal notes.

---

## 6. Decision viewing

### 6.1 Decision notification

When an authorized decision is released, the applicant receives:

> An admission decision is available for your application. Sign in to view it securely.

Email/SMS does not state whether the decision is an offer or non-offer.

### 6.2 Decision page

The page title is:

> Admission decision

It shows:

- Application reference
- Programme/intake
- Decision date
- Decision outcome
- Authorized decision message
- Applicable conditions or next steps
- Contact/help route
- Decision document, where policy provides one
- Review/appeal option, only when permitted

The decision page must be deliberately opened by the authenticated applicant; it is not displayed in a notification preview.

### 6.3 Offer available

If the decision is an offer, the page shows:

> **You have received an admission offer**  
> Review the offer conditions and respond by [deadline].  
>
> `View offer`

Acceptance/decline and onboarding are specified in Part 10.

### 6.4 Not offered

If an applicant is not offered a place, the system presents respectful, factual wording.

Example:

> **Admission decision**  
> We are unable to offer you a place in BSc Computer Science for the January 2027 intake.

It then provides only policy-approved information, such as:

- Decision reason category or explanation
- Whether another programme choice remains under consideration
- Whether an appeal/review route exists
- Relevant future intake information
- Admissions contact route

It must not expose comparative rankings, other applicants’ data, confidential assessor notes or an invented explanation.

### 6.5 Waitlist

If waitlisting is authorized:

> **Your application is on the waiting list**  
> This means a final place is not currently available. We will update you by [review date] or earlier if a place becomes available.

The system does not promise admission or expose ranking unless policy explicitly permits it.

---

## 7. Applicant support and secure communication

### 7.1 Contextual help

Every status, clarification and decision page contains:

- `Get help with this application`
- Responsible office contact details
- Contextual guidance
- Support-ticket route
- Application reference prefilled
- Service hours and expected response period where configured

The applicant does not need to repeatedly explain which application they are asking about.

### 7.2 Support-ticket creation

A ticket begins with a category:

- Technical access problem
- Application form question
- Document upload issue
- Payment issue
- Clarification request question
- Decision question
- Other approved topic

The applicant writes a message and may attach files only where policy permits. Attachments use the Part 6 safety process.

The ticket shows:

- Ticket reference
- Current status
- Assigned office/team, not necessarily individual staff name
- Messages and timestamps
- Next expected response time
- Secure applicant reply action

Sensitive information must not be requested through ordinary email. Staff must direct the applicant back into the secure portal when evidence or identity data is needed.

### 7.3 Message versus task

The interface distinguishes:

- **Message:** information only; no applicant action needed.
- **Task:** a required or optional action with deadline and completion state.

A clarification request is a task. A payment-confirmation notice is normally a message.

---

## 8. Withdrawal

### 8.1 Applicant withdrawal request

Before a final decision or at permitted stages, the applicant may select:

> `Request to withdraw application`

The confirmation page displays:

- Application/programme/intake
- Current application stage
- Impact on pending decision
- Payment policy note
- Whether a refund request is separate
- Optional reason category
- `Keep application`
- `Submit withdrawal request`

The applicant cannot assume withdrawal automatically produces a refund.

### 8.2 Result

Where self-service withdrawal is permitted, the system creates a withdrawal state and receipt. Otherwise it creates a review request.

Applicant confirmation:

> Your withdrawal request has been received. We will update this page when Admissions confirms the outcome.

The application, payment and document records remain subject to retention policy.

---

## 9. Notifications, reminders and escalation

Notifications are created for:

- Clarification or correction request issued
- Deadline approaching
- Applicant response received
- Document replacement required
- Payment/waiver status affecting assessment
- Decision released
- Offer response deadline approaching
- Support-ticket response
- Withdrawal outcome

Required-action reminders must:

- Link to the exact secure task
- State deadline in CAT
- Avoid sensitive details in email/SMS
- Suppress duplicates
- Escalate within the responsible office when service deadlines are missed

Applicants can adjust optional communication preferences, but cannot disable mandatory decision, deadline or security notices.

---

## 10. Architecture contract

### 10.1 Core entities

| Entity | Purpose |
|---|---|
| Application status event | Applicant-visible and staff-visible lifecycle event |
| Clarification request | Scoped request for post-submission information |
| Clarification response | Immutable applicant response to a request |
| Correction request | Applicant-initiated change request |
| Application amendment | Authorized post-submission correction version |
| Admission decision | Authorized decision and applicant-visible message |
| Support ticket | Secure applicant-assistance case |
| Withdrawal request | Controlled request to end an active application |
| Applicant notification | Authoritative in-system communication record |

### 10.2 Commands

| Command | Main result |
|---|---|
| `PublishApplicantStatusUpdate` | Adds approved applicant-visible status event |
| `RequestApplicationClarification` | Creates scoped applicant task |
| `SubmitClarificationResponse` | Submits response/evidence to an open request |
| `RequestApplicationCorrection` | Opens permitted correction request |
| `ApproveApplicationAmendment` | Creates audited post-submission amendment |
| `DeclineApplicationAmendment` | Records authorized non-approval |
| `ReleaseAdmissionDecision` | Makes authorized decision visible to applicant |
| `CreateApplicantSupportTicket` | Opens secure support case |
| `RequestApplicationWithdrawal` | Starts controlled withdrawal process |

### 10.3 Events

- `ApplicantStatusPublished`
- `ApplicationClarificationRequested`
- `ApplicationClarificationResponseSubmitted`
- `ApplicationCorrectionRequested`
- `ApplicationAmendmentApproved`
- `ApplicationAmendmentDeclined`
- `AdmissionDecisionReleased`
- `ApplicantSupportTicketCreated`
- `ApplicationWithdrawalRequested`
- `ApplicationWithdrawalConfirmed`

### 10.4 Audit requirements

The system records:

- Application/person identifiers
- Status transition and applicant-visible wording version
- Request/correction scope and deadline
- Old/new values for approved amendment
- Acting staff role, organizational scope and authority
- Applicant response receipt/version
- Decision release authority/date
- Support-ticket access and attachment events
- Withdrawal request/outcome
- Notification delivery events

Internal notes, fraud indicators, external-verification secrets and confidential assessor comments remain separate from applicant-visible records.

---

## 11. Part 9 acceptance tests

Part 9 is accepted when:

- Every applicant status explains current state, next step, responsibility and last update.
- Applicants cannot see staff-only notes, rankings, security signals or unrelated workflow information.
- Clarification tasks are scoped; they never reopen the full submitted application.
- Every clarification response has a receipt and audit trail.
- Applicant-initiated corrections require controlled approval where appropriate.
- Original submitted data remains preserved after any authorized amendment.
- Decision notifications reveal no outcome until the applicant signs in securely.
- Offer, waitlist and non-offer screens use accurate, respectful, policy-controlled wording.
- Support tickets remain connected to the correct application and protect sensitive information.
- Payment refunds remain separate from an application withdrawal request.
- Deadlines, expiries and reminders use authoritative server time and avoid duplicate notices.
- Keyboard, mobile, screen-reader, low-bandwidth, correction-conflict and decision-release tests pass.

**Please approve Part 9: Application status tracking, clarification requests, controlled post-submission corrections, decision viewing and applicant support.** After approval, I will proceed to Part 10: **offer acceptance, conditions, onboarding handoff and conversion to a student record.**

---

## Following user responses before the next design record

### User message 0136

Proceed to 10
