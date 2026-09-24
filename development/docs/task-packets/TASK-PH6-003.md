# TASK-PH6-003: Moodle simulator adapter and delivery worker

## Authority and ownership

User authorization: Phase 6 all-slices implementation request, 2026-09-24.
Release v0.7.0 track. Proposed lead Charles Hangoma (event/adapter
path); reviewer Chitindu Milimbo. Rehearsal duties only. Human review
pending.

Controlling sources: roadmap slice 3; INT-MDL-001 (adapter translates
and delivers, no policy); simulation-first rule (deterministic,
labelled, no credentials); MOD-SHL-01 + MOD-ENR-02 (shell/enrol/role/TG
sync, quiz-authority-gated role mapping, de-enrolment outcomes);
REQ-LRN-002/003; student Moodle-access states (active/being prepared;
never re-register); expiry-daemon worker precedent (claim guard,
batches, Vercel skip). Exact records as prior packets. SUP-001–SUP-013
apply. Depends on TASK-PH6-001/002. Owning module `integration`.

## User outcome and boundaries

In-process worker claims PENDING attempts, delivers to MOODLE-SIM-v1
(scenarios success/timeout/duplicate/mismatch/outage, HMAC), records
results idempotently; simulator holds shells/enrolments/groups as the
"actual" side. Registration confirm → shell ensured → enrolments (role
mapped; tutor quiz authority gates Non-editing-Teacher+quiz vs plain
Tutor) → TG membership mirrored; drops/withdrawals → suspend/remove
per policy, never erasing learning history. Student sees active or
being-prepared with last-checked time. Moodle failure never reverses
registration.

## Policy and explicit demonstration scope

`MOODLE-SIM-v1` fictional only; secret via env; scenarios demo-driven
per event + global outage switch. At-least-once delivery, capped
backoff with jitter, idempotent consumers.

## State authorization failure and recovery

Worker is system-owned; simulator signature-gated; duplicate delivery
converges; timeouts retry; permanent mapping errors route to manual
review, never infinite retry.

## Proof and documentation

API tests: claim-and-deliver happy path, shell idempotency, enrol/role/
TG sync incl. quiz-authority gating (TEST-AUTH-004 shape), de-enrol
outcomes, duplicate delivery single effect, timeout retry, outage
survival, student-state derivation, concurrency single-claim. Browser:
register → Moodle access active. Record in PHASE-6 review + NOTE-PH6-003.

## Out of scope and open gates

Queue UI (slice 4); dead-letter/replay (slice 5); reconciliation
(slice 6); grades (Phase 7). Gates as TASK-PH6-000.

## Completion

Pending; see VERIFICATION. Human review pending.
