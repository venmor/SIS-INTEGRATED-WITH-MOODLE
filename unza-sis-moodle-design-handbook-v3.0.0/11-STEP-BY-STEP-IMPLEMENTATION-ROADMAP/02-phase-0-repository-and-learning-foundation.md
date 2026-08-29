# Step 1 — Phase 0: Repository and Learning Foundation

**Release target:** v0.1.0

## User/system outcome

A future application repository can be cloned and run consistently on Arch Linux and Windows/WSL, with documentation memory, protected workflow, CI checks and an approved empty UI shell.

## Read before planning

- Locked stack/repository baseline
- Git/versioning/CI/CD rules
- Cross-platform rules
- UI/UX Constitution
- AI context and task-packet protocol

## Learning goals

- Git branches, PRs, reviews and worktrees
- TypeScript fundamentals
- Node/package/lockfile concepts
- Docker Compose and PostgreSQL basics
- Unit versus browser tests

## Ordered delivery slices

1. Create repository folders and root instructions
2. Pin tools, configure Docker Compose and synthetic seed/reset approach
3. Create Next.js/NestJS shells and shared contract/config locations
4. Add design tokens/basic approved UI components
5. Add CI checks, templates, branch protection guidance and first ADRs

## Security, integrity and recovery focus

- No secrets in repository
- Secure development defaults and dependency review
- Synthetic fixtures only
- Minimal dependency set

## Required proof

- Fresh clone/install/start on both operating systems
- Formatting/type/test/build checks in CI
- UI shell keyboard and responsive smoke test
- No forbidden stack/dependency check

## Team rotation and documentation

First lead sets up one half of the foundation; the reviewer reproduces it on the other OS and documents every difference. Swap for the CI/documentation half.

## Demonstration checkpoint

Show a clean clone, containers, checks and the same simple approved shell on both laptops.

## Exit gate

- Both environments reproducible
- Protected PR workflow proven
- Repository memory files present
- No business feature claimed
