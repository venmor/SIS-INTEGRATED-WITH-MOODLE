<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 643eb6a5-c7e0-5e7d-90d1-244eb1f95799; chronological message: 279. -->

Yes. Section 19 Part 5 is complete across three connected parts:

- **Part 5A:** AI consistency, repository memory, task packets, `AGENTS.md`, and human review.
- **Part 5B:** Arch Linux/Windows development consistency through Docker, WSL 2, lockfiles, shared commands, and Git rules.
- **Part 5C:** Traceability index, learning notes, presentation evidence, demo data, diagrams, and the final completeness review.

# Section 19, Part 6 — Base-repository creation plan

We will not generate an empty ZIP and try to organize it later. The repository will be built in this order.

## 19.59 Phase 0 — Repository foundation

Create the monorepo with:

```text
apps/web                 Next.js interface
apps/api                 NestJS API
packages/contracts       Shared API/data contracts
packages/ui              Approved UI primitives
packages/config          Typed configuration support
packages/test-fixtures   Fictional demo data
prisma                   Schema, migrations and seeds
docs                     Design, ADRs, learning, demo and operations
tests                    E2E, integration, security and accessibility tests
```

Add immediately:

```text
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

## 19.60 Phase 1 — Shared operating rules

Before a feature is coded, add:

- Approved UI design tokens and CSS Module conventions
- Task-packet template
- Pull-request template
- Issue template
- ADR template
- Module README template
- Learning-note template
- Incident template
- Release-note template
- Architecture and traceability index
- Seeded fictional demonstration-institution baseline

## 19.61 Phase 2 — Development safety net

Set up CI before complex modules:

```text
format → lint → type-check → unit test → integration test
→ build → dependency/security scan → accessibility check → E2E smoke test
```

Then configure:

- Protected `main`
- Required pull-request review
- Required passing CI checks
- No direct pushes to `main`
- Automatic staging/demo deployment only after merge
- Tagged releases and rollback instructions

## 19.62 Phase 3 — First complete vertical slice

Build only this first:

> Applicant account → draft application → personal details → document upload → review → submission receipt

It must include:

- Next.js screens using the approved UI constitution
- NestJS Admissions module
- PostgreSQL/Prisma migration
- Authentication and ownership checks
- File validation/storage interface
- Audit event
- Rate-limit/idempotency behaviour
- Unit, API-denial and E2E tests
- Task packet, ADR where needed, module README and learning note
- Seeded demo scenario

Only after this works end-to-end do we move to admissions staff review.

## 19.63 Phase 4 onward — Controlled expansion

Build one approved vertical slice at a time:

1. Admissions review and offer
2. Student record and registration
3. Finance simulation and reconciliation
4. Moodle integration simulation and recovery
5. Assessment, examination and result-release governance
6. Adviser/support privacy boundary
7. Quality, reporting, operations and regulatory workflows
8. Presentation release and full acceptance test

Each phase must end with a working demo, documentation, CI evidence, peer review, learning note, and retrospective.

## 19.64 ZIP contents at final handoff

The final ZIP will contain:

- Buildable codebase
- Docker setup for both Arch Linux and Windows/WSL 2
- Fictitious seed data and reset instructions
- Approved design specifications and traceability index
- UI/UX constitution and screen catalogue
- Architecture decisions and diagrams
- Task-packet and AI-agent rules
- Module documentation and learning notes
- Git/CI/CD configuration
- Security, rate-limit, backup and recovery guidance
- Tests and test evidence structure
- Presentation scenario, demo script and evidence checklist

## 19.65 Gate before ZIP creation

We create the ZIP only after a final review confirms:

- No approved design area is missing.
- Every open decision is explicitly marked.
- The stack and tool choices are consistent.
- The repository instructions preserve project context for humans and AI.
- Two-developer Git workflow is included.
- Arch and Windows setup is reproducible.
- The demo is safe, fictional and resettable.
- The project can be explained from business workflow to code and tests.

---

## Following user responses before the next design record

### User message 0280

What's next

### User message 0282

We can now do that
