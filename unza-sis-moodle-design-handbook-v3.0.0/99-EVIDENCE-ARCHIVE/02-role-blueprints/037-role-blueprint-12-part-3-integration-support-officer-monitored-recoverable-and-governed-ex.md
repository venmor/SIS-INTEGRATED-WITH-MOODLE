<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 8c69b484-c89c-55a5-a28c-2ff23898a539; chronological message: 222. -->

# Role Blueprint 12, Part 3 — Integration-support Officer: monitored, recoverable and governed external connections

The Integration-support Officer ensures that external services exchange the right information at the right time. They do not use integrations as a shortcut to edit admissions, results, payments, student-support cases or reports.

## 12.38 Integration-support workspace

Header:

> **Integration Support workspace · Production environment**

Navigation:

- Integration health
- Event-delivery queue
- Reconciliation cases
- Provider callbacks
- Scheduled imports
- Mapping configuration
- Incident handover
- Replay and recovery
- Data-quality exceptions
- Integration archive

The home page is operational and action-oriented:

- Failed or delayed deliveries
- Provider callbacks awaiting verification
- Reconciliation backlog
- Expiring credentials/certificates
- Scheduled import failures
- Dead-letter events
- Integration incidents
- Recent recovered operations
- Mapping changes awaiting approval

Example:

> **Payment-provider callback delayed**  
> 27 payment confirmations awaiting provider response  
> Oldest: 19 minutes  
> Student accounts are not yet updated.  
> `Open queue`

## 12.39 Integration design contract

Every integration uses a shared contract:

| Requirement | Required behaviour |
|---|---|
| Source authority | Define which system owns each fact |
| Adapter | Isolate provider-specific API/file/protocol logic |
| Event/outbox | Record institutional event before external delivery |
| Idempotency | Safely handle retry and duplicate delivery |
| Mapping version | Record each identifier/data transformation version |
| Validation | Reject unsafe/malformed/excessive data |
| Reconciliation | Compare source and destination after delivery |
| Audit | Record request, response, retry, correction and access |
| Failure recovery | Retry safely; route unresolved differences to owner |
| Security | Least-privilege credentials, rotation and secrets isolation |

An integration may report external facts. It cannot independently perform an institutional decision.

## 12.40 Integration catalogue

The platform supports configurable adapters for:

- Identity provider / authentication service
- Moodle
- Payment providers, banks and mobile-money services
- Email, SMS and notification providers
- Qualification/evidence verification services, including configured ECZ/ZAQA-type sources
- Document malware-scanning and storage service
- Regulatory submission endpoint
- Reporting/analytics platform
- HR or staff-assignment source, where connected
- Other institution-approved services

Each integration has:

- Owner
- Purpose
- Data categories
- Source and destination authority
- Credential owner
- Operational hours/service-level target
- Retry policy
- Reconciliation frequency
- Failure escalation route
- Retention/monitoring requirements
- Privacy assessment
- Effective dates

## 12.41 Integration health screen

Opening an integration shows:

> **Mobile-money payment provider**  
> Status: degraded  
> Last successful callback: 14:02  
> Delayed events: 27  
> Failed events: 0  
> Credential expiry: 68 days  
> Reconciliation due: 16:00  
> `View event queue` · `Open incident`

The officer sees:

- Availability state
- Last successful delivery
- Event counts by state
- Queue age
- Error category trend
- Credentials/configuration state, never secret value
- Recent mapping/version changes
- Reconciliation result
- Incident links
- Runbook

Statuses use text:

- Healthy
- Degraded
- Delayed
- Failing
- Maintenance
- Disabled by authorized decision
- Unknown—health check unavailable

---

# Action INT-EVT-01 — Review, retry and recover an event delivery

## 12.42 Event queue

The officer opens:

> **Event delivery queue → Needs attention**

Each event shows:

- Institutional event type
- Source-domain reference
- Destination integration
- Created time
- Last attempt
- Attempt count
- Error category
- Idempotency reference
- Current impact
- Safe next action

Example:

> **PaymentReceived event**  
> Payment reference: masked  
> Destination: Finance allocation service  
> Status: delivery failed—destination timeout  
> Attempts: 2 of 5  
> `Review event`

The officer sees only minimum business context. A payment reference is masked; a counselling referral displays no narrative.

## 12.43 Event detail and safe actions

The event page shows:

- Source event payload in minimized/secured form
- Schema version
- Mapping version
- Delivery attempts
- Provider response/error classification
- Related reconciliation case
- Retry schedule
- Runbook
- Audit timeline

Available actions:

- Retry now, if retry-safe
- Pause further delivery
- Acknowledge operational issue
- Open/attach incident
- Request mapping review
- Route to domain owner
- Mark as resolved only after confirmed delivery/reconciliation
- Replay approved range, where authorized

The officer cannot edit the source event payload to make it “work.”

### Retry interaction

Selecting `Retry now` shows:

> This will resend the same event using idempotency reference `…`. It will not create a second payment, enrolment, notification or record change if the destination already processed it.

The button becomes `Retrying…` and prevents duplicate clicks.

**Command:** `RetryIntegrationEventDelivery`

**Events:**

- `IntegrationEventRetryScheduled`
- `IntegrationEventDelivered`
- `IntegrationEventDeliveryFailed`
- `IntegrationEventMovedToDeadLetterQueue`

## 12.44 Dead-letter events

An event enters the dead-letter queue only after configured retries fail or the failure is non-retryable.

Examples:

- Invalid destination mapping
- Revoked destination credential
- Unsupported schema
- Permanently malformed external callback
- Source reference no longer resolvable
- Policy-blocked transmission

A dead-letter record requires a resolution path:

- Correct mapping and replay
- Correct source through authorized domain workflow, then emit new event
- Mark as no longer applicable with authorization
- Escalate to security/incident response
- Retain for audit

It cannot be deleted to make the queue look clean.

---

# Action INT-REC-02 — Reconcile an external integration

## 12.45 Reconciliation principles

Reconciliation compares institutional and external facts after transfer. It detects differences; it does not decide which system is “right” without knowing the authority boundary.

Example authority rules:

| Integration | External system may confirm | SIS/domain remains authoritative for |
|---|---|---|
| Payment provider | Payment received, reversed, payout completed | Charge allocation, financial clearance, refund approval |
| Moodle | Learning activity/submission/grade data | Registration, official CA/final result |
| Identity provider | Authentication assertion | Person identity, role/scope authority |
| Qualification verifier | Verification response | Admissions decision |
| SMS/email provider | Delivery status | Institutional notification record and workflow state |
| Regulator endpoint | Delivery acknowledgement/query | Institutional source records and report approval |

## 12.46 Reconciliation queue

The officer selects:

> **Reconciliation → Open cases**

A case contains:

- Integration and data type
- Source record reference
- External record reference
- Last confirmed sync time
- Difference detected
- Authority matrix
- Impact
- Assigned owner
- Recommended safe action
- Evidence and event history

Example:

> **Payment received externally but not allocated**  
> Provider: mobile money  
> External amount: K1,250  
> Finance status: unmatched payment  
> Authority: provider confirms value; Finance allocates charges  
> `Route to Finance reconciliation`

The officer cannot allocate payment value from this case.

## 12.47 Reconciliation actions

| Difference | Integration-support action | Domain-owner action |
|---|---|---|
| Provider payment exists, no SIS payment record | Verify callback/import and replay safely | Finance matches and allocates |
| SIS charge missing at provider | Confirm payment-intention sync | Finance determines whether new intention is needed |
| Moodle student access missing | Retry valid enrolment event | Registration fixes source status if incorrect |
| Qualification verification response delayed | Retry/check provider and log state | Admissions Officer assesses result |
| Email delivery failed | Retry/alternative approved channel | Workflow owner decides any escalation |
| Regulator acknowledgement absent | Check delivery reference | Regulatory user decides resubmission after approval |
| Identity-provider identifier mismatch | Pause sync, protect accounts | Identity Administrator resolves identity mapping |

## 12.48 Reconciliation completion

A case may be marked technically reconciled only when:

- Destination delivery is confirmed, or
- Correct domain action has been recorded, or
- The event is authorized as no longer applicable, and
- Required downstream state has been checked.

The interface asks:

> What proves this difference is resolved?

The officer selects evidence such as confirmed response, reconciliation report, corrected mapping version or linked domain case. A one-word note is insufficient.

---

# Action INT-MAP-03 — Change an integration mapping safely

## 12.49 Mapping change request

Mappings convert controlled identifiers and fields across systems. They are versioned because changing one can affect thousands of records.

The officer begins:

> **Mapping configuration → Request mapping change**

Fields:

- Integration
- Existing mapping version
- Proposed mapping
- Business purpose
- Affected record types
- Estimated volume
- Data classification impact
- Test plan
- Rollback plan
- Required domain owner
- Required technical/security approval
- Planned effective date

Example:

> Change: map SIS Tutorial Group `TG-CSC4792-04` to revised Moodle group identifier.  
> Impact: 28 student memberships.  
> Validation: compare membership before/after; no change to official SIS TG record.

The officer cannot activate the change directly if it affects academic, finance, identity or regulatory data.

## 12.50 Test, approve and release mapping

The workflow is:

1. Draft mapping.
2. Test with approved synthetic or non-production sample.
3. Record expected/actual comparison.
4. Obtain domain and technical approval.
5. Schedule release.
6. Apply mapping version.
7. Monitor first live events.
8. Reconcile affected records.
9. Roll back if required.

A mapping is not “fixed” merely because the technical request returns HTTP success.

---

# Action INT-IMP-04 — Process a scheduled import

## 12.51 Import queue

Scheduled imports may bring approved data from banks, sponsors, qualification verification services or other sources.

The officer sees:

- Import name
- Expected schedule
- Last successful import
- File/API reference
- Row count
- Valid rows
- Rejected rows
- Duplicate rows
- Validation state
- Reconciliation state

For a bank file:

> **Daily bank statement import**  
> Received: 1,240 rows  
> Accepted for Finance reconciliation: 1,231  
> Rejected: 9 malformed rows  
> `Review rejected rows`

A malformed row is isolated; valid rows may proceed if policy permits. The officer cannot manually adjust amount, account number or transaction date to force acceptance.

## 12.52 Import validation

The system validates:

- Source authenticity/signature where available
- Expected file/API schema
- File checksum
- Duplicate delivery
- Date/period validity
- Mandatory identifiers
- Field type/range
- Malicious/unexpected content
- Record count anomaly
- Mapping version

Rejected content is retained with a reason and controlled access. It is not silently discarded.

---

## 12.53 Notification provider integration

Notifications have two separate facts:

1. **Institutional notification created** — authoritative workflow record.
2. **Channel delivery status** — provider feedback.

The Integration-support Officer monitors:

- Queued
- Sent to provider
- Delivered where supported
- Failed
- Bounced
- Retried
- Suppressed by preference/policy
- Provider unavailable

A failed email/SMS does not automatically mean the student has ignored a required task. The originating workflow decides approved escalation, such as portal notification, alternative channel or staff task.

Sensitive messages remain neutral outside the portal:

> You have an update from the university. Sign in securely to view it.

---

## 12.54 Qualification/evidence verification integration

For admissions evidence verification, the integration can:

- Submit a permitted verification request
- Receive a verification response
- Store source, date, response status and reference
- Detect mismatch or unavailable service
- Route the case to an Admissions Officer

It cannot:

- Admit/reject an applicant
- Decide equivalence
- Replace human review of unclear evidence
- Change an applicant’s submitted document
- Treat a failed external lookup as proof of fraud

Applicant-facing wording:

> Your qualification verification is still in progress. We will contact you if more information is required.

---

## 12.55 Security, credentials and secrets

The Integration-support Officer can view credential health but not raw secret values.

They can see:

- Credential owner
- Last rotation date
- Expiry date
- Scope/permissions summary
- Environment
- Associated integration
- Rotation runbook
- Recent authentication failures

Credential rotation follows approved change control. Old credentials are revoked only after verified cutover, unless an urgent security procedure requires otherwise.

Integration logs mask secrets, authentication headers, personal identifiers and financial references as required.

## 12.56 Integration incidents and business communication

When an integration failure affects users, the officer works with the System Administrator and domain owner.

The incident page separates:

- Technical status
- Business impact
- Student/staff communication
- Recovery action
- Reconciliation action
- Closure evidence

Example:

> **Identity-provider authentication disruption**  
> Technical: login assertion failures from provider  
> Business impact: some users cannot sign in  
> Safe communication: “Sign-in is temporarily unavailable. Your academic and financial records remain unchanged.”  
> Recovery: provider escalation and fallback policy  
> Closure: successful login tests plus queued authentication-event reconciliation

The officer does not send unrelated institutional messages or disclose provider/internal infrastructure detail.

## 12.57 Integration archive and retention

Archived integration records include:

- Integration definitions and ownership
- Mapping versions
- Event payload references
- Delivery attempts
- Provider responses
- Reconciliation cases
- Import files/checksums
- Credential-rotation history
- Incident links
- Export/access logs
- Retired adapters and compatibility notes

Retention is set by data classification, regulatory obligation, finance/audit need and institutional policy. A legal hold prevents routine disposal.

## 12.58 Commands, events and audit

### Commands

| Command | Authorized role |
|---|---|
| `RetryIntegrationEventDelivery` | Integration-support Officer |
| `PauseIntegrationDelivery` | Authorized Integration-support Officer |
| `CreateIntegrationReconciliationCase` | Integration workflow / Officer |
| `ResolveIntegrationReconciliationCase` | Integration-support Officer with evidence |
| `RequestIntegrationMappingChange` | Integration-support Officer |
| `ApproveIntegrationMappingChange` | Domain/technical approvers |
| `ReplayApprovedIntegrationRange` | Authorized Officer |
| `AcknowledgeIntegrationIncident` | Integration-support Officer |
| `RotateIntegrationCredential` | Authorized technical/security role |

### Events

- `IntegrationHealthDegraded`
- `IntegrationEventDeliveryFailed`
- `IntegrationEventDelivered`
- `IntegrationReconciliationRequired`
- `IntegrationReconciliationResolved`
- `IntegrationMappingChangeRequested`
- `IntegrationMappingVersionActivated`
- `ScheduledImportFailed`
- `ExternalProviderCallbackReceived`
- `IntegrationCredentialExpiring`
- `IntegrationIncidentEscalated`

Every operation records the acting user/service identity, integration, source event, mapping version, scope, reason, retries, linked incident, evidence of resolution and timestamps.

## 12.59 Accessibility and failure recovery

- Queues use plain-language error categories and keyboard-operable filters.
- A failed event always shows its business impact and safe next step.
- Retry controls explain whether the operation is idempotent.
- Error details provide a technical reference for staff but avoid exposing secrets.
- Low-bandwidth mode supports paginated lists and delayed document loading.
- Screen readers receive updates when an event moves from retrying to delivered/failed.
- Manual corrections are routed to the authoritative domain workflow; they are never performed by editing a queue record.

## 12.60 Part 3 acceptance requirements

Part 3 is accepted only when:

- Every integration has a documented authority boundary, owner, adapter, mapping version, retry and reconciliation policy.
- External events are delivered through reliable, idempotent processing.
- Failed events, dead letters and imports cannot be silently deleted.
- Integration-support staff cannot change source-domain academic, financial, admissions or support records.
- Reconciliation proves resolution against the correct authority boundary.
- Mapping changes are tested, approved, versioned, monitored and reversible.
- Notification delivery is separate from institutional workflow completion.
- Qualification verification assists admissions but never decides it.
- Credentials are scoped, rotated and never exposed in logs.
- Every integration action, retry, replay, import, mapping change and reconciliation is auditable.

**Role Blueprint 12: Operations users is complete.**

Please approve Part 3. After approval, the next step is to create the cross-blueprint implementation set: the role/action traceability matrix, shared UI/microinteraction catalogue, permission and visibility matrix, error/recovery catalogue, and end-to-end acceptance scenarios that AI development agents will use together.

---

## Following user responses before the next design record

### User message 0223

Very well put,we may proceed
