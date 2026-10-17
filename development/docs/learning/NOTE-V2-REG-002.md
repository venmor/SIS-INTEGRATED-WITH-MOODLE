# Registration completion and current readiness

17 October 2026. We use TASK-V2-REG-002 with the original Phase 4 readiness/registration packets and exact Student Blueprint 2 Parts 1 and 4. Charles Hangoma leads; Chitundu Milimbo reviews. Human presentation acceptance remains pending.

We found three implementation defects: readiness retained the original course/declaration placeholders after the actual registration slice existed; planning silently selected the latest curriculum instead of the student's assigned version; Records reads checked a role but omitted its intake scope. We reproduced these against an isolated PostgreSQL database before changing the implementation.

We now resolve the live selected appointment and owned attempt once for readiness and the other registration routes. Student scopes accept only their own student ID/number or the existing own-person/SELF producer forms. Records reads use the existing intake-prefix scope rule and return neutral 404 outside it. Inactive/revoked appointments and inactive persons are refused. This does not expand a role's academic authority.

We compute saved selection readiness with the existing draft, course validation and load rules. Only an exact attempt/period REGISTERED institutional record produces overall REGISTERED, its safe receipt projection and completed selection/declarations. Historical records with missing declaration detail are labelled unavailable rather than inventing acceptance. A subsequent closed window or current hold cannot silently revoke the original registration. Cancelled registration is not presented as completed. Assessing readiness writes only its existing audit event.

We retain the curriculum assigned during conversion for both course display and save validation. Publishing a later curriculum no longer moves an existing student implicitly. For a new submission we refresh the period inside the transaction and require its OPEN status as well as window dates. A repeat request for the already stored registration returns the stored receipt even after window closure. Existing hold, capacity, version, clearance, declaration and durable outbox checks remain.

We present completion with reference, date, period, course count and exact-context receipt/timetable links. Current checks sit in a disclosure beneath the official receipt. Unregistered students still receive all nine checks and their next actions. Expired-session redirects retain context; an inconsistent receipt projection cannot display a completion card.

## Verification

We used only `sis_v2_core_review_20261016` on local PostgreSQL port 5547 for the new and related connected registration suites; no shared database was reset.

- Eight new PostgreSQL/HTTP tests passed after the intended placeholder, scope, curriculum and closed-status failures were reproduced.
- The existing readiness/submit suites passed 23 tests. The existing plan/change suites passed 33 tests, alongside the eight new tests: 64 connected registration checks in total.
- The real browser student journey passed through login, contact/correction, saved course choices, declarations, actual submission, completed readiness, preserved timetable context, course-change/waitlist requests and simulated payment confirmation. Four additional connected landing/re-sign-in/return-path tests passed. These five checks use the built Next/Nest applications and actual PostgreSQL.
- The student study fixture suite passed 18 tests, including six readiness cases. The earlier entry/readiness regression passed, and the existing registration-review fixture suite passed 12 tests. Two readiness mobile axe scans found zero violations; desktop/mobile captures were visually checked. Fixture evidence is separate from connected authorization evidence.

The combined API unit suite passed 501 tests with 17 explicitly skipped tests, including opt-in PostgreSQL tests run separately. The build integration initially exposed an omitted numeric-version contract field; we copied the reviewed contract and rebuilt. Running tests during the shared configuration package's clean rebuild caused resolution errors, so final build/test checks were sequenced. A loopback transport timeout under competing test load passed on the subsequent ordinary full suite. A browser simulator check initially lacked its documented simulator secret; rerunning with the explicit local simulator fixture passed. We did not weaken production checks or increase timeouts.

This closes the readiness/completion inconsistency and the bounded curriculum/scope repairs. It does not complete the broader progression engine, prerequisite credit recognition, institutional policies, production providers or full live Moodle delivery. Those remain explicit continuation work.

## Fresh CI fixture correction

GitHub run 39018712246 passed clean installation, API build, lint, source/script checks, migrations, seed, unit tests and the preceding connected suites, then exposed four timetable-publication failures. Its student test helper created a PERSON appointment with the university-wide string `DEMO-UNIVERSITY` instead of that student's person ID. We reproduced the refusal locally on a new independent baseline clone. We corrected only the helper's stored scope and derived authority string to the actual person-bound format; we retained the production ownership restriction and every foreign/expired-authority assertion. The complete publication/rules/notification/upload/workspace group then passed 48 tests across five files. This fixes invalid positive-path test authority rather than broadening student access.

The full browser review also exposed a legacy checkpoint helper's invalid `STUDENT:self` appointment. We replaced it with the established PERSON/own-person-ID format. The unchanged integration outage/replay/reconciliation browser journey passed afterward, alongside the corrected exact-context registration navigation. No wildcard or lowercase self-scope bypass was introduced.
