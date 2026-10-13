# Institutional configuration governance — decision proposal

**Status:** proposed for institutional decision; not adopted policy or an access grant. The read-only [setup readiness task](../task-packets/TASK-V2-SETUP-001.md) uses this proposal only to name missing controls. [GAP-V2-001](../gaps/GAP-V2-001-institution-configuration-authority.md) remains open.

## Proposed control model

Each configuration family has a named business owner, an independently appointed approver, a technical publisher where deployment is needed, and a records custodian. Those people must be appointed for a specific institutional scope and effective period; a job title or System Administrator account alone is insufficient. One person may hold multiple positions, but cannot approve or publish their own proposed change when that would collapse the required separation of duties.

| Configuration family | Proposed accountable owner | Independent approval route to confirm |
|---|---|---|
| Institution units, campuses, relationships and positions | Registrar / institutional governance office | The institution's approved structural authority, with affected unit owners consulted |
| Academic calendar and teaching periods | Academic Affairs / Registry | Academic calendar approval body and publication delegation |
| Programme, curriculum, assessment and progression rules | Academic Affairs with programme/school owner | Applicable school, committee and Senate route per regulation |
| Admissions cycle, forms, capacity and selection criteria | Admissions policy owner with academic unit | Delegated admissions authority and independent decision route |
| Charges, sponsorship, clearance and refund thresholds | Student Finance policy owner | Finance authority and independent financial control |
| Access, MFA, emergency access and security controls | Identity and Security owners | Approved security change authority |
| Moodle/payment/notification mappings and endpoints | Integration owner plus source-domain owner | Business owner approval and technical/security deployment control |
| Student-facing terminology and approved translations | Communications/content owner with domain owner | Academic/legal/privacy review for consequential wording |

This table is a recommended decision agenda, not an assumption that these specific bodies currently hold the authority. The institution must supply its current instruments of delegation and decide exact role/capability names, scope relationships, approval quorum, step-up method and exceptions for each family.

## Proposed version workflow

1. A scoped proposer creates a typed draft against the current effective version, with reason, source policy, owner, intended effective range and affected institution units/programmes/periods.
2. Validation checks supported field/rule operators, conflicting dates/relationships, dependent records, source citations and privacy classification. A preview shows affected workflows and records using synthetic or permissioned aggregate information.
3. An independent approver examines the exact digest, comparison, impact, test evidence and rollback or supersession plan. High-impact changes require a fresh, action-bound step-up proof.
4. A publisher with a separate active appointment schedules the approved immutable version. The system rechecks authority, approvals, effective dates, conflicts and source versions at execution time.
5. Activation records the old and new versions, decision reference, actor and outcome; dependent domains receive owned reconciliation tasks. Existing official decisions retain their historic rule/configuration version.
6. Correction or rollback creates a new linked version and impact review. It never deletes an effective version or silently rewrites student, finance or assessment history.

Emergency changes require an incident, limited scope and expiry, independent review as soon as possible, and a later reconciliation record. An emergency route cannot become a standing bypass. Missing source authority, expired appointment, unclear scope or failed step-up blocks activation.

## Decisions needed before configuration writes

- Name the actual institutional owner, approver, publisher and records custodian for each family; cite the governing instrument and scope of delegation.
- Define institution unit types and relationship semantics, including effective dating and reconciliation from existing school/department strings (GAP-004).
- Decide which approver may authorize a role or configuration change in a given scope (GAP-006) and the incompatible role/capability pairs plus exception review (GAP-012).
- Approve risk tiers, step-up proof, quorum, source documents, effective-date rules, emergency change, publication window, supersession and recovery requirements.
- Decide who may view business configuration drafts and impact previews. The current System Administrator page exposes only process counts and gap status.

Record the adopted answers as an approved, versioned policy and action/permission contracts before enabling draft, approval, publish or rollback commands. The generic technical `ConfigurationItem` endpoint does not implement this workflow.
