# GAP-024 — Rate-hardening follow-ups (proxy trust, initiation audit, full-seed reruns)

Status: Open
Raised by: implementation (TASK-PH8-004 verification)
Date: 2026-10-04

## Missing or contradictory design

1. `main.ts` trusts only loopback proxies: behind additional
   proxies all clients collapse to the proxy IP in rate-limit
   keys and audit rows. Widening trust is deployment
   configuration with security implications, deliberately
   untouched (fail-closed).
2. `FinanceInitiationRateGuard` 429s carry `Retry-After` but no
   audited-DENY row, unlike the auth/grants/catalogue
   precedent. Adding it needs `finance-payments` e2e proof,
   which needs the full applicant→student seed (Node 24 box).
3. Full-seed rate suites (`catalogue` discovery-rate-limit,
   `finance-payments` initiation 429, `finance-callbacks`,
   grade-board legit-flow budget) cannot run on the Node 22
   box (full demo seed needs Node 24 type stripping).
4. The new `UploadQuotaGuard` sits on the upload path of
   `applications.e2e`, `applications-case.e2e`, and the
   applicant browser journey: analyzed safe (≤5 stored uploads
   per shared user vs quota 10; rejects never create rows),
   but unproven until those suites rerun.

## Why it blocks or risks implementation

Production rate-key correctness, audit parity on payment
initiation refusals, and measured-traffic budget review all
need a seeded environment this box cannot build.

## Affected requirements, roles, screens, actions, permissions, data, integrations and tests

Rate-limit baseline rows, `POST /finance/payments/initiate`,
`main.ts` trust-proxy, catalogue/finance/grade-board suites.

## Bounded options and consequences

Rerun the listed suites on a Node 24 box with full seed
(including `applications.e2e`, `applications-case.e2e`, and
the applicant browser journey for quota-regression proof);
add the initiation DENY audit with e2e proof there; set proxy
trust from deployment config at deploy time.

## Human decision

Pending.

## Approver/date and controlling policy or ADR

Pending.

## Documents/task packets to update

TASK-PH8-004, NOTE-PH8-004.
