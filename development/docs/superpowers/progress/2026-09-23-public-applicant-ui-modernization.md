# Native execution ledger — plan: development/docs/superpowers/plans/2026-09-23-public-applicant-ui-modernization.md

Execution branch: `ui-modernization`

Ruling: The sandbox cannot clone GitHub because outbound DNS is blocked. The connected GitHub branch is the isolated workspace, and the draft pull request CI is the executable verification environment. Cost if wrong: slower RED→GREEN feedback because each test cycle waits for CI.

Pre-flight: Tasks 1–6 share applicant/discovery CSS and browser-test interfaces; later tasks consume no renamed APIs from earlier tasks. No interface conflict found.

User constraint: UI copy is brief and direct; hierarchy and labels carry meaning before prose. Long guidance stays out of routine workflows.

Ruling: CI is the only executable environment available. Batch Tasks 1–6 semantic tests into one RED commit, confirm each expected failure in the Playwright step, then implement the six production slices. This preserves test-first ordering while avoiding six full pre-browser CI pipelines. Cost if wrong: a later test could mask an earlier failure; inspect the browser log for every named test before GREEN work.
Baseline: CI run 35812935749 passed source scan, lint, unit tests, migrations, both API e2e groups, production build, typecheck and browser tests.

RED run 35813252843: Tasks 1–5 failed for the intended missing UI contracts. Task 6 failed in test setup because Review remained blocked before document safety completion.
Task 6 test ruling: wait for the existing document preview state before opening Review, matching the established applicant browser journey. Cost if wrong: test may still fail before reaching the timeline assertion.
