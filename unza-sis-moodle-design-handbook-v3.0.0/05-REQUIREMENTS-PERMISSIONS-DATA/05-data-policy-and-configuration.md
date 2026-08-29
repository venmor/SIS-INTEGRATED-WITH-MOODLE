# Data and Configuration Blueprint

## Data principles

- Use stable opaque identifiers rather than exposing predictable sequence IDs where unnecessary.
- Preserve decision and amendment history; do not overwrite released/high-impact records.
- Enforce uniqueness and foreign-key integrity for authoritative relationships.
- Store money as currency plus exact decimal/minor-unit representation, never floating point.
- Store timestamps with UTC instants and render in the institution’s configured time zone.
- Separate public, ordinary internal, confidential, restricted and highly restricted information.
- Store files through an authorized document reference and storage adapter, not as public paths.

## Major conceptual entities

| Domain | Representative entities |
|---|---|
| Identity | Person, Account, Credential, Session, RoleAssignment, Scope, Delegation |
| Admissions | Application, ApplicationVersion, Evidence, EvidenceReview, Decision, Offer |
| Student Records | Student, StudentIdentifier, ProgrammeMembership, RecordCorrection |
| Registration | StudyPlan, Course, CourseOffering, CourseSelection, Registration, ProgressionOutcome |
| Learning | MoodleMapping, TeachingAssignment, TutorialGroup, EnrolmentSync, GradeTransfer |
| Assessment | AssessmentPlan, AssessmentComponent, Mark, ResultPackage, BoardDecision, ResultVersion |
| Finance | Charge, Payment, Allocation, Sponsorship, Adjustment, Refund, ClearanceOutcome |
| Support | SupportRequest, RestrictedCase, Consent, Disclosure, CaseAssignment, SafeguardingAction |
| Quality | QualityReview, EvidenceReference, Finding, Response, CorrectiveAction, Verification |
| Reporting | MetricDefinition, ReportRun, CertifiedPackage, RegulatorySubmission, Acknowledgement |
| Operations | OutboxEvent, DeliveryAttempt, DeadLetter, Reconciliation, Incident, Notification |
| Audit | AuditEvent, ArchiveRecord, RetentionRule, LegalHold |

## Configuration record

Every institutional configuration contains:

```text
Identifier and schema version
Category and owner
Institution/programme/period scope
Effective start and end
Approval status and approvers
Change reason
Superseded/prior version
Validation rules
Linked test fixtures
Audit history
```

## Configuration categories

| Category | Examples |
|---|---|
| Academic | Prerequisite, repeat, supplementary, progression, award |
| Assessment | Components, weights, boundaries, moderation, release |
| Finance | Charges, allocation, arrangement, refund/waiver thresholds |
| Workflow | States, approval chain, escalation, deadlines |
| Role capability | Tutor authority, Dean scope, signatory powers |
| UI/content | Labels, terminology, declarations, notification templates |
| Reporting | Metric definitions, suppression and regulator templates |
| Integration | Moodle mappings, provider identifiers and retry classes |
| Retention | Archive duration, legal holds and disposal authority |

## Hard-coding prohibition

Programme names, grade boundaries, fees, authority chains, provider identifiers, academic periods and university terminology must not be scattered through application code or UI components.

## Demonstration configuration

`DEMO-ACADEMIC-2026-v1` is fictional:

- Academic year 2026; Semester 1 and Semester 2
- Currency ZMW; time zone Africa/Lusaka
- CA 40%, final examination 60%, overall pass 50%
- Schools: Computing, Health Sciences and Business
- Programmes: BSc Software Engineering, BSc Radiography and BBA

These values demonstrate configurability and do not claim to represent a real institution’s policy.
