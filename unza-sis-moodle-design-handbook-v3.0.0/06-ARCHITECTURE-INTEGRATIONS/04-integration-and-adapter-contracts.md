# Integration Contracts

## Adapter boundary

```text
Domain completion
→ transactional outbox event
→ Integration Hub/worker
→ provider adapter
→ normalized delivery result
→ reconciliation
```

Adapters translate and deliver. They do not contain admissions, academic, finance, support or reporting policy.

## Required adapter capabilities

- Configuration and credential validation
- Request/response mapping and schema versioning
- Credential isolation
- Timeout and retry classification
- Idempotency/replay support
- Provider-result normalization
- Safe error masking
- Reconciliation/status query
- Audit/metrics/correlation hooks
- Test double/simulator

## INT-MDL-001 — Moodle

**Outbound:** course shell, teaching assignment, Tutorial Group and student enrolment after authoritative SIS facts.  
**Inbound/staged:** permitted learning activity/grade evidence.  
**Authority boundary:** Moodle never confirms academic registration, releases official results or changes progression.  
**Recovery:** failed/delayed/duplicate delivery, mapping error, dead letter, approved replay and SIS/Moodle reconciliation.

## INT-PAY-001 — Payment provider

**Inbound:** authenticated transaction/callback evidence with provider reference and status.  
**Authority boundary:** provider success does not decide allocation, refund approval or academic eligibility.  
**Controls:** signature/authentication, replay window, unique provider reference, idempotency, reversal events and reconciliation query.

## INT-NOT-001 — Email/SMS

**Outbound:** approved template ID/version plus minimum safe payload.  
**Authority boundary:** delivery communicates but does not create the underlying decision.  
**Privacy:** sensitive results, support detail and full identifiers are not placed in unsafe previews/messages.  
**Recovery:** delivery status, retry policy, channel fallback where approved and in-system notification record.

## INT-DOC-001 — Document storage/verification

**Outbound/inbound:** authorized object transfer or verification reference/result.  
**Controls:** content/size validation, private object reference, short-lived access, safe provider results and retention policy.  
**Authority boundary:** automated verification is evidence; the authorized university workflow makes the decision.

## INT-REG-001 — Regulatory delivery

**Outbound:** signed/versioned submission package and minimal metadata.  
**Inbound:** receipt, validation failure or acknowledgement.  
**Authority boundary:** a network response is not successful submission unless the contract-defined acknowledgement is retained.

## Simulation-first rule

The presentation release uses deterministic simulators for payment, Moodle and notifications. Simulators reproduce success, timeout, duplicate callback, delayed acknowledgement and reconciliation. They use no real credentials and are explicitly labelled.
