# Native execution ledger — plan: development/docs/superpowers/plans/2026-09-23-public-applicant-ui-modernization.md

Execution branch: `ui-modernization`

Ruling: The sandbox cannot clone GitHub because outbound DNS is blocked. The connected GitHub branch is the isolated workspace, and the draft pull request CI is the executable verification environment. Cost if wrong: slower RED→GREEN feedback because each test cycle waits for CI.

Pre-flight: Tasks 1–6 share applicant/discovery CSS and browser-test interfaces; later tasks consume no renamed APIs from earlier tasks. No interface conflict found.

User constraint: UI copy is brief and direct; hierarchy and labels carry meaning before prose. Long guidance stays out of routine workflows.

Ruling: CI is the only executable environment available. Batch Tasks 1–6 semantic tests into one RED commit, confirm each expected failure in the Playwright step, then implement the six production slices. This preserves test-first ordering while avoiding six full pre-browser CI pipelines. Cost if wrong: a later test could mask an earlier failure; inspect the browser log for every named test before GREEN work.
Baseline: CI run 35812935749 passed source scan, lint, unit tests, migrations, both API e2e groups, production build, typecheck and browser tests.

RED run 35813252843: Tasks 1–5 failed for the intended missing UI contracts. Task 6 failed in test setup because Review remained blocked before document safety completion.
Task 6 test ruling: wait for the existing document preview state before opening Review, matching the established applicant browser journey. Cost if wrong: test may still fail before reaching the timeline assertion.

Corrected RED run 35813699371: all six semantic contracts failed for the intended missing UI behavior. Production implementation may begin.

Task 3 Ruling: the next-step summary names the next section but does not duplicate the section link. The canonical action remains in the application step list. Reason: the duplicate same-destination link created ambiguous accessible navigation and broke existing keyboard/browser journeys. Cost if wrong: the user reads the summary, then activates the clearly visible step link immediately below.
Browser GREEN attempt 35814324223: five new contracts passed. Existing applicant/admissions journeys and the submitted-status helper failed because the duplicate next-step link made "Personal details" non-unique.

Browser GREEN attempt 35814760301: all six new handbook-facing tests passed after the canonical-link fix. Three existing journeys still failed because the document modernization removed the per-file status text they rely on and users need ("file name · Checking file safety").
Task 4 Ruling: keep both the requirement-level status and the file-version status. The requirement status answers whether evidence exists; the file row answers what is happening to that specific upload. Cost if wrong: slight status repetition, preferable to losing file-level processing visibility.


Task 1: complete — programme result action contract RED in run 35813699371; GREEN in run 35814760301 and retained in full green run 35815108402.
Task 2: complete — applicant required-action contract RED in run 35813699371; GREEN in run 35814760301 and retained in full green run 35815108402.
Task 3: complete — next-step contract RED in run 35813699371; canonical-link ruling applied; GREEN in run 35814760301 and retained in full green run 35815108402.
Task 4: complete — document-state contract RED in run 35813699371; file-level status regression fixed; full browser suite GREEN in run 35815108402.
Task 5: complete — submission-readiness contract RED in run 35813699371; GREEN in run 35814760301 and retained in full green run 35815108402.
Task 6: complete — corrected timeline contract RED in run 35813699371; GREEN in run 35814760301 and retained in full green run 35815108402.

Full verification run 35815108402: source scan, lint, unit tests, database migrations, both API e2e groups, production build, typecheck and complete browser suite all passed.

Task 7 Ruling: this execution environment cannot clone the repository or generate/read binary Playwright snapshot baselines. Replace first-slice pixel baselines with deterministic CI screenshot evidence plus responsive structural assertions, uploaded through the existing `browser-evidence` artifact. Keep true `toHaveScreenshot` baseline regression in the dedicated visual-quality plan where snapshots can be bootstrapped and inspected. Cost if wrong: this slice detects semantic/responsive regressions but not pixel-level drift.
