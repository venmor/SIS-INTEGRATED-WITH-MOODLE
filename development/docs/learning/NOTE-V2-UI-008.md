# UI-008 — Structured entry and registration information

12 October 2026. Lead Charles Hangoma; reviewer Chitundu Milimbo. Human visual and accessibility acceptance remains pending.

## Decision and user behavior

Shell colour and icons alone did not address the user's difficulty reading and acting on information. This increment changes the arrangement of actual information in six routes: `/sign-in`, `/discover`, `/student`, `/student/courses`, `/student/readiness`, `/student/register`. It follows the Section 19 constitution, Section 12, cross-blueprint Part 2A and Student Blueprint 2 Parts 1/4; ADR-003 remains unchanged.

- Sign-in keeps the real credentials form first and provides a quieter, useful entry/support rail. Programme discovery remains a separate public route.
- Discovery gives three concise orientation stages above the existing server-backed search; these are guidance, not completion indicators.
- Student home adds decorative, labelled-route icons and an accessible progress element using the existing actual required-onboarding counts. No invented totals, deadlines, analytics or policy are introduced.
- Registration pages share location-only steps. Earlier steps are never marked complete merely because a later page was opened. Links preserve exact attempt/period context.
- Readiness shows the server's condition, next action and written state together. Responsible office and assessment remain keyboard-accessible in expandable detail.
- Course selection compares records in a searchable, sortable table with ten rows per page, mobile labelled records and retained selections across search/page changes. It operates only on the existing authorised inventory; it does not imply unrestricted institutional search. Capacity and unconfirmed-place information remain visible. Saved load/checks are explicitly last-saved until a successful response.
- Review and receipts use comparable course tables, including courses returned by the actual successful submission receipt. Known blockers, required declarations, current reviewed version and uncertainty recovery are preserved.

## Data, authorization and recovery

No API, schema, role, policy, audit or provider changes. Existing server authorization remains authoritative. No real records, downloads or dependencies were added. Existing draft saving and official submission are separate operations. Formal registration still requires authoritative server success; failed/lost responses keep the existing exact-command recovery path.

The source diff leaves `sign-in/form.tsx` unchanged so the independently reviewed safe-return-path repair can integrate without replacing it. No generated TypeScript configuration, local dependency symlink, screenshot or trace belongs in the source change.

## Verification

Commands executed in the isolated `feat/ui-information-design-20261012` checkout, using cached dependencies (local Node 26; deployment's pinned Node 24 verification is separate):

- Scoped web ESLint: zero errors/warnings.
- Whole web `tsc --noEmit -p tsconfig.json`: passed.
- Production Next webpack build with `SIS_NEXT_DIST_DIR=.next-ui008`: passed; final post-receipt build recorded before handoff.
- `node node_modules/@playwright/test/cli.js test --config tests/browser/registration-review.config.ts`: 12 tests passed. Actual Next components/proxy with owned loopback fixture, not a database or official registration write.
- Browser scenarios retain empty/blocked/approval-required/excessive-load denial, every declaration, exact context/version, failed status lookup, original-key retry, lost-response reconciliation and reload recovery. Added selection retention across paging/search/sort and location-step context.
- At 1440px and 390px, sign-in, empty discovery and readiness screenshots have no horizontal overflow. Readiness details open using keyboard Enter and expose the real fixture explanation; next-action links retain exact context. Source screenshots were visually inspected, including the visible focus outline and mobile stacking.
- `git diff --check`: passed.

Local screenshot evidence is under `.superpowers/sdd/2026-10-12-registration-review/browser-results/registration-review-entry--62828-etail-and-real-next-actions/` with `{sign-in,discover,readiness}-{1440,390}.png`. This evidence directory is local verification output, not release content.

## Honest remaining coverage

[Page-pattern coverage](../design/PAGE-PATTERNS-AND-COVERAGE.md) inventories all 89 base page routes and sequences the remaining screen families. Six changed routes do not mean 89 redesigned routes. Discovery populated/filtered states retain earlier implementation; this new browser fixture verifies its empty state. Student home progress is source/typechecked but not independently revalidated against a connected database in this increment. Screen-reader, high-zoom, slow-network and representative-user acceptance remain required; semantic markup and automated checks do not certify WCAG conformance.

Governed setup, applicant evidence/corrections, staff queues/decisions, finance, assessment, delivery/timetable and restricted support need further route-specific visual/state review. The generic academic-context selection gap is not solved by changing presentation. Human signoff and institutional operational acceptance are not invented.
