# Moodle Access Search-First Workbench

Date: 2026-10-23. Status: approved visual direction A; implemented in the Moodle access staff workflow. This does not approve MoodleCloud writes or change institutional policy.

## Problem

The access page loads a scoped result list, but its four always-visible filters make routine lookup feel manual. Results only have per-course checkboxes, so there is no convenient student-level selection. Any non-null prior Moodle request state disables a course checkbox without explaining the reason. The page can show `Connection HEALTHY` while using the simulator, which is easy to mistake for a MoodleCloud connection.

## Approved direction

Use a search-first workbench with one prominent name-or-student-number search, an explicit search action, and a quick way to browse the active students already visible in the user's server-enforced scope. Keep period, course and Moodle-access filters available but visually secondary (collapsed or compact). Retain bounded result counts and cursor-based “Load more” behavior. Do not add client-side unrestricted student loading or invent new filters/options that the API cannot support.

Each student row gets a parent checkbox that selects or clears that student's eligible registered courses. Individual course checkboxes remain available. The parent checkbox reflects none, partial (indeterminate), or all eligible courses selected. Selection state remains keyed by student and course registration, so bulk requests cannot detach a course from its student. The assignment summary stays visible and reports the number of course assignments, with a reviewable list before submission.

Courses with a prior request state remain unavailable for a new request until a governed retry/recovery path exists; do not bypass this guard in the UI. Explain the status next to the disabled control. In simulator mode, describe the row state as a simulator request state, not proof that MoodleCloud received or enrolled anyone. Do not treat `FAILED`, `WAITING`, or other states as permission to duplicate a request.

## Connection status and authority

The status banner distinguishes the active backend and destination: `Simulator active — not connected to MoodleCloud` when the health response says `simulator`; live/test wording follows the existing backend and readiness response. Keep connection identity/health separate from write readiness. Link to the existing Moodle connection setup page for authorized setup. This UI change does not alter the configured mode, call Moodle, expose a token, or enable live writes. Existing write-readiness and server-side scope/capability checks remain authoritative.

## Data flow and failure behavior

The browser continues using `GET /api/moodle/provision/students/search` with the existing query, period, course, access, cursor and limit parameters. Search remains server-scoped and paginated. Search failures retain a clear message and do not erase a user's request history. Changing search criteria clears prior result selection to avoid accidental cross-query batches. Parent selection only considers active registered courses with no prior Moodle provisioning state. The existing `POST /api/moodle/provision` payload and idempotency behavior remain unchanged.

## Validation

- Search by partial name and student number; browse the first scoped page and load another page.
- Verify zero, partial and full student selection; selecting one student queues only that student's eligible course registrations.
- Verify delivered and other prior-request courses are visibly unavailable, with simulator state not described as MoodleCloud delivery.
- Verify changing the search clears selection and search errors do not submit stale results.
- Verify simulator health is explicitly not a MoodleCloud connection and live-write readiness remains independently visible.
- Preserve keyboard operation, checkbox labels, native indeterminate accessibility state, responsive layout and server-side scope/capability denial behavior.

## Out of scope

No live MoodleCloud provisioning, remote API changes, retry/reconciliation policy, new search API, database migration, token handling, production approval or broad visual redesign. Existing uncommitted changes in the worktree must be preserved and incorporated rather than replaced.

## Implementation evidence

The access UI now has a primary name/student-number search, a scoped active-student browse/reset action, and secondary existing filters. Student-level selection exposes none/partial/all states and selects only eligible registered courses. Prior Moodle request states remain disabled and explain the simulator limitation. The page labels simulator mode as not connected to MoodleCloud and continues to display separate write readiness.

Verification on 2026-10-23: `npm run build --workspace=web`, `npx tsc --noEmit -p apps/web/tsconfig.json`, and `node scripts/with-env.mjs npx playwright test --config=playwright.moodle-ui.config.ts` passed. The browser suite is explicitly UI-fixture coverage and makes no MoodleCloud or database claim.