# Step 7 — Phase 6: Moodle Integration and Recovery

**Release target:** v0.7.0

## User/system outcome

A confirmed SIS registration reliably produces simulated Moodle shell/enrolment state, survives outage/duplicate delivery and is closed through reconciliation evidence.

## Read before planning

- Design Section 9
- Moodle Admin and Integration Support journeys
- Moodle authority/reconciliation
- Outbox/event/adapter contracts

## Learning goals

- Events and eventual consistency
- Outbox worker
- Adapter/test double
- Retry/dead letter and reconciliation

## Ordered delivery slices

1. Course/mapping configuration
2. Outbox event after registration
3. Moodle simulator adapter
4. Delivery queue/status
5. Failure/dead-letter/safe replay
6. Expected-vs-actual reconciliation

## Security, integrity and recovery focus

- Credential isolation
- Minimal safe event payload
- Authenticated callbacks/admin actions
- Replay approval and audit
- No manual official record edits

## Required proof

- Provider outage/timeout
- Duplicate/out-of-order delivery
- Bad mapping/permanent failure
- Role-limited replay
- Registration/Moodle drift reconciliation

## Team rotation and documentation

Lead implements event/adapter path; reviewer builds the failure simulator and reconciliation tests. Swap for operations UI.

## Demonstration checkpoint

Confirm registration, force Moodle failure, show queue/dead letter, approve replay, reconcile and prove no duplicate enrolment.

## Exit gate

- SIS authority preserved
- Retry is idempotent
- Operations cannot edit registration
- Incident closes with reconciliation evidence
