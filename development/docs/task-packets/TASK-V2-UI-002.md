# TASK-V2-UI-002 — Admissions queue workbench presentation

## Authority and scope

- Release: v2.0 Task 7, staff work queue screen family. Lead Charles Hangoma; reviewer Chitundu Milimbo; human visual/accessibility review pending.
- Approved basis: `REQ-ADM-005`, `REQ-ADM-006`, `REQ-NFR-005`, `ACT-ADM-001`, `UI-TABLE-001`, `UI-FILTER-001`, `UI-LOAD-001`, `UI-STATUS-001`, `UI-ERROR-001`, and the UI constitution. Exact records and the supersession/readiness gates are mapped in [TASK-V2-ADM-001](TASK-V2-ADM-001.md); current UI work reread cross-blueprint Parts 2C, 3A, 4 and 5.
- Existing active role, intake/assignment scope, database filters/cursors and claim/release authority are unchanged. No new field, export, batch decision, institution policy, provider or business-data migration.

## Outcome and implementation boundary

Admissions officers compare cases in a real table at desktop width and labelled record cards when the staff sidebar would compress it. Each row shows the minimum permitted reference, state and explanation, open requests, owner/update and explicit actions. The shared workspace context presents role and scope in readable words rather than raw enum names. Scope, applied filters, sort and page count remain visible. A failed network refresh keeps the previous page labelled as potentially stale and blocks claim/release until a successful reload; opening a case still loads its authoritative detail. A 401/403 response clears previously loaded rows immediately so a revoked workspace does not retain them in the current view. A pool filter reset preserves the mandatory Submitted state.

## Acceptance

- Desktop table has caption, headings, count, sort, row action and pagination; 900px and 390px screens use labelled cards without horizontal overflow.
- Current state, reason and next action are text, with semantic color supplementary; 50 rows do not create 50 live status regions.
- A simulated queue fetch failure preserves old rows and filters, identifies that they may be out of date, disables claim/release, and recovers on refresh.
- A simulated 401/403 during refresh clears old rows and actions with a safe route to workspace access; it does not disclose whether another case exists.
- Existing scoped search, paging, stale cursor and claim/release browser journeys continue to pass. Manual screen-reader, low-bandwidth and human workbench acceptance remain open.
