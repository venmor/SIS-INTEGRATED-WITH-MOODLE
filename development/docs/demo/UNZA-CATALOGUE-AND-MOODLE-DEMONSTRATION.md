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

The owner explicitly authorized loading the existing MoodleCloud site for a final year project demonstration. The Moodle site and deployed SIS are demonstration environments; no real university production service is involved. The primary Moodle administrator account and a token with full site access may be used to complete this setup quickly. The only supported origin is `https://sis-moodle.moodlecloud.com`. No new instance, subscription, paid upgrade, Moodle package or plugin is purchased/downloaded. Site usage consumes its existing plan allowance; check its available user/storage quota before execution. The tool caps each manifest at 100 generated users, 50 courses and 500 memberships; these are tool limits, not claims about the subscription.

## Prepare the existing site

1. Sign in to the MoodleCloud Portal to confirm this site's URL and remaining user/storage allowance. Then open the Moodle site at `https://sis-moodle.moodlecloud.com` and create a course category named **SIS Demonstration** under **Site administration → Courses → Manage courses and categories**. Record its numeric ID from the selected category's URL.
2. Use either the existing **temp setup** account or the primary site administrator. The primary administrator is acceptable for this demonstration. REST is already enabled; the selected account's token must be bound to a service exposing all nine functions below.
3. Confirm manual enrolment is enabled for newly created courses. Record the site's actual Student and Teacher role IDs and the category ID. The tool uses those IDs to enrol the intended generated participants in the right roles.
4. Keep the token in the ignored local `.env`. The earlier chat-exposed token was deleted; use the replacement token or make a new one for the selected service. Send only the service name, category ID, Student role ID, Teacher role ID, and remaining active-user allowance. No token value is needed in chat.

### Give the demonstration token read and write functions

This is a MoodleCloud administrator setup action. A full-access administrator token is fine here. Moodle still limits a token to the functions on its selected external service, so account access alone does not expose the missing API functions.

1. Open `https://sis-moodle.moodlecloud.com` and sign in as the site administrator. In **Site administration → Server → Web services → Manage protocols**, confirm **REST** is enabled. It was enabled at the last check.
2. In **Site administration → Server → Web services → Manage tokens**, locate the current token and check its **Service** and **User** columns. Choose **temp setup** or your primary administrator account. If the current token uses **SIS connection check**, either add the write functions to that service for this demonstration or create a separate enabled custom service and token.
3. Open **Site administration → Server → Web services → External services**. Select the service attached to the token you will use. Under **Functions → Add functions**, add `core_user_create_users`, `core_course_create_courses`, and `enrol_manual_enrol_users`. The same service also needs `core_webservice_get_site_info`, `core_user_get_users_by_field`, `core_course_get_courses_by_field`, `core_course_get_categories`, `core_enrol_get_course_enrolment_methods`, and `core_enrol_get_enrolled_users`. The provisioning tool checks all nine before writing.
4. If the service is **Authorised users only**, add the chosen account on its **Authorised users** page. A primary administrator account already has the required Moodle permissions. If using **temp setup**, give it the permissions Moodle lists for user creation, course creation and manual enrolment, or use the primary administrator to avoid that role configuration work.
5. If you created a new service, go to **Manage tokens → Add**, choose the selected account and that service, then save. Replace `MOODLE_API_TOKEN` in the ignored local `development/.env` with the new value. If you edited the service already attached to the current token, keep the existing token. Do not paste the token into chat.
6. Open **Site administration → Courses → Manage courses and categories** and create/select **SIS Demonstration**. Its numeric ID is in the selected category's browser address (usually `categoryid=` or `id=`). Confirm **Manual enrolments** is enabled under **Site administration → Plugins → Enrolments → Manage enrol plugins**. For role IDs, open **Site administration → Users → Permissions → Define roles**, click **Edit** beside **Student**, and note the number after `roleid=` in the browser address. Repeat for **Teacher**. Do not guess the IDs from another Moodle site.
7. For allowance, open your profile menu → **Manage plans and billing** → the MoodleCloud Portal **Plan** tab → **site usage**. Note the active-user limit and current active-user count; the remaining allowance is the difference. Return to **Manage tokens** to read the chosen token row's **Service** name. Reply with only the **service name, category ID, Student role ID, Teacher role ID, and remaining user allowance**. I will repeat the read-only preflight, then provision the generated demonstration users and hidden course shells if it passes.

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

Check the concrete offline manifest, category, roles and quota before running. The tool first rechecks site identity, complete service function availability and category. It creates hidden shells. Test a representative student and teacher login before making courses visible through Moodle administration. Students ordinarily cannot see hidden shells; a successful provisioning receipt alone does not show learner access.

## Idempotency, recovery and credentials

Objects use namespace-scoped deterministic `idnumber` values. Existing objects must match the manifest; mismatches stop rather than update or take over objects. Remote usernames and shortnames also have reserved prefixes. Enrolments only address manifested users/courses with owner-verified roles and confirmed manual enrolment.

Before each mutation, a private receipt records the pending stable key. On interruption/lost response, the next invocation reads the remote object or membership first. A confirmed matching object resolves uncertainty. If the result remains absent or ambiguous, the tool stops without blindly creating again. Receipts bind both manifest and target configuration. Keep both immutable for retries. No automatic destructive cleanup is provided.

The private `credentials.json` contains generated Moodle passwords; share through a suitable private channel only. It is not an evidence artifact or deployment file. SIS passwords are not reused. The exclusive `running.lock` prevents concurrent local CLI runs. After a killed process, inspect the receipt and confirm no process is alive before manually removing only that lock; never delete the receipt to force a retry.

After execution compare manifested counts/IDs with Moodle, check student/teacher access, then review the separate SIS mapping/worker readiness. Retain private receipts and non-secret counts. Revoke the dedicated token when the administrative rehearsal is finished. Containment uses category-scoped hiding or verified enrolment suspension; this tool never deletes courses, users, activity/submission evidence or official SIS records.

## Current verification and blockers

Fourteen standard-library tests pass: foreign/credential-bearing origin rejection, generated-only and manifest bounds, unowned membership rejection, lost create response reconciled without duplicate creation, absent uncertain create blocked on repeat, complete user/course/manual-enrolment lifecycle and idempotent rerun, lost enrolment response reconciliation, absent uncertain enrolment blocked on repeat, wrong existing course category/name rejection, wrong site/missing service function with zero mutations, and offline CLI with network access prohibited. The preview dry-run reports zero network requests. No live Moodle mutation has been executed.

On 2026-10-13 the owner supplied a replacement token in the ignored local `.env`. A read-only check confirmed site ID 1 and release `5.2.2 (Build: 20260810)`. Its linked service still lacks `core_course_create_courses`, `core_user_create_users`, and `enrol_manual_enrol_users`; a read-only category lookup found no `SIS Demonstration` category. Add those functions to the selected external service and create the category before another preflight. The site's Student/Teacher role IDs and remaining user quota are also needed. No live Moodle mutation has been executed. Full governed SIS delivery is separately blocked by the documented persisted run/mapping/claim foundation.

### Export the existing generated SIS participants

For the retained local review database, `scripts/moodle-demo/export_review_manifest.mjs` uses a read-only transaction and an exact seed-source username allowlist plus reviewed setup/publication actors. It refuses other hosts/databases, inactive accounts/people, non-generated email provenance and excessive counts. Invoke it with the existing guarded runner from the review worktree root:

```sh
node .superpowers/sdd/2026-10-07-synthetic-university-setup-plan/run-isolated.mjs sis_time003_review_20261004 node scripts/moodle-demo/export_review_manifest.mjs /PRIVATE-IGNORED-DIRECTORY/manifest.json
```

The output file must not exist and is created mode 0600. Fresh read-only verification on 2026-10-12 found **25 active allowlisted generated accounts, 2 course-period shells and 2 confirmed student course memberships**. No teaching membership is inferred from administrator privileges or unrelated programme-level teaching assignments. All other exported users start without course access. These current counts supersede older notes mentioning 23 people; they do not prove that every local test-created record should be copied.

The exporter preserves existing course names/identifiers and registration lineage. The separately verified UNZA reference catalogue is for a reviewed future academic setup/import, not an instruction to rewrite saved registrations or replace the published eleven-session timetable. Additional UNZA course learning spaces can be provisioned from a separately reviewed catalogue manifest; membership must be chosen explicitly for that demonstration, never claimed as an SIS-authorized official registration.
