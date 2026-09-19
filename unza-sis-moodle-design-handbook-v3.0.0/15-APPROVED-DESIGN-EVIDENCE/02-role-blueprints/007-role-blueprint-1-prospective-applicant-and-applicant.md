<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 251935bb-ad89-5541-9458-bde1493b9b78; chronological message: 126. -->

# Role Blueprint 1 — Prospective Applicant and Applicant  
## Part 6: Supporting-document upload, malware safety, document quality checks, replacement and verification workflow

This part defines how applicants provide supporting evidence safely and how the system separates:

> **Uploaded** → **Safe to process** → **Readable/complete** → **Formally verified**

Uploading a document never proves that it is genuine, current or sufficient for admission.

---

## 1. Purpose and document categories

The application shows only documents required by the applicant’s programme, intake, qualification route and applicant category.

Typical categories include:

- NRC, passport or another approved identity document
- ECZ/Grade 12 result statement
- Diploma, degree certificate or transcript
- ZAQA or other equivalency evidence, where required
- Proof of residency or immigration status, where required
- Sponsorship letter
- Programme-specific portfolio
- Research proposal
- Professional-registration evidence
- Other authorized supporting document

Every requested document card states:

- Document name
- Why it is required
- Whether it is mandatory, conditional or optional
- Accepted file types
- Maximum permitted size
- Deadline
- Whether original, certified or translated evidence is required
- Current status
- `Upload` or `Replace` action

Example:

> **Grade 12/ECZ result statement — Required**  
> We need this to verify the results declared in your application.  
> Accepted: PDF, JPG or PNG · Maximum size: 10 MB  
> Status: Not uploaded  
> `Upload document`

---

## 2. Document status language

Applicants must see a specific, understandable status.

| Internal state | Applicant-facing status | Meaning |
|---|---|---|
| `NotProvided` | Not uploaded | No file has been received |
| `UploadInProgress` | Uploading | File transfer is underway |
| `SecurityScanPending` | Checking file safety | Upload received; safety checks are running |
| `SecurityScanFailed` | File could not be accepted | File failed a safety or technical check |
| `AwaitingQualityCheck` | Received; checking readability | File is safe but still being reviewed for quality/completeness |
| `NeedsReplacement` | Replace this document | File is unreadable, incomplete, wrong or outdated |
| `AwaitingVerification` | Received; verification required | Readable document awaits authorized assessment |
| `Verified` | Verified | Authorized verification has been completed |
| `NotAccepted` | Not accepted | Formal assessment found it does not meet the applicable requirement |
| `Waived` | Not required for your application | Authorized rule or decision removes the requirement |
| `Withdrawn` | Replaced or withdrawn | Superseded file retained according to record policy |

The applicant should never see internal technical terms such as `AV_QUARANTINED` or `OCR_LOW_CONFIDENCE` as the primary explanation.

---

## 3. Upload experience

### 3.1 Upload panel

Selecting `Upload document` opens a focused panel or full mobile page.

It contains:

- Document category and purpose
- File-format and size rules
- Clear visual examples of acceptable scans/photos
- `Choose file`
- Drag-and-drop zone on desktop as an additional option
- Camera/photo option on mobile where supported
- Guidance for multi-page documents
- `Cancel`

The standard required formats are configuration-driven. The recommended initial set is:

- PDF
- JPG/JPEG
- PNG

Executable files, archives, macros-enabled documents and unsupported formats are not accepted.

### 3.2 Before upload

The page offers practical guidance:

- Use a clear, well-lit image.
- Include all pages.
- Ensure text, photograph and document edges are readable.
- Do not upload a password-protected file.
- Hide nothing required for verification.
- Do not submit another person’s document unless the category explicitly requires it.

This guidance must be available before the applicant spends data uploading a large file.

### 3.3 Upload progress

During transfer, show:

> Uploading 3.8 MB of 7.2 MB · 53%

Actions:

- `Cancel upload`
- `Retry` after recoverable failure

On unreliable connections:

- Uploads use resumable transfer where supported.
- The applicant can leave the page only after a clear warning if the file is not yet received.
- A failed upload must not force the user to re-enter unrelated application information.

### 3.4 Successful receipt

After transfer completes, the system does **not** say “document accepted.”

It says:

> Document received. We are checking that the file is safe and readable.

The card then enters `Checking file safety`.

---

## 4. File safety and malware controls

### 4.1 Untrusted-file boundary

Every uploaded file is untrusted until safety controls complete.

The system must:

1. Place the file in a quarantined upload area.
2. Validate the actual file content and type, not only extension or browser-provided MIME type.
3. Check permitted format, file size and page/image limits.
4. Scan for malware using an approved scanning service.
5. Reject encrypted/password-protected files where they cannot be scanned.
6. Prevent file execution, direct public serving and unsafe preview generation.
7. Store accepted files in restricted object storage.
8. Issue short-lived, authorized viewing links only after security processing.
9. Log scan outcome without exposing threat details to applicants.

A file must never be opened directly in an administrator’s desktop environment merely because it was uploaded.

### 4.2 Unsafe or unsupported file

If the system rejects a file:

> We could not accept this file. Upload a clear PDF, JPG or PNG that is not password protected and is within the 10 MB limit.

Where appropriate, the system identifies the safe reason:

- Unsupported format
- File too large
- Password protected
- Upload incomplete
- File could not be processed safely

It must not disclose detailed malware signatures, internal scanning technology or security rules.

### 4.3 Suspected malicious content

If a file triggers malware controls:

- The file remains quarantined.
- It is not previewed or made visible to standard admissions staff.
- The applicant receives a neutral, non-accusatory message.
- A security event is created for authorized operations staff.
- The applicant can upload a clean replacement.
- Repeated abuse follows an approved security-response policy.

Applicant message:

> This file could not be processed safely. It was not added to your application. Please upload a new file in an accepted format.

---

## 5. Document-quality checks

### 5.1 Automated technical quality checks

After a file passes safety scanning, the system may perform bounded technical checks such as:

- File opens successfully
- Page count is within configured limit
- Image resolution is above minimum threshold
- Image is excessively blurred, dark, cropped or rotated
- Required document sides/pages may be missing where detectable
- Text extraction confidence is low
- Declared document category appears inconsistent with file characteristics

These checks support applicant guidance and staff queues. They do not determine document authenticity or admission.

### 5.2 Applicant-visible quality result

If the system detects a likely issue:

> This image may be difficult to read because it is blurred or too dark. You can replace it now, or continue and wait for formal review.

Where a document is unreadable, the system may block progression only if the requirement is mandatory and the quality failure is clear.

Example:

> We cannot read the document number or results on this image. Upload a clearer image showing the full page.

The interface gives exact practical correction advice:

- Retake in good light
- Place the document on a flat surface
- Include the entire page
- Upload all pages
- Avoid screenshots of compressed copies

### 5.3 OCR and AI boundary

Optical character recognition or AI-assisted quality checks may be used only to:

- Help classify a file into the expected document category
- Detect likely unreadability/incompleteness
- Pre-fill a review suggestion for the applicant or staff member
- Identify a mismatch requiring human review

They may not:

- Declare an identity document genuine
- Verify examination results autonomously
- Reject an applicant
- Infer citizenship, ethnicity, disability or other sensitive attributes
- Alter applicant-declared information without confirmation
- Replace authorized human verification

Any such feature must appear in the approved AI use-case register described in Section 11.

---

## 6. Document preview and applicant control

### 6.1 Preview

After safety processing, the applicant may select `Preview document`.

The preview page shows:

- Document category
- Filename, masked where appropriate
- Upload date/time
- Page count
- Current status
- Thumbnail/secure preview
- `Replace document`
- `Download my copy` only if policy permits
- `Return to documents`

Previews require authenticated, application-owned access. URLs must be short-lived and must not be guessable.

### 6.2 Replacement

Selecting `Replace document` explains:

> Uploading a replacement will not erase the previous document immediately. Admissions will use the latest accepted version, while prior versions remain in the audit record.

The applicant uploads the new version using the same safe-upload process.

After a valid replacement is received:

- The new document becomes the active candidate for review.
- The prior document status becomes `Replaced` or `Withdrawn`.
- Any completed verification of the old document is not silently transferred.
- Staff receive a review task where replacement affects an active decision.

### 6.3 Removing a document

Applicants may remove an optional document before submission where policy permits.

Required documents cannot be removed if doing so leaves the application incomplete. The interface explains what must happen instead:

> This document is required for your application. Replace it with a correct version rather than removing it.

After submission, removal follows the controlled clarification/correction process, not ordinary applicant self-service.

---

## 7. Formal document verification

### 7.1 Separation of duties

An authorized verification officer reviews documents after safety and quality checks.

Their future staff blueprint will define the full staff experience. For this applicant blueprint, the important rule is:

> The applicant can see the outcome and required next step, but not staff-only verification notes, fraud indicators, internal checklists or unrelated records.

### 7.2 Verification outcomes

An authorized officer may record:

- Verified
- Verification pending external source
- Needs replacement
- Not accepted
- Requirement waived
- Escalated for further review

Each outcome must contain:

- Verification decision
- Applicable requirement
- Evidence considered
- Authorized staff member/role
- Date/time
- Applicant-visible reason, where a response is required
- Internal restricted rationale, where necessary
- Next action and deadline

### 7.3 Applicant experience when replacement is needed

The applicant receives:

> **Action needed: replace your Grade 12 result statement**  
> The document does not show all required pages. Upload a complete copy by 10 October 2026, 17:00 CAT.

Actions:

- `View requirement`
- `Replace document`
- `Ask Admissions for help`

The applicant does not see an unexplained red status or a generic “Rejected.”

### 7.4 Applicant experience when document is not accepted

Where policy permits an explanation:

> Your uploaded document cannot be accepted for this requirement because it does not meet the published evidence rule. Review the required document or contact Admissions if you believe this is incorrect.

The decision explanation must be sufficiently specific to allow correction or appeal, but must not disclose security-sensitive verification methods.

### 7.5 External verification delays

If verification depends on an external body or service:

> Your document was received and is awaiting external verification. No action is required from you now.

The status includes:

- Last update
- Expected review period where defined
- Contact route if the deadline approaches
- Whether the application can continue while verification is pending

The system must not leave the applicant with only `Pending`.

---

## 8. Privacy, retention and access rules

Documents may contain high-risk personal information. The system must:

- Classify each document category.
- Minimize staff access by role, purpose and organizational scope.
- Mask identifiers in ordinary list views.
- Prohibit document content from general search indexes.
- Exclude documents from training AI models unless explicitly approved under institutional policy.
- Use encrypted transport and approved storage encryption.
- Record every material viewing, download, replacement, verification and export event.
- Apply documented retention and disposal schedules.
- Prevent documents from appearing in email or SMS attachments by default.
- Warn staff before downloading sensitive documents.

Applicant-facing file names must be sanitized. The system must not display server paths, internal storage keys or scanning metadata.

---

## 9. Failure and recovery catalogue

| Situation | Applicant-facing behaviour | System behaviour |
|---|---|---|
| Connection fails mid-upload | Show resumable/retry state; preserve application draft | Retain only confirmed upload chunks; avoid duplicate document records |
| File too large | State size limit before and after selection | Reject before storage where possible |
| Unsupported type | Identify accepted formats | Reject actual unsafe/unapproved content |
| Password-protected PDF | Explain it cannot be checked safely | Do not bypass scan or request password |
| Malware/safety failure | Neutral upload-failed message; allow clean replacement | Quarantine, log and alert authorized security operation |
| File unreadable | Explain likely issue and practical correction | Create quality-check result |
| Applicant uploads wrong category | Explain expected document and allow replacement | Keep audit trail; do not map it as verified |
| Applicant uploads duplicate file | Show existing document and ask whether to replace | Use checksum/matching only as assistance, not identity proof |
| Required document rule changes | Show updated requirement and deadline | Version requirement and create applicant task |
| Verification takes too long | Show last update and help route | Escalate according to configured service-level rule |
| Staff requests replacement after submission | Create controlled applicant task | Unlock only document-response scope, not unrelated submitted facts |

---

## 10. Architecture contract

### 10.1 Core entities

| Entity | Purpose |
|---|---|
| Document requirement | Versioned evidence requirement for programme/intake/route |
| Document submission | Applicant’s uploaded evidence record |
| File object | Secure stored file and technical metadata |
| Security scan result | Safety-processing outcome |
| Document quality assessment | Technical readability/completeness observations |
| Document verification case | Authorized formal-review record |
| Document version relationship | Links replacements and withdrawn files |
| Document access event | Auditable viewing/download/export record |

### 10.2 Commands

| Command | Main result |
|---|---|
| `InitiateDocumentUpload` | Creates controlled upload session |
| `CompleteDocumentUpload` | Registers uploaded file for quarantine processing |
| `ProcessDocumentSecurityScan` | Validates/scans content and permits/rejects processing |
| `AssessDocumentTechnicalQuality` | Produces non-final quality observations |
| `ReplaceDocumentSubmission` | Links secure replacement to requirement |
| `WithdrawOptionalDocument` | Withdraws permitted optional document |
| `RequestDocumentReplacement` | Creates applicant action from authorized review |
| `RecordDocumentVerificationOutcome` | Records human-authorized verification outcome |
| `GrantDocumentRequirementWaiver` | Records authorized exception |

### 10.3 Events

- `DocumentUploadInitiated`
- `DocumentUploadCompleted`
- `DocumentSecurityScanPassed`
- `DocumentSecurityScanFailed`
- `DocumentQualityAssessmentCompleted`
- `DocumentReplacementSubmitted`
- `DocumentReplacementRequested`
- `DocumentVerificationCompleted`
- `DocumentRequirementWaived`
- `SensitiveDocumentAccessed`

### 10.4 Audit requirements

For every document lifecycle action, record:

- Application and document-requirement identifiers
- Applicant/acting-user identifier
- File version and checksum
- Upload, scan, quality and verification timestamps
- Outcome and authorized decision-maker
- Applicant-visible reason where applicable
- Access/download/export records
- Replacement/withdrawal chain
- Requirement and policy version used

Do not store raw files, malware signatures, verification secrets or scan-provider credentials inside general audit events.

---

## 11. Part 6 acceptance tests

Part 6 is accepted when:

- Applicants see only document requirements relevant to their application.
- Every document status has a clear, non-technical explanation and next action.
- Untrusted uploads are quarantined, validated by actual content and scanned before normal access.
- Unsafe, encrypted, oversized and unsupported files are rejected safely.
- Applicants can resume interrupted uploads where supported.
- Successful upload is never presented as formal verification.
- Automated quality checks provide guidance but do not make admission decisions.
- AI/OCR cannot autonomously authenticate documents, reject applicants or change declared data.
- Applicants can securely preview and replace documents without losing audit history.
- Staff-only verification and security information is never exposed to applicants.
- Sensitive documents are excluded from ordinary search, notifications and unauthorized downloads.
- Controlled post-submission replacement works without reopening unrelated submitted data.
- Keyboard, mobile, screen-reader, low-bandwidth, malware-handling and document-access tests pass.

**Please approve Part 6: Supporting-document upload, malware safety, document quality checks, replacement and verification workflow.** After approval, I will proceed to Part 7: **application-fee payment, fee waiver, reconciliation, receipts, refunds and payment failure recovery.**

---

## Following user responses before the next design record

### User message 0127

proceed  Part 7: **application-fee payment, fee waiver, reconciliation, receipts, refunds and payment failure recovery.**
