# Application AI-Agent Instructions

## Required context before planning or coding

1. Read [README.md](README.md), [DESIGN-INDEX.md](DESIGN-INDEX.md), and the assigned task packet.
2. Read the controlling handbook journey, action, permission, UI, architecture, security/recovery, and test documents.
3. Check the handbook [supersession register](../unza-sis-moodle-design-handbook-v3.0.0/90-TRACEABILITY-AND-GOVERNANCE/SUPERSESSION-REGISTER.md), readiness matrix, and open decisions.
4. Confirm a human lead, reviewer, release/phase, and explicit out-of-scope list.

## Authority and stop rule

The handbook is authoritative. Apply its authority order: later approved decisions, security/privacy/official-record rules, exact evidence, curated handbooks, then templates/examples. Do not invent policy values, roles, providers, deadlines, permissions, states, screens, or approval authority.

If action authority, permission/visibility, state ownership, recovery behavior, tests, policy configuration, scope, lead, or reviewer is missing or contradictory, stop the action and record a design gap. Do not guess.

## Locked initial direction

Use a modular monolith with Next.js + TypeScript + CSS Modules, NestJS + TypeScript, PostgreSQL + Prisma, Docker Compose, GitHub Actions, and Playwright unless an approved ADR changes that decision.

Do not add Tailwind, microservices, Redis, Kafka/RabbitMQ, Kubernetes, native mobile, an AI chatbot, real student data, or real production credentials without an approved ADR.

## Engineering requirements

- Enforce authorization server-side using role, scope, relationship, state, purpose, and time-bound authority where specified.
- Preserve auditable/immutable history for high-impact decisions and use idempotency, retry/reconciliation, and outbox patterns where external effects require them.
- Add allow and deny tests plus failure, recovery, security, accessibility, API/integration, and E2E coverage required by the task packet.
- Keep module boundaries explicit; minimize dependencies and cross-module coupling.
- Never replace, reorganize, or silently alter the handbook. Add application-local links, ADRs, learning notes, and task packets instead.

## Completion report

Report requirement/action/test references, files changed, data/API/configuration and authorization effects, checks run, evidence, limitations, and unresolved design gaps. A change does not merge unless the human lead and reviewer can explain it.
