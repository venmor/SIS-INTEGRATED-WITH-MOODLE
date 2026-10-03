# TASK-PH8-003: Operations health and incident queue

## Authority and ownership

User authorization: Phase 8 slice 3 implementation request, 2026-10-03.
Release v0.9.0 track. Lead Chitundu Milimbo; reviewer Charles Hangoma.
Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 3 (`11-…/10-phase-8-
hardening-operations-and-evidence.md`); incident lifecycle
(`04-rate-limiting-redundancy-abuse-and-recovery.md` §Incident
lifecycle: detection, journeys/data, severity, containment, root
cause, recovery, reconciliation evidence, preventive action, owner,
linked release/PR; closes only after recovery evidence);
provider/worker recovery (timeout, retry, backoff, max attempts,
dead-letter, approved replay, idempotency, reconciliation query);
uncertain completion §16.5; incident/outage communication §16.10;
audit requirements §16.14; perms §§15.6–15.7,15.19. Exact evidence:
compendium incident-lifecycle + worker-recovery clauses (active
requirements). SUP-001–SUP-013 apply. Depends on TASK-PH8-001
(notification dead-letters are a source) and Phase 6 ops
(IntegrationIncident/replays/reconciliation stay domain-owned).
Owning module: new `ops`.

## User outcome and boundaries

One generic ops console over existing domain operations: `OpsIncident`
rows (OPEN→ACKNOWLEDGED→RESOLVED→CLOSED) auto-opened convergently
from notification and integration delivery dead-letters plus manual
operator opens, with owner, target response, root cause, recovery
evidence, preventive action and linked refs; the queue aggregates
open incidents, pending dead-letters (both domains), pending
replays, OPEN escalation records and OPEN recon cases as linked
rows into their owning queues. Mandatory-notification dead-letters
stay on the examinations lane (slice-1 escalation records); the
console links them read-only instead of duplicating. No paging or
alerting integrations, no RPO/RTO values, no production incident
ownership.

## Interim demo decisions (fail-closed until approved)

- Authority: INTEGRATION_SUPPORT + live `replay-event` capability
  for all ops writes, MOODLE_ADMIN admitted to reads following the
  existing `opsRole()` precedent (`integration.service.ts:1068`).
  `replay-event` doubles as the console capability because replay
  approval is already the console's sharpest power; recorded here
  as a GAP-009 interim, not an institutional capability grant.
- Console visibility: support reads OPEN escalation/dead-letter
  rows regardless of scope for console purposes; reads audited.
- Transitions are internal + audited only (no outbox), matching the
  `IntegrationIncident` precedent.

## Policy and explicit demonstration scope

No new policy values. Retry/backoff/dead-letter budgets reuse the
domain workers' versioned policies (`NOTIFY-DEMO-v1`,
`MOODLE-DEMO-v1`). Demo data only (SUP-009). GAP-009 stays open
for production ownership, paging, and RPO/RTO approval.

## State authorization failure and recovery

Operator INTEGRATION_SUPPORT (live `replay-event`) on writes;
MOODLE_ADMIN reads via `opsRole` precedent; SYSADMIN denied on
writes (governance uses the IAM trail); students/tutors/lecturers
denied; expired grants fail safe; denials 403 + audit; neutral
404s; version-checked transitions + idempotent keys; CSRF.
Concurrent transitions converge on row locks (TEST-REC-005 shape);
one OPEN per (sourceKind, sourceRef) structurally (partial-unique);
job failure retains certified state + reconcile/retry.

## Proof and documentation

API (`ops-incidents.e2e-spec.ts`, 15 tests): manual open + list
scoping (status/openOnly filters, detail, target response), ack ownership, resolve demands evidence + root cause,
close immutability, auto-open on notification dead-letter (dedupe:
two dead-letters → one incident), auto-open on integration
dead-letter, mandatory lane stays examinations-only (no duplicate
OpsIncident), role denials, neutrals, racing-resolve convergence,
idempotent replay + key conflict, expired-grant 403. Browser
`ops-queue` (dead-letter → incident → ack → resolve with evidence
→ CLOSED) 1/1 (390px, keyboard/focus, no overflow, empty
localStorage). Record in PHASE-8 review + NOTE-PH8-003.

## Out of scope and open gates

Finance recon auto-sweep (domain-owned); paging/alerting; RPO/RTO;
production incident ownership. Gates: GAP-009, open decisions
(monitoring/escalation ownership, UAT participants).

## Completion

Implemented in the worktree 2026-10-03 (uncommitted, human
review pending): migration `20261003120000_ph8_ops_queue`,
`ops` module + controller + DTOs, worker auto-open hooks in
both domains, `/admin/ops` console + `/api/ops` proxy +
contracts, `ops-incidents` 15/15 on fresh `sis_ph8_s3_final2_test`
(incl. `openOnly` coercion fix + list/detail/target-response
coverage),
`notifications` 16/16 regression, unit 73/73, browser
`ops-queue` 1/1 on fresh `sis_ph8_browser_s3_test`, backup
drill incl. OpsIncident; see VERIFICATION Phase 8 slice 3 and
NOTE-PH8-003. Human review pending.
