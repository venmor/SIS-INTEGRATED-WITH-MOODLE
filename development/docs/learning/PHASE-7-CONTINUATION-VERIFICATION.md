# Phase7 continuation — implementation and verification

Date: 2026-10-01. Worktree: `.worktree/phase7-completion`, branch `review/phase7-completion`, baseline `9ffed61`. Lead: Chitundu Milimbo; reviewer: Charles Hangoma (human review pending). [Task/requirements](../task-packets/TASK-PH7-006-007.md), [authority gates](../gaps/GAP-PH7-CONTINUATION.md), [MVP audit](MVP-AUDIT-2026-09-30.md).

**Status: publication/student-result/amendment implementation verified in isolated tests; full Phase7 acceptance remains blocked on approved release policy, reviewed IAM step-up integration and the connected browser release story.** Neither the test verifier nor fictional test policy is installed in the application. Default providers deny publication.

## Behaviour and ownership

1. Examinations opens a period-scoped approved board package and reviews consequences/version. Publication requires explicit `release-results`, valid live session/assignment, an independent publisher, current complete approved inputs, candidate identities/official registrations, permitted release window/restrictions, exact declaration and verified step-up.
2. The transaction locks live authority, serializes the offering/period, validates the frozen canonical hash and source versions, holds registration eligibility, writes the immutable release and every student's result, safe notices, audit, outbox and command receipt. A failure rolls back the entire batch. Transport retries with the same key return the receipt; changed decisions conflict.
3. A converted student (`STUDENT`/`study`) reads their own published results through person/account ownership. The projection contains permitted marks/outcomes, publication date, version history, review instructions and explicit progression readiness. It omits peer data, board deliberations, internal correction reasons and calculation evidence.
4. Examinations requests an amendment using a new moderated/approved replacement package with reason/evidence. A separate authorized officer approves it. Old results remain immutable; the successor links to them. Eight downstream domains receive durable review-required records. Assessment does not calculate progression or directly edit finance, registration, credentials or Moodle.
5. Staff queues paginate; direct amendment detail checks period authority independently of queue truncation. The UI preserves command payload/key after ambiguous responses and supports same-request retry. Student history is keyboard operable and readable at390px.

## Traceability and changed files

| Requirement boundary | Implementation | Proof |
|---|---|---|
| DS5/lecturer result validation and reproducibility | `assessment.service.ts`, `package-integrity.ts` | `grade-publication`, existing plan/staging/validation/moderation/board suites |
| DS5 publication + DS10 high-impact authorization | `publication.service.ts`, `publication-ports.ts`, DTO/controller/module | `result-release`, actual default-policy/default-verifier denials in `grade-publication` |
| Student016 own official results | `studentResults`, contract, `/student/results`, navigation | owned/masked API projection; browser owned-history/stranger denial |
| Lecturer022 governed amendment/history/impacts | release/version/amendment/impact/notice models and SQL migration | distinct concurrent approvers, predecessor preservation, review-required state and SQL mutation denial |
| UI-DECISION-001/recovery/accessibility | release/amendment review pages, forms, no-store loader/proxy | browser consequence/gate, malformed-response same-key retry, keyboard/mobile/no overflow |
| Scope/atomicity/idempotency | grant/session/target checks, row/advisory locks, receipt/outbox | revoked/wrong-period/role, stale/hash/window/conditions, rollback, replay, conflicting payload and concurrent actors |

API additions: `POST /assessment/packages/:id/release`, `POST /assessment/amendments`, `POST /assessment/amendments/:id/approve`, `GET /assessment/publications` with release/amendment cursors, `GET /assessment/amendments/:id`, `GET /assessment/me/results`. All writes retain session/CSRF guards and same-origin proxy controls. No student-ID selector, raw-mark editing or export endpoint was added.

Schema migration: `20260929090000_ph7_result_publication`. Adds five assessment-owned models and append-only SQL triggers. Replaces the package's mutable-version uniqueness index with an ordinary scope index; assembly/publication serialize the scope. Legacy packages without complete frozen references cannot publish and need reassembly/reapproval. Original approved handbook records were not edited.

## Environment and reproducible commands

Pinned Node24.21.0; own npm dependencies installed in the review worktree. PostgreSQL18-alpine runs only in Docker container `sis-phase7-review`, bound to local port55437, using fictional credentials and explicitly named review databases. No primary/shared database was reset. Embedded PostgreSQL could not load the host's required ICU library, so the isolated Docker alternative was used.

Existing slices were each run against a new `sis_ph7_<suite>_v2_review` database after `prisma migrate deploy` and the guarded fictional seed. The first unseeded attempt failed fixture setup with no tests executed; seeded reruns below passed. The corrected migration applied from scratch in each database. The initial unreleased migration index-name mismatch was corrected before fresh migration runs; do not treat an edited migration as safe for an already-applied institutional database.

From `development/`, with pinned Node on PATH and the isolated DATABASE_URL supplied:

```sh
node scripts/with-env.mjs prisma migrate deploy
ALLOW_DEMO_SEED=true node scripts/with-env.mjs node prisma/seed/seed.ts
node scripts/with-env.mjs npm run test:e2e --workspace=api -- --no-file-parallelism test/assessment-plan.e2e-spec.ts
# Repeat on a separate fresh/seeded DB for grade-staging, grade-validation,
# grade-moderation and grade-board.
node scripts/with-env.mjs npm run test:e2e --workspace=api -- --no-file-parallelism test/result-release.e2e-spec.ts test/grade-publication.e2e-spec.ts
npm test
npm run test:scripts
npm run build
npm run typecheck
npm run lint
npm run scan
```

Targeted browser config `playwright.phase7.config.ts` uses dedicated web3146/API3147 ports and refuses server reuse. Supply `BROWSER_BASE_URL=http://127.0.0.1:3146`, `API_INTERNAL_URL=http://127.0.0.1:3147`, `PORT=3147`, and an isolated database to `node scripts/with-env.mjs playwright test --config playwright.phase7.config.ts`. Complete the build first: a rerun started during a rebuild failed before tests because the output directory was temporarily absent; the subsequent sequential run uses the completed build.

Local raw logs are ignored under `development/.evidence/phase7/`; Playwright traces/screenshots are under ignored `test-results/`. This document preserves the results for review without committing machine-specific logs or credentials.

## Fresh evidence

| Check | Result | Limit |
|---|---|---|
| Existing assessment API suites | 80/80 (20 plans,18 staging,13 validation,14 moderation,15 board) | Fresh isolated demo databases; not institutional approval |
| Continuation API suites | 17/17 (13 publication/amendment,4 prerequisites) | Real HTTP/PostgreSQL; controlled test ports only for allowed publication |
| Unit suites | 73/73 across16 files | Baseline-wide unit check, not complete API regression |
| Script tests | 6/6 | Does not replace actual backup/restore rehearsal |
| Build and typecheck | Passed | Local pinned toolchain; no remote CI run |
| Lint | Passed with pre-existing API warnings; no new publication/test warnings | Existing warnings remain listed for integration review |
| Source scan and diff whitespace | Passed | Not a substitute for independent security review |
| Browser projection/gate/recovery | 3/3 | See the strict scope below; no actual successful MFA browser publication claimed |
| Plan format | Required sections present,71 task rows,114 unique declared IDs, no duplicate declarations | Proposed backlog; policy/ADR/human gates remain |

Browser fixture1 inserts fictional published records to verify real server projection, own-history/stranger isolation, visible review state, keyboard history and mobile layout. Fixture2 exercises the real default-policy denial from the release review page and proves no release was created. Fixture3 injects a malformed response at the browser transport boundary and checks the retry submits the identical payload and key. These do not substitute for TASK-004's connected Moodle→MFA→release→amendment story.

Database failure proof injects an isolated notice constraint during a two-candidate batch; release/results/receipt/package state roll back and same-key retry succeeds once the fault is removed. Pending-notification tests prove publication is independent of a pending outbox, **not** that a failing real delivery consumer was exercised. That consumer remains an integration/hardening obligation.

## Independent review and corrections

The read-only review requested changes for racing inputs, stranded uncertain amendment retry, truncation hiding old amendments, incorrect DELETE trigger return and incomplete tests. Corrections now share offering locks across candidate/plan/moderation writers, hold registration rows, recover malformed responses, paginate/direct-load scoped records and return OLD for permitted DELETE. Tests cover distinct concurrent amendment officers, coordinated eligibility/candidate changes, >100 releases, revoked grants, hidden marks, dual-role preparer/marker denial, real default-port refusal and late transaction rollback. Red runs reproduced the delete/detail defects and the real conversion-role mismatch before fixes. The review did not certify pending IAM, institutional policy, provider delivery or human acceptance.

## Explicit remaining gates

- IAM adapter and UI step-up: single-use verified proof, expiry/action/target/version/session binding and rollback under the actual authentication service.
- Approved publication configuration, scope/appointment registry, course/period mapping, restrictions and review route (GAP-022).
- Actual notification delivery/recovery and durable operations escalation; downstream impact consumers/acknowledgements and policy-based recalculation.
- Full integrated API/browser regression after OpenCode changes, remote CI, actual provider sandbox evidence, backup/restore/rollback/load, manual screen-reader and Windows/WSL rehearsal.
- Both developers' human walkthrough and approval. This agent made no commit, merge, push, release tag or deployment. OpenCode independently advanced primary main from `01a53ba` to `b9fa96d`; the final audit records that new integration baseline and the remaining untracked browser-findings file.

The [MVP audit](MVP-AUDIT-2026-09-30.md) and [expanded implementation plan](../../plan/feature-sis-expansion-2.0.md) carry these obligations forward, including full timetable/exam management, student support and student-facing AI.

## Integrated review checkpoint — 2026-10-01

The review branch subsequently merged OpenCode's `b9fa96d` at `eef552e`; primary `main` remains untouched. On the merged checkout, 55 migrations and seed data applied to fresh PostgreSQL review databases. The production web build, API/web typecheck, lint, 307 passing unit tests (13 skipped), eight script tests, and the complete browser suite (44/44) passed. Focused PostgreSQL API suites passed for applicants, catalogue, IAM scope/policy/review, grade staging/validation/moderation/board, integration sync, and finance governance (20/20 with real TOTP challenges). The browser suite covers applicant/admissions and Moodle recovery; it still does not prove a successful institutional result release.

The latest broad API run on one shared review database remained red at 457 passed/9 failed before the finance test correction: three finance proof failures, three integration-sync failures, one global shell-count assertion, and two review queue visibility assertions. The focused finance suite is now green, but the broad shared run has not been repeated. The integration worker can attempt failure-state writes inside an aborted PostgreSQL transaction (`25P02`), and queue tests reveal the bounded first-page visibility issue. These are release blockers, not accepted deferrals. The finance adjustment page now requests the matching challenge for approval, but staff MFA enrollment and that browser approval journey still need proof. Publication still refuses with the default policy and verifier; GAP-022 and the stronger IAM proof contract remain open.

After the request to create the missing policy, [a decision draft](../policies/RESULT-PUBLICATION-POLICY-DRAFT.md) and versioned fictional profile were added. Two policy-boundary unit tests pass: the profile refuses without explicit opt-in, on a remote/non-review database, or for the wrong course/period. The existing PostgreSQL publication-prerequisite suite passes 4/4 with default denial, confirming the profile did not silently open the release endpoint. The mapping suite's shell-count assertion now scopes itself to its offering/period and passes 12/12 on the connected review database. Institutional policy approval, bound MFA proof and the connected successful-release browser journey remain outstanding.
