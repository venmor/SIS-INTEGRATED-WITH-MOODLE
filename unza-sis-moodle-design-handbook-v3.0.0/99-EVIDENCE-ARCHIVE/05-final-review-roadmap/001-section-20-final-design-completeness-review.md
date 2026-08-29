<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: cf9ec491-ccef-543d-82a2-c6c84df38642; chronological message: 284. -->

# Section 20 — Final design-completeness review

## 20.1 Overall finding

The design is structurally strong enough to begin repository preparation, but it is not yet safe to generate the final ZIP immediately.

The main issue is not missing architecture. It is that the approved design currently exists mainly across the conversation. Before coding, it must be consolidated into versioned repository documents so neither an AI agent nor either developer depends on chat memory.

## 20.2 Coverage audit

| Design area | Status | Review finding |
|---|---|---|
| System purpose and stakeholder scope | Complete | SIS responsibilities and institutional boundaries are defined |
| User roles and workspaces | Complete | Applicant, student, teaching, administrative, support, governance and technical roles are covered |
| Role permissions and visibility | Complete | Role, scope, relationship and sensitive-record boundaries are defined |
| User journeys and action contracts | Complete | Normal, denied, failure and recovery paths are included |
| UI components and microinteractions | Complete | Approved component and screen approach exists |
| UI/UX constitution | Complete | Visual character, hierarchy, forms, statuses, privacy and accessibility rules exist |
| Academic policy handling | Architecturally complete | Actual institutional policy values remain configurable |
| Moodle integration | Complete as a design | Real Moodle availability and credentials remain undecided |
| Payments and notifications | Complete as adapter designs | Demonstration providers will initially be simulated |
| Error and recovery behaviour | Complete | Idempotency, retry, dead letters, reconciliation and evidence requirements exist |
| Acceptance testing | Complete | Normal, denial, failure, recovery, audit and accessibility paths are covered |
| Architecture | Complete | Modular monolith, module ownership, commands, events and adapters are defined |
| Technology stack | Complete | Next.js, NestJS, TypeScript, CSS Modules, PostgreSQL and Prisma are locked |
| Git and CI/CD | Complete | Short-lived branches, PR review, protected `main`, CI, staging and rollback are defined |
| Versioning | Complete | Code, API, database, events, configuration, documentation and releases are covered |
| Security controls | Substantially complete | A formal threat model and exact operational values still need to be recorded |
| Rate limiting and abuse prevention | Complete as a baseline | Limits remain configurable and must be tested |
| Redundancy and recovery | Complete as an architecture | Actual hosting-level failover depends on deployment choice |
| Codebase-bloat prevention | Complete | Dependency, module-boundary and shared-code rules exist |
| AI consistency | Complete as a protocol | Repository instruction files must now be created |
| Arch Linux/Windows compatibility | Complete | Docker, WSL 2, pinned versions and shared commands are defined |
| Team-learning process | Complete | Rotating leadership, review and learning records are defined |
| Demonstration and presentation | Complete as a plan | The exact implemented presentation scope must now be locked |
| Repository/ZIP contents | Complete as a plan | Files have not yet been assembled |

## 20.3 Important consistency checks

The review found no fundamental architectural contradictions. The following decisions are consistent:

- Next.js already uses React; React is not a separately configured application.
- Tailwind is excluded. CSS Modules and design tokens will control styling.
- NestJS owns domain workflows and APIs; Next.js owns the user interface.
- PostgreSQL is the authoritative database; Prisma manages schema and migrations.
- The system begins as a modular monolith, while preserving internal domain boundaries.
- Docker is a development/deployment tool, not another programming stack.
- Redis, Kafka, RabbitMQ, Kubernetes and microservices are excluded initially.
- Moodle, payment and notification systems are accessed through adapters.
- Infrastructure redundancy is designed for, but unnecessary services will not be added merely for demonstration.
- AI-generated code cannot override approved requirements or bypass human review.
- Arch Linux and Windows produce the same application through pinned tools, Docker and CI.

## 20.4 Remaining decisions before repository generation

### A. Presentation implementation scope — must be locked

The approved blueprint covers a very large university system. Two developers should not attempt to implement every workflow at full production depth before presentation.

Recommended presentation release:

1. Applicant account, application, document upload and submission  
2. Admissions evidence review and offer  
3. Student conversion and course registration  
4. Simulated financial charge/payment/clearance  
5. Simulated Moodle enrolment with failure and recovery  
6. Assessment staging and controlled result release  
7. Role-based access and audit timeline  
8. Basic operations/reconciliation screen  

Support, quality assurance, regulatory reporting, graduation and other modules remain fully designed and scaffolded, but may initially use smaller demonstration slices.

### B. Demonstration institution — must be defined

The seed data needs:

- Fictional institution name
- Branding colours and logo placeholder
- Academic year and semester structure
- Faculties, programmes and sample courses
- Fictional applicants, students and staff
- Demonstration grading and progression rules
- Demonstration fees
- Sample role assignments

These values must be clearly labelled as demonstration configuration, not assumed university policy.

### C. Deployment target — can remain open temporarily

The repository can be generated using Docker without choosing a hosting provider. A deployment target is needed only before the shared staging/demo environment is published.

### D. Authentication implementation detail — recommended default

Use:

- Database-backed secure sessions
- HTTP-only secure cookies
- Argon2 password hashing
- PostgreSQL-backed session records initially
- MFA-ready interfaces for privileged roles
- No Redis initially

This is consistent with the lean-stack decision.

### E. File storage implementation — recommended default

To avoid adding another service immediately:

- Use a private local-storage adapter during early development.
- Keep files outside the public web directory.
- Store only generated references in PostgreSQL.
- Use fictional documents.
- Preserve an interface that can later switch to S3-compatible storage.

### F. Non-functional targets — must be recorded

The following need explicit demonstration targets:

- Maximum upload size
- Session duration
- Rate-limit configuration
- Expected page/API response time
- Backup frequency
- Recovery point objective
- Recovery time objective
- Audit/log retention
- Supported browsers
- Accessibility conformance target
- Maximum demonstration dataset size

These should be realistic project targets, not claims of nationwide production capacity.

## 20.5 Missing security artifacts

Security principles are covered, but the repository still needs these concrete artifacts:

- Data-classification matrix
- Threat model for critical journeys
- Authorization matrix in machine-readable/testable form
- Secrets-management guide
- Security test catalogue
- Incident-response template
- Backup and restore runbook
- Dependency-review policy
- Secure coding checklist
- Logging rules specifying what must never be logged

These will be generated before feature implementation.

## 20.6 Context-preservation gate

Before any substantial code is generated, the ZIP must contain:

```text
docs/
  DESIGN-INDEX.md
  REQUIREMENTS-TRACEABILITY.md
  DECISION-REGISTER.md
  OPEN-DECISIONS.md
  CHANGELOG-DESIGN.md
  approved-design/
  architecture/
  security/
  testing/
  learning/
  demo/

AGENTS.md
apps/web/AGENTS.md
apps/api/AGENTS.md
```

Each approved rule will have an identifier and status:

```text
APPROVED
IMPLEMENTED
TESTED
DEFERRED
OPEN
SUPERSEDED
```

A decision is never silently replaced. If it changes, the register records the old decision, new decision, reason, approvers and effective version.

## 20.7 Final ZIP verification

Before handing over the ZIP, we will verify:

1. Every approved conversation section appears in the design index.
2. No design decision exists only in chat.
3. Every requirement links to a role, workflow, permission and acceptance test.
4. Every implemented feature links to code, migration, test and documentation.
5. Every deferred feature is explicitly labelled.
6. All AI instructions agree with the architecture and UI constitution.
7. Arch Linux and Windows/WSL setup instructions produce equivalent environments.
8. The repository contains no secrets or personal data.
9. The demonstration data resets successfully.
10. The application builds, starts and passes its baseline checks.

## 20.8 Review decision

The design is:

> **Approved for repository-document consolidation, with implementation scope and demonstration configuration still to be locked before full feature coding.**

The immediate next step is to lock the **presentation MVP and fictional demonstration institution**, then generate the complete design-controlled base repository and ZIP.

---

## Following user responses before the next design record

### User message 0285

You may proceed
