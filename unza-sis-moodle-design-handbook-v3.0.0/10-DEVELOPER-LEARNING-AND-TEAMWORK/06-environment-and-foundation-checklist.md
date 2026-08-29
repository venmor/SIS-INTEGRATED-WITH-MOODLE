# Environment and Foundation Checklist

## Shared rules

- Same pinned Node.js LTS version and package manager
- One committed lockfile
- Docker Compose for PostgreSQL and supporting local services
- `.env.example` documents names only; real secrets stay local
- LF line endings through repository attributes; case-sensitive import names
- UTC in storage/logs with configured institutional timezone in UI/policy
- Commands run through repository scripts rather than OS-specific instructions

## Charles — Arch Linux

- Install Git, container engine/Compose, pinned Node tool manager and editor.
- Verify file permissions do not create root-owned project files.
- Run the same repository scripts used by CI.

## Chitindu — Windows

- Use WSL2 and Docker Desktop/compatible container runtime.
- Clone and run the repository inside the WSL Linux filesystem for performance and case consistency.
- Configure Git/editor for LF and avoid editing generated dependencies across Windows/WSL boundaries.

## Proof before Phase 1

Both developers can clone, install, start containers, run checks/tests, create isolated branches/worktrees, open/review a PR and restore/reset fictional demo data using the documented commands.
