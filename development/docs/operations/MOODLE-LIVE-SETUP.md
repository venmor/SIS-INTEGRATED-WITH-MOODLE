# Moodle live-connection setup

Goal: connect SIS to a Moodle 4.x+ site through a dedicated External
Services account without allowing writes during the first proving step.

The live adapter needs:

- `MOODLE_API_URL`
- `MOODLE_API_TOKEN`
- `MOODLE_ROLE_IDS`
- `MOODLE_CATEGORY_ID`
- `MOODLE_LIVE_WRITES` (keep `false` until the read-only checks pass)

The deterministic `MOODLE-SIM-v1` backend remains active only when both
URL and token are absent. Supplying only one is treated as a
configuration error rather than silently falling back to the simulator.

## 1. Enable web services

As a Moodle Site Administrator:

1. Site administration → Advanced features → enable **Web services**.
2. Site administration → Server → Web services → Manage protocols →
   enable **REST**.
3. Prefer a dedicated custom External Service for the SIS integration
   rather than expanding a general-purpose service.

## 2. Create a dedicated service user

Create a non-human account such as `sis-integration`.

Do not make this account a Site Administrator. Give it only the role and
service permissions required by the custom External Service.

Never reuse a lecturer or administrator's personal token.

## 3. Create the integration role

Create a system-level role for the service user with only the
capabilities required by your Moodle configuration. At minimum, the
account/service must be able to:

- read site information,
- read/create the configured course shells,
- look up Moodle users,
- read and manage manual enrolments,
- read/manage groups,
- use REST web services.

Confirm the effective permissions on the target Moodle instance rather
than copying a role definition from another installation.

## 4. Create the custom External Service

Site administration → Server → Web services → External services.

Create an enabled service such as **SIS enrolment sync**, restrict it to
authorised users, and add `sis-integration`.

Add these functions:

- `core_webservice_get_site_info`
- `core_course_get_courses_by_field`
- `core_course_create_courses`
- `core_user_get_users`
- `core_enrol_get_enrolled_users`
- `enrol_manual_enrol_users`
- `enrol_manual_unenrol_users`
- `core_group_get_course_groups`
- `core_group_get_group_members`
- `core_group_create_groups`
- `core_group_add_group_members`
- `core_group_delete_group_members`

The adapter uses Moodle's REST parameter structure, including bracketed
nested parameters such as `enrolments[0][userid]` and
`groupids[0]`.

## 5. Mint the token

Site administration → Server → Web services → Manage tokens.

Create a token for `sis-integration` and the custom SIS service. Copy
it into your secret/environment configuration.

SIS does not persist the token in its database or application audit
records. Infrastructure, proxy and APM logging should also redact
web-service tokens.

## 6. Confirm role IDs on this Moodle site

Site administration → Users → Permissions → Define roles.

Open every Moodle role that SIS may assign and record its numeric role
ID from that Moodle instance.

Populate `MOODLE_ROLE_IDS` using the SIS labels:

```json
{
  "Teacher": 3,
  "Tutor": 4,
  "Non-editing Teacher": 4,
  "Student": 5
}
```

The numbers above show the **shape only**. Do not copy them without
checking your site.

If your SIS Tutor role intentionally uses Moodle's stock Non-editing
Teacher role, `Tutor` and `Non-editing Teacher` may deliberately map
to the same numeric Moodle role ID. `Student` must map to the actual
student role on your site.

Unknown labels are refused instead of guessed.

## 7. Confirm the destination course category

Choose the Moodle category where SIS-created course shells should live.
Read its numeric category ID and set:

```
MOODLE_CATEGORY_ID=<target category id>
```

Do not rely on category `1` unless you have explicitly confirmed that
it is the intended destination on this Moodle instance.

## 8. Confirm Moodle identity keys

The adapter uses stable identifiers:

- SIS student `studentNumber` ↔ Moodle user `idnumber`
- SIS staff username ↔ Moodle `idnumber` value
  `staff-<username>`

Names and email addresses are not reconciliation keys.

Before enabling writes, confirm that the Moodle users you intend to sync
already have the required `idnumber` values.

## 9. First connection: read-only

Configure:

```
MOODLE_API_URL=https://your-moodle.example
MOODLE_API_TOKEN=<secret token>
MOODLE_ROLE_IDS=<verified JSON>
MOODLE_CATEGORY_ID=<verified category id>
MOODLE_LIVE_WRITES=false
```

Then sign in to the SIS Moodle administration workspace and use
**Test connection**.

Expected result:

- backend: live,
- Moodle site/version returned,
- detail states that live writes are disabled.

At this stage do **not** run provisioning, the delivery worker,
enrolment sync or group sync against the real site. Reconciliation may
be run for observation: while `MOODLE_LIVE_WRITES=false` it is
report-only and opens governed drift cases instead of queueing repair
events.

If only URL or token is configured, SIS reports configuration failure;
it does not quietly present the simulator as healthy.

## 10. Review mappings before writes

Before changing `MOODLE_LIVE_WRITES`:

1. verify course-shell naming and destination category,
2. verify every `MOODLE_ROLE_IDS` value,
3. verify student/staff Moodle `idnumber` values,
4. verify the custom service function list,
5. verify active SIS→Moodle mappings,
6. take/confirm a Moodle backup or use a disposable proving course.

## 11. Controlled write proving run

Only after the checks above, set:

```
MOODLE_LIVE_WRITES=true
```

Start with a disposable or dedicated proving course and a small set of
fictional/test identities.

Recommended proving order:

1. provision one shell,
2. enrol one test student,
3. add that student to one tutorial group,
4. assign one test staff role,
5. rerun the same events to confirm idempotency,
6. run reconciliation and confirm no drift,
7. test removal/suspension behavior.

A group-scoped Tutor quiz assignment is deliberately refused by the
live adapter for now. The supported Moodle enrolment web service assigns
roles at course scope; SIS will not silently broaden a tutorial-group
scope into course-wide quiz authority. Use a course-wide proving staff
assignment until an explicitly governed group-scope implementation is
added.

The adapter keeps provider HTTP calls outside Prisma interactive
transactions and sends permanent Moodle/configuration failures to
manual review rather than retrying them indefinitely.

## 12. MoodleCloud

MoodleCloud API/web-service availability depends on the plan and site
configuration. If the Web services controls are unavailable, keep the
SIS simulator enabled until you have a Moodle site that permits the
required External Service.

Use the full HTTPS site base URL, for example:

```
https://example.moodlecloud.com
```

Do not append `/webservice/rest/server.php`; SIS adds the REST endpoint.

## 13. Rotate and revoke

Treat the integration token as a service credential.

- revoke it immediately if exposed,
- rotate it after proving runs where appropriate,
- never paste it into tickets, source code, screenshots or chat,
- never share the Moodle Site Administrator password with the
  integration.

Changing/revoking the token does not require changing SIS student or
academic records.
