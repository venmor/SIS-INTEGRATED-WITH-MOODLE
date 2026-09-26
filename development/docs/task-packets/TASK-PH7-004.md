# TASK-PH7-004: Lecturer correction and moderation handoff

## Authority and ownership

User authorization: Phase 7 slices 4–5 implementation request, 2026-09-25.
Release v0.8.0 track. Lead Chitundu Milimbo; reviewer Charles Hangoma.
Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 4; Lecturer/Tutor Book Part 2 §§6,8
(batch-review screen, moderator limits, correction as new version),
Part 3 §§3–4,6 (result states, lecturer/tutor actions, moderation
workflow); Design Sec 5 §§11–12 (calculation trace, course-result
early states); Journey C steps 4–5; recovery catalogue §§16.5,16.7;
permission §§15.6–15.7,15.19 (lecturer submits, never releases;
moderator explicitly assigned; tutor TG scope); SCR-DEC-ASM-001
boundary (no release UI). Exact records as prior packets.
SUP-001–SUP-013 apply. Depends on TASK-PH7-001..003 (approved plan +
active mapping + validated batches). Owning module `assessment`.

## User outcome and boundaries

Validated batches submit for moderation with a visible checklist
(class-list reconciled, no OPEN findings, formula confirmed,
declaration accepted); submission locks the batch version and opens a
moderation case. The assigned moderator approves, returns for
correction (reason required), requests clarification, or refers to
examinations. Returned batches are corrected by new-revision staging
only — prior versions and audit stay; resubmission opens a new case
version. Approval locks the batch and writes immutable official CA
records (one per student+component, versioned, supersede on
re-moderation). No board, release, student view, or amendment
effects. Clarification is answered by correction resubmission.
Referred cases surface in the examinations lane.

## Policy and explicit demonstration scope

`ASSESSMENT-DEMO-v1` + `weighted-total-v1` + `MOODLE-SIM-v1` as prior
packets and GAP-022 slices 4–5 interim values (MODERATOR demo role,
candidate list, formula). No real policy, authorities, or boards
claimed. Tutor TG-scoped submission, manual non-Moodle entry, staff
notifications, and examiner sampling are deferred with rationale in
GAP-022.

## State authorization failure and recovery

Submitter LEC/COORDINATOR within scope; moderator MODERATOR +
moderate-results within offering assignment, never the stager
(SoD); tutor/sysadmin/moodle-admin/student denied on all moderation
writes; examinations reads referred lane only; neutral 404s; denials
403 + audit; version-checked case transitions + idempotency;
no new revisions for components with open cases (409 + route);
post-approval staging creates a new batch without touching official
CA until re-moderated; CSRF on POSTs. Concurrent decisions conflict,
never overwrite (TEST-REC-005 shape); expired grants fail safe.

## Proof and documentation

API tests: submit happy-path + checklist refusals (open findings,
unreconciled list), approve/return/clarify/refer with reason
demands, correction loop (new revision, history preserved,
re-moderation supersedes CA), SoD refusals (self-moderation,
lecturer-as-moderator, tutor, sysadmin, moodle-admin, student),
post-approval staging guard, denials, neutrals, concurrency,
idempotence. Browser: submit → approve journey + returned-correction
notice (390px, keyboard/focus, no overflow, empty localStorage).
Record in PHASE-7 review + NOTE-PH7-004.

## Out of scope and open gates

Board/decision package (slice 5); release/student view/amendment
(slices 6–7); GPA/progression; class-list maintenance UI. Gates:
GAP-022 (moderator/board/candidate-list/formula interim values),
open decisions (results authorities, Moodle instance).

## Completion

Code verified 2026-09-25 (API e2e 14/14, slice-1/2/3 regressions
20/20 + 18/18 + 13/13, browser 1/1, unit 73/73, typecheck/lint/build
green — see VERIFICATION Phase 7 slice 4 + NOTE-PH7-004). Human
review pending.
