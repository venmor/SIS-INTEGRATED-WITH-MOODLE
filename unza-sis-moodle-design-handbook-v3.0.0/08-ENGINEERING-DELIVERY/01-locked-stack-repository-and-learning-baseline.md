# Section 19, Part 2 — Locked stack, repository layout and learning roadmap

> Approved Section 19 engineering foundation.


## 19.16 Stack decision

The project will use:

> **Next.js + TypeScript + CSS Modules**  
> **NestJS + TypeScript + PostgreSQL + Prisma**  
> **Docker Compose + GitHub Actions + Playwright**

This is one language—TypeScript—across the frontend, backend and most tests. Next.js uses React internally, so React is not a separate stack choice. NestJS provides a modular backend structure; PostgreSQL supports the relational, transactional records this SIS needs. [Next.js documentation](https://nextjs.org/docs), [NestJS documentation](https://docs.nestjs.com/), [PostgreSQL documentation](https://www.postgresql.org/docs/current/)

### Deliberately excluded initially

- Tailwind CSS
- Microservices
- Redis
- Kafka/RabbitMQ
- Kubernetes
- Native mobile application
- AI chatbot
- Real payment credentials
- Real student data

These can be reconsidered only through a documented architecture decision.

## 19.17 Core tools and their responsibility

| Tool | Responsibility |
|---|---|
| Next.js | Applicant/student/staff web interface |
| CSS Modules | Scoped component/page styling and design tokens |
| NestJS | APIs, commands, authorization, domain workflows, integrations |
| PostgreSQL | Authoritative relational data, transactions, audit references |
| Prisma | Schema, migrations and typed database access |
| Docker Compose | Same local database/services for both developers |
| GitHub | Source control, issues, pull requests and review |
| GitHub Actions | Automated linting, tests, build and security checks |
| Playwright | Browser-based end-to-end tests |
| OpenAPI/Swagger | Human-readable and testable API contracts |

## 19.18 Repository layout

```text
university-sis/
  apps/
    web/                     # Next.js interface
    api/                     # NestJS backend
    worker/                  # controlled background jobs later

  packages/
    ui/                      # approved reusable UI components
    contracts/               # API request/response and event contracts
    config/                  # validated institutional configuration types
    test-fixtures/           # fictional demo/test records

  docs/
    approved-design/
    architecture/
    adr/                     # Architecture Decision Records
    learning/
    demo/
    operations/

  prisma/
    schema.prisma
    migrations/
    seed/

  tests/
    e2e/
    integration/
    security/
    accessibility/

  docker-compose.yml
  README.md
  CONTRIBUTING.md
  SECURITY.md
```

The project is one modular application at first. `apps/api` contains clear NestJS modules such as:

```text
identity-access
admissions
student-records
registration-progression
assessment-examinations
finance
learning-integration
support-services
quality-governance
reporting-regulatory
notifications
audit
```

These are code boundaries, not separate deployed systems.

## 19.19 First vertical slice

Do not begin with Finance, Moodle, AI or the whole student portal.

Start with this complete but manageable journey:

> **Applicant account → application draft → personal details → document upload → review → submission receipt**

It teaches both developers:

- Next.js pages/components/CSS Modules
- NestJS controller/service/module structure
- PostgreSQL schema and Prisma migration
- Authentication basics
- Form validation
- File upload
- Draft saving
- Audit event
- Error/recovery states
- API contract
- Unit/API/E2E testing
- Git pull-request workflow

It also directly implements the approved Applicant blueprint rather than being a throwaway tutorial.

## 19.20 Learning and delivery phases

| Phase | Build outcome | Main learning |
|---|---|---|
| 0. Foundation | Repository, Docker, CI, design system shell, demo data | Git, TypeScript, SQL, project structure |
| 1. Applicant slice | Account, draft, upload, submission receipt | Forms, APIs, database, tests |
| 2. Admissions slice | Queue, evidence review, recommendation | Role/scope authorization, cases |
| 3. Student core | Registration, configured course selection/progression | Policies, transactions, state machines |
| 4. Finance | Charges, payment simulation, reconciliation | Money, audit, idempotency |
| 5. Moodle | Shell/enrolment/TG simulation and recovery | Events, adapters, reconciliation |
| 6. Results/graduation | Mark staging, board/release, award | Controlled approvals/version history |
| 7. Support and QA | Adviser/support boundary, quality actions | Restricted data and governance |
| 8. Presentation release | Seeded demo, test evidence, deployment | CI/CD, documentation, presentation |

A phase is not complete until its tests, documentation, demo scenario and retrospective are complete.

## 19.21 Team-learning model

Charles Hangoma and Chitindu Milimbo will not be permanently divided into frontend and backend roles.

For each vertical slice:

| Responsibility | Lead developer | Second developer |
|---|---|---|
| Implementation | Builds the feature end to end | Reviews requirements and code |
| Tests | Writes initial tests | Adds negative/failure tests |
| Documentation | Explains architecture/code decisions | Checks traceability and clarity |
| Pull request | Opens PR | Reviews and approves |
| Demo | Presents feature flow | Presents architecture/testing |

On the next slice, swap lead and second-developer roles.

Both developers must touch:

- UI
- Backend
- Database/migrations
- Tests
- Documentation
- Pull-request review

## 19.22 Minimum learning order

Before Phase 1, learn only what you immediately need:

1. Git branches, commits, pull requests and merge conflicts  
2. TypeScript types, interfaces, functions and modules  
3. React components, props, state and forms  
4. Next.js layouts, pages and API calls  
5. CSS Modules and responsive layout  
6. SQL tables, keys, joins and transactions  
7. Prisma schema and migrations  
8. NestJS modules, controllers, services and guards  
9. HTTP request/response basics  
10. Unit tests and browser E2E tests  

Do not try to master advanced React, distributed systems or cloud infrastructure before building the first slice.

## 19.23 Definition of a finished feature

Each feature must include:

- Requirement/action ID
- Frontend screen
- API endpoint/command
- Database migration where needed
- Permission check
- Audit behaviour
- Loading/empty/error/access-denied UI states
- Unit test
- API/integration test
- Browser E2E test for critical journey
- Documentation update
- Pull-request review by the other developer

## 19.24 Documentation for understanding and presentation

Every module must include a short developer document:

```text
Purpose:
What problem this module solves:
Main entities:
Commands:
Events:
Permissions:
Database tables:
External dependencies:
How to run tests:
Known limitations:
Linked requirement IDs:
```

Every important decision creates a short ADR, for example:

```text
ADR-001: Use modular monolith before microservices
ADR-002: Use CSS Modules instead of Tailwind
ADR-003: Moodle can stage grades but cannot publish official results
ADR-004: Policy rules are versioned configuration
ADR-005: Financial clearance is a calculation, not a manual switch
```

This is what will help you answer questions during presentation.

## 19.25 Acceptance requirements

Part 2 is accepted only when:

- The lean stack is locked without unnecessary tools.
- The first feature is a complete approved vertical slice.
- Both developers rotate implementation, review, testing and documentation.
- The repository separates frontend, backend, contracts, configuration, tests and docs.
- Every feature is linked to an approved action contract and test evidence.
- Architecture decisions are recorded in plain language.
