# TASK-V2-TIME-002 — Timetable conflict validation foundation

- Release: v2.0 synthetic timetable foundation. Lead Charles Hangoma; reviewer Chitindu Milimbo; human review pending.
- Authority: exact Design Section 4 timetabling boundary and cross-school delivery, Student Blueprint 2 Part 4 §§3, 8–11, Section 19 UI/security constitution, existing [GAP-021](../gaps/GAP-021-real-timetable-validation.md), and TASK-101–105 in the [v2 plan](../../plan/feature-sis-expansion-2.0.md). The user authorized a fictional operating-university demonstration, not institutional schedule publication.
- Outcome: a deterministic, source-independent validator for dated teaching occurrences. A future draft service supplies actual offering, venue, teacher and registered-student identifiers plus a versioned policy. The validator returns stable blocking issues for invalid times, missing resources, venue capacity/accessibility, venue turnover, teacher/student collisions and configured inter-campus travel. Missing travel policy fails closed.
- Exclusions: no official course-offering migration, schedule write, publication, recurrence expansion, override, student timetable disclosure, exam events or live policy appointment. The existing student page stays in `AWAITING_PUBLICATION` until the publish workflow exists.

## Verification

Tests exercise overlap, exact boundary, capacity, accessibility, room turnover, campus travel, unknown policy and order independence. No student PII appears in ordinary messages. Later TASK-101–105 must integrate this core with the offering/venue registry, draft/publish commands, scoped staff UI, official registration projection and version history before timetable completion can be claimed.
