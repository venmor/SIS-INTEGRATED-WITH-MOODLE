# Learning Note — TASK-PH7-001 (assessment scheme and grade-activity mapping plan)

- Lead developer: Chitundu Milimbo (proposed; TASK-PH7-001)
- Reviewer: Charles Hangoma (proposed)
- Date/release: 2026-09-25 / v0.8.0 track Phase 7 slice 1
- Branch: local `main` worktree (code in `024af1d` + uncommitted browser-spec fix; human review pending)

## What was built and why

Versioned assessment-scheme registry per offering+period
(`AssessmentPlan` DRAFT→APPROVED, approval supersedes never edits, one
APPROVED per offering+period via partial unique) with closed
`ASSESSMENT-DEMO-v1` components (CA-QUIZ1/CA-ASSIGN/FINAL-EXAM, weights
total 100). Grade-activity mappings bind one Moodle activity to one
approved component (DRAFT→TESTED→ACTIVE, synthetic test checks six
validity conditions without writing anything, four-eyes activation,
one ACTIVE per component). Lecturer capture is offering-scoped;
approval/activation is coordinator-only; Moodle admins wire but never
approve; SYSADMIN denied on all assessment writes.

## Frontend

- `/admin/assessment/plans` (+ `[id]`, `[id]/decide` with UI-DECISION-001
  frozen package + exact declaration) and
  `/admin/assessment/mappings` (+ `[id]`, `[id]/decide`) + shared
  `/api/assessment` proxy + admin nav links.

## Backend/domain

- `assessment` module: draftPlan/approvePlan/listPlans,
  draftMapping/testMapping/activateMapping/listMappings;
  `ASSESSMENT-DEMO-v1` config (`packages/config/src/assessment.ts`).

## Database/migration

- `20260927090000_ph7_assessment_plan`: `AssessmentPlan`,
  `AssessmentComponent`, `GradeActivityMapping` + partial uniques for
  single-APPROVED / single-ACTIVE.

## Security + authz

- LEC + stage-marks (OFFERING scope, enforced); COORDINATOR +
  approve-assessment (SCHOOL scope, new demo account `chisela.k`);
  MOODLE_ADMIN technical mapping only; SYSADMIN denied; neutral 404s;
  denials 403 + audit; version-checked writes + idempotency keys; CSRF.

## Tests and what they prove

- `assessment-plan.e2e-spec.ts` (20 tests): draft/versioning,
  supersede-never-edit, four-eyes self-approve refusal, version
  conflict, closed codes, draft/test/activate journey, mapping
  self-activation refusal, synthetic fail-writes-nothing,
  test-required refusal, both-identifier enforcement, post-review
  arbitrary-mapping block, unapproved/closed refusal, tutor/sysadmin/
  moodle-admin denials, offering-scope denial, neutrals, concurrent
  activation convergence, idempotent replay/conflict, officer reads.
  20/20 on fresh `sis_ph7_s1_test` (2026-09-25).
- Browser `assessment-plan.spec.ts` plan→map→activate journey
  (self-approval refusal, coordinator approval, synthetic PASS,
  activation; 390px, keyboard/focus, no overflow, empty localStorage).
  1/1 on `sis_ph7_browser_test` after one test-only fix (below).
- Unit 73/73; typecheck exit 0; API lint warnings-only (pre-existing);
  web lint clean; API dist via direct `tsc` + web production build
  exit 0.

## What failed or confused us

- First browser run failed sign-in: a stale API on 3101 pointed at the
  `sis` database while fixtures went to the browser DB. Fix: killed
  orphans, started fresh servers against the browser DB; direct API
  sign-in then returned 200. Lesson ( repeats Phase 6): verify DB
  target when auth fails mysteriously.
- Browser spec hit a strict-mode violation on the slice-2 leg: two
  headings named "Grade batches" (page `h1` + DataTable visually-hidden
  `h2`). Test-only fix: `.first()`, matching the existing pattern in
  the same spec. No production change.
- This box runs Node 22.13.1 (pinned 24.21.0): `nest build` crashes
  (`ERR_REQUIRE_CYCLE_MODULE`, known), so API dist used
  `tsc -p tsconfig.build.json`; `test:scripts` has 3 environment
  failures (ripgrep unavailable, `.ts` imports under plain node) —
  unrelated to slice 1, recorded in VERIFICATION, not "fixed" by
  weakening tests.

## Questions to revise

- Plan version table; why synthetic tests never write; where ACTIVE
  mappings are consumed (slice 2 staging, slice 3 validation).
