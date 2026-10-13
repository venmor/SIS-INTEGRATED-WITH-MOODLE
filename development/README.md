# SIS--Moodle Application Workspace

This directory contains the runnable Next.js/NestJS application, shared TypeScript contracts, PostgreSQL migrations and tests. The current `review/phase7-completion` worktree includes the earlier applicant, admissions, registration, finance, Moodle-simulator and assessment demonstration slices; the [Phase 7 continuation verification](docs/learning/PHASE-7-CONTINUATION-VERIFICATION.md) records the exact result-publication boundary. The approved [v2.0 specification](docs/superpowers/specs/2026-10-02-v2-operating-sis-design.md) and [execution plan](docs/superpowers/plans/2026-10-02-v2-operating-sis-plan.md) now guide the next work. Its admissions queue and read-only institution setup readiness slices are implemented in this review worktree with [current verification](docs/learning/VERIFICATION.md). Human review, institutional policy/authority and the full release gates remain pending.

**Start the current review with [the plain-language guide](docs/learning/PHASE-2-IMPLEMENTATION-REVIEW.md), then [run and demonstrate it](docs/demo/APPLICANT-WALKTHROUGH.md).** [Earlier-slice findings](docs/learning/PRIOR-PHASE-REVIEW.md) explain repairs and remaining gaps. [Handbook review](docs/learning/HANDBOOK-REVIEW.md) explains the source hierarchy and renamed evidence.

On 2026-09-20 the user authorized committing this work and integrating it into local `main`, with no pull request; the user will push. Use this checkout's `development/` directory. The original `.worktree/phase-2-slices-2-5` review environment and its local test evidence are retained. This Git authorization does not mark the pending human walkthrough or production gates complete.

The sibling [design handbook](../unza-sis-moodle-design-handbook-v3.0.0/START-HERE.md) is authoritative and must not be treated as executable code or silently changed during implementation.

## Start here

1. Read this file, [AGENTS.md](AGENTS.md), and [DESIGN-INDEX.md](DESIGN-INDEX.md).
2. Read the handbook's [Start Here](../unza-sis-moodle-design-handbook-v3.0.0/START-HERE.md), [Project Status](../unza-sis-moodle-design-handbook-v3.0.0/PROJECT-STATUS.md), and selected roadmap phase.
3. Create or load a completed task packet before planning or coding.
4. Follow the handbook's authority order and record a design gap when a required answer is absent.

## Boundaries

- `apps/`, `packages/`, `prisma/`, and `tests/` contain the application and its verification boundaries.
- `docs/` stores implementation-local traceability, ADRs, learning notes, demo, and operations records.
- This directory is not a Git repository. Use the outer repository's Git workflow.
