# Learning Note — TASK-PH7-004 (lecturer correction and moderation handoff)

- Lead developer: Chitundu Milimbo
- Reviewer: Charles Hangoma
- Date/release: 2026-09-25 / v0.8.0 track Phase 7 slice 4
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Validated batches submit for moderation with the exact recorded
declaration and a server-enforced checklist (validated, no OPEN
findings, candidate-list reconciliation). Submission opens a
moderation case; an assigned moderator claims it (begin review) and
decides APPROVED / RETURNED / CLARIFICATION_REQUESTED / REFERRED —
non-approvals demand reasons, all transitions are version-checked
and idempotent. The moderator is never the stager, in any workspace
(same-account dual hats refused). Approval locks the batch and
writes immutable official CA records (one per student+component,
versioned; re-moderation supersedes, history preserved). Returned
batches are corrected by new-revision staging only; open cases lock
their component against new revisions (replays of stored batches
still converge). Clarification is answered by correction
resubmission; referred cases surface in the examinations lane.

Deliberately not built: board package/decisions (slice 5), release/
student view/amendment (slices 6–7), tutor TG-scoped submission and
manual non-Moodle entry (deferred with rationale in GAP-022), staff
notifications (none exist; audit covers the trail), examiner
sampling (full demo batches reviewed), candidate-list maintenance UI
(seed-managed demo; Registry owns it in production).

## Frontend

- Batch page: submit-for-moderation form with the exact declaration
  checkbox.
- `/admin/assessment/moderation` queue (lane-scoped) +
  `/admin/assessment/moderation/[id]` case page with frozen
  declaration and the begin/decide form. No release actions exist.
- Admin nav gains "Moderation queue" for lecturer, coordinator,
  moderator, examinations roles.

## Backend/domain

- `assessment` service: candidate lists (provision versioned,
  supersede), submit checklist, begin/decide with SoD, component
  lock inside staging (after the replay check, so lost-response
  replays still converge), official-CA writer (skips null marks,
  never zero-fills). `reader()` admits moderators for case/batch
  reads.

## Database/migration

- `20260927130000_ph7_moderation`: `AssessmentCandidateList`
  (single ACTIVE per offering+period), `ModerationCase` (one per
  batch), `OfficialCARecord` (unique per scope+student+version),
  batch `lockedAt`.

## Security + authz

- Submitters LEC/COORDINATOR in scope; moderator MODERATOR +
  moderate-results in offering scope; examinations reads referred
  lane only; tutor/sysadmin/moodle-admin/student denied on all
  moderation writes; expired grants fail safe; denials 403 + audit;
  neutral 404s (out-of-scope reads); concurrent decisions conflict.
- Seed adds `mushota.m` (MODERATOR, SWE-2026S1); sign-in workspace
  verbs extended for the role.

## Tests and what they prove

- `grade-moderation.e2e-spec.ts` (14 tests): submit checklist
  (unvalidated/open-findings/unreconciled/bad-declaration),
  idempotent submit, submitter denials, approval writing exact CA
  rows + lock, same-account SoD refusal, return loop with history
  and CA supersession, clarify/refer lanes, write denials + closed
  decisions, racing-decision convergence, component lock + release
  on return, post-approval staging guard + re-moderation versions,
  neutrals, swimlane reads. 14/14 on fresh `sis_ph7_s4_final_test`.
- Slice regressions held on fresh DBs: plan 20/20, staging 18/18,
  validation 13/13. Unit 73/73; typecheck exit 0; lints
  warnings-only (pre-existing); API dist via direct `tsc` + web
  production build exit 0.
- Browser `moderation` (submit → approve + returned correction)
  1/1 on migrated `sis_ph7_browser_test` with rebuilt apps (390px,
  keyboard/focus, no overflow, empty localStorage).

## What failed or confused us

- Racing decisions both returned 201: check-then-act without a row
  lock (lost update). Fixed with `SELECT … FOR UPDATE` on the case
  row before the version check — and the same latent flaw in
  slice-3 finding transitions, fixed and locked with a new
  concurrent-triage test (13/13). Real bug, caught by the test.
- Set-Content full-file rewrite risk when patching the service: the
  one bulk replace was diff-checked (367+/5- only). Prefer `edit`
  for service changes.
- Mobile card/table heading collisions keep recurring in browser
  specs (`Cases` vs hidden `Moderation cases`): test-only `exact`
  fix, same lesson class as slices 1–3.
- Chained migrate+test in one shell call intermittently leaves
  tables missing; standalone migrate works. Separate the calls.
- Failed e2e beforeAll runs leave credential-less fixture accounts
  in scratch DBs — prefer fresh DBs for final runs.

## Questions to revise

- Findings/queue table consolidation; where VALIDATED→MAPPED lives
  (slice 5 assembly reads APPROVED cases + official CA);
  candidate-list maintenance UI ownership; examiner sampling design.
