# Direct workspace entry — decision and verification

## Complete browser compatibility review — 17 October 2026

We ran all 162 browser cases on a fresh local database. The first run passed 155 and exposed seven older test assumptions: a chooser-heading assertion after direct admissions entry, a checkpoint account using an invalid `STUDENT:self` scope, a root-URL assertion, a collapsed mobile navigation link, a completed-readiness action that moved into the registration steps, another root-URL assertion for setup, and a login helper that started a second navigation while the intended timetable redirect was already underway. We corrected the positive-path test data and exact destination/interaction assertions without changing application access rules. All 18 tests across the seven affected browser files then passed on another fresh database, including outage/replay/reconciliation and independent timetable replacement with uncertain-response recovery. The fresh full CI rerun remains the release gate; these targeted results are not represented as an all-green 162-case run.

Date: 2026-10-15. [Task](../task-packets/TASK-V2-UI-012.md). Lead Charles Hangoma; reviewer Chitindu Milimbo. Implementation and verification in progress; human acceptance pending.

The user requested direct entry after login with deliberate switching in the sidebar. The former root chooser moves to `/workspaces`, retaining its grants, security/expiry controls and emergency warning. `/` uses the current `/auth/me` selection and a shared role/scope navigation resolver. Explicit safe local return destinations remain first. Destination loaders still enforce live authority.

The selected workspace is session state. Re-sign-in on the same device may retain only a validated presented session's same-account live ordinary assignment, before rotating its cookie. It does not borrow another account's assignment, including another account belonging to the same person. A new or expired session uses the existing deterministic ordinary default; no database preference or client-stored authority is introduced. Emergency access requires deliberate selection and remains visibly labelled.

The switch policy's own-session role list is aligned with existing application roles; target ownership/liveness, CSRF, rate limits and audit continue to govern the POST. This has no effect on grants or academic/financial permissions. Setup/timetable home routes use their existing source-owner permission checks.

Focused RED: the new role resolver's empty behavior failed student, lecturer, retained-selection and demo-source expectations; the existing return-target checker rejected `/notifications` and implemented finance routes. Focused GREEN: seven Node 24 tests passed after the resolver and return-target changes. The existing Node module-type warning remains; no dependency/package convention was changed to silence it.

API RED separately reproduced all three gaps: the preferred role reset to the first assignment, an emergency assignment became an automatic default, and actual `STUDENT` switching was denied. After correction and root's coordinated config rebuild, the focused workspace/policy/contract checks passed **21/21 across three files**. Existing Vitest's tsconfig-paths migration notice remains. Authentication and explicit workspace changes now perform a document navigation so cached pages from the previous account/role are discarded.

Both API and web TypeScript checks passed. Scoped web lint and `git diff --check` passed. Return-target regression also rejected a normalized traversal back to sign-in, and rejects repeated/non-string return destinations instead of throwing after authentication.

Connected API/browser results and complete checks are pending root coordination. No institutional approval, production readiness, commit, push or database reset is claimed.
