# Learning Note — TASK-PH2-001 (public programme discovery)

- Lead developer: Chitindu Milimbo (user decision 2026-09-18; confirm vs standing ruling in ROTATION-LEDGER line 18)
- Reviewer: Charles Hangoma
- Date/release: 2026-09-18 / v0.3.0 Phase 2 slice 1
- Branch: `feat/ph2-001-discovery` (local-only flow; no worktree — shares the single Docker pgdata volume, and CONTRIBUTING permits branches)

## What was built and why

First applicant-domain vertical slice: anonymous visitors search 3 demo programmes, read intake-specific detail, compare up to 3, and run eligibility guidance with per-requirement verdicts + mandatory disclaimer. No account, no application creation, no view-event persistence (approved deviation 5 — no consumer until v0.9).

## Frontend

- Routes `/discover`, `/discover/[id]`, `/discover/compare`, `/discover/[id]/eligibility` + POST-only `/api/catalogue` proxy (reads are server-rendered direct; approved deviation: filters in page URL, first URL-state in app).
- 4 new `@sis/ui` primitives with §14.2-style contracts: ProgrammeCard, FilterGroup, CompareTable (stacks to labelled rows <40rem), GuidanceResult. Wizard flow stays app-local (form.tsx), reusing Field/ActionButton/ErrorSummary/Notice.
- Per-page `metadata`; `next/link` for internal nav (eslint rule); uncontrolled inputs merged via FormData on submit.
- Omitted deliberately: Save programme persistence, Ask-a-question, save/email guidance, standalone content pages (recorded out-of-scope).

## Backend/domain

- `CatalogueModule` (imports IdentityAccessModule for the Prisma singleton + CsrfGuard export, added): 6 public endpoints, per-IP `catalogueSearch` budget (60/min, demo), 429 shape mirrors house (Retry-After + rateLimited + audit row, anonymous actor).
- Pure `guidance.ts` evaluator (5 verdicts, mandatory-only blocking) + `limitComparison` + `canStartApplication`.
- Canonical shapes in `@sis/contracts`; gave the package a real `exports` map (first non-spec source imports — fixes latent error-type resolution).

## Database/migration

- 5 models (QualificationRoute, Programme, ProgrammeOffering, RequirementRule, GuidanceSession) + 2 migrations; seed: 5 routes, 3 programmes, 4 offerings (OPEN/SOON/CLOSED states), 9 rules. Counts stable on re-run: 3/4/9.
- `backup-test.mjs` TABLES + orphan checks extended with the 5 new tables (was silently uncovered).

## Security + authz

- Public reads only; unknown IDs neutral 404; grade facts validated server-side; guidance sessions 30-min TTL, anonymous-safe payloads; no personal data stored; personal-evidence masking n/a (no personal data in slice).

## Tests and what they prove

- Unit 12 files/55 pass (`npm run test --workspaces`): guidance 9 (each verdict + unknown-grade + unconfigured-threshold + intake gate + compare cap), contract 3, rate-limit +1.
- E2E 13 files/65 pass (2 consecutive full runs): catalogue 10 (search, filters, detail, closed-intake, neutral 404, compare cap, guidance outcomes + disclaimer, routes, pagination cap, rate-limit 429 + Retry-After).
- `tsc --noEmit` (api) clean; web lint + `next build` green (4 new routes listed); prettier clean on touched files; forbidden/secret scans clean; `diff --check` clean; prisma validate clean.
- Live render proof: `/discover` (3 programmes SSR), detail/compare/eligibility 200, proxy session→evaluate (APPEARS_MET/NEEDS_VERIFICATION + disclaimer), proxy 404 on unknown path.
- Backup/restore equivalent via container tools (host `psql` absent): 20/20 tables reconcile incl. new 5; 0 orphans on slice tables. 15 orphaned ReviewSchedules are pre-existing e2e residue (review.e2e sweeps miss schedules) — not this slice; `npm run backup:test` itself cannot run on this machine (spawnSync psql ENOENT, no host client).

## What failed or confused us

1. Fresh checkout: no `node_modules` + 2.3 GB disk → `npm cache clean` freed ~1.1 GB, `npm ci` passed.
2. `with-env.mjs`/`demo-reset.mjs`/`backup-test.mjs` spawn `.cmd` shims with `shell:false` → silent exit 1 on Windows PowerShell. Worked around by dot-sourcing `.env` + running tools directly. Recorded; scripts untouched (out of slice).
3. Node 22.13 vs pinned 24.21.0: seed needs `--experimental-strip-types`; `nest build` CLI crashes (ora ESM cycle) → used `tsc -p tsconfig.build.json` (emit for run, --noEmit for proof).
4. Schema relations live on Programme, not Offering (3× 500s, caught by probe spec, fixed).
5. `import type` from `@sis/contracts` unresolvable (no exports map) → added types+exports; tsc then caught dead `INFO_MISSING` logic and spread-type errors the transform had hidden.
6. Full-suite flake: 1 failure in the 19:51 run, green in the 19:53 and 20:05 runs (same code) — observed-once, unidentified; watch on next slice.
7. `docker exec` mangles quoted identifiers on Windows → pipe SQL via stdin.

## Terms and concepts

- Guidance verdicts: APPEARS_MET / NEEDS_VERIFICATION / INFO_MISSING / NOT_MET / UNAVAILABLE; only mandatory NOT_MET/INFO_MISSING block; overall reflects mandatory rules only.
- AwaitingPayment-style gating, idempotency receipts, and outbox patterns from Phase 1 were reused as-is (rate-limit + audit shapes).

## Review appendix (independent audits, 2026-09-18 — all fixed unless noted)

Code reviewer + handbook-coverage auditor findings, dispositions:

Fixed: overall ranking (mandatory NOT_MET > INFO_MISSING > NEEDS_VERIFICATION > UNAVAILABLE > APPEARS_MET; empty → UNAVAILABLE); server-side grade/boolean guards → INFO_MISSING; rule-version dedup (`selectLatestRules`); compare UUID-shape filter + dedupe + post-cleanup truncation; session TTL from CATALOGUE_V1 + opportunistic expired purge; TTL/config keys + migration; `CATALOGUE_V1.compareMax` single source; DISC-GRADE-HINT-001 + DISC-KEPT-001 templates; kept-state sentences on failure Notices/proxy/wizard; `statusNote` on search cards; route filter in UI (server-supplied options); school-browse links (data-derived); pager note; text-filter restores (`Field.defaultValue`); `next/link` in app files; link aria-labels; compare Added-state + View comparison tray line; compare eligibility links + additional/version rows; wizard step-title focus (single announcements); BOOLEAN unknown option; dirty-flag route confirm; key-remount clearing (no DOM mutation); verdict role moved to overall; result Start-application gate; `loading.tsx` skeleton + "Searching programmes" live region; seed offering correction path; routeId orphan check; AvailabilityLabel removal; proxy comment accuracy.

Pushed back with reasoning (recorded, not built): per-IP rate-limit keying + per-429 audits (demo single-instance topology + house consistency; LB behavior is a production extension); full copy-templating of presentational microcopy (packet source-map traceability suffices; DISC-* covers policy copy); facts-payload caps (unknown keys skipped, O(n) cheap); retired/change-detection beyond version display (impossible without persistence — out of scope); detail title focus (native SR title announcement on server-rendered loads); e2e seed-count coupling (house pattern); `nest`/scripts/Node-22 environment gaps (recorded above, not slice code).

Still open (human steps): Charles WSL replay incl. keyboard/SR/mobile pass; merge decision; Playwright runner stays deferred by recorded decision.

## Questions to revise (carried, unchanged)
- Confirm lead/reviewer rotation vs standing ruling (ledger line 18).
- Scanner boundary for slice 4 (simulated verdict vs real service) still open.
- Static content pages + Save/Ask dispositions confirmed deferred — revisit if assessors expect them in v0.3.0.
- Reviewer replay steps: (1) fresh `demo:reset` + seed counts 4/4/6/4 + 3/4/9; (2) browse `/discover`, filter, compare 3, run guidance to each verdict; (3) closed BBA offering blocks start with explanation; (4) explain catalogue → config → DB path on WSL.
