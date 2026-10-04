# TASK-V2-ADM-001: Stable, navigable admissions review queue

## Authority

- Phase/release: v2.0 first implementation slice; admission review operations
- Requirement IDs: REQ-ADM-005, REQ-ADM-006, REQ-NFR-005; implementation refinements in v2.0 design
- Role and scope: active `ADMISSIONS_OFFICER`, capability `review-assigned`, assigned workspace and intake scope; approver read-only behavior remains unchanged
- Action/screen/component IDs: ACT-ADM-001; `TASK-PH3-001` admissions review queue; `TASK-PH3-002` case evidence comparison
- Policy/configuration version: fictional `APPLICATION-DEMO-v1` for isolated tests only; never institutional policy
- Acceptance-test IDs: existing TASK-PH3-001 packet-local queue-visibility/filter/idempotency/version/denial tests; add `V2-ADM-001-CURSOR`, `V2-ADM-001-SCOPE`, `V2-ADM-001-URL`, `V2-ADM-001-ACCESSIBILITY`, `V2-ADM-001-RECOVERY`
- Exact active handbook records checked before implementation (handbook HEAD `8bbeb3003cdec60633fa20d5481daaa159bce7e0`): `15-APPROVED-DESIGN-EVIDENCE/01-design-sections/002-design-section-2-stakeholders-roles-and-access-control.md`; `01-design-sections/006-design-section-6-admissions-onboarding-and-student-finance.md`; `02-role-blueprints/001-role-blueprint-catalogue.md` (Admissions Officer entry); `02-role-blueprints/002-role-blueprint-1-prospective-applicant-and-applicant.md`; `03-cross-blueprint/004-cross-blueprint-implementation-set-part-2c-actions-queues-records-feedback-and-recovery-co.md` (§§14.21–14.36); `03-cross-blueprint/006-cross-blueprint-implementation-set-part-3a-permission-and-information-visibility-matrix-co.md` (§§15.1–15.10); `03-cross-blueprint/008-cross-blueprint-implementation-set-part-4-error-recovery-and-notification-catalogue.md` (§§16.1–16.15); `03-cross-blueprint/009-cross-blueprint-implementation-set-part-5-end-to-end-acceptance-scenarios-and-test-strateg.md` (§§17.1–17.8); and `04-engineering-foundation/001-section-19-part-1-ui-ux-design-constitution.md`.
- Supersession-register entries checked: handbook `90-TRACEABILITY-AND-GOVERNANCE/SUPERSESSION-REGISTER.md`; `SUP-012` keeps approved evidence as active requirements, `SUP-013` distinguishes the handbook from runnable development code. Git blob ID (SHA-1 repository format) `4409bd01af7d17969daa87b57b05e72046f87299`.
- Readiness-matrix status: `Admissions review/offer` is “Ready with task gate”; supervisor must validate composite admin role authority/separation. This scoped queue pagination adds no approval/offer authority and preserves existing read-only approver behavior. Matrix Git blob ID (SHA-1 repository format) `2b1275c0a8ce263869c9bd4144a1451c1dbe099d`.
- Open design-gap IDs: GAP-004 scope registry remains open; does not authorize broadening current intake-string scope. GAP-V2-001 is not in this task's write path. Do not make org/policy writes.

## User outcome

An authorized admissions officer can navigate a large, changing synthetic review queue without repeatedly processing the first capped window, losing filters, or seeing another intake's cases. Assignment claim/release and decision separation remain unchanged.

## Architecture boundary

- Owning module: `admissions` review area (`apps/api/src/admissions`)
- Permitted dependencies: current Prisma-owned application, offering, review assignment and identity authority records
- API/command/event contracts: `GET /review/queue?scope=mine|pool&state=&actionNeeded=&take=&cursor=` returns `{items,nextCursor,hasMore}`; existing claim/release commands unchanged
- Data entities/migration impact: no persistent schema change expected; deterministic cursor uses sort tuple and signed normalized query/authority context
- External adapters: none; Moodle remains simulated

## Required controls

- Authorization/relationship: derive active role/assignment/scope server-side; apply scope predicate before limiting; bind cursor to actor, active assignment and normalized query; re-evaluate live authority on every page
- Privacy/classification: preserve minimal queue projection; do not expose name, contact, evidence or peer assignment identifiers
- Validation/state transitions: reject malformed cursor/limit/filter; stable unique tie-breaker; filter changes reset navigation; never mutate case state while querying
- Audit: preserve access audit behavior; do not make audit failure reveal peer data
- Idempotency/rate limiting: GET remains bounded/rate-limited; existing commands retain their keys/versions
- Failure/recovery: clear stale/mismatched cursors and offer restart; query failure retains filters and shows retry; claim/release uncertain result is reconciled by refresh
- Accessibility/UI states: labelled controls, keyboard navigation, clear count/page status, loading/empty/error/restricted states, 390px labelled-card layout and no color-only meaning

## Out of scope

Bulk claim, bulk recommendation or decision; automatic admission decisions; new role/capability; policy changes; generic global table refactor; institution setup writes; real applicant datasets; cloud Moodle or external providers.

## Definition of done

- [x] Detailed role/action design exists and no blocking gap applies to this current scoped action
- [x] Server query returns stable bounded pages with assignment/scope/filter predicates applied before limit
- [x] Allow, denial, tamper, equal-sort-key, actor/filter binding, live revocation and a later-arriving case pass; 20,000-case bounded traversal passes locally; concurrent staff load and mid-page assignment changes need additional acceptance coverage
- [x] Browser filters/navigation are URL-addressable, keyboard navigable and mobile-safe (390px); manual assistive technology remains unverified
- [x] Existing claim/release and applicant/approver separation browser journey remains green
- [x] Documentation and traceability updated with actual commands, environment and test outcomes
- [ ] Charles Hangoma lead; Chitindu Milimbo reviewer (assignments only; human review remains pending)

## Implementation evidence

- Isolated test database: Docker PostgreSQL `sis_v2_review_20261002`; fictional fixtures only; no schema changes. No files or data downloaded.
- API e2e: `DATABASE_URL=<isolated-local-db> DEMO_MODE=true QUEUE_CURSOR_SECRET=<local-test-secret> vitest run --config apps/api/vitest.config.e2e.ts apps/api/test/review-queue.e2e-spec.ts` — 14/14 passed, including cursor traversal across equal timestamps, actor-bound cursor and tampered-signature refusal.
- Browser: same isolated environment with `npm run test:browser -- tests/browser/admissions-queue.spec.ts` — 3/3 passed after fresh `npm run build --workspace=web`: full officer claim/review/approver journey, URL-preserving mobile pagination and saved invalid-cursor restart.
- TypeScript API/web checks and API build passed before this final browser rerun; production web build passed during this rerun. Targeted `oxlint` and web app ESLint passed. Browser specs are outside the web ESLint base path. `git diff --check` passed.
- Limitation: isolated DB `prepare-test-offerings` refreshed zero dates because the fixture dates were already future-dated. Browser journeys still passed. Manual screen reader, low-bandwidth, concurrency/change-during-page, production deployment, real Moodle and human role-authority review are not established by these checks.
- Opt-in scale: `RUN_SYNTHETIC_LOAD=true ... review-queue-scale.e2e-spec.ts` passed on 20,000 fictional submitted applications (200 pages of 100, no duplicates/omissions). Local p50 30.5 ms, p95 46.3 ms, max 162.1 ms per successful queue request; one 429 honored with `Retry-After`. No production SLO is inferred. Immutable submissions remain in the isolated test DB (51 MB measured after the run).
