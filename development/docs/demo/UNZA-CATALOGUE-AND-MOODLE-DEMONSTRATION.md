# UNZA catalogue and Moodle demonstration

Status, 13 October 2026: offline administrative provisioning tool implemented; replacement token passes read-only identity check. Cloud writes await service functions, reserved category, verified roles and quota. Lead: Charles Hangoma. Reviewer: Chitindu Milimbo. Human acceptance pending.

The owner requested UNZA-like programmes/courses and realistic demonstration workflows, without repeating “fictional” beside every item. Use one visible **Demonstration environment** notice. Public academic names can appear normally; generated identities, records, marks and operating policies remain identified in internal provenance and exported evidence. This does not make the installation UNZA's official SIS or turn generated results into institutional records.

## Catalogue evidence

The versioned [catalogue](catalogues/unza-public-catalogue-2026-10-12.json) contains eight programme names and twelve course titles checked against official public UNZA pages on 2026-10-12:

- [Natural and Applied Sciences programmes](https://web.unza.zm/natural-and-applied-sciences/undergraduates).
- [Electrical and Electronic Engineering programme and courses](https://www.unza.zm/undergraduate/school-of-engineering/electrical-and-electronic-engineering/bachelor-of-engineering-electrical-and-electronic-engineering).

These sources establish names and the indicated year labels. They do not establish an approved current machine-readable curriculum, official identifiers for every course, credits, prerequisites, fees or binding SIS policies. Programme pages for Computer Science and Software Engineering did not expose reliable course lists. Accordingly `officialCode` is null; reserved `SIS-…` shortnames are local identifiers. Existing SWE111-style fixtures must not be described as verified UNZA codes. Original website quirks and ambiguous combined course/code fragments were excluded rather than guessed.

## Administrative tool boundary

[provision.py](../../scripts/moodle-demo/provision.py) is a separately invoked, bounded demonstration administration tool. It does not bypass or enable the governed SIS delivery worker. Existing Moodle `NOT_PROVISIONED` results remain truthful until the persisted run, mapping, manifest and delivery-claim implementation is complete. This tool does not stage grades, generate official registrations, publish timetables, reconcile production access or send notifications.

The owner explicitly authorized loading the existing MoodleCloud demonstration site. The only supported origin is `https://sis-moodle.moodlecloud.com`. No new instance, subscription, paid upgrade, Moodle package or plugin is purchased/downloaded. Site usage consumes its existing plan allowance; verify its available user/storage quota in MoodleCloud Portal before execution. The tool caps each manifest at 100 generated users, 50 courses and 500 memberships; these are safety limits, not claims about the owner's subscription. Lower them to fit the site's actual remaining allowance.

## Prepare the existing site

1. Sign in to MoodleCloud Portal and confirm this site's URL, remaining user allowance and storage. Preserve unrelated users/courses. Create one reserved course category called **SIS Demonstration** and record its numeric ID.
2. Reuse the dedicated service user, not an administrator account. Create a separate restricted external service for this administrative rehearsal rather than broadening the identity-check service without review. Enable authorised-users-only and REST. Limit token lifetime and network restriction where available.
3. Verify the installed site's API documentation exposes these exact functions: `core_webservice_get_site_info`, `core_user_get_users_by_field`, `core_user_create_users`, `core_course_get_courses_by_field`, `core_course_create_courses`, `core_course_get_categories`, `core_enrol_get_course_enrolment_methods`, `core_enrol_get_enrolled_users`, `enrol_manual_enrol_users`.
4. Grant only the capabilities required by those functions. User creation needs site-level user-create authority; profile lookup needs permitted identity fields. Course creation/view-hidden/enrolment authority belongs only in the reserved category. Restrict assignable roles to the actual student and teacher roles verified on this site. Do not guess conventional role IDs 5/3 or grant Site administrator/Manager for convenience. If the site cannot express the required restricted role, stop and retain the offline plan.
5. Verify manual enrolment is enabled for newly created shells. Record the actual student and teaching role IDs, exact Moodle release and site-course ID from a fresh read-only identity check. A historical identity check is insufficient.
6. Use the current private token only if **Manage tokens** shows it belongs to the restricted administrative service below. If it belongs to the connection-check service, mint a separate token for the administrative service. The prior chat-exposed token was deleted and must never be reused. Keep tokens out of chat, source control, screenshots and evidence logs.

### Give the dedicated token read and write functions

This is a site-administrator setup action in MoodleCloud. The token is already present locally; adding functions to another service will not change what that token can do.

1. Open `https://sis-moodle.moodlecloud.com` and sign in as the site administrator. In **Site administration → Server → Web services → Manage protocols**, confirm **REST** is enabled. It was enabled at the last check.
2. In **Site administration → Server → Web services → Manage tokens**, find the current token row and note its **Service** and **User** columns without copying the token value. The user should be the dedicated **temp setup** account. If its service is **SIS connection check**, keep that read-only service as it is; use a separate enabled custom service for provisioning. If its service is the intended restricted **temp setup** administrative service, edit that service in the next step.
3. Open **Site administration → Server → Web services → External services**. Select the administrative service. Set **Enabled** and **Authorised users only**, then open **Functions → Add functions**. Add exactly the missing `core_user_create_users`, `core_course_create_courses`, and `enrol_manual_enrol_users`. Keep its existing six read functions: `core_webservice_get_site_info`, `core_user_get_users_by_field`, `core_course_get_courses_by_field`, `core_course_get_categories`, `core_enrol_get_course_enrolment_methods`, and `core_enrol_get_enrolled_users`. The provisioning tool requires all nine on the *same service*.
4. Open that service's **Authorised users** page and add only **temp setup**. Moodle shows any missing function capabilities there. Give this account a purpose-specific role with `moodle/user:create` at system scope; grant `moodle/course:create` in the reserved demonstration category where Moodle permits category scope; and allow `enrol/manual:enrol` only for its demonstration courses. Check the other capabilities Moodle lists for the nine functions. Do not assign Site administrator or unrestricted Manager merely to make the check pass. If MoodleCloud cannot express these restrictions, leave cloud writes paused.
5. If the existing token belongs to a different service, return to **Manage tokens → Add**, choose **temp setup** and the restricted administrative service, set an expiry and IP restriction if appropriate, then save. Replace `MOODLE_API_TOKEN` in the ignored local `development/.env` with this new token. If the existing token already belongs to the edited service, retain it and do not create another. Never paste either token into chat.
6. Open **Site administration → Courses → Manage courses and categories** and create the category **SIS Demonstration**. Record its numeric category ID. Confirm **Manual enrolments** is enabled under **Site administration → Plugins → Enrolments → Manage enrol plugins**. In **Users → Permissions → Define roles**, record this site's numeric Student and Teacher role IDs; do not assume default values. Check remaining user and storage allowance in the MoodleCloud Portal.
7. Reply with only the **service name, category ID, Student role ID, Teacher role ID, and remaining user allowance**. I will repeat a read-only nine-function/category preflight using the local token. No course or user is created by that check.

Moodle's [web-service setup guide](https://docs.moodle.org/501/en/Setting_up_a_web_service) describes services, functions, authorised users and tokens. Its [API function list](https://docs.moodle.org/dev/Web_service_API_functions) lists the three write functions; [manual enrolment guidance](https://docs.moodle.org/501/en/enrol) explains the enrolment method.

## Offline plan and private configuration

From `development/`:

```sh
umask 077
mkdir -p .evidence/private-moodle-demo
python scripts/moodle-demo/build_manifest.py > .evidence/private-moodle-demo/manifest.json
python scripts/moodle-demo/provision.py .evidence/private-moodle-demo/manifest.json
```

The initial preview contains four generated identities, twelve courses and forty-eight memberships, solely to exercise the tool. It is not an export of every existing SIS demonstration account. Extend the manifest from a reviewed, generated-only source inventory to include the desired SIS participants and genuine demonstration teaching/enrolment relationships. Preserve stable SIS-to-Moodle `idnumber` mappings; do not indiscriminately copy administrator accounts, passwords/hashes, sessions, tokens, uploaded identity documents, audit logs or unrelated test records. The preview's all-course memberships are illustrative; they must not be presented as actual SIS registration lineage.

Create a private `config.json` in that directory with these fields. Substitute **verified values**, not these examples:

```json
{
  "origin": "https://sis-moodle.moodlecloud.com",
  "siteId": 1,
  "release": "REPLACE_WITH_FRESH_IDENTITY_RELEASE",
  "categoryId": 0,
  "categoryName": "SIS Demonstration",
  "studentRoleId": 0,
  "teacherRoleId": 0,
  "roleIdsVerifiedByOwner": true
}
```

Zero IDs intentionally fail validation. Before running, confirm `.evidence/private-moodle-demo/` is Git-ignored and mode 0700. In a private Bash terminal, read the token without echo or history:

```sh
read -r -s -p 'Dedicated Moodle token: ' SIS_MOODLE_DEMO_TOKEN
export SIS_MOODLE_DEMO_TOKEN
python scripts/moodle-demo/provision.py .evidence/private-moodle-demo/manifest.json --execute --config .evidence/private-moodle-demo/config.json --state-dir .evidence/private-moodle-demo/run-001
unset SIS_MOODLE_DEMO_TOKEN
```

Do not run until the owner/reviewer has checked the concrete offline manifest, category, roles and quota. The tool first rechecks site identity, complete service function availability and category. It creates hidden shells. Review a representative student and teacher login before independently publishing visibility through Moodle administration. Students ordinarily cannot see hidden shells; a successful provisioning receipt alone is not a learner-access demonstration.

## Idempotency, recovery and credentials

Objects use namespace-scoped deterministic `idnumber` values. Existing objects must match the manifest; mismatches stop rather than update or take over objects. Remote usernames and shortnames also have reserved prefixes. Enrolments only address manifested users/courses with owner-verified roles and confirmed manual enrolment.

Before each mutation, a private receipt records the pending stable key. On interruption/lost response, the next invocation reads the remote object or membership first. A confirmed matching object resolves uncertainty. If the result remains absent or ambiguous, the tool stops without blindly creating again. Receipts bind both manifest and target configuration. Keep both immutable for retries. No automatic destructive cleanup is provided.

The private `credentials.json` contains generated Moodle passwords; share through a suitable private channel only. It is not an evidence artifact or deployment file. SIS passwords are not reused. The exclusive `running.lock` prevents concurrent local CLI runs. After a killed process, inspect the receipt and confirm no process is alive before manually removing only that lock; never delete the receipt to force a retry.

After execution compare manifested counts/IDs with Moodle, check student/teacher access, then review the separate SIS mapping/worker readiness. Retain private receipts and non-secret counts. Revoke the dedicated token when the administrative rehearsal is finished. Containment uses category-scoped hiding or verified enrolment suspension; this tool never deletes courses, users, activity/submission evidence or official SIS records.

## Current verification and blockers

Fourteen standard-library tests pass: foreign/credential-bearing origin rejection, generated-only and manifest bounds, unowned membership rejection, lost create response reconciled without duplicate creation, absent uncertain create blocked on repeat, complete user/course/manual-enrolment lifecycle and idempotent rerun, lost enrolment response reconciliation, absent uncertain enrolment blocked on repeat, wrong existing course category/name rejection, wrong site/missing service function with zero mutations, and offline CLI with network access prohibited. The preview dry-run reports zero network requests. No live Moodle mutation has been executed.

On 2026-10-13 the owner supplied a replacement token in the ignored local `.env`. A read-only check confirmed site ID 1 and release `5.2.2 (Build: 20260810)`. Its linked service still lacks `core_course_create_courses`, `core_user_create_users`, and `enrol_manual_enrol_users`; a read-only category lookup found no `SIS Demonstration` category. Add those functions to the token's restricted external service and create the reserved category before another preflight. Owner-verified student/teacher role IDs and remaining site quota are also required. No live Moodle mutation has been executed. Full governed SIS delivery is separately blocked by the documented persisted run/mapping/claim foundation.

### Export the existing generated SIS participants

For the retained local review database, `scripts/moodle-demo/export_review_manifest.mjs` uses a read-only transaction and an exact seed-source username allowlist plus reviewed setup/publication actors. It refuses other hosts/databases, inactive accounts/people, non-generated email provenance and excessive counts. Invoke it with the existing guarded runner from the review worktree root:

```sh
node .superpowers/sdd/2026-10-07-synthetic-university-setup-plan/run-isolated.mjs sis_time003_review_20261004 node scripts/moodle-demo/export_review_manifest.mjs /PRIVATE-IGNORED-DIRECTORY/manifest.json
```

The output file must not exist and is created mode 0600. Fresh read-only verification on 2026-10-12 found **25 active allowlisted generated accounts, 2 course-period shells and 2 confirmed student course memberships**. No teaching membership is inferred from administrator privileges or unrelated programme-level teaching assignments. All other exported users start without course access. These current counts supersede older notes mentioning 23 people; they do not prove that every local test-created record should be copied.

The exporter preserves existing course names/identifiers and registration lineage. The separately verified UNZA reference catalogue is for a reviewed future academic setup/import, not an instruction to rewrite saved registrations or replace the published eleven-session timetable. Additional UNZA course learning spaces can be provisioned from a separately reviewed catalogue manifest; membership must be chosen explicitly for that demonstration, never claimed as an SIS-authorized official registration.
