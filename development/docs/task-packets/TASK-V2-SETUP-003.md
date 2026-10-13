# TASK-V2-SETUP-003 — Governed fictional structure and calendar

Lead Charles Hangoma; reviewer Chitindu Milimbo; human acceptance pending. Requirement basis: `REQ-NFR-009`, `REQ-IAM-003`, approved v2 `V2-SETUP-001`; user instruction of 2026-10-07. Application-local action names below are not invented handbook approval IDs.

| Layer | Contract |
|---|---|
| Policy | [DEMO-SETUP-2026.1](../policies/SYNTHETIC-UNIVERSITY-SETUP-POLICY.md), synthetic only |
| Owner | Institution/Organisation and Academic Policy/Calendar, coordinated within institution-setup; no generic ConfigurationItem writer |
| Role/scope | Active DOMAIN_ADMIN at SYSTEM:DEMO-UNIVERSITY; explicit propose/approve capabilities; independent person |
| Screen | `/admin/setup/university`, guided task and decision review |
| Actions | Save draft; Review version; Approve and activate |
| Commands | SaveDemoInstitutionSetup; ActivateDemoInstitutionSetup |
| State | Unsaved → immutable draft → independently activated; replacement creates another version |
| Storage | Versioned profile, append-only activation and source-linked unit/calendar projections |
| Event | DemoInstitutionSetupActivated, durable outbox; owning-domain reconciliation pending, no external delivery |
| Integration | None; cloud Moodle assessed separately at user's request |
| Audit | Active appointment, person/account, scope, reason, version/digest, base activation, approval meaning/authentication strength, request/correlation, outcome; no password |
| Recovery | Same-key receipt; 409 on changed payload/stale base; transaction rollback on failed projection; supersession only |
| UI | Concise fields, grouped structure/calendar/review, bounded lists, pending/empty/error/denied states, retained input, keyboard/mobile and reduced motion |
| Tests | Parser graph/date/type boundaries; connected API allow/deny/independence/retry/concurrency/immutability/legacy preservation; browser save/review/independent activation/mobile |

## Exact sources read

Approved evidence DS1, DS2, DS3 and DS4 completely; DS10 completely; Role Blueprint 12 Part 1 (`035`) completely; permission core/restricted (`006`, `007`), error/recovery (`008`), traceability (`001`), UI constitution and security/code-health Section19 (`001`, `004`) completely; supersession/readiness registers. Later synthetic decisions do not amend their original text. SETUP-001/002, TIME-003, configuration governance proposal and GAP-V2-001 provide existing boundaries.

## Exit

An operator edits the synthetic graph/calendar in the UI, saves a real immutable draft, and another person reviews and activates that exact version. API source projections and history demonstrate installed structure/calendar while showing pending owner handoffs. Production writes stay denied. No source registration, fee, result or curriculum is silently changed.

This closes the fictional structure/calendar increment, not the full institution-setup workstream, institutional authority gap or all v2 policies.
