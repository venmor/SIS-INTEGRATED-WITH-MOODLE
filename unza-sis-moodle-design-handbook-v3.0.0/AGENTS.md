# AI Agent and Developer Rules

This directory contains authoritative design documentation. The sibling `development/` directory contains the application; use its instructions and task packets for code work.

## Before planning or implementing

1. Read `START-HERE.md` and `PROJECT-STATUS.md`.
2. Read `90-TRACEABILITY-AND-GOVERNANCE/SUPERSESSION-REGISTER.md` and `90-TRACEABILITY-AND-GOVERNANCE/IMPLEMENTATION-READINESS-MATRIX.md`.
3. Load the assigned task packet.
4. Read the linked role journey/action, permission, UI, architecture, security/recovery and test documents, including their individual exact sources in `15-APPROVED-DESIGN-EVIDENCE/`. These are active requirements, not optional history.
5. Confirm lead developer, reviewer, release and explicit out-of-scope list.

## Non-negotiable rules

- Treat standalone and composite role books as controlling only within their stated source/authority boundaries.
- Do not invent roles, workflows, screens, policy values, states, providers or approval authority.
- If an action still lacks authority, visibility, state, recovery or test detail, create a `GAP-*` record and stop that action.
- Do not load or use the evidence compendium as a substitute for task-linked controlling documents.
- Later corrections and the supersession register override earlier wording.
- The original documentation ZIP contains no application code and does not prove implementation. Current implementation evidence belongs in `development/`.
- Use Next.js + TypeScript + CSS Modules, NestJS + TypeScript, PostgreSQL + Prisma unless a later approved ADR changes the stack.
- Do not add Tailwind, microservices, Redis, Kafka/RabbitMQ or Kubernetes without an approved ADR.
- Enforce authorization on the server using role, scope, relationship, state, purpose and time-bound authority.
- Preserve immutable history for high-impact decisions.
- Use idempotency, outbox/retry and reconciliation where external effects occur.
- Add denial, failure, recovery, audit and accessibility tests, not only happy paths.
- Never weaken policy or tests merely to make a build pass.
- Keep dependencies and cross-module coupling minimal.

## Completion report

Report requirement/action/test IDs, files changed, data/API/configuration changes, authorization effects, tests run, evidence, limitations and unresolved gaps. If Charles and Chitindu cannot explain the change, it does not merge.
