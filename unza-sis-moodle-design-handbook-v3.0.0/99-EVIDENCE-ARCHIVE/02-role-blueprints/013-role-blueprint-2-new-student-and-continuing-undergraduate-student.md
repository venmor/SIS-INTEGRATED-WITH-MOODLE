<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: a2a122f2-636a-55e3-8dd8-eb873f9f4a0d; chronological message: 144. -->

# Role Blueprint 2 — New Student and Continuing Undergraduate Student  
## Part 2: Financial clearance, sponsorship status, payment options and registration holds

This part defines what a student sees and can do when finance affects registration.

The core rule is:

> **Invoice issued** ≠ **payment attempted** ≠ **payment confirmed** ≠ **financially cleared** ≠ **registered**

Financial clearance is an authorized status for a defined academic period. It is not simply a number displayed on a dashboard.

---

## 1. Finance home

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

## 2. Financial-clearance status model

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

## 3. Invoice and charge breakdown

### 3.1 Invoice page

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

### 3.2 Charge categories

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

### 3.3 Disputed charge

Where policy permits, a student may select:

> `Question this charge`

The student selects a reason, writes an explanation and attaches approved supporting evidence through the safe document process.

The system creates a finance-review case. It does not remove the charge or automatically clear registration merely because the student disputes it.

---

## 4. Student payment journey

### 4.1 Reuse of secure payment controls

The technical payment controls from Applicant Blueprint Part 7 are reused:

- Approved providers/methods only
- Provider tokenization where available
- Server-side confirmation
- Idempotency protection
- Reconciliation before final status
- Neutral notifications
- Controlled refund/review process

The student experience differs because payments may apply to invoices, instalments, accommodation or other authorized obligations—not only an application fee.

### 4.2 Payment selection screen

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

### 4.3 Payment methods

Methods are configuration driven and may include:

- Mobile money
- Bank transfer/deposit
- Approved online card provider
- In-person cashier
- Sponsor payment
- Approved instalment/payment plan

The student never enters raw card details into the SIS when a hosted provider page is available.

### 4.4 Payment confirmation

After authoritative reconciliation:

> **Payment confirmed**  
> ZMW [amount] was applied to your January 2027 invoice.  
> Remaining balance: ZMW [amount]  
> Financial clearance: [Complete / Further action required]

`Payment confirmed` and `Financial clearance complete` are separate messages because a payment may not settle every applicable requirement.

---

## 5. Sponsorship, scholarship and third-party funding

### 5.1 Student-facing sponsorship card

Where funding is recorded, Finance home shows:

> **Sponsorship status: Confirmation in progress**  
> Sponsor: [approved display name]  
> Academic period: January 2027  
> Finance is verifying the sponsorship authorization.  
> No action is required from you now.

The student sees only the information needed to understand their financial obligation. They do not see sponsor contracts, internal budget notes or other sponsored students.

### 5.2 Sponsorship outcomes

| Status | Student-facing explanation |
|---|---|
| Not recorded | No confirmed sponsorship is currently linked to this period |
| Submitted for review | Funding information was received; Finance is reviewing it |
| Confirmed | Sponsorship has been applied to eligible charges |
| Partial sponsorship | Sponsor covers specified charges; student must address remaining balance |
| Expired/not applicable | Sponsorship does not currently apply to this period |
| Declined/withdrawn | Sponsorship could not be applied; see Finance for permitted explanation |
| Requires student action | Finance needs an approved document or confirmation from the student |

### 5.3 Sponsor evidence

If the student must provide a sponsorship letter or award notice:

- It is requested as a scoped finance task.
- Upload uses the Part 6 safe-document process.
- The system does not say sponsorship is confirmed merely because a letter is uploaded.
- Finance/authorized officers complete formal assessment.

### 5.4 Sponsor payments

A sponsor or third party cannot access the student portal merely from knowing a student number. Any sponsor-facing function requires its own future role blueprint and controlled identity/authorization model.

---

## 6. Payment plans and financial exceptions

### 6.1 Payment-plan request

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

### 6.2 Approved plan

If approved, the student sees:

> **Payment arrangement approved**  
> You may complete registration for January 2027 under this arrangement.  
> Next instalment: ZMW [amount] due [date].

The registration system receives an authorized clearance entitlement with its scope and expiry—not a vague note saying “allowed.”

### 6.3 Declined or expired plan

> Your requested payment arrangement was not approved. Your financial clearance remains incomplete. Review payment options or contact Finance.

If a plan is later missed, the system applies only the policy-approved effect. It does not automatically make decisions beyond the configured rule.

### 6.4 Emergency or exceptional cases

Where the institution has an approved hardship/emergency route, the student may submit a limited request. The system keeps:

- Financial evidence
- Welfare/counselling content
- Academic records

separated by role and purpose. Finance staff do not gain access to confidential counselling notes merely because a hardship request exists.

---

## 7. Financial holds and registration effect

### 7.1 Hold card

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

### 7.2 Hold resolution

The system removes or updates the hold only when:

- Payment is authoritatively reconciled
- Sponsorship is confirmed
- Payment plan is approved
- Fee waiver/exception is approved
- Authorized finance staff resolve the hold under policy

The student cannot clear a hold by uploading a payment screenshot or changing a payment reference.

### 7.3 Temporary clearance

If temporary/conditional clearance is permitted, the card says:

> **Temporary financial clearance until 31 January 2027**  
> You may register now. Your next required finance action is due on [date].

The expiry and consequences are explicit and auditable.

---

## 8. Receipts, credits, refunds and payment review

### 8.1 Finance history

`Payment history` shows:

- Date
- Payment/credit/refund description
- Amount/currency
- Applied charge(s)
- Status
- Receipt/reference
- `View receipt`

It does not disclose provider secrets or unrelated financial records.

### 8.2 Excess/duplicate payment

If an overpayment or possible duplicate is detected:

> Finance is reviewing a payment linked to your account. Do not make another payment for this item until the review is complete.

The student can see the review status but cannot initiate an uncontrolled automatic transfer/refund.

### 8.3 Refund/credit

Refunds and credits follow authorized finance rules. The student sees:

- Reason category
- Amount
- Status
- Decision date
- Next step
- Receipt after completion

Any payout-account change requires a controlled identity and anti-fraud process.

---

## 9. Failure and recovery catalogue

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

## 10. Accessibility and low-bandwidth requirements

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

## 11. Architecture contract

### 11.1 Core entities

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

### 11.2 Commands

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

### 11.3 Events

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

### 11.4 Audit requirements

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

## 12. Part 2 acceptance tests

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

**Please approve Role Blueprint 2, Part 2: Financial clearance, sponsorship status, payment options and registration holds.**

After approval, I will continue with Part 3: **programme progression, course selection, prerequisite checks, repeats and first/continuing registration workflow.**

---

## Following user responses before the next design record

### User message 0145

Proceed to part 3,here remember we had issues like someone taking half courses and full courses where maybe if you fail less than 3 half courses and clear a full course you can repeat the failed courses and proceed with the to the new year with new next year's courses.but failing a full course triggers repeat year,and also failing more than 3 half course triggers full repeat year on the failed courses,payments should be course based,some people with ca of 50 should be able to sit for supplementary exams if they failed less than 3 courses but people with ca of 40 shouldn't sit for any supplementary exams after result publications,you can proceed to next year if a course can be introduced in 3rd but can be completed in 4th year where it is not academically taight maybe research or industrial training course. It shouldn't be marked as failed
