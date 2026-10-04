# TASK-V2-TIME-001 — Student timetable availability and registered-course source

## Authority and gap

- Release: v2.0 teaching/timetable foundation. Lead Charles Hangoma; reviewer Chitundu Milimbo; human review pending.
- Source: exact [Role Blueprint 2 Part 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/015-role-blueprint-2-new-student-and-continuing-undergraduate-student.md) §§3, 8–11, [Design Section 4](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/004-design-section-4-curriculum-programmes-and-academic-delivery.md) timetabling boundary, current `TASK-PH4-005`, UI constitution, security/recovery source and supersession register.
- The existing `GET /registration/timetable` projects the official course roster under its existing student-owner or explicit Records Officer attempt gate but has no dated class activities. [GAP-021](../gaps/GAP-021-real-timetable-validation.md) and TASK-101–104 still block an actual published teaching timetable: venue/resource registry, scheduled sessions, conflict checks, publication authority and version history are missing. The current interim tutorial-group `meetingPattern` string is not an authoritative timetable source.

## User outcome

The student portal offers **My timetable**. Before formal registration, the page names registration as the next step. After registration, it names the timetable publication as pending and lists only the courses from the current official roster. It says plainly that class times, rooms and meeting links are unavailable; it never guesses them from the course list or tutorial-group strings. Service failure is distinct from normal publication delay. The page has a simple HTML list usable on mobile, keyboard and low-bandwidth connections.

## Contract and tests

- The existing authenticated endpoint continues to return 404 `TIMETABLE_NOT_AVAILABLE` before registration; after registration it returns the official roster with `publicationStatus: AWAITING_PUBLICATION` and a read timestamp. No schedule time or room is represented as published.
- The student web route uses the existing session cookie and registration owner checks; it does not widen the API's existing Records Officer gate. No timetable data is stored in browser storage.
- API tests cover pre-registration absence, published-registration source roster, neutral foreign access and no invented sessions. Browser test covers before/after registration, link and 390px view.
- This is **not** timetable publication, conflict detection, venue booking, exam scheduling, calendar download, or Moodle handoff. Those remain separate slices and gates.
