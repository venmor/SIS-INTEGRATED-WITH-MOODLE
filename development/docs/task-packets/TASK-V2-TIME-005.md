# TASK-V2-TIME-005 — Complete fictional teaching-window rule drafts

- Release: v2 fictional operating-university rehearsal. Lead Charles Hangoma; reviewer Chitindu Milimbo; human acceptance pending.
- Decision: [ADR-004](../adr/ADR-004-synthetic-timetable-planning-contract.md) rejects free-text session entry and first closes the missing teaching-window policy prerequisite.
- Actor/gate: TIME-004's active `CAMPUS:DEMO-*` `DOMAIN_ADMIN`, `timetable-demo-rules-draft` capability, both demo switches and a loopback review/test database. No institutional rule or publication authority is granted.
- Outcome: a new immutable rule version identifies its academic period, inclusive teaching dates, permitted weekdays and daily hours, maximum session duration, room turnaround, preview size and directed campus-travel minutes. Earlier versions stay immutable and are marked incomplete for dated planning.
- Validation: check the period exists, dates are real and ordered, hours are ordered, weekday set is nonempty and unique, and numeric limits are bounded. Enforce these on the server and SQL where possible. Stale/replayed saves retain TIME-004's recovery contract.
- Exclusions: teaching schedule sessions, actual section/venue/teacher/roster linkage, approval, publication, student visibility, Moodle and payments. These remain explicit next steps under ADR-004 and TASK-101–105.

## Acceptance

1. The campus scheduler can edit every fictional timetable rule through the setup screen, save a new version and see its period/window/history; no code edit or seed reset is required.
2. The API rejects invalid dates, hours, weekdays, period IDs, changed-key reuse and stale versions. Old versions remain readable but cannot be treated as a complete dated-planning policy.
3. API and 390px browser checks cover allowed/denied access, save/reload, explicit draft state and an uncertain response. No external data or package download is required.
