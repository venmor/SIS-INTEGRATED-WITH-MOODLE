# Cloud demonstration target gate — 2026-10-12

Scope and authority: [TASK-V2-CLOUD-DEMO-001](../task-packets/TASK-V2-CLOUD-DEMO-001.md), [ADR-005](../adr/ADR-005-explicit-cloud-demonstration-target.md). The owner authorized the selected generated-data cloud demonstration. Institutional activation, personal records and general production writes remain outside this change.

The shared pure target validator preserves local isolated database matching and adds a default-off cloud path requiring exact database host/name, PostgreSQL TLS, standard port and a separate cloud opt-in. Institution setup and timetable guards retain their independent feature switches. Preparation scripts require the same database gate; remote timetable preparation additionally pins an HTTPS API origin. Existing permissions, appointments, independent approval, immutable history, idempotency and credential preservation are unchanged.

Review identified that connection-string query options can override authority fields in database consumers. A new denial test first failed for `host=evil.db.example`. The helper now permits only `sslmode`, `channel_binding`, `connect_timeout` and `application_name` query options in cloud mode, preventing target overrides or conflicting TLS configuration. No provider-domain wildcard is accepted.

Verification performed against source in the review worktree:

- Nine source/seed/preparation tests passed, including the new override denial and preservation of existing actor credentials/appointments.
- Both API guard suites passed: 57 tests.
- Config no-emit typecheck, incremental config compile (without cleaning shared output), and API no-emit typecheck passed.
- `git diff --check` passed.

No cloud database write, seeding, Moodle provisioning, deployment or institutional acceptance was performed by this source-change verification. The release owner must separately record the tested deployment commit, exact configured target, backup/migration evidence and representative runtime checks. Never place database URLs or credentials in frontend public configuration, logs or this note.
