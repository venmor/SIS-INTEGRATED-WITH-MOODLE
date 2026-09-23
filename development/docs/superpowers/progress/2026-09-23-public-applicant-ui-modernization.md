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


Task 7 debug: CI run 35833573337 reached the browser suite with all prior gates green, then failed two new helper tests.
Root cause 1: the timeline helper navigated away immediately after section-save clicks, before the async save status confirmed; the existing green applicant journeys wait for "All changes saved". Fix: add the same save-confirmation waits. Cost if wrong: the helper could still leave a section before persistence finishes.
Root cause 2: the empty-home capture navigated to /applicant immediately after clicking Sign in; the session redirect had not completed and /applicant redirected back to sign-in. Fix: wait until the URL has left /sign-in, then open /applicant. Cost if wrong: a future sign-in flow that intentionally remains on /sign-in would need a different readiness signal.


Task 7 diagnostic: the timeline helper still reaches Review with submission disabled after matching existing save waits. Add a fail-fast enabled assertion and print the visible review state/blockers when disabled. This is evidence gathering only; no product behavior changes.


Task 7 root cause confirmed in CI run 35835025757: the review was ready (4/4 required sections complete; "Ready to submit"), but `locator.count()` returned 0 before streamed declaration controls rendered, so the helper skipped all declaration checks. The disabled Continue button was correct product behavior. Fix: wait for exactly three declaration checkboxes before checking them; remove diagnostic logging. Cost if wrong: if the approved demo policy changes declaration count, this test must change with the policy fixture.


Task 7: complete — CI run 35835543979 passed the complete verification pipeline, including all 13 browser tests. Visual evidence artifact: 10739131981 (desktop discovery, 390px discovery, applicant empty home plus browser report/test-results).

Final review: self-review (no subagent tool available). Reviewed the full public/applicant modernization against the approved spec and Review Focus. No Critical or Important findings. Verified: no gradients/glass effects in changed core surfaces; no horizontal overflow in tested critical mobile flows; draft/submitted states remain distinct; document and submission blockers are text-first; loading skeletons are aria-hidden with concise status announcements; API/auth/submission semantics remain unchanged.

Final: Ruling: true pixel-baseline regression remains deferred to the dedicated visual-quality plan because this environment cannot bootstrap/inspect binary Playwright snapshots — current CI captures screenshot evidence and structural assertions — cost if wrong: visual drift can be detected manually from artifacts but not automatically pixel-compared in this slice.
