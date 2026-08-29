<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 877bcc30-c5c7-54d6-95cd-c3af809a69ca; chronological message: 277. -->

# Section 19, Part 5C — Traceability, learning records and presentation evidence

## 19.52 Single source of truth

The future repository will include a `docs/DESIGN-INDEX.md` file.

It will list every approved decision, its identifier, source document, implementation status, tests, pull request, and release.

| ID | Decision | Implementation | Proof |
|---|---|---|---|
| UX-001 | UI/UX constitution | Pending | Screen review + E2E tests |
| ARCH-001 | Modular monolith | Pending | ADR + module boundaries |
| STACK-001 | Next.js, NestJS, PostgreSQL, Prisma | Pending | Repository setup |
| SEC-001 | Server-side role/scope authorization | Pending | Allow/deny tests |
| RES-001 | Idempotency, retries and recovery | Pending | Recovery tests |
| DEV-001 | Protected `main`, PR review and CI | Pending | GitHub branch settings |
| AI-001 | Task packets and `AGENTS.md` rules | Pending | PR/task evidence |
| OPS-001 | Arch/Windows shared Docker workflow | Pending | Setup verification |

Nothing is considered “discussed but forgotten.” It is either recorded, linked to code/tests, or marked as an open design decision.

## 19.53 Implementation task packet

Every task will be created from this template:

```text
Task ID:
Title:
Phase:
Requirement/action/screen IDs:
Module owner:
Lead developer:
Reviewer:
User role and scope:
User outcome:
Relevant UI rules:
Relevant policy/configuration:
API command/response:
Database entities/migration:
Authorization rules:
Audit events:
Failure/recovery behaviour:
Rate-limit/idempotency considerations:
Tests required:
Documentation/ADR updates:
Out of scope:
Definition of done:
```

This packet becomes the GitHub Issue description and is linked from the pull request.

## 19.54 Learning record for both developers

Each completed task creates a short learning note:

```text
What we built:
Why it belongs in this module:
Frontend explanation:
Backend explanation:
Database explanation:
Security/authorization explanation:
Tests and what they prove:
What failed or confused us:
New terms learned:
Questions to revise before presentation:
```

This keeps Charles and Chitindu able to explain the project from high-level architecture down to individual code decisions.

## 19.55 Required diagrams

The final documentation and presentation pack will include only useful diagrams:

1. System context: users, SIS, Moodle, payment simulation and notifications.
2. Modular-monolith boundaries.
3. Applicant-to-student journey.
4. Results-governance journey.
5. Authentication and authorization decision flow.
6. Integration failure/retry/reconciliation flow.
7. Git branch → PR → CI → staging → release flow.
8. Database ER diagram for implemented modules.

Each diagram links to the workflows and code it represents.

## 19.56 Demonstration environment

The presentation system will include a fictional, resettable demonstration institution.

It will provide:

- Fictional applicants, students, staff and roles
- Programmes, courses, academic periods and configured rules
- Sample documents without personal data
- Simulated payment events
- Simulated Moodle enrolment and failure/recovery event
- Sample marks and controlled result-release scenario
- Audit events and notifications
- A reset command returning the system to a known presentation state

No live university data, real payment provider, or actual Moodle credentials are required.

## 19.57 Presentation structure

Your presentation should be built around evidence, not a long menu tour.

1. **Problem and architecture**  
   Why a student information system needs controlled roles, academic policies, audit history and integrations.

2. **Technology and delivery approach**  
   Lean TypeScript stack, modular monolith, Docker, Git workflow, CI/CD, cross-platform setup.

3. **Three live stories**  
   - Applicant account → application → submission receipt  
   - Staff review/controlled academic process  
   - Failed integration → retry/reconciliation → audit evidence  

4. **Security and quality proof**  
   Role denial, rate limit, audit timeline, tests in CI, backup/restore evidence.

5. **Team learning and contribution evidence**  
   Task packets, ADRs, pull requests, reviewer rotation, learning notes.

This lets each of you answer questions such as:

- Why did you choose this stack?
- Why not microservices?
- How do you stop unauthorized access?
- What happens if Moodle or payment processing fails?
- How do you avoid duplicate submissions?
- How do both developers work safely on different computers?
- How do you know an AI-generated change is correct?
- How do you deploy and roll back?

## 19.58 Final completeness review before ZIP generation

Before we generate the ZIP, we will use a formal checklist:

- Every approved role/workflow/action is indexed.
- UI/UX constitution and screen families are recorded.
- Module ownership and integration contracts are explicit.
- Stack, repository layout and development phases are included.
- Git, versioning, CI/CD and rollback rules are included.
- Authentication, authorization, rate limiting, file security and audit controls are included.
- Redundancy, backups, restore tests, retry/reconciliation and incident handling are included.
- AI task-packet, repository-memory and review rules are included.
- Arch Linux and Windows setup rules are included.
- Demo data, presentation stories, diagrams and evidence pack are included.
- Open policy decisions are clearly labelled—not silently assumed.
- All items are traceable to implementation tasks and acceptance tests.

Next is **Section 19, Part 6: the base-repository creation plan**—the exact order we will use to create, configure, document and validate the final ZIP.

---

## Following user responses before the next design record

### User message 0278

Proceed,did you do section 19 part 5Part 5: team task packets, learning documentation, AI-agent boundaries, and the presentation/demo evidence pack.
