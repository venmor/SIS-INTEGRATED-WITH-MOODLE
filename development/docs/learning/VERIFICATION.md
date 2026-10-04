# Verification evidence — 2026-09-19

## V2 draft academic-delivery identities — 2026-10-04

[TASK-V2-TIME-003](../task-packets/TASK-V2-TIME-003.md) introduces additive relational identities for institution units/versions, course versions, academic-period delivery offerings/sections and buildings/venues. All **67 migrations** applied to a new dedicated synthetic PostgreSQL database; Prisma validation/client generation, the API production build, source scan and new-identity schema comparison passed. The full API unit suite passed **317 with 13 skipped**. Foreign-key/check probes denied orphan sections/venues/unit versions, a self-linking unit relation and negative capacity. Existing unrelated schema drift remains. No shared database or official record was changed. [Detail](NOTE-V2-TIME-003.md).

## V2 timetable conflict foundation — 2026-10-04

[TASK-V2-TIME-002](../task-packets/TASK-V2-TIME-002.md) adds pure, policy-versioned validation of dated teaching occurrences. The first conflict cases were observed red against an empty validator; timezone/teacher and invalid-calendar-date denial were also observed red before implementation. Focused unit checks passed **8/8**; the full API unit run passed **317 with 13 skipped**. The API production build, lint, source scan, formatting and diff-integrity checks passed. The validator is not yet connected to official offerings, venue records, staff approval or student publication. [Detail](NOTE-V2-TIME-002.md). No provider call or download occurred.

## V2 applicant result and upload blockers — 2026-10-04

[TASK-V2-APP-002](../task-packets/TASK-V2-APP-002.md) resolves the Radiography “Science subject”/selectable “Science” mismatch, shows current result blockers in the qualification form and makes the local exact-fixture file action explicit in the review blocker. The subject and document assertions were observed red, then the applicant API suite passed **19/19** on isolated synthetic PostgreSQL. The connected mobile applicant journey passed **1/1** after its inline-results assertion was observed red. Fresh web/API production builds, lint, source scan and formatting passed; lint retains unrelated warnings. [Detail](NOTE-V2-APP-002.md). No provider call or download occurred.

## V2 student finance periods — 2026-10-04

[TASK-V2-FIN-004](../task-packets/TASK-V2-FIN-004.md) lists only a student's invoiced periods and uses the selected period for account, statement, payment and arrangement actions instead of fixed `2026S1`. The new API test failed at the absent route, then the finance statement suite passed **10/10** and the wider finance governance suite **24/24** on the isolated review database; the latter required the repository environment loader for its simulated callback secret. The connected student portal browser story passed **1/1** at 390px. Fresh API/web builds, lint and formatting passed; API lint retains unrelated warnings. [Detail](NOTE-V2-FIN-004.md). No provider call or download occurred.

Verified in the isolated `review/phase-2-slices-2-5` worktree. Node **24.21.0**; PostgreSQL **18**; committed npm lockfile. Final database runs used a separate Docker container, `sis-phase2-review-tests`, bound only to `127.0.0.1:55432`. Existing `sis-postgres-18` on 5432 and other applications were not modified. Earlier isolated temporary PostgreSQL verification was repeated after the session's temporary services were cleared.

## Executed checks

| Check                                                               | Current result                                                                                                                                 | What it establishes                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                                          | **64 tests passed, 13 files**                                                                                                                  | Existing unit/contracts plus scanner boundaries, including clean-antivirus/structural-PDF distinction                                                                                                                                                                                           |
| Prior API suite, excluding the two new suites                       | **67 tests passed, 13 files**                                                                                                                  | Authentication, recovery, grants, active workspace, policy, expiry, reviews, reinstatement, break-glass, audit, configuration and public catalogue                                                                                                                                              |
| `applications.e2e-spec.ts` + `config-versions.e2e-spec.ts`          | **19 tests passed, 2 files**                                                                                                                   | Real database/HTTP applicant ownership, versions, partial saves, live policy/deadline/contact checks, upload/replacement, programme change/discard/count limit, rollback/concurrent submit, SQL immutability and persisted configuration snapshot                                               |
| `npm run test:scripts`                                              | **6 passed**                                                                                                                                   | Same-origin boundary, scan failure exit, year/CAT date rendering, password-safe backup failures                                                                                                                                                                                                 |
| `npm run test:browser`                                              | **2 passed**                                                                                                                                   | Connected 390px mobile/keyboard journey, unsaved-navigation warning, actual save-and-continue navigation, locked qualification controls during delayed save, safe fixture preview, lost-submit-response recovery, refreshed receipt, no horizontal overflow/localStorage, foreign-origin denial |
| `npm run build`                                                     | **Passed**                                                                                                                                     | Production Next.js and NestJS builds, shared configuration build                                                                                                                                                                                                                                |
| `npm run typecheck`                                                 | **Passed**                                                                                                                                     | Full API source/test and web TypeScript checks                                                                                                                                                                                                                                                  |
| `npm run lint`                                                      | **Passed with 12 warnings; no errors**                                                                                                         | Web lint clean; API warnings described below                                                                                                                                                                                                                                                    |
| `npm run scan`                                                      | **Passed**                                                                                                                                     | No prohibited source/dependency patterns or scanned secret patterns detected; not an exhaustive security audit                                                                                                                                                                                  |
| `prisma validate`; fresh `migrate deploy` + demo seed               | **Passed on three isolated databases; 13 migrations each**                                                                                     | Schema validity and fresh install after duplicate catalogue-key repair                                                                                                                                                                                                                          |
| `npm run backup:test`                                               | **25 table counts matched; all seven orphan checks zero**                                                                                      | Actual dump/restore into a newly created scratch database, including admissions records                                                                                                                                                                                                         |
| Existing scratch-name collision                                     | **Rejected; existing submission count unchanged**                                                                                              | Backup test does not erase an existing database                                                                                                                                                                                                                                                 |
| Whitespace, local Markdown paths, source preservation and checksums | **291 Markdown documents checked; zero missing local path targets; 227 checksums matched; 70 exact record bodies preserved; whitespace clean** | Path targets checked (not every heading fragment or external URL); source/navigation consistency, not institutional approval                                                                                                                                                                    |

The API integration tests replace only the external antivirus boundary. Browser tests use the real exact-fixture scanner adapter. SQL failure injection forces an outbox insert to fail and proves submission rollback. The browser network interception processes the submit upstream and drops its response, so recovery is tested against a genuinely committed result.

## Independent code review and regression fixes

A fresh read-only Superpowers reviewer checked the code against the plan and relevant source requirements. Four material issues were accepted and corrected:

1. Qualification subject controls stayed editable during a pending save: the complete fieldset now locks and a throttled browser save asserts it.
2. An existing draft could miss a changed fee policy: the fee identity participates in the fingerprint and the current availability guard blocks submission.
3. Byte-pattern PDF screening could miss escaped names: arbitrary PDFs remain quarantined even after clean antivirus until structural validation exists; exact fixture mode is separately gated.
4. Backup child-process failures could include credential-bearing command arguments: credentials now use PostgreSQL environment variables and failure messages are sanitized; a fictional-password canary regression proves no output disclosure.

Additional regressions repaired unsaved navigation, actual Save and continue movement, date year/timezone, legitimate local Origin/Host handling, and persistent configuration versions. No second human approval is implied by this AI review. Institutional scope hierarchy, provider/MFA and later-domain features were explicitly deferred to named gaps, not silently dropped.

## Warnings and checks not claimed

The 12 API lint warnings include existing audit/configuration formatting/conversion warnings, intentional control-character rejection, DTO-to-data object spreading, and a test sort comparator. These are reported, not described as a warning-free run. Runtime tools also warn about Vite's legacy tsconfig-path plugin, Node's module-type inference for standalone TS script imports, and PostgreSQL client's future handling of concurrent queries. They did not fail these runs; review before a pg major upgrade. No dependency upgrade was performed to hide warnings.

Manual screen-reader/zoom/low-bandwidth review, Windows/WSL reproduction, human explanation, remote GitHub Actions execution, branch protection, deployment/rollback rehearsal on an existing database, arbitrary production file scanning, load/penetration testing and actual provider integrations remain **not verified**. The [human walkthrough](../demo/APPLICANT-WALKTHROUGH.md) is deliberately unchecked.

Two setup failures were diagnosed during verification: missing `DEMO_MODE=true` made the old demo-recovery endpoint correctly return 404; running tests alongside the configuration package's clean/build briefly removed its import target. Reruns used the documented environment and completed builds before dependent tests; all final suites above passed. Do not run `@sis/config` clean/build concurrently with importing tests.

## Reproduce and inspect

Use the exact commands/environment in [APPLICANT-WALKTHROUGH.md](../demo/APPLICANT-WALKTHROUGH.md). Detailed local logs are in the worktree's ignored `.superpowers/sdd/feature-applicant-self-service-1/evidence/`; browser reports/traces are in `development/playwright-report/` and `development/test-results/`. A stable copy of the final fictional mobile receipt is [saved with the demo](../demo/evidence/applicant-receipt-mobile.png). The checked summary, not local scratch paths, is the durable project record.

On 2026-09-20 the user authorized commits and integration into local `main`, with no pull request and the push left to the user. The verification above records the implementation review on 2026-09-19. No human walkthrough signature, production policy approval or complete-phase acceptance is implied by Git integration.

The 2026-09-20 pre-commit recheck passed: 64 unit tests, six script tests, full TypeScript checks, source scan, whitespace checks and all 227 handbook checksums. Only handoff documentation changed during this integration step; the database/browser/build evidence above remains the 2026-09-19 run. Fresh pre-commit logs use the `commit-` prefix in the same ignored evidence directory.

## Phase 3 slices 1–2 verification — 2026-09-21 (committed in `e44170a`)

Node **22.13.1** on that box vs pinned **24.21.0**; PostgreSQL **18** via
`sis-postgres-18`. Fresh isolated databases per run
(`sis_ph3_review4` for API e2e, `sis_ph3_browser2` for browser); committed
npm lockfile. Full API e2e in walkthrough order on the fresh DB. The work has
since been committed to local `main`; pinned-stack rechecks done in this
checkout are recorded in the docs-pass section below (scan, scripts,
typecheck, lint, unit) — API e2e, browser, and backup reruns are still pending.

| Check                                               | Current result                       | What it establishes                                                                                  |
| --------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit` API + web                        | **Passed**                           | Full source/test type safety incl. review service, DTOs, staff pages                                 |
| `npm run lint`                                      | **Passed, warnings only, no errors** | No new lint debt                                                                                     |
| `npm test` (unit)                                   | **66 passed, 14 files**              | Contracts, guards, scanner, IAM (policy.spec covers new verbs)                                       |
| Prior API suite (13 files, excl. admissions/review) | **67 passed**                        | No regression in Phases 0–1 + catalogue                                                              |
| Admissions + case + review suites (5 files)         | **64 passed**                        | Draft→submit→receipt intact; 13 queue + 12 evidence tests green                                      |
| `npm run build --workspace=apps/web`                | **Passed**                           | Production build incl. `/admin/admissions/queue`, `/admin/admissions/case/[id]`, `/api/review` proxy |
| API dist (`tsc -p tsconfig.build.json`)             | **Passed**                           | Direct `tsc` used: `nest` CLI crashes on Node 22 (ora ESM cycle)                                     |
| `test:browser` staff queue                          | **1 passed**                         | Claim → finding → clarification on 390px, keyboard/focus, no overflow, no localStorage               |
| `test:browser` applicant regression                 | **2 passed**                         | Existing applicant journeys intact                                                                   |
| `prisma migrate deploy` fresh + demo seed           | **Passed, 18 migrations**            | Queue, findings and index migrations apply in order; 3 demo staff seeded                             |

## Docs pass + pinned-stack rechecks — 2026-09-21 (this checkout, `e44170a` + docs edits)

Pinned Node **24.21.0** via `fnm`; `rg` 15.2.0 and `psql` 18.6 present.
No code behavior changed in this pass except `apps/web/eslint.config.mjs`
(ignore `.vercel/**`, which is gitignored build output); generated Prisma
client + `@sis/config` dist were refreshed (see fixes).

| Check                           | Current result                           | What it establishes                                                                     |
| ------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `npm run scan`                  | **Passed, exit 0**                       | No prohibited source/dependency patterns; not an exhaustive audit                       |
| `npm run test:scripts`          | **6 passed**                             | Same-origin, scan-gate, CAT/year rendering, password-safe backup                        |
| `npm run typecheck`             | **Passed, exit 0**                       | Full API + web TS checks after `prisma generate` + `@sis/config` build                  |
| `npm run lint` (all workspaces) | **Passed, warnings only**                | Web clean; API warnings as previously reported                                          |
| `npm test` (unit)               | **68 passed, 15 files**                  | Up from 66/14 (includes `main.spec.ts` + case cover)                                    |
| API e2e `catalogue` alone       | **12 passed, 1 file**                    | Seed catalogue intact on fresh `sis_ph3_review_docs`                                    |
| API e2e remaining 17 files      | **119 passed, 17 files**                 | Draft→submit→case→review intact; queue + evidence + case suites green                   |
| `git diff --check`              | **Clean**                                | No whitespace errors in docs/code edits                                                 |
| Handbook untouched              | **`git status` shows no handbook paths** | 70 exact record bodies + checksums undisturbed by this docs pass                        |
| New-note links                  | **All resolve**                          | NOTE-PH2-006, NOTE-PH3-001/002 linked from DESIGN-INDEX, PHASE reviews, ROTATION-LEDGER |

Fixes found through this pass (stale generated artifacts, not source bugs):

1. Prisma client predated `e44170a` migrations → typecheck errors on `applicationStatusEvent`, `reviewAssignment`, etc. Fixed with `node scripts/with-env.mjs npx prisma generate`; typecheck then showed only `@sis/config` staleness.
2. `@sis/config` dist predated the slice-6 `case` policy → `policy.case` errors. Fixed with `npm run build --workspace=@sis/config`; typecheck then passed.
3. Web lint failed with 18 errors, all inside `apps/web/.vercel/output/**` (Vercel build output, gitignored but not eslint-ignored). Fixed by adding `.vercel/**` to `globalIgnores` in `apps/web/eslint.config.mjs`; web lint then passed, full lint warnings-only.

Still **not run** here: `backup:test`, manual screen-reader/WSL replay, remote CI, branch protection, human walkthrough. TASK-PH2-006/PH3-001/PH3-002 completion and human explanation/review remain **pending**. The [Phase 3 learning review](PHASE-3-IMPLEMENTATION-REVIEW.md) records scope, issues found, and presentation limits. No human signoff, production approval or phase acceptance is implied.

API e2e ordering lesson (2026-09-21 rerun): running all 18 e2e files in one
parallel vitest invocation fails `catalogue.e2e-spec.ts` (expects 4 offerings,
sees 8) because admissions suites create synthetic programmes in the shared
test DB while catalogue counts. Fresh DB + catalogue-first, then the remaining
17 files, gives 12 + 119 green. The `pg` concurrent-query DeprecationWarning
above is the pre-existing client warning, not a failure.

## Browser reruns — 2026-09-21 (this checkout, pinned Node 24.21.0)

Separate seeded browser DB `sis_browser_review_docs` (migrated + `ALLOW_DEMO_SEED`
seed); production builds (`npm run build --workspace=apps/api` incl. committed
prebuild, `npm run build --workspace=apps/web` — both exit 0); Playwright
starts API dist on 3101 + web on 3100 with `PORT=3101`,
`API_INTERNAL_URL=http://127.0.0.1:3101`, `DEMO_MODE=true`,
`APPLICATION_SCANNER=demo-fixtures`. No shared database was reset. Slices 3–6
runs below used the same harness after migrating the browser DB with each new
migration (P2022 otherwise) and rebuilding both apps for new routes/pages.

| Spec                               | Current result | What it establishes                                                                                                              |
| ---------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `admissions-queue.spec.ts`         | **1 passed**   | Officer claim → finding → clarification on 390px, keyboard/focus, no overflow, no localStorage                                   |
| `applicant.spec.ts`                | **2 passed**   | Mobile keyboard journey + lost-submit recovery; cross-origin denial                                                              |
| `applicant-case.spec.ts` (slice 6) | **1 passed**   | Timeline, decision, tickets+reply, corrections, withdraw gate→receipt→`Withdrawn`, inbox; 390px, no overflow, empty localStorage |

Fixes found through these runs (first two test-only, third app UX):

1. Playwright expected headless-shell build 1243 but only 1228/1234 were cached → `browserType.launch` failure. Fixed with `npx playwright install chromium` (environment, not code).
2. `applicant-case` bare `getByRole("alert")` matched both the app ErrorSummary and Next.js `#__next-route-announcer__` (strict-mode violation). Fixed by scoping to `page.locator("main").getByRole("alert")` (4 sites); ErrorSummary renders inside `<main id="applicant-content">`.
3. New ticket + ReplyForm never appeared after create without manual reload (`TicketsPage` is server-rendered). Fixed with `router.refresh()` in the shared `useTicketPost` submit (`ticket-forms.tsx`), matching the existing `workspace.tsx` pattern; also refreshes sent replies into view.
4. `getByLabel("Reply").first()` resolved to the `<form aria-label="Reply to support ticket">` instead of the textbox. Fixed with `{ exact: true }`.

## Slices 3–6 verification — 2026-09-21 (uncommitted worktree, pinned Node 24.21.0)

API e2e on fresh `sis_ph3_review_docs` (migrate + seed; catalogue-first then
rest): catalogue 12 + remaining 19 files **139 passed, 0 failed** — including
`review-evidence` +1 regression (`summary-answered-counts`), new
`review-recommendation` (8), new `review-decision` (11), new
`review-acceptance` (14), and migrated `applications-case` (20, off sims).
Typecheck exit 0, full lint warnings-only, unit 68/15, scan exit 0, scripts
6/6. Browser full set on migrated `sis_browser_review_docs` with rebuilt
apps: queue (claim/find/clarify/recommend/release) + case (timeline/decision/
tickets/corrections/offer-accept/onboarding/withdraw) + applicant (2) = **4/4
green**. `backup:test` still not run here (needs `psql` client + scratch
rights re-check); manual screen-reader/WSL replay, remote CI, branch
protection, and human walkthrough remain **not verified**.

Slice 3–6 fixes found (all verified green after):

1. Queue `summary()` counted every clarification/correction; now open-only like queue/approver views (regression test first: failed `expected 1 to be 0`, then 13/13).
2. Browser queue spec claimed pool-first on a shared DB (cross-run DUPLICATE flake); now claims/opens its own submitted case by reference.
3. Offer release form omitted the acceptance deadline (400); added CAT-date input.
4. Onboarding progress went stale after completion (server-rendered header); moved the count into the client component with refetch.
5. Leak assertion tripped on the new nav labels; narrowed to outcome wording.
6. Full-suite reruns require a FRESH database: the break-glass audit assertion is order-fragile on dirty DBs (fixed deterministically with `orderBy occurredAt asc` — same assertion, no weakening); config-versions count is timing-sensitive under parallel load (pre-existing, green on fresh DBs).
7. Handbook audit of the new slices found four conformance gaps, three fixed in this worktree: offer-accept acknowledgement page + acceptance declarations (Part 10 s4), condition owner/why fields (Part 10 s3, Design s6 s7), UI-DECISION-001 anatomy on the release form (authority/scope/package, consequences, exact declaration wording, conflict note). Recorded as open gaps: correction outcome routing (GAP-018), ticket categories + appeal route (GAP-019).

Sign-in screenshots captured from the same production build (desktop + 390px, `/tmp/opencode/signin-desktop.png`, `signin-mobile.png`): demo applicant panel, labelled fields, no mobile overflow. Typecheck + web lint re-verified clean after the `ticket-forms.tsx` change.

Light-only decision (2026-09-21, user): the app followed the visitor OS
`prefers-color-scheme` into a full dark theme (`tokens.css` dark token block +
`color-scheme: dark` in `globals.css`), so dark-mode devices saw a black site.
Vercel was not forcing it — reproduced locally with Playwright
`colorScheme: "dark"`. Per user decision the dark overrides were removed
(`packages/ui/src/tokens.css`, `apps/web/app/globals.css` now
`color-scheme: light`); a dark-OS screenshot after rebuild renders the approved
light palette. Web build exit 0. Uncommitted pending review.

## Phase 4 slice 6 (2026-09-23, `sis_ph4_changes_test` + `sis_browser_review_docs`)

Course changes + waitlist: typecheck 0, web lint clean, API build + web
build exit 0. `registration-changes.e2e-spec.ts` **15/15 green** on a fresh
DB (add/duplicate, required-drop advice refusal, unknown course, approve-add
with roster growth + version bump + outbox event, approve-drop with timetable
exclusion and no deletes, decline preservation, late-window routing,
versioned history, waitlist ordering/expiry/full/decline, denials,
neutrals). Regressions green on the same DB: `course-plan` +
`registration-submit` **28/28**, `student-conversion` + `student-portal` +
`registration-readiness` **27/27**. Browser `student-portal.spec.ts` with the
new changes leg (request BUS111 addition, join BUS112 waitlist, both visible
in history) **1/1 green** after `migrate deploy` on the browser DB. Unit
(`apps/api`) + `test:scripts` + repo `lint` green. Fixes found (all verified
green after): missing `Course` opposite relations + stale Prisma client
(regenerated), missing `KeyDto` import, timetable ENROLLED filter, expiry
write moved out of the rolling-back command transaction, ordering-based
waitlist assertion, `router.refresh()` in change forms. `backup:test`,
manual screen-reader/WSL replay, remote CI, and human walkthrough remain
**not verified**. Uncommitted pending review.

## Phase 5 slices 1–6 (2026-09-23, fresh `sis_ph5_final_test` + `sis_browser_review_docs`)

Finance simulation and clearance, simulator-only. Typecheck 0, web lint
clean (1 pre-existing warning cleared), API + web builds exit 0. API e2e
**68/68 green**: assessment 8, statement 8, payments 11, callbacks 12,
clearance 9, governance 20 — covering duplicate/delayed/reversed/
mismatched callbacks, connection-loss-after-initiation (uncertain state),
money rounding/allocation invariants (integer minor units), finance
scope/threshold/SoD denials (incl. dual-hat same-account refusal), and
restore/reconciliation convergence (redelivery returns stored outcome).
Phase-4 registration specs **53/53** unaffected (real clearance writer
feeds the gate). Browser `student-portal` (invoice → pay → uncertain →
dispatch → receipt → CLEARED → reversal → HELD) and new
`finance-workspace` (queue → escalate → sponsorship) green. Unit
(`apps/api`) + `test:scripts` + repo `lint` green. New gaps: GAP-020
(finance step-up auth). `backup:test`, manual screen-reader/WSL replay,
remote CI, Vercel route check, and human walkthrough remain
**not verified**. Uncommitted pending review.

## Phase 3–5 integrity repair — 2026-09-24 (`main`)

For `TASK-PH345-001`, regression assertions first reproduced the missing
offer revision, missing prerequisite refusal and charge reassessment, deleted
allocation history, and mutable posted transaction. On a fresh isolated seeded
database (`sis_phase345_final_test`), the eight affected API e2e specs then
passed **101/101**. API unit tests passed **68/68**. Repository typecheck,
lint and production build exited 0; lint retained existing warnings.

The existing localhost `sis` database was backed up to
`/home/hangoma/.local/share/sis-backups/sis-before-phase345-fix-2026-09-24.dump`
(`pg_restore -l` succeeded), then only the two additive integrity migrations
were deployed. No database reset or seed rerun occurred. API and web were
restarted at `127.0.0.1:3001` and `127.0.0.1:3100`; both returned HTTP 200.
Headless Chromium signed in as the existing fictional `phiri.n` account and
confirmed the applicant offer displays `offer version 1`, then switched to
the STUDENT workspace and rendered `/student/changes` and
`/student/finance` at 390px with no horizontal overflow. This student has no
invoice, so the finance page correctly displayed `No invoice yet`; the
charge, credit, clearance and reversal effects were verified in API e2e tests
rather than this live browser account. Browser inspection did not execute a
new course amendment or payment reversal on localhost.

The new revisions preserve terms from this migration forward. A previously
deleted allocation cannot be reconstructed. Real timetable checks remain
GAP-021; finance step-up remains GAP-020. Human review, remote CI and any
production deployment are not verified by this local run.

## Phase 6 slices 0–6 (2026-09-24, fresh `sis_ph6_final_test` + `sis_browser_review_docs`)

Moodle integration and recovery, simulator-only. Typecheck 0, web lint
clean, API + web builds exit 0. API e2e **80/80 sequential on one
shared DB**: teaching 15, mapping 12, envelope 7, sync 13, ops 8,
replay 12, reconciliation 13 — covering the roadmap proof set
(outage, duplicate/out-of-order, bad mapping, role-limited replay,
drift), TEST-E2E-REG-001/OPS-011 shapes, TEST-REC-001/004/005/006/008
shapes, and SoD denials incl. dual-hat refusal. Multi-file parallel
runs are order-fragile on shared DBs (global simulator mode +
maintenance windows); suites run sequentially, and recon assertions
are student-scoped. Phase-4/5 regressions **88/88** unaffected.
Browser **6/6**: portal (incl. Queued handoff), finance workspace,
teaching, mappings, ops workspaces, full checkpoint. Unit + scripts +
repo lint green. New gaps: GAP-021 (TG timetable). `backup:test`,
manual screen-reader/WSL replay, remote CI, Vercel route check, and
human walkthrough remain **not verified**. Uncommitted pending review.

## Phase 7 slice 1 (2026-09-25, fresh `sis_ph7_s1_test` + `sis_ph7_browser_test`)

Assessment scheme + grade-activity mapping plan (TASK-PH7-001),
simulator-only. Code in `024af1d` + one uncommitted test-only fix
(browser strict-mode `.first()`); this box runs Node **22.13.1**
(pinned **24.21.0**) against PostgreSQL **18** (`sis-postgres-18`).
Typecheck exit 0, web lint clean, API lint warnings-only
(pre-existing), API dist via direct `tsc -p
tsconfig.build.json` (`nest` CLI crashes on Node 22,
`ERR_REQUIRE_CYCLE_MODULE`), web production build exit 0. API e2e
`assessment-plan` **20/20** on the fresh DB (draft/versioning,
supersede, four-eyes, version conflict, closed codes, mapping
journey, self-activation refusal, synthetic fail-writes-nothing,
test-required, both-identifiers, arbitrary-mapping block,
unapproved/closed refusal, tutor/sysadmin/moodle-admin denials,
offering scope, neutrals, concurrent activation, idempotence,
officer reads). Unit **73/73**. Browser `assessment-plan`
(plan → map → activate incl. slice-2 staging leg) **1/1** on
`migrate deploy` + demo-seeded browser DB with rebuilt apps
(390px, keyboard/focus, no overflow, empty localStorage).

Environment deviations (recorded, not hidden): `npm run scan`
cannot run here (ripgrep unavailable); `test:scripts` has 3
environment failures (missing `rg`, plain-node `.ts` imports) on
Node 22 — unrelated to slice 1. First browser attempt failed
sign-in because a stale API on 3101 read the `sis` database;
fresh servers against the browser DB fixed it. `backup:test`,
full-suite regression on a shared DB (order-fragile), manual
screen-reader/WSL replay, remote CI, and human walkthrough remain
**not verified**. Detail in [NOTE-PH7-001](NOTE-PH7-001.md).

## Phase 7 slice 2 (2026-09-25, fresh `sis_ph7_s2_test` + `sis_ph7_browser_test`)

Moodle grade staging snapshot with frozen DS5 §4 provenance,
fail-closed outage guard, and the GAP-022 canonical chain
(TASK-PH7-002; lead Chitundu Milimbo, reviewer Charles Hangoma per
user correction 2026-09-25). Same Node 22.13.1 / PostgreSQL 18
environment notes as slice 1. Typecheck exit 0, web lint clean, API
lint warnings-only (pre-existing), API dist via direct `tsc`, web
production build exit 0. API e2e `grade-staging` **18/18** on the
fresh DB (13 prior proofs + frozen provenance, outage refusal +
preservation + resume, lost-response replay with a single outbox row,
superseded-mapping refusal, per-revision outbox events with the
chain). Slice-1 regression `assessment-plan` **20/20**, unit
**73/73**. Browser `assessment-plan` (incl. staging leg + new
provenance assertions) **1/1** on migrated + rebuilt apps (390px,
keyboard/focus, no overflow, empty localStorage).

Playwright's `npm`-based webServer still cannot start on Windows and
stale servers get silently reused; reused the proven workaround (kill
orphans, start API + `next start` directly against the target DB).
`backup:test`, full-suite shared-DB regression, manual
screen-reader/WSL replay, remote CI, and human walkthrough remain
**not verified**. Detail in [NOTE-PH7-002](NOTE-PH7-002.md).

## Phase 7 slice 3 (2026-09-25, fresh `sis_ph7_s3_final_test` + `sis_ph7_browser_test`)

Validation and missing-mark queue (TASK-PH7-003; lead Chitundu
Milimbo, reviewer Charles Hangoma). Same Node 22.13.1 / PostgreSQL
18 environment notes as slices 1–2. Typecheck exit 0, web lint
clean, API lint warnings-only (pre-existing — `next build`
typecheck additionally caught and fixed a missing ErrorSummary
title in the new triage form), API dist via direct `tsc`, web
production build exit 0. API e2e `grade-validation` **12/12** on
the fresh DB (per-code findings, partial-preserves-valid, work
item + no-zero, idempotent replay + convergence, stale/unmapped/
scale findings, swimlanes, triage state machine, denials,
expired-grant fail-safe, neutrals, correction-by-new-revision).
Slice regressions held on separate fresh DBs:
`assessment-plan` **20/20**, `grade-staging` **18/18** (two suites
in one parallel invocation collide on shared DBs — reran
sequentially per the standing lesson). Unit **73/73**. Browser
`validation-queue` (finding → resolve → resubmit → clean batch)
**1/1** on migrated + rebuilt apps (390px, keyboard/focus, no
overflow, empty localStorage; mobile cards scoped as `li`).

`backup:test`, full-suite shared-DB regression, manual
screen-reader/WSL replay, remote CI, and human walkthrough remain
**not verified**. Detail in [NOTE-PH7-003](NOTE-PH7-003.md).

## Phase 7 slice 4 (2026-09-25, fresh `sis_ph7_s4_final_test` + `sis_ph7_browser_test`)

Lecturer correction and moderation handoff (TASK-PH7-004; lead
Chitundu Milimbo, reviewer Charles Hangoma). Same Node 22.13.1 /
PostgreSQL 18 environment notes as slices 1–3. Typecheck exit 0,
web lint clean, API lint warnings-only (pre-existing), API dist via
direct `tsc`, web production build exit 0. API e2e
`grade-moderation` **14/14** on the fresh DB (submit checklist,
idempotent submit, submitter denials, approval with exact CA rows

- lock, same-account SoD refusal, return loop with history and CA
  supersession, clarify/refer lanes, write denials + closed
  decisions, racing-decision convergence, component lock + release
  on return, post-approval staging guard, neutrals, swimlane
  reads). Slice regressions held on separate fresh DBs:
  `assessment-plan` **20/20**, `grade-staging` **18/18**,
  `grade-validation` **13/13** (incl. the new concurrent-triage
  test locking the row-lock fix). Unit **73/73**. Browser
  `moderation` (submit → approve + returned correction) **1/1** on
  migrated + rebuilt apps (390px, keyboard/focus, no overflow, empty
  localStorage; `Cases` heading scoped exact). Seed `mushota.m`
  verified on scratch `sis_ph7_seed2_test` (19/19/21 twice,
  idempotent, correct assignment).

A real lost-update bug (racing decisions both 201) was caught by
the concurrency test and fixed with row locking on moderation
cases and findings. `backup:test`, full-suite shared-DB
regression, manual screen-reader/WSL replay, remote CI, and human
walkthrough remain **not verified**. Detail in
[NOTE-PH7-004](NOTE-PH7-004.md).

## Phase 7 slice 5 (2026-09-27, fresh `sis_ph7_s5_test` + `sis_ph7_browser_test`)

Board/decision package (TASK-PH7-005; lead Chitundu Milimbo,
reviewer Charles Hangoma). Same Node 22.13.1 / PostgreSQL 18
environment notes as slices 1–4. Typecheck exit 0, web lint clean,
API lint exit 0 warnings-only (two new warnings fixed: unused
import, array-sort compare), API dist via direct `tsc`, web
production build exit 0 (new `/admin/assessment/packages` routes).
API e2e `grade-board` **15/15** on the fresh DB (assembly
refusals: unmoderated/missing-list/open-MISSING/superseded-
provenance/bad-declaration, each proving nothing stored;
happy-path hash + weighted-total-v1 trace + reconciliation;
idempotent replay + key conflict; SoD; reason/condition demands
with stored conditions; five-role denials + student-read refusal;
neutrals; racing-decision VERSION_CONFLICT; expired-grant 403
with zero decision rows; DEFER/REFER/CLARIFY with REQUEST_CLOSED

- new-version resubmission; genuine-zero preview). Slice
  regressions held on separate fresh DBs: `assessment-plan`
  **20/20** (seeded), `grade-staging` **18/18**, `grade-validation`
  **13/13**, `grade-moderation` **14/14**. Unit **73/73**. Browser
  `board-packages` (moderate 3 cases → assemble → approve for
  release) **1/1** on fresh migrated + seeded browser DB with
  rebuilt apps (390px, keyboard/focus, no overflow, empty
  localStorage; hidden-`h2` scoped `.first()`, form label scoped
  `exact`).

Environment notes (recorded, not hidden): the per-account general
budget (180 req/min) 429'd the 15th test — fixed by alternating
preparers across `lecA`/`lecB`, never by raising the budget;
browser `.env` points API_INTERNAL_URL at dead port 3001 —
override to 3101/3100 in the shell; prior failed browser runs
pollute the shared browser DB (stale CA rows vs the new candidate
list → honest UNRECONCILED refusal) — recreate + migrate + seed
before final runs; an accidental `demo:reset` destroyed the local
pgdata volume mid-slice (fictional data only) — recovered `sis`
via direct migrate + seed, and tmp helper scripts stay untracked
for deletion before commit. `backup:test`, full-suite shared-DB
regression, manual screen-reader/WSL replay, remote CI, and human
walkthrough remain **not verified**. Detail in
[NOTE-PH7-005](NOTE-PH7-005.md).

## Phase7 continuation — 2026-10-01

See [fresh continuation evidence](PHASE-7-CONTINUATION-VERIFICATION.md). The isolated worktree is based on `9ffed61`, not the primary `01a53ba` plus OpenCode fixes. Existing slices1–5 reran at 80/80 on fresh separately seeded PostgreSQL databases. Publication/amendment tests and browser projection/gate/recovery checks are recorded separately from real IAM/policy/provider and human acceptance, which remain pending.

## v2.0 admissions queue vertical slice — 2026-10-02

Implemented in the existing `review/phase7-completion` worktree, HEAD
`8bbeb3003cdec60633fa20d5481daaa159bce7e0`. The controlling handbook was
checked at that HEAD, including `SUP-012`/`SUP-013`, the active admissions
role/action and permission records, UI constitution, recovery/test strategy,
and readiness gate. See [TASK-V2-ADM-001](../task-packets/TASK-V2-ADM-001.md)
and the v2.0 [spec](../superpowers/specs/2026-10-02-v2-operating-sis-design.md)
and [plan](../superpowers/plans/2026-10-02-v2-operating-sis-plan.md).

The admissions review queue now supports server-side keyset pagination with a
signed cursor bound to actor, active assignment, scope and normalized filters;
authorization and intake predicates apply before the bounded page limit. UI
filters and page navigation are URL-addressable, with labelled mobile cards,
page status and restart behavior. No schema changes, policy writes, Moodle
connection or live records were involved. The environment is local-only and
synthetic; no downloads occurred.

Verification on isolated Docker PostgreSQL `sis_v2_review_20261002`:

- API queue e2e: **14/14 passed** (`vitest run --config apps/api/vitest.config.e2e.ts apps/api/test/review-queue.e2e-spec.ts`), including equal-timestamp traversal, later-arriving case, actor/filter binding, revocation, tampered cursor refusal, existing claim/release and separation checks.
- Web production build: passed; API build and API/web TypeScript checks passed during this slice.
- Browser admissions queue: **3/3 passed** against fresh production build: claim/review/approver story, 390px URL-preserving pagination and invalid saved-link restart.
- Targeted API `oxlint`, web-app ESLint and `git diff --check`: passed. Browser spec files are outside the web ESLint config base path.
- `prepare-test-offerings` refreshed zero rows because the synthetic deadlines were already future-dated; all browser journeys nevertheless passed.
- Opt-in local scale: `RUN_SYNTHETIC_LOAD=true` with `review-queue-scale.e2e-spec.ts` passed **1/1** after generating 20,000 fictional submitted applications; 200 pages of 100 were traversed with no duplicate/omitted IDs. Successful queue request p50 **30.5 ms**, p95 **46.3 ms**, max **162.1 ms** on this machine; one 429 was honored with `Retry-After`. The 64.88-second total includes that wait. This is not a production load target. The SQL immutability trigger correctly refused attempted cleanup; those synthetic submissions remain only in the isolated 51 MB test database.

Still unverified: pagination during concurrent queue mutation, manual screen-reader/zoom/low-bandwidth testing, production IAM MFA and supervisor authority review, human acceptance, production deployment/rollback, real Moodle/provider integration. This slice does not close those gates or claim v2.0/MVP production readiness.

## v2.0 institution setup readiness — 2026-10-02

[TASK-V2-SETUP-001](../task-packets/TASK-V2-SETUP-001.md) adds a read-only
operational report of foundational record counts and unresolved setup controls.
The endpoint requires a live `SYSADMIN` assignment in `SYSTEM:GLOBAL`, audits
allowed and denied authenticated reads, and returns no personal records,
configuration values or secrets. The mobile System Operations page labels
found records as unverified and shows why the institution is still blocked.
The [governance proposal](../policies/INSTITUTION-CONFIGURATION-GOVERNANCE-PROPOSAL.md)
is a decision agenda, not adopted policy or a write permission.

Verification on the same isolated synthetic PostgreSQL database:

- Setup API e2e first failed with 404 before implementation, then **4/4 passed**. Combined with queue e2e, **18/18 passed** across two files.
- Setup browser test first failed with absent navigation, then **1/1 passed** at 390px. Combined with admissions queue, **4/4 passed**.
- API and web production builds, `npm run typecheck`, `npm run scan` and `git diff --check` passed. `npm test` passed **309 tests with 13 skipped** across 32 files. Full `npm run lint` exited 0 with warnings in pre-existing API files; targeted `oxlint` for the new setup code/test and web ESLint were clean.
- No package, browser, image or data download occurred. The existing `sis-postgres-18` Docker container hosted only the isolated `sis_v2_review_20261002` test database for this work.

Still open: institutional owner/approver/publisher appointments, organisation
scope registry, typed editable configuration, effective-dated relationships,
historical migration reconciliation, manual accessibility/low-bandwidth
review, live provider decisions and human acceptance. No setup write path was
enabled. Detail: [NOTE-V2-SETUP-001](NOTE-V2-SETUP-001.md).

## V2 admissions reference lookup — 2026-10-02

[TASK-V2-ADM-002](../task-packets/TASK-V2-ADM-002.md) adds exact reference
search to the current scoped reviewer queue, without new decision or write
authority. A peer-claimed or unknown reference produces the same empty result.
The browser retains the search in the URL and on reload. On isolated
`sis_v2_review_20261002`, the queue API suite passed **15/15** and combined
queue/setup suites passed **19/19**, including normalized lookup and cursor
mismatch; the admissions browser suite passed
**4/4** at 390px after API and web production builds and API/web typecheck
passed. The first browser rerun exposed the old test's first-page assumption
under a large synthetic intake; the full journey now uses reference lookup.
The suite signs in distinct synthetic officers so the existing sign-in rate
limit remains effective. Earlier browser harness failures were from Docker
restarting and from `.env` port 3147 while Playwright expected 3101; the
passing command explicitly set `PORT=3101` and used the isolated PostgreSQL
connection. An additive `pg_trgm` index migration applied successfully in that
isolated database; local `EXPLAIN (ANALYZE, BUFFERS)` changed the missing-reference
case from a 20,199-row sequential scan (18.839 ms) to a bitmap index scan
(0.660 ms). This is query-plan evidence on one machine, not a production SLO.
[Detailed note](NOTE-V2-ADM-002.md). No download occurred.

## V2 admissions ordering — 2026-10-02

[TASK-V2-ADM-003](../task-packets/TASK-V2-ADM-003.md) adds oldest/newest server-side ordering to both existing reviewer views. Equal-timestamp cases traverse in both directions without duplication; a cursor from the other direction is refused. The URL and 390px browser page retain and reset the selection correctly. Combined queue/setup API suites passed **19/19**, admissions browser suite **4/4**, and API/web production builds and typecheck passed on the isolated synthetic setup. This is not workload priority or allocation. [Detail](NOTE-V2-ADM-003.md).

## V2 student timetable availability — 2026-10-02

[TASK-V2-TIME-001](../task-packets/TASK-V2-TIME-001.md) adds a student-owned page and an explicit pending-publication API state over the official registered-course source. Before registration the endpoint returns its existing 404; after registration it returns no made-up sessions. Foreign student access remains denied. Registration API e2e passed **13/13** and the student portal browser journey **1/1** at 390px after fresh API/web production builds; typecheck passed. Actual timetable sessions, authority and conflict validation remain GAP-021/TASK-101–105. [Detail](NOTE-V2-TIME-001.md). No download occurred.

## V2 applicant document handoff repair — 2026-10-02

[TASK-V2-APP-001](../task-packets/TASK-V2-APP-001.md) repairs the local applicant document step without changing the server safety gate. The browser cases were red before implementation for absent fictional-sample guidance/next-step route and a pre-hydration file selection that left Upload disabled. After implementation, focused browser cases passed **2/2** and the applicant/public applicant suites **9/9**. API unit suites passed **309 with 13 skipped**, web build, API/web typecheck, lint and source scan exited 0. Lint retains pre-existing warnings outside the edited applicant files. The running local page and sample PDF returned 200; current qualification blockers and the review route rendered. Manual assistive-technology and slow-network checks remain open. [Detail](NOTE-V2-APP-001.md). No download occurred.
[TASK-V2-SUPPORT-001](../task-packets/TASK-V2-SUPPORT-001.md) adds an isolated synthetic academic-support route with a named adviser, owned request and secure two-way reply. Focused API e2e passed **4/4**; the connected student/adviser browser story passed **2/2** after final Tailwind presentation changes, including 390px no-overflow and unavailable-route handling. Prisma validation, API build, web production build, web/API lint and `git diff --check` exited 0. API lint retains existing unrelated warnings. This is `DEMO_MODE`/`demoOnly` only; [GAP-V2-002](../gaps/GAP-V2-002-student-support-routing-and-ownership.md) still blocks live service activation. [Detail](NOTE-V2-SUPPORT-001.md). No download occurred.

[TASK-V2-SUPPORT-002](../task-packets/TASK-V2-SUPPORT-002.md) adds appointment-scoped adviser queue filters for reply need/status and exact case reference, preserving filter context across bounded pages. Focused API e2e passed **5/5** after an observed red test; the new index migration applied only to the isolated review database. Browser assertions caught and then verified the fix for a global reset that stripped Tailwind padding and for default bullets beside case cards. The combined support/admissions/student/applicant browser set passed **18/18** after restarting the local API with its existing environment loader. API/web builds, Prisma validation, lint and `git diff --check` exited 0; API lint retains existing unrelated warnings. [Detail](NOTE-V2-SUPPORT-002.md). No download occurred.

[TASK-V2-FIN-001](../task-packets/TASK-V2-FIN-001.md) replaces unbounded Finance Officer case-list and finance-home counting requests with a bounded reconciliation queue and source-owned counts. The full finance governance API suite passed **22/22** with the repo environment loader; fresh API/web production builds passed. Finance browser **1/1** and student portal regression **1/1** passed at the review DB and 390px after aligning the web proxy with Playwright's API port. The first finance browser attempt selected an older synthetic case in the retained isolated database; the fixture now opens its exact seeded case. The composite queue index was applied to the isolated review DB. [Detail](NOTE-V2-FIN-001.md). No provider call or download occurred.

[TASK-V2-FIN-002](../task-packets/TASK-V2-FIN-002.md) adds bounded pending-arrangement staff pages and a responsive decision worklist. The focused API test was observed red for an ignored page limit, then passed; the complete finance governance API suite passed **23/23**. The connected finance browser story passed **1/1** at 390px including arrangement ordering, selected-request visibility and no horizontal overflow. Prisma validation, isolated review migration, API/web production builds, API/web lint and `git diff --check` passed; API lint retains unrelated warnings. Student own history and the existing individual approval/decline flow remain unchanged. [Detail](NOTE-V2-FIN-002.md). No provider call or download occurred.

[TASK-V2-FIN-003](../task-packets/TASK-V2-FIN-003.md) bounds pending adjustment/refund review and separates officer request from approver decision forms in the UI. The focused API test was red for an ignored page limit; the complete finance governance suite passed **24/24** after implementation. The connected finance browser suite passed **2/2** at 390px, covering both roles, filters, stale-page recovery and no horizontal overflow. Prisma validation, isolated review migration, API/web production builds, API/web lint and `git diff --check` passed; API lint retains unrelated warnings. Existing money-action authority remains server-side. [Detail](NOTE-V2-FIN-003.md). No provider call or download occurred.

[TASK-V2-SUPPORT-003](../task-packets/TASK-V2-SUPPORT-003.md) adds an auditable synthetic academic follow-up from adviser proposal through student acceptance or decline, completion claim and adviser confirmation. The new API test was red with 404 before implementation; focused API e2e passed **6/6** after implementation, including wrong-role/student denial, invalid date/route, changed assignment refusal, replay, decline and complete paths. The connected student/adviser browser suite passed **3/3** at 390px. The isolated migration, Prisma validation, API/web production builds and API/web lint passed; API lint retains existing unrelated warnings. [Detail](NOTE-V2-SUPPORT-003.md). This remains demo-only under GAP-V2-002; no provider call or download occurred.

[TASK-V2-SUPPORT-004](../task-packets/TASK-V2-SUPPORT-004.md) adds a selected-adviser, target-date-ordered active follow-up worklist with bounded pages, past-target and confirmation filters. The new API test was red at the missing route, then the focused support API suite passed **7/7**, including filter, paging, stale/foreign cursor and role denial. The connected support browser suite passed **3/3** at 390px, including the new confirmation worklist. The worklist index migration applied only to the isolated review DB; Prisma validation, API/web production builds, API/web lint, formatting and `git diff --check` passed. API lint retains unrelated warnings. [Detail](NOTE-V2-SUPPORT-004.md). No notification, provider call or download occurred.

[TASK-V2-SUPPORT-005](../task-packets/TASK-V2-SUPPORT-005.md) adds evidenced academic-case closure with a single immutable closure row, request event and audit. The new API test was red at the absent route, then focused support API e2e passed **8/8**, including active-action and missing-evidence denial, completed-action and guidance closure, replay/conflict, wrong-role/unrelated appointment, changed adviser relationship, demo-off, closed-write denial and queue visibility. The connected student/adviser browser suite passed **3/3** at 390px, including closure and the student-visible completed state. The isolated closure migration, Prisma validation, API/web production builds, API/web lint, formatting and `git diff --check` passed; API lint retains unrelated warnings. [Detail](NOTE-V2-SUPPORT-005.md). No external notification, provider call or download occurred.
