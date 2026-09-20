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
