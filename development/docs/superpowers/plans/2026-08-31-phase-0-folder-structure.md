# Phase 0 Folder Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish an empty, self-contained application workspace with handbook-linked developer learning, task tracking and AI-agent guardrails.

**Architecture:** `development/` is the application boundary inside the existing Git repository; it is not a nested repository. It holds future application code, tests, runtime configuration and project-local documentation, while the sibling handbook remains the authoritative source of approved design.

**Tech Stack:** Documentation and directory scaffolding only; the future locked stack is Next.js + TypeScript + CSS Modules, NestJS + TypeScript, PostgreSQL + Prisma, Docker Compose, GitHub Actions and Playwright.

**Spec:** `development/docs/superpowers/specs/2026-08-31-phase-0-foundation-design.md`

## Global Constraints

- Do not create `development/.git` or any nested Git repository.
- Do not install dependencies, add package manifests, scaffold applications, create a database, or claim a business feature.
- Keep the handbook unchanged and link to it with paths relative to `development/`.
- Do not add secrets, real student data, production credentials or institutional policy values.
- Do not add Tailwind, microservices, Redis, Kafka/RabbitMQ, Kubernetes, native mobile or an AI chatbot without an approved ADR.
- Every future task requires a handbook-linked task packet, a human lead and reviewer, and a design-gap record when required authority is missing.

---

## File Structure

| Path | Responsibility |
|---|---|
| `development/apps/` | Future Next.js and NestJS applications. |
| `development/packages/` | Future contracts, UI, configuration and fictional fixtures. |
| `development/prisma/` | Future database schema, migrations and seed data. |
| `development/tests/` | Future E2E, integration, security and accessibility suites. |
| `development/docs/` | Design links, ADRs, learning notes, task packets, demo and operations records. |
| `development/AGENTS.md` | Mandatory operating rules for future AI agents. |
| `development/DESIGN-INDEX.md` | Entry map from implementation concerns to controlling handbook documents. |
| `development/docs/learning/ROTATION-LEDGER.md` | Human lead/reviewer tracking by vertical slice. |
| `development/.env.example` | Explicitly empty Phase 0 environment-variable documentation. |
| `development/docker-compose.yml` | Explicit Phase 0 placeholder for a later local-services task. |

### Task 1: Create the empty application boundaries

**Files:**
- Create: `development/apps/web/.gitkeep`
- Create: `development/apps/api/.gitkeep`
- Create: `development/packages/contracts/.gitkeep`
- Create: `development/packages/ui/.gitkeep`
- Create: `development/packages/config/.gitkeep`
- Create: `development/packages/test-fixtures/.gitkeep`
- Create: `development/prisma/migrations/.gitkeep`
- Create: `development/prisma/seed/.gitkeep`
- Create: `development/tests/e2e/.gitkeep`
- Create: `development/tests/integration/.gitkeep`
- Create: `development/tests/security/.gitkeep`
- Create: `development/tests/accessibility/.gitkeep`
- Create: `development/scripts/.gitkeep`
- Create: `development/.github/workflows/.gitkeep`
- Create: `development/.github/ISSUE_TEMPLATE/.gitkeep`

**Interfaces:**
- Consumes: the approved target structure in the specification.
- Produces: tracked empty directories for all future application boundaries.

- [ ] **Step 1: Verify the precondition**

Run: `find development -maxdepth 2 -type d | sort`

Expected: only the approved specification and plan support directories exist; no application boundary is populated.

- [ ] **Step 2: Create each directory and its `.gitkeep` marker**

Run: `mkdir -p development/{apps/{web,api},packages/{contracts,ui,config,test-fixtures},prisma/{migrations,seed},tests/{e2e,integration,security,accessibility},scripts,.github/{workflows,ISSUE_TEMPLATE}}` followed by `touch` for the listed markers.

Expected: every directory listed in **Files** exists and is trackable.

- [ ] **Step 3: Verify the directory contract**

Run: `test -d development/apps/web && test -d development/apps/api && test -d development/packages/contracts && test -d development/prisma/migrations && test -d development/tests/e2e && test -d development/.github/workflows`

Expected: exit code `0`.

- [ ] **Step 4: Verify no nested Git repository was created**

Run: `find development -type d -name .git -print`

Expected: no output.

### Task 2: Add developer and AI-agent operating documents

**Files:**
- Create: `development/README.md`
- Create: `development/AGENTS.md`
- Create: `development/CONTRIBUTING.md`
- Create: `development/SECURITY.md`
- Create: `development/DESIGN-INDEX.md`
- Create: `development/docs/learning/ROTATION-LEDGER.md`
- Create: `development/docs/task-packets/README.md`
- Create: `development/docs/adr/README.md`
- Create: `development/docs/approved-design/README.md`
- Create: `development/docs/architecture/README.md`
- Create: `development/docs/demo/README.md`
- Create: `development/docs/operations/README.md`

**Interfaces:**
- Consumes: handbook `START-HERE.md`, `AGENTS.md`, Phase 0 roadmap, development entry gate and templates.
- Produces: discoverable instructions for human developers and future AI agents, with no duplicated/invented policy.

- [ ] **Step 1: Write the application README**

Include: the application boundary, a statement that Phase 0 has no runnable application yet, the relationship to the sibling handbook, and the required reading order.

- [ ] **Step 2: Write `AGENTS.md` with mandatory guardrails**

Include: the task-packet entry gate, handbook authority order, locked stack, forbidden initial technology list, design-gap stop condition, server-side authorization expectation, testing/reporting obligations, and prohibition on altering the handbook.

- [ ] **Step 3: Write human workflow and security documents**

Include: branch/PR/peer-review and rotation expectations in `CONTRIBUTING.md`; no-secrets, fictional-data-only and disclosure guidance in `SECURITY.md`.

- [ ] **Step 4: Create the design and learning indexes**

Link `DESIGN-INDEX.md` and the documentation READMEs to their controlling handbook sources using `../../unza-sis-moodle-design-handbook-v3.0.0/` paths. Create the rotation ledger table with columns: slice, lead, reviewer, scope, review evidence, learning note, and completion date.

- [ ] **Step 5: Verify required AI-agent instructions exist**

Run: `rg -n "task packet|design gap|handbook|Tailwind|server-side|lead|reviewer" development/AGENTS.md`

Expected: each phrase appears in an explicit instruction.

### Task 3: Add safe Phase 0 configuration and metadata placeholders

**Files:**
- Create: `development/.env.example`
- Create: `development/.nvmrc`
- Create: `development/.editorconfig`
- Create: `development/.gitattributes`
- Create: `development/docker-compose.yml`

**Interfaces:**
- Consumes: Phase 0 requirement for a future reproducible environment and handbook prohibition on secrets.
- Produces: non-runnable, clearly marked placeholders for future tool-pinning and local-services tasks.

- [ ] **Step 1: Create each placeholder with an explicit Phase 0 notice**

Include in `.env.example` only comments stating that no variables are defined yet and secrets must stay local. Include in `docker-compose.yml` only a comment stating that services will be introduced by the dedicated Docker task.

- [ ] **Step 2: Set cross-platform text conventions**

Set `.editorconfig` to UTF-8, LF endings, final newline and 2-space indentation for YAML/JSON/TypeScript; set `.gitattributes` to normalize text with LF.

- [ ] **Step 3: Mark the Node version as deferred, not guessed**

Make `.nvmrc` a comment-only Phase 0 placeholder until the developers approve a pinned Node LTS version in the toolchain task.

- [ ] **Step 4: Verify safety**

Run: `rg -n -i "password|secret|token|api[_-]?key|postgres://|mysql://" development/.env.example development/docker-compose.yml`

Expected: no credential-like value; only explanatory text if any matched terms are present.

### Task 4: Run structural verification and prepare review evidence

**Files:**
- Modify: `development/docs/learning/ROTATION-LEDGER.md`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: evidence that the Phase 0 folder task met its boundary and documentation requirements.

- [ ] **Step 1: Verify all expected paths are tracked candidates**

Run: `git status --short development`

Expected: only the Phase 0 directory markers, documentation and safe metadata files appear.

- [ ] **Step 2: Verify no accidental application implementation exists**

Run: `rg --files development -g '*.{ts,tsx,js,jsx,prisma,sql}'`

Expected: no output.

- [ ] **Step 3: Verify documentation navigation**

Run: `rg -n "unza-sis-moodle-design-handbook-v3.0.0" development/{README.md,AGENTS.md,DESIGN-INDEX.md,docs/**/*.md}`

Expected: the README, AI instructions and design index each link to the handbook.

- [ ] **Step 4: Record the completed foundation task in the rotation ledger**

Add one row for “Phase 0 folder structure” with the agreed lead/reviewer fields left as `Unassigned` until Charles and Chitindu assign them; link the task plan and specification as review evidence.

- [ ] **Step 5: Perform final structural check**

Run: `find development -type d -name .git -print; git diff --check; git status --short`

Expected: no nested Git output, no whitespace errors, and only intended new foundation files.

## Plan Self-Review

- **Spec coverage:** Tasks 1–4 cover the repository boundary, target structure, learning/traceability records, AI guardrails, placeholder safety and verification requirements.
- **Placeholder scan:** No task contains `TODO`, `TBD` or an undefined implementation action. Deferred runtime choices are explicitly outside this task.
- **Consistency:** All paths are under `development/`; handbook links are relative from that application workspace; no task creates a nested repository.
