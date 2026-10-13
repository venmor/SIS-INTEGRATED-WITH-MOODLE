# TASK-V2-TIME-006 — Synthetic master and course timetable previews

- Release: v2 fictional operating-university rehearsal. Lead Charles Hangoma; reviewer Chitindu Milimbo; human acceptance pending.
- Decision: [ADR-004](../adr/ADR-004-synthetic-timetable-planning-contract.md). One period-wide saved master draft is the source; course previews are filtered projections of its exact version, never independent edits.
- Gate: TIME-004 demo switches and loopback review/test database. A fictional `TIMETABLE_COORDINATOR` with `SYSTEM:DEMO-UNIVERSITY` scope and `timetable-demo-master-draft` capability prepares and reads the period-wide draft; campus domain administrators continue to edit only their rule drafts. No live institutional appointment or student disclosure.
- Inputs: complete saved rule version, period, section, venue, dated occurrence, active section/offering teaching appointment, and explicit registered-course IDs mapped to the section. Server resolves capacity, campus and participants, never trusts display facts from the browser.
- Output: bounded master list and conflict report; course filter shows the same sessions/version. Missing or changed source links, unscheduled sections, incomplete or contradictory roster mapping, seats below enrolled learners, policy, capacity, access, travel and collisions are blocking. A whole-master finding remains visible in every course projection. Preview status is `BLOCKED` or `CONFLICT_FREE_FOR_REVIEW`, never `PUBLISHED`.
- Recovery: immutable versions, idempotent save, stale-version 409, scope and revocation recheck, no contact/support/finance fields, clear uncertain-state reload. A later publication workflow must revalidate and independently approve before students see sessions.

## Acceptance

1. A scheduler can add/edit dated sessions through a keyboard-accessible form and save a new version; master and per-course views render from the same row without drift.
2. Cross-course room/teacher/student conflicts show exact session references and block review-readiness. A missing roster or teaching appointment cannot be presented as conflict-free.
3. Connected tests cover scope, link integrity, conflict, retry/stale, append-only history and student denial. Browser tests cover master/course switching at 390px and version history. No external data is used. This slice does not itself close independent approval, publication, student visibility or live policy authority.
4. A reproducible larger sample shows 12 courses/24 sessions across five days and four rooms, with summary, daily filter, ten-row paging and course projection. Fixture creation cannot create official student enrolments; repeated sample saves remain idempotent.
