# TASK-V2-TIME-004 — Editable fictional timetable rule drafts

- Release: v2.0 fictional operating-university rehearsal. Lead Charles Hangoma; reviewer Chitindu Milimbo; human acceptance pending.
- Authority: user-approved synthetic-rule demonstration direction in the v2 plan; approved Design Sections 1/4, Role Blueprint 12 Part 1 §12.3, permission matrix Part 3A, UI-SAVE-001 and GAP-V2-001. This packet defines a **fictional demo appointment**, not university policy or approval.
- Actor: `DOMAIN_ADMIN` with an active `CAMPUS:DEMO-*` assignment and explicit `timetable-demo-rules-draft` capability. This role can create and read only immutable fictional timetable rule drafts for its own campus. `SYSADMIN`, unrelated staff, students, revoked/expired appointments and other campuses are denied.
- Runtime gate: `DEMO_MODE=true`, `SIS_ENABLE_TIMETABLE_DEMO_DRAFTS=true`, and a loopback PostgreSQL database whose name contains `test`, `review` or `ci`. Failure of any condition denies both read and write. The gate is checked server-side for every request.
- Outcome: a scoped staff form saves a new rule version with room turnaround, bounded occurrence count and directed campus-travel minutes. Earlier versions are retained. A duplicate request returns the same saved version; stale-version and changed-key reuse are refused. The UI distinguishes unsaved, saving, saved, conflict and uncertain outcomes.
- Boundary: drafts may be read by a later synthetic conflict preview but never authorize a schedule, registration amendment, institutional policy, result or student timetable. No approval or publication command is added. GAP-V2-001 and GAP-021 stay open.
- Exclusions: live university values/appointments, campus approval, setup publication, schedule sessions, import, timetabling override, staff/venue assignment, student disclosure, Moodle cloud and payments.

## Acceptance

1. The database stores immutable versioned drafts with creator, campus, content digest and client request ID. Only configured fields are accepted, with bounded numbers and registered `DEMO-*` campus codes.
2. Server tests cover live scope/role/capability/time checks, production/remote gate denial, repeated request, changed-key reuse, stale version, cross-campus access and invalid travel data. Audit records contain action/outcome but no full draft payload.
3. At 390px and keyboard-only, a fictional domain administrator can change the rule through the UI, save, reload and see the new version; an unauthorized actor sees no draft content. No dependency download or external data is required.
