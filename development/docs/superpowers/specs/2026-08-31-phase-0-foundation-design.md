# Phase 0 Foundation Design

## Purpose

Create the empty, learnable application workspace for the SIS--Moodle project. It must preserve the handbook as the authoritative design source while giving human developers and future AI agents one consistent location and set of rules for implementation work.

## Scope

This foundation creates structure and plain-language repository guidance only. It does not install dependencies, scaffold Next.js or NestJS, create a database, add Docker services, implement business logic, or claim a product feature.

## Repository Boundary

The existing Git repository remains the sole repository:

```text
SIS-INTEGRATED-WITH-MOODLE/
  unza-sis-moodle-design-handbook-v3.0.0/  # authoritative handbook; unchanged
  development/                             # self-contained application workspace
```

`development/` must never contain a nested `.git` directory. Application commands, dependency files, Docker configuration, CI definitions and developer documentation belong in `development/`. The outer root retains the handbook and tracks the whole workspace.

## Target Structure

```text
development/
  apps/
    web/
    api/
  packages/
    contracts/
    ui/
    config/
    test-fixtures/
  prisma/
    migrations/
    seed/
  tests/
    e2e/
    integration/
    security/
    accessibility/
  docs/
    approved-design/
    architecture/
    adr/
    learning/
    demo/
    operations/
    task-packets/
    superpowers/
      specs/
      plans/
  scripts/
  .github/
    workflows/
    ISSUE_TEMPLATE/
  README.md
  AGENTS.md
  CONTRIBUTING.md
  SECURITY.md
  DESIGN-INDEX.md
  .env.example
  .nvmrc
  .editorconfig
  .gitattributes
  docker-compose.yml
```

Empty directories are represented by `.gitkeep` files until their real contents are introduced. Placeholder runtime/configuration files must state their Phase 0 status and must not imply working software.

## Human Learning and Traceability

The workspace documentation provides a direct route from the handbook to implementation:

- `DESIGN-INDEX.md` maps application areas to controlling handbook documents and records the authority order.
- `docs/task-packets/` stores one completed task packet per implementation task, based on the handbook template.
- `docs/adr/` contains short decisions that change architecture, dependencies or long-term behavior.
- `docs/learning/` contains concise explanations of what a developer learned, how to run/verify the work, and links to the relevant code and handbook material.
- A rotation ledger records lead developer, reviewer, review evidence and role swap per vertical slice.

No handbook rule, policy value, permission, provider, institution-specific deadline or production configuration is copied as assumed truth. Documentation links to the handbook and identifies any unresolved design gap.

## AI-Agent Guardrails

`development/AGENTS.md` is the durable entry point for future AI agents. It must require agents to:

1. Read the application README, the design index and the current task packet before planning or coding.
2. Treat the handbook as authoritative; apply its authority order and supersession register.
3. Use the locked initial stack: Next.js/TypeScript/CSS Modules, NestJS/TypeScript, PostgreSQL/Prisma, Docker Compose, GitHub Actions and Playwright.
4. Avoid Tailwind, microservices, Redis, Kafka/RabbitMQ, Kubernetes, native mobile, AI chatbot, real student data and real production credentials unless an approved ADR explicitly permits the change.
5. Stop and record a design gap if action authority, permissions, state ownership, recovery behavior, tests, policy configuration, human lead/reviewer or scope is missing.
6. Keep one modular monolith, enforce authorization server-side, retain auditable history for high-impact decisions, and include allow/deny, failure/recovery and accessibility coverage.
7. Report requirement/action/test references, changed files, data/API/configuration effects, authorization effects, verification evidence, limitations and unresolved gaps.

Agents must not replace, reorganize or silently alter the handbook. They may add application-local links, task packets, ADRs and learning notes.

## Verification

The folder-structure task is complete when:

- every target directory exists and is tracked;
- `development/` has no nested Git repository;
- the README and AGENTS instructions distinguish handbook from application workspace;
- the design index, task-packet location, ADR location, learning-notes location and rotation ledger are discoverable;
- placeholders contain no secrets, application claims or invented institutional policy;
- Git status shows only the intended Phase 0 foundation files.

## Deferred Work

Tool-version pinning, package workspace setup, Docker Compose services, application scaffolds, design tokens, CI workflows and business functionality are separate Phase 0 tasks after this structure is reviewed.
