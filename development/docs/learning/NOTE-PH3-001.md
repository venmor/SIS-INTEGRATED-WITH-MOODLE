# Learning Note — TASK-PH3-001 (assigned admissions queue and filters)

- Lead developer: Charles Hangoma (proposed; TASK-PH3-001 line 5)
- Reviewer: Chitindu Milimbo (proposed)
- Date/release: 2026-09-21 / v0.4.0 track Phase 3 slice 1
- Branch: local `main`, commit `e44170a` (“Implemented phase 2 slice 6 and phase 3 slice 1 and 2”)

## What we built and why

Admissions staff see an assigned work queue: only applications assigned to them plus a claimable pool, each row showing reference, current state, age, what is needed next, and conflict flags — never another officer’s cases, never applicant PII beyond minimum. Staff can claim from the pool and release back. Applicant records are never modified from the queue. Owning module `admissions` (`review` area). Commands: ClaimReviewCase, ReleaseReviewCase. Only authenticated live `ADMISSIONS_OFFICER` workspace; assignment + intake scope authorize access.

Controlling: roadmap `05-phase-3-admissions-review-and-offer.md` slice 1; Journey A; Design Section 6 §§4–7; REQ-ADM-005/006, REQ-IAM-002/003/004, ACT-ADM-001/002, permission §15.4; segregation of duties; UI constitution; security/privacy/idempotency/recovery. Demo roles/scopes interim until GAP-004; sim endpoints stay SYSADMIN-gated (GAP-017); no delivery provider, pollable inbox only (GAP-008/009).

## Frontend explanation

- `apps/web/app/admin/admissions/queue/page.tsx`: SSR loads `?scope=mine` + `?scope=pool&state=Submitted` via `API_INTERNAL_URL` + `sid` cookie; 401/403 → “Restricted area”; lede “never modified”.
- `queue/queue.tsx`: `postReview(/api/review…)` + `supportReference`; Claim/Release `aria-labels`; claim/release send `version + fresh UUID key`; My cases/Claimable pool toggle, Refresh, hasMore, empty states.
- `app/api/review/[[...path]]/route.ts`: same-origin proxy; reads `queue|queue/{uuid}|{uuid}/evidence|{uuid}/findings`; writes `{uuid}/(claim|release|findings|clarifications)|corrections/{uuid}/decide`; else 404; `isSameOriginMutation` 403; forwards `sid` + `x-requested-with`; 25s timeout; `no-store`; 503 neutral.

## Backend/domain explanation

- `apps/api/src/admissions/review.service.ts`: reviewer-scoped idempotent `command()` (account `FOR UPDATE` lock, `ApplicationCommand` by key, sha256 digest, mismatch → `IDEMPOTENCY_CONFLICT`); `claim()`/`release()`; `gate()` officer `review-assigned` write vs approver `decide-offer` read-only; `inScope()` fail-closed `INTAKE` prefix interim (GAP-004); `checkVersion()` → `VERSION_CONFLICT`; neutral 404s for unclaimed/other-claim/out-of-scope/unknown; `ASSIGNMENT_CONFLICT` + P2002 race backstop (role only, no email leak); `NOT_CLAIMABLE`, `NOT_SUBMITTED`, `SERVICE_UNAVAILABLE`; `audit()` with policy version + idempotency ref + purpose.
- `review.controller.ts`: `@Controller('review')`, `SessionGuard + ApplicationRateGuard`, CSRF on POSTs; `GET queue`, `GET queue/:id`, `POST :id/claim`, `POST :id/release`, plus evidence/findings/clarifications/decide routes (slice 2).
- `dto.ts`: `ClaimReviewDto`/`ReleaseReviewDto` extend `VersionDto`; `ReviewQueueQuery` mine|pool, state, actionNeeded bool transform, take 1–100.

## Database/migration explanation

- `ReviewAssignment` + partial unique `WHERE status='CLAIMED'` in `migrations/20260922120000_ph3_review_queue/migration.sql`; indexes in `20260922140000_ph3_review_indexes/migration.sql` (`Application(state,createdAt)`, `ReviewAssignment(status,applicationId)`).
- `prisma/seed/seed.ts`: officers `temwani.r`, `lubuto.s` (`ADMISSIONS_OFFICER/INTAKE/2026/review-assigned`), approver `kasonde.a` (`ADMISSIONS_APPROVER/INTAKE/2026/decide-offer`, seeded for SoD denial test).

## Security and authorization explanation

- Live `ADMISSIONS_OFFICER` + `review-assigned` + INTAKE scope enforced in `assigned()` and `claim()`, fail-closed for non-INTAKE scopes; applicant/sysadmin denied 403; approver read-only (writes 403); unknown/foreign identical 404s; version + idempotency on claim/release; CSRF; server-time counts; no browser sensitive storage.

## Tests and what they prove

Present in repo; fresh pinned-stack rerun still pending:

- `apps/api/test/review-queue.e2e-spec.ts` (13 tests): assigned-only, claim-release round-trip, double-claim conflict + no email leak, filters, unknown-neutral, idempotency conflict, version conflict + currentVersion, denied roles, withdraw-releases, cross-intake 404, actionNeeded=false parsing, approver read-only, summary `hasDecision=false` no OFFERED.
- `tests/browser/admissions-queue.spec.ts`: officer claim from pool, open case, finding + clarification, noOverflow + empty localStorage on 390px. Ran 2026-09-21 on Node 22 (1 passed); pinned rerun pending; manual AT pending.

## What failed or confused us

- Intake scope first enforced only on listings; fixed to enforce in `assigned()` and `claim()` fail-closed.
- Withdrawn claims lingered; withdrawal now auto-releases claims + bumps version.
- `actionNeeded=false` parsed as true; fixed with explicit string transform.
- Claim-race 503s; fixed with application row lock + P2002 → `ASSIGNMENT_CONFLICT`.
- Frozen post-submit versions; applicant/staff writes now bump version.
- Node 22 on 2026-09-21 box vs pinned 24.21.0 (`nest` CLI ora crash → direct `tsc`); current box has `fnm` 24.21.0, rerun unblocked but not executed here.

## Terms/concepts learned

- Assigned queue vs claimable pool; single active claim via partial unique index; SoD probe (approver read-only ahead of slice 5); intake-string interim scope.

## Questions to revise before presentation

- Claim → release → double-claim → stale-version → idempotency-conflict walkthrough and what each code proves.
- Why GAP-003/004/006/012 (registries) block production, and what is interim.
- What slices 3–6 still add, and why sim removal (GAP-017) is an exit gate.
