# Rotation Ledger

| Slice | Lead | Reviewer | Scope | Review evidence | Learning note | Completion date |
|---|---|---|---|---|---|---|
| Phase 0 folder structure | Charles | Chitindu Milimbo | Application boundaries and operating guidance | [spec](../superpowers/specs/2026-08-31-phase-0-foundation-design.md), [plan](../superpowers/plans/2026-08-31-phase-0-folder-structure.md) | Pending human walkthrough | Pending |
| Phase 0 toolchain (Node24+PG18) | Charles | Chitindu Milimbo | Pinned toolchain, Docker Postgres, workspaces baseline | [TASK-PH0-002](../task-packets/TASK-PH0-002.md), [ADR-001](../adr/ADR-001-toolchain.md) | [NOTE-PH0-002](./NOTE-PH0-002.md) | Pending Chitindu WSL repro |
| Phase 0 shells (Next/Nest) | Charles | Chitindu Milimbo | Official-generator web/api shells, packages, Prisma datasource | [TASK-PH0-003](../task-packets/TASK-PH0-003.md) | [NOTE-PH0-003](./NOTE-PH0-003.md) | Pending verification |
| Phase 0 tokens + UI primitives | Charles | Chitindu Milimbo | Proposed palette tokens, Status/Notice/Empty with §14.2 contracts, shell re-skin | [TASK-PH0-004](../task-packets/TASK-PH0-004.md) | [NOTE-PH0-004](./NOTE-PH0-004.md) | Pending Chitindu review |
| Phase 0 CI + templates | Charles | Chitindu Milimbo | 19.31 pipeline, PR/issue templates, protection checklist, C1/C2 corrections | [TASK-PH0-005](../task-packets/TASK-PH0-005.md) | [NOTE-PH0-005](./NOTE-PH0-005.md) | Pending Chitindu review |
| Phase 1 identity models + seed | Charles | Chitindu Milimbo | Person/Account/Role/Session/Audit tables, fictional seed, demo:reset | [TASK-PH1-001](../task-packets/TASK-PH1-001.md) | [NOTE-PH1-001](./NOTE-PH1-001.md) | Pending Chitindu review |
| Phase 1 slice-1 corrections | Charles | Chitindu Milimbo | FIX 1–5: grant columns, Credential table, contacts, audit columns, seed v0.2 | [TASK-PH1-001](../task-packets/TASK-PH1-001.md#corrections-deep-audit-branch-choreph1-001-contract-corrections) | [NOTE-PH1-001](./NOTE-PH1-001.md#corrections-fix-15-branch-choreph1-001-contract-corrections) | Pending Chitindu review |
| Phase 1 sessions + recovery + sign-in UI | Charles | Chitindu Milimbo | Sign-in/out, recovery, session cookies, sign-in UI (MFA later) | [TASK-PH1-002a](../task-packets/TASK-PH1-002a.md) | [NOTE-PH1-002a](./NOTE-PH1-002a.md) | Pending Chitindu replay (steps in note) |

Assign the lead and reviewer before implementation work begins. Swap their roles on the next vertical slice.

Standing rulings (Lead Charles): Charles stays Lead on this machine/session;
Chitindu reviews via her agents. C2 extension: PR flow deferred — local-only
branch-then-fast-forward merges until the Lead says otherwise.
