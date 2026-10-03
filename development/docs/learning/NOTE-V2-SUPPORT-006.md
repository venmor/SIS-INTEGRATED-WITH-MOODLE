# Adviser workload summary — verification note

`TASK-V2-SUPPORT-006` adds a source-owned, read-only summary for the selected adviser appointment. Counts are computed in one repeatable-read database transaction; the response includes source, definition version, time and Zambia target-date zone. The UI links each count to a real scoped queue. Failed reads show an unavailable notice instead of a false zero. `OPEN` is an explicit queue filter.

Focused API end-to-end verification: `academic-support.e2e-spec.ts` passed 9/9 tests against the isolated synthetic PostgreSQL database on 2026-10-04. The new test covers count transitions, unrelated and revoked adviser isolation, student denial and audit. The connected academic-support/student-portal browser run passed 4/4 journeys on the same review database. Human terminology review and production load evidence remain pending. This is not a risk score or institutional service-level report.
