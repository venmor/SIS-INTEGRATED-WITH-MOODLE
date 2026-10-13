# MoodleCloud administrative demonstration — 2026-10-13

The owner configured the **SIS Demonstration** external service and replacement token locally. A fresh identity preflight confirmed the selected MoodleCloud site (site ID 1), release `5.2.2 (Build: 20260810)`, and all nine required functions. Category 3 resolves to **SIS Demonstration**. The owner supplied Student role 5 and Teacher role 3, and a portal screenshot showing 2 of 50 active users and a trial ending 22 October 2026.

## Corrected enrolment check

The first execution created four generated users and twelve public-catalogue course shells, then stopped before enrolment. The tool incorrectly treated an empty `core_enrol_get_course_enrolment_methods` response as proof that manual enrolment was disabled.

Moodle 5.2's [method-list implementation](https://github.com/moodle/moodle/blob/MOODLE_502_STABLE/public/enrol/externallib.php) includes only plugins returning `get_enrol_info()`. The manual plugin inherits the base implementation returning null. This projection therefore cannot certify that a manual instance is missing. The [manual enrolment endpoint](https://github.com/moodle/moodle/blob/MOODLE_502_STABLE/public/enrol/manual/externallib.php) checks course context, enrolment capability, assignable role, active user and an enabled manual instance before committing its transaction.

Decision: remove the incorrect method-list gate. Keep the target/category/manifest ownership checks, server-enforced manual enrolment command, private pending receipt, and independent read-back of the intended user's exact role. An uncertain or rejected command still cannot be silently retried. The lifecycle mock now returns an empty method list, matching Moodle's actual contract: the previous implementation failed three lifecycle/recovery checks, and the corrected implementation passes all 14 tests. `git diff --check` also passes.

## Scope

This administrative CLI populates the existing demonstration site. It does not establish that ordinary SIS registration events automatically deliver through the separately deferred live integration worker. Tokens, passwords, target configuration and receipts remain in ignored local files.

## Remote outcome

Four generated users, twelve courses and all 48 intended memberships are confirmed. A later interrupted enrolment was found in the remote membership read and reconciled before resuming; no duplicate create was required. After the owner added the exact course-update and user-course-list functions, the twelve owned course shells were published. Fresh course reads confirm visibility, and administrative course-list reads confirm twelve courses for each of `sis.demo.chanda.mulenga`, `sis.demo.bwalya.mwansa`, `sis.demo.mutale.banda` and `sis.demo.nasilele.tembo`.

The generated-account authentication request to `/login/token.php` returned HTTP 403. This does not prove that ordinary browser login fails or succeeds. Browser learner access and automatic SIS delivery are explicitly unverified in the retained publication result. No course activities, grade exchange, SSO, attendance or automatic registration-driven provisioning is certified by this catalogue batch.
