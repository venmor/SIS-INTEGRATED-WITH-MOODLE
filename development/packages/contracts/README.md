# Contracts

Single source of truth for API request/response and event types. Types only — no runtime code, no dependencies.

API/event types are never copied into apps; apps import them from `@sis/contracts`. Start: `src/health.ts` (`HealthResponse`).
