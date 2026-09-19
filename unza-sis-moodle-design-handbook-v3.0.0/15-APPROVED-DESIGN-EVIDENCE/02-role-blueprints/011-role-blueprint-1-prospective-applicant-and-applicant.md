<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 8365a7ae-4672-58ae-aa2e-66f331f9eb88; chronological message: 138. -->

# Role Blueprint 1 — Prospective Applicant and Applicant  
## Part 10: Offer acceptance, conditions, onboarding handoff and conversion to a student record

This is the final part of Role Blueprint 1.

It defines how an admitted applicant reviews and responds to an offer, completes required onboarding conditions, and is converted into a student record without prematurely granting student status, registration, finance clearance or learning-system access.

The key rule is:

> **Offer made** ≠ **offer accepted** ≠ **onboarding complete** ≠ **student record created** ≠ **registered student**

---

## 1. Offer availability

When an authorized admissions decision creates an offer, the applicant sees an in-portal task:

> **Action needed: respond to your admission offer**  
> Respond by 15 December 2026, 17:00 CAT.  
> `View offer`

Email/SMS notification remains neutral:

> There is an important update about your application. Sign in to view it securely.

It must not disclose the offer outcome in a lock-screen preview or unprotected email subject.

---

## 2. Offer page

### 2.1 Offer summary

The offer page title is:

> Admission offer

It shows:

- Applicant name
- Offer reference
- Programme and award
- Intake
- Campus and study mode
- Offer date
- Acceptance deadline
- Conditions, if any
- Required onboarding actions
- Official offer letter, where issued
- Admissions contact route

Example:

> **Bachelor of Science in Computer Science**  
> January 2027 intake · Full-time · Main Campus  
> Respond by 15 December 2026, 17:00 CAT  
>  
> Your offer is conditional on final verification of your Grade 12 result statement.

The page does not claim that a student is registered or guaranteed a timetable, accommodation, funding or Moodle access.

### 2.2 Offer-letter access

The applicant can securely view or download the approved offer letter.

The letter includes only authorized content:

- Offer reference
- Programme/intake/mode/campus
- Offer conditions
- Acceptance deadline
- Required next steps
- Approved institutional contacts
- Authenticity/verification reference

It does not expose internal admissions deliberations, rankings, staff notes or unrelated applicant data.

---

## 3. Offer conditions

### 3.1 Condition types

Each condition is explicit, versioned and linked to an authority. Examples include:

- Final qualification verification
- Submission of outstanding document
- Original/certified evidence check
- Programme-specific requirement
- Fee/payment condition where policy permits
- Sponsorship confirmation
- Immigration/residency requirement
- Medical, professional or placement requirement where legitimately required

The system must not use an unexplained generic status such as `Conditional`.

### 3.2 Condition card

Each condition shows:

- What is required
- Why it is required
- Who is responsible: applicant, Admissions, Finance or another office
- Deadline
- Current status
- Available action
- Whether acceptance can occur before the condition is completed

Example:

> **Provide original certificate for verification**  
> Required before your student record can be finalized.  
> Responsible: You  
> Deadline: 10 January 2027, 17:00 CAT  
> Status: Action required  
> `View instructions`

### 3.3 Condition outcomes

| State | Applicant-facing wording |
|---|---|
| Not yet due | Requirement will be available on [date] |
| Action required | You need to complete this condition |
| Evidence received | We received your evidence; verification is pending |
| Awaiting external confirmation | Verification is in progress; no action required now |
| Met | This condition is complete |
| Not met | This condition has not been met; review next steps |
| Waived | This condition is not required under an authorized decision |
| Expired | The deadline passed; contact Admissions or follow the stated rule |

No automated system may revoke an offer merely because a condition becomes complex. Any adverse consequence follows an authorized policy and staff decision.

---

## 4. Accepting an offer

### 4.1 Acceptance page

Selecting `Accept offer` opens a final acknowledgement page:

> **Accept this admission offer?**  
> You are accepting an offer for:  
> BSc Computer Science · January 2027  
>
> You will then complete required onboarding actions. Acceptance does not yet mean you are registered for classes.

The applicant must review:

- Programme/intake/mode/campus
- Conditions
- Offer deadline
- Onboarding requirements
- Any approved fee or sponsorship obligations
- Consequence of missing a condition/deadline where policy permits

Required acceptance declarations may include:

- The applicant understands the offer terms and conditions.
- The applicant accepts the offered programme/intake.
- Information provided remains accurate to their knowledge.
- The applicant understands that registration is a separate later process.

### 4.2 Acceptance sequence

When the applicant selects `Accept offer`:

1. The button becomes `Recording acceptance…`.
2. Duplicate clicks are prevented.
3. The system checks offer ownership, validity, deadline and current state.
4. Required offer declarations are validated.
5. Acceptance is recorded as an immutable response.
6. The offer becomes `Accepted`.
7. Onboarding tasks are created.
8. Applicant status becomes `Offer accepted; onboarding required`.
9. Audit and reliable notification events are written.
10. A confirmation receipt is displayed.

Confirmation:

> **Offer accepted**  
> Your next step is to complete onboarding requirements by 10 January 2027.  
> `View onboarding tasks`

### 4.3 Deadline and expired offer

If the applicant tries to accept after expiry:

> This offer expired at 17:00 CAT on 15 December 2026. Contact Admissions only if the published policy permits a late-response review.

The system never silently extend an offer. An extension requires an authorized staff action and audit record.

---

## 5. Declining an offer

### 5.1 Decline flow

Selecting `Decline offer` shows:

> **Decline this admission offer?**  
> You will not be enrolled in BSc Computer Science for the January 2027 intake through this offer.

The applicant may optionally select a reason, such as:

- Accepted another institution/place
- Financial reasons
- Programme choice changed
- Unable to attend
- Other
- Prefer not to say

The reason is optional unless institutional policy explicitly requires it.

### 5.2 Confirmation

> Your offer has been declined. If you change your mind, contact Admissions only if the applicable offer policy permits reconsideration.

The system records a final response, preserves offer history and releases capacity only through the authorized admissions workflow.

---

## 6. Onboarding workspace

### 6.1 Purpose

After offer acceptance, the applicant stays in a dedicated **Onboarding workspace**. They should not be dropped into a generic student portal with unclear status.

Header:

> Accepted applicant onboarding · January 2027

Home page answers:

1. What must I complete before becoming a student?
2. Which condition is blocking my record?
3. What has been completed?
4. When can I register?

### 6.2 Onboarding tasks

Tasks are configuration-driven and may include:

- Confirm final contact details
- Provide/verify remaining evidence
- Complete required declarations
- Confirm sponsorship route
- Meet a programme-specific condition
- Receive official student number
- Review orientation information
- Proceed to first registration when the academic period opens

Each task shows:

- Required/optional status
- Owner
- Deadline
- Status
- Explanation
- Action
- Help route

Example:

> **Confirm your preferred contact details — Required**  
> Used for official registration and academic communication.  
> Status: Ready to complete  
> `Review contact details`

### 6.3 Tasks owned by the institution

Some tasks depend on staff or external services. The applicant sees clear wording:

> **Verify Grade 12 result statement**  
> Responsible: Admissions  
> Status: Verification in progress  
> No action is required from you now.

The system must not make applicants chase staff tasks without explaining what is happening.

### 6.4 Completion display

The onboarding home shows:

> 3 of 5 required onboarding tasks complete

It distinguishes:

- Applicant action required
- Institution action pending
- Completed
- Blocked
- Not applicable

A generic `Onboarding pending` status is not sufficient.

---

## 7. Conversion to student record

### 7.1 Preconditions

Conversion occurs only when the configured conditions are satisfied:

- Offer is accepted and not withdrawn/expired.
- Required offer conditions are met or formally waived.
- Required onboarding tasks are complete.
- Identity/contact requirements are at the approved status.
- Programme/intake remains valid for conversion.
- No authorized hold prevents record creation.
- Conversion authority/rules permit creation.

The system does not create a student record merely because an offer was issued or accepted.

### 7.2 Conversion command

An authorized workflow executes:

> `ConvertApplicantToStudent`

It creates or links:

- Canonical person record
- Student record
- Student number
- Programme admission/enrolment intent record
- Cohort/intake association
- Student portal entitlement
- Initial registration eligibility/task
- Audit and integration events

The conversion process must search for and link possible existing student/person records using controlled matching. It must not blindly create duplicates because an applicant used a different email or spelling variation.

### 7.3 Applicant-facing confirmation

After conversion:

> **Your student record is ready**  
> Student number: [student number]  
> Programme: BSc Computer Science · January 2027  
>
> Your next step is registration. Registration opens on [date].  
> `Go to student portal`

The applicant’s former application remains available as a read-only historical record.

### 7.4 Handoff boundary

The Student Blueprint begins at:

> **New student preparing for first registration**

It will define registration, billing, course selection, timetable, Moodle access and ongoing student services.

The applicant blueprint does not authorize any of those actions before the student record and registration rules permit them.

---

## 8. Failure and recovery catalogue

| Situation | Applicant-facing behaviour | System behaviour |
|---|---|---|
| Offer deadline approaching | Reminder with exact deadline and secure offer link | Suppress duplicates; log delivery |
| Offer expires | Explain expiry and approved late-response route | Lock acceptance unless extension is authorized |
| Applicant accepts on two devices | One acceptance recorded; second receives final status | Idempotent response handling |
| Offer withdrawn before acceptance | Explain authorized withdrawal and contact/appeal route where applicable | Prevent acceptance; preserve audit trail |
| Condition needs replacement evidence | Scoped task; document workflow from Part 6 | Do not reopen all application sections |
| Staff-owned verification delayed | Show status, last update and help route | Escalate under service rules |
| Applicant declines by mistake | Show clear confirmation before final decline | Policy-controlled reconsideration only |
| Conversion detects a likely existing student/person record | Applicant sees `Record preparation in progress` | Route to controlled identity-resolution queue |
| Student number creation/integration fails | Keep accepted-onboarding state; do not claim conversion | Create operational work item and reconcile |
| Registration not yet open | Show opening date and preparation tasks | Do not expose unavailable registration actions |

---

## 9. Notifications and communications

Notifications are created for:

- Offer released
- Offer deadline approaching
- Offer accepted or declined
- Condition/task created or updated
- Onboarding completion blocked
- Student record created
- Registration period opened, where configured

Mandatory messages cannot be disabled. Email/SMS remain neutral:

> There is an update about your admission onboarding. Sign in to view it securely.

No message contains full student number, condition evidence, identity numbers or decision-sensitive details unless delivered through the authenticated portal.

---

## 10. Architecture contract

### 10.1 Core entities

| Entity | Purpose |
|---|---|
| Admission offer | Authorized admission proposal with terms/expiry |
| Offer condition | Versioned requirement attached to an offer |
| Offer response | Immutable applicant acceptance or decline |
| Onboarding case | Accepted applicant’s controlled transition record |
| Onboarding task | Applicant- or institution-owned onboarding action |
| Applicant-to-student conversion record | Traceable transformation/linking record |
| Student record | Official academic identity created after conversion |
| Registration eligibility | Controlled handoff to first registration |

### 10.2 Commands

| Command | Main result |
|---|---|
| `ReleaseAdmissionOffer` | Publishes authorized offer to applicant |
| `AcceptAdmissionOffer` | Records valid acceptance and starts onboarding |
| `DeclineAdmissionOffer` | Records valid decline |
| `ExtendAdmissionOffer` | Records authorized extension |
| `UpdateOfferConditionStatus` | Records condition completion/waiver/failure |
| `CreateOnboardingTask` | Adds a configured onboarding action |
| `CompleteOnboardingTask` | Records applicant/institution completion |
| `ConvertApplicantToStudent` | Creates/links student record and entitlement |
| `CreateInitialRegistrationEligibility` | Opens future registration handoff |

### 10.3 Events

- `AdmissionOfferReleased`
- `AdmissionOfferAccepted`
- `AdmissionOfferDeclined`
- `AdmissionOfferExtended`
- `OfferConditionStatusChanged`
- `ApplicantOnboardingStarted`
- `OnboardingTaskCompleted`
- `ApplicantConversionRequested`
- `ApplicantConvertedToStudent`
- `InitialRegistrationEligibilityCreated`

### 10.4 Audit requirements

Record:

- Offer/condition version, terms and expiry
- Applicant response and declarations
- Exact response time and active session context
- Extension/withdrawal authority and reason
- Onboarding task owner, status and evidence link
- Conversion matching decision and authorized actor
- New student record/student number
- Integration outcomes and reconciliation actions
- Registration-handoff state

The original applicant account, submitted application snapshot and offer history remain preserved under retention policy.

---

## 11. Part 10 acceptance tests

Part 10 is accepted when:

- Applicants can securely view a clear, complete offer before responding.
- Offer acceptance, offer conditions, onboarding, student conversion and registration are distinct states.
- Applicants cannot accept expired, withdrawn, already answered or unauthorized offers.
- Acceptance/decline is idempotent and auditable.
- Every offer condition identifies owner, deadline, status and next action.
- Institution-owned onboarding tasks are visible without exposing internal notes.
- No student record is created before all configured conversion conditions are met or formally waived.
- Conversion prevents duplicate person/student records through controlled matching and review.
- Applicants receive a student number and student-portal handoff only after successful conversion.
- Applicant historical records remain read-only after conversion.
- Offer expiry, condition delay, duplicate response, conversion failure and registration-not-open states have clear recovery behaviour.
- Keyboard, mobile, screen-reader, low-bandwidth and cross-system handoff tests pass.

**Role Blueprint 1 is now complete: Prospective Applicant and Applicant.**

The next blueprint should be **Role Blueprint 2: New student and continuing undergraduate student**, beginning with:

> Part 1: Student identity, portal entry, first-registration readiness and the student home experience.

---

## Following user responses before the next design record

### User message 0139

Proceed
