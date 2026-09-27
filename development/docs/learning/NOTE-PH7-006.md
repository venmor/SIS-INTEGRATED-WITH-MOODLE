# Learning Note — TASK-PH7-006 (official result release and student view)

- Lead developer: Chitundu Milimbo
- Reviewer: Charles Hangoma
- Date/release: 2026-09-27 / v0.8.0 track Phase 7 slice 6
- Branch: local `main` worktree (modified + untracked; human review pending)

## What was built and why

Release is a distinct authorised action on a slice-5
APPROVED_FOR_RELEASE package: the examinations authority
(PERIOD-matched) executes idempotent `ReleaseOfficialCourseResults`.
Refused fail-closed unless the package is approved-for-release, no
blocking CONDITION decision exists (plain-JS check over stored
conditions), the frozen trace still matches current approved CA
(students AND per-part marks — re-moderation drift forces a fresh
assembly version), and every trace student resolves to a Student
record (UNRESOLVED_STUDENTS forces Registry correction, never a
silent partial). Writes immutable OfficialCourseResult rows (total
+ PASS/FAIL from demo passMark 50, interim vocabulary under
SUP-009) + `OfficialResultsReleased` outbox event (canonical chain
in payload) in one TX; the package flips to RELEASED with a version
bump. Delivery failure never rolls back the release (outbox row
deleted in-test, release still readable). Concurrent releases
converge on the stored rows via row lock; no second row set.

Students resolve through Account → Person → Student and see only
their own RELEASED rows as `Official result — released`; everyone
else gets denials on the endpoint, and unreleased students get a
neutral empty set (`Not yet released`). No board notes, no other
students, no provisional-as-official. No amendment (slice 7), no
GPA/progression, no real notification delivery (no notice tables
exist — only AuditEvent/OutboxEvent; outbox + audit covers the
trail per recovery §16.12 "may create").

## Frontend

- `/student/results` page (own released rows + neutral empty state
  + about-results card) with a local `/assessment` loader —
  `loadStudent()` hardcodes the `/records` prefix, so it cannot
  reach assessment endpoints. Student home gains an "Official
  results" task card.
- Package detail page: release section (examinations-only release
  form with exact confirm checkbox when APPROVED_FOR_RELEASE;
  release summary with hash/count/published date when RELEASED).
  No release buttons anywhere else; students never see staff pages.

## Backend/domain

- `assessment` service: `releaseResults` (404/role/scope outside,
  ALL release gates inside `command()` after the replay lookup and
  row lock — so retried keys replay even after the status flipped;
  deterministic releaseHash from sorted row ids, no Release table),
  `releaseDetail` (reader gate, 404 unless RELEASED with rows),
  `studentResults` (STUDENT-only, neutral empty for unresolvable
  or unreleased). `releaseView` shared by write + read paths.
- Controller: `POST /releases`, `GET /releases/:id`, `GET
  /results/mine` (CsrfGuard on the write); proxy allowlist gains
  `releases` write + `results/mine` read; contracts gain
  `OfficialResultView` (+ own `studentRef`, needed to prove
  isolation) and `ReleaseView`.

## Database/migration

- `20260927150000_ph7_official_release`: `OfficialCourseResult`
  (unique per offering+period+student+version; indexes on
  packageId and studentRef+status). Prisma client regenerated.

## Security + authz

- Releaser EXAMINATIONS_OFFICER PERIOD-matched; lecturer/
  coordinator/moderator/tutor/sysadmin/moodle-admin denied on
  release writes; students 403 everywhere except own released
  view; foreign-period officers 403; expired grants fail safe;
  denials 403 + audit; neutral 404s; version-checked flip +
  idempotent keys; CSRF.

## Tests and what they prove

- `grade-release.e2e-spec.ts` (15 tests): pre-board/blocking-
  condition/stale/unresolved refusals (each proving zero rows),
  happy-path (RELEASED, count 2, 64-hex hash, 68.8 PASS rows,
  outbox chain), six-role denials, expired-grant 403 + restore,
  foreign-period 403, neutrals, racing-release convergence (both
  201, exactly 2 rows), idempotent replay + cross-package key
  conflict, outbox-deletion-keeps-release (TEST-REC-010),
  student isolation (own `studentRef` on every row, staff 403,
  neutral empty pre-release), second-version independent release.
  15/15 on fresh `sis_ph7_s6_test`.
- Slice regressions held on fresh DBs: plan 20/20 (seeded),
  staging 18/18, validation 13/13, moderation 14/14, board 15/15.
  Unit 73/73; typecheck exit 0; lint exit 0 warnings-only; API
  dist via direct `tsc` + web production build exit 0 (new
  `/student/results` route).
- Browser `board-release` (moderate 3 → assemble → approve →
  release → student sees official; pre-release student sees
  nothing) 1/1 on fresh migrated + seeded `sis_ph7_browser_test`
  with rebuilt apps (390px, keyboard/focus, no overflow, empty
  localStorage).

## What failed or confused us

- Replay-after-success 409: release gates sat OUTSIDE `command()`,
  so a retried key hit the flipped-status gate before the replay
  lookup. Fixed by moving every release gate inside `fn()` after
  the row lock + convergence branch (submitBatch pattern); only
  404/role/scope stay outside. Same latent shape exists in
  slice-5 `decidePackage` (untested replay path) — left alone,
  follow-up, not widened here.
- STALE premise wrong: re-approving identical marks is not drift.
  Added a `markShift` helper param so the stale test changes marks.
- Global reconciliation vs multi-cohort suites: assembly compares
  the whole offering+period scope, so the suite shares one file-
  wide cohort (slice-5 pattern); `studentRef` joined the view so
  isolation is provable per row. Accumulated-cohort DBs across
  RUNS still refuse honestly — fresh DB per full run.
- Mismatched-key conflict needs an EXISTING second package
  (unknown UUID 404s first, by design): the test now releases one
  package and conflicts the key against a second approved one.
- Browser `.env` API URL, hidden-`h2`/label collisions, stale
  servers, fresh-browser-DB discipline: same lesson class as
  slice 5, applied without new surprises. Student pages have no
  `<main>` landmark — text-count assertions instead.
- Tmp helper scripts (`tmp-mkdb`, `tmp-withdb`) stay untracked for
  deletion before commit.

## Questions to revise

- Slice-7 amendment supersede design (immutable rows are ready for
  it); release authority values (open decisions); real grade
  scales to replace interim PASS/FAIL; appeal route ownership.
