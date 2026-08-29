# Action Contract Catalogue

## Contract format

Every implemented `ACT-*` record must specify:

```text
Actor and active role
Permitted scope/relationship
Preconditions and authoritative state
Inputs and validation
Policy/configuration version
Command and idempotency rule
Success state and receipt/evidence
Audit event
External effects/outbox event
Failure, conflict and recovery states
User-visible message and next step
Negative authorization tests
```

## Critical action families

### ACT-APP-001 — Save application draft

Applicant may save only their own application in `DRAFT`. Valid fields persist even when other fields fail. Saving is repeatable and does not create a formal submission.

### ACT-APP-002 — Submit application

The system validates completeness, declarations, evidence and deadline under the effective admissions configuration. Submission uses an idempotency reference, creates an immutable submitted version and returns a receipt. Refresh/double-click cannot create a second application submission.

### ACT-ADM-001 — Review application evidence

Assigned admissions staff record criterion-level review without altering the submitted evidence. The record includes reviewer, scope, criteria version, finding, reason and time.

### ACT-ADM-002 — Approve admission decision

An authorized approver reviews a complete package and records approve/return/reject. Conflict and self-approval rules apply. An approved offer receives conditions, version and expiry.

### ACT-REG-001 — Confirm academic registration

The command verifies student status, period, course eligibility, policy outcome and required finance state. It creates authoritative registration exactly once and publishes a durable enrolment event. A Moodle failure does not reverse confirmation.

### ACT-FIN-001 — Record and allocate payment

Finance receives provider/simulated evidence, validates uniqueness, records the immutable payment event and allocates it under policy. Duplicate callbacks return the prior outcome. Reversals create new events, never destructive edits.

### ACT-FIN-002 — Approve financial adjustment

Authorized roles act only within configured threshold/scope. The request includes reason, evidence and approvals. Clearance is recalculated after completion.

### ACT-LRN-001 — Replay failed Moodle event

Integration Support may replay an eligible dead-letter/failed delivery after inspecting safe payload, mapping and attempts. Replay preserves correlation/idempotency and cannot edit registration. Reconciliation confirms final alignment.

### ACT-ASM-001 — Stage marks

Assigned teaching staff submit marks within authorized assessment components. Validation rejects unauthorized students, out-of-range values and invalid states. Staging does not make results official.

### ACT-ASM-002 — Release official results

An authorized approver acts on a validated, board-ready package under the effective assessment policy. Release is atomic, audited and immutable. Students see results only after completion.

### ACT-ASM-003 — Amend released result

Authorized amendment creates a new version linked to the prior result, reason, evidence and approval. It triggers progression/graduation re-evaluation and downstream notifications/reconciliation where needed.

### ACT-SUP-001 — Request support outreach

An adviser may initiate academic outreach for an assigned advisee without creating or disclosing a counselling case. The student chooses whether to engage unless safeguarding policy provides an exception.

### ACT-QA-001 — Issue proposed quality finding

QAO links evidence and criteria, records a proposed finding and routes it for response/verification. Conflict rules prevent improper self-verification.

### ACT-REP-001 — Submit regulatory return

An authorized regulatory user submits a validated, signed, versioned package. Delivery and provider acknowledgement are retained. Failed acknowledgement leaves the package in a recoverable state, not falsely submitted.

### ACT-IAM-001 — Assign privileged role

An authorized identity administrator assigns a role with scope, start/end dates, issuer, approval and reason. The assignee cannot use it outside the active period. High-risk self-assignment is denied.

## Common user-visible states

All formal actions support appropriate subsets of:

`LOADING`, `DRAFT`, `READY`, `SUBMITTING`, `SUBMITTED`, `IN_REVIEW`, `ACTION_REQUIRED`, `APPROVED`, `REJECTED`, `BLOCKED`, `CONFLICT`, `STALE`, `DELIVERY_PENDING`, `DELIVERY_FAILED`, `RECONCILING`, `COMPLETED`.

The UI must translate states into plain language: what happened, what it means, what the user should do next and the last reliable update.
