# TASK-V2-FIN-001 — Bounded reconciliation queue and truthful finance workload counts

- Release: v2.0 Task 7 finance workbench increment. Lead Chitundu Milimbo; reviewer Charles Hangoma. Human institutional and release approval remain pending.
- Controlling source: exact Design Section 6 student-finance evidence §§11–22, Finance Blueprint 8 Journey B/workspace, permission matrix Part 3A, UI-TABLE-001/UI-FILTER-001/UI-SEARCH-001/UI-LOAD-001/UI-EMPTY-001, existing TASK-PH5-006 and the v2 operating-SIS spec.
- Scope: read-only workload summary from source-owned finance counts; bounded, stable reconciliation-case pages with status and oldest/newest selection under the existing active Finance Officer appointment; mobile/desktop queue navigation, stale-page recovery and clear counts. Synthetic test data only.
- Exclusions: real payments/provider calls, changing ledger or approval rules, urgency/SLA policy, bulk resolution, institutional scope policy changes, detailed reporting/export, and pagination of adjustments/arrangements/student-owned history (follow-on slices).

## Required behavior

1. The workspace count comes from database `count` queries on the exact open/awaiting-decision predicates, not downloaded row arrays. A selected Finance Approver may view their authorized adjustment/arrangement counts without gaining reconciliation-case access; other roles are denied.
2. Staff reconciliation results are limited server-side and ordered by `(createdAt,id)` in oldest/newest direction. Status filters and signed cursors are bound to the selected actor/appointment/filter/sort. A stale/tampered/mismatched cursor has a safe first-page recovery path.
3. The queue shows the applied filter, sort, page size, total matching at query time, case status/next step, and a URL-preserved next/first route. No financial details or student identity are placed in the cursor or URL. Students retain their current own-case visibility.
4. Existing case resolution remains an individual authorized operation, never a bulk queue action. No count is represented as a certified report or promise of service priority.

## Verification

Use only the isolated synthetic review database. Observe a red API test before implementation; cover stable equal-time traversal, filter/sort/actor binding, unavailable cursor, role denial and exact counts. Verify the connected staff queue at 390px, keyboard controls, existing Phase 5 finance journey, API/web builds, lint, Prisma validation and diff integrity.
