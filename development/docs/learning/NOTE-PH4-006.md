# Learning Note — TASK-PH4-006 (course changes and waitlist)

- Lead developer: Chitindu Milimbo (proposed; TASK-PH4-006)
- Reviewer: Charles Hangoma (proposed)
- Date/release: 2026-09-23 / v0.4.0 track Phase 4 slice 6
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

After formal registration, the student self-services course additions/drops
with an explicit reason (evidence travels as a reference note); nothing takes
effect until a records officer approves, and closed add/drop windows route the
request to late policy instead of refusing it. Snapshots stay immutable —
every change is a versioned amendment row with authority and impact recorded,
roster rows flip ENROLLED/DROPPED and are never deleted. A per-course waitlist
with ordered positions, policy expiry, and full revalidation on accept covers
full courses. Required courses cannot be dropped here; the refusal points at
academic advice via support ticket.

## Frontend

- `/student/changes` page (change history + waitlist lists, server-rendered)
  + `ChangeForms` client component (add/drop/waitlist forms, idempotency keys,
  `router.refresh()` after success so the new request appears).
- Student home links the changes page.

## Backend/domain

- `registration.service.ts`: `requestChange` (owner-only, kind/reason
  validation, no-registration guard, curriculum-membership check,
  NOT_ENROLLED/NON_DROPPABLE/DUPLICATE_TASK guards, LATE status past
  `addDropClose`), `listAmendments`, `decideAmendment` (records-only,
  capacity re-check with row lock on approve, roster upsert/DROPPED flip,
  registration version bump, MoodleCourseAdded/Removed outbox events,
  charge-note audit that Finance recalculates elsewhere), `joinWaitlist`
  (owner-only, ordered position per course+period), `listWaitlist`,
  `acceptWaitlist` (records-only, expiry enforced and persisted, capacity +
  full revalidation, enrol + version bump + event).
- `resolveAttempt(..., ownerOnly)`: save/submit/change/waitlist-join are
  student self-service (staff 403); reads stay open to records officers.
- Status view now includes the amendment history; timetable derives from
  ENROLLED roster rows only (a DROPPED course no longer appears).

## Database/migration

- `20260924140000_ph4_amendments`: `RegistrationAmendment` (versioned,
  reason/evidence/authority) + `WaitlistEntry` (ordered position, expiry);
  opposite `amendments`/`waitlistEntries` fields added on `Course` (Prisma
  requires them; missing opposites were the typecheck failure).

## Security + authz

- Student writes are owner-only; amendment/waitlist decisions are
  records-officer-only via `recordsGate`; applicants and other roles 403;
  CSRF; neutral 404s; idempotency on every write; support references on
  failures.

## Tests and what they prove

- `registration-changes.e2e-spec.ts` (15 tests): add request + duplicate-task
  guard, required-drop refusal with advice wording, unknown-course refusal,
  approve-add (roster grows, version 1→2, MoodleCourseAdded queued),
  approve-drop (roster flips, timetable excludes the course, nothing deleted),
  decline preserves version, late-window routing, versioned history,
  waitlist join ordering (two fresh students land exactly one apart —
  robust to shared-DB pollution), accept enrols with event, full-course
  refusal, expiry persists + refuses, decline cancels, denials, neutrals.
  Green on a fresh DB.
- Regression: `course-plan` + `registration-submit` (28 tests) and
  `student-conversion` + `student-portal` + `registration-readiness`
  (27 tests) green after the `ownerOnly` tightening.
- Browser `student-portal.spec.ts` extended: plan third course → submit →
  `/student/changes` request BUS111 addition → join BUS112 waitlist → both
  visible in history. Full leg green.

## What failed or confused us

- Prisma client had no `waitlistEntry`/`registrationAmendment`: the slice-6
  schema edit never ran `prisma generate`, and the new relations missed
  opposite fields on `Course` (P1012). Added opposites, regenerated,
  typecheck clean.
- `KeyDto` used but not imported in `registration/dto.ts` (only `VersionDto`
  was); added the import.
- Timetable still listed a dropped course: the roster include had no status
  filter; now ENROLLED-only.
- Expiry-marking update was rolled back: `command()` runs in a transaction,
  so the EXPIRED write + refusal cancelled each other. The marking now uses
  the non-transactional client before failing.
- Waitlist position `toBe(1)` flaked on reruns (queue counts per course
  across the shared DB): rewritten as an ordering assertion between two
  fresh students.
- Changes history never appeared after submit (server-rendered page):
  fixed with `router.refresh()` in the change forms (same pattern as the
  ticket fix in Phase 2/3).
- Browser DB needed `migrate deploy` for the new tables first (P2021
  otherwise).

## Terms and concepts

- Snapshot immutable ≠ roster mutable; amendment version vs registration
  version (registration bumps on approval/accept); late ≠ refused; waitlist
  position is per course+period, not per student.

## Questions to revise

- Approve/decline/accept/cancel/expire matrix with codes; why staff can
  decide but never file; where charge effects land (Finance, not here).
