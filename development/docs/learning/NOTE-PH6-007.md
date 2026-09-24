# Learning Note — Live Moodle adapter path (Phase 6 follow-up)

- Date: 2026-09-24.
- Branch: `demo-v2-readiness`.
- Scope: INT-MDL-001 adapter path plus live proving hardening.

## What exists now

The integration has a real/live adapter path alongside the deterministic
`MOODLE-SIM-v1` backend.

`MoodleAdapter` is the common boundary for shell provisioning,
student enrolment/removal, staff roles, tutorial groups, actual-state
reads and connection validation. `LiveMoodleAdapter` implements the
Moodle External Services REST path; `SimulatorAdapter` keeps demo and
CI behavior deterministic.

Live mode is selected only when both `MOODLE_API_URL` and
`MOODLE_API_TOKEN` are present. Supplying just one is a configuration
error rather than a silent simulator fallback.

## Safety decisions

- Live mode starts read-only. `MOODLE_LIVE_WRITES=true` is a separate,
  explicit operator action after connection/mapping review.
- The automatic worker does not consume queued work while live writes
  are disabled.
- Provider HTTP calls execute outside Prisma interactive transactions.
  Short transactions claim and finalize each delivery.
- Stale `DELIVERING` claims have a 60-second recovery lease.
- Permanent Moodle/configuration failures go to manual review; transient
  connection/server failures retain retry behavior.
- Moodle REST parameters are form encoded using Moodle bracket notation.
- The token is sent in the POST form body, not in the request URL, to
  reduce exposure through proxy/APM URL logging.
- Course lookup requires an exact requested shortname; it never selects
  the first row of an unfiltered response.
- Course category is explicit through `MOODLE_CATEGORY_ID`.
- Role IDs come from the target Moodle instance through
  `MOODLE_ROLE_IDS`; missing labels are refused.
- Student identity is SIS `studentNumber` ↔ Moodle `idnumber`.
- Staff identity is SIS username ↔ Moodle `staff-<username>` idnumber.
- Tutorial groups are created with the governed SIS tutorial-group name,
  not an internal SIS row UUID.
- Group reconciliation uses `core_group_get_group_members` and maps
  Moodle user IDs back to idnumbers.
- Student and staff role writes are role-aware so retries/reconciliation
  converge rather than accepting any existing enrolment.
- Group membership writes are idempotent.

## First live proving sequence

Keep:

```
MOODLE_LIVE_WRITES=false
```

while configuring and using **Test connection**.

Only after URL/token, service functions, role IDs, category, identity
keys and mappings are reviewed should a controlled proving environment
set `MOODLE_LIVE_WRITES=true`.

Use a disposable/proving course and test identities before real student
or staff data. The detailed checklist is in
`docs/operations/MOODLE-LIVE-SETUP.md`.

## Verification status

Regression contracts now cover the live REST encoding, exact course
matching, partial configuration, read-only gate, role/group
idempotency, reconciliation keys, transaction boundary and stale claim
recovery.

The latest connector-authored branch head does **not** yet have a fresh
GitHub Actions run. Vercel checks are currently blocked by the account
build-rate limit. Therefore the current hardening must not be described
as fully green until a fresh unit/API/e2e/build runner completes.

## Lessons from the live proving work

- Never assume Moodle's by-field response can be consumed as
  `courses[0]`; validate the requested identifier exactly.
- Treat an integration token as infrastructure-sensitive even when the
  application itself does not log it.
- A live connection and permission to perform live writes are separate
  operational states.
- Reconciliation identities must use the same canonical key space on
  both expected and actual sides.
- Remote network calls do not belong inside database interactive
  transactions.
