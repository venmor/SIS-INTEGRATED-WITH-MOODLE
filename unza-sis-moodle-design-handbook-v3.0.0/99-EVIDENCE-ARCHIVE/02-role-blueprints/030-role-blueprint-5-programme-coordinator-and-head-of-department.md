<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: b1578257-cbd5-58fd-be01-bf49d118fee3; chronological message: 201. -->

# Role Blueprint 5 — Programme Coordinator and Head of Department  
## Part 3: Programme quality actions, staff handover, departmental approvals, governed reporting, audit and historical programme records

This part completes the Programme Coordinator and Head of Department blueprint.

It focuses on improving programme delivery and meeting governance requirements without allowing dashboards, exports or AI summaries to replace human academic judgment.

The core rule is:

> Coordinators and Heads of Department use evidence to assign, monitor and escalate academic work. They do not alter official statistics, close a quality finding without authority, or make high-impact student decisions from a dashboard alone.

---

## 1. Programme quality actions

### 1.1 What creates a quality action

A quality action may begin from:

- Missing assessment plan or moderation
- Repeated result-submission delay
- Course without required tutor/TG coverage
- High course withdrawal or failure pattern requiring review
- Moodle/SIS integration problem affecting learning delivery
- Programme-review deadline
- External reviewer or accreditation recommendation
- Student feedback theme after approved anonymisation
- Repeated prerequisite or capacity bottleneck
- Academic-board action
- Department/School improvement initiative

A quality action is not automatically a finding of staff misconduct or programme failure.

### 1.2 Quality-action page

The coordinator/HoD selects:

> `Create programme quality action`

The form requires:

- Title
- Source/evidence
- Programme/department scope
- Academic period
- Why action is needed
- Responsible owner
- Due date
- Intended result
- Required authority
- Student/staff impact
- Related policy/accreditation requirement
- Supporting documents

Example:

> **Action: Provide tutor for CSC 4792, TG 4**  
> Evidence: 31 registered students lack assigned TG tutor.  
> Owner: Programme Coordinator  
> Due: 18 January 2027  
> Intended result: TG 4 has approved tutor and synchronized Moodle group.

### 1.3 Action statuses

| Status | Meaning |
|---|---|
| Draft | Not yet assigned |
| Open | Action assigned and active |
| Awaiting information | Owner needs evidence/clarification |
| In progress | Work is underway |
| Awaiting approval | Completed work requires authorized review |
| Completed | Required work verified complete |
| Closed by authority | Authorized quality closure recorded |
| Overdue | Due date passed |
| Cancelled | No longer applicable; reason recorded |

The system does not allow an ordinary coordinator to mark a regulatory/quality finding “closed” without the configured authority.

---

## 2. Departmental approvals

### 2.1 Approval inbox

The HoD sees:

> Decisions requiring my approval

Examples:

- Course-offering change
- Tutor/lecturer assignment
- Temporary acting/cover assignment
- TG capacity/structure change
- Academic-exception case
- Curriculum/rule-change proposal
- Programme quality action requiring department approval
- Late result-submission exception
- Staff handover/reassignment
- Programme report sign-off

Each decision card includes:

- What is being approved
- Programme/course/student impact
- Relevant policy/version
- Requester
- Required decision by date
- Supporting evidence
- Available actions

### 2.2 Decision screen

The HoD sees:

- Request summary
- Evidence/documents
- Affected users/count
- Prior decisions/history
- Policy and approval authority
- Risks/impact
- Student/staff communication requirement
- `Approve`
- `Approve with conditions`
- `Return for clarification`
- `Decline`
- `Refer to higher authority`

A HoD must not edit the requester’s original evidence or recommendation. Their decision is a separate, auditable record.

### 2.3 Approval with conditions

Example:

> **Tutor assignment approved with conditions**  
> Assignment may begin after Moodle role synchronization completes.  
> Expiry: 30 June 2027.  
> Quiz-creation permission: Not granted.

The resulting entitlement is exactly scoped to the decision. It does not grant additional unrelated authority.

---

## 3. Staff handover and operational continuity

### 3.1 Coordinator or HoD changes

A handover is required when:

- Programme Coordinator term ends
- HoD role changes
- Staff leave/are absent
- Acting coordinator/HoD is appointed
- Programme responsibility is reassigned
- Department is restructured

The system must not rely on informal email handover or continued access to a former staff member’s account.

### 3.2 Handover workspace

The outgoing role holder sees:

> `Prepare programme handover`

The workspace lists:

- Current course-offering readiness
- Staffing/TG gaps
- Adviser-allocation gaps
- Open academic-exception cases
- Pending approvals
- Results/assessment deadlines
- Moodle/timetable integration issues
- Active quality actions
- Programme calendar milestones
- Reports awaiting sign-off

For each item, the outgoing staff member records:

- Current state
- Next action
- Owner
- Due date
- Necessary context
- Supporting document/reference
- Incoming role/person

### 3.3 Incoming staff member

The incoming coordinator/HoD sees:

> **Handover received**  
> 14 active operational items require review.  
> `Review handover`

They receive only the information necessary to continue authorized work. They do not automatically receive private counselling, disciplinary, staff-performance or unrelated student records.

### 3.4 Effective date and access

At the configured handover date:

- Incoming role permissions activate.
- Outgoing active permissions expire or move to read-only historical access.
- Open items transfer to new owner.
- Student-facing communication is sent only where a change affects students.
- Moodle/course/staff authority updates follow controlled assignments.
- Audit events record transfer outcome.

---

## 4. Governed programme reporting

### 4.1 Report catalogue

The coordinator/HoD can access only approved reports for their scope, such as:

- Registration completion
- Course capacity/TG coverage
- Teaching assignment status
- Assessment-plan readiness
- Result-submission status
- Progression/repeat patterns
- Supplementary-exam demand
- Adviser allocation/workload summary
- Moodle synchronization health
- Programme completion/graduation readiness
- Quality-action progress

Each report displays:

- Metric definition
- Source systems
- Data period
- Filters
- Last refresh time
- Data-quality limitation
- Classification
- Certified/report version
- Export permission/status

### 4.2 Drill-down

The default view is aggregate. Individual student details appear only when:

- The coordinator/HoD has a direct operational responsibility
- A specific decision/work item requires it
- The report’s permission rule permits it
- The user records a purpose where required

The system does not provide unrestricted “download all students” access.

### 4.3 Exports

Where an export is permitted, the user chooses:

- Report
- Purpose
- Filters
- Destination/use
- Requested period
- Classification acknowledgement

The export record includes:

- Requester
- Report/metric version
- Filters
- Row count
- Classification
- Authoriser where required
- Download time
- Expiry
- File checksum

Downloaded spreadsheets are labelled as extracts and cannot be uploaded as official corrections.

---

## 5. AI-assisted programme insights

AI may assist coordinators/HoDs only within the approved responsible-AI controls from Section 11.

Permitted examples:

- Summarise anonymised student-feedback themes
- Identify missing evidence for a programme-quality action
- Highlight unusual data-quality patterns
- Draft a plain-language explanation of an approved metric
- Suggest questions for a programme-review meeting

Every AI output must show:

- Source data/report
- Period
- Known limitations
- Human reviewer
- Whether the result is an observation or prediction

AI may not:

- Approve/reject a programme
- Close a quality action
- Rank lecturers solely from student feedback
- Remove a student from a programme
- Determine staff discipline
- Present a forecast as an observed fact
- Change official data or statistics

---

## 6. Historical programme records

### 6.1 Historical programme view

Past programme records are available in a read-only workspace:

> BSc Computer Science · January 2026 · Historical record

It may include:

- Curriculum/rule version
- Course offerings
- Teaching/TG assignments
- Approved assessment plans
- Result-release status
- Progression summary
- Quality actions
- Approved reports
- Calendar events
- Handover records
- Audit history

The page clearly states:

> Historical record — changes are not permitted.

### 6.2 Correcting historical configuration

If an error is discovered in historical configuration or report data, staff cannot edit it directly.

They select:

> `Request historical record correction`

The request records:

- Item believed incorrect
- Current value/version
- Proposed correction
- Evidence
- Impact on past/current students
- Required authority
- Need for amended report/result communication

The system preserves the original historical version and records any authorized amendment.

---

## 7. Operational escalation

### 7.1 Escalation triggers

An issue escalates when:

- Staffing gap reaches configured deadline
- Assessment plan is missing near publication date
- Result submission/moderation is overdue
- Moodle/SIS integration failure affects active teaching
- Adviser allocation remains incomplete
- Quality action becomes overdue
- Capacity/TG shortfall affects registered students
- Required academic decision is awaiting authority
- Regulatory/reporting deadline is at risk

### 7.2 Escalation path

1. Work-item owner receives reminder.
2. Programme Coordinator sees programme-level overdue item.
3. HoD sees department-level escalation where configured.
4. School Dean/Academic Affairs receives escalation only when role/policy requires it.
5. Each escalation records owner, reason, date and next action.

Escalation does not automatically assign blame or alter student records.

---

## 8. Failure and recovery catalogue

| Situation | Coordinator/HoD experience | System behaviour |
|---|---|---|
| Quality action has no owner | Require assignment before activation | Prevent unowned open action |
| HoD approval expires/unavailable | Show acting/delegated approver route | Do not bypass authority |
| Handover misses active item | Reconciliation shows unassigned work | Create operational task |
| Report data is stale | Show last certified refresh/time | Prevent misrepresentation as current |
| Export too broad/sensitive | Explain permission/reduction requirement | Block or require authorization |
| AI summary has missing source data | Show limitation; require human review | Do not present as authoritative |
| Historical configuration correction impacts results | Route to controlled amendment process | Preserve original/audit |
| Moodle issue persists | Show affected courses/TGs/students and owner | Escalate/retry without changing registration |
| Quality deadline missed | Mark overdue and escalate | Preserve completion evidence |
| User switches from HoD to lecturer workspace | Remove HoD approval actions immediately | Enforce active-role context |

---

## 9. Architecture contract

### 9.1 Core entities

| Entity | Purpose |
|---|---|
| Programme quality action | Managed improvement/compliance action |
| Department approval request | Scoped request requiring HoD/authority decision |
| Approval decision | Authorized approve/decline/return/referral record |
| Programme handover package | Active operational responsibility transfer |
| Governed programme report | Certified metric/report with scope and definition |
| Report export record | Auditable extract request/download |
| AI insight record | Controlled AI-assisted observation/summary |
| Historical programme record | Read-only prior programme configuration/operation state |
| Historical correction request | Controlled amendment of prior record |
| Operational escalation | Time-bound issue-routing record |

### 9.2 Commands

| Command | Main result |
|---|---|
| `CreateProgrammeQualityAction` | Opens owned quality action |
| `UpdateProgrammeQualityAction` | Records progress/evidence |
| `CloseProgrammeQualityAction` | Closes action with authorized approval |
| `ReviewDepartmentApprovalRequest` | Opens HoD decision workspace |
| `RecordDepartmentApprovalDecision` | Records scoped authorized decision |
| `PrepareProgrammeHandover` | Creates transfer package |
| `AcceptProgrammeHandover` | Activates incoming responsibility |
| `GenerateGovernedProgrammeReport` | Produces scoped certified report |
| `RequestProgrammeReportExport` | Creates controlled extract |
| `RequestHistoricalProgrammeCorrection` | Opens historical amendment case |
| `EscalateProgrammeOperationalRisk` | Routes overdue/critical issue |

### 9.3 Events

- `ProgrammeQualityActionCreated`
- `ProgrammeQualityActionOverdue`
- `ProgrammeQualityActionClosed`
- `DepartmentApprovalDecisionRecorded`
- `ProgrammeHandoverPrepared`
- `ProgrammeHandoverAccepted`
- `GovernedProgrammeReportGenerated`
- `ProgrammeReportExportRequested`
- `AIProgrammeInsightGenerated`
- `HistoricalProgrammeCorrectionRequested`
- `ProgrammeOperationalRiskEscalated`

### 9.4 Audit requirements

Record:

- Active coordinator/HoD role, department/programme scope
- Quality-action evidence, owner, due date and closure authority
- Approval request, policy/version, decision and conditions
- Handover sender/receiver, effective date and transferred items
- Report definition/version, filters, sources and freshness
- Export request, authorization, checksum and expiry
- AI use case, source data, human reviewer and limitations
- Historical record/correction original and amended versions
- Escalation route, timing and resolution

---

## 10. Part 3 acceptance tests

Part 3 is accepted when:

- Quality actions have a clear evidence source, owner, deadline, status and authorized closure.
- HoD approvals are role/scope controlled and can be approved with precise conditions.
- Programme handover transfers open operational work without retaining outgoing unrestricted access.
- Reports identify metric definition, scope, source, period, freshness and data limitations.
- Exports are limited, purpose-recorded and treated as non-authoritative extracts.
- AI can assist with approved summaries/quality checks but cannot make academic, programme, student or staff decisions.
- Historical programme records are read-only, and corrections preserve original versions.
- Operational issues escalate through configured responsibility without changing student data automatically.
- Coordinators/HoDs cannot access restricted counselling, discipline or unnecessary finance records.
- Keyboard, screen-reader, mobile, low-bandwidth, approval-delegation, export-control and handover-recovery tests pass.

**Role Blueprint 5 is now complete: Programme Coordinator and Head of Department.**

The next blueprint should be:

> **Role Blueprint 6: School Dean and Dean of Students** — beginning with decision queues, school/student-affairs oversight, delegated authority, student-success patterns and restricted-case boundaries.

---

## Following user responses before the next design record

### User message 0202

Proceed the design implemented is approved
