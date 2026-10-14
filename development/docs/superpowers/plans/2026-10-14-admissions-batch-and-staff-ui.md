# Admissions workload and reference-led staff UI continuation

Approved design:2026-10-02-v2-operating-sis-design.md; user-selected visual references14October2026. Existing operating plan Task3 and Task7. Resume source state and authoritative receipts, not historical checkbox counts. Source packets TASK-V2-ADM-005 and TASK-V2-UI-009 define bounded closure; wider order is V2-COMPLETION-SEQUENCE-2026-10-14.md.

### Task 1: Complete controlled batch claiming and reference UI

- Preserve existing isolated release worktree and shared/private files.
- Run helper tests RED before implementation, then GREEN for mixed results, loss/recovery, pause, denial and rate-limit stopping.
- Implement pool selection/progress/recovery against existing per-case commands; preserve keys, authority and audit.
- Apply selected staff shell and assessment panels; keep all visible controls functional and existing form labels/API semantics.
- Add failing browser coverage for reset, loaded filtering and real plan creation before implementing the new registry controls.
- Migrate/seed only a newly created isolated PostgreSQL database. Run existing reviewAPI plus new/existing connected browser stories, full unit/type/lint/build/source checks.
- Compare actual desktop/mobile screenshots to both supplied references and record design QA and learning evidence.
- Record remaining workflow dependencies explicitly. Commit/push/merge only after fresh verification under the user's existing release authorization.

Preflight interfaces: batch browser orchestrator consumes existing claim receipts and safe errors; no bulk backend or parent transaction. Registry consumes bounded role-filtered assessment list; its filter is labelled loaded, not a global search. Shared shell consumes auth/me and original permission-specific nav; no business-authority changes. No new package or schema migration required.
