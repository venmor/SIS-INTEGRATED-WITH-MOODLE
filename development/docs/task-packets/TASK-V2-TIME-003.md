# TASK-V2-TIME-003 — Draft academic-delivery identities

- Release: v2.0 timetable/academic-delivery foundation. Lead Charles Hangoma; reviewer Chitindu Milimbo; human acceptance pending.
- Authority: approved Design Sections 1 and 4, Student Blueprint 2 Part 4 §§3 and 10, TASK-101–104, GAP-021 and GAP-V2-001. The user authorized synthetic operating-university configuration for demonstration, not institutional appointments or publication.
- Outcome: additive, relational identities for effective-dated institutional units and relationships, course versions, period-bound delivery offerings and sections, physical buildings and venues. Draft records can later be validated against these identities; no string slot or programme offering is promoted to a teaching schedule.
- Legacy rule: existing `Course`, `AcademicPeriod`, `ProgrammeOffering`, `CourseRegistration`, tutorial groups and assignments retain their records and behavior. No automatic mapping from course-only registrations or tutorial-group meeting text to a new offering or section. Reconciliation must be explicit and audited before any official timetable projection.
- Authority boundary: the migration introduces storage, not an API or permission to create, approve or publish institutional structure, academic offerings or timetables. All new rows default to draft state where relevant. GAP-V2-001 remains open.
- Exclusions: schedule occurrences, recurrence, booking, conflict-service integration, import, staff setup UI, offering activation, publication, exam venue assignment and student disclosure.

## Verification

Validate Prisma and deploy the additive migration to a fresh, isolated synthetic database. Assert foreign keys reject orphan sections and venues, and verify existing applicant/registration API unit suites plus the timetable validator. Do not migrate or rewrite a shared database to demonstrate this foundation.
