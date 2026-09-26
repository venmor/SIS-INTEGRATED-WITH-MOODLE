# TASK-PH7-005: Board/decision package

## Authority and ownership

User authorization: Phase 7 slices 4–5 implementation request, 2026-09-25.
Release v0.8.0 track. Lead Chitundu Milimbo; reviewer Charles Hangoma.
Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 5; Lecturer/Tutor Book Part 3 §7
(board submission/decision/release safety); Design Sec 5 §§12–13
(course-result workflow, approval route); Journey C steps 5–6;
recovery catalogue §§16.5,16.7 (conflict/stale); permission §§15.6–
15.7,15.19 (examinations operates package; release only with
authority; coordinators never unilateral); SCR-DEC-ASM-001.
Exact records as prior packets. SUP-001–SUP-013 apply. Depends on
TASK-PH7-004 (moderated-approved official CA). Owning module
`assessment`.

## User outcome and boundaries

Result packages assemble frozen inputs per offering+period: approved
official CA refs, `weighted-total-v1` formula version with computed
preview + DS5 §11 trace, moderation refs, exception cases with
authorized handling, candidate-list reconciliation, declarations,
and a SHA-256 integrity hash. Assembly is blocked unless every
component is moderated-approved, no OPEN MISSING findings remain,
and no input comes Moodle-direct. The examinations authority
records the board decision (four-eyes, decider ≠ preparer):
approve-for-release, return, clarify, condition, defer, or refer —
with reasons, date, and authority. Conditions store for slice-6
enforcement; deferrals re-submit as new versions. No release
effects, no student view, no amendment.

## Policy and explicit demonstration scope

`ASSESSMENT-DEMO-v1` + `weighted-total-v1` + GAP-022 slices 4–5
interim values (examinations-authority board path — no demo board
invented). Calculation is a computed preview; GPA/progression
untouched. No real boards, authorities, or thresholds claimed.

## State authorization failure and recovery

Preparer LEC/COORDINATOR within scope; decider EXAMINATIONS_OFFICER
+ board authority (PERIOD scope, period-matched), never the
preparer; moderator/tutor/sysadmin/moodle-admin/student denied on
package writes and decisions; neutral 404s; denials 403 + audit;
version-checked package/decision transitions + idempotency; CSRF.
Concurrent decisions conflict (TEST-REC-005 shape); expired grants
fail safe; release-job failure semantics belong to slice 6.

## Proof and documentation

API tests: assembly happy-path (hash, trace, reconciliation),
assembly refusals (unmoderated component, missing inputs,
Moodle-direct, open MISSING findings), decision transitions with
reason/condition demands, SoD refusals, student-everywhere 403s,
neutrals, concurrency, idempotence. Browser: package →
approve-for-release journey ending at "approved for release" with
students still seeing nothing (390px, keyboard/focus, no overflow,
empty localStorage). Record in PHASE-7 review + NOTE-PH7-005.

## Out of scope and open gates

Official release/student view (slice 6); amendment (slice 7);
GPA/progression; notification delivery. Gates: GAP-022, open
decisions (results authorities, Moodle instance).

## Completion

Pending; see VERIFICATION. Human review pending.
