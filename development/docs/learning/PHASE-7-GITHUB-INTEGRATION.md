# Phase 7 GitHub integration review — 2026-10-04

This review branch merges `origin/main` into the Phase 7 review lineage. It does not merge into `main` or publish a release. The two branches independently implemented official result release and amendment after common ancestor `9ffed61`; their database and HTTP contracts cannot safely be combined by accepting both sets of files.

## Resolution

- Retain the review branch's assessment-owned `ResultRelease`, `OfficialResultVersion`, `ResultAmendment`, `ResultAcademicImpact` and `ResultNotice` model and migration `20260929090000_ph7_result_publication`. The GitHub branch's `OfficialCourseResult`, `ResultAmendmentCase` and `AcademicImpactTask` model and its two earlier migrations were not adopted. Running both would create two competing official result stores.
- Retain the review branch's `/assessment/packages/:id/release`, `/assessment/publications`, `/assessment/amendments`, and `/assessment/me/results` contracts and matching staff/student screens. The GitHub branch's `/assessment/releases`, `/assessment/results/mine` and incompatible amendment endpoints were not adopted.
- Retain the review branch's publication policy provider and fail-closed step-up port. The GitHub path derives PASS/FAIL from interim `ASSESSMENT-DEMO-v1` pass mark and does not require a verified, session/target/version-bound proof before release. The review implementation requires a complete policy snapshot, candidate/registration reconciliation, separation of duties, exact command version, and proof consumed inside the write transaction. With the production IAM verifier still absent, publication remains refused; synthetic tests may supply a verifier. This is a deliberate security gate, not Phase 7 institutional signoff.
- Keep the GitHub branch's removal of three tracked temporary database/server helper scripts. Its prior tests, task packets and learning notes remain accessible in Git history at `474ec0f` and `566ae64`, but are not current endpoint or completion evidence.

## Review and remaining proof

`git diff --check`, Prisma validation, builds, and relevant tests should be recorded at this integration head. The release/amendment browser journey and full regression suite still need a fresh isolated database run after the merge. Human role/policy approval, a real IAM publication step-up verifier, cloud Moodle, and institutional deployment remain outside this integration.
