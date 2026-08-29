# State Machines, Commands and Events

## State-machine rule

High-impact aggregates reject transitions that are not explicitly approved. Database field editing is not a workflow.

## Representative lifecycles

### Application

```text
DRAFT → SUBMITTED → IN_REVIEW → DECISION_READY
→ OFFERED | REJECTED | RETURNED_FOR_INFORMATION
OFFERED → ACCEPTED | DECLINED | EXPIRED
```

### Registration

```text
SELECTION_DRAFT → SUBMITTED → ACADEMIC_VALIDATED
→ FINANCE_REVIEW → CONFIRMED
                    ↘ ACTION_REQUIRED/BLOCKED
CONFIRMED → AMENDMENT_REQUESTED → AMENDED
```

### Result package

```text
DRAFT → STAGED → VALIDATION_FAILED | VALIDATED
VALIDATED → BOARD_READY → APPROVED_FOR_RELEASE → RELEASED
RELEASED → AMENDMENT_REQUESTED → AMENDED_VERSION_RELEASED
```

### Integration delivery

```text
PENDING → DELIVERING → DELIVERED → RECONCILED
              ↘ RETRY_WAIT → DELIVERING
              ↘ DEAD_LETTER → APPROVED_REPLAY → DELIVERING
```

## Command standard

Commands express an intentional request. Each includes command ID, actor, active role, scope, target, input, policy/configuration version, idempotency reference where required, validation context and audit/correlation context.

Representative commands:

- `CMD-APP-SubmitApplication`
- `CMD-ADM-ApproveAdmissionDecision`
- `CMD-REG-ConfirmAcademicRegistration`
- `CMD-LRN-StageMoodleGradeTransfer`
- `CMD-FIN-ApproveFinancialAdjustment`
- `CMD-ASM-ReleaseOfficialResults`
- `CMD-AWD-ConfirmAcademicAward`
- `CMD-QA-IssueProposedQualityFinding`
- `CMD-REP-SubmitRegulatoryReturn`

## Event standard

Events state a completed fact. Each includes event ID/name/version, aggregate reference, occurred time, correlation/causation, minimal safe payload, classification, producer and schema version.

Representative events:

- `EVT-ApplicationSubmitted-v1`
- `EVT-AdmissionOfferAccepted-v1`
- `EVT-StudentAcademicRegistrationConfirmed-v1`
- `EVT-FinancialClearanceGranted-v1`
- `EVT-MoodleGradeTransferStaged-v1`
- `EVT-OfficialResultsReleased-v1`
- `EVT-AcademicAwardConfirmed-v1`
- `EVT-QualityFindingProposed-v1`
- `EVT-RegulatorySubmissionAcknowledged-v1`

Consumers tolerate duplicate delivery and supported older schema versions. Events contain minimum necessary data; sensitive records are referenced and retrieved only with authorization.

## Outbox rule

The domain state change and outbox event are committed in one database transaction. A worker delivers later. A provider outage therefore cannot create a “completed externally but missing internally” ambiguity without a reconciliation record.
