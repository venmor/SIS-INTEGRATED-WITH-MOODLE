# Review of the earlier slices — 2026-09-19

This review compares the existing code and tests with the roadmap, task packets and active exact blueprints. “Implemented” below means a bounded demonstration exists. It does not replace peer review, WSL reproduction or production approval.

## Slice-by-slice findings

| Earlier slice | Existing implementation reviewed | Repair or remaining gate |
|---|---|---|
| Phase 0.1 repository/instructions | Application boundaries, AGENTS, design index, task packets | Replaced obsolete “no runnable application” statement; indexed all handbook files and active evidence |
| Phase 0.2 toolchain/data | Node 24.21.0, npm lockfile, Compose/PostgreSQL 18, seed/reset | Final checks use pinned Node; isolated PostgreSQL was used because Docker was stopped. WSL/Compose replay remains human work |
| Phase 0.3 web/API shells | Next/Nest modules, shared packages, Prisma | Full API test type-check repairs; UI layout type made independent of generated Next globals |
| Phase 0.4 UI foundation | CSS tokens, accessible field/error/action components | Reused components; replaced invalid internal anchor; dates now include year and CAT; manual screen-reader review remains pending |
| Phase 0.5 CI/templates | Existing workflow and source scans | Workflow placed at Git root so GitHub can discover it; scans now fail on findings; browser/type checks included. Remote CI and branch protection not claimed |
| Phase 1.1 identity model | Person, account, roles, credentials, sessions, synthetic seed | Live suspended-account status enforced on each session use; fictional applicant contact is explicitly seeded, not actually verified |
| Phase 1.2 sessions/recovery | Sign-in/out, token recovery, cookie flags, rate limits | Web proxy checks browser Origin before adding trusted API CSRF marker. MFA/registration/real contact verification are still incomplete |
| Phase 1.3 role/workspace | Scoped grants, deliberate switch, effective dates | Reject future/expired/revoked/disabled approver assignments and ordinary use of emergency authority; scope hierarchy/approval ownership gaps remain |
| Phase 1.4 authorization | Policy engine, denial, segregation checks | Administration requires the selected live workspace rather than borrowing another held role; separate identity and business authority remains essential |
| Phase 1.5 audit/expiry/review | Scheduled expiry, review, reinstatement, break-glass, audit/configuration | Configuration snapshot now really persists with audit and route is reachable; unsafe backup scratch deletion and credential-bearing failure output repaired; missing ledger row added |
| Phase 2.1 discovery | Catalogue, compare, rule versions, eligibility guidance | Fresh migration duplicate-key failure fixed; public discovery now connects through sign-in to deliberate draft creation; no eligibility result becomes an admission decision |

## Repairs explained without code jargon

- **A suspended account must stop working immediately.** Checking account status only at sign-in left an existing session usable. Session validation now reads the current account state.
- **The selected role matters.** A lecturer who also holds Dean authority must deliberately switch first. Administrative services now validate the selected, live assignment. The review tests prove lecturer denial followed by an explicit Dean switch.
- **A successful message must mean something was saved.** Creating a configuration version previously returned success without storing one. It now creates a snapshot and audit in one transaction; the `/versions` route is resolved before the general `/:key` route.
- **A browser proxy must not manufacture trust for another website.** Auth/application mutations now validate Origin/Host before forwarding the CSRF marker. The regression also covers local host normalization by Next.js.
- **A check must fail when it finds a problem.** The source scan now returns a failing exit code for prohibited patterns and for scanner errors. CI is in the location GitHub actually reads.
- **A restore exercise must not erase someone else's database.** Backup testing creates its own randomly named scratch database, never drops an existing one to make room, and only cleans up a database it successfully created. Passwords are passed through PostgreSQL environment variables and excluded from failure messages.
- **A fresh installation must work.** Two earlier migrations both inserted `catalogue.guidanceSessionTtlHours`. The second now uses `ON CONFLICT ("key") DO NOTHING`; existing configured values are preserved. See the migration caution below.

## Documentation corrections

Historical gap records are retained, with dated addenda where code now exists. The Phase 1 slice 5 packet had duplicated outcome/architecture sections and named `node-cron` although the implementation uses the Nest scheduler. The packet now names the actual implementation. Rotation records retain past assignments and mark proposed new learning responsibilities, without inventing completed reviews.

## What is still missing

[GAP-015](../gaps/GAP-015-applicant-production-and-prior-phase-gates.md) consolidates the current boundary. Existing GAP-001–014 remain relevant where unresolved: delegated authority, session-switch concurrency rules, capability/scope registries, HR evidence/training checks, approver containment, notification delivery, operations workflows, suspicious recovery and some review decisions. Configuration values and the seed's role mappings are fictional. Do not deploy this as a production IAM system or describe all Phase 1 requirements as completed.

The original `TASK-PH1-002a` deliberately deferred MFA to 2b. There is no completed 2b packet here. The applicant account-creation and actual verification journey is not implemented by setting `emailVerifiedAt` on a demo person. Both remain named work, with provider/verification decisions required.

## Migration and rollback care

The duplicate-key repair edits the existing `20260918210000_ph2_slice1_catalogue_ttl` SQL. This makes a fresh migration chain work, but an installation that already applied that file may report a checksum difference. Compare its migration history and original SQL before any deployment; do not reset the database, blindly mark migrations applied, or rewrite `_prisma_migrations`. The local review only used isolated fictional databases.

The new admissions migration is additive and protects submitted snapshots against UPDATE/DELETE. The code baseline before these changes is commit `67b02d4`; once the changes are integrated, returning to `main` is no longer a rollback. Use a separate checkout of that baseline for an older-code comparison, with its own compatible fictional database. Preserve review data and migration history; no automatic down-migration or destructive shared database rollback is supplied.

## Evidence

Use [VERIFICATION.md](VERIFICATION.md) for final commands, counts and limitations. Earlier historical counts in task packets describe their original runs. The current prior API suite contains 67 tests, including the repaired active-workspace review scenarios. The independent Superpowers review checked the code; it is separate from the still-pending Charles/Chitindu review.
