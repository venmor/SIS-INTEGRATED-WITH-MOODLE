# Learning Note — TASK-PH0-005

- Lead developer: Charles
- Reviewer: Chitindu Milimbo
- Date/release: 2026-09-15 / v0.1.0 Phase 0 slice 5 (final)

## What we built and why

Delivery guardrails so Phase 1 starts disciplined: a simplified 19.31 pipeline, PR/issue templates, and a protection checklist — plus honest records of our two Phase-0 deviations (C1 commit style, C2 direct-to-main) and their agreed corrections.

## Frontend explanation

No UI change. Web is exercised by the pipeline (`eslint`, `tsc` via build, `next build`).

## Backend/domain explanation

No domain change. API is exercised by the pipeline (prettier check, `oxlint`, `vitest`, `nest build`).

## Database/migration explanation

None. `prisma validate` runs in CI with a parse-only dummy `DATABASE_URL` (documented in the workflow); no live DB needed until migrations exist.

## Security and authorization explanation

Pipeline includes the 19.34 secret scan and the forbidden-pattern scan; both dependency-free (`rg`). `.env` handling unchanged and verified ignored.

## Tests and what they prove

Local CI replay = the same commands as `ci.yml`, in order (see completion report). GitHub-side green run happens after root activation + first Phase-1 PR.

## What failed or confused us

1. API `format` script uses `--write`, which conflicts with `--check` — CI calls `prettier --check` directly instead (recorded pattern).
2. GitHub ignores `development/.github` — activation requires a root copy at connection time (recorded, not hidden).

## Terms/concepts learned

- `node-version-file` + npm cache in setup-node; `npm ci` vs `install`.
- `--workspaces --if-present` for monorepo-wide scripts without runner deps.
- Protection rules as code-adjacent checklist (settings the owner clicks).

## Questions to revise before presentation

1. Why is E2E missing from CI? 2. What are C1/C2 and how were they corrected? 3. What must happen before the first Phase-1 merge? 4. Why a dummy DATABASE_URL in CI?
