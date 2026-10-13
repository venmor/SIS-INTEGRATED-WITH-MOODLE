# TASK-V2-SUPPORT-006 — Adviser academic-support workload summary

- Release: v2.0 Task 6 and Task 8 reporting foundation. Implementation lead Charles Hangoma; reviewer Chitindu Milimbo. Live service authority remains open in GAP-V2-002.
- Authority: exact Adviser Blueprint 4 Part 1 §5.3, Design Section 12B, cross-blueprint UI queue/freshness and permission/visibility Parts 3A/3B; TASK-V2-SUPPORT-001–005.
- Scope: exact, source-owned operational counts for the selected academic-adviser appointment, shown above its bounded request queue. Counts include open cases, cases needing an adviser reply, student completion claims awaiting confirmation, active actions past their chosen target date, and completed cases. Each count links to an existing scoped filtered queue.
- Exclusions: student risk score, unapproved response-time target, staff ranking, institutional/Dean reporting, sensitive service joins, CSV/PDF export, contact delivery or live-service activation. Export needs separate purpose, permission, retention and download controls under TASK-074.

## Required behavior

1. Recheck selected effective `ADVISER` assignment, capability and programme scope on the server; every count is constrained to that appointment's academic cases. A different role or expired appointment is denied, and an unrelated appointment receives zero.
2. Counts are computed in PostgreSQL from current request/action states in one consistent read. The response includes an as-of timestamp, concise metric definitions and source identification. Past target uses the Africa/Lusaka date and denotes a chosen action date, not an approved escalation or student-risk rule.
3. The page presents the figures as actionable work categories with labels and links, a visible refresh time, clear unavailable state, and no names or private narrative in the summary. A 390px screen has no horizontal overflow.
4. The API read is audited. Changes to a case or action update the next read; no cached stale values are presented as live.

## Verification

Use only the isolated synthetic review database. Observe a failing API test before implementation. Test count changes across request, reply, action claim/confirmation, past date and closure; role/appointment denial and unrelated zero; audit. Run focused API and connected browser suites, API/web builds, lint and diff checks.
