# TASK-PH0-002: Toolchain pin + Docker Postgres + npm workspaces baseline

## Authority

- Phase/release: v0.1.0 Phase 0 (slice 2)
- Requirement IDs: REQ-NFR-006, REQ-NFR-007
- Role and scope: Lead Charles / Reviewer Chitindu Milimbo / scope development/ toolchain only
- Action/screen/component IDs: none — foundation only
- Policy/configuration version: none — no institutional values
- Acceptance-test IDs: structural + toolchain verification only
- Exact detailed blueprint file(s):
  - unza-sis-moodle-design-handbook-v3.0.0/08-ENGINEERING-DELIVERY/06-arch-linux-windows-wsl-development.md
  - unza-sis-moodle-design-handbook-v3.0.0/08-ENGINEERING-DELIVERY/05-stack-and-repository-guidance.md
  - unza-sis-moodle-design-handbook-v3.0.0/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/02-phase-0-repository-and-learning-foundation.md
- Supersession-register entries checked: SUP-001 to SUP-011
- Readiness-matrix status: Ready (Repository/Git/learning/CI foundation)
- Open design-gap IDs: none blocking Phase 0

## User outcome

Both developers run the same Node and the same local Postgres via one lockfile and `docker compose up`, on Arch and on WSL, before any app code exists.

## Architecture boundary

- Owning module: none (foundation)
- Permitted dependencies: none new runtime deps
- API/command/event contracts: none
- Data entities/migration impact: none — Postgres service only, no schema
- External adapters: none

## Required controls

- Authorization/relationship: n/a — no routes
- Privacy/classification: fictional/local only, no real data; .env never committed
- Validation/state transitions: n/a
- Audit: verification log below for reviewer re-run
- Idempotency/rate limiting: n/a
- Failure/recovery: compose healthcheck + volume; documented error map
- Accessibility/UI states: n/a — no UI yet

## Out of scope

Next.js/NestJS scaffolds, Prisma schema/migrations/seed, design tokens/components, CI workflows, branch protection, any Applicant/Finance/Moodle/Assessment logic, Tailwind/Redis/Kafka/K8s/mobile/chatbot, real credentials or student data.

## Definition of done

- [x] No blocking gap; approved Node 24 + Postgres 18 per Lead decision
- [x] .nvmrc + engines pinned, npm workspaces root, one lockfile
- [x] docker-compose.yml Postgres 18 config valid (`docker compose config` PASS)
- [x] Postgres 18 healthy via pg_isready (verified 2026-09-14: container healthy, PostgreSQL 18.6, `pg_isready` accepting connections)
- [x] .env.example names only; .env/.gitignore guards verified
- [x] Cross-platform placeholder scripts present (dev/lint/test/build/demo:reset)
- [ ] Chitindu reproduces on WSL with Node 24.21.0 + Postgres 18 (pending — notice below)
- [ ] Reviewer can explain the change (pending walkthrough)
