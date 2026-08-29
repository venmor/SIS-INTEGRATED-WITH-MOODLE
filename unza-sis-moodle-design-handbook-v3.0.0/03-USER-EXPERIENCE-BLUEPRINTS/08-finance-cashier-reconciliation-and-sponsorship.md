# Role Blueprint 8 — Finance, Cashier, Reconciliation and Sponsorship

> **Source mode:** composite approved blueprint using the student-finance domain, applicant/student payment journeys, permission matrix, provider/reconciliation rules and resilience tests.

## Roles

- **Cashier:** records or confirms approved in-person payment evidence and issues receipts; cannot manually grant academic registration.
- **Finance Officer:** reviews charges, allocations, balances, arrangements and permitted adjustments within scope.
- **Reconciliation Officer:** resolves provider/bank/SIS mismatches without editing transaction history.
- **Sponsorship Officer:** records sponsor commitments, coverage, evidence, expiry and allocation rules.
- **Finance Approver:** approves adjustments, waivers/refunds or other high-impact actions according to configured threshold and segregation of duties.

## Finance workspace

The home page prioritizes unreconciled transactions, payments with uncertain outcomes, duplicate/mismatch cases, expiring sponsorships, adjustment/refund approvals, clearance-impacting holds and reconciliation deadlines. Money is always shown with currency, source, effective time and allocation state.

## Authoritative model

Charges, payments, allocations, sponsorships, refunds and adjustments are distinct immutable records. The account balance is calculated from the subledger; financial clearance is a versioned policy result, not a manual boolean switch. A payment provider reports a transaction result but cannot grant clearance.

## Journey A — charge and payment confirmation

1. Approved fee configuration assesses charges for the correct programme, period, load and category.
2. The student receives an amount, reason, due date and payment reference.
3. A provider initiation receives an idempotency reference.
4. Callback and reconciliation records are normalized and checked for signature, amount, currency, reference and duplicate state.
5. A confirmed payment is allocated according to approved rules.
6. The system recalculates balance and clearance using the controlling policy version.
7. Receipt and account timeline are available independently of SMS/email delivery.

## Journey B — uncertain or mismatched transaction

The officer sees provider evidence, SIS request, callbacks, amount/reference differences, prior attempts and safe actions. They may link verified evidence, request information, retry an allowed query, split/allocate according to policy or escalate. They cannot delete the original transaction or fabricate provider confirmation.

## Journey C — sponsorship

The Sponsorship Officer records sponsor identity, beneficiary scope, covered fee categories, amount/percentage, effective dates, evidence and approval. Changes create versions. Expiry or insufficient coverage recalculates the student obligation and explains the effect before registration/payment decisions.

## Journey D — adjustment, waiver or refund

1. Request includes amount, reason, policy, evidence and affected ledger entries.
2. System calculates approval authority and segregation requirements.
3. Reviewer sees consequences for balance, clearance and related registration.
4. Approved action creates compensating ledger records; historical entries are not overwritten.
5. External payout has its own delivery and reconciliation lifecycle.

## Anti-abuse and failure controls

- Rate limits protect payment initiation, callback endpoints, receipt retrieval and reconciliation search without blocking legitimate bulk operations.
- Idempotency covers double clicks, retries and duplicate callbacks.
- Secrets and signature keys remain outside source control and logs.
- Money uses fixed-precision database values; no floating-point arithmetic.
- Failed notification never changes ledger state.
- Reversal after clearance triggers a governed recalculation and affected-workflow review.
- Backup restore must be reconciled with provider transactions received around the recovery point.

## Acceptance requirements

- Providers cannot grant clearance or edit the subledger.
- Staff cannot manually toggle clearance without a governed policy result.
- Adjustment/refund thresholds and approvals are configured and tested.
- Reconciliation preserves source evidence and original records.
- Duplicate and uncertain outcomes do not create duplicate charges/payments.
- Students see clear status, reason, next step and safe instruction not to pay twice.
- Authorization, audit, recovery and money-integrity tests block release on failure.

## Controlling sources

Design Section 6; Applicant payment Part 7; Student finance journey; permission Part 3A; integration contracts; Section 19 Part 4; acceptance tests.
