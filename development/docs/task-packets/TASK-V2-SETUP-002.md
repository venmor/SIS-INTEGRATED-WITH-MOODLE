# TASK-V2-SETUP-002 — Delivery and structure readiness inventory

- Release: v2.0 institution setup and timetabling. Lead Charles Hangoma; reviewer Chitindu Milimbo; human acceptance pending.
- Authority: approved Design Sections 1 and 4, Student Blueprint 2 Part 4 §3, existing TASK-V2-SETUP-001/TASK-V2-TIME-003, GAP-004, GAP-021 and GAP-V2-001. The System Administrator has operational inventory read access only, not business approval authority.
- Trigger: after the draft academic-delivery migration, `GET /institution-setup/readiness` still says the effective-dated organisation registry is not in place and cannot show course-delivery/venue readiness. That understates implemented storage while hiding the remaining source-to-registration and publication work.
- Outcome: the same global System Administrator, purpose-audited read returns counts of stable units, unit versions and relationships, plus draft course versions, delivery offerings, sections, buildings and venues. It also counts active course-only registration rows that still need explicit section reconciliation. A new delivery section names missing schedule, mapping and publication authority. Counts never imply approval; overall remains blocked.
- Exclusions: individual student or staff identities, policy values, draft edits, bulk migration, synthetic seed generation, venue booking, timetable publication, new roles or wider visibility.

## Acceptance

1. Counts are sampled from the server at request time; the organisation reason no longer incorrectly says no structural model exists. Missing records are distinguished from records present but unverified.
2. The new timetable section shows stable gap IDs and a concise next action. It does not expose roster rows, personal data or a create/approve/publish action.
3. Existing global-SYSADMIN allow and role/scope/revocation/expiry denies remain. Focused connected API and mobile browser tests pass on a synthetic database with the additive migration, alongside builds and source checks.
