## Design Section 10 — Security, privacy, audit, records and resilience

> Controlling content recovered from the approved design chat; approval prompts are omitted in this reading copy.


This section uses a risk-tiered, defence-in-depth model. It treats every request according to the sensitivity of the data and action instead of assuming that anyone inside the university network is automatically trusted.

### 1. Security approach considered

| Approach | Assessment |
|---|---|
| Minimum legal compliance | Cheaper initially but produces disconnected controls and weak operational security |
| Network-perimeter security | Inadequate because compromised staff accounts and internal devices would be implicitly trusted |
| Risk-tiered defence in depth | **Selected:** combines identity, authorisation, encryption, monitoring, privacy governance and recovery controls |

The implementation will organise cybersecurity outcomes around **Govern, Identify, Protect, Detect, Respond and Recover**, following the structure of [NIST Cybersecurity Framework 2.0](https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final).

### 2. Zambia legal baseline

The deployment must maintain compliance evidence for:

- Zambia Data Protection Act No. 3 of 2021.
- Cyber Security Act No. 3 of 2025.
- Cyber Crime Act No. 4 of 2025.
- Electronic Communications and Transactions Act No. 4 of 2021.
- Applicable higher-education, financial, employment and records policies.
- Current regulations and directions issued under these laws.

The Data Protection Act requires processing records, privacy-impact assessment for specified high-risk processing, security safeguards, a data-protection officer, breach handling, retention controls and data-subject rights. [Zambia Data Protection Act](https://www.parliament.gov.zm/sites/default/files/documents/acts/Act%20No.%203%20The%20Data%20Protection%20Act%202021_0.pdf)

The system supports compliance, but the institution remains responsible for confirming its current legal duties before production deployment.

### 3. Governance responsibilities

| Responsibility | Owner |
|---|---|
| Institutional cybersecurity risk and funding | University executive or governing authority |
| Privacy compliance and DPIA review | Data Protection Officer |
| Security operations and technical controls | CICT security function |
| Data classification, access and retention | Relevant institutional data owner |
| Daily application operation | SIS system owner |
| Independent assurance | Internal Audit or authorised independent auditor |
| Incident coordination | Designated incident commander |
| Legal and regulatory notification | DPO and authorised institutional officer |

Before production, the institution must record:

- Its data-controller or processor registration where required.
- Its appointed DPO.
- Responsible data owners.
- Approved security and privacy policies.
- Regulatory and incident-notification contacts.

No vendor becomes the institutional data owner merely because it hosts or supports the system.

### 4. Security-control register

Every security control records:

```text
Control identifier
Risk addressed
Control owner
Systems and data covered
Implementation evidence
Test method
Last test result
Review date
Exception and compensating control
```

Security exceptions require an owner, reason, expiry date and documented risk acceptance. Permanent undocumented exceptions are prohibited.

### 5. Personal-data inventory

The SIS maintains a record of processing activities containing:

- Data category and individual fields.
- Purpose of collection.
- Data-subject category.
- Collection source.
- Required or optional status.
- Applicable authority or justification.
- Sensitive-data classification.
- Internal and external recipients.
- Processor and subprocessor.
- Storage and backup location.
- Retention rule.
- Responsible data owner.
- Related privacy notice.
- Cross-border transfer status.

A production form cannot introduce a new personal-data field without an approved inventory entry.

### 6. Data classification

| Classification | Examples | Default control |
|---|---|---|
| `PUBLIC` | Published programme catalogue, public calendar, approved notices | Public distribution permitted |
| `INTERNAL` | Procedures, ordinary operational metrics, internal templates | Authenticated institutional access |
| `CONFIDENTIAL` | Applications, contact details, registrations, marks and financial records | Scoped business access, encrypted storage |
| `RESTRICTED` | NRC/passport data, counselling and health information, discipline evidence, bank details, examination papers, credentials and cryptographic secrets | Named capabilities, additional encryption, view auditing and export restrictions |

Classification applies at document and field level. One record can contain fields with different classifications.

### 7. Privacy notices and minimisation

Every collection point explains:

- Who is collecting the information.
- Why it is required.
- Which fields are mandatory.
- The consequence of not providing mandatory information.
- Intended recipients.
- Retention criteria.
- Whether external or cross-border processing is involved.
- How the person can exercise applicable rights.

Consent is recorded separately where consent is the appropriate justification. It cannot be hidden inside general terms.

NRC, marital status, disability, health, ethnicity and similar information cannot be collected merely because a database template provides space for them. Each field requires a defined institutional purpose.

### 8. Data-protection impact assessment

A DPIA is required before introducing high-risk processing such as:

- Predictive student profiling.
- Large-scale sensitive-data processing.
- Counselling, health or disability platforms.
- Biometric identity verification.
- New external AI processing.
- Foreign hosting or support access.
- Large-scale monitoring.
- New high-volume data sharing.
- Major changes to admissions or student-success models.

Workflow:

```text
DRAFT
→ DATA_OWNER_REVIEW
→ SECURITY_REVIEW
→ DPO_REVIEW
→ RISK_TREATMENT
→ APPROVED | CHANGES_REQUIRED | REJECTED
→ PERIODIC_REVIEW
```

A materially changed processing activity reopens the DPIA.

### 9. Zambia data residency

The default deployment profile requires personal data, replicas, uploaded documents, logs containing personal data and backups to be hosted in Zambia.

The Data Protection Act states that personal data should be processed and stored on infrastructure located in Zambia, subject to prescribed exceptions, while sensitive personal data receives stricter local-storage treatment. Cross-border transfers therefore cannot be enabled merely by selecting an international cloud region. [Zambia Data Protection Act—cross-border provisions](https://www.parliament.gov.zm/sites/default/files/documents/acts/Act%20No.%203%20The%20Data%20Protection%20Act%202021_0.pdf)

Any permitted external transfer requires:

- Documented legal basis.
- Applicable approval or prescribed route.
- Approved contractual protection.
- Data-location evidence.
- Transfer register entry.
- Minimum necessary fields.
- Encryption.
- Exit and deletion process.

Identifiable student information must not be sent to an external AI provider by default.

### 10. Identity assurance

Separate identity lifecycles are supported for:

- Prospective applicants.
- Submitted applicants.
- Matriculated students.
- Staff.
- External supervisors and examiners.
- Vendors and support personnel.
- Service accounts.

Applicants may start with a lower-assurance account. Identity assurance increases before admission acceptance, matriculation, refunds, transcript access or other sensitive operations.

The system prohibits:

- Shared user accounts.
- Student numbers as default passwords.
- NRC numbers as passwords or security answers.
- Staff impersonation without an audited support workflow.
- Direct use of email addresses as permanent identity keys.

### 11. Authentication and account recovery

Mandatory controls include:

- MFA for staff, administrators and external examiners.
- Step-up authentication for high-risk actions.
- Rate limiting and automated-attack detection.
- Secure session expiry and revocation.
- Notification of important account changes.
- Separate privileged administrator accounts.
- Revocation when a staff assignment ends.

Passkeys or hardware-backed credentials are preferred for privileged users. TOTP is an acceptable alternative. SMS may support applicant accessibility or controlled recovery, but must not be the sole protection for high-risk staff approvals.

Step-up authentication applies to:

```text
Officialising results
Changing fee rules
Approving refunds
Granting privileged roles
Using break-glass access
Exporting restricted records
Changing verified identity details
Issuing credentials
```

Recovery verifies identity proportionately, not through easily discovered questions. Changes to a verified phone number or email notify both the old and new channels where possible.

Authentication design will follow the current [NIST SP 800-63B-4](https://csrc.nist.gov/pubs/sp/800/63/b/4/final).

### 12. Authorisation model

Access is calculated as:

```text
Capability
+ organisational scope
+ relationship to the record
+ record state
+ effective dates
+ additional conditions
```

Example:

```text
Capability: results.moderate
Scope: School of Natural Sciences
Relationship: Assigned moderator
Record state: SUBMITTED_FOR_MODERATION
Effective period: Current semester
```

Possessing a job title alone does not grant unrestricted access. Every request is denied unless an applicable assignment authorises it.

### 13. Separation of duties

| Action | Required separation |
|---|---|
| Role request | Requester cannot approve their own privileged access |
| Mark entry | Marker cannot solely officialise the result set |
| Fee configuration | Configurer cannot solely approve and activate the same fee version |
| Refund | Request, verification and payment authorisation are separated |
| Credential issue | Preparation and final issue approval are separated |
| Bulk data export | Requester and authoriser are separated for restricted datasets |

Smaller institutions may configure compatible role combinations, but the system must expose the resulting control risk and prohibit self-approval.

### 14. Temporary and emergency access

Privileged support access is just-in-time and time-limited.

Break-glass access requires:

- Strong MFA.
- Selected emergency reason.
- Incident or case reference.
- Requested scope.
- Automatic expiry.
- Notification to the security or data owner.
- Detailed audit record.
- Mandatory retrospective review.

Break-glass access does not disable audit logging.

### 15. Encryption and key management

The system requires:

- TLS for data in transit.
- Encryption for databases, object storage and backups.
- Additional field-level protection for NRC/passport values, bank details and highly restricted information.
- Password hashing using a modern memory-hard algorithm.
- Keys stored separately from encrypted data.
- Key rotation and revocation.
- Short-lived signed document links.
- Separate access to keys and production data.

Secrets, tokens and private keys cannot appear in:

- Source code.
- ordinary configuration tables.
- application logs.
- support screenshots.
- test fixtures.
- database exports.

### 16. Environment separation

Production, test, training and development environments are separated by credentials, storage and access policy.

Production personal data cannot be copied into development or demonstrations. Testing uses synthetic or properly anonymised data.

Database migrations require:

- Reviewed migration scripts.
- Pre-migration backup.
- Compatibility checks.
- Reconciliation counts.
- Rollback or forward-recovery procedure.
- Audit evidence.

### 17. Secure development lifecycle

The application will use:

- Threat modelling.
- Security requirements in user stories.
- Peer code review.
- Static analysis.
- Dependency and secret scanning.
- Software bill of materials.
- API and input-validation testing.
- Dynamic security testing.
- Signed and traceable builds.
- Controlled deployment approvals.
- Independent penetration testing before production.

The target is [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/) Level 2 for the general application, with applicable Level 3 controls for authentication, official results, finance, counselling, credentials and privileged administration.

Development practices will align with the [NIST Secure Software Development Framework](https://csrc.nist.gov/pubs/sp/800/218/final).

### 18. Vulnerability management

A vulnerability record contains:

```text
Affected component
Severity
Exploitability
External exposure
Data at risk
Available mitigation
Owner
Remediation deadline
Verification result
Exception expiry
```

Suggested starting targets are:

| Condition | Initial target |
|---|---|
| Critical and actively exploited | Contain within 24 hours |
| Other critical vulnerability | Mitigate within 72 hours and correct within 7 days |
| High severity | Correct within 30 days |
| Medium severity | Correct within 90 days |

The institution approves final targets according to risk and operational capacity. An expired exception automatically re-enters escalation.

### 19. Audit-event model

Every material audit event records:

- Event identifier.
- Correlation and request identifiers.
- Actor and effective identity.
- Any impersonating or delegated identity.
- Role and scope used.
- Action.
- Target record.
- Previous and new values, appropriately masked.
- Reason or decision reference.
- Source channel and device information where lawful.
- Event time.
- Outcome.
- Software and policy version.

Important **reads** are also audited, particularly counselling, discipline, identity documents, health information and bulk student records.

### 20. Audit integrity

Audit records are append-only. Corrections create new events instead of rewriting history.

Protection includes:

- Restricted log administration.
- Centralised security logging.
- Synchronized timestamps.
- Periodic signed or hash-linked integrity evidence.
- Immutable or write-protected copies.
- Separate monitoring for attempts to disable logging.
- Auditing of access to audit records.

Passwords, authentication tokens, full counselling notes and unrestricted identity values must never be copied into logs.

### 21. Security monitoring

High-risk events include:

- Repeated authentication failures.
- Unusual privileged access.
- Bulk record viewing or exporting.
- Role escalation.
- Break-glass use.
- Contact-detail changes followed by a refund.
- Marks altered after certification.
- Unusual fee or ledger adjustments.
- Credential signing-key activity.
- API-key misuse.
- Disabled or missing audit agents.
- Unexpected database-administrator access.

An alert opens an investigation; it does not automatically accuse or discipline a person.

### 22. Data-subject rights workflow

The SIS supports requests for applicable:

- Access.
- Notification.
- Rectification.
- Erasure.
- Restriction.
- Objection.
- Portability.
- Disclosure information.
- Complaint handling.

```text
REQUEST_RECEIVED
→ IDENTITY_VERIFICATION
→ REQUEST_SCOPED
→ DATA_OWNER_SEARCH
→ THIRD_PARTY_REVIEW
→ DPO_REVIEW
→ FULFILLED | PARTIALLY_FULFILLED | LAWFULLY_REFUSED
→ CLOSED
```

The response records what was provided, withheld, corrected or retained and why.

Erasure is not automatic. Official results, awards, financial transactions and other authorised permanent records may need to remain where institutional or legal obligations apply. Any refusal provides a review or complaint route.

### 23. Records-retention schedule

Retention is configured by record class rather than one global number.

| Record category | Retention treatment |
|---|---|
| Official results, awards, transcript and correction lineage | Permanent or institutionally approved archival retention |
| Programme attempts and registration history | Long-term official record |
| Applications and supporting evidence | Policy-defined period based on outcome |
| Examination scripts and working evidence | Assessment-policy period |
| Appeals and discipline cases | Policy-defined case retention |
| Counselling and health information | Restricted and retained only as professionally and legally required |
| Integration payloads and temporary files | Short operational period |
| Audit and security evidence | Security and accountability period |
| Backups | Defined recovery cycle, not permanent archival storage |

Retention states:

```text
ACTIVE
→ CLOSED
→ RETENTION_RUNNING
→ DISPOSAL_ELIGIBLE
→ OWNER_AND_DPO_REVIEW
→ DESTROYED | ANONYMISED | ARCHIVED
```

A legal or investigation hold suspends disposal without altering the original retention rule.

### 24. Secure disposal and exports

Disposal records:

- Data covered.
- Retention authority.
- Approver.
- Disposal method.
- Completion time.
- Affected replicas and storage systems.
- Backup-expiry treatment.
- Verification evidence.

Restricted exports require purpose, scope, approval and expiry. Export files are encrypted, access-controlled and automatically removed from temporary storage.

Printing or downloading restricted information produces an audit event. Temporary exports must not become unofficial permanent student databases on staff laptops.

### 25. Electronic approvals and signatures

A digital approval records:

```text
Signer identity
Authorised role and scope
Document or decision hash
Approval meaning
Date and time
Authentication strength
Policy version
Revocation or correction lineage
```

A pasted image of a handwritten signature is not treated as a secure digital signature.

This supports the legal environment for electronic records and secure electronic transactions established by the [Electronic Communications and Transactions Act, 2021](https://www.parliament.gov.zm/sites/default/files/documents/acts/Act%20No.%204%20of%202021%2C%20The%20Electronic%20Communications%20and%20Transactions_0.pdf).

### 26. Third-party and processor controls

Contracts for hosting, Moodle support, SMS, payment services, document processing or AI must specify:

- Data processed and permitted purpose.
- Zambia hosting and access location.
- Confidentiality.
- Encryption.
- Staff access controls.
- Incident-notification period.
- Audit rights.
- Subprocessor approval.
- Data return and deletion.
- Backup treatment.
- Service continuity.
- Exit assistance.
- Prohibition on unrelated analytics or model training.

Vendor support access is approved, temporary and audited. A processor cannot quietly add a new subprocessor.

### 27. Critical-information assessment

The design does not assume that every university SIS is automatically designated critical infrastructure. The institution must record whether the Zambia Cyber Security Agency has formally designated any relevant information or infrastructure.

If designated, the system’s compliance profile activates controls for:

- Registration following designation.
- Applicable Zambia hosting.
- Cyber audits.
- Situational-awareness reporting.
- Required threat-detection mechanisms.
- Immediate incident notification.
- Preliminary incident reporting within the applicable period.

The Cyber Security Act specifies registration, local-hosting, audit and incident-reporting duties for designated critical information and infrastructure. [Zambia Cyber Security Act, 2025](https://www.parliament.gov.zm/sites/default/files/documents/acts/Act%20No.%203%20of%202025%2C%20The%20Cyber%20Security_0.pdf)

### 28. Recovery objectives

Proposed initial objectives are:

| Service tier | Examples | RPO | RTO |
|---|---|---:|---:|
| Tier 1 | Core student record, registration, official results, identity authorisation and student ledger | 15 minutes | 4 hours |
| Tier 2 | Admissions, assessment workflows, examinations, document access and integrations | 1 hour | 8 hours |
| Tier 3 | Analytics, historical reporting and non-critical portals | 24 hours | 48 hours |

These are design targets, not guarantees. They become operational commitments only after infrastructure sizing, failover and restore testing.

### 29. Backup architecture

The production design requires:

- At least three recoverable copies.
- Separate storage or security domains.
- One immutable or offline-protected copy.
- Geographic separation between Zambia-based locations.
- Encryption.
- Separate backup-administrator credentials.
- Database point-in-time recovery.
- Document-storage versioning.
- Backup monitoring.
- Recorded restoration tests.

A successful backup job is not accepted as recovery proof. Tier 1 restores should be tested at least quarterly, with a full disaster-recovery exercise at least annually and after major architectural changes.

### 30. Zambia-relevant operational continuity

The system must tolerate power, network and external-provider interruptions.

Continuity provisions include:

- UPS and generator planning for institution-hosted infrastructure.
- Redundant connectivity where feasible.
- Queued integration operations.
- Registration and examination critical-period readiness.
- A separately reachable service-status channel.
- Controlled manual continuity procedures.
- Reconciliation after service restoration.

The design does not permit unsupervised offline changes to authoritative student records. Where temporary manual capture is necessary, it uses numbered records, responsible officers, dual verification and later reconciliation.

### 31. Incident response

```text
DETECTED
→ TRIAGED
→ INCIDENT_DECLARED
→ CONTAINMENT
→ EVIDENCE_PRESERVATION
→ ERADICATION
→ RECOVERY
→ REGULATORY_AND_SUBJECT_NOTIFICATION
→ LESSONS_LEARNED
→ CLOSED
```

Each incident records:

- First detection and confirmation times.
- Systems and data affected.
- Incident commander.
- Decisions and actions.
- Evidence and chain of custody.
- Notifications.
- Recovery validation.
- Root cause.
- Corrective actions.
- Responsible owners and deadlines.

### 32. Breach-notification clocks

For a breach affecting personal data, the Data Protection Act requires notification to the Data Protection Commissioner within 24 hours and notification to affected data subjects as soon as practicable. [Data Protection Act—security-breach duties](https://www.parliament.gov.zm/sites/default/files/documents/acts/Act%20No.%203%20The%20Data%20Protection%20Act%202021_0.pdf)

Where formally designated critical information is involved, the Cyber Security Act introduces additional immediate and preliminary reporting duties.

The system therefore maintains separate notification clocks and escalates them continuously. Only an authorised officer submits a regulatory notification, but an incident cannot be silently closed while a notification deadline remains unresolved.

### 33. Security assurance and go-live gate

Before production use, the institution must have evidence of:

- Approved data inventory and retention schedule.
- DPO and data-owner assignments.
- Required registration and residency position.
- Completed DPIAs.
- Tested authorisation matrix.
- MFA and recovery controls.
- Processor agreements.
- Threat model.
- Security testing and penetration-test results.
- Remediation of unresolved critical findings.
- Successful backup restoration.
- Incident-response exercise.
- Monitoring and alert ownership.
- Disaster-recovery test.
- Staff training.
- Migration reconciliation and rollback plan.

A final-year prototype that has not passed these gates must remain clearly labelled as a prototype and use synthetic data. It cannot claim institution-wide production security merely because the features exist.
