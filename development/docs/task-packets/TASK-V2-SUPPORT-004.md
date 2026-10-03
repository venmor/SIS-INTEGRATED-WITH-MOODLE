# TASK-V2-SUPPORT-004 — Assigned follow-up worklist

- Release: v2.0 Task 6 student-support increment. Implementation lead Charles Hangoma; reviewer Chitindu Milimbo. Live service ownership and policy remain open in GAP-V2-002.
- Authority: exact Design Section 12B; Adviser Blueprint 4 Parts 1–2; Student Blueprint 2 Part 6; cross-blueprint action/queue, permission, security, recovery and UI records; TASK-V2-SUPPORT-001–003.
- Scope: a bounded, appointment-scoped read-only worklist of active academic actions, ordered by chosen target date, with filters for all open, past target date and student-claimed completion awaiting adviser confirmation. Link each row to the existing governed case action.
- Exclusions: no automatic risk label, service SLA, reminder, notification, supervisor escalation, adviser reassignment, appointment booking, counselling disclosure or live-service activation.

## Required behavior

1. Only the selected effective adviser appointment with `academic.support.receive` may read its own cases. Account, role, capability and programme scope are rechecked on the server. Unrelated appointments receive no rows.
2. Filtering and pagination happen in PostgreSQL. Pages are bounded to 50 or fewer, ordered by target date then stable ID; a cursor is rejected if it no longer belongs to the selected appointment and filter. A status transition during paging must not expose another case.
3. Each row shows the student, case reference, student-visible action, target date, status and who has the next step. A past target date is labelled as such, without implying an institution-approved escalation or that the student is at risk.
4. The existing request queue links to the worklist. At 390px the list remains usable without horizontal scrolling, and empty/error states explain what to do.

## Verification

Use the isolated synthetic review database. Observe an API test failing before implementation. Cover all filters, stable page traversal, stale/foreign cursor rejection and role/scope denial. Exercise the connected adviser browser view at 390px. Run Prisma validation/migration, focused support API regression, API/web builds, lint and diff checks.
