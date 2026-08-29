# Technology Stack and Repository Guidance

## Locked lean stack

```text
Web: Next.js + React (provided by Next.js) + TypeScript + CSS Modules
API: NestJS + TypeScript
Data: PostgreSQL + Prisma
Contracts: REST/OpenAPI
Local services: Docker Compose
CI/CD: GitHub Actions
Critical browser tests: Playwright
```

Use one language, TypeScript, across web, backend and most tests. Python may later support approved analytics/data-quality work; Java is not required for the initial implementation.

## Deliberate exclusions

Tailwind, microservices, Redis, Kafka, RabbitMQ, Kubernetes, native mobile apps, AI chatbots, multiple databases and real provider credentials are excluded initially. Adding one requires an ADR tied to a measured requirement.

## Recommended future repository

```text
university-sis/
  apps/
    web/                    # Next.js
    api/                    # NestJS modular backend
    worker/                 # background delivery when introduced
  packages/
    ui/                     # approved reusable UI primitives
    contracts/              # shared API/event types
    config/                 # validated configuration types
    test-fixtures/          # fictional records
  prisma/
    schema.prisma
    migrations/
    seed/
  docs/
    approved-design/
    architecture/
    adr/
    learning/
    demo/
    operations/
  tests/
    e2e/
    integration/
    security/
    accessibility/
  docker-compose.yml
  AGENTS.md
  README.md
  CONTRIBUTING.md
  SECURITY.md
```

This is implementation guidance, not code contained in this blueprint package.

## Code-structure rules

- Next.js components contain presentation/composition, not academic or financial policy.
- NestJS modules use controller → application/domain service → repository/access boundaries.
- Frontend never connects directly to PostgreSQL.
- Modules do not write one another’s core records.
- API/event types are not copied; they live in contracts.
- Avoid `misc`, `common`, `helpers` and `utils` dumping grounds.
- Shared code must have a genuine cross-domain concept and owner.
- Institutional values come from validated configuration.

## Dependency rule

Before adding a package, document the approved requirement, why the framework/platform cannot reasonably solve it, maintenance/security state, owner and removal cost. Avoid multiple component, validation or state-management libraries solving the same problem.
