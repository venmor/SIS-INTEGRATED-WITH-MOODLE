# Project Status

## Current stage

**The handbook is the design baseline; application code exists in the sibling `development/` workspace.**

The 2026-09-19 review repaired earlier Phase 0/1 and discovery defects and implemented Phase 2 slices 2–5 for a bounded fictional demonstration. See the [current implementation review](../development/docs/learning/PHASE-2-IMPLEMENTATION-REVIEW.md) and [verification evidence](../development/docs/learning/VERIFICATION.md). Phase 2 slice 6, named earlier-phase gaps, human review and production approval remain pending. See the [application README](../development/README.md), [task packets](../development/docs/task-packets/README.md) and [rotation ledger](../development/docs/learning/ROTATION-LEDGER.md) for implementation and review evidence. Existing code is not evidence that every phase exit or human walkthrough has passed.

Original statements that the package contains no code describe this handbook directory and the original documentation ZIP, not the whole repository today.

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
