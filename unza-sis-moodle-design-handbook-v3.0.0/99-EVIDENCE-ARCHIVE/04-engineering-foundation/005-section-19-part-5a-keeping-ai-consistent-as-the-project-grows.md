<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: aa341185-b6a0-53be-8825-c149b86d6a93; chronological message: 274. -->

Yes—AI context loss is a real project risk. The answer is not “give AI a longer prompt.” The answer is to make the repository itself carry the project’s memory.

And Arch Linux vs Windows is manageable: the codebase stays the same, but both developers need the same containerized tools and commands.

# Section 19, Part 5A — Keeping AI consistent as the project grows

## The rule: AI never starts from memory alone

Every AI task must begin with a small, authoritative task packet stored in the repository:

```text
Task ID: APP-101
Requirement/action IDs: ACT-APP-001, SCR-APP-003
Module: admissions
Role/scope: applicant / own application only
Relevant design rules: UI Constitution §§19.1–19.14
API contract: POST /v1/applications/:id/draft
Database entities: Application, ApplicationDocument, AuditEvent
Permission rule: applicant can edit own DRAFT only
States: DRAFT → SUBMITTED; no reverse transition
Tests required: unit, API deny test, E2E draft-save test
Out of scope: admissions review, offer decision, payment
```

The AI receives only the rules relevant to that task—not the entire project.

## Repository memory files

Keep short, living instructions in predictable locations:

```text
AGENTS.md                         # whole-project rules for AI and humans
docs/architecture/overview.md     # system boundaries
docs/approved-design/             # approved workflows and UI rules
docs/adr/                         # why important choices were made
apps/web/AGENTS.md                # frontend-specific rules
apps/api/AGENTS.md                # backend-specific rules
apps/api/src/admissions/README.md # module purpose and boundaries
packages/contracts/README.md      # API/event rules
```

`AGENTS.md` should state the non-negotiables:

- Use approved task packets and requirement IDs.
- Do not invent roles, pages, policies, status values or UI patterns.
- Server-side authorization is mandatory.
- Do not write across module boundaries.
- Use CSS Modules; Tailwind is excluded.
- Use Prisma migrations; never alter shared databases manually.
- Add tests before claiming completion.
- Raise a design-gap issue instead of guessing.
- Keep dependencies minimal.
- Update traceability and module documentation.

This is how an AI working months later still follows the same system rules.

## Pattern enforcement, not just written rules

Documentation tells the AI what to do. Automated checks stop inconsistent code from entering the project.

| Risk | Guardrail |
|---|---|
| AI adds random UI style | CSS Modules/design-token rules and UI review |
| AI bypasses permission checks | Authorization tests and NestJS guards |
| AI invents API response shapes | Shared contracts and OpenAPI checks |
| AI makes direct cross-module DB edits | Module-boundary code review and architecture tests |
| AI duplicates types | Shared `contracts` package |
| AI adds packages carelessly | Dependency-review rule in PR template |
| AI forgets error states | Screen definition-of-done and Playwright tests |
| AI changes policy in code | Versioned configuration and policy tests |
| AI introduces dead code | Linting, type checks, review and phase cleanup |
| AI ignores existing decisions | ADR link required in task packet |

## Small vertical slices

Never ask an AI: “Build the admissions module.”

Ask:

> “Implement applicant draft saving for `ACT-APP-001`, following task packet `APP-101`. Do not touch admissions review, offers, payment, or unrelated pages.”

Small tasks preserve context, make review realistic, and prevent one AI change from spreading through the whole codebase.

## Human ownership still matters

AI can write code, explain code, create tests, and suggest improvements. But Charles and Chitindu must always:

1. Read the task packet first.
2. Understand the generated change.
3. Run it locally.
4. Review the pull request.
5. Check it against the approved workflow.
6. Merge only if tests and documentation are complete.

If neither of you can explain a generated change, it does not merge yet. Ask AI to explain it at three levels:

- Plain English: what it does.
- Architecture: which module, API, data, permission and event it affects.
- Code: file-by-file explanation and test reasoning.

That turns AI into a tutor and accelerator, rather than an uncontrolled code generator.

# Section 19, Part 5B — Arch Linux and Windows development

There is a difference in operating systems, but it should not create a difference in the system you build.

Use this model:

| Developer | Recommended setup |
|---|---|
| Charles — Arch Linux | Native Git, Node.js, Docker Engine/Docker Compose |
| Chitindu — Windows | Git + VS Code + Docker Desktop using the WSL 2 backend |

For Windows, Chitindu should work inside a **WSL 2 Linux project folder**, not a Windows-mounted folder such as `C:\...`. This avoids common problems with file watching, permissions, Docker mounts, and slow dependency installation.

Both of you then run the same commands:

```bash
docker compose up
npm install
npm run dev
npm run test
npm run lint
npm run build
```

## Rules that prevent OS conflicts

- Pin the Node.js version in the repository.
- Commit one package lockfile only.
- Use Docker Compose for PostgreSQL and supporting local services.
- Keep environment examples in `.env.example`; each developer creates their own `.env`.
- Use LF line endings in Git.
- Never hard-code paths such as `/home/charles/...` or `C:\Users\...`.
- Use cross-platform Node scripts, not OS-specific shell scripts.
- Test primarily in Docker/CI, because that is the shared environment.
- Do not commit generated files, `node_modules`, local databases, or personal IDE settings.

Add these files early:

```text
.nvmrc                 # exact Node version
.editorconfig           # indentation and LF line endings
.gitattributes          # line-ending policy
.env.example            # required environment names only
docker-compose.yml      # shared local database/services
README.md               # one setup guide for both operating systems
```

So: Arch and Windows are different development surfaces, but Docker, Git, the lockfile, CI, and shared commands make the actual project consistent.

---

## Following user responses before the next design record

### User message 0275

Alright great remember also to remember everything we have discussed so that no context is lost during zip generation.

We will run a check at the end to verify all designs and discussed things.

We may proceed
