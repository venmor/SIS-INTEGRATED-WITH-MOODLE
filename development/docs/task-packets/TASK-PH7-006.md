# TASK-PH7-006: Official result release and student view

## Authority and ownership

User authorization: Phase 7 slice 6 implementation request, 2026-09-27.
Release v0.8.0 track. Lead Chitundu Milimbo; reviewer Charles Hangoma.
Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 6; DS5 §§11-12,19; Lecturer/Tutor
III §§7.3,8; Journey C step 7; perms §§15.6-15.7,15.19; recovery
§§16.5,16.7,16.11-12; SCR-DEC-ASM-001; TEST-E2E-ASM-001;
TEST-REC-005/010. SUP-001–SUP-013 apply. Depends on TASK-PH7-005
(APPROVED_FOR_RELEASE packages + stored conditions). Owning module
`assessment`.

## User outcome and boundaries

Release is a distinct authorised action on a slice-5
APPROVED_FOR_RELEASE package: EXAMINATIONS_OFFICER PERIOD-matched
executes idempotent `ReleaseOfficialCourseResults`. Refused unless
the package is approved-for-release, no blocking CONDITION decision
exists, the frozen trace still matches current approved CA
(STALE_PACKAGE forces a fresh assembly version), and every trace
student resolves to a Student record (UNRESOLVED_STUDENTS forces
Registry correction — never silent partial release). Writes
immutable OfficialCourseResult rows (total + PASS/FAIL from
policy.passMark 50, interim demo vocabulary under SUP-009) +
EVT-OfficialResultsReleased-v1 outbox in one TX; delivery failure
never rolls back the release (TEST-REC-010: release persists when
the outbox row is deleted). Students see only their own RELEASED
rows as `Official result — released`; anyone else (including other
students and staff on this endpoint) gets denials; unreleased →
neutral empty (`Not yet released`); never board notes, other
students, or provisional-as-official. No amendment (slice 7), no
GPA/progression, no real notification delivery.

## Policy and explicit demonstration scope

ASSESSMENT-DEMO-v1 + weighted-total-v1 + MOODLE-SIM-v1 as prior
packets and GAP-022. Outcome PASS/FAIL is an interim display
derivation from the demo pass mark, not an institutional grade
scale. No real policy, authorities, boards, or providers claimed.

## State authorization failure and recovery

Releaser EXAMINATIONS_OFFICER + release-results PERIOD-matched;
lecturer/coordinator/moderator/tutor/sysadmin/moodle-admin denied
on release writes; students 403 everywhere except their own
released view; neutral 404s; denials 403 + audit; version-checked
package flip + idempotent release keys; CSRF. Concurrent releases
converge to one release (TEST-REC-005); expired grants fail safe;
release-job failure retains certified state + reconcile/retry.

## Proof and documentation

API (grade-release, ~14 tests): happy-path rows + outbox chain,
pre-board/partial-stale/blocking-condition/unresolved refusals,
SoD + role denials, student isolation, neutrals, concurrency
convergence, idempotence + key conflict, outbox-deletion-keeps-
release, second-version independent release. Browser:
pre-release student sees nothing → approve → release → student
sees official; Moodle-alone-publishes-nothing. Record in PHASE-7
review + NOTE-PH7-006.

## Out of scope and open gates

Amendment/version supersede (slice 7); GPA/progression; appeal
route; real notification delivery. Gates: GAP-022, GAP-008, open
decisions (results authorities, Moodle instance).

## Completion

Pending; see VERIFICATION. Human review pending.
