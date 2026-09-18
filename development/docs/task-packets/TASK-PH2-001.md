# TASK-PH2-001: Public programme discovery (search, detail, compare, eligibility guidance)

## Authority

- Phase/release: v0.3.0 Phase 2 (slice 1 of 6; single packet per lead decision 2026-09-18)
- Requirement IDs: REQ-ADM-001 (public discovery/eligibility guidance, no account), REQ-NFR-001 (deny-by-default proxy, server-side checks), REQ-NFR-002 (no personal data collected/stored), REQ-NFR-003 (keyboard/SR/focus/reflow/non-colour status), REQ-NFR-005 (paginate, bound requests, minimal fields), REQ-NFR-007 (pinned toolchain, Docker, common commands), REQ-NFR-009 (versioned demo config, no hard-coded programme/requirement/fee values)
- Role and scope: Lead Chitindu Milimbo / Reviewer Charles Hangoma / scope `apps/api/src/catalogue/` (new module), `prisma/` (catalogue models + migration + seed), `packages/contracts/` (catalogue shapes), `packages/config/` (CATALOGUE-v1 demo limits + public-search rate limit), `packages/ui/` (4 new components), `apps/web/app/discover/` + `app/api/catalogue/` proxy entries only
- Action/screen/component IDs: Part 2 commands `SearchProgrammeCatalogue`, `ViewProgrammeOffering`, `StartEligibilityGuidance`, `EvaluatePublishedRequirements`, `SaveProgrammeComparison` (handbook names flows, not REST); screens `SCR-PUB-*` (search/detail/compare/eligibility); packet-local component labels `DISC-CARD-*`, `DISC-FILTER-*`, `DISC-COMPARE-*`, `DISC-GUIDE-*` (demo labels, never cite as handbook IDs)
- Policy/configuration version: `DEMO-ACADEMIC-2026-v1` (3 schools, 3 programmes, ZMW, Africa/Lusaka) + `CATALOGUE-v1` (new packet-local demo config: page sizes, skeleton timing, guidance copy) + `SECURITY-v1` (new: `catalogueSearch` per-IP limit — handbook threat model requires search abuse limits but names no anonymous row; demo value, labelled)
- Acceptance-test IDs (packet-local; mapped in appendix): discovery-search, discovery-filters-url, discovery-detail, discovery-closed-intake, discovery-compare-limit, discovery-guidance-each-outcome, discovery-guidance-disclaimer, discovery-no-sensitive-collection, discovery-stale-dated, discovery-rate-limit, keyboard-SR-discovery, discovery-mobile-reflow
- Exact detailed blueprint file(s):
  - …/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/04-phase-2-applicant-self-service.md (slice 1)
  - …/03-USER-EXPERIENCE-BLUEPRINTS/01-applicant-journey-book.md (Part 2, lines 304–701: search §3, detail §4, compare §5, guidance §6, microinteractions §7, architecture §8, acceptance §9)
  - …/04-UI-UX-DESIGN-SYSTEM/01-ui-ux-constitution.md (19.3–19.10, 19.14) + 02-screen-and-component-catalogue.md (`SCR-PUB-*`, Public discovery family)
  - …/05-REQUIREMENTS-PERMISSIONS-DATA/01-functional-requirements.md (REQ-ADM-001, REQ-NFR-*) + 05-data-policy-and-configuration.md (hard-coding prohibition, DEMO-ACADEMIC-2026-v1)
  - …/06-ARCHITECTURE-INTEGRATIONS/01-domain-and-module-architecture.md (catalogue ownership) + 04-integration-and-adapter-contracts.md (no provider in slice 1)
  - …/07-SECURITY-PRIVACY-RESILIENCE/03-threat-model.md (expensive-search row) + 04-rate-limiting… (baselines; anonymous catalogue-search row added here) + 05-security-acceptance-gates.md + 06-error-recovery… (§16.1 five-part errors)
  - …/12-TESTING-AND-ACCEPTANCE/02-acceptance-test-catalogue.md (TEST-E2E-APP-001 downstream, not this slice) + 07-phase-exit-review-checklist.md (12 gates)
- Supersession-register entries checked: SUP-001 to SUP-011
- Readiness-matrix status: Ready (applicant discovery/draft/upload/submission — use Blueprint 1 + demo config)
- Open design-gap IDs: GAP-004 scope registry (programmes seed-local names only; presence/format checks, no registry validation — not blocking per bounded option). No blocking gap.

## User outcome

A visitor with no account finds a programme via search/filters/school browsing, reads its intake-specific detail (overview, structured requirements, checklist, fee-schedule link), compares up to three offerings, and runs eligibility guidance that explains each per-requirement verdict with the mandatory disclaimer — never a decision. A closed intake explains itself and blocks application start.

## Architecture boundary

- Owning module: catalogue (new `apps/api/src/catalogue/`: `CatalogueController` thin → `CatalogueService`; `dto/*`; no guards on public GETs; `CsrfGuard` on POST evaluate per house rule)
- Permitted dependencies: none new (existing Prisma/nestjs/class-validator only)
- API/command/event contracts: `GET /catalogue/programmes` (q + labelled filters + capped pagination), `GET /catalogue/offerings/:id` (UUID), `GET /catalogue/compare?ids=` (max 3, server-enforced), `POST /catalogue/guidance/sessions` + `POST /catalogue/guidance/evaluate` (stateless evaluate; session retained client-side only); packet-local REST names (handbook defines flows, not REST); NO view/guidance event emission in slice 1 (no consumer until v0.9 — explicit approved deviation 5)
- Data entities/migration impact: ADDITIVE — `ProgrammeCatalogue`, `ProgrammeOffering` (availability/deadline per intake), versioned `EntryRequirementRule`, `QualificationRoute`, transient `GuidanceSession` (anonymous-safe, TTL-expired, no personal data); every new query indexed per rule
- External adapters: none (no ECZ/ZAQA adapters — verification is Phase 3)

## Required controls

- Authorization: public reads only; unknown/closed offering IDs get neutral responses; `Start application` action checks intake-open server-side (draft creation itself is slice 2)
- Privacy/classification: no personal data collected or stored (guidance facts live for the session only); masking n/a; analytics-free (no view-event persistence per deviation 5)
- Validation/state transitions: DTO allow-list (global pipe); filter values validated; compare `ids.length <= 3`; grade-format validated on blur; `Unknown` grade allowed where policy permits → incomplete outcome; programme-mid-check change asks to restart
- Audit: none for anonymous views (explicit decision); config version recorded on evaluate responses
- Idempotency/rate limiting: NEW `catalogueSearch` per-IP limit in SECURITY-v1 (demo value, labelled — approved deviation 4); pagination caps; size/time bounds on search per threat-model row
- Failure/recovery: §16.1 five-part errors; catalogue-unavailable → service message + contact + retry, never stale-as-current without last-updated date; connection-loss during evaluate → safe retry, no phantom session
- Accessibility/UI states: keyboard-only + SR labelling (search announcements, focus on programme title, `aria-pressed` filters) + visible focus + 200%-zoom single column + mobile (tables → labelled cards, §7 result states incl. skeleton + no-results help); colour never alone on verdicts

## Out of scope

Account creation/sign-in (exists), draft/sections/uploads/fee/submission (slices 2–6), `StartApplicationFromProgramme` draft creation (slice 2 — slice 1 owns only the intake-open check), standalone static content pages (Entry-requirements/Intakes/Fees/How-to-apply/Help beyond detail-page links — follow-up slice), `Save programme` persistence + `Ask a question` + save/email guidance (session-only compare; help-route link only), real fee values beyond demo placeholders, ECZ/ZAQA adapters, view/guidance event emission, authenticated/personalized behaviour, international-specific rules beyond the generic conditional framework (new GAPs if encountered — do not invent)

## Definition of done

- [x] Entry gate all YES (this packet; deviations 1–5 approved 2026-09-18)
- [x] Migration applies on fresh `demo:reset`; minimal seed = exactly 3 DEMO programmes; closed/soon-open intake states proven via intake status (retired/change-tracing via fixtures — recorded seed consequence)
- [x] Search/detail/compare/guidance behave per proofs (unit + e2e green, counts recorded below)
- [x] Filters reflected in page URL (shareable/restorable — approved deviation 1, first URL-state in app)
- [x] `force-dynamic` rendering kept like all existing pages (approved deviation 2); per-page metadata added (approved deviation 3)
- [x] 4 UI components with full README contracts; no hardcoded policy text/colours
- [x] `diff --check` clean; secret + log-inspection scans clean; both builds green (api via `tsc` emit + `--noEmit` — `nest` CLI crashes on this machine's Node 22, recorded in learning note)
- [x] 19.49 rows addressed: validation + rate-limit/abuse test + migration-deploy + critical API E2E + secret scan green; file-upload N/A; no new deps
- [ ] Reviewer replays discovery → compare → guidance → closed-intake block on WSL and explains the catalogue → config → DB path

## Source map (anti-hallucination — packet-local vs handbook)

Packet-local demo labels (valid choices, never cite as handbook IDs): `CATALOGUE-v1` limits/copy, `catalogueSearch` rate limit, `DISC-*` component labels, `/catalogue/*` + `/discover/*` paths, `GuidanceSession` TTL shape, kebab test IDs below.
Handbook: REQ-ADM-001, Part 2 screens/copy/flows/verdicts/disclaimer, 19.x constitution rules, `SCR-PUB-*` family, DEMO-ACADEMIC-2026-v1 values, threat-model search row, §16.1 errors, version-metadata rule (§8.4).

Test-ID map: discovery-search/filters-url → Part 2 §3 + REQ-ADM-001; discovery-route-filter → §3.1 route control; discovery-detail/closed-intake → §4 + "cannot start for closed intake"; discovery-compare-limit/compare-robust → §5 (max 3, dedupe, neutral drops); discovery-guidance-each-outcome/disclaimer → §6 (5 fixed verdicts + fixed wordings + mandatory disclaimer; overall ranks mandatory NOT_MET > INFO_MISSING > NEEDS_VERIFICATION > UNAVAILABLE > APPEARS_MET); discovery-no-sensitive-collection → §1 boundary + §9; discovery-stale-dated → §3.3/§8.4 (fail-closed + version/date display); discovery-rate-limit → threat-model row + NFR-005; keyboard-SR-discovery/discovery-mobile-reflow → §7 + §17.6 proof pattern (contracts + reviewer manual pass; no runner per deferred Playwright decision).

## Execution evidence

(2026-09-18, branch `feat/ph2-001-discovery`, TDD RED→GREEN throughout; review-fix round after two independent audits — see NOTE-PH2-001 review appendix.)

- Unit: 12 files/55 pass (`npm run test --workspaces`): catalogue guidance 15 (verdicts, ranking, guards, version-dedup) + contract 3 + rate-limit +1 on top of the pre-existing suite.
- E2E: 13 files/65 pass: catalogue 12/12 (search, school/availability/route filters, detail, closed-intake, neutral 404, compare cap + garbage/dedupe robustness, guidance outcomes + NEEDS_VERIFICATION overall + disclaimer, routes list, pagination cap + 400 over max, rate-limit 429 + Retry-After).
- Migration: 3 new migrations applied (`..._ph2_slice1_catalogue`, `..._catalogue_config`, `..._catalogue_ttl`); seed idempotent (4/4/6/4 + 3 programmes/4 offerings/9 rules) with availability/note/deadline correction path.
- Builds: web `next build` green (routes /discover, /discover/[id], /discover/[id]/eligibility, /discover/compare, /api/catalogue, loading fallback); api `tsc` emit + `--noEmit` clean (`nest` CLI itself crashes on Node 22 — environmental, recorded).
- Live render: /discover 200 (3 programmes SSR, school links, tray Added-state + View comparison); detail/compare/eligibility 200 (version/additional rows, eligibility links, gated Start link); proxy session→evaluate green with NEEDS_VERIFICATION overall + verbatim disclaimer; proxy unknown path 404.
- Backup/restore equivalent (host `psql` absent — `npm run backup:test` cannot run here): 20/20 tables reconcile incl. 5 new tables; 0 orphans on slice tables (+ routeId check added); 15 orphaned ReviewSchedules are pre-existing e2e residue (not this slice); `backup-test.mjs` TABLES extended with the 5 new tables.
- Scans: forbidden-pattern clean, secret clean, `diff --check` clean, prisma validate clean, oxlint clean for slice files (remaining warnings pre-date this slice); `npm audit 2026-09-18: 4 high, all pre-existing transitive (prisma→mysql2 chain, fix = breaking prisma 6 downgrade, declined); no new dependencies in slice.
