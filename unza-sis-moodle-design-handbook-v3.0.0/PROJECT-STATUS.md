# Project Status

## Current stage

**Research and design handoff complete; application coding has not started in this package.**

## Locked decisions

| Area | Decision |
|---|---|
| Architecture | Modular monolith with explicit domain boundaries |
| Web | Next.js with TypeScript and CSS Modules |
| Backend | NestJS with TypeScript |
| Data | PostgreSQL with Prisma migrations and SQL understanding |
| Local consistency | Docker Compose; pinned tool versions and one lockfile |
| CI/CD | GitHub Actions with protected main, PR checks and staged release |
| Browser testing | Playwright plus unit, API, authorization, accessibility and recovery tests |
| Integration | Outbox, idempotency, retry/dead letter and reconciliation |
| AI | Repository memory, bounded task packets, human review and no guessing |
| Team | Charles Hangoma and Chitindu Milimbo rotate full vertical-slice ownership |
| UI | UI/UX Constitution; CSS Modules; Tailwind excluded unless approved later |

## Source coverage

The package preserves all 70 standalone approved design outputs recovered from the shared chat. Role experiences that were written as standalone numbered parts are merged into journey books. Intervening administrative, finance, support and dean experiences are also assembled as composite handbooks from their approved domain, UX, permission, recovery and test records. Composite books add organization and traceability; they do not add policy values.

## Entry condition for development

A release or feature may begin only when its task packet names approved requirements, role/action behaviour, permission and denial tests, state ownership, UI/error states, audit/recovery behaviour, test evidence, developer lead and peer reviewer.
