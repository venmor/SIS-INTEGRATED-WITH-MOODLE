# Moodle live-connection setup (from Moodle itself)

Goal: produce the three values the SIS live adapter needs —
`MOODLE_API_URL`, `MOODLE_API_TOKEN`, `MOODLE_ROLE_IDS` — from any
Moodle 4.x+ site where you hold Site Administrator rights. Nothing is
invented on the SIS side: the token below is issued by Moodle, and the
Test connection button verifies it before any enrolment flows.

## 1. Enable web services (one-time, admin)

1. Site administration → Advanced features → check **Enable web
   services** → Save.
2. Site administration → Server → Web services → Manage protocols →
   enable **REST protocol** (eye icon open).
3. Site administration → Server → Web services → External services →
   confirm **Moodle mobile web service** is enabled (it ships the
   core functions; or create a custom service in step 3).

## 2. Create the dedicated service user (never a human admin)

1. Users → Accounts → Add a new user, e.g. `sis-integration`
   (firstname `SIS`, lastname `Integration`, a working email you
   control; auth method Manual).
2. Do NOT make it a site admin. Permissions come from a role below.

## 3. Create the service role with exactly these capabilities

1. Users → Permissions → Define roles → Add a new role, e.g.
   `SIS integration`, context **System**, no archetype.
2. Allow ONLY:
   - `moodle/course:create`, `moodle/course:view`
   - `moodle/user:view`
   - `moodle/role:assign`
   - `enrol/manual:manage` (covers enrol + unenrol users)
   - `moodle/group:manage`
   - `webservice/rest:use`
3. Assign the role to `sis-integration` at System context (Users →
   Permissions → Assign system roles).

## 4. Authorize the web-service functions (custom-service path)

If you use the built-in mobile service, skip to step 5. For a
least-privilege custom service:

1. Server → Web services → External services → Add custom service,
   e.g. `SIS enrolment sync`, enable it, authorised users only.
2. Add functions (Functions tab → Add):
   - `core_webservice_get_site_info`
   - `core_course_get_courses_by_field`, `core_course_create_courses`
   - `core_user_get_users`
   - `core_enrol_get_enrolled_users`
   - `enrol_manual_enrol_users`, `enrol_manual_unenrol_users`
   - `core_group_get_course_groups`, `core_group_create_groups`,
     `core_group_add_group_members`, `core_group_delete_group_members`
3. Authorised users tab → add `sis-integration`.

## 5. Mint the token and read the role IDs

1. Server → Web services → Manage tokens → Add: user
   `sis-integration`, service from step 3/4 → Save. Copy the token
   once — Moodle never shows it again.
2. Role IDs: Users → Permissions → Define roles → click each needed
   role (Teacher, Non-editing teacher, Tutor/Student); the numeric
   `roleid=` in the page URL is the value for `MOODLE_ROLE_IDS`,
   e.g. `{"Teacher":3,"Non-editing Teacher":5,"Tutor":9}`.

## 6. Student identity (required for matching)

The adapter matches SIS `studentNumber` ↔ Moodle user **ID number**
(`idnumber`), staff `username` ↔ `staff-<username>`. Bulk-load via
Users → Accounts → Upload users (map `idnumber`), or confirm your
SSO/LDAP already writes idnumber. Names and emails are never used
as keys.

## 7. Wire the SIS side and prove it

1. Set `MOODLE_API_URL=https://your-moodle` (no trailing path),
   `MOODLE_API_TOKEN=<token>`, `MOODLE_ROLE_IDS=<json>`.
2. Sign in as the Moodle administrator → Moodle mappings → **Test
   connection**: expect `Live … Connected to <sitename>` with the
   site version.
3. The adapter refuses unknown role shortnames and surfaces Moodle
   `errorcode`s as permanent failures — fix mapping/role config,
   never retry blindly.

## 8. Rotate and revoke

Tokens belong to the service user, not a person. On staff changes,
revoke at Manage tokens and mint a fresh one; old tokens stop working
immediately. Never paste the token into tickets, logs, or chat.
