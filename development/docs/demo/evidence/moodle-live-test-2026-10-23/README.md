# Moodle Integration Evidence — 2026-10-23

Captured from the local SIS at `http://localhost:3100` using fictional accounts and the isolated `sis_browser_test` database. The API health endpoint returned HTTP 200. The active backend was `MOODLE-SIM-v1` / simulator.

## Screenshots

| File | Evidence shown |
|---|---|
| `01-student-moodle-course-access-pending.png` | Student dashboard: registration is complete for three courses; Moodle access is still unassigned. |
| `02-student-registration-to-moodle-handoff.png` | Student course-registration view: the SIS/Moodle handoff message and registered study context. |
| `03-admin-moodle-integration-overview-simulator.png` | Moodle administrator dashboard: simulator health and explicitly labelled simulator course-shell records. |
| `04-admin-live-test-setup-fail-closed-gate.png` | Moodle connection setup: simulator mode, no prepared live run, and no selected source records. |
| `05-admin-delegated-moodle-access-workbench.png` | Admin access workbench and its current backend/readiness notice. |

## Evidence boundary

These images show the local SIS Moodle integration workflow and its fail-closed live-test gate. They do **not** prove a MoodleCloud course, user, enrolment, group, or grade was created or changed. No live write was attempted. The read-only Moodle identity preflight was not completed in this capture session: its local hidden-token prompt was cancelled without submitting a request.

The available fixture accounts cover a student and a Moodle administrator. This capture set does not include a separate Moodle teaching-staff account, so it must not be described as staff-course access evidence.
