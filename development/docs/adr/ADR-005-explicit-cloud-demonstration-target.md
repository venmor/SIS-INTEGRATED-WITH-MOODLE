# ADR-005 — Explicitly pinned cloud demonstration target

Date: 2026-10-12. Status: owner-authorized demonstration scope; institutional/production approval is not implied. Lead Charles Hangoma; reviewer Chitindu Milimbo. Human acceptance pending.

The owner requested that Vercel expose the implemented demonstration workflows and existing generated participants. Previously institution setup, timetable drafts and preparation scripts accepted only loopback review/test databases. Enabling feature flags on Vercel therefore could not expose those workflows. Removing environment checks or accepting every database on a provider domain would broaden the boundary beyond this request.

Use a shared pure server-side target validator with two paths: preserve each caller's existing loopback isolated-database rule; or require explicit cloud-demonstration opt-in, exact selected database hostname/name and encrypted PostgreSQL connection. The optional pooled/direct hostname pair is individually pinned; no provider suffix wildcard is accepted. Remote preparation additionally requires an exact pinned HTTPS API origin without credentials, paths, queries or fragments. Feature-specific switches remain independently required.

## Server-only configuration

| Setting | Purpose |
| --- | --- |
| `DEMO_MODE=true` | Explicit demonstration environment |
| `SIS_ENABLE_CLOUD_DEMONSTRATION=true` | Separate cloud opt-in, default off |
| `SIS_DEMO_DATABASE_HOST` | Exact selected pooled or primary database hostname |
| `SIS_DEMO_DATABASE_DIRECT_HOST` | Optional exact selected direct hostname, not a wildcard |
| `SIS_DEMO_DATABASE_NAME` | Exact database name for this demonstration |
| `DATABASE_URL` | Private PostgreSQL URL matching a pinned host/name, port 5432/default and `sslmode=require` or `verify-full` |
| `SIS_DEMO_API_ORIGIN` | Exact HTTPS backend API origin for remote preparation; not the web frontend |
| `SIS_ENABLE_INSTITUTION_DEMO_SETUP=true` | Independent institution setup switch |
| `SIS_ENABLE_TIMETABLE_DEMO_DRAFTS=true` | Independent timetable drafting/publication demonstration switch |

These settings belong to the server deployment and private operator environment. Never use `NEXT_PUBLIC_` for database settings or expose `DATABASE_URL` to a browser. Pin values are configuration metadata, not authentication; database credentials stay secret. Do not log full URLs, credentials or descriptors. The web frontend requires its ordinary backend endpoint configuration, not database access.

The helper rejects malformed URLs, wrong schemes, missing pins, unpinned sibling/provider hosts, another database name, nonstandard cloud database ports, missing/duplicate/insecure TLS selectors and conflicting SSL options. Cloud URL query options are limited to `sslmode`, `channel_binding`, `connect_timeout` and `application_name`; connection-string query overrides such as `host`, `port` or `dbname` cannot redirect a pinned target. A cloud database cannot be paired with a loopback or arbitrary API. Missing cloud opt-in retains previous fail-closed behavior.

## Authorization and data preservation

This changes only the environment target gate. Existing active role/scope/capability checks, independent reviewer requirements, policy version checks, immutable publication/registration history, idempotency and conflict validation remain. Account preparation still verifies existing active actor identity, credential and appointment; it cannot overwrite credentials or silently elevate an existing user. No source rows or production records are migrated by the helper.

Only the explicitly selected generated-data demonstration database is authorized. Before activation the operator must preserve a backup, apply reviewed migrations, restore/copy generated data through the separately reviewed operation, verify the exact target and run allow/deny tests. Do not point these settings at an institution's production database. Human/institutional acceptance and the governed Moodle delivery foundations remain separate. Moodle live writes are not enabled by this opt-in.

## Verification

New source-level tests cover pooled/direct allow cases, absent opt-ins/pins, wrong host/database, missing/insecure/duplicate TLS, conflicting SSL options, scheme/port errors, preserved local behavior and exact remote HTTPS API restrictions. Existing preparation tests continue checking inactive/expired/shared actors and add refusal of an unpinned cloud target before account lookup. Institution and timetable API guard tests independently require their feature switch in cloud mode. Remote bootstrap tests require both a pinned database and HTTPS API origin. Deployment evidence must identify the tested commit and verified environment separately; passing these tests alone is not deployment completion.
