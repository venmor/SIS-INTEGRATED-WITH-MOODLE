# TASK-PH7-002: Moodle grade staging snapshot

## Authority and ownership

User authorization: Phase 7 slices 1–3 implementation request, 2026-09-24.
Release v0.8.0 track. Proposed lead Charles Hangoma; reviewer Chitundu
Milimbo. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 2; Design Sec 5 §4 (staging
lifecycle RECEIVED→POSTED_AS_PROVISIONAL, 11 provenance fields, Moodle
never overwrites moderated/approved/published); Lecturer/Tutor Book
Part 2 §§6–7 (marking workflow, bulk preview columns, grade states,
action separation); Admin Ops Journey C step 2 (staging snapshot with
source + mapping version); architecture authority table + INT-MDL-001
(Moodle stages evidence, never releases); REQ-LRN-004/005,
REQ-OPS-004; ACT-ASM-001 (staging ≠ official); permission §§15.6–15.7;
SCR-REC-LEC-001 + SCR-OPS-LRN-001. Exact records as prior packets.
SUP-001–SUP-013 apply. Depends on TASK-PH7-001 (approved plan +
active mapping). Owning module `assessment`.

## User outcome and boundaries

Assigned lecturer stages one immutable grade batch per mapping +
source revision: lines carry Moodle instance/course/activity IDs, SIS
offering/component, student/enrolment mapping, original value,
conversion formula, import time, source response. Batch lifecycle
RECEIVED→VALIDATED→MAPPED→REVIEWED→ACCEPTED→POSTED_AS_PROVISIONAL;
failures MAPPING_REQUIRED/CONFLICT/REJECTED/RECONCILIATION_REQUIRED.
Duplicate delivery converges by activity/user/version; post-approval
Moodle change emits a change event, never auto-overwrites; Moodle-only
student yields no official grade (flagged discrepancy); outage
preserves last confirmed batch. Canonical chain ACT-ASM-001 +
CMD-LRN-StageMoodleGradeTransfer + INT-Moodle-GradeTransfer-v1 +
EVT-MoodleGradeTransferStaged-v1 (GAP-022). Outbox event written
atomically with the batch; downstream delivery reuses Phase 6 worker
semantics (no new provider).

## Policy and explicit demonstration scope

`ASSESSMENT-DEMO-v1` as TASK-PH7-001. Simulator-sourced batches only
(MOODLE-SIM-v1 provenance); no live Moodle pull in this slice.
Provisional rows hidden from students. No moderation, board, release,
or amendment effects.

## State authorization failure and recovery

LEC + stage-marks within offering assignment; unmapped/expired mapping
stops transfer (MAPPING_REQUIRED); out-of-range lines quarantined at
stage time, batch still stored; neutral 404s; denials 403 + audit
(tutor ungranted TEST-AUTH-004, sysadmin TEST-AUTH-009 pattern,
moodle-admin academic write); idempotency per batch key + resource
replay (same key returns stored batch); version-checked transitions;
CSRF. Uncertain outcomes resolve by command lookup, never blind retry.

## Proof and documentation

API tests: stage happy-path (snapshot + provenance + outbox),
idempotent replay returns stored batch, mismatched-key conflict,
unmapped/expired refusal, Moodle-only flag (no grade row),
duplicate convergence, timeout→retry→recover, outage survival,
post-approval change event (no overwrite), denials, neutrals,
concurrency. Browser: stage batch → preview columns → stored state
(390px, keyboard/focus, no overflow). Record in PHASE-7 review +
NOTE-PH7-002.

## Out of scope and open gates

Validation queue (slice 3); moderation/board/release/amendment
(slices 4–7); grade calculation/GPA engine; real Moodle pull. Gates:
GAP-022, open decisions (results authorities, Moodle instance).

## Completion

Pending; see VERIFICATION. Human review pending.
