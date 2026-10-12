# GitHub release integration — 12 October 2026

Lead: Charles Hangoma. Reviewer: Chitundu Milimbo. Human review remains pending.

The review branch and GitHub main developed independently. This integration preserves the existing governed result publication and amendment implementation, while bringing in compatible Phase 8 notification, incident, upload-quota, audit-timeline and accessibility work. It does not establish institutional policy approval.

## Resolution decisions

- Keep `PublicationService`, its current publication controller, immutable result lineage, step-up checks and student result view. The older alternate release and amendment implementation from main would reintroduce weaker parallel routes and obsolete records; its service methods and UI are excluded.
- Retain the standalone Phase 8 notification and operations modules. The imported legacy result-service notification fan-out is not claimed for governed publication; the owning result-notice workflow remains authoritative.
- Adapt entity timelines and isolated fixtures to `OfficialResultVersion` through `ResultRelease.packageId`, rather than restoring deleted `OfficialCourseResult` storage.
- Preserve the current login/discovery separation, student workspace shell and local fonts. Bring in compatible keyboard route-focus behaviour.
- Combine independently added authentication DTOs, notification configuration and browser fixture helpers. Add the upload-day quota field to the shared admissions policy contract and make integration unit doubles provide the incident-service dependency.
- Exclude obsolete root-level scratch database scripts from the deployed tree. No shared database reset, force push or rewritten approval record is part of this integration.

## Deployment evidence

Deployment must identify the exact pushed commit in both Vercel projects (`sis-moodle`, `sis-moodle-api`). A successful build alone does not migrate or populate the Neon demonstration database, provision Moodle, prove student workflows, or approve an operational release. Database migration and idempotent synthetic provisioning require separate guarded checks. No deleted Moodle token is reused.

Fresh validation results and exact commit/deployment identifiers are recorded below when available.

Initial integration verification (before the new foundation checkpoint): API unit tests **330 passed, 13 skipped**; script tests **19 passed**; source scan and API/web TypeScript checks passed. Initial compiler failures exposed the legacy result projection, quota contract and incident dependency mismatches above, which were corrected before the passing rerun. Connected Phase 8 checks run on the separately cloned `sis_setup003_test_2026101204` database; the retained review database is unchanged.
