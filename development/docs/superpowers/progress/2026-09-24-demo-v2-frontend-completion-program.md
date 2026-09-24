# Native execution ledger — plan: development/docs/superpowers/plans/2026-09-24-demo-v2-frontend-completion-program.md

Execution branch: `demo-v2-readiness`
Baseline: `4d32f6e6ea182b9128e14c7a34c21f65f8d4dfe1` (current Phase-6 `main`).
Plan commit: `d41f4f367275b5d90927a830d11162f36b8b8218`.

Ruling: connector-only repository access prevents a local git worktree / `.superpowers/sdd` workspace. Use the already isolated `demo-v2-readiness` branch, repository progress ledger, atomic commits and GitHub CI as the executable RED→GREEN environment. Cost if wrong: less local isolation; mitigated by branch isolation and full CI.

Pre-flight: Task 1 produces a shared role-aware workspace navigation model consumed by Tasks 2–3. Student and staff routes currently duplicate navigation logic; no contract conflict found.
Pre-flight: Tasks 4–5 share deterministic demo scenario identifiers; Task 4 must define stable references before Task 5 consumes them.
Pre-flight: Task 6 preview routes are consumed by Tasks 9–10 quality/rehearsal checks; preview/live boundary from the modernization spec remains authoritative.
Pre-flight: Task 8 preview maturity labels are consumed by Task 9 quality scans; no conflict found.


Task 1 baseline finding: PR CI run 36015717485 failed before Playwright because the Phase-6 baseline API e2e suite is already red: 30 failures across finance governance/callback/clearance, integration reconciliation/sync and review queue, mostly returning 503; PostgreSQL also reported duplicate `ExpiryWarning_open_key`. This is unrelated to the navigation-only branch diff and matches the red current-main CI pattern.

Task 1 Ruling: add a parallel `ui-contracts` CI job that provisions an isolated database, builds the app and runs only this programme's browser contract. Keep the existing full `verify` job unchanged so baseline failures remain visible. Cost if wrong: CI uses extra minutes, but UI RED→GREEN evidence no longer depends on unrelated Phase-6 API-suite instability.


Task 1 RED: isolated `ui-contracts` job in CI run 36016459340 built and seeded successfully, then `ui-workspace-navigation.spec.ts` failed exactly because `getByRole("navigation", { name: "Workspace navigation" })` found no element on the signed-in student home; later serial cases were skipped.

Task 1 Ruling: add `student/layout.tsx` even though the plan listed only student CSS. Current student pages are fragments with no shared route layout, so a persistent navigation cannot exist across `/student/**` otherwise. Cost if wrong: one additional `/auth/me` read per student route render; no student domain mutation or authorization rule changes.


Task 1: complete — isolated UI job in CI run 36017087297 passed build, migration/seed and all four `ui-workspace-navigation.spec.ts` contracts on `0c0fdc7`. The full `verify` job remains independently affected by the recorded Phase-6 baseline API e2e failures.

Task 2 RED contract: student home must order `Required action → Registration → Finance → Courses and changes`; readiness conditions must expose owner and next step structurally; student finance must expose a labelled Finance summary; finance staff home must expose a labelled work queue rather than dashboard-card composition.


Task 2 RED: isolated `ui-contracts` job in CI run 36017595240 completed install, migration/seed, API/web build and Chromium setup, then failed `ui-student-finance-polish.spec.ts` on the current Student/Finance hierarchy as expected. Task 1 navigation tests remained green.

Task 2 icon-system ruling: the Phase-6 web app had no shared icon library or icon primitive. Added a first-party `@sis/ui/Icon` stroke-icon vocabulary using `currentColor`, consistent 24×24 viewboxes, and aria-hidden decorative SVGs. Critical actions remain text-labelled. Cost if wrong: maintaining a small internal icon set adds UI-package surface area, but avoids mixing ad-hoc SVG styles or adding a large dependency only for icons.

Task 2: implemented — student and finance live routes now use the shared institutional page grammar, complete required-width coverage, explicit outage/uncertainty states, and role-aware Finance maker/checker controls.

Task 3: implemented — Phase-6 Moodle/integration operations UI polish covers Moodle home, maintenance, mappings, integration overview, deliveries, replays and reconciliation. Browser contracts live in `ui-phase6-operations-polish.spec.ts`.

Task 4: implemented — deterministic demo story data, reset/seed assertions and `demo:doctor` provide stable presentation identities and integration recovery scenarios.

Task 5: implemented — `/demo`, `/demo/stories` and `/demo/evidence` form the Demo Control Centre and presentation evidence/fallback pack.

Task 6: implemented — Phase-7 assessment staging/release and student-results preview routes establish the next-version assessment/results interaction grammar without leaking preview capability into live routes.

Task 7: implemented — CI gained the finance simulator secret and isolated UI programme contracts. Connector-authored commits do not currently receive fresh pull-request workflow runs, so recent commits still require runner verification.

Task 8: implemented — V2 preview maturity index plus Student, Teaching, Finance, Support, Quality, Graduation, Reporting and Integrations future-workspace previews share the same maturity-labelled preview grammar.

Task 9: implemented — cross-workspace browser quality contracts cover representative authenticated routes, 390px/1440px widths, overflow, gradients, keyboard focus and preview/live separation.

Task 10: implemented — guarded `demo:rehearse`, rehearsal safety tests and `docs/demo/DEMO-RUNBOOK.md` provide a repeatable local presentation rehearsal path.

Moodle live-adapter reconciliation (2026-09-24): implementation hardening is implemented on this branch after bringing the new `main` live adapter across; fresh runner verification remains required. Added regression contracts and fixes for Moodle form encoding, exact course-shortname matching, partial-config refusal, read-only-first live mode, configurable category ID, correct tutorial-group names, role-normalized student reconciliation, proper group-member lookup, idnumber reconciliation, role-aware staff idempotency, group-member idempotency, permanent-error manual review, provider I/O outside Prisma interactive transactions, and POST-body token transport. The automatic delivery worker is inert while `MOODLE_LIVE_WRITES=false`.

Verification note: the latest connector-authored head has no fresh GitHub Actions run, and both Vercel contexts are currently blocked by the account build-rate limit rather than a reported compile/test failure. Do not mark the live-adapter hardening verified green until a fresh API/unit/e2e/build runner completes.


Task 2 implementation follow-up (2026-09-24): expanded the student/finance readiness contract to every live student route and the representative finance operations routes at 390px and 1440px. Remaining legacy page frames were aligned to the shared `PageHeader` grammar. Student payment-arrangement outages now render an explicit unavailable/recovery state instead of an empty-success state.

Task 2 role-boundary review: added a dedicated FINANCE_APPROVER browser persona and made the Finance landing page role-aware. FINANCE_OFFICER now sees reconciliation, maker adjustment controls, sponsorship and cashier work; FINANCE_APPROVER sees only adjustment/arrangement decision queues. Cashier controls require the active FINANCE_OFFICER workspace before rendering. Adjustment and arrangement forms now respect maker/checker separation in the UI while backend capability/SOD checks remain authoritative.

Task 7 follow-up: presentation evidence now includes a browser contract that simulates a temporary Moodle connection-validation outage, proves the action is retryable, and recovers to the read-only live state without invoking a mutation endpoint.

Task 9 follow-up: keyboard contracts now reach live student course-selection controls and the live Moodle connection check with visible focus. The required-width matrix covers all live student routes plus representative finance operations routes. Phase-7 release remains intentionally non-interactive because preview routes must not imply authoritative mutations.

Task 10 follow-up: `demo:rehearse` now includes workspace navigation, complete student/finance polish, Phase-6 operations, recovery evidence, assessment/V2 previews and cross-workspace quality contracts. `demo:doctor` now verifies the exact delayed-delivery marker, exact dead-letter marker with its pending replay, reconciliation mismatch, and refuses live Moodle credentials for deterministic rehearsal.

Final review: self-review (no subagent tool). Important findings fixed in this pass:
- Demo Story 1 and runbook pointed at nonexistent `/applications`; corrected to the real `/applicant` workspace and pinned in browser contracts.
- Live-capable Moodle/Integration screens hard-coded simulator/provider wording; backend identity is now explicit (`Live Moodle` vs `Moodle simulator`) across Moodle home, mappings, Integration Support and reconciliation.
- Reconciliation exposed cross-workspace back-links irrespective of active role; return navigation is now role-specific for MOODLE_ADMIN vs INTEGRATION_SUPPORT.
- Finance Approver could land on an officer-only reconciliation fetch and receive Workspace unavailable; landing queues are now role-aware.
- Finance maker/checker controls were rendered to both roles; adjustment/arrangement controls are now role-scoped.
- Cashier controls were visible before UI authority confirmation; controls now require the active FINANCE_OFFICER workspace.
- Student arrangement API failures were presented as an empty list; failures now preserve uncertainty and recovery wording.

Verification note: these newest review fixes have browser/unit contracts wired into root CI and `demo:rehearse`, but connector-authored commits still require a fresh runner before the programme can be called verified green.


Completion-contract regression review (2026-09-24, continued):
- Historical full verify run `36017087297` reported 30 failures across six E2E files (339 tests passed). The failed run environment did **not** define `FIN_SIM_SECRET`.
- All failures in `finance-callbacks.e2e-spec.ts`, `finance-clearance.e2e-spec.ts`, and the seven failures in `finance-governance.e2e-spec.ts` failed at simulator/callback operations with HTTP 503. `FinanceService.simulatorSecret()` returns `503 SIMULATOR_UNCONFIGURED` exactly when `FIN_SIM_SECRET` is absent. The current root CI now supplies `FIN_SIM_SECRET: demo-fixtures-secret` to both `verify` and `ui-contracts`.
- The historical review-queue failures depended on finding a newly-created application inside a capped shared-database pool. Current tests prove release by re-claiming the exact case and use a larger bounded state-filter window instead of assuming first-page placement.
- The historical integration sync duplicate failure asserted that a second global worker pass processed zero rows, which is invalid in a shared suite with unrelated backlog. Current test asserts the target student's simulator row is unchanged and unique.
- The historical reconciliation failures came from one-batch/global assertions under shared backlog. Current reconciliation helper drains due worker batches (bounded at 20 passes), and mismatch/clean assertions are scoped to the target student/case.
- PostgreSQL logged a losing `ExpiryWarning_open_key` insert during the old full suite. The current expiry daemon catches concurrent warning-creation races and treats the winner's warning as authoritative; the log entry alone is not an uncaught test failure.

Additional final-review fixes in this pass:
- Added full 390px/1440px route evidence for Records Officer and SYSADMIN using isolated browser personas that match seeded authority.
- Added honest signed-in landing state for recognized IAM-only roles (e.g. LEC) that intentionally have no authoritative Phase-6 operational screen rather than inventing fake navigation.
- Distinguished access denial from temporary service uncertainty across Moodle administration, mappings, maintenance, Finance workspace/queues, Records identity review, access reviews, role grants, audit evidence and access-review detail.
- Made Finance maker/checker navigation and controls role-aware end-to-end and added a dedicated FINANCE_APPROVER persona.
- Corrected the Demo Control Centre, runbook and readiness matrix from nonexistent `/applications` to the real `/applicant` route; PR patch scan showed no remaining `/applications` references.
- Added stale/unknown Moodle connection-status evidence and warning presentation; only confirmed checks render success.
- Added coordinator shell label `Teaching workspace` and role-specific reconciliation return navigation.
- Tightened accessibility evidence wording to exactly match tested navigation and representative live controls.

Readiness ruling: implementation/review causes behind the historical red baseline are addressed or explicitly accounted for, but the completion contract still requires a **fresh full runner**. Do not mark Phase 1–6 regressions, current browser contracts, build, lint or Demo V2 as verified green until current-head CI executes successfully.


Fresh-run follow-up (CI #125, current programme branch):
- `verify` reached API build and exposed one strict TypeScript narrowing error in `deliverOutbox()`; fixed by explicitly narrowing the claimed `outcome` to a string.
- `ui-contracts` reached database migration/seed and exposed malformed escaped template literals in the deterministic seed; all escaped template syntax in changed TypeScript/TSX/MJS files was then scanned and removed.
- A full PR changed-file syntax scan found no remaining escaped backticks or escaped template interpolations.
- These fixes are committed after CI #125, so a new current-head run is still required before changing the readiness ruling.
