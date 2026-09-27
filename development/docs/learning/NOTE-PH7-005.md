# Learning Note — TASK-PH7-005 (board/decision package)

- Lead developer: Chitundu Milimbo
- Reviewer: Charles Hangoma
- Date/release: 2026-09-27 / v0.8.0 track Phase 7 slice 5
- Branch: local `main` worktree (modified + untracked; human review pending)

## What was built and why

Result packages assemble frozen inputs per offering+period behind the
exact recorded declaration: approved official CA refs (latest version
per component+student), `weighted-total-v1` computed preview + DS5
§11 trace (raw/normalised/weighted per component, half-up 2dp totals),
moderation refs, candidate-list reconciliation, and a SHA-256
integrity hash over the frozen inputs. Assembly is blocked unless
every demo component carries a moderated-approved case under an
APPROVED plan (superseded provenance refuses as
UNMODERATED_COMPONENT — no Moodle-direct inputs), no OPEN
missing-mark findings remain, and an ACTIVE candidate list
reconciles exactly (missing/extra counts reported, nothing
zero-filled).

The examinations authority (PERIOD-matched, GAP-022 board path — no
demo board invented) records one of six versioned decisions:
APPROVE_FOR_RELEASE / RETURN / CLARIFY / CONDITION / DEFER / REFER.
Four-eyes is server-enforced (decider ≠ preparer, SOD_VIOLATION even
across workspaces by account). Non-approvals demand reasons;
CONDITION demands stored conditions (slice-6 enforcement input).
Decisions are row-locked (`SELECT … FOR UPDATE`) with version checks
so racing decisions conflict instead of overwriting; all writes are
idempotent command replays. Decided packages keep their outcome;
deferrals re-submit as new package versions. No release effects, no
student view, no amendment (slices 6–7).

## Frontend

- `/admin/assessment/packages` queue (state/version/hash table) +
  `AssemblePackageForm` with the exact declaration checkbox.
- `/admin/assessment/packages/[id]` detail: frozen declaration, hash,
  formula version, preview counts, weighted preview list, decision
  history + `BoardDecisionForm` (six outcomes, reason, optional
  condition; explained disabled state once decided). No release
  actions exist anywhere.
- Admin nav gains "Board packages" for lecturer, coordinator,
  moderator, examinations roles; students see only published
  outcomes (no link, no route).

## Backend/domain

- `assessment` service: `assemblePackage` (gates in handbook order,
  latest-CA map, weighted preview, hash, versioned create, audit),
  `listPackages`/`packageDetail` (reader gate, neutral 404s),
  `decidePackage` (SoD, outcome allow-list, reason/condition
  demands, row lock + version check, `BoardDecision` row, audit).
  `BOARD_DECISIONS`/`PACKAGE_DECLARATION` live in `dto.ts` and are
  imported by the service (single source, no drift).
- Controller: `POST /packages`, `GET /packages`, `GET
  /packages/:id`, `POST /packages/:id/decide` (CsrfGuard on writes);
  proxy allowlist extended; contracts gain `ResultPackageView`,
  `BoardDecisionView`, `ResultPackageDetailView` (views only).

## Database/migration

- `20260927140000_ph7_board_package`: `ResultPackage` (unique per
  offering+period+version) + `BoardDecision` (unique per
  package+version, FK RESTRICT). Prisma client regenerated.

## Security + authz

- Preparers LEC/COORDINATOR in scope (reuses `submitter`);
  decider EXAMINATIONS_OFFICER PERIOD-matched (reuses `examiner`);
  moderator/tutor/sysadmin/moodle-admin/student denied on package
  writes and decisions; expired grants fail safe (deny on next
  decision, tested); denials 403 + audit; neutral 404s; concurrent
  decisions conflict (TEST-REC-005 shape).

## Tests and what they prove

- `grade-board.e2e-spec.ts` (15 tests): unmoderated/bad-declaration/
  missing-list/open-MISSING/superseded-provenance refusals (each
  proving nothing stored), happy-path (64-hex hash,
  `weighted-total-v1`, 68.8 preview, reconciliation), idempotent
  replay + key-conflict, SoD (preparer 403, examinations 201),
  reason/condition demands with stored conditions, five-role
  denials + student-read refusal, neutrals, racing-decision
  VERSION_CONFLICT with single version bump, expired-grant 403 with
  zero decision rows + restored grant, DEFER/REFER/CLARIFY with
  REQUEST_CLOSED + new-version resubmission, genuine-zero preview.
  15/15 on fresh `sis_ph7_s5_test`.
- Slice regressions held on fresh DBs: plan 20/20 (seeded),
  staging 18/18, validation 13/13, moderation 14/14. Unit 73/73;
  typecheck exit 0; lint exit 0 warnings-only (two new warnings
  fixed: unused import, array-sort compare); API dist via direct
  `tsc` + web production build exit 0 (new `/packages` routes).
- Browser `board-packages` (moderate 3 cases → assemble → approve
  for release) 1/1 on fresh migrated + seeded
  `sis_ph7_browser_test` with rebuilt apps (390px, keyboard/focus,
  no overflow, empty localStorage).

## What failed or confused us

- Shared-DB count assertions (`toBe(0)`) broke once earlier tests
  assembled packages: switched to before/after comparison. Lesson:
  count assertions must be order-proof.
- Version arithmetic: decisions bump the package version, so the
  next assembly is `deferredVersion + 1`, not `first.version + 1`.
  Assert against the recorded decision version.
- 429 Too Many Requests on the 15th test: the general budget is
  180 req/min PER ACCOUNT and one lecturer drove ~200 requests.
  Fixed by alternating preparers (`lecA`/`lecB`) — never by
  raising the policy budget.
- Browser `.env` points API_INTERNAL_URL at dead port 3001:
  override to 3101/3100 in the shell for browser runs.
- Prior failed browser runs polluted the shared browser DB (stale
  approved CA rows vs the new candidate list → honest
  UNRECONCILED refusal through the UI): recreate + migrate + seed
  the browser DB before final runs.
- DataTable hidden-`h2` collision (`.first()`) and form
  `aria-label` vs select label collision (`exact: true`):
  test-only fixes, same lesson class as slices 1–4.
- `demo:reset` destroys the pgdata volume (all local DBs) and its
  `npx` step fails on Windows (spawn without shell): recovered
  `sis` via direct `prisma migrate deploy` + `--experimental-strip-types`
  seed on Node 22. Never run reset scripts without explicit
  authorization; tmp helper scripts stay untracked and must be
  deleted before commit.

## Questions to revise

- Condition enforcement design (slice 6 reads stored conditions);
  release authority values (open decisions); candidate-list
  maintenance UI ownership; examiner sampling design.
