# Learning Note — TASK-PH0-003

- Lead developer: Charles
- Reviewer: Chitindu Milimbo
- Date/release: 2026-09-15 / v0.1.0 Phase 0 slice 3

## What we built and why

Official-generator shells (not hand-written, per Lead decision) pruned to handbook rules: Next.js 16 App Router web shell + NestJS 12 API with `/health`, workspace packages, Prisma connection contract. Proves the toolchain runs real frameworks before any business logic.

## What the generators gave us (and what each piece is)

- `create-next-app@16.3.5 apps/web --ts --app --no-tailwind --eslint`: Next 16.3.5 + React 19 + TS^5 + eslint. Gave `app/` (layout/page/CSS Module), `public/` (static assets), `next.config.ts`, `tsconfig.json` (bundler resolution, `@/*` alias). We REPLACED the Vercel welcome `page.tsx` with an SIS shell reusing its CSS Module classes, and retitled `layout.tsx` metadata. We did NOT take Tailwind, `src/`, or the generator AGENTS.md.
- `@nestjs/cli@12.0.1 new api --directory apps/api`: Nest 12 + TS^6 (strict) + vitest + oxlint, ESM (`type: module`, `.js` import suffixes). Gave `src/main.ts`, `app.module.ts`, `app.controller/service(.spec)`, `vitest` + e2e configs, `nest-cli.json`. We CHANGED `main.ts` (port 3001 + global ValidationPipe) and ADDED `health.controller(.spec).ts` + `AppService.getHealth()`; generator hello route and specs stay untouched.

## Frontend explanation

`apps/web/app/page.tsx` is a static server component: heading, Phase-0 disclaimer, API-health link with expected shape. Styling is `page.module.css` (scoped) + `globals.css`. No data fetching yet — build-time coupling to the API is deliberately avoided until the first data slice.

## Backend/domain explanation

`main.ts` → `AppModule` → `HealthController` → `AppService.getHealth()`. Controller accepts the request, service owns the logic (pattern every future module follows). `ValidationPipe({whitelist, transform})` strips unknown fields globally from day one.

## Database/migration explanation

`prisma/schema.prisma` = generator + `postgresql` datasource via `env("DATABASE_URL")`, zero models. `prisma validate` proves the contract parses; first model/migration arrives with the first DB-backed slice. DB container from Slice 1 is untouched.

## Security and authorization explanation

No auth yet (liveness is public by design). Guards in place: ValidationPipe, `.env` gitignored, no personal data, dependency rule respected (generator defaults only).

## Tests and what they prove

Generator `app.controller.spec` (hello) + new `health.controller.spec` (shape `{status:'ok',version:'0.1.0'}`) + `next build` + `nest build` + live `curl :3001/health` + `prisma validate`. Full log in completion report.

## Known simplification (honest)

`AppService.getHealth()` mirrors the canonical `HealthResponse` in `@sis/contracts` instead of importing it — workspace type-linking (project references/contracts build) lands with the first API slice to keep this slice small. Shape-compat test arrives then.

## Terms/concepts learned

- App Router (`app/layout` + `app/page`) vs Pages Router; CSS Modules scoping.
- Nest controller→service→module; global pipes; ESM `.js` suffix imports.
- npm `--workspaces --if-present` for monorepo scripts without extra runner deps.
- Prisma generator vs datasource vs models.

## Questions to revise before presentation

1. Why official generators over hand-written? 2. Why API on 3001? 3. Where is the canonical health type and why isn't it imported yet? 4. What does `prisma validate` prove with no models?
