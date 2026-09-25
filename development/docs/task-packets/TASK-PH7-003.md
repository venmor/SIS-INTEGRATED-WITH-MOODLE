# TASK-PH7-003: Validation and missing-mark queue

## Authority and ownership

User authorization: Phase 7 slices 1–3 implementation request, 2026-09-24.
Release v0.8.0 track. Lead Chitundu Milimbo; reviewer Charles Hangoma
(user correction 2026-09-25 confirmed: Chitundu leads the Phase 7
slices, Charles reviews). Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 3; Design Sec 5 §§3,12,17
(non-numeric outcomes, course-result early states, 6-step missing-mark
rule — never silent fail); Lecturer/Tutor Book Part 2 §§6,8 (batch
preview columns, moderator limits); Admin Ops Journey C steps 3–4
(validation finds missing/duplicate/out-of-range/unmapped; lecturer
corrects, examinations never invents); Moodle ops MOD-GRD-03 §§12.28–
12.30 (staging card, handoff, 9-row failure table); REQ-ASM-002/003,
REQ-OPS-003/005; permission §§15.6–15.7,15.19; SCR-DEC-ASM-001
(read-only findings view only); recovery catalogue §§16.5,16.14.
Exact records as prior packets. SUP-001–SUP-013 apply. Depends on
TASK-PH7-002 (staged batches). Owning module `assessment`.

## User outcome and boundaries

Validation runs per staged batch and writes immutable findings:
MISSING_MARK, DUPLICATE, OUT_OF_RANGE, UNMAPPED, MOODLE_ONLY,
SCALE_MISMATCH, STALE_MAPPING, STRUCTURALLY_INVALID. Partial imports
isolate invalid lines and preserve valid ones (TEST-REC-003); missing
marks set result MISSING_MARKS + work item to the responsible unit
with escalation deadline (DS5 §17); no exception stored as zero.
Queues split by swimlane: technical mapping errors (Moodle Admin),
academic findings (lecturer/coordinator), enrolment truth (Registry);
examinations operates the queue but corrects nothing. Result-package
screen shows findings read-only; release actions do not exist in this
slice. Dead-letter → authorized replay reuses ACT-LRN-001 semantics;
replay resets budget, never edits source rows.

## Policy and explicit demonstration scope

`ASSESSMENT-DEMO-v1` as TASK-PH7-001. Queue thresholds/escalation
deadlines are demo values recorded in the GAP. No moderation, board,
release, student view, or amendment effects. Progression untouched
(slice 5+ boundary).

## State authorization failure and recovery

EXAMINATIONS_OFFICER + validate-results (new demo role/capability,
scope PERIOD) operates queue reads/transitions; lecturer corrects own
batches only (new revision, never edit); moodle-admin sees technical
errors only; students 403 everywhere (REQ-ASM-007 boundary test);
neutral 404s; denials 403 + audit; version-checked finding
transitions; idempotent validate/replay keys; CSRF. Concurrent
validate → conflict, no silent overwrite (TEST-REC-005); expired role
fails safe (TEST-REC-006); notification failure leaves domain state
intact (TEST-REC-010).

## Proof and documentation

API tests: each finding code, partial-preserves-valid, missing-mark
work item + no-zero assertion, swimlane visibility (each role sees
only its lane), replay delivers without duplicating, range reset,
decline reasons, pause/resume if worker-gated, incident evidence
rule where applicable, denials, neutrals, concurrency. Browser:
queue → finding detail → correction resubmit → finding clears
(390px, keyboard/focus). Record in PHASE-7 review + NOTE-PH7-003.

## Out of scope and open gates

Moderation/board/release/amendment (slices 4–7); calculation/GPA;
student result view; real thresholds/providers. Gates: GAP-022, open
decisions (results authorities, Moodle instance).

## Completion

Pending; see VERIFICATION. Human review pending.
