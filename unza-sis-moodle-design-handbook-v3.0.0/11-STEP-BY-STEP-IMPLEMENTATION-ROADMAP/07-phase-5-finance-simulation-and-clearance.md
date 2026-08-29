# Step 6 — Phase 5: Finance Simulation and Clearance

**Release target:** v0.6.0

## User/system outcome

The demo system assesses charges, simulates payment callbacks, reconciles uncertain/duplicate outcomes and calculates financial clearance from ledger plus policy.

## Read before planning

- Finance Blueprint
- Applicant payment Part 7
- Student finance journey
- Rate limit/idempotency/recovery rules
- Permission Part 3A

## Learning goals

- Fixed-precision money
- Ledger/allocations
- Webhooks/signature concepts
- Idempotency and reconciliation

## Ordered delivery slices

1. Versioned fee assessment
2. Student account/statement
3. Payment simulator and request state
4. Callback normalization and duplicate protection
5. Allocation/balance/clearance calculation
6. Finance reconciliation queue

## Security, integrity and recovery focus

- No real payment credentials
- Signed simulator callback contract
- Per-endpoint rate limits
- Adjustment/clearance segregation
- No sensitive payment data in logs

## Required proof

- Duplicate/delayed/reversed/mismatched callback
- Connection lost after initiation
- Money rounding and allocation invariants
- Finance scope/threshold denials
- Restore/reconciliation scenario

## Team rotation and documentation

The developer who did less data work leads ledger logic; the other leads callback/reconciliation UI and adversarial tests. Both explain why clearance is calculated.

## Demonstration checkpoint

Simulate uncertain payment, show “do not pay again,” reconcile it, calculate clearance, then demonstrate a reversal and governed recalculation.

## Exit gate

- Immutable compensating records
- Provider cannot toggle clearance
- Every amount has currency/source
- Uncertain state and recovery are user-visible
