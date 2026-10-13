# Release integration checks — 2026-10-13

PR 17's connected API suites passed at commit `4f4e62f`; the following browser job failed. The failure report is retained privately. These changes address the observed causes without weakening server permissions or skipping the affected journeys.

- Student fixtures now return their real account ID for account-addressed notification records and bind the STUDENT appointment to their own student ID. Previously the recipient ID was omitted from JSON and every student appointment referred to a different hardcoded student number; server refusals were correct.
- Sign-in help links use the existing darker link token. Measured contrast against the tinted panel improves from 4.334:1 to 6.629:1; the contrast script suite passes 11 tests.
- CI explicitly enables the synthetic institution setup seed. Setup-history tests create the needed immutable drafts through authenticated commands rather than expecting retained developer history.
- The connected browser setup prepares the existing synthetic timetable scenario against the isolated browser database/API. Navigation uses Playwright's configured origin and discovers the student's actual context instead of a historical attempt UUID. The isolated deferral rendering suite is run through its dedicated configuration, with the new context projection supplied explicitly.
- Support and board-decision tests confirm a successful command response and persisted state after reload. Their transient confirmation disappeared when the refreshed page replaced the completed form.
- The package detail page restores the existing staff-authorized timeline endpoint, including decisions, official versions and audit rows. The API remains responsible for field disclosure and role/scope checks. Unknown history is shown as unavailable, and the latest-100 bound is explicit.
- Simulator-shell expectations match the existing labelled heading. The deferral course-receipt assertion now checks the structured table row introduced by the registration UI, retaining the course-code/title checks.

Local evidence: full lint passes with existing warnings; API/web production build and no-emit typechecks pass; source scan and all 36 script tests pass; default Playwright collection succeeds (127 tests). The isolated deferral run passed 24 of 26; its two remaining failures were the obsolete list-item selector. Both affected cases passed on the targeted rerun after switching to the actual table row. Fourteen Moodle administrative-tool tests pass. `git diff --check` passes.

Complete connected browser CI on the final combined commit is still required. No human acceptance, production signoff, successful automatic Moodle delivery, or completed release merge is inferred from these checks. Existing generated Next output and private credentials/receipts are excluded from the commit.
