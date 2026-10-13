# TASK-V2-SUPPORT-003 — Agreed academic follow-up action

- Release: v2.0 Task 6 student-support increment. Implementation lead Charles Hangoma; reviewer Chitindu Milimbo. Institutional service ownership and policy remain open under GAP-V2-002.
- Authority: exact Student Blueprint 2 Part 6 §7, Adviser Blueprint 4 Parts 1–2 §§4/6, Design Sections 8 and 12B, permission/visibility Parts 3A/3B, existing TASK-V2-SUPPORT-001/002 and the approved v2 operating-SIS design.
- Scope: one student-visible academic action within a synthetic student-initiated academic-support request. The appointed adviser proposes a clear task and date; the student accepts or declines; the student may claim completion; the adviser confirms completion. Each transition is persisted with actor, timestamp and audit. Both workspaces show current state and due date.
- Exclusions: real appointment booking, calendar-capacity checks, counselling/welfare/discipline, automated observations or risk scores, external notifications, institutional SLA/escalation, reassignment and live service activation. No action changes registration, grades, fees or Moodle.

## Required behavior

1. The currently selected, live adviser appointment must own the academic request. The student may access and respond only through their own active student workspace. Demo mode and a demo-only receiving service remain mandatory for writes. Other roles and unrelated students are denied.
2. A proposal has a short student-visible title, explanation, due date and secure destination from a small, approved set of existing SIS routes. The student may decline without adverse label. A due date is a chosen academic follow-up target, not an institutional service promise or booked appointment.
3. Only one active action is allowed per request in this slice. Proposal, response, completion claim and adviser confirmation are idempotent and preserve prior events. Concurrent or stale transitions fail with a current-state explanation. The adviser cannot mark a student task complete on the student's behalf.
4. The student and adviser detail pages show who owns the next step, current status, due date, action link and a visible unavailable/overdue state. No private staff note or restricted service data enters the general case view.

## Verification

Use the isolated synthetic review DB. Observe a failing API test first. Cover allow/deny, ownership change, replay/conflict, accepted/declined/completed paths, due-date and route validation, demo-off denial, audit/event persistence and the 390px connected student/adviser browser journey. Run Prisma validation/migration, focused support regression, API/web builds, lint and diff checks.
