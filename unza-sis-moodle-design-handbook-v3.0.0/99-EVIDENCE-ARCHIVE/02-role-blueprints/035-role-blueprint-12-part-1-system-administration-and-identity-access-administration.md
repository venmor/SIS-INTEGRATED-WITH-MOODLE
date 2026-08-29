<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 1d412ff3-1e92-523c-99d9-145a0049cec4; chronological message: 216. -->

# Role Blueprint 12, Part 1 — System Administration and Identity & Access Administration

This part specifies the day-to-day operational experience for the two roles that protect the platform itself:

- **System Administrator** — platform configuration, availability, releases, service health and operational recovery.
- **Identity & Access Administrator** — identities, role assignments, access reviews, authentication recovery and privileged-access control.

Neither role is a “superuser” who may browse or change any student record.

## 12.1 Separate roles, separate authority

| Role | Primary responsibility | May do | Must not do |
|---|---|---|---|
| System Administrator | Platform configuration, service health, release controls, operational incidents | Monitor services, manage approved configuration, execute recovery runbooks | Alter admissions, results, finance balances, quality findings or support notes |
| Identity & Access Administrator | Accounts, role/scope assignments, MFA, access reviews, privileged access | Create/recover accounts, grant approved roles, revoke access, review logs | Invent institutional authority or access restricted case content |
| Security Administrator, where configured | Security policy, threat response and sensitive audit review | Investigate security incidents, enforce technical controls | Approve academic/financial/business decisions |
| Moodle Administrator | Managed separately in Part 2 | Moodle configuration and governed SIS sync | Change official SIS results or academic registration |
| Integration-support Officer | Managed separately in Part 3 | Monitor/reconcile integrations | Directly edit source-domain records to “fix” an event |

Header examples:

> **System Operations workspace · Production environment**

> **Identity and Access workspace · Main Institution**

Every elevated session records an active role, scope, reason and expiry.

## 12.2 System Administrator home page

The System Administrator starts with operational health, not personal records.

Primary areas:

- Service health
- Failed jobs and event deliveries
- Scheduled maintenance
- Release/change queue
- Backup and recovery verification
- Capacity and performance
- Security and access alerts
- Integration status summary
- Incident work queue
- Operational runbooks

Example card:

> **Result-release notification delivery delayed**  
> Queue age: 18 minutes  
> Affected process: official result notification  
> Official results remain released; notification delivery is delayed.  
> `Open incident`

The System Administrator sees process references and counts. Identifiable student records are revealed only when necessary for incident resolution and purpose-logged.

## 12.3 System configuration model

Configuration is versioned and classified.

| Configuration class | Examples | Change control |
|---|---|---|
| Technical | Service endpoints, queue limits, monitoring thresholds | Approved operational change |
| Security | Session duration, MFA policy, encryption keys, password rules | Security approval and heightened audit |
| Institutional workflow | Role mappings, approval workflow references | Business owner plus change control |
| Academic/financial policy | Progression rules, fee policy, grading rules | Owned by authorized domain; System Administrator cannot alter alone |
| Integration | Moodle mapping, payment-provider credentials, regulator endpoint | Integration owner plus technical approval |
| User interface | Branding, content version, notification template | Configured content approval |

The System Administrator can deploy approved configuration. They cannot create or alter academic policy merely because they can reach the configuration screen.

## 12.4 Action OPS-CHG-01 — Apply an approved production change

### Entry point

> **Change queue → Approved changes → Open change**

The administrator sees:

- Change reference
- Requested configuration/version
- Business owner
- Risk classification
- Required approvals
- Planned maintenance window
- Rollback plan
- Test evidence
- Affected services and integrations
- Student/staff communication plan
- Implementation runbook

### Pre-flight checks

Before the action becomes available, the system verifies:

- Change is approved and unexpired
- Correct environment
- Required backups/checkpoints exist
- Required test evidence is attached
- No incompatible active release exists
- Maintenance window is open, where required
- Administrator has current production-change authority

### Execution interaction

Primary action:

> `Begin controlled deployment`

The page enters a progress state:

1. Create deployment/operation record.
2. Confirm backup or restore point.
3. Apply approved version.
4. Run automated health checks.
5. Run configured smoke tests.
6. Confirm service health.
7. Mark completed, rolled back or requires incident response.

The screen must never imply success before health checks pass.

### Rollback

If a required check fails:

> Change did not pass the required health check. The new version has not been confirmed as safe.  
> `Start rollback` · `Open incident`

Rollback uses the approved rollback plan. It does not delete audit history or silently restore unrelated records.

### Architecture

**Command:** `ExecuteApprovedOperationalChange`

**Events:**

- `OperationalChangeStarted`
- `OperationalChangeHealthCheckFailed`
- `OperationalChangeRolledBack`
- `OperationalChangeCompleted`

## 12.5 Action OPS-INC-02 — Triage and resolve an operational incident

### Incident creation

An incident may originate from:

- Monitoring threshold breach
- Failed scheduled job
- Integration delivery failure
- User-reported outage
- Security alert
- Failed release
- Data-reconciliation discrepancy
- Backup verification failure

The incident record includes:

- Incident reference
- Affected service/process
- Time detected
- Severity under configured operational policy
- Impact statement
- Assigned incident owner
- Current status
- Customer/student/staff communication status
- Timeline
- Linked changes, alerts and runbooks
- Recovery and reconciliation tasks

### Triage screen

The System Administrator sees:

> **Incident INC-2026-041 — Moodle enrolment sync delayed**  
> Started: 09:18  
> Impact: newly registered students may not yet see course access  
> Official registration remains valid in SIS  
> Current status: investigating  
> `Open runbook`

Available actions:

- Acknowledge and assign
- Start approved runbook
- Add impact update
- Escalate incident
- Place service in maintenance mode where permitted
- Trigger safe retry
- Mark technical recovery complete
- Create reconciliation task
- Request business-owner validation

The System Administrator cannot mark an incident fully resolved until technical recovery and required data reconciliation are complete.

### Student-facing communication

The system communicates in plain language:

> Course access is taking longer than usual after registration. Your official registration is still recorded. Please do not register again. We are restoring course access.

It avoids technical terms such as “message broker failure.”

## 12.6 Backup, recovery and reconciliation

The System Administrator manages backup operations but must prove recoverability.

The workspace shows:

- Latest successful backup
- Backup age
- Encryption status
- Restore-test date and outcome
- Recovery-point objective
- Recovery-time objective
- Failed backup alerts
- Legal-hold/archive considerations

A successful backup job is not enough. The system schedules and records controlled restore tests.

After recovery, the administrator must complete or assign reconciliation:

- Events created during outage
- Payment/provider callbacks
- Moodle enrolment/assessment synchronization
- Notification queues
- Report snapshot integrity
- User changes made during degraded service

No partial recovery may be labelled complete.

---

# Identity and Access Administration

## 12.7 Identity & Access Administrator home page

Primary areas:

- New/updated identity requests
- Role and scope assignments awaiting approval
- Acting/delegated appointments
- Expiring role assignments
- Access-review campaigns
- Account recovery and verification cases
- Privileged-access requests
- Suspended/locked accounts
- Authentication/MFA incidents
- Sensitive access alerts

Example:

> **Dean role expires in 7 days**  
> Dr. Banda · School of Engineering  
> Acting appointment ends: 2 September 2026  
> `Review assignment`

## 12.8 Person identity versus account versus role

The system stores three separate concepts:

| Record | Meaning |
|---|---|
| Person identity | The individual: verified name, institutional/person identifier and approved contact channels |
| User account | Login credential and authentication state |
| Role assignment | Authority, scope, effective period, capabilities and delegation limits |

Creating an account does not automatically create a staff, Dean, lecturer, finance or administrator experience.

A person with multiple roles receives one account and explicitly switches workspace.

## 12.9 Action IAM-ROL-01 — Grant or change a role assignment

### Entry point

> **Identity and access → Role assignments → Create assignment**

The administrator searches for the person using a permitted identifier. Search results are minimized to prevent broad browsing.

The assignment form requires:

- Person
- Role
- Organizational scope
- Effective start and end date
- Employment/appointment reference
- Authority source
- Approved capabilities
- Acting or permanent status
- Delegation limit
- Required approver
- Reason

Example:

> Role: School Dean  
> Scope: School of Engineering  
> Effective: 1 September 2026–31 August 2027  
> Appointment evidence: Senate/HR reference  
> Workspace: Dean  
> No authority to access counselling notes.

### Validation

The system checks:

- Active appointment/authority evidence
- Conflicting roles
- Scope validity
- Segregation-of-duties conflicts
- Required training/acknowledgement
- Existing active assignment
- Required approvals
- Effective-date overlap

It warns but does not automatically deny legitimate multi-role cases. A person can be Dean and Lecturer, but their contexts remain separate.

### Approval and activation

After required approval:

> `Activate role assignment`

The system creates the role assignment, notifies the person and adds it to access-review schedules.

**Command:** `GrantRoleAssignment`

**Events:**

- `RoleAssignmentRequested`
- `RoleAssignmentApproved`
- `RoleAssignmentActivated`
- `RoleAssignmentExpiryScheduled`

## 12.10 Action IAM-REC-02 — Recover account access

A student or staff member may begin from:

> **Sign in → Need help signing in?**

The flow supports approved recovery methods such as:

- Verified email
- Verified mobile number
- Identity proofing through approved institutional route
- Service-desk assisted recovery
- MFA recovery code
- In-person verification where configured

The system does not make a staff member answer security questions that rely on inaccessible personal memory as the only route.

### Recovery states

- Recovery requested
- Identity verification pending
- Additional proof required
- Recovery approved
- Reset link issued
- Account restored
- Recovery denied
- Security escalation required

The Identity Administrator sees only the information necessary to verify recovery. They do not access the person’s academic, finance or counselling records.

## 12.11 Privileged access and “break-glass” access

Emergency elevated access is rare and tightly controlled.

A user requesting break-glass access must provide:

- Urgent operational reason
- Requested scope
- Duration
- Incident reference
- Approving authority where required

The system grants the minimum access for the shortest configured period, displays a persistent elevated-access banner, and records every action.

> **Emergency access active — expires in 25 minutes**  
> Reason: incident INC-2026-041  
> All actions are subject to enhanced audit.

Break-glass access is never used to browse counselling notes, alter results, bypass finance controls or make ordinary work easier.

## 12.12 Access reviews and revocation

The system schedules reviews by role risk level.

Reviewers receive:

> **Quarterly access review**  
> 18 role assignments require confirmation.  
> `Start review`

For each assignment, the reviewer can:

- Confirm still required
- Reduce scope
- Change end date
- Reassign review
- Revoke access
- Request clarification

Revocation takes effect according to configured security policy. Expired acting appointments revoke automatically unless renewed through the same governed workflow.

When access changes while a user is composing an action:

> Your role assignment has changed. This action was not completed.

Draft data is protected from unauthorized reopening.

## 12.13 Identity, access and recovery errors

| Situation | Required behaviour |
|---|---|
| Duplicate person identity suspected | Create matching-review case; do not merge automatically |
| Staff member’s appointment evidence missing | Role remains pending; no privileged workspace appears |
| Account is locked after repeated failures | Show neutral recovery route; log security event |
| MFA device lost | Use configured recovery; do not disable MFA permanently without verification |
| Role expiry occurs during session | End elevated action capability; preserve safe draft |
| Administrator assigns conflicting roles | Require segregation-of-duties review |
| User tries inaccessible recovery method | Offer approved accessible alternative |
| Account recovery appears suspicious | Pause recovery and route security review |
| Role assignment is revoked in error | Use controlled reinstatement with reason and audit; do not edit old history |

## 12.14 Acceptance requirements

Part 1 is accepted only when:

- System Administration and Identity & Access Administration have separate permissions.
- Operational changes require approved change records, health checks and rollback capability.
- Incidents remain open until recovery and required reconciliation are complete.
- Restore testing proves backup usability.
- A person, account and role assignment are separate records.
- Role assignments are scoped, time-bound, approved and reviewed.
- Multi-role users explicitly switch workspace.
- Access recovery is secure and has accessible alternatives.
- Privileged emergency access is time-limited, minimal and enhanced-audited.
- No administrator has unrestricted authority to browse or alter business-domain records.

Please approve **Role Blueprint 12, Part 1**. Part 2 will specify the **Moodle Administrator**: real enrolment, course-shell, Tutorial Group, assessment and grade-integration operations, reconciliation and failure recovery.

---

## Following user responses before the next design record

### User message 0217

Yes we may proceed,this is important
