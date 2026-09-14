# Learning Note — TASK-PH0-002

- Lead developer: Charles
- Reviewer: Chitindu Milimbo
- Date/release: 2026-09-14 / v0.1.0 Phase 0 slice 2

## What we built and why

Pinned the toolchain so Arch + WSL behave identically before any app code: Node 24.21.0, npm workspaces, Postgres 18 via Compose, env-name contract, placeholder scripts. Prevents "works on my machine" drift.

## Frontend explanation

No UI yet. `apps/web/` stays empty (`.gitkeep`). Future Next.js will run on this same Node 24. `packages/ui` will hold approved primitives later.

## Backend/domain explanation

No NestJS yet. `apps/api/` stays empty. Root `package.json` only defines workspace globs + placeholder scripts (`dev/lint/test/build/demo:reset` echo + exit 0) to reserve the shared command contract from the handbook.

## Database/migration explanation

No schema/migrations yet. `docker-compose.yml` service `db` = `postgres:18-alpine` + `pgdata` volume + `pg_isready` healthcheck on `5432`. Matches host psql 18.6. Data lives in Docker volume, never in git. `DATABASE_URL` shape documented in `.env.example` (names only).

## Security and authorization explanation

No routes/auth yet. Guards: `.env` never committed (gitignored), `.env.example` has no values, secret scan clean, `.dockerignore` excludes secrets/build output. Handbook security overrides convenience.

## Tests and what they prove

Structural/toolchain checks only (not business tests): dir contract, no nested `.git`, `npm install` clean, `docker compose config` valid, `db` healthy via `pg_isready`, secret scan, `git diff --check`. Full proof log in completion report. Chitindu re-run pending on WSL.

## What failed or confused us

Host default was Node 26.8.2, not the pinned 24.21.0 — must use `fnm use` / `fnm exec --using=24.21.0` until shell default is switched. Postgres 18 image must be pulled on first `up` (slow first time, normal).

## Terms/concepts learned

- `.nvmrc` + `engines`: declarative Node contract for humans + CI.
- npm workspaces: one lockfile for `apps/*` + `packages/*`, prevents drift.
- Compose healthcheck + named volume: durable local DB with readiness gate.
- `.env.example` (names) vs `.env` (local values, gitignored).

## Questions to revise before presentation

1. Why Node 24.21.0 and not host Node 26? 2. Why Postgres 18 and not 16? 3. Where does real `.env` live and why is it never committed? 4. Which command proves the DB is healthy?
