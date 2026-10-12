# GitHub release integration — 12 October 2026

Lead: Charles Hangoma. Reviewer: Chitundu Milimbo. Human review remains pending.

The review branch and GitHub main developed independently. This integration preserves the existing governed result publication and amendment implementation, while bringing in compatible Phase 8 notification, incident, upload-quota, audit-timeline and accessibility work. It does not establish institutional policy approval.

## Resolution decisions

- Keep `PublicationService`, its current publication controller, immutable result lineage, step-up checks and student result view. The older alternate release and amendment implementation from main would reintroduce weaker parallel routes and obsolete records; its service methods and UI are excluded.
- Retain the standalone Phase 8 notification and operations modules. Bridge the governed publication transaction to the notification owner: retain the authoritative ResultNotice and create mandatory, neutral in-system notices for active accounts belonging to each released student. Release/student/account deduplication preserves same-command replay. Missing templates or active recipients produce an explicit deferred audit, without pretending delivery succeeded or undoing the official record. Provider delivery remains queued.
- Adapt entity timelines and isolated fixtures to `OfficialResultVersion` through `ResultRelease.packageId`, rather than restoring deleted `OfficialCourseResult` storage.
- Preserve the current login/discovery separation, student workspace shell and local fonts. Bring in compatible keyboard route-focus behaviour.
- Combine independently added authentication DTOs, notification configuration and browser fixture helpers. Add the upload-day quota field to the shared admissions policy contract and make integration unit doubles provide the incident-service dependency.
- Exclude obsolete root-level scratch database scripts from the deployed tree. No shared database reset, force push or rewritten approval record is part of this integration.

## Deployment evidence

Deployment must identify the exact pushed commit in both Vercel projects (`sis-moodle`, `sis-moodle-api`). A successful build alone does not migrate or populate the Neon demonstration database, provision Moodle, prove student workflows, or approve an operational release. Database migration and idempotent synthetic provisioning require separate guarded checks. No deleted Moodle token is reused.

Fresh validation results and exact commit/deployment identifiers are recorded below when available.

Initial integration verification (before the new foundation checkpoint): API unit tests **330 passed, 13 skipped**; script tests **19 passed**; source scan and API/web TypeScript checks passed. Initial compiler failures exposed the legacy result projection, quota contract and incident dependency mismatches above, which were corrected before the passing rerun. Connected Phase 8 checks run on the separately cloned `sis_setup003_test_2026101204` database; the retained review database is unchanged.

The Vercel frontend failure was reproduced in the actual build log: ignored npm install scripts left Prisma Client ungenerated, causing `security-legacy.ts` to fail while building `@sis/config`. The versioned frontend build now generates client types first with an inert loopback build-only URL; it never connects to or migrates a database. The frontend receives no live database credential.

Governed release and independent replacement-package amendment notification regressions were rewritten against the canonical controller and proved RED (no inbox records), then GREEN with the transaction bridge. Legacy release endpoints remain unavailable. The ops incident regression now scopes its convergence assertion to its own notification delivery IDs, so preserved historical fixtures do not masquerade as duplicate incidents.

Final integration verification: 488 API unit tests passed (13 skipped), 23 script tests, 14 offline Moodle provisioning tests, 62 connected domain tests, whole API/web TypeScript and the production web build passed. API lint passed with 44 existing warnings. A final security review then exposed six entity-timeline scope leaks: foreign offering/period, unowned coordinator package, technical Moodle roles, and unassigned/out-of-intake admissions staff previously received HTTP 200. The timeline now follows canonical domain scope and claim rules; all 16 timeline tests pass after six meaningful RED failures. The allowed officer fixture has a real claimed case.

The additive conversion-integrity migration preserves historical migration records. A new isolated database clone had its offering foreign key and candidate composite uniqueness removed, then the repair was applied twice: both protections returned and existing programme attempts remained. The cloud database has an unresolved historical migration checksum mismatch; this source repair does not claim to recover the original bytes. Cloud backup, migration verification and guarded data provisioning remain separate from Git/Vercel build success. Moodle provisioning remains offline verified until a fresh private token and site role/category configuration exist.
