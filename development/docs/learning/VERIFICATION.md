# Verification evidence — 2026-09-19

Verified in the isolated `review/phase-2-slices-2-5` worktree. Node **24.21.0**; PostgreSQL **18**; committed npm lockfile. Final database runs used a separate Docker container, `sis-phase2-review-tests`, bound only to `127.0.0.1:55432`. Existing `sis-postgres-18` on 5432 and other applications were not modified. Earlier isolated temporary PostgreSQL verification was repeated after the session's temporary services were cleared.

## Executed checks

| Check | Current result | What it establishes |
|---|---|---|
| `npm test` | **64 tests passed, 13 files** | Existing unit/contracts plus scanner boundaries, including clean-antivirus/structural-PDF distinction |
| Prior API suite, excluding the two new suites | **67 tests passed, 13 files** | Authentication, recovery, grants, active workspace, policy, expiry, reviews, reinstatement, break-glass, audit, configuration and public catalogue |
| `applications.e2e-spec.ts` + `config-versions.e2e-spec.ts` | **19 tests passed, 2 files** | Real database/HTTP applicant ownership, versions, partial saves, live policy/deadline/contact checks, upload/replacement, programme change/discard/count limit, rollback/concurrent submit, SQL immutability and persisted configuration snapshot |
| `npm run test:scripts` | **6 passed** | Same-origin boundary, scan failure exit, year/CAT date rendering, password-safe backup failures |
| `npm run test:browser` | **2 passed** | Connected 390px mobile/keyboard journey, unsaved-navigation warning, actual save-and-continue navigation, locked qualification controls during delayed save, safe fixture preview, lost-submit-response recovery, refreshed receipt, no horizontal overflow/localStorage, foreign-origin denial |
| `npm run build` | **Passed** | Production Next.js and NestJS builds, shared configuration build |
| `npm run typecheck` | **Passed** | Full API source/test and web TypeScript checks |
| `npm run lint` | **Passed with 12 warnings; no errors** | Web lint clean; API warnings described below |
| `npm run scan` | **Passed** | No prohibited source/dependency patterns or scanned secret patterns detected; not an exhaustive security audit |
| `prisma validate`; fresh `migrate deploy` + demo seed | **Passed on three isolated databases; 13 migrations each** | Schema validity and fresh install after duplicate catalogue-key repair |
| `npm run backup:test` | **25 table counts matched; all seven orphan checks zero** | Actual dump/restore into a newly created scratch database, including admissions records |
| Existing scratch-name collision | **Rejected; existing submission count unchanged** | Backup test does not erase an existing database |
| Whitespace, local Markdown paths, source preservation and checksums | **291 Markdown documents checked; zero missing local path targets; 227 checksums matched; 70 exact record bodies preserved; whitespace clean** | Path targets checked (not every heading fragment or external URL); source/navigation consistency, not institutional approval |

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

## Phase 3 slices 1–2 verification — 2026-09-21 (uncommitted worktree)

Node **22.13.1** on this box vs pinned **24.21.0**; PostgreSQL **18** via
`sis-postgres-18`. Fresh isolated databases per run
(`sis_ph3_review4` for API e2e, `sis_ph3_browser2` for browser); committed
npm lockfile. Full API e2e in walkthrough order on the fresh DB.

| Check | Current result | What it establishes |
|---|---|---|
| `npx tsc --noEmit` API + web | **Passed** | Full source/test type safety incl. review service, DTOs, staff pages |
| `npm run lint` | **Passed, warnings only, no errors** | No new lint debt |
| `npm test` (unit) | **66 passed, 14 files** | Contracts, guards, scanner, IAM (policy.spec covers new verbs) |
| Prior API suite (13 files, excl. admissions/review) | **67 passed** | No regression in Phases 0–1 + catalogue |
| Admissions + case + review suites (5 files) | **64 passed** | Draft→submit→receipt intact; 13 queue + 12 evidence tests green |
| `npm run build --workspace=apps/web` | **Passed** | Production build incl. `/admin/admissions/queue`, `/admin/admissions/case/[id]`, `/api/review` proxy |
| API dist (`tsc -p tsconfig.build.json`) | **Passed** | Direct `tsc` used: `nest` CLI crashes on Node 22 (ora ESM cycle) |
| `test:browser` staff queue | **1 passed** | Claim → finding → clarification on 390px, keyboard/focus, no overflow, no localStorage |
| `test:browser` applicant regression | **2 passed** | Existing applicant journeys intact |
| `prisma migrate deploy` fresh + demo seed | **Passed, 18 migrations** | Queue, findings and index migrations apply in order; 3 demo staff seeded |

Not run here with fresh evidence: `test:scripts` (needs ripgrep + Node 24
type-stripping; 1 scanner test fails environmentally), `scan`
(ripgrep unavailable), `backup:test` (no `psql` client on this box;
script updated to 35 tables/10 orphans), slice-6 `applicant-case` browser
spec (cancelled per user instruction). Manual screen-reader, WSL replay,
remote CI, branch protection and human walkthrough remain **not verified**.
The [Phase 3 learning review](PHASE-3-IMPLEMENTATION-REVIEW.md) records
scope, issues found, and presentation limits. No human signoff, production
approval or phase acceptance is implied.
