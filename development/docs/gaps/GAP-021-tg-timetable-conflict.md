# GAP-021: timetable-conflict validation for TG allocation

- Date: 2026-09-24. Phase: 6 slice 0 (TASK-PH6-000).
- Rule: Blueprint 5 §5.3 — TG allocation "cannot move students in a
  way that creates timetable conflict … without validation"; §10 —
  "timetable … checked before activation".
- Fact: no timetable source model exists in any implemented phase
  (courses carry a semester label only; no sessions, venues, or times).
- Effect: TG allocation enforces capacity, registration, duplicate and
  tutor-presence guards, but cannot check timetable conflicts.
- Stop rule applied: no invented timetable. This gap blocks any claim
  of full §5.3/§10 compliance; demo allocations are explicitly
  timetable-unchecked.
- Resolve by: introducing a timetable source (future academic-delivery
  work) and wiring its check into allocation + activation, with tests.
