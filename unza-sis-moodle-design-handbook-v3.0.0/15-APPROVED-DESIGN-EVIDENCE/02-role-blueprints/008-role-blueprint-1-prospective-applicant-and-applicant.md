<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 5c7ed56e-c640-51f2-96e3-3a04e04dc489; chronological message: 129. -->

# Role Blueprint 1 — Prospective Applicant and Applicant  
## Part 7: Application-fee payment, fee waiver, reconciliation, receipts, refunds and payment failure recovery

This part defines the applicant’s fee experience from fee calculation to confirmed payment, including waivers, reconciliation, refunds and recovery from failed or uncertain payments.

The key rule is:

> A payment attempt, bank transfer, mobile-money prompt or uploaded receipt is not confirmed payment until the authorized reconciliation process records it.

---

## 1. Payment scope and separation

The application-fee journey handles only fees configured for an admissions application. It does not create tuition billing, student registration fees, accommodation fees or a student finance account.

Each fee obligation is tied to:

- Applicant
- Application
- Programme offering and intake
- Applicable applicant category
- Fee schedule/version
- Currency
- Amount
- Payment deadline
- Waiver or exemption status
- Reconciliation state

The applicant always sees the approved amount, currency and rule that applies to the current application.

---

## 2. Payment home

The applicant reaches payment from:

- Application overview: `Application fee`
- A required-action card
- Applicant home: `Payments`
- Submission readiness check

The page title is:

> Application fee

It displays:

- Application reference
- Programme/intake
- Fee description
- Amount and currency
- Payment deadline
- Payment status
- Permitted payment methods
- Fee-waiver/exemption route, if available
- Help route

Example:

> **Application fee**  
> Application: APP-2027-001842  
> BSc Computer Science · January 2027  
> Amount due: ZMW [configured amount]  
> Payment deadline: 30 September 2026, 23:59 CAT  
> Status: Payment required  
>
> `Pay now`  `Request fee waiver`  `View payment instructions`

The system must not display an amount as authoritative when the fee schedule is unavailable or uncertain.

---

## 3. Fee calculation and visibility

### 3.1 Fee source

The payment amount is calculated only from an approved, versioned fee schedule and configured eligibility rules.

Inputs may include:

- Intake
- Programme or application type
- Applicant category
- Study level
- Approved waiver/exemption status
- Currency rule
- Authorized late-fee rule where applicable

The applicant sees a plain-language explanation:

> This fee applies to undergraduate applications for the January 2027 intake under the current fee schedule.

### 3.2 Fee change before payment

If the official fee changes before payment, the system shows:

> The application fee has changed from ZMW [old amount] to ZMW [new amount] under the updated fee schedule dated [date]. Review the new amount before paying.

The rule governing applications already started must be explicit:

- original fee preserved,
- new fee applies immediately, or
- transition rule applies.

The schedule version used is recorded in the application payment obligation.

### 3.3 Fee change after payment

A confirmed payment is not silently re-priced. If an additional amount is legitimately required under an approved rule, it appears as a separate, explained obligation—not as an unexplained changed receipt.

---

## 4. Payment methods

The institution configures the methods offered for each fee obligation. Possible methods include:

- Mobile money
- Bank transfer/deposit
- Online card payment through approved provider
- Approved in-person cashier payment
- Sponsorship or institutional payment route
- Fee waiver/exemption

The page does not show unavailable payment methods.

### 4.1 Mobile-money payment

Selecting mobile money shows:

- Amount
- Applicant/application reference
- Mobile number to be charged or payment instructions
- Provider-specific confirmation message
- `Continue to payment`
- `Cancel`

Before redirecting or initiating a provider request, show a final summary:

> You are about to request payment of ZMW [amount] for application APP-2027-001842. Check the number and amount before continuing.

The applicant should not have to enter their application reference manually if the payment provider supports secure reference transfer.

### 4.2 Online card payment

The application redirects to, or securely embeds, the approved payment provider’s hosted payment page.

The SIS must:

- Use provider tokens/references rather than handling raw card numbers where possible.
- Clearly say when the applicant is leaving the portal.
- Preserve the application context.
- Return the applicant to a secure payment-result page.
- Treat provider return parameters as untrusted until server-side verification occurs.

Applicant message before redirect:

> You will continue to our approved payment provider to pay ZMW [amount]. Your application will remain open in this browser.

### 4.3 Bank transfer or deposit

The page provides:

- Approved bank/payment details
- Exact amount
- Unique payment reference
- Deadline
- Expected reconciliation period
- Instructions not to alter the reference
- `I have made this payment`

Selecting `I have made this payment` does not mark the fee as paid. It changes the applicant-facing status only to:

> Payment reported; reconciliation pending

The system may allow receipt/proof upload only if the institution has approved it, and it must use the document-safety workflow from Part 6.

### 4.4 In-person payment

For approved cashier payment, the system provides:

- Application reference
- Amount due
- Authorized payment location/hours
- Reference to present at the cashier

After payment, the applicant sees:

> Payment will appear here after Finance has reconciled it. Keep your official receipt.

A cashier receipt number is not automatically trusted until reconciliation confirms it.

---

## 5. Payment states

| Internal state | Applicant-facing status | Meaning |
|---|---|---|
| `NotRequired` | No application fee required | No payment is required under the applicable rule |
| `PaymentRequired` | Payment required | Fee must be paid or waived before the next controlled stage |
| `PaymentInitiated` | Payment in progress | A provider/payment process has started |
| `PaymentReported` | Payment reported; reconciliation pending | Applicant indicated bank/cash payment, or a provider response is being checked |
| `PaymentPendingProvider` | Waiting for payment confirmation | Provider has not yet confirmed final outcome |
| `PaymentConfirmed` | Payment confirmed | Finance/system reconciliation accepted the payment |
| `PaymentFailed` | Payment was not completed | No confirmed payment was received |
| `PaymentExpired` | Payment request expired | Initiated payment was not completed in time |
| `PaymentDuplicateReview` | Payment needs review | Possible duplicate or unmatched payment requires Finance review |
| `WaiverRequested` | Fee waiver request under review | Applicant requested permitted waiver/exemption |
| `Waived` | Fee waived | Authorized waiver removes payment requirement |
| `RefundPending` | Refund request under review | Authorized refund workflow is in progress |
| `Refunded` | Refund completed | Refund is confirmed through approved Finance process |

The applicant must never see `Paid` based only on a browser redirect, screenshot or self-reported transfer.

---

## 6. Payment confirmation and reconciliation

### 6.1 Reliable confirmation sequence

For a payment-provider method:

1. Applicant initiates payment.
2. Provider processes the request.
3. Provider returns an immediate user-facing result where available.
4. Provider sends a signed server-to-server confirmation/webhook.
5. The system validates signature, amount, currency, reference, transaction uniqueness and obligation state.
6. The payment is recorded or routed for exception review.
7. The fee obligation becomes `PaymentConfirmed`.
8. The application receives a payment receipt.
9. The applicant receives an in-portal notification and neutral delivery notice.

For bank, cash or sponsorship routes:

1. Payment or authorization is recorded by the source.
2. Finance/reconciliation process matches it to the unique application reference.
3. Amount, currency, payer, date and duplicate conditions are checked.
4. An authorized user confirms or rejects the match.
5. The applicant sees the confirmed outcome.

### 6.2 Confirmed-payment result

The applicant sees:

> **Payment confirmed**  
> Amount: ZMW [amount]  
> Application: APP-2027-001842  
> Receipt number: REC-2027-…  
> Confirmed on: [date/time]  
>
> Your application fee requirement is complete. Continue your application.

Actions:

- `Download receipt`
- `Return to application`
- `View payment history`

The receipt is generated from authoritative payment records and is downloadable only by the applicant or an authorized role.

### 6.3 Amount mismatch

If the amount received does not match the obligation:

> We received a payment linked to your application, but the amount requires review. Do not pay again until Finance updates this page.

The system must not automatically mark a partial or excess payment as complete.

---

## 7. Fee waiver or exemption

### 7.1 Availability

`Request fee waiver` is shown only where the fee policy permits a waiver/exemption route.

The page explains:

- Eligibility basis/categories
- Evidence required
- Decision authority
- Deadline
- Expected response time where defined
- Whether the application can proceed while review is pending

### 7.2 Waiver request flow

The applicant:

1. Selects the approved waiver/exemption reason.
2. Reads the requirements.
3. Uploads required evidence through the Part 6 document process.
4. Confirms that the information is accurate.
5. Selects `Submit waiver request`.

The system creates a separate waiver case connected to the payment obligation. It does not alter the fee amount merely because a request was made.

Applicant confirmation:

> Your fee-waiver request has been received. Your application fee is still under review. We will notify you when a decision is made.

### 7.3 Waiver decision

Possible outcomes:

- Approved → obligation becomes `Waived`
- Partially approved → revised explained obligation, where policy allows
- More evidence required → applicant task with deadline
- Not approved → original payment obligation remains, with payment deadline or revised deadline if authorized
- Withdrawn → applicant may pay normally

Applicant-facing explanations must give the next action without revealing restricted staff notes.

---

## 8. Payment failure and recovery

### 8.1 Provider-declared failure

If a provider confirms failure:

> Your payment was not completed. No confirmed payment has been received for this application.

Actions:

- `Try again`
- `Choose another payment method`
- `Return to application`
- `Get payment help`

The applicant does not need to re-enter unrelated application details.

### 8.2 Connection lost or uncertain result

If the applicant loses connection after authorizing payment:

> We are checking your payment status. Do not pay again yet.

The page shows a processing reference and periodically checks the authoritative payment status.

Possible final outcomes:

- Payment confirmed
- Payment not completed; safe to retry
- Payment still awaiting confirmation
- Payment requires Finance review

### 8.3 Duplicate payment protection

Before creating a new payment request, the system checks for:

- Existing confirmed payment
- Active provider payment request
- Recently initiated request with uncertain outcome
- Bank/cash report awaiting reconciliation
- Duplicate transaction reference

If a potential duplicate exists:

> A payment attempt for this application is still being checked. Do not pay again until the status is updated.

### 8.4 Payment deadline arrives while payment is pending

If the applicant initiated payment before the deadline but confirmation arrives later, the institution’s policy must define the outcome.

The applicant sees a clear state, for example:

> Your payment was started before the deadline and is awaiting confirmation. Admissions will apply the approved payment-timing rule.

The system records:

- Obligation deadline
- Payment initiation time
- Provider/cash/bank received time
- Confirmation/reconciliation time
- Applicable deadline rule

---

## 9. Refunds

### 9.1 Applicant-facing boundary

Applicants cannot simply press `Refund` on a confirmed fee. Refunds require an approved institutional policy and authorized Finance process.

The applicant may see:

> Request payment review

when a permitted reason exists, such as:

- Duplicate payment
- Payment made for wrong application
- Approved application withdrawal condition
- System or reconciliation error
- Other policy-defined reason

### 9.2 Payment-review request

The applicant selects a reason, provides the minimum required explanation and confirms.

The page states:

> A payment review is not a guaranteed refund. Finance will assess your request under the applicable fee policy.

The system creates a controlled payment-review case. It does not expose bank-account change fields before Finance determines that a refund is appropriate.

### 9.3 Refund decision and payout

If refund is approved:

- Finance uses an approved, verified payout process.
- The original payment reference remains linked to the refund.
- The applicant sees refund amount, method, decision date and current status.
- Any repayment destination change requires strong verification and audit.
- The applicant receives a refund receipt after final confirmation.

Applicant status:

> Refund approved; payment is being processed by Finance. We will update this page when the refund is completed.

---

## 10. Notifications and receipts

### 10.1 In-system notification is authoritative

Important payment events create in-system notifications:

- Payment required
- Payment initiation recorded
- Payment confirmed
- Payment failed
- Reconciliation pending beyond service period
- Fee waiver requested/approved/declined
- Payment review/refund status changed

Email/SMS messages are neutral:

> There is an update about your application payment. Sign in to view it securely.

They must not include an NRC, full payment identifier, banking details or sensitive waiver reason.

### 10.2 Receipt contents

A receipt contains only approved information:

- Institution identity
- Receipt number
- Applicant/application reference
- Payment description
- Amount and currency
- Payment date/confirmation date
- Payment method summary
- Transaction/reference number, appropriately masked where necessary
- Fee-schedule version where relevant
- Verification or receipt-validation reference

A receipt does not expose raw card data, full bank details, internal reconciliation notes or provider secrets.

---

## 11. Architecture contract

### 11.1 Core entities

| Entity | Purpose |
|---|---|
| Fee schedule | Versioned authorized fee rules |
| Payment obligation | Amount/rule due for one application |
| Payment initiation | Request started with a provider or channel |
| Payment transaction | Received payment record |
| Reconciliation case | Matching/review process for incoming payment |
| Payment receipt | Authoritative confirmation document |
| Waiver request | Applicant request for permitted fee waiver |
| Waiver decision | Authorized outcome linked to obligation |
| Payment review/refund case | Controlled financial exception process |
| Refund transaction | Confirmed repayment record |

### 11.2 Commands

| Command | Main result |
|---|---|
| `CalculateApplicationFeeObligation` | Creates/version-controls payment obligation |
| `InitiateApplicationFeePayment` | Starts approved payment method |
| `RecordPaymentProviderConfirmation` | Validates provider confirmation |
| `ReportOfflineApplicationPayment` | Records applicant-reported bank/cash payment |
| `ReconcileApplicationPayment` | Authoritatively matches/accepts/rejects payment |
| `IssueApplicationPaymentReceipt` | Creates authoritative receipt |
| `RequestApplicationFeeWaiver` | Opens waiver case |
| `RecordFeeWaiverDecision` | Approves/declines/adjusts waiver by authority |
| `RequestPaymentReview` | Opens permitted duplicate/error/refund review |
| `RecordRefundDecision` | Records authorized refund decision |
| `ConfirmApplicationFeeRefund` | Confirms completed refund |

### 11.3 Events

- `ApplicationFeeObligationCreated`
- `ApplicationFeePaymentInitiated`
- `ApplicationFeePaymentProviderConfirmed`
- `ApplicationFeePaymentReported`
- `ApplicationFeePaymentReconciled`
- `ApplicationFeePaymentFailed`
- `ApplicationFeeReceiptIssued`
- `ApplicationFeeWaiverRequested`
- `ApplicationFeeWaiverDecided`
- `ApplicationPaymentReviewRequested`
- `ApplicationFeeRefundApproved`
- `ApplicationFeeRefundCompleted`

### 11.4 Audit requirements

For all payment/waiver/refund actions, record:

- Applicant and application identifiers
- Fee schedule and obligation version
- Amount/currency
- Payment method
- Provider/bank/cash reference, protected and masked in ordinary views
- Initiation, receipt and confirmation times
- Reconciliation actor and outcome
- Waiver/refund authority and decision reason
- Receipt identifier
- Correlation/idempotency reference
- All material status transitions

Raw card data, provider secrets and confidential financial verification information must never be stored in general application logs.

---

## 12. Part 7 acceptance tests

Part 7 is accepted when:

- Each applicant sees the correct versioned fee obligation for their application.
- A payment attempt is never treated as confirmed payment without authoritative reconciliation.
- Payment methods shown are configured, available and explained.
- Provider redirects, webhooks and browser return messages cannot independently mark a fee as paid.
- Duplicate payment attempts are detected and applicants are told not to pay again while status is uncertain.
- Failed, expired, interrupted and uncertain payments preserve application context and offer recovery.
- Bank/cash payments remain pending until authorized reconciliation.
- Fee-waiver requests are separate, evidence-based and auditable.
- Fee-waiver request status does not silently cancel the original obligation.
- Receipts are generated only from authoritative confirmed-payment records.
- Refunds follow controlled approval and payout processes.
- Payment data is protected, access controlled and absent from ordinary notifications/logs.
- Mobile, low-bandwidth, keyboard, screen-reader, provider-failure and reconciliation-delay tests pass.

**Please approve Part 7: Application-fee payment, fee waiver, reconciliation, receipts, refunds and payment failure recovery.** After approval, I will continue with Part 8: **application review, declarations, formal submission, receipt and duplicate-submission prevention.**

---

## Following user responses before the next design record

### User message 0130

we can proceed to Part 8: **application review, declarations, formal submission, receipt and duplicate-submission prevention**
