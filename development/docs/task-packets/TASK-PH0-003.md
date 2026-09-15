# TASK-PH0-003: App shells + packages + minimal Prisma datasource

## Authority

- Phase/release: v0.1.0 Phase 0 (slice 3)
- Requirement IDs: REQ-NFR-006, REQ-NFR-007, REQ-NFR-008
- Role and scope: Lead Charles / Reviewer Chitindu Milimbo / scope development/ shells only
- Action/screen/component IDs: none — shells only, no business action
- Policy/configuration version: none — no institutional values
- Acceptance-test IDs: shell verification only (generator specs + health shape + builds)
- Exact detailed blueprint file(s):
  - unza-sis-moodle-design-handbook-v3.0.0/08-ENGINEERING-DELIVERY/05-stack-and-repository-guidance.md
  - unza-sis-moodle-design-handbook-v3.0.0/08-ENGINEERING-DELIVERY/01-locked-stack-repository-and-learning-baseline.md
  - unza-sis-moodle-design-handbook-v3.0.0/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/02-phase-0-repository-and-learning-foundation.md
- Supersession-register entries checked: SUP-001 to SUP-011
- Readiness-matrix status: Ready (Repository/Git/learning/CI foundation)
- Open design-gap IDs: none blocking Phase 0

## User outcome

`npm install` then `npm run dev:web` + `npm run dev:api` serves a branded SIS shell page (port 3000) and a NestJS API with `GET /health` (port 3001). No business feature is claimed.

## Architecture boundary

- Owning modules: none yet — `apps/web` (presentation shell), `apps/api` (health only)
- Permitted dependencies: generator defaults only (next/react/react-dom, nest common/core/platform-express, reflect-metadata, rxjs) + root `prisma` CLI 7.10.0 + `class-validator@0.15.1`/`class-transformer@0.5.1` in api (required by the global ValidationPipe — boot fails without them, verified); nothing else without ADR
- API/command/event contracts: `GET /health` → `HealthResponse` (canonical type in `@sis/contracts`)
- Data entities/migration impact: none — `schema.prisma` holds generator + datasource only, zero models, zero migrations
- External adapters: none

## Required controls

- Authorization/relationship: n/a — unauthenticated liveness only
- Privacy/classification: no personal data anywhere; `.env` never committed
- Validation/state transitions: global `ValidationPipe` (whitelist + transform) on all API routes
- Audit: verification log below for reviewer re-run
- Idempotency/rate limiting: n/a — read-only liveness
- Failure/recovery: compose healthcheck (DB independent of shells); documented error map
- Accessibility/UI states: shell page is static text + links; keyboard/screen-reader usable by construction; full audit arrives with first journey slice

## Out of scope

Business modules/journeys, Prisma models/migrations/seed, design tokens/components, CI workflows, Swagger, auth/permissions, Tailwind/Redis/Kafka/K8s/mobile/chatbot, real data/credentials.

## Definition of done

- [x] Official generators used (create-next-app 16.3.5, @nestjs/cli 12.0.1) on Node 24.21.0; versions recorded
- [x] No Tailwind, no nested `.git`, handbook untouched
- [x] Web shell branded, CSS Modules only, links API health
- [x] API `GET /health` returns `{status:'ok',version}` via controller→service
- [x] Generator specs green + health spec added
- [x] `prisma validate` passes (no models; run as `export $(cat .env | grep -v '^#' | xargs) && npx prisma validate` — Prisma 7 reads real env, not `.env`, in `prisma.config.ts`)
- [ ] Chitindu reproduces install/build/health on WSL (pending)
- [ ] Reviewer can explain the change (pending walkthrough)
