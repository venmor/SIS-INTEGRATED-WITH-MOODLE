# Learning Note — TASK-PH7-003 (validation and missing-mark queue)

- Lead developer: Chitundu Milimbo (user correction 2026-09-25)
- Reviewer: Charles Hangoma
- Date/release: 2026-09-25 / v0.8.0 track Phase 7 slice 3
- Branch: local `main` worktree (uncommitted; human review pending)

## What was built and why

Validation runs per staged batch and writes immutable findings
(`GradeFinding`): line-level codes from quarantine flags/outcomes
(DUPLICATE, OUT_OF_RANGE, STRUCTURALLY_INVALID, MOODLE_ONLY,
MISSING_MARK) plus batch-level UNMAPPED (plan no longer approved),
STALE_MAPPING (mapping no longer active), SCALE_MISMATCH (component
scale drifted). Re-validation converges on open codes instead of
duplicating; per-batch locking serializes concurrent validations.

Missing marks follow DS5 §17: the batch result becomes MISSING_MARKS
while missing-mark findings stay open, each carrying an owned,
deadline-bound work item (academic → offering reference, 7-day demo
deadline per GAP-022; enrolment → REGISTRY; technical →
MOODLE_ADMIN). Nothing is stored as zero: the MISSING_MARK line keeps
null values and the finding carries the work. Partial imports hold:
validation never edits lines — corrections stage new revisions.

Swimlanes scope queue visibility: TECHNICAL (Moodle Admin),
ACADEMIC (lecturer/coordinator), ENROLMENT (Registry truth via the
operating examinations office — no Registry demo role exists, so the
lane surfaces there labelled REGISTRY). Examinations operates reads
and triage (OPEN→ACKNOWLEDGED→RESOLVED/DISMISSED, version-checked,
reasons demanded) but corrects nothing. Students 403 everywhere;
out-of-lane reads 404 neutral.

Deliberately not built: batch transitions past VALIDATED (slice 4+
own moderation/board/release); worker-gated pause/resume and retry
budgets (validation is synchronous — replay is idempotency-key
replay); notifications (none sent, so notification-failure recovery
is not applicable); class-list cross-check for "registered but
missing from Moodle" (no class-list entity — MISSING detection reads
staged outcome codes; Registry cross-check is a later-slice input).

## Frontend

- `/admin/assessment/findings` queue (lane-scoped table) +
  `/admin/assessment/findings/[id]` detail with examinations triage
  form (reasons required to resolve/dismiss; version-checked).
- Batch detail page: read-only findings section for the result
  package (SCR-DEC-ASM-001) + examinations "Run validation" button.
  No release actions exist anywhere.
- Admin nav gains "Validation queue" for the four staff roles.

## Backend/domain

- `assessment` service: `validateBatch`, `listFindings`,
  `findingDetail`, `transitionFinding`; lane map + `EXAMINATIONS_OFFICER`
  (PERIOD scope, period-matched) gates; idempotent validate/transition
  keys; version-checked transitions; CSRF on POSTs.

## Database/migration

- `20260927120000_ph7_validation_queue`: `GradeFinding` + batch
  `resultState`/`validatedAt`/`validatedByAccountId`. Prisma 7 needed
  the `findings` back-refs on `GradeBatch`/`GradeLine`.

## Security + authz

- Validate/transition restricted to period-matched examinations
  officers; lecturers correct by new revision only; moodle-admin
  reads technical lane only; expired grants fail safe (deny on next
  validation); denials 403 + audit; neutral 404s; concurrent triage
  conflicts (409) instead of overwriting.

## Tests and what they prove

- `grade-validation.e2e-spec.ts` (12 tests): per-code findings,
  partial-preserves-valid, work item + no-zero, idempotent replay +
  re-validate convergence, stale/unmapped/scale findings,
  swimlane visibility (incl. student 403s, neutral 404s), triage
  state machine (reason demands, version conflicts, lecturer 403),
  role denials, expired-grant 403 with restore, neutrals,
  correction-by-new-revision with history preserved. 12/12 on fresh
  `sis_ph7_s3_final_test` (2026-09-25).
- Slice regressions held on fresh DBs: `assessment-plan` 20/20,
  `grade-staging` 18/18. Unit 73/73; typecheck exit 0; lints
  warnings-only (pre-existing); API dist via direct `tsc` + web
  production build exit 0.
- Browser `validation-queue` (finding → resolve → resubmit →
  clean batch) 1/1 on migrated `sis_ph7_browser_test` with rebuilt
  apps (390px, keyboard/focus, no overflow, empty localStorage).

## What failed or confused us

- Two suites in one parallel vitest invocation collide on the shared
  DB (plan approvals supersede across files; documented
  order-fragility). Fix used: one fresh DB per suite, sequential
  runs — the standing Phase 6 lesson, now re-proven.
- Chained `migrate deploy | Select` + test in one shell call left
  tables missing; standalone migrate works. Run them as separate
  calls on this box.
- Failed e2e beforeAll runs leave credential-less fixture accounts
  in scratch DBs (18 seeded credentials vs 32 accounts on one
  scratch DB) — harmless for scoped assertions, but prefer fresh
  DBs for final runs.
- Mobile DataTable renders cards, not tables: the queue spec scopes
  `li`, not `tr` (same lesson class as the slice-1 `.first()` fix).
- `next build` typecheck caught a missing `title` on ErrorSummary in
  the new triage form — fixed before browser run.

## Questions to revise

- Findings table; who resolves ENROLMENT findings once a Registry
  role exists; where VALIDATED→MAPPED lives (slice 4); whether the
  stored outbox type should become the full EVT name.
