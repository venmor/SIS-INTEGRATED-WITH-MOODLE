# Phase 7 and OpenCode integration review (2026-10-01)

## Branches and scope

- `origin/main` was fetched at `9ffed61`. OpenCode's local `main` ended at `b9fa96d` with seven local commits after the common ancestor. These are local commits, not a GitHub pull. The primary checkout also contains an untracked `BROWSER-TEST-REMAINING-ISSUES.md`; this review did not edit or stage it.
- Phase 7 continuation was committed as `b2ceefc` on `review/phase7-completion`, based on `origin/main`. The local `main` was merged into that separate worktree. Text conflicts in `packages/config/src/index.ts` and `prisma/schema.prisma` were resolved by retaining both Phase 7 assessment and OpenCode IAM/integration models and exports.
- No merge to `main` or push to GitHub was performed. The review worktree remains the integration candidate.

## Why the remaining work stopped

OpenCode's untracked browser findings cite ClamAV health and API startup. The Docker health check did use `clamdscan --ping` without its required attempt argument; `clamdscan --ping 1` returned `PONG` against the running daemon. The scanner also initiated a ClamAV connection in its constructor even with `APPLICATION_SCANNER=demo-fixtures`, so a demo API could encounter an unhandled background connection failure. Both are corrected in this integration candidate. Neither finding established that all browser journeys or all handbook requirements passed.

The new browser diagnostic test used a client-controlled `x-playwright-test` header to skip origin validation and signed in through the API. That header bypass was removed and covered by a negative test. The duplicate diagnostic browser test was removed; the existing applicant browser journey exercises the real sign-in form. The broad webpack Node-module fallbacks were removed after isolating the server-only security migration export from the browser config barrel. Production CSP no longer permits `unsafe-eval`; development still allows it for the webpack development server.

## Additional integration corrections

- MFA enrollment now checks the code against the submitted secret before an enrollment exists. Backup-code input is normalized to match the stored formatted hashes.
- Finance step-up now checks the challenge action and consumes it with a conditional single-row update. Full session and individual adjustment binding remain a separate security gate; current step-up must not be described as institutionally complete.
- The incoming “production” admissions policy contains TODO values requiring owner approval. Both application-policy providers now refuse non-demo selection pending approval; production operation is gated instead of silently using those values.
- The new `OutboxDeliveryWorker` was removed from module providers because it only called the existing Moodle worker a second time. The notification handlers are not yet wired to a separate delivery loop. Task 1.6 notification delivery remains incomplete.
- Incoming test TypeScript errors (private field access, outdated MinIO metadata field, PDF catalog API, invalid Vitest imports) were corrected.

## Verification and limits

The combined schema applied all six incoming migrations to the isolated `sis_phase7_review` PostgreSQL database on port 55437; Prisma validate passed. The production web build passed without webpack fallbacks. Unit tests passed (307 passed, 13 skipped); script tests passed (7); typecheck and lint passed after test-source corrections. API E2E remains red, including a single-worker rerun. A representative finance setup request expected 201 but received 409 because it selects the seeded `2026S1` offering with a fixed deadline of 2026-09-30 23:59 CAT, now elapsed. After advancing the deadline **only in the isolated review database**, that case reached upload and received 503 because no object-storage service was running. Pulling both `minio/minio:latest` and `quay.io/minio/minio:latest` failed (access denied and 401, respectively), so the compose image is currently not reproducible. The upstream [MinIO repository](https://github.com/minio/minio) says precompiled community binaries are no longer provided. Select, approve, pin, and test a maintained object-storage distribution before claiming deployment readiness. One focused applicant draft test passed, but tests relying on the expired fictional offering and storage cannot establish current behavior. Rework the isolated test offering/time fixture without changing the institutional deadline rule. Browser and external-service evidence remain outstanding. A green unit/build result does not establish MVP operational acceptance or human design signoff.

See [Phase 7 verification](PHASE-7-CONTINUATION-VERIFICATION.md), [MVP audit](MVP-AUDIT-2026-09-30.md), and [product roadmap](../roadmap/PRODUCT-ROADMAP.md). The roadmap includes timetable, examinations, student support, and student AI as later governed slices, not as implemented MVP behavior.
