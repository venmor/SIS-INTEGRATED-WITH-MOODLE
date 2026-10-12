# TASK-V2-CLOUD-DEMO-001 — Preserve environment isolation while enabling the selected cloud demonstration

Release: v2 demonstration deployment. Date: 2026-10-12. Lead Charles Hangoma; reviewer Chitindu Milimbo. Human acceptance pending.

Authority: the owner's current request explicitly authorizes deploying implemented workflows with existing generated participants/data to Vercel. It does not authorize real institutional records, paid infrastructure, broad production bypass or unrestricted Moodle mutations. [ADR-005](../adr/ADR-005-explicit-cloud-demonstration-target.md) records the bounded decision. Existing institution-setup, timetable, security/privacy, official-record and exact approved evidence requirements continue unchanged.

Scope: new pure shared target helper; existing institution/timetable environment gate callsites; generated setup-actor preparation and timetable sample target validation; source/API allow-deny tests; server-only configuration documentation. Root owns backup/migrations/data restore and actual cloud verification. Release owner owns Git/CI/Vercel integration. No shared database resets or deployment secrets are introduced by these source changes.

Expected behavior: existing isolated local workflows continue. Cloud workflows require explicit DEMO_MODE and separate cloud opt-in, exact database host/name pins, PostgreSQL TLS/default5432, unchanged feature flags and unchanged server authorization. Remote bootstrap additionally requires exact pinned HTTPS API origin. Unknown targets fail before data access. Preserve every existing user credential/role mismatch stop, publication lineage and immutable result/registration history. Do not alter legacy records to make a demonstration succeed.

Acceptance evidence: meaningful allow/deny source tests; existing and new API guard tests; existing preparation preservation tests; configuration/API typecheck; exact deployment environment/commit evidence and representative workflow checks by root. Source success is not human signoff or full governed Moodle connectivity.
