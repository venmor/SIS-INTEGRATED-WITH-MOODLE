# UI-013 — Student study workflow presentation and verification

16 October 2026. Lead Charles Hangoma; reviewer Chitindu Milimbo. Implementation remains reviewable in `feat/v2-student-presentation-and-core-20261015`; no commit, push, shared database change or human signoff was performed.

## Behaviour and source boundary

The course page preserves the existing required/elective inventories, search/sort/paging, selected-code state and draft-save request. A source-backed summary distinguishes the current course count, unsaved choices, last server-confirmed load and saved version. Saved checks stay explicitly attached to the saved draft. Failed saves preserve the current selection and last confirmed load; saving does not establish official registration. Read-only plans use the existing responsive course summary.

Registration groups the saved course list, version/load facts, actionable course checks and required declarations. It explains why submit is disabled and links to the same attempt/period's plan and readiness. The original submission, storage scope, declaration payload, idempotency key, status lookup, navigation guard and uncertain-result replay handlers are unchanged. A shared student-local receipt component presents the same authoritative receipt after submission, status recovery and later visits: reference, CAT timestamp, period, course count, registered load, clearance at registration and official course table. Its timetable link takes the receipt's academic context. No unsupported download action is offered. Moodle preparation remains a separate status on later visits and does not cancel registration.

Official results remain server-loaded from `/assessment/me/results` with no-store ownership enforcement. Local search, released-period choice and publication/code/title ordering operate only on that authorised projection; ten results render per page. Filtering resets the visible page and retains the selected filters while paging. No-match, no released results and unavailable service states remain distinct. Each result preserves policy-suppressed marks, published current version, review instructions, expandable published history, amendment-impact explanation and the separation of result outcomes from progression decisions and Moodle feedback. This bounds rendering, not the server response size; backend pagination remains outside this increment.

The course/register server loaders also preserve Next's existing expired-session redirect after an upstream 401. Previously their catch blocks absorbed that control flow and rendered unavailable instead of sign-in. Three failing-first browser cases cover the course-plan read, registration-plan read and registration-status read, each retaining the exact intended academic return context. The fix matches the existing result loader's redirect-digest rethrow; actual service failures retain the existing unavailable response. The controller explicitly included this repair in the owned workflow scope.

All new presentation uses existing semantic tokens, CSS Modules and task/table/status controls. The student-local mobile caption rule fixes a visually confirmed 10px-wide table caption without changing the shared course component. Account/shell, home, readiness, context inventory, contracts, API, schema, policy and supervisor artifacts are outside this edit set.

## Authority and tests

TASK-V2-UI-013 traces to UI-008/UI-011, exact Student Blueprint 2 Parts 1/3/4/5 (records 012/014/015/016), exact UI Constitution Section 19 Part 1 and cross-blueprint Part 2A. Later security/privacy/official-record requirements remain controlling. Existing demo load/declaration policy is reused, not promoted to institutional approval.

The new `student-study-workflows.spec.ts` uses actual Next pages and proxies against an owned synthetic loopback API on 3184/3185. The first four checks failed before implementation on missing summary, grouped checks, structured receipt and bounded results. Visual inspection then found the collapsed mobile caption; its new regression failed at 10px before the local CSS correction. All three expired-session tests also failed at their expected destination assertion before the loader correction. Final evidence:

| Check                                                                                                     | Result              |
| --------------------------------------------------------------------------------------------------------- | ------------------- |
| `node node_modules/@playwright/test/cli.js test --config=tests/browser/student-study-workflows.config.ts` | **12 passed**, 1.2m |
| `node node_modules/@playwright/test/cli.js test --config=tests/browser/registration-review.config.ts`     | **12 passed**, 2.3m |
| Web ESLint over `app/student/courses app/student/register app/student/results`                            | Passed              |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/web/tsconfig.json`             | Passed              |
| `git diff --check`                                                                                        | Passed              |

An intermediate simultaneous development run failed in Next's manifest loader (`loadManifest` → `JSON.parse`: unexpected end of JSON input) and a following navigation timed out while live source edits were occurring. The final stable-source, single-suite rerun passed all twelve checks; the existing recovery suite separately re-passed all twelve after the loader fix. No production error handler or automatic test retry was added to conceal the development failure.

Commands used the installed Node 24.21.0 binary. No dependency download or shared Next build ran. The fixture process's generated study-output type includes were removed from `tsconfig.json` after verification; no intended configuration diff remains. The existing registration-review suite needed only two presentation-selector updates for structured load and selection facts.

The twelve new checks cover cross-page course choices, unsaved/saved load, failed saves, blocking validation/edit links, required declarations, fresh and revisited receipt context/date/count, unknown registration status, all three expired-session redirects with exact return context, exact same-command replay after status checking, ten-record results traversal, period/search/sort/reset, keyboard history expansion, policy-suppressed marks, amendment review, empty/unavailable distinctions, 390px overflow and readable table captions. Axe found zero WCAG 2 A/AA and 2.1 AA violations in each route's main landmark. The existing twelve checks also passed lost-success-response recovery, uncertain submission across reload, configured load and approval blocks, exact reviewed version/declaration payload, course search/sort/paging, exact academic links and entry/readiness keyboard reflow.

Desktop 1440px and mobile 390px screenshots live under `.superpowers/student-study-workflows/results/student-study-workflows-st-dc038-orkflow-scrolling-on-mobile/`. Courses desktop/mobile, registration mobile after the caption fix, and results desktop/mobile were visually inspected. These are synthetic rendering artifacts, not institutional acceptance evidence.

## Remaining verification and gaps

Root owns the coordinated Next/API build, connected database/browser journey, full release regression, final preview screenshots and review. This isolated suite does not prove real authentication, registration ownership/deny enforcement, institution policy, Moodle delivery, load capacity or human acceptance. The two existing `student-portal.spec.ts` prose assertions for last saved load and receipt must use the new structured regions during the connected run; the controller was notified because that file already contains another owned change.

Full institutional readiness and release gates remain pending.


## Final regression follow-up — 17 October 2026

We passed all 162 cases in the complete GitHub browser suite. Its separate 26-case Moodle-deferral suite then exposed two older assertions expecting the registration reference inside the success notice. We kept the completion notice check and asserted the exact reference in the new named registration-receipt region, preserving the no-second-registration and deferred-access checks. All 26 deferral cases passed afterward. The standard backup/restore rehearsal also passed on a separately created clean seeded database with all 79 migrations: row counts, relationship checks, document hashes and schema coverage reconciled. Fresh full CI on the final test-only correction remains the release gate; no provider action or production access rule changed.
