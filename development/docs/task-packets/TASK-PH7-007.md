# TASK-PH7-007: Result amendment skeleton

## Authority and ownership

User authorization: Phase 7 slice 7 implementation request, 2026-10-01.
Release v0.8.0 track. Lead Chitundu Milimbo; reviewer Charles Hangoma.
Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 7 (amendment skeleton); DS5 §18
(published-result amendment creates a new official version linked to
the previous result, never overwrites history; impact recalculation
before approval); Lecturer/Tutor III §§9.1–9.3 (correction triggers,
`RequestOfficialResultAmendment` / `ApproveOfficialResultAmendment`,
`OfficialResultAmendmentRequested` / `OfficialResultAmended` /
`AcademicImpactRecalculated`, original preserved as superseded);
Journey C amendment leg (release → amendment/appeal route); perms
§§15.6–15.7,15.19 (examinations operates amendment case; release only
with authority); recovery §§16.5,16.7,16.11–12 (conflict/stale,
release-job failure, notification-may-create); SCR-DEC-ASM-001;
TEST-E2E-ASM-001 + TEST-E2E-EXM-007 (released result never
overwritten; original, amendment and approvals visible in history);
TEST-REC-005/010. SUP-001–SUP-013 apply. Depends on TASK-PH7-006
(RELEASED packages + immutable OfficialCourseResult rows). Owning
module `assessment`.

## User outcome and boundaries

A released official result can be corrected through a controlled
case: an authorized requester (LEC/COORDINATOR within offering scope)
opens a `ResultAmendmentCase` on one RELEASED package + student with
reason + evidence + corrected total + exact declaration; the
examinations authority (PERIOD-matched, four-eyes: approver ≠
requester) approves or declines with version check. Approval writes a
NEW immutable `OfficialCourseResult` row (version max+1, supersede
link in trace, outcome re-derived from demo passMark 50) + an
`AcademicImpactTask` stub row (progression-recalculation queue per
DS5 §18/roadmap proof) + `OfficialResultAmended` outbox event in one
TX; the original row is never edited or deleted. Students see only
the current (latest-version) RELEASED row as `Official result —
released`; prior versions stay readable in staff history. Refused
fail-closed: unreleased package, unknown student, out-of-range
total, bad declaration, non-approver role, SoD violation, stale
version, or declined-without-reason. No GPA/progression engine (stub
task only), no appeal route, no real notification delivery (outbox +
audit covers the trail per recovery §16.12 "may create").

## Policy and explicit demonstration scope

ASSESSMENT-DEMO-v1 + weighted-total-v1 + MOODLE-SIM-v1 as prior
packets and GAP-022. Outcome PASS/FAIL is an interim display
derivation from the demo pass mark, not an institutional grade
scale. Amendment triggers (verified clerical error, review outcome,
reconciliation issue, board decision, corrected input) are recorded
as the case reason; "changed mind without process" is refused by the
reason + authority gates. No real policy, authorities, boards, or
providers claimed.

## State authorization failure and recovery

Requester LEC/COORDINATOR within offering scope; approver
EXAMINATIONS_OFFICER + amend-results PERIOD-matched, never the
requester; moderator/tutor/sysadmin/moodle-admin denied on amendment
writes; students 403 everywhere except their own released view;
neutral 404s; denials 403 + audit; version-checked case transitions
+ idempotent amendment keys; CSRF. Concurrent approvals converge to
one new version (TEST-REC-005 shape); expired grants fail safe;
amendment-job failure retains certified state + reconcile/retry
(TEST-REC-010 shape: release persists when the outbox row is
deleted; same for amendment rows).

## Proof and documentation

API (grade-amendment, ~12 tests): request happy-path OPEN + outbox
chain, request refusals (unreleased/unknown-student/out-of-range/
bad-declaration), approve happy-path (new version row, old row
preserved, outbox chain, impact task PENDING, student sees amended
total + staff history shows both), decline demands reason, SoD
(requester cannot approve), role denials, neutrals, concurrency
convergence, idempotence + key conflict, expired-grant 403.
Browser (result-amendment): release → student sees total → request →
approve → student sees amended total; pre-approval student still
sees original (390px, keyboard/focus, no overflow, empty
localStorage). Record in PHASE-7 review + NOTE-PH7-007.

## Out of scope and open gates

GPA/progression engine (stub impact task only); appeal route (DS5
§18 DRAFT_APPEAL→CLOSED flow belongs to a later phase); real
notification delivery. Gates: GAP-022, GAP-008, open decisions
(results authorities, Moodle instance, real grade scales).

## Completion

Pending; see VERIFICATION. Human review pending.
