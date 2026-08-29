# Role Blueprint 2 — New and Continuing Student Journey Book

This book combines all eight recovered student parts, from onboarding and registration through Moodle, finance, results, support, progression and completion-related activity.

## Recovered part 1

_Source record: `012-role-blueprint-2-new-student-and-continuing-undergraduate-student.md`_

## Role Blueprint 2 — New Student and Continuing Undergraduate Student  
### Part 1: Student identity, portal entry, first-registration readiness and student home experience

This blueprint covers a person who has been converted from an accepted applicant into a student record, as well as a continuing undergraduate student returning for a later academic period.

It begins before registration is complete and will later progress through registration, billing, courses, timetable, results, support and graduation.

---

### 1. Student identity and lifecycle

A student account remains connected to the same underlying person identity and applicant history. The system does not create a separate unrelated identity merely because the person becomes a student.

The student portal header always shows:

> Student portal · [Active academic period] · [Student number] · [Current registration status]

A person who is also a lecturer, adviser or staff member uses the explicit workspace switcher. Student privileges must not silently combine with staff privileges.

#### 1.1 Critical distinction

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

### 2. Portal-entry experience

#### 2.1 First sign-in after conversion

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

#### 2.2 Continuing-student entry

A continuing student signs in directly to student home. If a new academic period is open:

> Registration for [period] is now open. Complete registration by [deadline].

If the period has not opened:

> Your next registration period opens on [date]. You can still view your current academic record and prepare any required information.

#### 2.3 Entry after session expiry

If a session expires, the student returns to secure sign-in. After successful sign-in, the system returns them to their intended task only if:

- Their permission remains valid
- The academic period is still active
- The task is still available
- No sensitive operation, such as payment authorization, must be restarted

---

### 3. Student home page

The student home page is task-focused. It is not a decorative dashboard and does not bury urgent actions under charts or announcements.

It answers:

1. Am I registered for the current period?
2. What must I do next?
3. What deadline or hold affects me?
4. What academic information is available now?
5. Where do I continue a task I started?

#### 3.1 Home-page order

The page displays sections in this order:

1. **Registration status and required action**
2. **Urgent tasks and deadlines**
3. **Holds and what they mean**
4. **Current period summary**
5. **Academic, finance and learning shortcuts**
6. **Recent updates**
7. **Support and help**

#### 3.2 Registration-status card

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

#### 3.3 Tasks and deadlines

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

#### 3.4 Holds

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

#### 3.5 Current-period summary

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

### 4. Navigation

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

### 5. Registration-readiness experience

#### 5.1 Readiness page

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

#### 5.2 New-student readiness

For a new student, the system may show:

- Student record created
- Offer conditions met
- Official contact details confirmed
- Orientation information available
- First-registration period open
- Financial clearance status
- Initial course package ready for review

It must not assume every new student manually selects every course. Some programmes may use an institution-defined initial course package, while others require student selection. This is configured by programme and period.

#### 5.3 Continuing-student readiness

For a continuing student, readiness may include:

- Prior period progression outcome
- Required repeat or prerequisite course status
- Outstanding academic decision
- Financial clearance
- Programme change/leave-of-absence return condition
- Registration opening and deadline

The system must not infer a progression outcome from raw grades alone; it uses the authorized progression decision.

---

### 6. First-registration handoff from applicant onboarding

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

### 7. Profile, identity and contact changes

#### 7.1 Student profile

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

#### 7.2 Controlled changes

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

### 8. Student notifications

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

### 9. Empty, blocked and recovery states

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

### 10. Accessibility and low-bandwidth requirements

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

### 11. Architecture contract

#### 11.1 Core entities

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

#### 11.2 Commands

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

#### 11.3 Events

- `StudentPortalAccessGranted`
- `StudentPeriodStatusChanged`
- `RegistrationReadinessAssessed`
- `StudentRegistrationTaskCreated`
- `StudentHoldPublished`
- `StudentContactDetailsUpdated`
- `StudentRecordCorrectionRequested`
- `StudentNotificationPublished`
- `ExternalServiceStatusUpdated`

#### 11.4 Audit requirements

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

### 12. Part 1 acceptance tests

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

---

## Recovered part 2

_Source record: `013-role-blueprint-2-new-student-and-continuing-undergraduate-student.md`_

## Role Blueprint 2 — New Student and Continuing Undergraduate Student  
### Part 2: Financial clearance, sponsorship status, payment options and registration holds

This part defines what a student sees and can do when finance affects registration.

The core rule is:

> **Invoice issued** ≠ **payment attempted** ≠ **payment confirmed** ≠ **financially cleared** ≠ **registered**

Financial clearance is an authorized status for a defined academic period. It is not simply a number displayed on a dashboard.

---

### 1. Finance home

The student reaches this area from:

- Home-page registration-readiness task
- `Finance` navigation item
- A registration hold card
- A payment notification

Page title:

> Finance and clearance

The top summary displays:

- Student number
- Academic period
- Current financial-clearance status
- Outstanding amount, where the student is permitted to see it
- Next required action
- Payment deadline
- Sponsorship status, where applicable
- Latest refresh time
- Finance support route

Example:

> **Financial clearance: Action required**  
> January 2027 registration is not yet financially cleared.  
> Outstanding amount: ZMW [amount]  
> Payment deadline: 18 January 2027, 17:00 CAT  
> `View invoice`  `Make payment`  `View payment plan`

The interface must not present a red balance without saying whether it actually blocks registration.

---

### 2. Financial-clearance status model

| Internal state | Student-facing status | Meaning |
|---|---|---|
| `NotAssessed` | Clearance is being prepared | Billing/eligibility information is not ready yet |
| `NoFinancialRequirement` | No finance action required | No fee/payment condition applies for this period |
| `InvoiceAvailable` | Payment or funding action required | An obligation exists; registration clearance is not yet confirmed |
| `PaymentPending` | Payment is being confirmed | Payment was initiated/received but reconciliation remains incomplete |
| `SponsorshipPending` | Sponsorship confirmation in progress | Sponsor/award information is awaiting authorized confirmation |
| `PaymentPlanPending` | Payment arrangement under review | A request exists but does not yet clear registration |
| `PartiallyCleared` | Further finance action required | Some approved requirement is met; a remaining condition applies |
| `FinanciallyCleared` | Financial clearance complete | Finance condition for current registration is satisfied |
| `HoldApplied` | Registration is currently blocked | A defined finance hold prevents specified action |
| `ExceptionUnderReview` | Finance is reviewing your case | Student should not pay again unless Finance instructs them |
| `ClearanceExpired` | Clearance needs review | A prior conditional/temporary clearance is no longer valid |

The wording is configurable under policy, but every status must identify the applicable academic period.

---

### 3. Invoice and charge breakdown

#### 3.1 Invoice page

Selecting `View invoice` opens:

> Invoice for January 2027

The page provides a transparent breakdown:

- Charge description
- Amount/currency
- Applicable academic period
- Due date
- Payment/clearance rule
- Previous payments/credits applied
- Balance
- Fee-schedule/version date
- Official invoice reference
- `Download invoice`
- `Make payment`
- `Ask Finance`

The student can see only charges they are authorized to view. Staff adjustments appear as a student-safe description, not as internal accounting codes.

#### 3.2 Charge categories

Possible configured categories:

- Tuition
- Registration fee
- Examination fee
- Student-service fee
- Accommodation fee
- Laboratory/clinical/programme fee
- Library or other approved charge
- Prior-period balance
- Approved credit, scholarship or waiver
- Adjustment under authorized finance process

Every item must state the reason and period. The system must never combine several unrelated periods into one unexplained total.

#### 3.3 Disputed charge

Where policy permits, a student may select:

> `Question this charge`

The student selects a reason, writes an explanation and attaches approved supporting evidence through the safe document process.

The system creates a finance-review case. It does not remove the charge or automatically clear registration merely because the student disputes it.

---

### 4. Student payment journey

#### 4.1 Reuse of secure payment controls

The technical payment controls from Applicant Blueprint Part 7 are reused:

- Approved providers/methods only
- Provider tokenization where available
- Server-side confirmation
- Idempotency protection
- Reconciliation before final status
- Neutral notifications
- Controlled refund/review process

The student experience differs because payments may apply to invoices, instalments, accommodation or other authorized obligations—not only an application fee.

#### 4.2 Payment selection screen

Page title:

> Make a payment

It displays:

- Student number, masked where appropriate
- Invoice/charge reference
- Academic period
- Amount due
- Payment amount field, only if partial payment is permitted
- Available payment methods
- Payment deadline
- Effect on clearance, expressed plainly

Example:

> Paying ZMW [amount] will meet the current registration payment requirement. Finance will confirm clearance after payment is reconciled.

If a partial payment does not permit registration:

> A partial payment may reduce your balance but will not complete financial clearance unless you have an approved payment arrangement.

#### 4.3 Payment methods

Methods are configuration driven and may include:

- Mobile money
- Bank transfer/deposit
- Approved online card provider
- In-person cashier
- Sponsor payment
- Approved instalment/payment plan

The student never enters raw card details into the SIS when a hosted provider page is available.

#### 4.4 Payment confirmation

After authoritative reconciliation:

> **Payment confirmed**  
> ZMW [amount] was applied to your January 2027 invoice.  
> Remaining balance: ZMW [amount]  
> Financial clearance: [Complete / Further action required]

`Payment confirmed` and `Financial clearance complete` are separate messages because a payment may not settle every applicable requirement.

---

### 5. Sponsorship, scholarship and third-party funding

#### 5.1 Student-facing sponsorship card

Where funding is recorded, Finance home shows:

> **Sponsorship status: Confirmation in progress**  
> Sponsor: [approved display name]  
> Academic period: January 2027  
> Finance is verifying the sponsorship authorization.  
> No action is required from you now.

The student sees only the information needed to understand their financial obligation. They do not see sponsor contracts, internal budget notes or other sponsored students.

#### 5.2 Sponsorship outcomes

| Status | Student-facing explanation |
|---|---|
| Not recorded | No confirmed sponsorship is currently linked to this period |
| Submitted for review | Funding information was received; Finance is reviewing it |
| Confirmed | Sponsorship has been applied to eligible charges |
| Partial sponsorship | Sponsor covers specified charges; student must address remaining balance |
| Expired/not applicable | Sponsorship does not currently apply to this period |
| Declined/withdrawn | Sponsorship could not be applied; see Finance for permitted explanation |
| Requires student action | Finance needs an approved document or confirmation from the student |

#### 5.3 Sponsor evidence

If the student must provide a sponsorship letter or award notice:

- It is requested as a scoped finance task.
- Upload uses the Part 6 safe-document process.
- The system does not say sponsorship is confirmed merely because a letter is uploaded.
- Finance/authorized officers complete formal assessment.

#### 5.4 Sponsor payments

A sponsor or third party cannot access the student portal merely from knowing a student number. Any sponsor-facing function requires its own future role blueprint and controlled identity/authorization model.

---

### 6. Payment plans and financial exceptions

#### 6.1 Payment-plan request

If policy permits:

> `Request payment arrangement`

The student sees:

- Eligibility guidance
- Required initial payment, if any
- Available plan options
- Effect on registration
- Required evidence or declaration
- Decision authority
- Deadline and expected response period

The student submits a request; the system creates `PaymentPlanPending`.

It must not display the student as cleared until an authorized arrangement is approved.

#### 6.2 Approved plan

If approved, the student sees:

> **Payment arrangement approved**  
> You may complete registration for January 2027 under this arrangement.  
> Next instalment: ZMW [amount] due [date].

The registration system receives an authorized clearance entitlement with its scope and expiry—not a vague note saying “allowed.”

#### 6.3 Declined or expired plan

> Your requested payment arrangement was not approved. Your financial clearance remains incomplete. Review payment options or contact Finance.

If a plan is later missed, the system applies only the policy-approved effect. It does not automatically make decisions beyond the configured rule.

#### 6.4 Emergency or exceptional cases

Where the institution has an approved hardship/emergency route, the student may submit a limited request. The system keeps:

- Financial evidence
- Welfare/counselling content
- Academic records

separated by role and purpose. Finance staff do not gain access to confidential counselling notes merely because a hardship request exists.

---

### 7. Financial holds and registration effect

#### 7.1 Hold card

A finance hold appears in both Finance home and Registration readiness.

Example:

> **Financial-clearance hold**  
> Effect: You cannot complete registration for January 2027.  
> Reason: The current registration payment requirement is not yet met.  
> Responsible office: Student Finance  
> `View payment options`

The hold indicates what it blocks:

- Final registration
- Course changes
- Results release
- Transcript request
- Graduation clearance

Each effect is separately configured. A hold must not silently block unrelated services.

#### 7.2 Hold resolution

The system removes or updates the hold only when:

- Payment is authoritatively reconciled
- Sponsorship is confirmed
- Payment plan is approved
- Fee waiver/exception is approved
- Authorized finance staff resolve the hold under policy

The student cannot clear a hold by uploading a payment screenshot or changing a payment reference.

#### 7.3 Temporary clearance

If temporary/conditional clearance is permitted, the card says:

> **Temporary financial clearance until 31 January 2027**  
> You may register now. Your next required finance action is due on [date].

The expiry and consequences are explicit and auditable.

---

### 8. Receipts, credits, refunds and payment review

#### 8.1 Finance history

`Payment history` shows:

- Date
- Payment/credit/refund description
- Amount/currency
- Applied charge(s)
- Status
- Receipt/reference
- `View receipt`

It does not disclose provider secrets or unrelated financial records.

#### 8.2 Excess/duplicate payment

If an overpayment or possible duplicate is detected:

> Finance is reviewing a payment linked to your account. Do not make another payment for this item until the review is complete.

The student can see the review status but cannot initiate an uncontrolled automatic transfer/refund.

#### 8.3 Refund/credit

Refunds and credits follow authorized finance rules. The student sees:

- Reason category
- Amount
- Status
- Decision date
- Next step
- Receipt after completion

Any payout-account change requires a controlled identity and anti-fraud process.

---

### 9. Failure and recovery catalogue

| Situation | Student-facing response | System behaviour |
|---|---|---|
| Invoice service unavailable | Show last confirmed balance/time and retry/support route | Do not present stale data as real-time |
| Payment provider return uncertain | “We are checking your payment. Do not pay again yet.” | Resolve using authoritative provider/reconciliation records |
| Payment confirmed but hold remains | Explain remaining clearance condition | Recalculate clearance; create finance exception if inconsistent |
| Sponsor confirmation delayed | Show current owner, last update and expected period | Escalate under service rule |
| Student pays wrong reference | Create reconciliation-review status | Do not misapply payment automatically |
| Partial payment made | Show remaining balance and clearance impact | Apply according to authorized allocation rule |
| Payment-plan request rejected | Explain next finance action | Keep original obligation active |
| Student disputes charge | Create scoped review case | Preserve invoice/hold until authorized decision |
| Financial clearance expires | Explain reason/date and required action | Apply scope-specific hold rules |
| Duplicate payment attempt | Prevent new initiation while earlier attempt is uncertain | Use idempotency and duplicate detection |

---

### 10. Accessibility and low-bandwidth requirements

- All balances, clearance states and holds include text—not colours alone.
- Invoice tables are available as accessible tables on desktop and structured cards on mobile.
- Amounts show currency clearly and use consistent Zambian formatting.
- Payment actions can be completed using keyboard and screen reader.
- Redirects to payment providers announce that the student is leaving the portal.
- Payment status refresh includes a visible last-updated time.
- Low-bandwidth users can access payment instructions without loading heavy documents.
- Receipts are available in accessible HTML view before optional download.
- Financial support/help is available without requiring a phone call only.

---

### 11. Architecture contract

#### 11.1 Core entities

| Entity | Purpose |
|---|---|
| Student finance account | Period-aware account summary |
| Student invoice | Authoritative charge document |
| Charge line | One explained financial obligation |
| Payment transaction | Received/reconciled payment |
| Payment allocation | Application of a payment to approved charges |
| Financial-clearance assessment | Authoritative registration finance status |
| Sponsorship record | Controlled third-party funding entitlement |
| Payment-plan request/arrangement | Authorized conditional-payment pathway |
| Financial hold | Restriction with scope, reason and expiry |
| Finance review case | Dispute, exception, duplicate or refund review |
| Financial receipt | Applicant/student-facing payment evidence |

#### 11.2 Commands

| Command | Main result |
|---|---|
| `GenerateStudentInvoice` | Creates authorized period charges |
| `InitiateStudentPayment` | Starts payment against selected obligation |
| `ReconcileStudentPayment` | Confirms/matches payment and allocation |
| `AssessStudentFinancialClearance` | Determines current clearance under rules |
| `RecordSponsorshipStatus` | Updates authorized sponsorship outcome |
| `RequestStudentPaymentPlan` | Opens payment-arrangement request |
| `ApproveStudentPaymentPlan` | Grants scoped clearance entitlement |
| `ApplyStudentFinancialHold` | Applies authorized hold and effects |
| `RequestFinanceReview` | Opens controlled charge/payment review |
| `IssueStudentFinanceReceipt` | Generates authoritative receipt |

#### 11.3 Events

- `StudentInvoiceIssued`
- `StudentPaymentInitiated`
- `StudentPaymentReconciled`
- `StudentFinancialClearanceAssessed`
- `StudentSponsorshipStatusChanged`
- `StudentPaymentPlanRequested`
- `StudentPaymentPlanApproved`
- `StudentFinancialHoldApplied`
- `StudentFinancialHoldReleased`
- `StudentFinanceReviewRequested`
- `StudentFinanceReceiptIssued`

#### 11.4 Audit requirements

Record:

- Student/account/academic-period context
- Charge and fee-schedule version
- Payment method, amount, currency and protected reference
- Allocation/reconciliation outcome and authority
- Sponsorship entitlement scope
- Payment-plan decision and expiry
- Hold scope, reason category, application and release
- Finance review/refund outcomes
- Receipt identifiers
- All applicant/student-visible status updates

Raw card data, provider credentials, confidential sponsor agreements and restricted hardship evidence remain outside ordinary logs and views.

---

### 12. Part 2 acceptance tests

Part 2 is accepted when:

- Students can understand the difference between invoice, payment, reconciliation, clearance and registration.
- Every charge is explained by period, reason, amount and applicable fee schedule.
- Payments never complete clearance until authoritative reconciliation and rule evaluation occur.
- Sponsorship, waivers and payment arrangements have distinct visible states.
- A financial hold states exactly what it blocks, why and how to resolve it.
- Partial payments and confirmed payments accurately show their effect on remaining clearance.
- Students cannot clear a hold with a screenshot, self-reported payment or browser redirect.
- Refunds, credits and payment reviews follow controlled workflows.
- Stale finance data is visibly labelled and has a recovery route.
- Financial details remain private in notifications, mobile screens and unauthorized staff views.
- Keyboard, screen-reader, mobile, provider-failure and reconciliation-delay tests pass.

---

## Recovered part 3

_Source record: `014-role-blueprint-2-new-student-and-continuing-undergraduate-student.md`_

## Role Blueprint 2 — New Student and Continuing Undergraduate Student  
### Part 3: Programme progression, course selection, prerequisite checks, repeats, supplementary eligibility and registration workflow

This part defines how the system determines a student’s academic path and permits registration. It covers full-year courses, half-courses, repeats, progression, supplementary exams, course-based payment and long-running activities such as research or industrial training.

The system must use a versioned academic-rule engine. These rules must never be hard-coded in screens or scattered through application code.

---

### 1. Course and academic-period model

#### 1.1 Course types

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

### 2. Academic-result states

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

### 3. Progression policy supplied for this system

The following rules are now captured as explicit policy requirements from your design direction.

#### 3.1 Progression with failed half-courses

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

#### 3.2 Full-year course failure

If a student fails a full-year course, the system produces:

> **Repeat year required**

The student registers the required repeat-year course package according to the approved programme regulation. They must not be offered ordinary next-year courses merely because a UI screen has a generic “Add courses” button.

#### 3.3 More than three failed half-courses

If a student fails **more than three half-courses**, the system produces:

> **Repeat year required**

The repeat-year course package contains the failed courses and any other courses required by approved regulations. The system does not assume that every previously passed course must be repeated.

#### 3.4 Important unresolved boundary: exactly three failed half-courses

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

#### 3.5 Extended research/industrial-training course

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

### 4. Supplementary-examination policy supplied for this system

#### 4.1 Eligibility rule

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

#### 4.2 Unresolved CA boundary

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

#### 4.3 Failed-course-count boundary for supplementary

The phrase “failed less than 3 courses” is encoded as:

- 0–2 failed applicable courses → may be eligible if CA rule and all other conditions pass.
- 3 or more → not eligible, unless a formal academic rule says otherwise.

The exact scope must be configured:

- Failed courses in one semester,
- Failed courses in one academic year,
- Failed half-courses only,
- All courses including full-year courses.

The student-facing explanation must name the rule scope.

#### 4.4 Supplementary workflow

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

### 5. Progression outcome page

After authorized results/progression processing, the student sees:

> Academic progression for 2026/2027

The page explains the conclusion, not merely a classification.

#### 5.1 Progress with repeats

> **Outcome: Progress to Year 2 with repeat courses**  
> You passed the required full-year course(s).  
> You must repeat:  
> - [Half-course A]  
> - [Half-course B]  
>
> You may now review your Year 2 courses and repeats. Course choices remain subject to prerequisites, capacity and financial clearance.  
> `Plan my registration`

#### 5.2 Repeat year required

> **Outcome: Repeat year required**  
> You must repeat the required course package before progressing to the next academic year.  
> Reason: [approved explanation, such as “A required full-year course was not passed.”]  
>
> `View repeat-year course plan`  
> `Get academic-advice support`

#### 5.3 Decision pending

> **Outcome: Academic progression decision required**  
> Your result pattern requires an authorized academic decision under the applicable regulation.  
> No action is required from you now unless a task appears below.

The student does not see staff recommendations, board deliberations or another student’s outcome.

---

### 6. Course planning and selection

#### 6.1 Course-plan page

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

#### 6.2 Repeat courses

Repeat courses are automatically proposed, not hidden among electives.

The student sees:

> **Repeat courses required**  
> These courses are required because of your prior authorized results. They cannot be removed without an approved academic decision.

Where regulations permit sequencing alternatives, the system explains those choices rather than forcing an opaque package.

#### 6.3 New courses while carrying repeats

For a student allowed to progress with fewer than three failed half-courses:

- Required repeats appear first.
- Permitted next-year courses appear separately.
- The system checks timetable conflicts, credit/academic-load limits, prerequisites and payment requirements across the combined package.
- The student cannot remove a repeat course merely to make the schedule easier, unless an authorized academic exception exists.

#### 6.4 Prerequisite check

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

#### 6.5 Course-selection confirmation

Before selection is saved, the student sees:

- Selected course list
- Repeat/new/elective labels
- Credit or academic-load summary
- Per-course charge and total provisional charge
- Conflicts and warnings
- Conditions still preventing final registration

Selecting `Save course plan` saves a draft plan; it does not finalise registration.

---

### 7. Course-based payment

#### 7.1 Charge generation

Each selected, required repeat, or institution-assigned course can generate a course-based financial obligation according to the approved fee schedule.

The student’s provisional course-plan summary shows:

| Course | Type | Fee basis | Amount |
|---|---|---|---|
| CSC 2101 | Repeat half-course | Repeat-course fee | ZMW [configured amount] |
| CSC 2202 | New half-course | Standard course fee | ZMW [configured amount] |
| Industrial Training | Extended activity | No new course charge this period / configured charge | ZMW [configured amount] |

The exact amounts and billing logic are versioned configuration. No UI component calculates fees itself.

#### 7.2 Payment effect

The system explains:

> Your provisional course plan creates charges based on the selected and required courses. Financial clearance will be reassessed after the plan is confirmed and payment/sponsorship rules are met.

Adding or removing an elective before final registration recalculates provisional charges. Any payment already received is handled by Finance allocation rules, not silently deleted or reassigned by the student interface.

#### 7.3 Repeat-year billing

For repeat-year outcomes:

- Only courses required by the approved repeat package generate charges.
- Previously passed courses are not automatically billed again.
- Extended activities are charged only according to their configured period/rule.
- Sponsors/payment plans are re-evaluated for the new period.

---

### 8. First/continuing registration workflow

#### 8.1 Steps

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

#### 8.2 Registration lock

After final registration:

- The course set becomes the official registered course load.
- Changes use controlled add/drop/late-registration workflows.
- Charges and entitlement updates are recalculated through authorized rules.
- Moodle/course-roster events are sent through integration controls.
- The student receives an official registration receipt.

#### 8.3 Academic advice route

When course selection is blocked by complex repeat/prerequisite patterns, the student sees:

> Your course plan needs academic review. Your adviser or department must confirm the permitted academic load.

The student can request advice, but the system does not automatically override academic rules or assign them to a random staff member.

---

### 9. Error and recovery catalogue

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

### 10. Architecture contract

#### 10.1 Core entities

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

#### 10.2 Commands

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

#### 10.3 Events

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

#### 10.4 Audit requirements

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

### 11. Part 3 acceptance tests

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

---

## Recovered part 4

_Source record: `015-role-blueprint-2-new-student-and-continuing-undergraduate-student.md`_

## Role Blueprint 2 — New Student and Continuing Undergraduate Student  
### Part 4: Final registration, add/drop, timetable publication and Moodle handoff

This part begins after the student has an academically valid course plan and the required financial-clearance condition is satisfied.

It defines how a proposed course plan becomes official registration, how changes are controlled and how the student receives a trustworthy timetable and learning-system access.

---

### 1. Registration review

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

### 2. Final registration

#### 2.1 Preconditions

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

#### 2.2 Registration declaration

The student confirms versioned declarations such as:

- I have reviewed my registered courses.
- I understand that course changes follow approved add/drop rules.
- My information remains accurate to my knowledge.
- I understand the academic and financial obligations for this period.

These declarations are separate from payment consent and optional communication preferences.

#### 2.3 Submit-registration interaction

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

#### 2.4 Registration receipt

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

### 3. Timetable publication

#### 3.1 Student timetable page

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

#### 3.2 Timetable integrity

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

#### 3.3 Timetable updates

If an activity changes:

> **Timetable updated**  
> CSC 2202 tutorial now starts at 10:00 on Thursday in LT-3.  
> Updated: 12 January 2027, 15:20 CAT

The system preserves prior event history for operational audit but shows students the latest authoritative timetable.

---

### 4. Moodle and learning-system handoff

#### 4.1 Separation of systems

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

#### 4.2 Enrollment synchronization

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

#### 4.3 First Moodle entry

Selecting `Open learning area`:

- Opens Moodle through approved single sign-on where available.
- Sends the minimum necessary identity/course-enrolment information.
- Returns the student to the SIS on sign-out where appropriate.
- Does not expose SIS payment/discipline/support data to Moodle.

---

### 5. Add/drop and late-change workflow

#### 5.1 Add/drop window

When the configured add/drop period is open, the student sees:

> Course changes are open until 2 February 2027, 17:00 CAT.

The page separates:

- Currently registered courses
- Available courses
- Pending change requests
- Financial/timetable effect
- Add/drop deadline

#### 5.2 Adding a course

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

#### 5.3 Dropping a course

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

#### 5.4 Change approval and effect

Approved course changes:

- Create a new registration amendment version.
- Update course roster and timetable.
- Recalculate charges/clearance.
- Send Moodle enrolment/removal events.
- Notify the student of the exact result.

A student is not told “Course added” until the final authorized registration amendment is complete.

#### 5.5 Late registration/change

After the normal deadline, the student sees a controlled request route if policy permits:

> The normal add/drop period has closed. Request a late change only if you have an approved reason.

The request records reason, evidence where applicable, authority and decision. It does not grant automatic late access.

---

### 6. Waitlists and capacity

Where a course offering uses a waitlist:

- The student sees their waitlist status and the course’s next review point.
- The system does not promise a place.
- Offer of a place has a configurable response period.
- Accepting a waitlist place triggers a fresh prerequisite, timetable, load and finance check.
- If the student does not respond in time, the offer expires according to policy.

Applicant-facing wording:

> You are on the waitlist for CSC 2250. We will notify you if a place becomes available. Your registration for other courses remains unchanged.

---

### 7. Registration reversal and withdrawal from period

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

### 8. Failure and recovery catalogue

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

### 9. Accessibility and low-bandwidth requirements

- Registration steps, course status and timetable changes use plain text in addition to colour.
- Course cards provide accessible course title, type, time, location and action labels.
- Tables have accessible headers; mobile view uses equivalent structured cards.
- Drag-and-drop is never the only way to arrange/change courses.
- Timetable has a list view for screen readers and low-bandwidth users.
- Registration receipt and timetable have accessible HTML views before optional download.
- Moodle access delays are explained without requiring the student to navigate a separate support site.
- Course-change confirmations state academic and financial impact before irreversible actions.

---

### 10. Architecture contract

#### 10.1 Core entities

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

#### 10.2 Commands

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

#### 10.3 Events

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

#### 10.4 Audit requirements

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

### 11. Part 4 acceptance tests

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

---

## Recovered part 5

_Source record: `016-role-blueprint-2-new-student-and-continuing-undergraduate-student.md`_

## Role Blueprint 2 — New Student and Continuing Undergraduate Student  
### Part 5: Learning progress, assessment visibility, Moodle synchronization, official results, supplementary exams and academic-record requests

This part defines a real SIS–Moodle integration and the student experience from course learning through official results.

The core distinction is:

> **Moodle manages teaching and learning activity.**  
> **The SIS manages official registration, assessment governance, approved results, progression and academic records.**

They synchronize useful data in both directions, but Moodle activity data must not automatically become an official result without the approved academic workflow.

---

### 1. Assessment model

Each course offering has a versioned **assessment plan** approved before teaching begins.

The plan defines:

- Assessment components
- Weight/maximum mark
- Due/open/close dates
- Whether individual or group based
- Required submission type
- Marking/moderation requirement
- Whether it contributes to continuous assessment (CA)
- Whether it contributes to final course result
- Late-submission rule
- Make-up/deferred-assessment rule
- Result-release rule
- Moodle activity mapping, where applicable

#### 1.1 Assessment types supported

| Assessment type | Typical Moodle role | SIS/official-record role |
|---|---|---|
| Quiz/test | Online quiz, timed test | Approved component score after lecturer/review workflow |
| Assignment | File/text submission | CA component after marking and approval |
| Practical/laboratory assessment | Moodle instructions/evidence where appropriate | Mark entered or imported through controlled workflow |
| Group assignment/project | Group activity/submission | Individual/group result with approved allocation rule |
| Presentation/oral assessment | Booking/materials/rubric support | Official mark entered by authorized assessor |
| Clinical/field assessment | Placement/evidence support where approved | Controlled professional/clinical assessment record |
| Mid-semester examination | Schedule/materials where appropriate | Authorized CA/examination component |
| Final examination | Timetable/notice access only where required | Examination result through examinations workflow |
| Research/dissertation milestone | Milestone activity, feedback and evidence | Progress milestone; final mark follows approved assessment |
| Industrial-training milestone | Logs/evidence/supervisor feedback | `In progress` until final authorized completion |
| Supplementary examination | Candidate information/instructions | Separate linked official assessment attempt |

A course can contain several assessment types. The system must not assume every course is only quizzes and assignments.

---

### 2. Real Moodle integration architecture

#### 2.1 Synchronization principle

The integration is event-driven with scheduled reconciliation. It provides near-real-time updates where possible and detects/corrects missed or conflicting updates.

It is **not**:

- A hyperlink to Moodle
- A nightly blind export
- A process where staff retype every enrolment and grade manually
- A process where Moodle silently overwrites official SIS records

#### 2.2 SIS → Moodle synchronization

The SIS is authoritative for student identity, official course registration and staff teaching entitlement.

When an approved event occurs, the integration synchronizes:

| SIS event | Moodle update |
|---|---|
| Student registration completed | Create/update student enrolment in correct Moodle course |
| Registration amendment approved | Add/remove student from course |
| Programme/course section assigned | Assign student to Moodle group/cohort where configured |
| Lecturer/tutor teaching assignment approved | Create/update teacher/non-editing teacher role |
| Course offering published | Create/link Moodle course shell using approved template |
| Timetable/assessment-plan update | Update applicable calendar/assessment metadata |
| Student withdrawal/course drop effective | Suspend/remove enrolment according to policy |
| Student identity/contact change | Update minimum permitted profile data |
| Academic period/course closes | Archive/lock access according to policy |

Each outbound update has:

- Source event ID
- Correlation ID
- Idempotency key
- Payload version
- Delivery status
- Retry policy
- Reconciliation record

#### 2.3 Moodle → SIS synchronization

Moodle returns approved learning data to the SIS through defined mappings:

| Moodle source | SIS use |
|---|---|
| Course/activity metadata | Displays student learning-plan view and validates assessment mapping |
| Activity due dates | Supports student task calendar |
| Submission status | Shows “submitted/not submitted” learning-progress status |
| Quiz attempt/completion | Supports learning-progress display and authorized CA workflow |
| Gradebook component value | Imported into staging for lecturer/examination approval—not instantly official result |
| Feedback-release status | Shows whether course feedback is available in Moodle |
| Course participation/activity signal | May support explainable adviser observation under Section 12B, never automatic discipline/diagnosis |
| Role/enrolment change reported by Moodle | Reconciled against SIS authoritative entitlement |
| Synchronization failure | Creates operations work item; does not change official registration |

The SIS accepts only mappings approved for that course offering and assessment-plan version.

#### 2.4 Reconciliation

At scheduled intervals, the integration compares:

- SIS registered student roster vs Moodle enrolments
- SIS lecturer/tutor assignment vs Moodle teaching roles
- SIS assessment-plan components vs Moodle activities/gradebook items
- Moodle grade-import batch vs expected eligible students
- Moodle course closure status vs academic-period status

Mismatches create a visible operational queue. They never silently become an unofficial second truth.

---

### 3. Student learning area

#### 3.1 Course learning card

From `My studies`, the student sees each registered course with both academic and learning status.

Example:

> **CSC 4792 — Data Mining and Warehousing**  
> Registration: Registered  
> Moodle access: Synced 14:32 CAT  
> Learning progress: 3 of 5 published assessments submitted  
> Official result: Not yet released  
>
> `Open learning area`  `View assessment plan`

This is an integrated summary, not merely a Moodle link.

#### 3.2 Assessment-plan page

Page title:

> Assessment plan — CSC 4792

The page shows:

- Assessment component
- Type
- Weight
- Due date
- Submission/attendance status
- Mark/feedback availability
- Whether the component contributes to CA
- Source of truth
- Official status

Example:

| Component | Weight | Due date | Learning status | Official status |
|---|---:|---|---|---|
| Assignment 1 | 15% | 10 Mar | Submitted | Mark awaiting release |
| Quiz 1 | 10% | 17 Mar | Completed | CA component pending approval |
| Mid-semester test | 25% | 28 Mar | Scheduled | Not yet assessed |
| Final exam | 50% | 12 Jun | Not yet available | Examinations result pending |

The student can see what counts toward CA without seeing hidden grading formulas, staff moderation notes or other students’ results.

#### 3.3 Student action from SIS

For each Moodle-based assessment, the SIS provides contextual actions:

- `Open assignment`
- `Open quiz`
- `View feedback in Moodle`
- `View submission status`
- `Request approved assessment support`
- `Report access problem`

The student returns to the specific Moodle activity through secure single sign-on and course/activity identifiers, not a generic Moodle homepage.

#### 3.4 Learning and official result separation

The page labels every value:

- **Moodle learning mark:** provisional/coursework value visible in Moodle
- **Official CA component:** approved/imported component in SIS
- **Official course result:** released through examinations/academic approval

Example:

> Moodle currently shows 18/20 for Quiz 1. This is learning feedback and is not yet your official course result.

This prevents a student from assuming an LMS gradebook total is automatically the official mark.

---

### 4. Student assessment experience

#### 4.1 Assessment notifications

The student receives task notifications for:

- Assessment published
- Due date approaching
- Submission confirmed by Moodle
- Submission could not be synchronized
- Mark/feedback released in Moodle
- Official CA component released in SIS where policy permits
- Official course result released
- Supplementary exam eligibility/outcome
- Assessment schedule changed

Notifications distinguish a learning deadline from an official examination event.

#### 4.2 Submission status

The SIS displays a privacy-safe mirrored status:

- Not opened, where Moodle provides this and policy permits
- In progress
- Submitted
- Submitted late
- Missing
- Not applicable
- Sync delayed/unavailable

If Moodle is unavailable, the SIS says:

> Moodle submission status could not be refreshed. Check Moodle directly when it is available. Your official registration remains unchanged.

It does not label an assignment “missing” only because a synchronization request failed.

#### 4.3 Extensions, deferrals and special arrangements

Students cannot change assessment deadlines themselves.

They may select:

> `Request assessment support or extension`

The request route is configuration driven and may go to a lecturer, programme office, disability-support officer or examinations office, depending on assessment type and policy.

The student sees:

- Request category
- Evidence/privacy notice
- Who will receive the request
- Current deadline
- Decision status
- Approved adjusted arrangement where applicable

Confidential disability/counselling information remains in its restricted workspace. Teaching staff see only the approved accommodation necessary to conduct assessment.

---

### 5. Official CA and result processing

#### 5.1 CA import and approval

Moodle grade data can support official CA, but the process is controlled:

1. Moodle activity is mapped to an approved SIS assessment component.
2. Moodle grades are imported into a **staging batch**.
3. The lecturer/tutor reviews completeness, anomalies and mappings.
4. Authorized moderation/examination roles approve the batch according to policy.
5. The approved component becomes an official CA record in the SIS.
6. Students see it only when the release rule permits.

Moodle cannot directly overwrite:

- Official CA
- Final examination mark
- Course result
- Progression outcome
- Supplementary eligibility

#### 5.2 Student CA view

When CA visibility is permitted:

> **Continuous assessment — CSC 4792**  
> Official CA currently recorded: 52/100  
> Last approved component: Mid-semester test  
> Status: Provisional until final course result is released.

The system must clarify whether this is:

- Running CA total
- Final CA total
- Published component summary only
- Not yet available

#### 5.3 Results publication

Official results are released only after:

- Marks are authorized according to examination governance.
- Required moderation/board process is complete.
- Result-release date is reached.
- Any configured finance/records restrictions are evaluated under policy.
- Publication batch completes successfully.

When results are released, the student receives a secure notification:

> Your official results for January 2027 are available. Sign in to view them.

#### 5.4 Results page

Page title:

> Official results — January 2027

For each course, the student sees:

- Course code/title
- Course type: half/full/extended
- Attempt number
- Official outcome: passed, failed, in progress, deferred, etc.
- Official grade/mark where policy permits
- Supplementary eligibility/outcome, where applicable
- Repeat requirement, if any
- Publication date
- `Request result review` where permitted

For an extended activity:

> **Industrial Training — In progress**  
> This activity continues into Year 4. A final result will be released after its approved completion requirements are met.

It must not be presented as an F/failed result simply because a final grade does not yet exist.

---

### 6. Supplementary-examination experience

This applies the configurable policy established in Part 3.

#### 6.1 Eligibility display

When official results publish, an eligible student sees:

> **Supplementary examination available**  
> Course: CSC 4792  
> Basis: Your approved CA and applicable failed-course count meet the configured supplementary rule.  
> Confirm participation by [deadline].  
> `View supplementary details`

An ineligible student sees a factual explanation:

> You are not eligible for a supplementary examination for this course under the current approved rule.  
> Next academic action: [repeat/progression decision].

The system never exposes other courses or students’ information to explain a failed-course-count rule.

#### 6.2 Candidate workflow

The student can:

- View course, date, time, venue/modality and candidate instructions
- View supplementary fee requirement, if applicable
- Confirm attendance/participation where policy requires
- Pay required fee through Finance workflow
- View approved accommodation information
- Receive final supplementary result

The system prevents booking where eligibility, deadline, payment or capacity conditions fail.

#### 6.3 Final outcome

After authorized supplementary processing:

> **Supplementary result released**  
> CSC 4792 — Supplementary passed  
> Your academic progression status has been updated.

The original attempt remains visible historically. The system shows the final official outcome according to transcript/reporting rules but preserves all linked attempts internally.

---

### 7. Result corrections, review and appeal

#### 7.1 Student request

Where policy permits, the student selects:

> `Request result review`

The page shows:

- Course/result in question
- Request deadline
- Permitted grounds
- Required explanation/evidence
- Applicable fee, if any
- Responsible office
- Outcome timeline
- What a result review can and cannot do

The student cannot directly edit an official mark.

#### 7.2 Controlled review

A request creates a restricted examination-review case.

Possible outcomes:

- No change
- Clerical correction
- Mark amended after authorized review
- Further academic process required
- Request ineligible/out of time
- Withdrawn by student

If a result changes:

- Original published result remains auditable.
- Authorized amended result version is recorded.
- Progression, repeat requirement, supplementary status, course plan and finance effects are recalculated.
- Student receives a clear result-change notice.
- No staff member can silently overwrite a released result.

---

### 8. Academic-record requests

#### 8.1 Student academic record

The student can view a read-only academic record showing:

- Programme
- Academic periods
- Registered courses
- Official results/outcomes
- Progression outcomes
- Credits/academic-load information where approved
- Current student status

This view is not a replaceable spreadsheet and does not expose staff notes.

#### 8.2 Transcript and confirmation requests

The student may request:

- Official transcript
- Statement of results
- Registration confirmation
- Expected-completion confirmation where permitted
- Other approved academic document

The request page shows:

- Document type
- Purpose/recipient where needed
- Applicable fee
- Delivery method
- Processing time
- Current financial/records prerequisites
- Request status

A document request becomes a controlled work item. Downloaded copies carry authenticity/verification information and do not become editable official records.

---

### 9. Moodle integration failures and recovery

| Situation | Student-facing behaviour | System/integration behaviour |
|---|---|---|
| Registered in SIS but no Moodle course yet | Registration shown as complete; learning access pending | Retry provisioning; create operations task |
| Moodle enrolment exists but SIS registration removed | Explain controlled access update if relevant | Reconcile and suspend/remove Moodle role per policy |
| Moodle mark exists but mapping missing | Student sees Moodle feedback only; no official CA import | Route mapping issue to academic/operations queue |
| Grade import fails | Official result remains unchanged | Preserve batch; retry/reconcile; notify staff only as needed |
| Moodle activity deleted/changed | Show learning-plan mismatch where student impact exists | Require authorized assessment-plan change, not silent re-map |
| Moodle unavailable during deadline | Show Moodle service status and approved contingency route | Record incident; staff apply approved extension/contingency process |
| Duplicate Moodle accounts | Student sees secure access-recovery instruction | Identity/integration administrator resolves controlled merge |
| Lecturer role missing | Student can report learning-access problem | Reconcile teaching assignment; do not grant student staff powers |
| SIS result amended | Student sees official update | Never overwrite Moodle history blindly; publish bounded result status if needed |

---

### 10. Architecture contract

#### 10.1 Core entities

| Entity | Purpose |
|---|---|
| Assessment plan | Versioned course assessment design |
| Assessment component | One weighted/ruled assessment item |
| Moodle course mapping | Link between SIS course offering and Moodle course |
| Moodle activity mapping | Link between SIS assessment component and Moodle activity |
| Moodle enrolment projection | Synced learner/teacher entitlement state |
| Learning-progress projection | Student-safe view of activity/submission state |
| Grade-import batch | Staged Moodle grade data awaiting approval |
| Official CA record | Authorized continuous-assessment component/total |
| Official course-result record | Released course outcome |
| Result-review case | Controlled correction/appeal workflow |
| Academic-document request | Transcript/statement/confirmation request |

#### 10.2 Commands

| Command | Main result |
|---|---|
| `PublishAssessmentPlan` | Makes authorized assessment plan available |
| `ProvisionMoodleCourse` | Creates/links course shell and template |
| `SynchronizeMoodleEnrolment` | Adds/updates/removes learner/teacher roles |
| `SynchronizeMoodleLearningProgress` | Imports safe activity/submission states |
| `ImportMoodleGradeBatch` | Stages mapped Moodle grade components |
| `ApproveOfficialCABatch` | Converts approved components to official CA records |
| `ReleaseOfficialCourseResults` | Publishes authorized course results |
| `AssessSupplementaryEligibility` | Creates student-specific eligibility outcome |
| `RecordSupplementaryResult` | Records approved supplementary result |
| `RequestResultReview` | Opens controlled result-review case |
| `IssueAcademicDocument` | Produces authorized academic record/document |

#### 10.3 Events

- `AssessmentPlanPublished`
- `MoodleCourseProvisioned`
- `MoodleEnrolmentSynchronized`
- `MoodleLearningProgressSynchronized`
- `MoodleGradeBatchImported`
- `OfficialCAApproved`
- `OfficialCourseResultsReleased`
- `SupplementaryEligibilityPublished`
- `SupplementaryResultReleased`
- `ResultReviewRequested`
- `OfficialResultAmended`
- `AcademicDocumentRequested`
- `AcademicDocumentIssued`

#### 10.4 Audit and data-governance requirements

Record:

- Course/assessment-plan/mapping version
- Source system and synchronization timestamps
- Enrolment/role change outcome
- Grade import batch, source values, approving role and moderation state
- Official CA/result publication authority
- Result-review requests and amendments
- Student access to results and academic documents
- Integration retries, mismatches and reconciliation outcome

The system must not:

- Train external AI models on identifiable Moodle activity or submitted work without approval.
- Make a progression, discipline, counselling or admission decision from Moodle engagement automatically.
- Let Moodle overwrite official SIS results.
- Expose staff grading notes, peer feedback, private forum content or other students’ activity to unauthorized users.

---

### 11. Part 5 acceptance tests

Part 5 is accepted when:

- Moodle provisioning, enrolment, role assignment and course-group synchronization occur from authoritative SIS events.
- Moodle activities and gradebook items map only to approved versioned assessment components.
- Students see an integrated course view with registration, learning, assessment and official-result status.
- Moodle marks are clearly labelled as learning/provisional until approved through the official CA/result process.
- Grade imports are staged, reviewed and authorized before becoming official.
- Students can see assessment deadlines, submissions and feedback access without Moodle becoming the official academic-record system.
- Moodle outages/sync delays do not falsely affect registration, grades or progression.
- Extended research/industrial training remains `In progress` until approved completion.
- Supplementary eligibility uses the approved configurable policy and appears only after official results are released.
- Result corrections are controlled, versioned and recalculate affected progression/finance outcomes.
- Transcript/academic-document requests use authoritative SIS records and a controlled workflow.
- Moodle/SIS reconciliation, access control, privacy boundaries, keyboard, mobile and low-bandwidth tests pass.

---

## Recovered part 6

_Source record: `017-role-blueprint-2-new-student-and-continuing-undergraduate-student.md`_

## Role Blueprint 2 — New Student and Continuing Undergraduate Student  
### Part 6: Academic advising, student-success observations, support referrals, wellbeing boundaries, appointments and follow-up

This part defines how a student experiences academic support, adviser contact, referrals and follow-up.

It implements the earlier Section 12B from the student’s perspective. The student must experience a clear offer of support—not surveillance, accusation or unexplained automated classification.

The governing rule is:

> Academic signals may prompt a human-reviewed support invitation. They do not diagnose a student, create discipline, or automatically disclose private information to staff.

---

### 1. Student support area

The student opens:

> Requests and support

The page contains:

- My academic adviser
- Academic-support appointments
- Support invitations
- My requests
- Referrals I have accepted
- Support appointments
- Agreed actions and next dates
- Help and urgent-support information

It must not show hidden internal risk scores, staff-only case notes or counselling-session notes.

---

### 2. Adviser relationship

#### 2.1 Adviser card

Where an adviser is assigned, the student sees:

> **Your academic adviser**  
> Dr. [Name]  
> Department: [Department]  
> Available for: course planning, progression, academic difficulties and referrals to appropriate support.  
>
> `Book an appointment`  `Send a message`

The card shows:

- Adviser name and approved contact route
- Department/programme scope
- Availability
- Appointment method: in-person, online, phone where approved
- Accessibility/communication accommodation route
- Whether the adviser is temporarily unavailable and the alternative contact

If no adviser is assigned:

> An academic adviser has not yet been assigned.  
> `Contact your programme office`

The system creates an administrative task; it does not pretend the student has an adviser.

#### 2.2 Adviser communication boundary

The student can send a secure message to their adviser about academic matters.

The composer clearly states:

> Do not include urgent safety concerns or private counselling information here. Use the appropriate support or emergency route if needed.

Messages are part of an academic-support case, not the student’s academic transcript. The student sees delivery/read status only where policy permits.

---

### 3. Support invitations based on academic observations

#### 3.1 Student notification

If an authorized staff member sends a support invitation after human review, the student receives a neutral notice:

> Your academic adviser has sent you a support message. Sign in to view it securely.

The message must never say:

- “You are high risk.”
- “The system detected you are depressed.”
- “You are under surveillance.”
- “You have failed.”
- “You must attend counselling” unless an approved safeguarding rule truly requires a specific action.

#### 3.2 Invitation page

After secure sign-in, the student sees:

> **Academic-support invitation**  
> We noticed that you may be having difficulty completing recent activities in CSC 4792. Your academic adviser is available to help you review your options.

The page identifies:

- What triggered the invitation, in understandable terms
- Course/process involved
- Data freshness
- Adviser or responsible office
- Available support options
- Privacy explanation
- Whether a response is required or optional

Example explanation:

> Three recent assessment activities are recorded as not submitted. This information was last confirmed from Moodle on 16 August 2026.

The student can correct factual inaccuracy:

> `This information is not correct`

This creates a review task. It does not require the student to disclose personal circumstances.

#### 3.3 Student responses

Available actions may include:

- `Book an adviser appointment`
- `Ask my adviser to contact me`
- `Request academic-skills support`
- `Request financial-support guidance`
- `Request disability-support guidance`
- `Request counselling support`
- `I have resolved this`
- `I do not need support right now`
- `Report incorrect information`

For ordinary academic support, declining or ignoring an invitation does not create a disciplinary record.

After a response, the student sees the consequence before final confirmation.

Example:

> Your adviser will receive your appointment request. They will see that you asked for academic support; they will not receive counselling information.

---

### 4. Student-initiated support request

#### 4.1 Start request

The student selects:

> `Request support`

They choose the kind of support needed:

- Academic advising
- Course/assessment difficulty
- Academic-skills support
- Financial-support guidance
- Disability/accessibility support
- Accommodation/residence support
- Counselling/wellbeing support
- Career support
- Other approved support

The system asks only questions needed to route the request.

#### 4.2 Privacy-first routing

Before the student submits, the page states exactly who will receive the request.

Example:

> Your request will go to the Counselling Centre. Your lecturer and academic adviser will not see the details unless you choose to share information or an approved safeguarding rule requires limited disclosure.

For academic-support requests:

> Your request will go to your academic adviser and/or programme support team. It will not include private counselling records.

#### 4.3 Request form

The form includes:

- Support category
- Optional course or academic period
- Preferred contact method
- Preferred appointment times
- Accessibility/communication requirement where the receiving service needs it
- Brief explanation
- Consent/acknowledgement relevant to the service
- Urgent-help warning where appropriate

The student can choose:

> `I prefer not to provide details now`

This creates a request for contact without forcing disclosure.

---

### 5. Counselling and wellbeing boundary

#### 5.1 Counselling is separate

A student may:

- Self-refer directly to counselling.
- Accept a counselling offer from an adviser/support office.
- Be referred through an approved safeguarding process.

An academic observation alone must not automatically create a counselling case.

#### 5.2 Counselling referral sequence

For an ordinary referral:

1. Student selects or accepts `Request counselling support`.
2. The system explains that the Counselling Centre receives the request.
3. Student chooses contact/appointment preference.
4. Counsellor triages and accepts the referral.
5. Student receives appointment/support information.
6. Adviser receives only an appropriate service status, if they made the referral.

Adviser-visible status is limited to:

- Counselling offered
- Student accepted
- Counselling Centre received referral
- Appointment scheduled
- Support in progress
- Student declined
- Follow-up no longer required

The adviser does **not** see session notes, diagnosis, personal disclosures, clinical assessment or counselor-only risk documentation.

#### 5.3 Urgent support

The system displays a distinct urgent-support route:

> If you or someone else is in immediate danger, use the institution’s emergency contact or local emergency services now. This portal request is not monitored as an emergency channel.

The exact emergency contact is configurable and verified by the responsible office. The portal must never promise immediate response unless the service actually provides it.

---

### 6. Appointment booking

#### 6.1 Availability

A student can book appointments only with:

- Their assigned adviser
- An authorized programme support team
- A service to which they have access or a valid referral
- A counsellor/service booking pool, subject to confidentiality rules

The scheduler shows:

- Appointment type
- Duration
- In-person/online/phone option
- Location or secure link
- Available times in CAT
- Required preparation
- Cancellation/reschedule policy
- Accessibility option

#### 6.2 Booking flow

1. Student selects service/person.
2. Student selects available time.
3. System checks slot still available.
4. Student adds optional agenda/preparation note.
5. Student confirms.
6. Appointment is created and calendar/notification events are sent.
7. Student sees a booking reference.

Confirmation:

> Your academic-advising appointment is booked for 14 September 2026 at 10:00 CAT.  
> Location: School of Natural Sciences, Room 12.  
> `Add to calendar`  `Reschedule`

#### 6.3 Cancellation and no-show

The student may cancel/reschedule within the configured period. The system explains any policy implications without threat language.

If the student misses an appointment:

> You missed an academic-support appointment on [date]. You can book another appointment or ask your adviser to contact you.

Repeated missed appointments may create an adviser follow-up task, but are not automatically discipline or a wellbeing diagnosis.

---

### 7. Support plan and follow-up

#### 7.1 Student-visible support plan

After an academic-advising appointment, the student can see agreed actions that are appropriate for them to view:

- Book tutorial session
- Submit missed work request where permitted
- Attend academic-skills workshop
- Meet adviser again
- Review course plan
- Contact Finance
- Consider counselling support

Each action contains:

- What needs to happen
- Owner: student, adviser, another office
- Due date
- Completion state
- Secure action link

The student does not see private staff reflections or confidential third-party information.

#### 7.2 Follow-up status

Example:

> **Academic-support follow-up**  
> Next action: Book a CSC 4792 tutorial session  
> Due: 22 August 2026  
> Owner: You  
> `Book tutorial`

A student can mark a task complete only where the task is student-confirmable. Actions requiring staff verification remain `Awaiting confirmation`.

#### 7.3 Resolution

When the follow-up is complete, the student sees:

> This academic-support follow-up is complete. You may request further support at any time.

Closing a support follow-up does not erase academic evidence, counselling records or official results. Each record follows its own retention/access rule.

---

### 8. Student-data correction and transparency

#### 8.1 Correcting observation information

If the student selects `This information is not correct`, they choose a reason:

- I submitted the activity
- I was not enrolled at the time
- The course/activity is incorrect
- The data is outdated
- Other

The student can provide a short explanation or attach approved evidence where necessary.

The interface states:

> This will be reviewed by the responsible academic team. It does not change your official result or course record by itself.

#### 8.2 What the student can see

The student may see:

- Reason for an outreach invitation
- Source system and last-confirmed time
- Support invitations and their own responses
- Their appointments
- Student-visible agreed actions
- Service status appropriate to the referral

The student does not automatically see:

- Internal scoring/priority rules
- Other students’ data
- Staff-only triage notes
- Counselling records
- Fraud/security flags
- Staff disciplinary observations
- Sensitive information supplied by a third party where disclosure could create risk

---

### 9. Notifications and communication

Notifications are created for:

- New support invitation
- Adviser assignment/change
- Appointment booked, changed, cancelled or missed
- Support request received
- Referral status change
- Student task deadline
- Follow-up reminder
- Data-correction outcome

Sensitive details are only in the authenticated portal. Email/SMS stays neutral:

> You have an update about a support request. Sign in to view it securely.

The system suppresses duplicate outreach when an active support case already exists for the same concern.

---

### 10. Failure and recovery catalogue

| Situation | Student-facing response | System behaviour |
|---|---|---|
| Adviser not assigned | Show programme office route | Create assignment work item |
| Appointment slot taken before confirmation | Explain and show remaining slots | Do not create duplicate booking |
| Online appointment link unavailable | Show service update and alternative contact | Alert responsible service |
| Student declines ordinary support | Record respectfully; no discipline label | Close/monitor under configured policy |
| Student reports inaccurate observation | Explain review process | Create evidence/review task |
| Moodle data stale | Show last-confirmed time | Prevent unsupported conclusions |
| Counselling appointment capacity full | Show next available route and urgent-support advice | Maintain referral queue |
| Adviser changes role/department | Preserve case history; show new responsible contact | Reassign authorized active tasks |
| Message delivery fails | Show in-portal message as authoritative | Retry approved delivery channel |
| Student cannot access appointment tools | Offer accessible/assisted booking route | Record support need without exposing details unnecessarily |

---

### 11. Architecture contract

#### 11.1 Core entities

| Entity | Purpose |
|---|---|
| Adviser assignment | Student-to-adviser relationship, scope and effective period |
| Student-success observation | Explainable academic/support signal |
| Support invitation | Human-reviewed outreach offered to student |
| Student support request | Student-initiated request for service |
| Referral | Controlled handoff to support service |
| Appointment | Scheduled meeting/service interaction |
| Support plan | Student-visible agreed actions and due dates |
| Support follow-up | Managed case state and escalation path |
| Observation-correction request | Student challenge to observation accuracy |
| Restricted counselling case | Confidential service record, separate from academic support case |

#### 11.2 Commands

| Command | Main result |
|---|---|
| `ViewStudentSupportStatus` | Produces student-safe support view |
| `RespondToSupportInvitation` | Records student response |
| `CreateStudentSupportRequest` | Routes student request to authorized service |
| `RequestCounsellingSupport` | Creates confidential counselling referral |
| `BookStudentSupportAppointment` | Reserves validated appointment slot |
| `RescheduleStudentSupportAppointment` | Changes appointment under policy |
| `RecordStudentSupportPlanAction` | Records permitted student action |
| `ChallengeStudentSuccessObservation` | Opens observation-correction review |
| `CloseStudentSupportFollowUp` | Records authorized resolution |

#### 11.3 Events

- `StudentSupportInvitationPublished`
- `StudentSupportInvitationResponded`
- `StudentSupportRequestCreated`
- `StudentCounsellingReferralCreated`
- `StudentSupportAppointmentBooked`
- `StudentSupportAppointmentChanged`
- `StudentSupportPlanUpdated`
- `StudentObservationCorrectionRequested`
- `StudentSupportFollowUpResolved`

#### 11.4 Audit and privacy requirements

Record:

- Student/person and active academic context
- Observation source, freshness and human-review outcome
- Invitation/response status
- Appointment creation/change/no-show
- Referral recipient/service and minimum necessary context
- Student-visible support-plan actions
- Access to restricted counselling workspace
- Authorized closure/escalation action

Do not place counselling notes, diagnosis, personal disclosures, safeguarding assessments or private accommodation information in general student-success, adviser, lecturer, dean or finance records.

---

### 12. Part 6 acceptance tests

Part 6 is accepted when:

- Students can identify their adviser, book accessible appointments and request academic help.
- Support invitations explain what occurred and are phrased supportively.
- A student can challenge incorrect observation data without changing an official record automatically.
- Students can decline ordinary support without being labelled for discipline.
- Counselling is a separate, consent-aware referral path; academic observation never automatically becomes a counselling case.
- Advisers can see only limited service status after a counselling referral, never confidential notes.
- Student-visible support plans distinguish student tasks from staff-owned tasks.
- Appointment, missed-appointment and capacity states offer clear recovery.
- Notifications protect sensitive information outside the secure portal.
- Moodle/activity data is visibly fresh, explainable and never interpreted as a diagnosis.
- Keyboard, screen-reader, mobile, low-bandwidth and privacy-boundary testing pass.

---

## Recovered part 7

_Source record: `018-role-blueprint-2-new-student-and-continuing-undergraduate-student.md`_

## Role Blueprint 2 — New Student and Continuing Undergraduate Student  
### Part 7: Student requests and casework — programme change, leave of absence, withdrawal, readmission, deferment, complaints, disciplinary boundaries and records updates

This part defines formal student-initiated requests that can affect a programme, registration, finance, academic record or student status.

The governing rule is:

> A request is not its outcome. The student submits a controlled case; an authorized role decides it under a versioned policy, and the system records the resulting change.

---

### 1. Student requests home

The student opens:

> Requests and support → My requests

The page lists all active and historical requests the student is permitted to view.

Each request card shows:

- Request type
- Reference number
- Current status
- Date submitted
- Responsible office
- Next action and deadline
- Effect on current registration, where known
- `View request`

Example:

> **Programme-change request**  
> REF: REQ-2027-00418  
> Status: Awaiting academic review  
> Submitted: 14 January 2027  
> Current effect: Your existing registration remains active.  
> `View request`

The system distinguishes requests from routine support messages and from official decisions.

---

### 2. Shared request lifecycle

Every formal request uses a clear lifecycle.

| State | Student-facing wording |
|---|---|
| Draft | Not submitted |
| Submitted | Request received |
| Needs information | Action needed: provide information |
| Under review | Being assessed |
| Awaiting external/committee decision | Awaiting authorized decision |
| Approved | Request approved |
| Approved with conditions | Request approved; complete conditions |
| Declined | Request not approved |
| Withdrawn | Request withdrawn |
| Cancelled/expired | Request closed without decision or after deadline |
| Implementing | Approved change is being applied |
| Completed | Change has been applied |
| Review/appeal available | You may request review by [deadline], where policy permits |

The student must never see an unexplained status such as only `Pending`.

---

### 3. Programme-change request

#### 3.1 Purpose

A programme-change request lets a student request movement from one programme to another. It is not a simple profile edit or course-selection action.

#### 3.2 Start screen

The student selects:

> `Request programme change`

The system first shows eligibility/context information:

- Current programme and year level
- Requested programme/offering search
- Applicable intake/academic period
- Published programme-change rules
- Deadline
- Required academic/entry conditions
- Current registration effect
- Possible finance/sponsorship effect
- Whether a place/capacity decision is required

#### 3.3 Request form

The student provides:

- Requested programme
- Reason category
- Explanation
- Supporting evidence where policy requires it
- Acknowledgement of possible course, fee and progression effects
- Contact preference

Before submission, the system gives an impact preview:

> If approved, your current course plan may no longer apply. Finance, timetable and Moodle access will be reassessed. Your current programme remains active until the change is formally implemented.

#### 3.4 Decision and implementation

Approval does not immediately rewrite the programme record. The system:

1. Records authorized academic/records decision.
2. Checks target programme capacity and entry/progression rules.
3. Determines effective period.
4. Produces migration plan: credit recognition, required courses, repeat status and fee impact.
5. Requires further student acknowledgement only where policy requires it.
6. Applies programme change in a controlled transaction.
7. Recalculates registration, finance, timetable and Moodle entitlement.
8. Preserves historical programme/registration record.

Student confirmation:

> Your programme change to [programme] is complete from [effective period]. Review your updated registration tasks.

---

### 4. Leave of absence

#### 4.1 Request start

The student selects:

> `Request leave of absence`

The page explains:

- Difference between leave, withdrawal and failing to register
- Eligible period(s)
- Deadline
- Documentation/evidence rule
- Academic, financial, accommodation and sponsorship implications
- Return/readmission requirements
- Whether approval is required before stopping attendance

The system must never tell a student “you are on leave” merely because they stopped accessing Moodle or missed classes.

#### 4.2 Request form

The student chooses:

- Start period/date
- Intended return period, where required
- Reason category
- Minimum necessary explanation
- Supporting evidence through secure document workflow, if required
- Preferred contact method

Sensitive reasons are minimized. Staff who only need the absence period/outcome must not automatically see confidential medical or counselling evidence.

#### 4.3 Approval and effect

If approved:

> **Leave of absence approved**  
> Effective: [date/period]  
> Expected return: [period]  
> Current registration effect: [stated effect]  
> Next required action: Apply for return/readmission by [date], if applicable.

The system then applies only the policy-authorized effects to:

- Registration
- Course attempts
- Fees/payment plan
- Moodle access
- Accommodation
- Sponsorship
- Timetable
- Student status

Each effect is shown before the student confirms any required next step.

---

### 5. Withdrawal from programme or academic period

#### 5.1 Distinction from leave

| Action | Meaning |
|---|---|
| Course drop | Controlled removal of one course; covered in Part 4 |
| Leave of absence | Temporary approved pause with intended return |
| Withdrawal from period | Ends current-period participation under policy |
| Withdrawal from programme | Ends programme enrolment/status |
| Non-registration | No completed registration for a period; not automatically withdrawal |

The interface explains this distinction before the student selects a high-impact request.

#### 5.2 Withdrawal request

The student sees consequences before submission:

- Academic-record effect
- Current course-result effect
- Fee/payment-plan effect
- Refund/credit-review route
- Accommodation/sponsorship effect
- Moodle access effect
- Return/readmission route
- Deadline and approval requirement

Confirmation:

> Request withdrawal from [programme/period]? This request may affect your registration, fees and future return to study. It is not a payment-refund request.

The system uses a separate finance review for refunds/credits.

#### 5.3 Authorized implementation

A withdrawal is implemented only after authorized decision. The system creates an effective-dated student-status change and adjusts dependent entitlements. Historical records remain intact.

---

### 6. Readmission and return from leave

#### 6.1 Availability

A former student or student on approved leave sees:

> `Request return to study`

The page appears only when a policy/configuration allows the request.

It shows:

- Previous programme/status
- Requested return period
- Required conditions
- Outstanding academic/financial requirements
- Evidence/documents required
- Deadline
- Whether the request creates a new application or restores an existing student record

#### 6.2 Decision rules

The system must not blindly restore old access.

Authorized decision process checks:

- Approved leave/withdrawal history
- Programme availability
- Curriculum/catalogue version
- Progression/repeat requirements
- Outstanding finance holds
- Changed entry/registration rules
- Capacity
- Required evidence
- Any authorized restriction

If approved, the system creates a **return plan** that may include updated curriculum mapping, repeat courses, financial tasks and reactivated student entitlements.

---

### 7. Deferment

#### 7.1 Applicant versus student deferment

- An applicant deferment applies before student conversion and belongs to Applicant Blueprint 1.
- A student deferment applies to an approved academic/registration period after student status exists.

The system must keep these records distinct.

#### 7.2 Student deferment request

The student sees:

> `Request deferment`

The page explains the specific process defined for their programme/period and its effect on:

- Current registration
- Offer/return status
- Course schedule
- Fees
- Sponsorship
- Accommodation
- Expected return period

No deferment is effective until the authorized decision is recorded.

---

### 8. Complaints and service concerns

#### 8.1 Complaint categories

The student may submit a service complaint or concern about:

- Admissions/records service
- Finance service
- Teaching/learning service process
- Accommodation/student service
- Accessibility barrier
- Staff conduct, through approved route
- System/service failure
- Other authorized category

The interface tells the student whether the issue is:

- A service complaint
- A result-review request
- A discipline matter
- A harassment/safety report
- An emergency
- Another formal process

It routes the student to the correct process without forcing sensitive information into a generic ticket.

#### 8.2 Complaint form

The student sees:

- Confidentiality notice
- Recipient office
- What information to include
- Evidence upload control
- Emergency/safety route
- Expected handling process
- Anti-retaliation/appropriate conduct statement where applicable
- Reference number after submission

The system provides a safe alternative if the complaint concerns the normal receiving office.

#### 8.3 Student-visible case updates

The student can see:

- Receipt of complaint
- Assigned handling office/team where safe
- Requests for more information
- Outcome/closure statement appropriate for disclosure
- Review/appeal route where available

The student does not see private staff investigation notes, witness details, unrelated disciplinary records or protected disclosures.

---

### 9. Disciplinary-case boundary

The student cannot create, alter or close a disciplinary record through ordinary requests.

If a formal disciplinary case concerns the student:

- The student receives only the notice, rights, meeting details, evidence-access process and response route required by approved policy.
- The system separates allegation, evidence, decision and appeal stages.
- Confidential third-party and investigation information is restricted.
- A support or counselling referral remains separate from discipline unless an authorized safeguarding policy requires a limited connection.
- Academic-support observations do not automatically create discipline cases.

The detailed disciplinary-officer and committee workflow belongs to a later staff role blueprint.

---

### 10. Official-record correction requests

#### 10.1 What can be requested

The student may request correction of controlled records, for example:

- Official/legal name
- Date of birth
- Identity-document details
- Programme/history data shown incorrectly
- Contact-data issue not handled by normal profile update
- Duplicate student record concern

They cannot directly edit these records after they become official.

#### 10.2 Correction form

The page shows:

- Current value, masked where sensitive
- Requested value
- Reason
- Required evidence
- Privacy explanation
- Office responsible
- Resulting impact warning

Example:

> Correcting your official name may affect transcript, certificate and examination records. Your existing official record remains unchanged until Records approves the correction.

---

### 11. Notifications and communication

Notifications are created for:

- Request submitted
- Information requested
- Review/committee decision required
- Request approved, declined or implemented
- Return/readmission window opened
- Complaint response/action
- Disciplinary notice where applicable
- Records correction completed

Email/SMS remain neutral:

> There is an update about a student request. Sign in to view it securely.

High-impact decisions are never conveyed solely by SMS/email. The authoritative notice remains in the authenticated portal.

---

### 12. Failure and recovery catalogue

| Situation | Student-facing behaviour | System behaviour |
|---|---|---|
| Policy window closed | Explain deadline and permitted late-review route | Block ordinary submission |
| Duplicate open request | Link existing request; avoid parallel conflicting cases | Enforce duplicate rules |
| Programme target unavailable | Explain availability/capacity; preserve current status | Do not start invalid transfer |
| Evidence upload fails | Preserve request draft and use secure retry process | Reuse document-safety workflow |
| Withdrawal affects payment | Show separate finance review route | Do not promise refund |
| Readmission decision delayed | Show owner, last update and next expected stage | Escalate according to service rule |
| Complaint concerns receiving office | Offer approved alternative route | Restrict routing/visibility |
| Disciplinary notice requires response | Show deadline and rights/support route | Preserve procedural audit trail |
| Record correction affects issued transcript | Explain reissue/verification process | Version record; preserve history |
| Request decision changes registration | Show precise effective date and updated tasks | Recalculate entitlements/integrations safely |

---

### 13. Architecture contract

#### 13.1 Core entities

| Entity | Purpose |
|---|---|
| Student request | Base controlled request/case |
| Programme-change case | Requested programme movement and implementation plan |
| Leave-of-absence case | Temporary approved study pause |
| Withdrawal case | Controlled programme/period withdrawal |
| Return/readmission case | Request to reactivate study after leave/withdrawal |
| Student deferment case | Authorized period postponement |
| Service complaint case | Complaint/concern workflow |
| Disciplinary case notice | Restricted student-visible disciplinary process record |
| Official-record correction case | Controlled correction of authoritative record |
| Student-status history | Effective-dated status changes |

#### 13.2 Commands

| Command | Main result |
|---|---|
| `CreateStudentRequest` | Starts authorized request case |
| `SubmitProgrammeChangeRequest` | Opens programme-change assessment |
| `SubmitLeaveOfAbsenceRequest` | Opens leave case |
| `SubmitStudentWithdrawalRequest` | Opens withdrawal case |
| `SubmitReadmissionRequest` | Opens return-to-study assessment |
| `SubmitStudentDefermentRequest` | Opens deferment assessment |
| `CreateStudentComplaint` | Routes service complaint safely |
| `RequestOfficialStudentRecordCorrection` | Opens record-correction case |
| `RecordStudentRequestDecision` | Records authorized outcome |
| `ImplementStudentStatusChange` | Applies approved effective-dated change |

#### 13.3 Events

- `StudentRequestSubmitted`
- `StudentRequestInformationRequested`
- `ProgrammeChangeApproved`
- `StudentLeaveApproved`
- `StudentWithdrawalApproved`
- `StudentReadmissionApproved`
- `StudentDefermentApproved`
- `StudentComplaintSubmitted`
- `StudentRecordCorrectionApproved`
- `StudentStatusChanged`
- `StudentRequestImplemented`

#### 13.4 Audit requirements

Record:

- Student/person, active role and academic-period context
- Request type, policy/version and deadline
- Submitted information/evidence references
- Decision-maker role, scope and authority
- Student-visible reason and restricted internal rationale
- Effective date and dependent-system impact
- Student acknowledgement where required
- Notification/delivery and review/appeal outcome
- Access to sensitive complaint, discipline or evidence records

---

### 14. Part 7 acceptance tests

Part 7 is accepted when:

- Students can distinguish course changes, leave, withdrawal, deferment and non-registration.
- High-impact changes are requests with explicit consequences, not profile edits.
- Programme-change approval produces an effective-dated migration plan and safely recalculates registration, finance, timetable and Moodle access.
- Leave/withdrawal/readmission states do not silently erase academic or financial history.
- Refunds remain a separate controlled Finance process.
- Complaint routing is privacy-aware and provides alternatives when the normal office is implicated.
- Academic-support records remain separate from disciplinary processes unless an authorized policy explicitly links them.
- Official-record corrections are evidence-based, versioned and auditable.
- Students see clear request status, next action, responsible office and review route.
- Keyboard, screen-reader, mobile, low-bandwidth, policy-window and cross-system-impact tests pass.

---

## Recovered part 8

_Source record: `019-role-blueprint-2-new-student-and-continuing-undergraduate-student.md`_

## Role Blueprint 2 — New Student and Continuing Undergraduate Student  
### Part 8: Graduation readiness, clearance, award confirmation, transcripts, alumni handoff and post-completion access

This part defines the student experience from approaching programme completion through graduation clearance, Senate/authorized award confirmation, certification and alumni transition.

The key rule is:

> Completing courses does not automatically mean cleared to graduate, and clearance does not automatically mean an award has been formally conferred.

---

### 1. Graduation-readiness home

When a student reaches a configured final-year/completion stage, the student home includes:

> **Graduation readiness**

The card shows:

- Programme and expected completion period
- Academic completion progress
- Outstanding required courses/credits
- Extended activities still in progress
- Clearance items
- Graduation-application status, where required
- Award/ceremony status
- Next required action

Example:

> **Graduation readiness: In progress**  
> 112 of 120 required credits complete  
> Outstanding: Industrial Training final evaluation  
> Expected completion: June 2027  
> `View graduation readiness`

The system must not promise graduation based on an estimated completion date.

---

### 2. Academic-completion audit

#### 2.1 Degree-audit page

Page title:

> Programme completion audit

The page compares the student’s authoritative academic record against the approved programme/curriculum version applicable to them.

It shows:

- Programme and curriculum/catalogue version
- Required credits and completed credits
- Compulsory courses
- Electives/option groups
- Repeat-course outcomes
- Prerequisite completion
- Required practical/clinical/research/industrial-training activities
- Minimum grade/GPA/classification requirements where applicable
- Transfer credits/exemptions
- Outstanding requirements
- Latest audit date/time
- `Request academic advice`

#### 2.2 Requirement states

| State | Student-facing meaning |
|---|---|
| Complete | Requirement is met through an authorized result/credit |
| In progress | Legitimate activity continues; final outcome not yet available |
| Outstanding | Requirement has not yet been met |
| Awaiting result | Assessment occurred; official result is not released |
| Requires review | An academic/records decision is needed |
| Not applicable | Requirement does not apply under approved curriculum/pathway |
| Waived/credited | Requirement met through authorized decision |

An extended research or industrial-training activity continues as `In progress` until its approved completion. It is not shown as failed simply because it crosses academic years.

#### 2.3 Audit integrity

The completion audit uses the student’s applicable historical curriculum version. It must not retrospectively assess the student against a later revised curriculum without an authorized transition decision.

Any exception, substitution or waiver requires:

- Policy/authority reference
- Approver
- Effective date
- Student-visible explanation where appropriate
- Audit record

---

### 3. Graduation application and declaration

#### 3.1 When required

If institutional policy requires students to apply to graduate, the portal creates:

> **Apply to graduate**

The page appears only when the student is sufficiently near completion according to configured rules.

#### 3.2 Application page

The student reviews:

- Official/legal name for certificate
- Programme and award
- Expected completion period
- Contact and delivery details
- Ceremony participation preference, where applicable
- Accessibility/accommodation request for ceremony, handled through restricted support workflow
- Graduation declaration
- Required handwritten signed request letter, where the institution configures it
- Other supporting evidence, if required

The student is told:

> Submitting a graduation application does not confirm that you have met all academic or clearance requirements.

#### 3.3 Official name confirmation

The certificate name is drawn from the official records field, not a display-name field.

If the student identifies an error:

> Request official-record correction

The graduation application remains pending until the authorized records decision is complete where the timing/policy requires it.

#### 3.4 Submission receipt

After valid submission:

> Graduation application received  
> Reference: GRAD-2027-…  
> Your academic and clearance requirements will be assessed.  
> `View graduation status`

---

### 4. Graduation-clearance workflow

#### 4.1 Student-facing clearance page

Page title:

> Graduation clearance

The page divides requirements by responsible area:

1. Academic completion  
2. Examinations and award approval  
3. Finance  
4. Library  
5. Department/school property or professional requirement  
6. Accommodation/residence, where applicable  
7. Research/industrial training, where applicable  
8. Records and identity/certificate details  
9. Graduation application/declaration  

Each item shows:

- Requirement
- Responsible office
- Current status
- Why it matters
- Required student action
- Deadline, if any
- Last updated
- `View details` or action link

Example:

> **Library clearance**  
> Responsible: University Library  
> Status: Awaiting library confirmation  
> No action is required from you now.

#### 4.2 Clearance statuses

| Status | Meaning |
|---|---|
| Not started | Requirement has not been assessed yet |
| Student action required | Student must complete a defined action |
| Awaiting office confirmation | Institution is checking/processing |
| Cleared | Requirement is complete |
| Blocked | A specific issue prevents clearance |
| Waiver/review requested | Authorized exception process is underway |
| Not applicable | Requirement does not apply |
| Expired/recheck required | Earlier conditional clearance needs fresh review |

No clearance item may say only `Pending`.

#### 4.3 Finance clearance

Graduation finance clearance reuses the Finance domain but has its own scope:

> This finance status applies to graduation clearance. It may differ from your past registration clearance.

A student can see approved balance/hold explanation and the controlled payment-review route. They cannot see internal finance notes or sponsor agreements.

#### 4.4 Library/property clearance

The student sees only the necessary summary, for example:

> One library item is overdue. Return it or contact the Library to resolve this clearance.

The system does not reveal other patrons’ information, internal disciplinary notes or staff comments.

#### 4.5 Academic/award clearance

Academic completion and award approval are distinct:

> **Academic requirements:** Complete  
> **Award approval:** Awaiting authorized confirmation

Students must not be shown `Graduated` before the institution’s authorized award process is complete.

---

### 5. Award confirmation

#### 5.1 Award decision

After all applicable academic and institutional requirements are satisfied, an authorized academic/governance process confirms the award.

Student-facing status:

> **Award approved**  
> Your award has been confirmed for [programme/award].  
> Award confirmation date: [date]  
> Ceremony information: [available/pending]

The system records the award authority and date but does not expose confidential committee deliberations.

#### 5.2 Award outcome issues

If award confirmation cannot proceed, the student sees the permitted factual outcome:

> Your graduation review requires further action.  
> Outstanding item: [student-safe explanation]  
> Responsible office: [office]  
> `View graduation clearance`

The system must not invent a reason or expose restricted findings.

#### 5.3 Final classification

Where classification is part of an approved award rule, the system displays it only after authorized confirmation.

The calculation uses:

- Applicable programme/curriculum rules
- Approved course results
- Credits
- Exemptions/substitutions
- Classification policy version
- Authorized exceptions

The UI shows:

> Final classification: [authorized classification]  
> Confirmed on [date].

It must not display a live “predicted class” as an official fact.

---

### 6. Ceremony, certificate and completion documents

#### 6.1 Ceremony information

Where a ceremony is scheduled, the graduate sees:

- Ceremony date/time/location
- Attendance confirmation
- Guest/ticket rules where applicable
- Gown/collection information
- Accessibility/accommodation request route
- Ceremony updates
- Contact route

Attendance does not determine award validity.

#### 6.2 Certificate status

Certificate states are explicit:

- Not yet available
- In production
- Ready for collection
- Dispatched
- Collected
- Replacement requested

Collection/dispatch requires appropriate identity verification and collection audit.

The system must not expose a certificate download unless the institution has an approved, secure digital-certificate service.

#### 6.3 Official documents

The graduate can request controlled documents:

- Official transcript
- Statement of results
- Award confirmation letter
- Graduation confirmation
- Replacement certificate request
- Other approved record

Each document request carries a verification reference and is generated from authoritative award/record data.

---

### 7. Alumni handoff and post-completion access

#### 7.1 Status transition

After award confirmation, the person’s lifecycle may move to:

> **Awarded graduate / alumnus**

The person retains the same identity account. The active workspace becomes:

> Alumni and records

The user can still access permitted historical information without retaining inappropriate student-operational privileges.

#### 7.2 Post-completion access

Permitted access may include:

- Read-only academic record
- Transcript/letter requests
- Certificate status
- Contact-detail updates
- Alumni communications preferences
- Career/alumni services where approved
- Support ticket history where retention permits

Access removed or restricted after completion may include:

- New course registration
- Current Moodle learner enrolment
- Student finance actions unrelated to historic obligations
- Current timetable
- Student-only welfare/service bookings, unless policy permits continuing access

#### 7.3 Alumni communication preferences

Alumni may manage optional communication preferences independently from mandatory record/security notices.

The system must keep consent versions, channel preferences and opt-out history without deleting required academic-record communications.

---

### 8. Failure and recovery catalogue

| Situation | Student-facing behaviour | System behaviour |
|---|---|---|
| Final course result not released | Show `Awaiting result`; do not claim completion | Re-run audit after official release |
| Extended activity still in progress | Explain milestone/completion date | Exclude from failed-course assumption |
| Curriculum mismatch | Show `Requires academic review` | Route to programme/records decision queue |
| Clearance office delayed | Show owner, last update and escalation route | Create overdue service task |
| Finance issue disputed | Provide finance-review route | Keep clearance status policy-controlled |
| Official name correction pending | Explain certificate processing may wait | Link to records-correction case |
| Ceremony details unavailable | Show award status separately | Do not imply award is pending |
| Certificate production delayed | Show production status and help route | Create operational work item |
| Award data/integration mismatch | Do not publish award until reconciled | Reconcile records/governance output |
| Student accesses old student link | Route to alumni/records workspace | Preserve permitted historical access |

---

### 9. Accessibility and low-bandwidth requirements

- Degree-audit and clearance tables have accessible headers and mobile-card equivalents.
- Every requirement uses textual status, not colour alone.
- Graduation tasks remain available on a mobile browser.
- Certificate/legal-name information is masked where full display is unnecessary.
- Ceremony accessibility requests use a privacy-aware route.
- All documents have accessible HTML detail before optional PDF download.
- Long clearance pages offer in-page navigation and progress summary.
- Delayed office/integration status includes last-updated time and help route.

---

### 10. Architecture contract

#### 10.1 Core entities

| Entity | Purpose |
|---|---|
| Programme completion audit | Versioned evaluation against applicable curriculum |
| Graduation application | Student request/declaration to graduate |
| Graduation-clearance item | Department/office requirement and status |
| Award recommendation | Authorized academic completion recommendation |
| Award record | Confirmed programme award |
| Award classification | Authorized classification where applicable |
| Ceremony participation record | Optional event attendance/arrangements |
| Certificate record | Production, collection and replacement status |
| Alumni profile/entitlement | Post-completion access and communication state |
| Academic document request | Transcript/award-letter/confirmation process |

#### 10.2 Commands

| Command | Main result |
|---|---|
| `GenerateProgrammeCompletionAudit` | Evaluates academic completion under applicable curriculum |
| `SubmitGraduationApplication` | Creates controlled graduation request |
| `UpdateGraduationClearanceItem` | Records authorized office outcome |
| `RequestGraduationClearanceReview` | Opens an exception/dispute route |
| `ConfirmAcademicAward` | Records authorized award decision |
| `CalculateAwardClassification` | Applies versioned approved classification rule |
| `PublishAwardConfirmation` | Releases award to graduate |
| `UpdateCertificateStatus` | Records certificate lifecycle event |
| `TransitionStudentToAlumniEntitlement` | Adjusts post-completion portal access |
| `IssueAcademicDocument` | Creates verified official document |

#### 10.3 Events

- `ProgrammeCompletionAuditGenerated`
- `GraduationApplicationSubmitted`
- `GraduationClearanceItemUpdated`
- `GraduationClearanceCompleted`
- `AcademicAwardConfirmed`
- `AwardClassificationConfirmed`
- `AwardPublishedToGraduate`
- `CertificateStatusUpdated`
- `StudentAlumniTransitionCompleted`
- `AcademicDocumentIssued`

#### 10.4 Audit requirements

Record:

- Student/programme/curriculum version
- Degree-audit inputs and result
- All clearance-item owners, status changes and evidence references
- Graduation declarations and required handwritten-letter attachment, where configured
- Award authority, date and classification-rule version
- Certificate production/collection/distribution event
- Alumni entitlement change
- Academic-document request, issue and verification references
- Every exception, substitution, waiver and appeal outcome

---

### 11. Part 8 acceptance tests

Part 8 is accepted when:

- Students can see an accurate, curriculum-version-aware completion audit.
- Extended research/industrial-training activities remain `In progress` until officially completed.
- Clearance items identify owner, status, next action and last update.
- Academic completion, institutional clearance and formal award confirmation are distinct.
- A graduation application does not falsely promise award or ceremony eligibility.
- Certificate name uses the official record and controlled correction workflow.
- Financial, library and other clearance information is limited to necessary student-facing detail.
- Award/classification is published only after authorized confirmation.
- Ceremony, certificate and award status are independent and understandable.
- Alumni access retains permitted records while removing inappropriate student-operational actions.
- Academic documents are generated from authoritative records with verification references.
- Keyboard, screen-reader, mobile, low-bandwidth, delayed-clearance and cross-system reconciliation tests pass.

**Role Blueprint 2 is now complete: New Student and Continuing Undergraduate Student.**

The next role blueprint should be:

> **Role Blueprint 3: Lecturer and Tutor** — beginning with teaching assignment, course workspace, real SIS–Moodle synchronization, class-list integrity and assessment-plan setup.
