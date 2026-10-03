# TASK-PH8-001: Notification record and delivery status

## Authority and ownership

User authorization: Phase 8 slice 1 implementation request, 2026-10-03.
Release v0.9.0 track. Lead unassigned (assign at kickoff); reviewer
unassigned. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 1 (`11-…/10-phase-8-
hardening-operations-and-evidence.md`); recovery/notification
catalogue §§16.11–16.14 (notification contents, delivery states,
recovery/escalation rules, audit requirements); UX §12.13
(authoritative in-system centre, channels vs systems, duplicate
suppression, mandatory-notice rule); applicant journey §9
(notification events, CAT deadlines, escalation); student journey §8
(notification categories, neutral channels); quality §11.39
(neutral prompts + secure links); perms §§15.6–15.7,15.19; SCR
records as touched per slice. Exact evidence: compendium §§12.13,
applicant §9, student §8, quality §11.39 (active requirements).
SUP-001–SUP-013 apply. Depends on Phase 7 slices 6–7 (release and
amendment events are fan-out sources) and Phase 6 delivery-worker
precedent. Owning modules: new `notifications` (+ `applicant`
inbox extension, staff signals).

## User outcome and boundaries

Every mandatory workflow event (decision released, result released
or amended, payment posted, clarification issued, finding overdue,
role expiring, incident opened) creates an authoritative in-system
notification record with event, plain-language explanation, required
action, CAT deadline, secure link, responsible office and delivery
state — then a worker advances it through Queued → Sent → Delivered/
Read, or Failed → Retried → dead-letter → staff escalation for
mandatory notices. Channels are simulated (SIM-NOTIFY-v1 provider):
in-system delivery is real, email/SMS dispatch is recorded as
provider attempts with neutral previews only (no results, balances,
disciplinary or support details — §§12.13, student §8, §11.39).
Mandatory notices cannot be suppressed; optional ones honor
preferences. Duplicates suppress on idempotency keys. Staff get a
pollable signal inbox derived from the same records (GAP-016 held:
no separate staff table semantics beyond the signal projection…
see design note below). No real provider, no real contact data.

Design note (GAP-016): the agreed batch design keeps ONE
notification record table plus a staff-signal projection over it
(recipient role + scope), not a parallel staff inbox system. The
packet uses "staff signal inbox" to mean that projection with its
own read API/UI.

## Policy and explicit demonstration scope

`NOTIFY-DEMO-v1` (fictional, SUP-009): template registry with
versioned template IDs (AUTH_MESSAGES pattern), simulator provider
`SIM-NOTIFY-v1`, retry budget 3 attempts with backoff, escalation
after 2 failures or 60 minutes (Moodle-enrolment precedent §16.13),
CAT deadlines via existing time helpers. No real policy, providers,
contacts or thresholds claimed. GAP-008/016 remain open for
production provider approval.

## State authorization failure and recovery

Notification reads are recipient-scoped (own records only; staff
signals scoped by role + assignment scope, live-checked); template
writes are governance-gated (versioned, never edited — supersede);
worker claims due rows with single-flight + row lock (DeliveryWorker
precedent); delivery failure never mutates the underlying workflow
state (§16.12: failure ≠ workflow failure); mandatory-notice failure
creates a staff follow-up task under policy; expired grants fail
safe; denials 403 + audit; neutral 404s; version-checked transitions
+ idempotent keys; CSRF. Concurrent worker ticks converge (TEST-REC-005
shape); job failure retains certified state + reconcile/retry
(TEST-REC-010 shape).

## Proof and documentation

API (`notifications.e2e-spec.ts`, ~14 tests): template versioning +
supersede, record creation with required fields, state machine
(queued→sent→delivered/read, failed→retried→dead-letter),
mandatory-escalation task, suppression rules (mandatory cannot
suppress; duplicates suppress), recipient isolation + staff-scope
reads, role denials, neutrals, worker concurrency convergence,
idempotence + key conflict, expired-grant 403. Browser: event →
inbox → read receipt; mandatory notice survives suppression attempt
(390px, keyboard/focus, no overflow, empty localStorage). Record in
PHASE-8 review + NOTE-PH8-001.

## Out of scope and open gates

Real email/SMS providers and contact verification; appeal route;
GPA/progression engine; production RPO/RTO and retention schedules.
Gates: GAP-008, GAP-016, open decisions (notification providers,
monitoring/escalation ownership, UAT participants).

## Completion

Pending; see VERIFICATION. Human review pending.
