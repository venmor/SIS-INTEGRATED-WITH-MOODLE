# MoodleCloud test-only live integration design

- Date: 2026-09-25
- Status: Written spec approved by the user on 2026-09-27; revised after two independent adversarial reviews; human acceptance of the rehearsal evidence is still outstanding
- User authorization: Test-only MoodleCloud connection and full synthetic end-to-end rehearsal; written spec approval given 2026-09-27
- Proposed lead: Charles Hangoma
- Proposed reviewer: Chitindu Milimbo
- Release track: Phase 6 follow-up; not production approval

## 1. Decision

Harden the existing live adapter and delivery/reconciliation path, then run a full end-to-end rehearsal against a MoodleCloud test site using a separate synthetic cohort.

The rehearsal is a new test-only application workstream. It does not amend the handbook, approve production Moodle, authorize real student data, or expand the simulator demonstration into an institutional integration.

The live backend remains inert unless an explicit test-only mode is enabled and every safety gate passes. `MOODLE-SIM-v1` remains the ordinary default; failure of any live-test gate disables live writes and performs no Moodle mutation.

## 2. Authority and constraints

This design follows the repository authority order and the active Phase 6 records:

- `development/AGENTS.md`
- `development/docs/task-packets/TASK-PH6-000.md` through `TASK-PH6-006.md`
- the handbook journey, action, permission, UI, architecture, security/recovery, and test records cited by those packets
- the handbook supersession register, readiness matrix, and open production decisions
- `development/docs/operations/MOODLE-LIVE-SETUP.md` as operational guidance, not approval
- Moodle Web Services behavior from the authoritative target version, with Moodle 4.5.6 source as the current implementation baseline until the target version is confirmed

The Phase 6 packets marked real Moodle as an open decision. The user's 2026-09-25 authorization closes that decision only for a MoodleCloud **test** rehearsal using synthetic data. Production Moodle, production credentials, real student data, SSO, grade transfer, and institutional policy remain out of scope.

Lead and reviewer names remain rehearsal ownership until the required human review is recorded. The work must not imply signoff before both people can explain the implementation and evidence.

## 3. Goals

1. Prove authenticated read-only connectivity to a named MoodleCloud test site.
2. Exercise shell, student enrolment, staff role, tutorial-group membership, retry, replay, incident, and reconciliation behavior end to end.
3. Make live delivery idempotent, concurrency-safe, recoverable, auditable, and fail closed.
4. Keep the current simulator behavior and demonstrations intact.
5. Produce secret-free evidence that Charles and Chitindu can independently review.

## 4. Non-goals

- Production Moodle connectivity or production credential use
- Real student, staff, programme, or registration data
- SIS-to-Moodle identity authority changes
- Moodle user creation, SSO, LDAP, or authentication federation
- Grade, assessment-result, activity-content, or submission transfer
- Timetable-conflict validation
- Automatic destructive cleanup
- Changes to the locked application stack

## 5. Current blockers

The existing live path must not be run unchanged because source review found these fail-closed blockers:

- Moodle REST parameters are sent as a JSON body, but Moodle 4.5.6 reads external-function parameters from merged `$_GET`/`$_POST` form data.
- Moodle response wrappers are not consistently parsed; `core_course_get_courses_by_field` is treated as a top-level array.
- A live mapping can retain a shortname where reconciliation requires the numeric Moodle course ID.
- Shell mappings can self-create as `ACTIVE` with `SYSTEM` as both creator and activator, bypassing four-eyes approval.
- The mapping registry has no database uniqueness for one logical active mapping.
- Student and staff enrolment methods can report `EXISTS` without verifying the requested role.
- Group creation and lookup can use different names.
- Group membership can be attempted before verified enrolment.
- Group reconciliation can emit `moodle-user-<id>` keys rather than SIS-matching `idnumber` keys.
- `listActualEnrolments` calls `core_enrol_get_enrolled_users_with_capability`, which is outside the authorized function set, and silently substitutes another function call on any error behind a `.catch()` fallback.
- `listActualEnrolments` reports every Moodle enrolment as `ACTIVE`, so suspension and removal state can never be detected in reconciliation.
- `ensureShell` hard-codes `categoryid: 1` and `visible: 0` for live course creation, which is uncategorized and hidden.
- Academic mapping attestation, run-state authority, and transition authority are not yet explicit.
- Worker selection and claim are not atomic across multiple workers.
- The worker has no run-state or shell-mapping precondition on a claim, so a queued event can be delivered while the test run is not authorized for writes.
- Remote Moodle effects occur inside a database transaction, allowing external success followed by local rollback.
- Maintenance opens a nested root transaction.
- Unknown failures can be stored as `MANUAL_REVIEW` while returned as `RETRY`.
- Canonical envelope fields can be overridden by producer payloads.
- Replay, incident closure, reconciliation repair, and case creation do not preserve or validate enough evidence.
- The current setup checklist is not a complete capability/function contract for the target Moodle version.

## 6. Environment and configuration

### 6.1 Explicit modes

Replace URL-plus-token auto-arming with an explicit backend mode:

- `simulator`: default; no Moodle network request
- `live-test`: permitted only for the synthetic rehearsal

Runtime configuration must include:

- `MOODLE_INTEGRATION_MODE=simulator|live-test`
- `MOODLE_API_URL`: an HTTPS origin only, with no userinfo, query, fragment, or application path
- `MOODLE_API_TOKEN`
- `MOODLE_ALLOWED_HOST`
- `MOODLE_EXPECTED_SITE_ID`: Moodle's numeric `SITEID` for the site course, not a tenant identifier
- `MOODLE_EXPECTED_VERSION`: the exact human-readable `release` string, such as `4.5.6`
- `MOODLE_ROLE_IDS`
- `MOODLE_CATEGORY_ID`
- `MOODLE_COURSE_VISIBLE`
- `MOODLE_LIVE_TEST_RUN_ID`
- `MOODLE_LIVE_TEST_DB_FINGERPRINT`: a checksum of the non-secret database identity described below
- `MOODLE_LIVE_TEST_COHORT_PREFIX=SIS-MOODLE-LIVE-TEST-`

The exact token and target identifiers are runtime prerequisites. They must be discovered on the target instance, reviewed, and injected without being copied into source, test fixtures, screenshots, audit metadata, or this design.

The canonical Moodle instance identity is the tuple `(normalized URL hostname, siteid, release)`. `core_webservice_get_site_info.siteid` is the site-course `SITEID` and commonly has the value `1`; it is not proof of a unique MoodleCloud tenant. The hostname proves the tenant target, `siteid` checks Moodle's site-course identity, and the exact `release` string is the version gate. The returned numeric `version` and available function list are recorded as evidence but do not replace the `release` comparison. A missing field fails closed.

### 6.2 Fail-closed startup checks

`live-test` must keep writes disabled until every static check and the read-only preflight has passed:

1. The mode is exactly `live-test`.
2. The URL is an HTTPS origin with a normalized hostname and no userinfo, query, fragment, or application path.
3. The normalized hostname exactly matches `MOODLE_ALLOWED_HOST`; redirects are rejected and certificate validation remains enabled.
4. A `PREPARED` or `RUNNING` `MoodleLiveTestRun` record in the isolated SIS test database matches `MOODLE_LIVE_TEST_RUN_ID`, the expected host/site course/release, and the synthetic prefix.
5. The non-secret fingerprint of the connected PostgreSQL protocol, hostname, port, database, and Prisma schema equals both the run record and `MOODLE_LIVE_TEST_DB_FINGERPRINT`. Credentials, URL userinfo, and the raw connection string are never fingerprinted or stored.
6. The immutable synthetic scope manifest exactly covers every academic and integration record that can emit a live-test event; a live-test database contains no academic source or Moodle outbox row outside that manifest, apart from the explicitly listed human operator accounts and their security/audit history.
7. After case normalization, every listed student number, teaching-account username, teaching-account Moodle `idnumber`, programme code, academic-period code, tutorial-group name, course code, shell shortname, and Moodle object reference begins with the reserved cohort prefix. Records linked only by immutable database ID, such as offerings and registrations, must resolve to a prefixed parent record.
8. The read-only Moodle preflight returns the expected `siteid` and exact `release`; the response is valid for the confirmed target version.
9. Role IDs are integers keyed by target-verified Moodle role shortnames, and target-verified tutor roles have the approved minimal capability set.
10. The category ID and visibility value are explicit.
11. The recorded Moodle service configuration authorizes the exact function set before the write gate opens.
12. No simulator scenario or simulator maintenance control can change live state.

A missing or invalid value stops live mode. No fallback category, role, hostname, cohort, database, mapping, or identity rule is permitted.

The scope manifest is append-only and records the IDs of the run, operator decisions, students, teaching accounts, programme, curriculum version, offering, academic period, courses, institutional registrations, course registrations, tutorial groups, allocations, teaching assignments, source outbox events, and Moodle mappings. The only live-test write that may create a source-linked mapping after activation is the audited shell-provisioning command, which may append exactly that numeric course-ID mapping. All other new academic or outbox records are created while the run is `PREPARED`, before the write gate opens. Any mixed, missing, unlisted, or non-prefixed record blocks the run.

### 6.3 Secrets

The existing token-shaped environment value is treated as potentially exposed and must be revoked without printing or copying it. A new token is minted for the dedicated non-human Moodle service user after the service and function set are approved.

The token remains server-side only. Application logs, audit metadata, error details, test reports, screenshots, and browser payloads must redact the token and complete request URL. TLS is mandatory. Any proxy or platform that records outbound query strings must be disabled or verified not to retain them because Moodle REST uses the `wstoken` request parameter.

The Moodle site administrator password is never supplied to the integration.

## 7. Moodle-side pre-provisioning

Before the read-only preflight:

1. Confirm MoodleCloud Web Services and REST are available.
2. Create a dedicated non-human service user that is not a site administrator.
3. Grant only the capabilities required by the target Moodle version for the approved function set.
4. Create an authorized-users-only custom service.
5. Authorize and record the exact function list used by the adapter.
6. Pre-provision the synthetic student and staff Moodle users through an administrator-controlled process.
7. Give every synthetic student a unique `idnumber` equal to the prefixed SIS student number.
8. Bind every synthetic teaching account to an immutable manifest entry whose Moodle `idnumber` begins with the reserved prefix. The adapter resolves this binding and does not derive external identity from a display name, email, or an unverified `staff-<username>` convention.
9. Create and verify target-version-specific tutor roles: a no-quiz role with no `mod/quiz:manage` capability and a quiz-authority role with only the explicitly approved quiz capability, neither with course-editing capability. Record their numeric IDs and capability evidence. A stock broad `Non-editing teacher` role is not accepted as evidence of TG-scoped authority.
10. Confirm all test identities, course/group references, labels, and metadata use the reserved `SIS-MOODLE-LIVE-TEST-` namespace and contain no real person data.
11. Record instance-specific role shortnames/IDs and capability sets, category ID, visibility, site-course ID, exact release, and returned numeric version without recording a password or token.

The required Moodle functions are fixed by the adapter contract and revalidated against the target version before token minting:

- `core_webservice_get_site_info`
- `core_course_get_courses_by_field`
- `core_course_create_courses`
- `core_user_get_users`
- `core_enrol_get_enrolled_users`
- `enrol_manual_enrol_users`
- `enrol_manual_unenrol_users`
- `core_group_get_course_groups`
- `core_group_create_groups`
- `core_group_add_group_members`
- `core_group_delete_group_members`
- `core_group_get_group_members`

The service authorizes only this set unless target-version source review proves that role verification or suspension requires a documented replacement. The service configuration, implementation, and contract fixtures must agree; the setup checklist is not assumed complete.

Standard Moodle course-role assignment does not prove SIS tutorial-group scope or SIS effective-date enforcement. The rehearsal therefore proves the SIS authorization decision, the exact target role capability set, and Moodle role delivery, but explicitly does not claim that Moodle independently enforces TG scope. A production design that relies on Moodle to enforce that scope remains a fail-closed production gap.

## 8. Component design

### 8.1 Backend selection

`selectBackend()` must no longer infer live mode from non-empty URL and token values. An explicit `simulator` mode selects the simulator. An explicit `live-test` mode that fails validation becomes `live-test-disabled`, never an implicit fallback that could make a failed rehearsal look successful. It must return a validated descriptor containing:

- backend mode
- expected host
- expected site ID/version
- synthetic prefix
- instance configuration fingerprint
- connection status

The descriptor contains no secret. A failed `live-test` validation keeps writes disabled and exposes a secret-free health reason. The ordinary simulator remains available only through an explicit `simulator` mode.

Transport and host validation lives in `selectBackend()`. The adapter constructor receives an already-validated descriptor and performs no transport, host, or target-identity validation of its own. Contract tests use an explicit test-only transport seam that runtime configuration cannot reach.

In `live-test` mode the source workflow never calls a mutating adapter method. It always commits its SIS record and canonical outbox event; a mutating adapter method is reachable only from the external phase of a claim that has already passed the run and mapping gates (§8.6), or from the audited shell-provisioning command. Whenever the write gate is closed — a `PREPARED` run, a paused run, a terminal run, or a missing prerequisite — a mutating call is refused with a non-failure `NOT_PROVISIONED` outcome; it never creates courses, enrolments, groups, or roles. `NOT_PROVISIONED` is a deferred source-flow result, not a delivery-attempt outcome: it creates no attempt, records no success or failure, and consumes no retry budget. The explicit shell command becomes the only allowed Moodle course-creation mutation, and only after `RUNNING`.

### 8.2 Connection and live-test run records

Extend the non-secret `MoodleConnection` record with the environment label, site ID, reported version, expected-version result, last successful check, and last validation result. Do not store the token, service-user password, raw request URL, or raw authorization header.

Add a non-secret `MoodleLiveTestRun` record containing the run ID, isolated-test database fingerprint, append-only scope-manifest checksum, expected host, expected site-course ID, expected release, actual numeric version, cohort prefix, configuration fingerprint, status, creator, technical approver, operational approver, start/end times, and evidence references. Store every transition as an immutable decision/audit record with actor, active role, capability, scope, prior/next state, reason, policy version, fresh-authentication reference, and evidence checksum. Its allowed states are `PREPARED`, `RUNNING`, `PAUSED`, `COMPLETED`, `FAILED`, and `CLOSED`.

State authority is fixed:

| Transition or command | Authority and conditions |
|---|---|
| Create `PREPARED` | Moodle Administrator with `manage-mapping` and `sync-moodle`; system binds the run to the isolated database and initial scope manifest. |
| `PREPARED → RUNNING` | Two distinct active human accounts: Moodle Administrator with `sync-moodle` supplies technical approval; Integration Support with `replay-event` supplies operational approval. Both use fresh authentication, revalidate the database/scope/host/site/release/function/role fingerprints, and declare the synthetic-only purpose. |
| `RUNNING → PAUSED` | Integration Support with `replay-event`, or an automatic safety kill switch, records a reason and stops new claims. Moodle Administrator cannot bypass the pause. |
| `PAUSED → RUNNING` | Integration Support with `replay-event` after fresh authentication and complete gate revalidation; any target-configuration change also requires a new Moodle Administrator technical approval. |
| `RUNNING → COMPLETED` | Integration Support with `replay-event` after every acceptance check passes, no claim is in flight, and evidence is frozen. |
| `RUNNING or PAUSED → FAILED` | Integration Support with `replay-event`, or the system on a safety-invariant failure, records the reason and disables writes. `FAILED` cannot return to `RUNNING`; remediation uses a new run. |
| `COMPLETED or FAILED → CLOSED` | Moodle Administrator confirms credential retirement and Integration Support confirms frozen evidence, incident closure where applicable, and recorded Charles/Chitindu review. The two roles may not be held by the same account. |

Every command in §8, including the new run-transition, mapping, provisioning, fault-injection, and repair commands, follows the same failure contract: an unauthorized caller is denied with 403 and an audit record, a run, manifest entry, or mapping outside the caller's scope returns a neutral 404 that reveals nothing, and any referenced mapping version or run state is revalidated at execution time.

`PREPARED` permits configuration, synthetic-source preparation, and read-only Moodle preflight only. `RUNNING` is the sole state that can authorize live-test Moodle writes. `PAUSED`, `COMPLETED`, `FAILED`, and `CLOSED` allow only the explicitly read-safe reconciliation or closure commands defined by their transition. `COMPLETED`, `FAILED`, and `CLOSED` are terminal; no generic state PATCH is exposed. The environment run ID must match its database record exactly. Until a reviewed fresh-authentication mechanism is available, the run cannot enter `RUNNING` and the write gate remains closed.

### 8.3 Mapping lifecycle

Live-test shell mappings use the governed lifecycle required by `TASK-PH6-001`:

1. A Moodle Administrator with `manage-mapping` creates a draft for an offering and academic period.
2. Synthetic validation confirms the SIS key, intended Moodle reference, target site, role/category configuration, and cohort boundary.
3. An active Programme Coordinator with coordinator capability and authority over the affected offering attests the academic mapping. The coordinator cannot be the draft creator.
4. A Moodle Administrator with `manage-mapping`, distinct from the draft creator, performs the technical version-checked activation after fresh authentication. The academic attester and the technical activator must be distinct human accounts; both attestations remain separate immutable records.
5. Activation freezes evidence and writes audit history.
6. A later mapping supersedes rather than edits an active version.

Database constraints enforce one active mapping for each logical mapping key. A system worker cannot create or activate a live mapping. A shell provisioning command may create the Moodle course and a draft binding, but the resulting mapping still requires four-eyes activation before dependent delivery.

For live shells, `MoodleMapping.moodleId` stores the verified numeric Moodle course ID and a new `moodleRef` field stores the deterministic shortname/reference used for exact lookup and display. The explicit provisioning command obtains the numeric ID before creating the draft, so an activated live shell mapping never substitutes a shortname for the course ID. Reconciliation receives the numeric course ID.

### 8.4 Live adapter

The adapter remains a translation boundary and contains no academic or authorization policy.

Required behavior:

- Send `POST application/x-www-form-urlencoded` requests to Moodle's REST endpoint. Moodle 4.5.6 merges `$_GET` and `$_POST`; a JSON request body is not a valid substitute. Keep `wstoken`, `wsfunction`, and `moodlewsrestformat` in the redacted query string, encode function parameters in deterministic PHP bracket form, and reject unsupported or ambiguous values before sending.
- Validate the response envelope and JSON error contract for every function, including object wrappers such as `courses`, `users`, and `groups`, null-success mutation responses, warnings, and error fields.
- Treat timeout, network failure, HTTP 408/429/5xx, and approved transient Moodle service errors as retryable.
- Call only the authorized function set in §7. No call may substitute a different function on error, and every probe-and-fallback pattern is removed; a function that is genuinely required must be added to §7 with a documented target-version reason, which is a reviewed design change.
- Read actual enrolment state through the target-verified contract. An unreadable or unsupported status is a recorded fail-closed gap and a manual-review outcome; it is never assumed to be `ACTIVE`.
- Treat access, permission, invalid-parameter, malformed-response, unknown-version, missing-role, and ambiguous-identity failures as permanent or manual-review outcomes according to the verified error contract.
- Classify every unknown failure as manual review and return `MANUAL_REVIEW`; never return `RETRY` for an unclassified error.
- Require exactly one exact course match for a shortname. Reject zero, duplicate, or unfiltered results.
- Parse and persist the actual numeric course ID returned by Moodle.
- Require exactly one user for each unique `idnumber`; reject ambiguous identity.
- Resolve role IDs only from target-verified `MOODLE_ROLE_IDS` keyed by Moodle role shortname.
- After student or staff enrolment, query actual enrolments and verify the requested role. Existing enrolment with a conflicting role returns `MISMATCHED` and opens governed work; it is not success.
- Derive the staff role only from the SIS teaching-assignment authorization predicate and a target-verified minimal role. `quizScope` is SIS evidence and is not sent as if Moodle enforced tutorial-group scope; the adapter must never broaden authority silently.
- Use one stable, prefixed group name for lookup, creation, and evidence.
- Before adding a group member, query actual course enrolment and require one unique identity with the expected active student role. If enrolment is absent because an earlier event is still pending, return a classified `DEPENDENCY_PENDING` outcome and retry under the bounded dependency policy; conflicting role, ambiguous identity, or unknown state routes to manual review. This makes out-of-order enrolment and group events converge without calling Moodle group mutation first.
- Query group membership with the target-supported group-member function; resolve numeric Moodle user IDs back to `idnumber` before reconciliation.
- Use Moodle's supported suspension behavior for suspension. Permanent unenrolment occurs only for an approved source state and retains the SIS reason/history.
- Never return synthetic `moodle-user-*` identities to reconciliation.
- Never expose secrets in validation, exceptions, or connection details.

### 8.5 Outbox envelope

Canonical envelope fields are generated and immutable at the integration boundary. Producer payloads may populate business fields but cannot override:

- event/outbox ID
- event type
- correlation ID
- idempotency key
- payload version
- delivery status
- retry policy reference
- reconciliation reference

The database enforces convergence for the same source event and idempotency key. Producers receive no success response when the durable outbox transaction fails.

### 8.6 Delivery attempt and worker

Delivery is split into three phases:

1. **Claim transaction:** the worker discovers due work from the canonical outbox queue, and inside one transaction revalidates the run and mapping preconditions, creates the delivery-attempt row, and transitions its state from `PENDING` to `DELIVERING` using a compare-and-set state, attempt number, and lease token/expiry. A partial unique constraint permits only one active claim per outbox event. The work is claimed only when the owning `MoodleLiveTestRun` is `RUNNING`, and for an event that requires a Moodle shell (enrolment, group membership, staff role) only when its shell mapping is `ACTIVE`. A `PREPARED`, paused, or `COMPLETED`/`FAILED`/`CLOSED` run, or an inactive/missing mapping, leaves the queue entry `PENDING`, creates no delivery-attempt row, takes no lease, and makes no `Moodle` call, so the queue visibly waits instead of dead-lettering.
2. **External phase:** call Moodle after the claim transaction commits. No network call occurs inside an open database transaction. Adapter reads/writes remain idempotent and exact.
3. **Result transaction:** record success, retry, dead-letter, manual-review, or ambiguous outcome only if the lease token still owns the claim. Record attempt timestamps, error code, safe detail, and evidence checksum. Every recorded outcome carries a redacted Moodle request/result reference — function name, non-secret parameter keys, response code, and evidence checksum — and never the token or the complete request URL.

A delivery-attempt row is created only inside a claim transaction that has already passed the run and mapping preconditions. No other code path may create an attempt row, deliver an event, or call Moodle, including any back-fill for outbox rows that have no attempt row. An ambiguous attempt is resolved by an evidence-backed `ALREADY_APPLIED` record or a governed conflict, never by a bare success.

Each retry creates a new immutable attempt row linked to the same outbox event; it never resets or erases the prior attempt. Replay creates another attempt linked to the original attempt and approved replay decision. Attempt state transitions and evidence checksums are append-only audit history. Unknown or ambiguous external outcomes trigger actual-state reconciliation before another mutating attempt.

The scheduled worker remains single-flight per process, but correctness no longer depends on that in-process guard. Multiple worker instances must converge through the database claim.

Maintenance is checked and recorded in the same claim transaction. It never opens a nested root transaction.

The live outage/dead-letter proof uses a one-shot `BEFORE_MOODLE_REQUEST` fault injector scoped to the `MoodleLiveTestRun`, one named synthetic outbox event, and an approved reason. It returns a classified transient failure before making the Moodle request, writes an immutable declaration and audit event, cannot target another run or Moodle object, and expires after one use. It is distinct from simulator scenario controls and cannot mutate the target Moodle site.

Arming either injector is authorized server-side to an Integration Support account holding `replay-event` while the run is `RUNNING`; the authorizing account is recorded in the same immutable declaration. UI visibility is a convenience and never the authorization check.

A separate one-shot `AFTER_MOODLE_RESPONSE_BEFORE_LOCAL_RESULT` injector is permitted only for a named idempotent synthetic enrolment. Moodle completes the external operation, the adapter validates the response, and the injector prevents the success result from being committed locally. The resulting expired/ambiguous attempt must be resolved by querying actual state and recording `ALREADY_APPLIED` or a governed conflict before any replay. This supplies live evidence for remote-success/local-failure recovery; the pre-request injector alone does not.

### 8.7 Replay and incidents

Replay approval requires:

- Integration Support authority
- separation from the requester
- fresh re-authentication
- exact source attempt/range and mapping versions
- frozen evidence with a checksum and policy/contract version
- execution-time revalidation that the referenced evidence still matches
- a new auditable attempt

An incident closes only with a linked successful delivery, replay outcome, or reconciliation result. Free text may explain the linked evidence but cannot replace it.

### 8.8 Reconciliation

Scheduled and on-demand reconciliation runs, each scoped to the current `MoodleLiveTestRun`, load the numeric live course ID from the active mapping and compare:

- SIS expected roster with Moodle actual enrolments by `idnumber`
- requested student roles with actual roles
- SIS active teaching assignments with actual Moodle staff roles
- SIS quiz capability, tutorial-group scope, and effective dates through the existing authorization predicates; standard Moodle roles do not prove or replace SIS-owned scoped authority
- SIS active tutorial-group allocations with actual group membership by stable group name and student `idnumber`
- expected suspension/removal state with Moodle actual state

Each run records provider, site ID, mapping versions, adapter version/policy version, and evidence checksums. Repeated runs are idempotent. Cases use explicit dedupe keys and database uniqueness so concurrent runs do not create duplicates.

Auto-repair is governed by a versioned test-only policy `MOODLE-LIVE-TEST-RECON-v1`. It is an allowlist, not a heuristic:

- `MISSING_IN_MOODLE` for a student enrolment may be requeued once per run only when the SIS institutional registration is `REGISTERED`, the course registration is `ENROLLED`, the shell mapping is active, the student `idnumber` resolves uniquely, the expected role is exactly the verified student role, and there is no conflicting or unexpected Moodle state.
- `MISSING_IN_MOODLE` for an active tutorial-group membership may be requeued once per run only after the same student's active enrolment and correct role have been verified, the TG allocation is active, the group mapping is stable and prefixed, and the group has no identity conflict.
- The run allows at most 10 requeues in total. A diff key that remains different after its requeue, or any diff outside this allowlist, opens a governed case and is never repaired automatically.

`UNEXPECTED_IN_MOODLE`, `ATTRIBUTE_MISMATCH`, `ROLE_MISMATCH`, `ENROLMENT_MISMATCH`, `MAPPING_MISSING`, identity conflicts, ambiguous states, and any source-domain disagreement always open governed cases. A case cannot close merely because a note exceeds a minimum length; it requires linked downstream evidence. Changing or widening this allowlist requires a new versioned test policy and human review; the implementation must not infer a broader allowlist.

Requeue repair creates a new delivery attempt and clears no prior delivery timestamps or evidence. Suspension performs the verified Moodle action first, confirms actual state, then records closure evidence.

### 8.9 UI and operations

The Moodle Administration and Integration Support workspaces remain separate.

The connection page adds a prominent `LIVE TEST — SYNTHETIC ONLY` state and displays only:

- expected and actual host
- site ID
- reported version
- validation result and time
- permitted synthetic namespace
- write-enabled/paused state

Live-test mode hides or disables simulator scenario controls. The UI never receives or displays a token. Integration Support with `replay-event` owns pause and resume; Moodle Administrator cannot override that state. A run-scoped one-shot fault-injection control is visible only to Integration Support while the run is `RUNNING`, is separate from simulator scenarios, and cannot be reused for a second event. Stop writes pauses new claims while preserving evidence and allowing read-only reconciliation.

## 9. Data flow

1. Create an isolated SIS test database, build the append-only synthetic scope manifest, seed the reserved synthetic cohort, and create a `PREPARED` `MoodleLiveTestRun` record.
2. While the run is `PREPARED`, create the synthetic programme/offering/period, students, teaching accounts, courses, registrations, tutorial groups, allocations, and active teaching assignments through existing authorized SIS flows. Their canonical outbox events commit durably, but shell provisioning is dry-run and no Moodle mutation occurs.
3. Verify target configuration and the exact least-privilege service function set without network writes.
4. Mint and inject a fresh dedicated-service token.
5. Start the API in `live-test` mode with writes disabled and the database run ID locked to `PREPARED`.
6. Run the read-only `core_webservice_get_site_info` preflight and verify the canonical `(hostname, siteid, release)` identity and available function list.
7. After distinct Moodle Administrator technical approval and Integration Support operational approval with fresh authentication, transition the matching run record to `RUNNING` and enable writes.
8. Provision the approved synthetic shell through the explicit shell command, obtain the numeric course ID, record the offering-scoped Programme Coordinator attestation, and have a different Moodle Administrator activate the exact mapping version.
9. Claim and deliver the already-queued canonical events through `LiveMoodleAdapter` in dependency-safe order; the events queued in step 2 are delivered unchanged, with no Moodle call while the run was `PREPARED`.
10. Verify actual Moodle enrolments, roles, groups, and shell against the outbox evidence.
11. Repeat a delivery and prove no duplicate Moodle effect.
12. Use the one-shot pre-request fault injection to exhaust bounded retries and verify dead-letter/incident evidence.
13. Approve replay with frozen evidence and prove convergence without duplicate enrolment.
14. Use the one-shot post-response/local-result fault injection, then prove actual-state reconciliation records `ALREADY_APPLIED` or a governed conflict before any replay.
15. Have a Moodle administrator introduce one approved synthetic drift condition through the Moodle test interface, capture before/after evidence, and run expected-vs-actual reconciliation.
16. Prove the versioned allowlisted safe repair or governed case creation and evidence-linked closure.
17. Capture secret-free API, database, Moodle-query, browser, and accessibility evidence.
18. Transition the run to `COMPLETED` only when acceptance checks pass and evidence is frozen.
19. Retain the synthetic Moodle objects until Charles's and Chitindu's recorded review, then revoke the dedicated token and transition the run to `CLOSED`.
20. Perform cleanup as a separate, explicitly authorized Moodle-administrator action with its own receipt after review.

## 10. Error, retry, and recovery rules

- Retry only classified transient failures with capped exponential backoff and jitter.
- A blocked claim is not a failure. When the run is not `RUNNING`, the run is paused, maintenance is active, or a required shell mapping is not `ACTIVE`, the queue entry stays `PENDING` with no delivery-attempt row, no lease, and no retry-counter change; it is retried by the scheduler, never dead-lettered, and never advanced by replay.
- `DEPENDENCY_PENDING` is retryable only for a verified absent enrolment or shell prerequisite within the bounded dependency budget; ambiguity, conflict, and exceeded budget route to manual review.
- Do not consume retry budget for scheduled maintenance.
- Permanent mapping, policy, identity, permission, or malformed-response failures become manual review.
- Unknown failures become manual review.
- Ambiguous external effects become reconciliation-first, not blind replay.
- Moodle success never reverses a confirmed SIS registration.
- Moodle failure never changes SIS academic truth.
- A successful remote call followed by local failure is safe only because every adapter operation is idempotent and actual state is verified.
- A worker lease expiry is safe only after actual-state reconciliation distinguishes absent, already-applied, conflicting, and unknown states.
- No queue, incident, mapping, attempt, replay, or reconciliation history is deleted to make the queue appear clean.

## 11. Testing strategy

### 11.1 Unit and contract tests

Add tests for:

- explicit simulator/live-test selection
- HTTPS and exact host allowlisting
- canonical `(hostname, siteid, release)` identity and numeric-version evidence
- REST form encoding against Moodle's documented `$_GET`/`$_POST` parsing, including nested enrolment/group parameters and a null-success response
- target-version contract fixtures for every called function, using Moodle 4.5.6 fixtures only if the target is confirmed as 4.5.6
- run-state command matrix, distinct-person approval, fresh-authentication failure, resume preconditions, and terminal-state refusal
- claim gating: an event whose run is `PREPARED`/`PAUSED`/terminal, or whose shell mapping is not `ACTIVE`, is never claimed, produces no delivery-attempt row and no Moodle call, and later delivers unchanged after the gate opens
- the absence of any ungated back-fill path that delivers or creates an attempt row outside a claim transaction
- command denial paths: Moodle Administrator is denied pause, resume, and replay; Integration Support is denied mapping creation and activation; the draft creator acting alone is denied academic attestation and cannot self-activate; each denial returns 403 and writes an audit record
- isolated-database fingerprint mismatch
- non-prefixed and unlisted source, mapping, outbox, staff-identity, group, course, and mixed-cohort refusal
- missing role/category/cohort configuration refusal
- production/non-synthetic identifier refusal
- secret redaction in errors, health, audit, and browser payloads
- a source-scan rule that refuses a non-empty `MOODLE_API_TOKEN=` value and a literal `wstoken` in source, fixtures, and documentation
- target-confirmed Moodle error codes, classification, and response wrappers for every called function
- exact course and user cardinality
- numeric course-ID persistence and reconciliation
- role verification after enrolment
- stable group naming, explicit group-member queries, and enrolment-before-group dependency handling
- out-of-order enrolment and group events converging through `DEPENDENCY_PENDING`
- live identity normalization to `idnumber`
- suspension versus permanent removal
- canonical envelope immutability
- classified and unknown Moodle errors
- run-scoped one-shot pre-request and post-response fault injection, their single-use limits, and inability to target another run
- mapping academic-attester/creator/activator separation and offering scope
- exact `MOODLE-LIVE-TEST-RECON-v1` repair allowlist, ten-requeue cap, and case escalation
- timeout after a potentially successful remote effect
- atomic claims, lease expiry, and multiple workers
- database uniqueness for active mappings, attempts, cases, and idempotency
- replay evidence checksum/version revalidation
- evidence-linked incident and reconciliation closure

The existing mocked tests must not encode response shapes different from the target Moodle version.

### 11.2 Database and concurrency tests

Prove:

- concurrent mapping creation produces one active mapping
- concurrent workers produce one claim
- duplicate delivery produces one external effect
- concurrent reconciliation produces one case per drift key
- retry and replay preserve previous attempt evidence
- a rollback after remote success converges through actual-state verification
- repair and replay do not erase delivered timestamps
- maintenance and claim state commit atomically

### 11.3 Live-test checkpoint

The MoodleCloud run is opt-in and cannot run in ordinary CI. It must prove:

1. read-only canonical host/site-course/release preflight and isolated-database fingerprint
2. offering-scoped Coordinator attestation plus distinct-Moodle-Administrator shell mapping activation
3. events queued during `PREPARED` remain unclaimed with no Moodle call, then deliver unchanged once the two-person `RUNNING` gate opens
4. synthetic student enrolment
5. minimal target tutor-role capability evidence plus SIS allow/deny proof for quiz capability, tutorial-group scope, and effective dates
6. out-of-order group event converging only after verified enrolment
7. direct Moodle actual-state verification
8. duplicate delivery convergence
9. pre-request outage and dead-letter handling
10. approved replay convergence
11. post-response/local-result ambiguous effect resolved by actual-state check
12. expected-vs-actual reconciliation, versioned allowlisted repair or case, and linked closure
13. run-state authority, pause/resume, terminal-state refusal, and safe student wording
14. `COMPLETED → CLOSED` only after credential retirement and recorded Charles/Chitindu review
15. token redaction and no secret in evidence
16. no production host, real data, non-prefixed record, or out-of-manifest record access

### 11.4 Browser and accessibility

Browser evidence covers the connection check, mapping draft/test/activation, delivery queue, dead-letter replay, incident, and reconciliation flows. It includes mobile, keyboard, focus, error, and screen-reader semantics required by the controlling UI records. API-only evidence does not substitute for required user journeys.

### 11.5 Repository verification

Run the repository-provided verification commands after implementation, including:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- targeted API and live-contract tests
- `npm run test:browser`
- `npm run build`
- `npm run scan` source/secret scan
- Prisma migration validation against the isolated test database
- `npm run backup:test` to verify the new run, attempt, mapping, replay, incident, and reconciliation evidence survives restore

No live run is attempted if local checks fail.

## 12. Evidence and acceptance

A successful rehearsal requires all of the following:

- explicit user authorization for the test-only workstream
- recorded Charles/Chitindu ownership and human review
- two distinct accounts authorized `PREPARED → RUNNING` with fresh authentication
- pause and resume exercised by Integration Support, with a recorded Moodle-Administrator denial
- validated canonical target identity, isolated-database fingerprint, append-only scope manifest, and least-privilege service configuration
- synthetic-only source and Moodle records
- all automated checks passing
- one successful full delivery run
- quiz-capability and tutorial-group scope allow/deny evidence plus minimal target role capability evidence
- one out-of-order dependency-convergence proof
- proof that events queued while the run was `PREPARED` were never claimed and delivered unchanged after the two-person `RUNNING` gate
- one duplicate-delivery proof
- one pre-request outage/dead-letter/replay proof
- one post-response/local-result ambiguous-effect proof
- one reconciliation/closure proof using the versioned repair allowlist or governed case
- the dedicated service token was revoked after recorded Charles/Chitindu review and before the `COMPLETED → CLOSED` transition
- cleanup was performed as a separate authorized action with its own receipt after `CLOSED`
- no unresolved high-severity security or correctness finding
- no secret in Git, logs, audit output, screenshots, or evidence
- explicit decision that production Moodle remains unapproved

Failure of any criterion stops the rehearsal, keeps live writes disabled, and records a design or evidence gap. It does not change the ordinary simulator default or claim live-test acceptance.

## 13. Cleanup and credential retirement

Cleanup is never automatic. Rehearsal users, courses, groups, and enrolments are retained after `CLOSED` until a separately authorized cleanup action. The governed suspension and unenrolment operations described in §8.4 and §8.8 are source-state operations driven by SIS truth, not cleanup, and they are subject to their own approval and evidence rules.

After Charles's and Chitindu's review, and before the run transitions to `CLOSED`, the dedicated service token is revoked. Closure records the non-secret revocation confirmation. A new token is minted only for a separately approved future run. The human administrator account password remains outside the integration at all times.

After the run is `CLOSED`, a Moodle administrator performs cleanup as a separate approved action using Moodle's administrator interface or another separately authorized mechanism. Cleanup evidence records what was removed, when, by whom, and the resulting site state without recording credentials.

## 14. Implementation plan boundaries

This design must be delivered as separate, reviewable plans rather than one oversized plan:

1. **Live safety and protocol foundation:** explicit backend mode, fail-closed configuration, canonical target identity, database fingerprint, scope manifest, the reviewed fresh-authentication mechanism (a hard prerequisite for the `RUNNING` gate), `MoodleLiveTestRun` state machine, Moodle REST form encoding, response contracts, and configuration/UI run state.
2. **Mapping and adapter correctness:** governed academic mapping approvals, numeric course-ID provisioning, role/category configuration, exact user/course/group cardinality, role verification, dependency-safe group operations, suspension contract, and identity binding.
3. **Delivery, replay, and incidents:** canonical envelopes, run/mapping-gated atomic claim and lease, external-phase isolation, immutable attempt history, classified failure, both live-test fault injectors, replay evidence revalidation, and incident closure.
4. **Reconciliation, repair policy, and user journeys:** expected-vs-actual comparison, `MOODLE-LIVE-TEST-RECON-v1`, governed cases, Moodle Administration and Integration Support screens, accessibility, and browser checkpoints.
5. **Target provisioning, rehearsal, and evidence:** least-privilege MoodleCloud configuration, synthetic cohort preparation, opt-in live checkpoint, secret-free evidence, human review, token retirement, and separate cleanup.

Each plan is written only after this design is approved. A later plan does not start while an earlier plan's local verification, denial tests, or security/correctness review is failing. The live rehearsal remains blocked until all five plans are implemented and verified.

## 15. Expected implementation surfaces

The implementation plan will likely touch:

- `development/apps/api/src/integration/moodle-adapter.ts`
- `development/apps/api/src/integration/moodle-live.ts`
- `development/apps/api/src/integration/moodle-live.spec.ts`
- `development/apps/api/src/integration/integration.service.ts`
- `development/apps/api/src/integration/integration.controller.ts`
- `development/apps/api/src/integration/delivery.worker.ts`
- new run-state, scope-manifest, and live-test fault-injection modules under `development/apps/api/src/integration/`
- Phase 6 API and Playwright checkpoint tests
- `development/packages/config/src/moodle.ts`
- `development/packages/contracts/src/integration.ts`
- `development/prisma/schema.prisma` plus a hand-written migration in the repository's existing `YYYYMMDDHHMMSS_*` SQL convention, applied with `prisma migrate deploy`. The filtered unique indexes for one active mapping per logical key and one active claim per outbox event are not expressible in Prisma and are written as SQL. The attempt row gains a lease token, a lease expiry, and a run relation; the reconciliation case row gains its dedupe key.
- `development/.env.example`
- `development/scripts/check-source.mjs`, extended so the scan refuses a non-empty `MOODLE_API_TOKEN=` value and a literal `wstoken` in source, fixtures, and documentation; the existing scan rules alone would pass a committed Moodle token
- Moodle Administration and Integration Support web surfaces
- `development/docs/operations/MOODLE-LIVE-SETUP.md`
- a new application-local Phase 6 live-test task packet, learning note, gap/decision records, and verification evidence

Files are selected from actual code and tests during implementation; this list is not permission to make unrelated refactors.

## 16. Design gaps that remain fail closed

These are not silently assumed during implementation:

- the target MoodleCloud hostname, site-course ID, exact release, and numeric version
- the exact target-supported service capabilities, function list, and request/response contract
- instance role shortnames, numeric IDs, and target-verified minimal tutor-role capability sets
- the approved course category and visibility
- the isolated test database identity, complete synthetic scope manifest, and the dedicated test Moodle users
- the deterministic live shell shortname/reference derivation that satisfies the reserved synthetic prefix; the simulator's own naming pattern does not
- a recorded non-production attestation for the allowlisted target host; until it is human-reviewed, `RUNNING` requires an explicit non-production confirmation recorded on the run record
- availability and configuration of fresh re-authentication for integration high-impact actions; this is the `TASK-PH6-005` GAP-022 question and remains unresolved here
- a verified Moodle suspension contract for the target version, including the target-verified read path and function for actual user and enrolment status
- the `DEPENDENCY_PENDING` retry budget and whether it is separate from the delivery retry budget
- the exact human accounts for run, academic-mapping, activation, and closure decisions. Separation of duties means the rehearsal needs more distinct accounts than the two named people: mapping creator, academic attester, technical activator, run technical approver, run operational approver, and separate closure approvers. Additional accounts must be named and approved, never merged to satisfy a gate.
- whether one account may legitimately hold both the offering-scoped Programme Coordinator attestation and the Moodle Administrator technical activation; this is unestablished, so this design enforces distinct accounts and records the decision separately if approved evidence later permits otherwise
- the separately approved cleanup authority and mechanism
- any production mechanism for enforcing tutorial-group-scoped quiz authority in Moodle; the rehearsal does not claim that capability

New gap records created during implementation must not reuse an existing `GAP-0xx` identifier; the existing `GAP-020` and `GAP-021` records are unchanged by this design.

Each value must be established through the approved runtime/configuration and human-review gates. Missing values prevent the related write, not merely the final signoff.
