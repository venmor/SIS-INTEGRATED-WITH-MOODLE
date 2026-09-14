# ADR-001: Toolchain baseline (Node 24 + npm workspaces + Postgres 18)

- Status: Approved
- Date: 2026-09-14
- Decision owners: Lead Charles / Reviewer Chitindu Milimbo
- Affected requirement/module/release: REQ-NFR-006, REQ-NFR-007 / foundation / v0.1.0 Phase 0

## Context

Phase 0 needs one reproducible toolchain on Arch Linux (Charles) and Windows/WSL (Chitindu) before app shells. Host had Node 26.8.2 + psql 18.6. Handbook requires pinned Node, one manager+lockfile (npm workspaces recommended), Docker Postgres, LF endings, .env.example names only.

## Options considered

- Node 26 (host default): matches Charles box, but too new, not LTS, risks Next/Nest warnings and WSL drift. Rejected.
- Node 22 LTS: max compatibility, but older than Lead preference. Rejected per Lead decision.
- Node 24.21.0 (Krypton LTS): Lead-approved, active LTS in Sep 2026, balances stability + recency. Chosen.
- Postgres 16 vs 18: 16 is safest default; 18 matches host psql 18.6 and avoids version-skew learning cost. Lead chose 18. Chosen: postgres:18-alpine.
- pnpm/yarn vs npm: handbook baseline is npm workspaces. No measured need to deviate. Chosen: npm.

## Decision

Pin Node `24.21.0` in `development/.nvmrc` + `engines`; npm workspaces `apps/*, packages/*` with single lockfile; `docker-compose.yml` service `db` on `postgres:18-alpine` with `pgdata` volume + `pg_isready` healthcheck; `.env.example` names only (`DATABASE_URL, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB`); `.gitignore/.dockerignore` guard `node_modules, .env, pgdata, dist, build`.

## Consequences

Benefits: same engine + DB both OS; one lockfile; no secrets in repo; CI can reuse same pins. Costs: both devs must install Node 24.21.0 (fnm/nvm) even though Arch box has Node 26; Chitindu must use Node 24 + PG18. Security/ops: no real data; local-only defaults.

## Verification and reversal

Verify: `node --version` = 24.21.0 via fnm/nvm, `npm install` clean, `docker compose config`, `up -d db` healthy, `pg_isready`, `down -v` cleans, secret scan clean, `git diff --check` clean. Reverse by new ADR (e.g. bump Node/Postgres) — never silent edit.
