# TASK-PH6-005: Dead letter, replay approval and incidents

## Authority and ownership

User authorization: Phase 6 all-slices implementation request, 2026-09-24.
Release v0.7.0 track. Proposed lead Chitindu Milimbo (failure simulator
+ reconciliation tests); reviewer Charles Hangoma. Rehearsal duties
only. Human review pending.

Controlling sources: roadmap slice 5 + required proof (outage, duplicate/
out-of-order, bad mapping, role-limited replay, drift); INT-EVT-01
(retry text, dead-letter triggers, no-delete rule); ACT-LRN-001;
REQ-OPS-005 (replay approved work, never change the decision);
TEST-REC-001/004/005/006/008; INCIDENT.md template (close only with
evidence); UI-DECISION-001 (frozen package + declaration). Exact records
as prior packets. SUP-001–SUP-013 apply. Depends on TASK-PH6-003/004.
Owning module `integration`.

## User outcome and boundaries

Exhausted retries and permanent errors (bad mapping, revoked credential,
malformed, unresolvable, policy-blocked) move to dead letter with
reason; nothing is ever deleted to look clean. Replay is a decision
page (frozen evidence, declaration "I confirm…within my assigned
authority"), role-limited to Integration Support, preserving
correlation/idempotency, never editing registration. Range replay for
approved windows. Incidents (outage/dead-letter) track owner, severity,
containment, recovery; closure needs reconciliation evidence (slice 6
verifies). Pause delivery command for maintenance.

## Policy and explicit demonstration scope

`MOODLE-DEMO-v1` fictional; outage switch + failure injection
demo-only, never production-enabled. Step-up auth absent: replay
approvals enforce SoD + audit (GAP-020 covers finance; record
GAP-022 if integration replay needs it — decide during slice).

## State authorization failure and recovery

Replay/retry/pause/incident-close are integration-support-only;
Moodle Admin cannot replay; students see safe wording only; conflicts
version-checked; idempotency keys on every mutating call.

## Proof and documentation

API tests: dead-letter triggers, replay approval incl. frozen-package
mismatch refusal, role denials (admin/student), range replay bounds,
pause/resume, incident lifecycle + closure-evidence requirement,
outage + duplicate/out-of-order + bad-mapping proof set, connection
loss, concurrency. Browser: dead letter → approve replay → delivered
(mobile/keyboard/SR). Record in PHASE-6 review + NOTE-PH6-005.

## Out of scope and open gates

Reconciliation engine (slice 6 verifies replay outcomes); real
provider credentials (open decision). Gates as TASK-PH6-000.

## Completion

Pending; see VERIFICATION. Human review pending.
