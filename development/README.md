# SIS--Moodle Application Workspace

This directory contains the runnable Next.js/NestJS application, shared TypeScript contracts, PostgreSQL migrations and tests. Phase 0 foundations, bounded Phase 1 identity/access, Phase 2 applicant slices 1–6 (slice 6 post-submit case committed 2026-09-21 in `e44170a`), and Phase 3 slices 1–2 (assigned review queue and evidence comparison, committed 2026-09-21 in `e44170a`) are implemented for a fictional demonstration. Human review and the full phase exit gates remain pending.

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
