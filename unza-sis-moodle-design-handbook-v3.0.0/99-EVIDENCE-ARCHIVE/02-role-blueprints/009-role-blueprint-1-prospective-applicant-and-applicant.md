<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 5e950cf0-9383-5aba-b832-1dd4d17c3e16; chronological message: 132. -->

# Role Blueprint 1 — Prospective Applicant and Applicant  
## Part 8: Application review, declarations, formal submission, receipt and duplicate-submission prevention

This part defines the final applicant-controlled stage before Admissions receives an application.

The central rule is:

> An application is submitted only when the server has validated the required conditions, recorded the applicant’s declarations and issued an authoritative submission receipt.

A green progress bar, a saved draft, an uploaded document or a payment attempt does not equal submission.

---

## 1. Entry to review

The applicant reaches review from the application overview by selecting:

> `Review and submit`

The action is enabled only when the system believes the application may be ready for review. It is not a submission button.

If requirements are incomplete, the applicant sees:

> Your application is not ready to submit yet.

The page lists each blocking issue with a direct action.

Example:

| Issue | Required action |
|---|---|
| Grade 12 result statement not uploaded | `Upload document` |
| Mathematics result missing | `Update qualifications` |
| Application fee not confirmed | `View payment status` |
| Required declaration not accepted | `Review declaration` |

The applicant can still enter the review page to understand what remains. The system must not hide the final stage behind a disabled button without an explanation.

---

## 2. Review page

### 2.1 Purpose

The review page lets the applicant inspect exactly what will be submitted, correct permitted errors and make informed declarations.

Page title:

> Review your application

Supporting text:

> Check your information carefully. After you submit, Admissions will receive this version. Changes will require an approved correction or clarification process.

### 2.2 Review structure

The page presents a structured summary rather than a long ungrouped form.

Sections:

1. Programme choices
2. Personal details
3. Contact details
4. Citizenship/residency information, where applicable
5. Qualifications and results
6. Programme-specific responses
7. Supporting documents
8. Application-fee status or waiver
9. Declarations
10. Submission confirmation

Each section shows:

- Completion state
- A concise summary
- Last updated time
- `Edit` action where editing is still permitted
- Required supporting-document status
- Any unresolved warning

Example:

> **Qualifications and results — Ready**  
> Grade 12 / ECZ route · 8 subject results declared  
> ECZ result statement: Received; verification required  
> `Edit qualifications`

### 2.3 Sensitive-data display

The review page uses purposeful masking:

- NRC/passport numbers are partially masked.
- Full document contents are not embedded in the summary.
- Financial transaction references are masked.
- Sensitive category information is displayed only where necessary for the applicant to verify it.

The applicant can deliberately select a controlled `View full value` action where justified. This action expires when the page/session ends and is not available in ordinary notifications.

### 2.4 Edit-return behaviour

Selecting `Edit` returns the applicant to the correct section. Before leaving review, the system warns if there are unsaved changes on the review screen.

After saving edits:

- The system recalculates relevant requirements.
- The applicant returns to review.
- Changed sections are highlighted as `Updated since your last review`.
- If a change makes a previously complete requirement incomplete, the submit action is blocked and the reason is shown.

---

## 3. Submission readiness checks

Before showing the final submission action, the server performs authoritative checks.

### 3.1 Required checks

- Applicant account is active and required contact methods are verified.
- Application is in editable draft state.
- Programme choice/intake remains open and applicable.
- Submission deadline has not passed according to server time.
- Required application sections are complete and internally valid.
- Required documents are uploaded and meet the configured minimum stage for submission.
- Required payment is confirmed, or an authorized waiver/exemption exists.
- Required programme-specific conditions are satisfied.
- Required declarations are presented in the correct version and accepted.
- No unresolved duplicate-application rule is triggered.
- Applicant is still authorized to act on the application.
- No security restriction prevents submission.
- Current draft version is the version the applicant reviewed.

### 3.2 Document-stage rule

The institution must configure whether a document must be:

- Uploaded only
- Security scanned
- Technically readable
- Formally verified

before application submission is allowed.

For most ordinary applications, formal document verification will occur after submission. The application must state that clearly:

> Your documents have been received and will be formally verified during assessment.

The system must not require formal verification before submission unless a published rule specifically requires it.

### 3.3 Readiness changes while applicant is reviewing

If a prerequisite changes—such as payment becoming confirmed or a programme closing—the page updates with a clear message.

Example:

> Your application fee was confirmed at 14:32. You may now submit your application.

Or:

> This intake closed while you were reviewing your application. Your draft was not submitted.

The server remains authoritative; browser state alone cannot finalize submission.

---

## 4. Declarations

### 4.1 Declaration design

Declarations are not a single vague checkbox. Each declaration is:

- Versioned
- Owned by an authorized office
- Linked to a stated purpose
- Applicable to a programme/intake/applicant route
- Presented in readable language
- Accepted separately where legally or operationally necessary
- Recorded with date/time and application version

Typical declarations may cover:

- Information is complete and accurate to the applicant’s knowledge
- Documents are authentic and may be verified
- The applicant understands that providing false information may have consequences under applicable institutional rules
- Consent/acknowledgement for necessary admissions processing
- Programme-specific declaration, where approved
- Confirmation that the applicant reviewed their programme choices

The system distinguishes required processing acknowledgements from optional communication preferences.

### 4.2 Declaration page

The final review page contains a section titled:

> Confirm your application

For each declaration, the applicant sees:

- Full statement or a clear expandable version
- Link to the governing notice/policy
- Whether acceptance is required
- Acceptance control
- Current document/version date

The applicant must be able to read the full declaration without leaving the submission process.

A simple typed name, checkbox or configured electronic confirmation may be used according to policy. The system must not claim a signature has a legal effect beyond what the institution has approved.

### 4.3 Validation

If a required declaration is not accepted:

> Confirm that the information in your application is accurate before submitting.

The system preserves other accepted declarations and does not reset the entire page after one correction.

### 4.4 Changed declaration version

If a declaration changes after the applicant last reviewed it:

> The application declaration has been updated. Read and confirm the latest version before submitting.

Previous acceptance does not automatically apply to the new version where policy requires fresh confirmation.

---

## 5. Formal submission interaction

### 5.1 Final confirmation screen

After all readiness checks pass, the applicant sees a final confirmation panel:

> **Submit application?**  
> You are submitting your application for:  
> BSc Computer Science · January 2027 intake  
>
> Admissions will receive the version shown above. You may not edit it directly after submission.  
>
> `Submit application`  
> `Return to review`

The submit button is explicit and distinct from `Save draft`.

### 5.2 Submission sequence

When the applicant selects `Submit application`:

1. Button changes to `Submitting application…`.
2. Repeat clicks and duplicate taps are blocked.
3. The current draft version and a unique idempotency key are sent.
4. The server repeats all readiness and authorization checks.
5. The server creates an immutable application-submission snapshot.
6. The application state changes to `Submitted`.
7. Direct applicant editing is locked.
8. A submission reference and receipt are generated.
9. Audit event and reliable notification event are written in the same logical transaction.
10. Admissions work-item creation occurs through the controlled workflow/event path.
11. Applicant receives confirmation only after the transaction succeeds.

The applicant must never see a success message before the application server confirms submission.

### 5.3 Submission confirmation

Success page:

> **Application submitted successfully**  
> Reference: APP-2027-001842  
> Submitted: 28 August 2026, 14:37 CAT  
> Programme: BSc Computer Science · January 2027  
>
> Admissions has received your application. You will be notified if more information is needed or when a decision is available.

Actions:

- `Download submission receipt`
- `View application status`
- `Return to applicant home`

A neutral SMS/email notice may say:

> Your application has been submitted. Sign in to view your receipt and status.

---

## 6. Submission receipt

### 6.1 Purpose

The receipt is the authoritative applicant-facing record that the institution received a specific application version at a specific time.

It is not an admission letter, payment receipt or proof that all evidence has been verified.

### 6.2 Receipt contents

The receipt contains:

- Institution identity
- Submission reference
- Submission timestamp in Zambia time
- Applicant name
- Programme choice(s) and intake
- Application version/snapshot identifier
- Submission status
- Payment/waiver completion status
- Document summary/statuses
- Outstanding post-submission action, if any
- Secure receipt-verification reference
- Contact/help route

It must not include:

- Full NRC/passport number
- Full payment credentials
- Full document contents
- Staff notes
- Internal risk/security data
- Other applicants’ data

### 6.3 Availability

The receipt is:

- Displayed immediately after confirmation
- Available in `My applications`
- Available for secure download while policy permits
- Reissuable from the authoritative submission snapshot

A downloaded copy is an applicant extract; it does not permit changes to the official application.

---

## 7. Duplicate-submission prevention

### 7.1 Browser-level prevention

The interface prevents ordinary accidental duplication by:

- Disabling the submit button after the first action
- Showing in-progress state
- Keeping the confirmation page open
- Avoiding automatic browser retries that could re-submit
- Using a one-time idempotency reference for each submit attempt

### 7.2 Server-level prevention

The server is the final protection.

It must:

- Treat the submission command as idempotent.
- Reject a repeat submission of the same draft with the same key by returning the original success result.
- Reject or route for review duplicate applications that violate configured admissions rules.
- Enforce unique references.
- Check the application state before state transition.
- Use database transaction/concurrency controls so two devices cannot submit different versions simultaneously.
- Write submission, audit and outbox records together or recover safely.

### 7.3 Applicant duplicate scenarios

| Situation | Applicant experience |
|---|---|
| Double tap/click | Button remains `Submitting application…`; only one submission is created |
| Connection drops after submit | “We are checking whether your application was submitted. Do not submit again yet.” |
| Same draft opened on two devices | First valid submit succeeds; second device receives “This application was submitted at [time].” |
| Existing submitted application conflicts with new draft | Explain applicable rule and direct applicant to existing application or help route |
| Applicant begins a second draft for same offering | Continue existing draft instead of creating a new one |
| Submitted application is re-opened via back button | Show submitted receipt/status, never a writable old form |

---

## 8. Failure and recovery catalogue

| Situation | Applicant-facing response | System behaviour |
|---|---|---|
| Required section incomplete | List exact missing items with direct links | Do not create submission |
| Payment still pending | Explain payment is not yet confirmed; do not require duplicate payment | Preserve draft/review state |
| Document scan/readability failure | Direct applicant to replace affected document | Block only according to configured rule |
| Deadline passed | Explain exact deadline/time; application remains unsubmitted | Lock submission according to policy |
| Declaration changed | Require applicant to read/accept new version | Record current version only |
| Session expires | Preserve safe draft; require sign-in before submission | Never preserve submission authorization |
| Network interruption | Check idempotency result before enabling retry | Prevent duplicate submissions |
| Draft changed elsewhere | Show conflict; require review of latest version | Do not submit stale version |
| Security restriction | Explain secure next step without exposing detection rule | Prevent submission until resolved |
| Receipt generation delay | Confirm only after authoritative submission; receipt can be reissued | Queue receipt event safely |

---

## 9. Post-submission applicant state

After submission, applicant navigation changes:

- `Continue application` becomes `View application`
- Draft edit actions disappear
- Status timeline begins with `Application submitted`
- Documents display post-submission states
- Applicant tasks appear only for authorized clarification, correction or further evidence
- Payment section becomes a history/receipt view
- The applicant sees support contact and expected next stage

The system must not allow post-submission edits through browser cache, old URLs or stale API requests.

---

## 10. Architecture contract

### 10.1 Core entities

| Entity | Purpose |
|---|---|
| Application review snapshot | Read model for applicant’s current review |
| Application declaration | Versioned declaration accepted by applicant |
| Application submission snapshot | Immutable formal record submitted to Admissions |
| Submission receipt | Applicant-facing proof of receipt |
| Submission idempotency record | Prevents duplicate processing |
| Submission readiness assessment | Server-side check record and blocking reasons |
| Admissions intake work item | Controlled handoff into staff assessment workflow |

### 10.2 Commands

| Command | Main result |
|---|---|
| `GenerateApplicationReview` | Creates current review model and readiness assessment |
| `AcceptApplicationDeclaration` | Records acceptance of current required declaration version |
| `SubmitApplication` | Validates, snapshots and formally submits application |
| `IssueApplicationSubmissionReceipt` | Generates/reissues authoritative submission receipt |
| `CheckApplicationSubmissionStatus` | Resolves uncertain submit result safely |

### 10.3 Events

- `ApplicationReviewGenerated`
- `ApplicationDeclarationAccepted`
- `ApplicationSubmissionAttempted`
- `ApplicationSubmitted`
- `ApplicationSubmissionBlocked`
- `ApplicationSubmissionDuplicatePrevented`
- `ApplicationSubmissionReceiptIssued`
- `AdmissionsAssessmentWorkItemCreated`

### 10.4 Audit requirements

The submission audit record must include:

- Applicant/person and application identifiers
- Active application/draft version
- Programme offering(s), intake and requirement versions
- Submission time and authoritative server time zone
- Readiness-check result
- Declaration identifiers and accepted versions
- Payment/waiver status
- Document status summary
- Submission idempotency/correlation reference
- Resulting submission snapshot and receipt identifier
- Any failed/duplicate attempt, without storing unnecessary sensitive values

---

## 11. Part 8 acceptance tests

Part 8 is accepted when:

- Applicants can review every submitted section in a structured, understandable format.
- The review page makes all missing, invalid or blocked requirements explicit.
- Sensitive values are masked by default.
- Required declarations are versioned, readable and individually recorded.
- Submission cannot occur until server-side checks pass.
- A draft, successful upload or payment attempt is never represented as formal submission.
- The system creates an immutable snapshot and receipt only after successful submission.
- Network interruptions, double clicks, multiple devices and browser back navigation cannot create duplicate submissions.
- After submission, normal applicant editing is blocked at the UI and server levels.
- Receipt contents are accurate, privacy-preserving and reissuable.
- Admissions receives a controlled work item only after authoritative submission.
- Keyboard, screen-reader, mobile, low-bandwidth and submission-recovery tests pass.

**Please approve Part 8: Application review, declarations, formal submission, receipt and duplicate-submission prevention.** After approval, I will proceed to Part 9: **application status tracking, clarification requests, controlled post-submission corrections, decision viewing and applicant support.**

---

## Following user responses before the next design record

### User message 0133

Part 9: **application status tracking, clarification requests, controlled post-submission corrections, decision viewing and applicant support. proceed**
