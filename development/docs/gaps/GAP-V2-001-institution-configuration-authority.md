# GAP-V2-001 — Institutional setup and configuration authority

Status: Open — blocks privileged setup writes and publication
Raised: 2026-10-02

## Missing design authority

The v2.0 design requires an institution to configure its effective-dated organisational graph, academic calendars, catalogue, curricula, admissions cycles, workflows and terminology before dependent operations begin. Approved Section 1 defines the graph and domain ownership; Section 3 describes the setup outcome. The exact action and permission records do not yet identify the complete role/capability/scope/relationship tuple, permitted actions, approval route, separation of duties, step-up requirements or recovery contract for drafting, approving, publishing, superseding or rolling back this institution-level configuration.

The approved System Administrator role may deploy approved technical configuration but may not create or change academic/financial policy alone. Existing generic `ConfigurationItem` administration is not authority to manage institutional policy.

## Affected records and workflows

- V2-SETUP-001: institution onboarding and readiness workspace
- Organisational scope registry (GAP-004), grant approver authority (GAP-006), and all domains consuming institutional structure/configuration
- `REQ-NFR-009` (approved, versioned, effective-dated institutional variation) and `REQ-IAM-003`; action/permission matrix and admin setup UI
- Audit, immutable configuration versions, activation/supersession, validation preview, dependent-workflow readiness and recovery tests

## Safe interim behavior

Design and implement read-only discovery, validation, preview and readiness reporting as existing approved permissions allow. Do not expose or enable privileged writes/publish/rollback for institutional structure or policy until a human-approved authority/action contract and exact role/cross-blueprint evidence exist. Never treat demo seed values, UI visibility, or the generic technical configuration API as institutional approval.

## Decision required

The institution must approve who may propose and who may independently approve/publish each configuration family; appointment and scope; effective-date and emergency-change rules; required evidence and step-up; notification/review; supersession/rollback; and delegation boundaries. Record the decision in the controlling handbook or an approved decision record, then map it to explicit action IDs, permission tests and task packets.

## Owners and evidence

Proposed lead: Charles Hangoma. Proposed reviewer: Chitindu Milimbo. These are task assignments only, not approval or signoff. Revisit alongside GAP-004, GAP-006 and GAP-012. Source evidence: approved-design-evidence Sections 1, 2, 3, 10; System Administration and Identity Access Administration role blueprint 12 Part 1; requirements, action contracts, permission core/restricted records; security/recovery cross-blueprint.

The [decision proposal](../policies/INSTITUTION-CONFIGURATION-GOVERNANCE-PROPOSAL.md) lists the exact appointments, separation, scope and version controls to approve. The read-only [setup readiness report](../task-packets/TASK-V2-SETUP-001.md) exposes no configuration write authority and does not close this gap.
