<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: aaec6710-8b29-52ac-90e2-213358352b35; chronological message: 247. -->

# Cross-Blueprint Implementation Set, Part 4 — Error, recovery and notification catalogue

This catalogue prevents each development agent from inventing different failure behaviour. Every workflow must use the relevant approved pattern below.

## 16.1 Error contract

Every error experience must state:

1. What happened.
2. What was not completed.
3. What information/value was preserved.
4. What the user should do next.
5. A support reference where needed.

Never expose stack traces, database errors, credentials, internal IDs as the primary message, or another person’s information.

## 16.2 Error categories

| ID | Category | Standard behaviour |
|---|---|---|
| `ERR-VAL` | Invalid/missing input | Identify field and explain correction |
| `ERR-PERM` | Permission denied | Explain minimum safe reason; offer correct route |
| `ERR-CONFLICT` | Concurrent change | Preserve draft; compare/reload/resolve |
| `ERR-NET` | Lost connection | Preserve work; verify before retry |
| `ERR-EXT` | External-provider failure | Record request; show pending/retry state |
| `ERR-DUP` | Duplicate action | Return existing record/status |
| `ERR-STALE` | Data is outdated | Show last-confirmed date; prevent unsupported final action |
| `ERR-RULE` | Policy/workflow condition blocked | Explain rule and next authority/action |
| `ERR-SEC` | Security/rate limit | Neutral message; safe recovery route |
| `ERR-SVC` | Platform/service outage | State affected service and safe alternative |
| `ERR-UNKNOWN` | Unexpected error | Preserve work; create support reference |

## 16.3 Validation errors

### Required behaviour

- Validate at useful points, not every keystroke.
- On submission failure, show a page-level error summary.
- Each error links to the relevant field.
- Keep all valid entries.
- Do not say only `Invalid input`.

Example:

> **We need 2 corrections before you can submit.**  
> - Enter your mobile number.  
> - Upload the required handwritten signed letter.

## 16.4 Permission and authority errors

Examples:

> You cannot approve this result because your examination authority is not active for this course and period.

> This information is restricted and is not required for your active role.

Recovery options may be:

- Switch to an authorized workspace
- Request access
- Ask the responsible office
- Return to permitted work

The system must not confirm whether a hidden record exists.

## 16.5 Connection loss and uncertain completion

For any formal action—submission, payment, approval, sign-off, result release or regulatory delivery—the system uses idempotency.

User message:

> We could not confirm whether your request was received. Do not submit again yet. We are checking your reference.

Possible outcomes:

- Confirmed received
- Not received; safe to retry
- Received; confirmation delayed
- Existing request found
- Manual support required

The UI never tells a user to “try again” until it knows retrying cannot create a duplicate institutional action.

## 16.6 External-provider failures

| Process | Safe user-facing wording | System recovery |
|---|---|---|
| Payment confirmation delayed | “Payment confirmation is still in progress. Do not pay again.” | Monitor callback; reconciliation case if overdue |
| Moodle enrolment delayed | “Your course access is being prepared. Your official registration is complete.” | Retry/reconcile enrolment |
| Email/SMS failure | “Your update is available in the portal.” | Retry/approved alternate channel |
| Qualification verification unavailable | “Verification is still in progress.” | Retry/provider incident; Admissions review |
| Regulatory delivery uncertain | “Delivery could not yet be confirmed.” | Check idempotency/acknowledgement before retry |
| Identity-provider disruption | “Sign-in is temporarily unavailable.” | Incident and approved fallback/recovery |

An external provider cannot cause a false institutional status.

## 16.7 Data conflict and stale information

### Concurrent change

> This record changed while you were editing it. Your work has not overwritten the newer version.

Actions:

- Compare permitted changes
- Reload latest version
- Save a copy for review
- Ask responsible owner to resolve

### Stale data

> Last confirmed update: 25 August, 14:32. Current refresh failed, so this information may be out of date.

High-impact actions must be blocked or require configured authority when necessary facts are stale.

## 16.8 Business-rule blocks

A rule block explains the actual condition and route.

Examples:

> You cannot finalize registration because financial clearance is still under review. Your selected courses are saved.

> You are not eligible for supplementary assessment under the currently applicable rule. You may request review if you believe the information is incorrect.

The system displays the policy/rule reference where appropriate, but does not expose raw technical expression logic.

## 16.9 Security, fraud and rate-limit responses

Security messages remain neutral.

> We cannot complete this action right now. For your security, try again later or use the account-recovery route.

> This payment evidence needs review. We will contact you if more information is required.

The system must not publicly accuse a student or applicant of fraud based solely on a mismatch, repeated attempt or provider reversal.

## 16.10 Incident and outage communication

When a service fails:

- Last certified/confirmed data remains labelled with its original date.
- No partial refresh is presented as complete.
- The user sees the affected service and safe next action.
- An operational incident is created.
- Regulatory or deadline-sensitive issues escalate to the responsible role.

Example:

> Moodle is temporarily unavailable. Your official registration remains valid. Please try the Learning area again later.

## 16.11 Notification catalogue

Notifications are authoritative in-system records. Email and SMS are delivery channels.

Every notification contains:

- Event/decision
- Plain-language explanation
- Required action, if any
- Deadline
- Direct secure link
- Responsible office
- Delivery state

| Event | Recipient-facing message |
|---|---|
| Application clarification | “More information is needed for your application. Respond by 3 September.” |
| Payment received, pending reconciliation | “Payment received; Finance is checking how it applies to your account.” |
| Moodle access ready | “Your learning access for CSC 4792 is now active.” |
| Result released | “Your official results are available securely in the portal.” |
| Support invitation | “Your academic adviser has sent you a support message.” |
| Appointment reminder | “You have an upcoming Student Welfare appointment.” |
| Evidence request | “Quality evidence is required for the assigned review.” |
| Finding response due | “A quality finding requires your response by 10 September.” |
| Role expiry | “Your assigned role expires in 7 days.” |
| Integration incident | “Course access updates are delayed; official registration is unaffected.” |

Sensitive details must not appear in SMS/email previews.

## 16.12 Notification delivery and escalation

Delivery states:

- Created
- Queued
- Sent to provider
- Delivered, where supported
- Read in system
- Failed
- Retried
- Suppressed by optional preference
- Escalated through approved workflow

A delivery failure does not mean the underlying workflow action failed. For a mandatory notice, the workflow may create a staff follow-up task under configured policy.

## 16.13 Recovery and escalation rules

Every recoverable problem has:

- Owner
- Target response time
- Retry/reconciliation rule
- Escalation threshold
- Student/staff communication rule
- Closure evidence

Example:

> **Moodle enrolment delayed**  
> Owner: Integration Support  
> Target: 30 minutes  
> Escalate: after 2 failed retries or 60 minutes  
> Closure evidence: successful enrolment plus reconciliation against SIS registration.

## 16.14 Audit requirements

For material errors and recovery, record:

- Error category
- Workflow/action reference
- Actor/role and scope
- Record reference
- Idempotency reference
- Provider/reference where relevant
- Retry/reconciliation attempts
- Resolution evidence
- User notification and delivery state
- Incident/escalation reference
- Time and outcome

Logs must minimize personal/sensitive content.

## 16.15 Acceptance requirements

Part 4 is accepted only when:

- Every error gives a plain-language explanation, preservation status and recovery action.
- Formal actions use idempotency and uncertain-outcome checking.
- External failures never create false payment, registration, result or submission states.
- Data conflicts and stale data are visible and safely handled.
- Business-rule blocks explain the actual condition.
- Notifications are consistent, secure and linked to action.
- Failure recovery has owners, deadlines, escalation and audit evidence.

Please approve **Part 4**. Next is **Cross-Blueprint Implementation Set, Part 5: end-to-end acceptance scenarios and test strategy**.

---

## Following user responses before the next design record

### User message 0248

You may proceed
