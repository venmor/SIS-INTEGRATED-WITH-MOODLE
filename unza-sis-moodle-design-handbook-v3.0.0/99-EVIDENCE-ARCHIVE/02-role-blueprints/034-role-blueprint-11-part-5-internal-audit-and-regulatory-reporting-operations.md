<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 83e81584-250c-5107-89ca-4737bd3898d4; chronological message: 213. -->

# Role Blueprint 11, Part 5 — Internal audit and regulatory reporting operations

## 11.77 Internal Auditor workspace

The Internal Auditor independently tests whether institutional controls operate as approved. They do not perform routine admissions, finance, examinations, quality or support-service work.

Header:

> **Internal Audit workspace · Institutional scope · 2026 Audit Plan**

Navigation:

- Audit plan
- Active audits
- Evidence requests
- Control tests
- Audit findings
- Management responses
- Follow-up verification
- Audit committee packages
- Archive

The home page prioritizes:

- Audits requiring planning or fieldwork
- Evidence requests overdue
- Control tests needing review
- Open audit findings
- Management actions past due
- Audit Committee deadlines
- Access/logging exceptions requiring investigation

## 11.78 Audit independence and data boundaries

The Auditor may access evidence only where:

- The audit engagement is active.
- The audit scope authorizes it.
- The evidence is necessary for the control being tested.
- Access is logged with audit purpose.
- Restricted information is minimized, masked or independently approved.

The Auditor may inspect whether counselling access controls work. They do not routinely read counselling notes.

The Auditor may inspect finance refund approvals. They do not approve refunds.

The Auditor may inspect examination result-release controls. They do not release results.

## 11.79 Action AUD-PLN-01 — Create audit engagement and test plan

The Auditor begins from:

> **Audit plan → Create engagement**

### Step 1 — Engagement scope

Fields:

- Audit title
- Audit type: operational, financial, academic, IT, compliance, follow-up or configured equivalent
- Scope and period
- Objectives
- Standards/control framework
- Audited office/process
- Planned start/end dates
- Audit Lead and team
- Required independence declarations
- Classification
- Audit Committee route

### Step 2 — Control objectives

Each objective links to a control, for example:

> Control objective: Only authorized users may release official results after required board approval.

The Auditor specifies:

- Control owner
- Expected control activity
- Frequency
- Evidence expected
- Test method
- Population/sample definition
- Sampling rationale
- Materiality/exception rule
- Required access

### Step 3 — Audit plan review

Before activation, the system checks:

- Auditor independence
- Scope completeness
- Conflicts with operational assignments
- Required Audit Committee approval
- Access requests and classification

Primary action:

> `Activate audit engagement`

No evidence request is sent until the engagement is active.

## 11.80 Action AUD-TST-02 — Test a control

The Auditor opens:

> **Active audits → Result-release control → Test control**

The screen shows:

- Control objective
- Required evidence
- Defined population
- Test period
- Sampling method
- Sample selected
- Test steps
- Expected outcome
- Exceptions found
- Working-paper notes
- Review/sign-off status

### Example test

**Control:** Official results can be released only after approved result-board decision.

The Auditor tests a configured sample of released result packages and verifies:

- Correct board package exists
- Required authority/signatories were active
- Release occurred after approval
- Snapshot/checksum was valid
- No later unauthorized alteration occurred
- Student notification followed official release

The Auditor records each sampled result package as:

- Passed test
- Failed test
- Not testable—evidence unavailable
- Exception accepted under policy

They cannot change the result package while testing.

### Architecture behaviour

**Command:** `RecordAuditControlTest`

Creates:

- Test execution record
- Sample reference
- Evidence references viewed
- Outcome
- Exception, if any
- Working-paper version
- Reviewer/sign-off requirement
- Audit log

**Event:** `AuditControlTestRecorded`

## 11.81 Audit evidence request

The Auditor selects:

> `Request audit evidence`

The request states:

- Audit engagement
- Control being tested
- Evidence requested
- Period and sample scope
- Due date
- Classification
- Secure submission route
- Contact for procedural clarification

The recipient sees:

> **Audit evidence requested**  
> Control: official result release authorization  
> Required: result-board approval records for selected packages  
> Due: 4 September 2026  
> `Provide evidence`

The system distinguishes between an audit evidence request and a Quality Assurance request. They may share document-control infrastructure, but remain separate workflows and records.

## 11.82 Audit finding and management response

An audit finding follows the same disciplined principles as QA, but it remains an independent audit finding with its own framework.

It records:

- Control objective
- Condition observed
- Criterion/expected control
- Cause or contributing factor, where established
- Risk/effect
- Evidence and sample basis
- Recommendation
- Management response owner
- Due date
- Follow-up verification requirement
- Audit Committee route

Management can:

- Accept finding and submit action plan
- Provide additional evidence
- Disagree with evidence-based explanation
- Request factual correction
- Request an authorized extension

Management cannot alter the Auditor’s original finding or working papers.

The Auditor independently verifies completion before recommending closure to the configured authority.

## 11.83 Audit Committee package

The Auditor generates a frozen package containing:

- Audit plan and scope
- Control-test outcomes
- Findings and severity rationale
- Management responses
- Overdue actions
- Follow-up verification
- Limitations
- Required Audit Committee decisions

Committee members declare conflicts, review the package, record decisions and receive only the evidence necessary for their governance role.

---

# Regulatory Reporting User workspace

## 11.84 Role boundary

The Regulatory Reporting User prepares and coordinates an official report. They do not decide academic outcomes, change source records or invent figures to meet a deadline.

Header:

> **Regulatory Reporting workspace · Institution-wide · Reporting Year 2026**

Navigation:

- Reporting calendar
- Draft submissions
- Certified metrics
- Evidence and attachments
- Validation exceptions
- Approval and sign-off
- Delivery tracking
- Regulator correspondence
- Corrections and resubmissions
- Submission archive

## 11.85 Reporting calendar and obligations

The home page shows each configured obligation:

> **Annual enrolment return**  
> Regulator: configured authority  
> Due: 30 September 2026  
> Status: Data preparation  
> Required approvals: 0 of 3  
> `Open submission`

For each obligation, the system stores:

- Regulator/body
- Report type
- Template version
- Deadline and extension rules
- Required metrics
- Required evidence
- Approval chain
- Submission method
- Contact route
- Retention and classification
- Correction/resubmission policy

## 11.86 Action REG-PRP-01 — Prepare official submission

The Reporting User selects:

> **Reporting calendar → Annual enrolment return → Prepare submission**

The system creates a draft with:

- Submission reference
- Report template version
- Reporting period
- Institutional scope
- Required sections
- Metric/data requirements
- Approval workflow
- Deadline
- Source snapshot status

### Submission preparation screen

Each section shows:

- Field/question
- Required source metric or evidence
- Certified status
- Definition and population
- Data date
- Validation state
- Responsible Metric Owner
- Permitted explanation field
- Attachment requirement

Example:

> **Field: Total first-year enrolment**  
> Source: certified metric ENR-1.4  
> Period: 2026 intake  
> Definition: students with completed registration as at configured census date  
> Value: 2,430  
> Data fresh as at: 25 August 2026  
> `View source report`

The Reporting User cannot replace `2,430` with another number. If it is wrong, they raise a data-quality issue against the authoritative source.

## 11.87 Validation before approval

The system validates:

- Required fields
- Template version
- Metric certification status
- Formula and total consistency
- Population overlap/double counting
- Mandatory evidence
- Required narrative explanation
- Data freshness
- Small-cell/privacy rules
- Signatory authority
- Prior submission/resubmission status

A failure is specific:

> **Cannot progress to approval**  
> Graduate-outcome field uses metric GRD-4.0, which is currently under data-quality review. Use a newly certified metric or resolve the source issue.

The system does not allow staff to bypass a validation failure by entering a hand-calculated figure.

## 11.88 Action REG-APR-02 — Approve and sign official submission

An authorized signatory opens:

> **Approvals → Regulatory submission awaiting sign-off**

They see:

- Report identity and deadline
- Submission version
- Section summary
- Certified-source status
- Unresolved limitations
- Required evidence
- Previous submission history
- Delivery method
- Legal/regulatory declaration
- Their signatory authority

The signatory can:

- Approve and sign
- Return for correction
- Request clarification
- Delegate review if permitted
- Decline with reason

Primary action:

> `Approve official submission`

Confirmation:

> You are approving Submission REG-2026-0041 for official delivery. This approval is attached to the frozen submission version and does not authorize changes to source academic or financial records.

## 11.89 Action REG-SUB-03 — Deliver and confirm submission

After all approvals, the authorized submission role selects:

> `Submit to regulator`

The system:

1. Rechecks frozen version, checksum and signatory state.
2. Creates delivery attempt with idempotency reference.
3. Sends using configured secure method.
4. Records transport outcome.
5. Waits for acknowledgement where supported.
6. Moves the submission to the appropriate status.

Statuses:

- Draft
- Data-quality review required
- Validation failed
- Awaiting approval
- Approved for delivery
- Delivery in progress
- Submitted—acknowledgement pending
- Submitted—acknowledged
- Delivery failed
- Correction required
- Superseded by resubmission
- Archived

A provider timeout produces:

> Delivery could not be confirmed. Do not submit again yet. The system is checking the delivery reference.

The system checks before permitting retry, preventing duplicate returns.

## 11.90 Regulator query, correction and resubmission

A regulator query creates a linked response case:

- Original submission version
- Regulator reference
- Query wording and date
- Deadline
- Responsible owner
- Affected section/metric
- Required evidence
- Approval path
- Response method

If a source value must change:

1. Correct the authoritative source through its own controlled workflow.
2. Recalculate and certify the affected metric.
3. Create a new submission version.
4. Explain the correction.
5. Obtain required approvals.
6. Submit a correction/resubmission.
7. Preserve the original submitted package and acknowledgement.

The system never overwrites a submitted regulator return.

## 11.91 Reporting access and exports

Reports and export files include:

- Requester
- Purpose
- Report/template version
- Filters
- Classification
- Row count
- Approver where required
- Download time
- Expiry
- File checksum

An exported spreadsheet is an extract. It is never an authoritative source and cannot be re-uploaded as an official correction.

## 11.92 Commands, events and audit

| Command | Responsible role |
|---|---|
| `CreateAuditEngagement` | Internal Auditor |
| `RecordAuditControlTest` | Assigned Auditor |
| `IssueAuditFinding` | Authorized Auditor |
| `SubmitAuditManagementResponse` | Assigned management owner |
| `RecordAuditFollowUpVerification` | Auditor |
| `CreateRegulatorySubmission` | Regulatory Reporting User |
| `RaiseSubmissionDataQualityIssue` | Reporting User / Metric Owner |
| `ApproveRegulatorySubmission` | Authorized signatory |
| `SubmitRegulatoryReturn` | Authorized submission role |
| `CreateRegulatoryCorrection` | Authorized Reporting User |

Representative events:

- `AuditEngagementActivated`
- `AuditControlTestRecorded`
- `AuditFindingIssued`
- `AuditManagementResponseSubmitted`
- `AuditFindingVerified`
- `RegulatorySubmissionCreated`
- `RegulatoryValidationFailed`
- `RegulatorySubmissionApproved`
- `RegulatoryDeliveryAttempted`
- `RegulatorySubmissionAcknowledged`
- `RegulatoryCorrectionSubmitted`

## 11.93 Accessibility and recovery

- All audit-test and reporting tasks are keyboard operable.
- Errors identify the exact report field, control-test item or evidence gap.
- Draft narrative fields autosave.
- A failed export/download never deletes the report package.
- Screen readers receive status announcements for validation, approval and delivery.
- Mobile users can review, comment and approve—but high-impact submission confirmation remains deliberate and readable.
- Sensitive details never appear in email/SMS previews.
- Access expiry during review prevents approval/submission and preserves a secure draft where possible.

## 11.94 Part 5 acceptance requirements

Part 5 is accepted only when:

- Auditors can independently plan, test and document controls without operating them.
- Audit evidence access is scoped, minimized and logged.
- Audit findings and QA findings remain distinct records and workflows.
- Regulatory fields originate from certified metrics/evidence, not hand-entered replacement values.
- Official submissions have validation, sign-off, checksum, delivery confirmation and duplicate protection.
- Regulator queries and corrections produce linked, versioned resubmissions.
- Submitted returns, audit papers, findings and exports remain archived and auditable.
- External providers and AI cannot submit official reports or close audit findings.

**Role Blueprint 11: Quality Assurance, Executive Leadership, Audit and Regulatory Reporting is complete.**

Please approve Part 5. After approval, we can proceed to the final operational blueprint: **Role Blueprint 12 — System Administrator, Identity and Access Administrator, Moodle Administrator and Integration-support Officer**.

---

## Following user responses before the next design record

### User message 0214

Yes we may proceed
