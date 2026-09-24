# TASK-PH6-006: Expected-vs-actual reconciliation and closure

## Authority and ownership

User authorization: Phase 6 all-slices implementation request, 2026-09-24.
Release v0.7.0 track. Proposed lead Charles Hangoma; reviewer Chitindu
Milimbo. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 6 + exit gate (authority preserved,
idempotent retry, ops cannot edit, evidence closure) + checkpoint
(replay → reconcile → no duplicate enrolment); MOD-REC-04 (9 case
types, side-by-side facts, action matrix, "never make SIS active here");
INT-REC-02 (authority matrix, closure evidence "what proves resolved?");
student failure table (9 rows) + never-re-register wording; TEST-E2E-
REG-001/OPS-011/MOD-004; TEST-REC-008. Exact records as prior packets.
SUP-001–SUP-013 apply. Depends on TASK-PH6-000–005. Owning module
`integration`.

## User outcome and boundaries

Scheduled + on-demand reconciliation runs compare SIS expected (roster,
assignments, TG membership, shells) against simulator actual, emitting
diff codes (MISSING_IN_MOODLE, UNEXPECTED_IN_MOODLE, ATTRIBUTE/ROLE/
ENROLMENT_MISMATCH, MAPPING_MISSING). Safe diffs auto-repair by
requeueing delivery; grade/identity/unexpected-enrolment conflicts open
governed cases routed to the owning workflow — ops never edits
registration, never toggles SIS active, never deletes history.
Run/case closure requires delivery confirmation or linked domain action
plus downstream check. Checkpoint demo runs green in browser.

## Policy and explicit demonstration scope

`MOODLE-DEMO-v1` fictional; mapping tables shaped for Phase-7 grade
reuse (no grade staging here). Duplicate-account merge is a manual-route
case (no invented merge tooling).

## State authorization failure and recovery

Runs are system-owned + idempotent per scope; cases role-scoped;
resolutions version-checked; audit every transition; neutral 404s.

## Proof and documentation

API tests: run detects all diff kinds, auto-repair path, case creation
+ routing, forbidden resolutions denied (make-active, payload edit,
delete), closure-evidence enforcement, idempotent reruns, drift proof,
concurrency. Browser: full checkpoint (register → force outage →
queue/dead letter → approve replay → reconciled → no duplicate).
Record in PHASE-6 review + NOTE-PH6-006.

## Out of scope and open gates

Grade transfer (Phase 7); real Moodle (open decision); SSO link
(deferred, no real Moodle). Gates as TASK-PH6-000.

## Completion

Pending; see VERIFICATION. Human review pending.
