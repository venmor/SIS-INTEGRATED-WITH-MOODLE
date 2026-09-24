# Native execution ledger — plan: development/docs/superpowers/plans/2026-09-24-demo-v2-frontend-completion-program.md

Execution branch: `demo-v2-readiness`
Baseline: `4d32f6e6ea182b9128e14c7a34c21f65f8d4dfe1` (current Phase-6 `main`).
Plan commit: `d41f4f367275b5d90927a830d11162f36b8b8218`.

Ruling: connector-only repository access prevents a local git worktree / `.superpowers/sdd` workspace. Use the already isolated `demo-v2-readiness` branch, repository progress ledger, atomic commits and GitHub CI as the executable RED→GREEN environment. Cost if wrong: less local isolation; mitigated by branch isolation and full CI.

Pre-flight: Task 1 produces a shared role-aware workspace navigation model consumed by Tasks 2–3. Student and staff routes currently duplicate navigation logic; no contract conflict found.
Pre-flight: Tasks 4–5 share deterministic demo scenario identifiers; Task 4 must define stable references before Task 5 consumes them.
Pre-flight: Task 6 preview routes are consumed by Tasks 9–10 quality/rehearsal checks; preview/live boundary from the modernization spec remains authoritative.
Pre-flight: Task 8 preview maturity labels are consumed by Task 9 quality scans; no conflict found.


Task 1 baseline finding: PR CI run 36015717485 failed before Playwright because the Phase-6 baseline API e2e suite is already red: 30 failures across finance governance/callback/clearance, integration reconciliation/sync and review queue, mostly returning 503; PostgreSQL also reported duplicate `ExpiryWarning_open_key`. This is unrelated to the navigation-only branch diff and matches the red current-main CI pattern.

Task 1 Ruling: add a parallel `ui-contracts` CI job that provisions an isolated database, builds the app and runs only this programme's browser contract. Keep the existing full `verify` job unchanged so baseline failures remain visible. Cost if wrong: CI uses extra minutes, but UI RED→GREEN evidence no longer depends on unrelated Phase-6 API-suite instability.
