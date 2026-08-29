<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 86a0db45-b521-50cd-94ac-8abb7030d44a; chronological message: 210. -->

# Role Blueprint 11, Part 4 — Executive Leadership: institutional decisions, interventions, risk and accountable follow-through

Executive Leadership is not a larger dashboard. It is a controlled workspace for an authorized Vice-Chancellor, Deputy Vice-Chancellor, Registrar, Chief Financial Officer, Senate/committee chair, or equivalent role to make institutional decisions from governed evidence.

The active title, authority and scope are configured by institution.

> **Executive Leadership workspace · Institution-wide · 2026 Strategic Cycle**

## 11.58 Leadership home page

The home page is ordered by decisions and obligations, not charts.

### A. Decisions requiring my authority

Example:

> **Approve revised institutional intervention**  
> Issue: First-year continuation decline  
> Sponsor: Deputy Vice-Chancellor Academic  
> Required decision: approve resources and revised milestones  
> Due: 12 September 2026  
> `Review decision package`

The leader sees:

- Decision requested
- Authority basis
- Responsible sponsor and operational owner
- Deadline
- Evidence summary
- Risks of delay
- Available actions

### B. Institutional obligations at risk

Examples:

- Accreditation condition due
- Regulatory return awaiting sign-off
- Material quality finding overdue
- Result-release governance exception
- Strategic-plan milestone missed
- Critical data-quality limitation affecting a reported metric

This does not expose all operational work; it surfaces only issues configured for leadership attention.

### C. Institutional health

The leader sees certified, aggregate indicators such as:

- Admission demand and conversion
- Registration completion
- Progression and completion
- Graduate outcomes
- Programme-review status
- Assessment and result-release reliability
- Financial sustainability measures
- Staff and teaching-capacity measures
- Student-support service capacity
- Data-quality and system-health measures

Each indicator includes definition, data date, source, limitation, owner and certified-report link.

### D. My active interventions

> **Assessment reliability improvement**  
> Status: 3 of 5 milestones complete  
> Next decision: approve examination-system rollout  
> Evidence due: 20 September  
> `Open intervention`

### E. Decision calendar

- Senate or equivalent meetings
- Council/board meetings
- Accreditation meetings
- Regulatory deadlines
- Strategic-review sessions
- Delegated-decision deadlines

## 11.59 Leadership information boundaries

Leadership sees aggregate information by default.

| Matter | Default leadership view | Individual detail allowed only when |
|---|---|---|
| Student progression | Programme/cohort patterns | Formal escalation, defined academic purpose and authorized scope |
| Counselling | Service capacity and waiting-time aggregate | Never routine access to counselling notes |
| Welfare | Demand and service-performance aggregate | Formal operational escalation with minimum information |
| Finance | Collection/clearance aggregate | Authorized institutional finance decision |
| Discipline | Case-volume/trend aggregate | Formal decision role under disciplinary policy |
| Staff performance | Approved aggregate/quality-process measures | Authorized HR process, outside this project’s ordinary leadership view |
| Quality findings | Full finding/action evidence in assigned authority scope | Leader is assigned sponsor/closure/decision authority |

A leader may not drill from “14 students awaiting academic follow-up” into names unless the configured policy and current decision require it.

---

# Action EXE-DEC-01 — Review and record an institutional decision

## 11.60 Entry point

The leader starts from:

> **Decisions requiring my authority → Review decision package**

The system builds the package from versioned, governed records. A leader does not assemble evidence manually from emails.

## 11.61 Decision package screen

The page is divided into six sections.

### A. Decision required

At the top:

> **Decision required:** Approve institutional intervention for first-year continuation  
> **Authority:** Deputy Vice-Chancellor Academic, delegated under Academic Strategy Rule 2026-v1  
> **Decision deadline:** 12 September 2026

### B. Recommendation

- Decision sponsor
- Requested action
- Recommended option
- Why action is needed
- Cost/resource implication
- Effect of approving, returning or declining
- Dependencies

### C. Evidence

- Certified indicators
- Quality-review findings
- Relevant committee recommendations
- Risk assessment
- Previous decisions
- Data-quality limitations
- Attached approved evidence

A leader sees a concise summary first, then can open source evidence. Each item states source, date, definition and status.

### D. Options and consequences

Configured options may include:

- Approve
- Approve with conditions
- Return for clarification
- Refer to another authority
- Decline with reason
- Defer with review date
- Delegate permitted review

The system shows the outcome of each action before confirmation.

### E. Governance checks

- Authority currently active
- Required prior recommendations present
- Conflict-of-interest declaration
- Required consultation completed
- Budget authority, if relevant
- Related legal/regulatory constraint
- Required signatories

### F. Decision history

- Who requested decision
- Previous decision versions
- Revisions
- Delegations
- Meeting references
- Outstanding actions

## 11.62 Decision action and confirmation

The leader selects an option, enters rationale and reviews the decision summary.

For `Approve with conditions`:

- Conditions
- Responsible owner
- Completion deadline
- Verification evidence
- Follow-up authority
- Notification recipients

Confirmation:

> You are approving this intervention subject to two conditions. This will create accountable actions and notify the assigned owners. It will not change student records, academic results or quality findings directly.

The decision button is disabled while submission is processing, preventing duplicate approvals.

## 11.63 Architecture behaviour

**Command:** `RecordInstitutionalDecision`

**Preconditions:**

- Active leadership role has current authority.
- Decision package is still current and has not changed since review.
- Conflict declaration is complete.
- Required prior approvals/recommendations exist.
- Decision is within the active delegation limit.

**Transaction:**

1. Revalidate package snapshot and authority.
2. Record immutable decision version and rationale.
3. Create actions, conditions and deadlines.
4. Update related intervention/risk/finding state where applicable.
5. Write audit record.
6. Publish governed events.

**Events:**

- `InstitutionalDecisionRecorded`
- `InstitutionalDecisionConditionCreated`
- `InstitutionalActionAssigned`
- `InstitutionalDecisionReturnedForClarification`

## 11.64 Error and recovery

| Situation | Required response |
|---|---|
| Authority expired | “Your authority for this decision is no longer active. No decision was recorded.” |
| Package changed while open | Show changes; require the leader to review the latest version |
| Conflict declared | Block decision; provide delegation/reassignment route |
| Required recommendation missing | Explain missing requirement and return package |
| Connection drops after action | Check idempotency reference; do not ask leader to vote/approve again blindly |
| Decision deadline missed | Preserve package; show late status and configured escalation route |

---

# Action EXE-INT-02 — Create and govern an institutional intervention

## 11.65 User goal

A leader identifies a material institutional issue and needs to convert it into accountable, measurable action—not a vague instruction such as “improve student success.”

## 11.66 Entry points

- A certified indicator: `Create intervention`
- A quality finding: `Create institutional intervention`
- A risk register item
- A committee decision
- A strategic-plan review
- A regulatory condition

The system preserves the source trigger but does not assume the trigger itself determines the solution.

## 11.67 Intervention creation screen

### Step 1 — Define the issue

- Plain-language issue statement
- Source evidence
- Scope
- Affected population/process
- Known limitations
- Urgency
- Strategic objective linked
- Required decision route

Example:

> Issue: Continuation among first-year engineering students declined from 78% to 65% across two cohorts.  
> Evidence: Certified metric RET-2.1; data limitation: 3% outcome pending verification.

### Step 2 — Define intended outcome

The leader specifies:

- Target outcome
- Baseline
- Target measure and metric definition
- Target date
- Expected beneficiaries
- Risks/harms to avoid
- Equity or subgroup review requirement
- Success evidence

A target must not overwrite the observed metric.

### Step 3 — Choose intervention model

The intervention can include:

- Academic-support expansion
- Curriculum review
- Assessment process improvement
- Advising-capacity change
- Financial-support coordination
- Staff development
- Information-system correction
- Policy review
- Resource allocation
- Other approved institutional action

Each type is a configured reusable template with required fields—not hard-coded logic.

### Step 4 — Assign accountability

- Executive sponsor
- Operational owner
- Participating offices
- Quality verifier
- Finance/budget owner, where required
- Risk owner
- Decision authority
- Review meeting

No intervention activates without a named accountable operational owner.

### Step 5 — Plan milestones

For every milestone:

- Description
- Owner
- Due date
- Dependency
- Evidence of completion
- Risk if late
- Escalation route
- Student/staff communication requirement

### Step 6 — Review and activate

The leader sees impact, resources, dependencies, measures and ownership before selecting:

> `Approve and activate intervention`

## 11.68 Intervention workspace

Once active, the page shows:

- Purpose and strategic objective
- Evidence baseline
- Current metric outcome
- Target—clearly labelled as a target
- Milestone timeline
- Owners and dependencies
- Budget/approval status where appropriate
- Risks and issues
- Quality findings linked
- Communication actions
- Latest review decision
- Next executive review date

A target and observed outcome are visually distinct:

> **Observed continuation:** 65%  
> **Approved target:** 75% by 2027  
> **Current measurement period:** 2026

## 11.69 Intervention updates and leadership review

The operational owner can submit a progress update:

- Milestone state
- Evidence
- Delay/recovery plan
- New risk
- Requested executive decision
- Metric observation

The leader does not merely see a completion percentage. They see:

> Milestone overdue: adviser-capacity allocation  
> Impact: support rollout delayed by two weeks  
> Proposed recovery: appoint temporary advisers by 10 September  
> Decision required: approve temporary allocation

The leader can approve a recovery plan, request more evidence, reassign permitted ownership, alter a target through governance, or close/continue intervention based on verified evidence.

They cannot manually set the actual metric to “improved.”

---

# Action EXE-RSK-03 — Manage institutional risk and escalation

## 11.70 Risk record

An institutional risk may be linked to a quality finding, regulatory obligation, system incident, finance issue or strategic intervention.

A risk record contains:

- Risk statement
- Cause and consequence
- Scope
- Likelihood and impact under configured scale
- Existing controls
- Control owner
- Mitigation actions
- Contingency plan
- Review date
- Escalation threshold
- Risk acceptance authority
- Linked evidence

Risk scoring is configurable. A high score prompts attention; it does not automatically make a policy decision.

## 11.71 Leadership risk screen

A leader sees:

> **Risk: result-release delay may affect graduation cycle**  
> Current level: high under Risk Framework 2026-v1  
> Existing control: examinations validation and board schedule  
> Mitigation: additional moderation capacity  
> Owner: Registrar  
> Next review: 4 September  
> `Review risk`

Available actions:

- Accept risk within authority
- Require mitigation
- Escalate
- Request independent assurance
- Return for clarification
- Close only after control verification

The leader cannot close a risk because a deadline passed or because a chart changed colour.

---

# Action EXE-DEL-04 — Delegate an authorized decision or task

## 11.72 Delegation experience

A leader selects:

> `Delegate`

The delegation form requires:

- Delegate
- Specific decision/task
- Scope
- Start and expiry date
- Monetary/authority limit, where relevant
- Whether sub-delegation is allowed
- Required reporting-back date
- Conflict check
- Reason and authority basis

The interface states:

> Delegating review does not transfer accountability for this institutional decision unless policy explicitly provides otherwise.

The delegate sees a separate assigned decision/task; they do not inherit the leader’s entire workspace.

Delegation expires automatically. A decision made after expiry is blocked.

---

## 11.73 Executive notifications

Leadership receives only actionable notices:

| Event | Notification |
|---|---|
| Decision package ready | “A decision requiring your authority is ready for review.” |
| Intervention milestone overdue | “An active intervention requires executive attention.” |
| Material risk escalated | “A risk has reached the configured executive threshold.” |
| Regulatory deadline near | “Regulatory submission approval is due in 3 days.” |
| Quality finding ready for closure | “A quality decision package is ready for your authority.” |

Sensitive content stays inside the authenticated workspace. SMS/email contains neutral wording and a secure link.

## 11.74 Architecture, commands and events

### Entities

- `InstitutionalDecisionPackage`
- `InstitutionalDecision`
- `StrategicObjective`
- `InstitutionalIntervention`
- `InterventionMilestone`
- `InstitutionalRisk`
- `RiskControl`
- `Delegation`
- `ExecutiveReviewMeeting`

### Commands

| Command | Authorized actor |
|---|---|
| `RecordInstitutionalDecision` | Active authorized leader |
| `CreateInstitutionalIntervention` | Active authorized leader |
| `ActivateInstitutionalIntervention` | Configured authority |
| `SubmitInterventionProgressUpdate` | Assigned operational owner |
| `RecordExecutiveInterventionReview` | Authorized leader |
| `CreateInstitutionalRisk` | Authorized owner |
| `RecordRiskTreatmentDecision` | Authorized leader |
| `DelegateInstitutionalAuthority` | Authorized leader |

### Events

- `InstitutionalDecisionRecorded`
- `InstitutionalInterventionActivated`
- `InterventionMilestoneOverdue`
- `ExecutiveInterventionReviewCompleted`
- `InstitutionalRiskEscalated`
- `RiskTreatmentDecisionRecorded`
- `InstitutionalAuthorityDelegated`
- `DelegatedAuthorityExpired`

## 11.75 Accessibility and information safeguards

- Every decision, intervention and risk action is fully keyboard operable.
- Statuses use plain-language text and do not rely on colour.
- Evidence summaries have accessible source links and alternatives for charts/tables.
- Mobile views retain decision evidence, options and confirmation—not only a simplified “Approve” button.
- Long decision packages save reading position and support low-bandwidth document loading.
- AI-generated summaries are labelled, source-linked and never presented as the official decision record.
- Individual student/support data is suppressed unless necessary, authorized and purpose-logged.

## 11.76 Part 4 acceptance requirements

Part 4 is accepted only when:

- Leaders begin with decisions, obligations, interventions and risks—not decorative dashboards.
- Every leadership decision has an authority basis, evidence package, options, rationale and audit trail.
- A decision package cannot be approved after a material source change without re-review.
- Institutional interventions define baseline, target, owner, milestones, evidence and review cycle.
- Observed values and targets remain visibly separate.
- Leaders cannot alter source metrics, student records or quality findings to improve reporting.
- Risk acceptance, mitigation and closure follow configured authority.
- Delegation is scoped, time-bound and does not silently transfer unlimited powers.
- Leadership defaults to aggregate, privacy-preserving information.
- AI assists evidence interpretation only; human authorities make and record institutional decisions.

Please approve **Role Blueprint 11, Part 4**. Part 5 will complete this blueprint with the dedicated **Auditor and Regulatory Reporting User** experiences: audit planning, control testing, evidence access, audit findings, submission verification, corrections and post-submission reconciliation.

---

## Following user responses before the next design record

### User message 0211

Yes we may proceed
