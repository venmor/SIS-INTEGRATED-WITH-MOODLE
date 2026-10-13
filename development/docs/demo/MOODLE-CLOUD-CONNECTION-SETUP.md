# MoodleCloud synthetic connection: administrator setup and rehearsal

Reviewed 2026-10-07 in `review/phase7-completion`. This is a test-site runbook using fictional identities only. It records a successful **read-only identity check**, setup instructions and remaining implementation gates; it does not establish full delivery or authorize production data. Charles Hangoma and Chitindu Milimbo review the evidence; their acceptance has not been recorded.

**Current administrative setup, 2026-10-13:** a replacement token is present only in the ignored local `.env` and passes a read-only site check. For the exact steps to give its *own external service* the three missing create/enrol functions, or to mint a separate service-bound token, use [Give the dedicated token read and write functions](UNZA-CATALOGUE-AND-MOODLE-DEMONSTRATION.md#give-the-dedicated-token-read-and-write-functions). That separately invoked demonstration provisioning tool is not the governed `live-test` delivery worker described below.

Use this checklist in place of the older [Moodle live setup](../operations/MOODLE-LIVE-SETUP.md) for a new connection. That older checklist predates explicit `live-test` mode, omits required settings, suggests a broad mobile service and supplies unverified role IDs. Its statements about MoodleCloud trial API restrictions and idle-site sleep have not been established by current official documentation.

## 1. Current evidence and the resolved site address

The user supplied `https://sis-moodle.moodlecloud.com/admin/search.php#linkusers` on 2026-10-07 for the synthetic connection. The canonical origin is **`https://sis-moodle.moodlecloud.com`** and the exact allowed hostname is **`sis-moodle.moodlecloud.com`**. The administration path and fragment are navigation context; they are not part of the API base URL.

| Check | Safe finding |
|---|---|
| Current local configuration | Five non-secret settings are recorded in the ignored local `development/.env`: explicit simulator mode, canonical origin, exact host, site ID and exact release. A replacement token was added there on 2026-10-13 and confirmed by a read-only identity check; its value is excluded from evidence. Governed delivery role/category/visibility/run/fingerprint/prefix settings remain unconfigured. This is local evidence, not a deployment inventory. |
| Backend selection with that environment | Explicit `simulator`; authenticated identity does not activate live delivery. |
| Old local repository searched | `/home/hangoma/STUDENT-INFORMATION-MANAGEMENT-SYSTEM-DESIGN-WITH-IMPLEMENTATION-OF-MOODLE-INTEGRATION`, its working files and all locally available committed revisions/branches. Only URL origins and setting presence were reported; credentials were not printed. |
| Recoverable old URL | `infra/moodle.env.example:13` contains `http://127.0.0.1:8090`, a local Moodle reference. No MoodleCloud origin was found. It cannot identify or replace the requested cloud tenant. |
| Prior target note | [Foundation ledger R14–R15](../superpowers/plans/2026-09-27-moodlecloud-live-test-foundation-ledger.md) says an operator previously confirmed a test target, but explicitly excludes its hostname and identifiers from the repository. That is historical context, not current connection evidence. |
| Current target address | Resolved from the user's supplied URL as `https://sis-moodle.moodlecloud.com`. This is the intended connection address, not authenticated proof of its site-course ID, release or non-production status. |
| Anonymous public check, 2026-10-07 | HTTPS requests to `/`, `/admin/search.php` and `/login/index.php` returned **HTTP 403**. A second login-page request using a standard browser user agent also returned 403, with page title `403 Forbidden` and server header `awselb/2.0`. The web browsing tool could not open the site. No readable Moodle login, admin page or version metadata was obtained. |
| Authenticated identity check, 2026-10-07 | User-authorized, redirect-rejecting form POST returned site ID **1**, exact release **5.2.2 (Build: 20260810)**, numeric version **2026042002**, and only `core_webservice_get_site_info`. No mutation was called. The owner subsequently confirmed deleting the chat-exposed token; revocation was owner-reported, not independently tested. No administrator session is held by the agent. |
| Local server health at the inspection time | `http://127.0.0.1:3001/health` was unreachable. An unauthenticated request to `http://127.0.0.1:3000` returned HTTP 404. These checks do not identify other ports or remote deployments. |

**Address confidence:** high confidence in the canonical origin derived directly from the user's URL. The prior local-repository recovery attempt found no cloud origin; the user subsequently resolved that missing input. Public inspection currently establishes only an HTTPS 403 response from this inspection environment. It does not prove that the site is unavailable to its owner, expired, API-disabled, successfully authenticated or a non-production tenant. The anonymous checks used no credentials. The later authenticated check used one user-authorized token held only in the interactive process, printed selected sanitized metadata, and performed no external mutation. The token was not saved to source, environment files or request logs.

The site owner confirms this address by signing into the existing [MoodleCloud Portal](https://moodlecloud.com/app/en/login), selecting the site and opening the **Plan** tab. Compare the site's URL with `https://sis-moodle.moodlecloud.com`. The owner can also open the [supplied administration page](https://sis-moodle.moodlecloud.com/admin/search.php#linkusers) or [site login page](https://sis-moodle.moodlecloud.com/login/index.php) in their own browser. [Official MoodleCloud sign-in instructions](https://support.moodle.com/support/solutions/articles/80000835880-log-in-to-your-moodlecloud-site).

If the owner has no working login, use the existing site's password-recovery link or the Portal recovery route, then check that **Site administration** is available. A teacher or ordinary student session is insufficient. The owner carries out the administrator steps below locally; no password, token, cookie, recovery code or screenshot containing a credential is sent through chat. No new subscription, paid upgrade or Moodle download is required by this runbook.

### Next owner steps for this site

1. Open `https://sis-moodle.moodlecloud.com/admin/search.php#linkusers` in the owner's browser and confirm administrator access and the Portal's matching site URL. If the owner's browser also receives 403, resolve that access issue through the existing Portal/support route before configuring the integration.
2. The owner reports REST enabled, existing **temp setup** user, and **SIS connection check** external service configured. Reuse them; verify the account is not a site administrator and that the custom service is enabled, authorised-users-only, and grants only `core_webservice_get_site_info` for this stage.
3. Read-only identity has been verified and the exposed token deleted by the owner. Mint a replacement only when the next stage is ready; enter it locally through section 7, never chat. Enter `https://sis-moodle.moodlecloud.com` for the origin and `sis-moodle.moodlecloud.com` for the exact hostname; enter the token only at the hidden prompt. Retain only the sanitized site-course ID, exact release, numeric version and function list.
4. Supply the verified non-secret site/role/category settings locally, record the required non-production attestation, and complete the implementation/run gates in section 9. Keep `MOODLE_INTEGRATION_MODE=simulator` until those gates pass; expanding the service function set or starting live writes belongs to the reviewed rehearsal sequence.

## 2. What each system owns

| SIS owns | Moodle owns |
|---|---|
| Person/student identity and the approved identity link; SIS roles; official programme/course registration; offerings, teaching assignments and official tutorial groups; versioned external mappings; approved assessment components; moderation, official results, release and amendments | Course learning spaces, teaching content, activities, submissions and raw Moodle marks; external delivery responses and actual course/group participation |

Moodle receives SIS-authorized access changes. It cannot make an SIS registration active, change finance clearance or release official results. A Moodle outage preserves the SIS registration and last confirmed assessment evidence. Reconciliation compares both systems and routes source corrections to the owning SIS workflow.

These boundaries come from exact [Design Section 9](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/009-design-section-9-integration-architecture.md), [Moodle Administrator Part 2](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/036-role-blueprint-12-part-2-moodle-administrator-real-sis-moodle-learning-integration.md) and [Integration Support Part 3](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/02-role-blueprints/037-role-blueprint-12-part-3-integration-support-officer-monitored-recoverable-and-governed-ex.md). Secrets and environment separation follow exact [Design Section 10](../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/010-design-section-10-security-privacy-audit-records-and-resilience.md). The [approved test design](../superpowers/specs/2026-09-25-moodlecloud-test-live-integration-design.md), [Phase 6 packets](../task-packets/TASK-PH6-001.md) and [grade staging packet](../task-packets/TASK-PH7-002.md) control the rehearsal.

## 3. Check MoodleCloud features on the actual site

MoodleCloud supports web-service setup, although its support service does not configure custom integrations. Some settings are preconfigured and cannot be changed by the site owner. A setting labelled **Defined in config.php** is locked. Check the actual site's menus and API documentation; do not infer availability from its plan name. [MoodleCloud web services](https://support.moodle.com/support/solutions/articles/80000835783-using-web-services-in-moodlecloud), [preconfigured features](https://support.moodle.com/support/solutions/articles/80000831612-disabled-moodlecloud-features).

Site administrators cannot install arbitrary plugins on MoodleCloud. This runbook uses Moodle's existing external-service functions. If a needed setting/function is unavailable, record its name and the blocked operation; retain simulator mode rather than purchasing a service or installing a plugin. [Official plugin limitation](https://support.moodle.com/support/solutions/articles/80000831611-installing-plugins-on-moodlecloud-sites).

In **Site administration**, open:

1. **Advanced features** → enable **Web services**, if editable.
2. **Server → Web services → Manage protocols** → enable **REST**. Some older versions place **Web services** under **Plugins**; use administration search when needed.
3. **Server → Web services → API documentation** → inspect the actual function names, parameter/response schemas and capability guidance.

The target's installed release and its own API documentation are decisive. The Moodle 5.1 sources linked below were reviewed as primary references, not evidence that the target runs 5.1. [Official External Services documentation](https://moodledev.io/docs/5.1/apis/subsystems/external).

## 4. Create a dedicated service user and restrict its roles

The owner opens **Users → Accounts → Add a new user**, creates a dedicated manual-authentication integration account with a controlled service mailbox, and records its non-secret user ID. Do not add it to **Site administrators**, or assign Manager/Teacher for convenience.

Create two custom roles at **Users → Permissions → Define roles → Add a new role**, starting without an archetype:

| Role and assignment scope | Allow for the baseline operations |
|---|---|
| Service access/profile role, **System** context | `webservice/rest:use`; `moodle/user:viewdetails`; `moodle/user:viewalldetails` for the stable `idnumber` field needed before course enrolment. The profile-read permission is site-wide: use a site containing only synthetic learning identities for this rehearsal. |
| Course provisioning role, **Course category** and **Course** context, assigned only in the reserved synthetic category | `moodle/course:create`, `moodle/course:visibility`, `moodle/course:view`, `moodle/course:viewhiddencourses`, `moodle/course:viewparticipants`, `moodle/course:managegroups`, `moodle/role:assign`, `enrol/manual:enrol`. |
| Additional reconciliation permission in that same synthetic category | `moodle/course:enrolreview` for active/suspended filters; `moodle/site:accessallgroups` if separate-group mode would otherwise hide participants from the service. Grant the latter only inside the test category. |
| Conditional removal permission, same category | `enrol/manual:unenrol` only if the reviewed test contract actually exercises policy-authorized removal. A retention-preserving suspension uses the manual enrol API's `suspend=1`, not unenrolment. |

Assign the first role through **Users → Permissions → Assign system roles**. Assign the second through the reserved category's **Permissions → Assign roles** page. At **Define roles → Allow role assignments**, allow this provisioning role to assign only the verified Student, lecturer and restricted tutor roles used by the test; leave unrelated roles unchecked. Role assignment capability alone does not select which roles may be assigned. [Official role administration](https://docs.moodle.org/501/en/Manage_roles).

For profile reads, `core_user_get_users` filters fields according to permissions; absent `idnumber` is a blocked identity lookup, not permission to match by name or email. The current primary [user profile source](https://github.com/moodle/moodle/blob/MOODLE_501_STABLE/public/user/lib.php) checks `moodle/user:viewalldetails` or the site's allowed identity fields before returning that field. Do not grant `moodle/user:update`, hidden-profile access or email access simply because the function declaration lists them: those are field/operation-dependent capability hints, not a demand to enable every listed permission.

The actual group capability is **`moodle/course:managegroups`**. `moodle/group:manage` in the older setup checklist is incorrect. Manual enrolment needs **`enrol/manual:enrol`** and verified assignable roles; removal needs **`enrol/manual:unenrol`**. `enrol/manual:manage` alone is not the external function's enrol/unenrol permission. [Official group implementation](https://github.com/moodle/moodle/blob/MOODLE_501_STABLE/public/group/externallib.php), [manual enrolment implementation](https://github.com/moodle/moodle/blob/MOODLE_501_STABLE/public/enrol/manual/externallib.php).

Read each needed role's actual **shortname**, numeric ID and capabilities on **Define roles**. The page URL contains its numeric `roleid`. Do not copy stock IDs from another installation. The legacy SIS staff-event producers use display labels such as `Student`, `Teacher`, `Tutor` and `Non-editing Teacher`; future live mapping must bind reviewed target shortnames and numeric IDs rather than copying these labels. The unsafe adapter translation has been removed and live staff delivery is denied. A broad stock Non-editing teacher does not establish tutorial-group scope. Verify a no-quiz tutor and a separately authorized restricted quiz role without course-editing authority.

Check **Participants → Enrolment methods** in the test-course template: **Manual enrolments** must be enabled. The external API does not create a missing manual-enrolment instance. [Official manual enrolment checks](https://docs.moodle.org/501/en/Manual_enrolment).

## 5. Create the custom service and exact function list

Open **Server → Web services → External services → Add**. Name the custom service for this synthetic rehearsal, check **Enabled** and **Authorised users only**, and add only the dedicated service account through **Authorised users**. Do not select the broad built-in mobile service.

For the initial read-only identity preflight, enable only `core_webservice_get_site_info`. Expand the service to the exact approved baseline set below only after the write gates in section 9 are implemented and reviewed. Record the function list and the service user's missing-capability report without recording its token. The installed site's API documentation and actual allow/deny results must agree with the source review. [Official web-service setup](https://docs.moodle.org/503/en/Using_web_services).

| Operation | Baseline authorized function(s) |
|---|---|
| Connection/site identity | `core_webservice_get_site_info` |
| Find/create course shell | `core_course_get_courses_by_field`, `core_course_create_courses` |
| Resolve existing synthetic identity | `core_user_get_users` |
| Read participants | `core_enrol_get_enrolled_users` |
| Enrol/reactivate/suspend; conditional removal | `enrol_manual_enrol_users`, `enrol_manual_unenrol_users` |
| Read/create official tutorial-group mirror | `core_group_get_course_groups`, `core_group_create_groups` |
| Add/remove/read group members | `core_group_add_group_members`, `core_group_delete_group_members`, `core_group_get_group_members` |

This is the twelve-function allowlist in [Moodle policy](../../packages/config/src/moodle.ts). Do not authorize `core_enrol_get_enrolled_users_with_capability` to make the current fallback work; remove that unapproved call in the adapter. Use explicit permitted participant queries and fail on unavailable/malformed responses.

### Requested operations that need a separate implemented extension

The namespace `SIS-MOODLE-LIVE-TEST-` is a synthetic-data prefix; it does not mean the current adapter creates Moodle **cohort objects**. Tutorial groups are course **groups**, while Moodle cohorts collect users across a site/category.

| Requested extension | Candidate function allowlist and minimum capability checks | Present implementation |
|---|---|---|
| Create/read cohort, mirror membership and reconcile removal | `core_cohort_create_cohorts`, `core_cohort_get_cohorts`, `core_cohort_get_cohort_members`, `core_cohort_add_cohort_members`, `core_cohort_delete_cohort_members`; `moodle/cohort:manage`, `moodle/cohort:view`, `moodle/cohort:assign` in the synthetic category | No cohort port, stable object mapping or outbox handler in the current adapter. Do not enable these functions merely to call the integration complete. |
| Read raw marks for staging | `gradereport_user_get_grade_items`; `gradereport/user:view` and `moodle/grade:viewall` in the specific synthetic course/category; group visibility must cover the reviewed roster | Current staging reads simulator batches. Live grade fetch, grade-item mapping, modification/revision evidence and checksum contract are missing. A grade report is evidence, never SIS result release. |
| Create/read/remove SIS-owned course-calendar mirrors | `core_calendar_create_calendar_events`, `core_calendar_get_calendar_events`, `core_calendar_delete_calendar_events`; `moodle/calendar:manageentries` only in the synthetic course/category | No calendar-event port, durable external-ID mapping, revision/idempotency contract or reconciliation handler. Course-event writes are a future implemented scope; they must not change activity deadlines or the official SIS timetable. |

Check the exact release for each candidate schema before implementing it. Do not assume an `update_calendar_events` function exists; choose a target-supported revision strategy that preserves old references. Do not add cohort/course deletion or grade-writing functions for automatic cleanup. Primary references: [core function declarations](https://github.com/moodle/moodle/blob/MOODLE_501_STABLE/public/lib/db/services.php), [grade-report declarations](https://github.com/moodle/moodle/blob/MOODLE_501_STABLE/public/grade/report/user/db/services.php), [grade access checks](https://github.com/moodle/moodle/blob/MOODLE_501_STABLE/public/grade/report/user/classes/external/user.php), [calendar checks](https://github.com/moodle/moodle/blob/MOODLE_501_STABLE/public/calendar/lib.php).

## 6. Mint a token and enter it locally

The administrator opens **Server → Web services → Manage tokens → Add**, selects the dedicated account and this custom service, sets an appropriate test expiry and, where stable, the API server's outbound IP restriction. Save and copy the token directly into the local hidden-entry prompt below or the API process's protected secret environment. The service user need not receive `moodle/webservice:createtoken` when the administrator issues its token. Moodle can display tokens in **Manage tokens**; do not depend on the older checklist's claim that the value is shown only once. [Official token setup](https://docs.moodle.org/503/en/Using_web_services).

Never put the value in a SIS form, `NEXT_PUBLIC_*`, source, command argument, shell history, log, screenshot, fixture, database row or exported evidence. Do not use `curl -v` or paste a token into a URL. The existing user decision in [ledger R4](../superpowers/plans/2026-09-27-moodlecloud-live-test-foundation-ledger.md) keeps the credential server-side in the process environment.

For the eventual API startup, a hidden prompt can inject the token into the child process without storing it or putting it in an argument. Run this **only after section 9's gates pass**, from `development/`, with the verified non-secret environment settings and isolated database already prepared:

```sh
python3 - <<'PY'
import getpass, os, subprocess, warnings
warnings.simplefilter('error', getpass.GetPassWarning)
env = os.environ.copy()
try:
    token = getpass.getpass('Moodle dedicated service token (hidden): ')
except (getpass.GetPassWarning, EOFError):
    raise SystemExit('A terminal with hidden input is required; API not started.')
if not token.strip():
    raise SystemExit('Token was not provided; API not started.')
env['MOODLE_API_TOKEN'] = token
raise SystemExit(subprocess.call(
    ['node', 'scripts/with-env.mjs', 'npm', 'run', 'dev:api'], env=env))
PY
```

The environment wrapper preserves supplied environment variables and loads the local `.env` for other settings. Terminal access and access to the running process remain restricted. Stop the process after the rehearsal. For repeated starts, use the deployment's existing protected environment mechanism instead of placing a token in a new repository file.

## 7. Prove read-only Moodle connectivity before API live mode

This bootstrap check does not start the SIS worker. The administrator runs it locally, enters the confirmed origin and exact hostname allowlist, then pastes the service token into a hidden prompt. It posts form parameters with TLS verification, rejects redirects and prints only sanitized identity/function evidence. It does not create a course, user, cohort, enrolment, grade or calendar event.

Run from this worktree's `development/` directory:

```sh
python3 scripts/moodle-connection-check.py https://sis-moodle.moodlecloud.com sis-moodle.moodlecloud.com
```

The [standard-library script](../../scripts/moodle-connection-check.py) requires an interactive terminal and hidden token input. It rejects other hosts, insecure origins, credentials/query/path in the origin, redirects, malformed identity and oversized responses. It prints selected identity/function fields only; arbitrary site names, profiles and remote error text are excluded. The token has no command-line option and is not persisted. Its four local boundary tests make no network requests.

This supplies the actual `siteid`, exact human-readable `release`, numeric version and token-authorized functions. Review the origin against the owner's Portal URL and record the safe output. `siteid` is Moodle's site-course ID, often `1`; it does not uniquely identify a cloud tenant. The hostname is the tenant boundary. The API must subsequently compare hostname, site ID and exact release rather than merely displaying “Connected”. [Approved target-identity design](../superpowers/specs/2026-09-25-moodlecloud-test-live-integration-design.md).

If authentication fails, check service enabled state, authorized user, token expiry/IP restriction, REST capability and installed function availability. An HTTP 200 response containing a Moodle `exception` is a failure. Do not log the full response or relax TLS, follow a redirect, use an administrator token or retry blindly.

## 8. Non-secret SIS settings and server health

Keep mode `simulator` while setup and implementation remain incomplete. The origin/site/release below were authenticated on 2026-10-07. Every remaining blank needs verified target/run evidence and is not a guessed default. The token is entered separately through section 6.

```dotenv
MOODLE_INTEGRATION_MODE=simulator
MOODLE_API_URL=https://sis-moodle.moodlecloud.com
MOODLE_ALLOWED_HOST=sis-moodle.moodlecloud.com
MOODLE_EXPECTED_SITE_ID=1
MOODLE_EXPECTED_VERSION="5.2.2 (Build: 20260810)"
MOODLE_ROLE_IDS=
MOODLE_CATEGORY_ID=
MOODLE_COURSE_VISIBLE=
MOODLE_LIVE_TEST_RUN_ID=
MOODLE_LIVE_TEST_DB_FINGERPRINT=
MOODLE_LIVE_TEST_COHORT_PREFIX=SIS-MOODLE-LIVE-TEST-
```

- `MOODLE_API_URL` is the exact HTTPS origin; `MOODLE_ALLOWED_HOST` is its bare exact hostname, not a site title or URL path.
- `MOODLE_EXPECTED_VERSION` is the exact returned `release`, including any suffix; it is not the numeric `version`.
- `MOODLE_ROLE_IDS` maps the reviewed adapter keys to the site's integer role IDs. Complete the label/shortname contract repair before relying on it.
- Create the reserved category manually through **Courses → Manage courses and categories → Create new category**. Record its numeric category ID from the actual page. Choose `MOODLE_COURSE_VISIBLE=0` or `1` explicitly; visibility for hidden-course access must match the test plan.
- The run ID and database fingerprint must come from an implemented run preparation/manifest mechanism; arbitrary nonempty strings do not prove isolation. The approved fingerprint hashes protocol, hostname, port, database and Prisma schema, excluding credentials and raw database URLs.

The [configuration resolver](../../apps/api/src/integration/moodle-live-config.ts) checks all twelve setting names and returns `live-test-disabled` with stable refusal codes for an invalid requested live test. Static configuration validation is only one gate.

For the local SIS, confirm the API's ordinary health endpoint using the bound port shown at startup, for example `http://127.0.0.1:3001/health`. Then sign into the SIS as the authorized Moodle administrator or Integration Support officer, open **Moodle administration → Mappings → Test connection**, and inspect **Sync health**. The server endpoints are `GET /integration/health` and CSRF-protected `POST /integration/connection/validate` (hosted deployments add `/api`). No token belongs in these browser requests.

Record API reachability separately from Moodle identity validation, write permission and reconciliation. A simulator result is labelled simulator. A refused live-test result stays refused. The repaired adapter validates exact host/site ID/release with bounded, redirect-rejecting form transport. That identity check is separate from the still-required run, manifest, mapping, claims and operation-specific permissions; it must not open the write gate.

## 9. Implementation gates before any live write

These are source findings from this worktree on 2026-10-07, not claims based only on an old conversation. Follow the [foundation execution plan](../superpowers/plans/2026-09-27-moodlecloud-live-test-foundation.md) and reverify after changes.

| Current gap | Required repair and evidence |
|---|---|
| Repaired read-only transport | Canonical configuration and exact host/site/release, deterministic nested form encoding, trusted selectors/token in POST body, selector-override rejection, no redirect, bounded response/deadline and safe errors are locally verified. This is a transport increment, not the full live foundation. |
| Unsafe adapter provisioning/reconciliation removed | All six mutation methods and unscoped reconciliation reads refuse before Prisma/HTTP. Hard-coded category/visibility, role-presence shortcuts, fake user identities, unsupported participant fallback and unenrolment labelled suspension were removed. Reintroduce only behind verified run/manifest/mapping/claim controls with exact target contracts. |
| Staff roles, enrolment state and group facts | Future live paths must use immutable identity bindings, target shortnames/numeric IDs, verified manual-enrolment facts, retention-preserving `suspend=1`/reactivation, and `core_group_get_group_members`. No label/name/email guess can stand in for these proofs. |
| No `MoodleLiveTestRun` schema/model, immutable scope manifest or write-run authority gate exists in current source | Implement preparation, independent decisions, reviewed fresh authentication, human-reviewed non-production target attestation, database fingerprint, manifest coverage, `PREPARED/RUNNING/PAUSED` transitions and denial tests. Prefix checks alone cannot authorize writes. |
| Interim source-flow gate now refuses every live write/reconciliation path before attempts/mappings/remote effects | [MOODLE-001](../task-packets/TASK-V2-MOODLE-001.md) keeps source events pending and exposes separate write readiness. Before opening delivery, implement atomic run/manifest claims and fencing, perform remote effects outside SIS transactions and durably record/read back uncertain outcomes. Preserve canonical event identifiers. |
| Cohort, live grade and calendar extension ports/handlers absent | Implement each reviewed extension with separate mappings, event/revision contract, exact function allowlist, reconciliation and failure/deny tests before adding its permissions. The baseline approved design excludes grade/activity transfer; the expanded requested scope needs its own current task packet. |

Do not start the current API worker with a live write-capable token until these gates are resolved. Pre-provision fictional Moodle students/staff through the administrator's controlled **Add a new user** or **Upload users** process. Each student's `idnumber` equals its reserved-prefix SIS student number; each staff `idnumber` is an explicit immutable manifest binding. Passwords and authentication are never synchronized from SIS to Moodle.

## 10. Synthetic rehearsal, recovery and rollback

After the implemented preflight passes, prepare an isolated SIS database and append-only manifest containing only the rehearsal operators and the reserved-prefix fictional programme, period, courses, offerings, students, staff, registrations, groups, mappings and source events. Keep ordinary seed/demo records outside this database. Never reset a shared database to obtain an empty queue.

Run these stages in order and attach secret-free evidence to each:

1. **Read-only preflight:** exact tenant/site-course/release, function set, explicit role/category settings, database fingerprint and complete manifest all agree. The non-production target attestation is human-reviewed. Two distinct authorized accounts review the frozen scope and record `PREPARED → RUNNING` decisions through the reviewed fresh-authentication mechanism. Ordinary login or a token prompt is not that approval. Its absence keeps `RUNNING` blocked.
2. **Shell and access:** one approved offering/period produces one mapped shell in the selected category; registration produces Student access; an approved staff assignment produces only its selected role; official TG membership appears in the mapped course group.
3. **Duplicate/concurrency proof:** resend the same authorized event/idempotency key and run competing claims; course, role/enrolment and group counts stay unchanged. A timeout after an uncertain remote effect performs a verification query before retry.
4. **Suspension/reactivation:** change source access through the authorized SIS workflow; Moodle access suspends/reactivates while submissions, grades and mappings remain available as required. SIS registration is never changed by an integration queue action.
5. **Outage/replay:** interrupt the test connection without changing source payloads; registration stays complete and learning access shows delayed/being prepared. Restore connectivity, review the same event, approve governed replay, then reconcile. No simulator outage switch is used to claim a live failure test.
6. **Expected versus actual:** compare numerical course/user/group IDs, SIS identity links, requested roles, active/suspended status and membership; route unexpected participants/identity conflicts to governed cases. Close only with confirmed destination facts and a downstream check.
7. **Extensions, only once implemented:** create one mapped cohort and membership; read one fictional grade item into an immutable staged batch with provenance and revised-source conflict detection; create/read/revise one SIS-owned course-calendar mirror with timezone and stable external-ID evidence. Verify each independently. Live raw marks never release an official result and a calendar mirror never proves timetable conflict checking.

For rollback/containment:

1. Pause the authorized test run and delivery, stop its worker, and confirm no claims remain in flight. If run controls are not implemented, do not begin the write rehearsal.
2. If a credential was exposed, revoke it immediately in **Manage tokens**. Otherwise perform verified cutover before revoking an old token; record the rotation without its value.
3. Preserve the SIS events, delivery attempts, mapping versions, source snapshots, discrepancies and audit history. Do not delete queue records, reset registrations or edit marks to hide an external mismatch.
4. Reconcile the exact manifest against Moodle. Suspend only manifested test enrolments through the verified policy path. An administrator can hide/archive a test shell while retaining activity/submission evidence; automatic course/cohort deletion is outside this runbook.
5. Remove/revise only the extension's manifested memberships/calendar mirrors through its reviewed compensation workflow. Retain predecessor IDs and evidence. Grades already staged remain immutable; a later source revision creates a new batch/conflict.
6. Close the run only after source/remote counts and evidence agree, or retain an assigned unresolved case. After recorded Charles/Chitindu review and **before `COMPLETED → CLOSED`**, revoke the dedicated rehearsal token in Moodle **Manage tokens** and record non-secret revocation confirmation. Mint a replacement only for a separately approved future run. Cleanup is a separate approved action after `CLOSED`, with its own receipt; the test objects remain retained until then. Return the deployment to explicit `simulator` mode and confirm the next health response reports simulator.

## 11. Completion evidence

A completed connection package contains the confirmed URL origin, actual site-course/release/numeric version, API function list, service-user role/capability review, category/visibility and role IDs, manifest/run/fingerprint reference, non-production attestation and fresh-authentication decisions, preflight timestamp, approved mapping version, remote object IDs, idempotency/correlation references, delivery results, reconciliation counts, negative/recovery tests, rollback result, named human acceptance and token-retirement confirmation before closure. No credential or complete authenticated request URL is included.

The original identity-check service exposed only `core_webservice_get_site_info`, and the owner deleted the earlier chat-exposed token. The replacement local token confirmed site ID 1 and release `5.2.2 (Build: 20260810)` on 2026-10-13; its service still lacks `core_user_create_users`, `core_course_create_courses` and `enrol_manual_enrol_users`, and the reserved category is absent. Full course/enrolment/group delivery and live grade/cohort/calendar extensions remain **pending** behind the persisted-run, manifest, mapping and claim gates. Do not describe this read-only success as a fully configured operational integration.
