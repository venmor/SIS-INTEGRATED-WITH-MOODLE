# Cross-Blueprint Implementation Set, Part 3B — Permission and information-visibility matrix: restricted, governance and operations records

> Approved cross-blueprint implementation contract.


## 15.11 Counselling and safeguarding information

| Role | View | Create/update | Export | Explicitly prohibited |
|---|---|---|---|---|
| Student | Own student-visible referral, appointment and agreed action status | Self-referral, appointment request, consent decision | Own permitted summary | Restricted session notes, counsellor assessments, safeguarding notes |
| Counsellor | Assigned counselling cases and necessary referral context | Restricted case notes, appointments, service status | Highly restricted, policy-approved case extract | Unassigned cases; unrelated finance/discipline data |
| Counselling Service Lead | Aggregate capacity/overdue work; assigned operational cases where required | Assignment/handover, service management | Aggregate/service report | Routine session-note browsing |
| Adviser/Lecturer | Minimal referral status only, where consent/policy permits | Offer referral; create academic follow-up | No counselling export | Session notes, diagnosis, attendance details |
| Welfare Officer | Minimum cross-referral status | Referral/coordination record | No counselling content export | Counselling case notes |
| Disability-support Officer | Only information separately authorized by student/policy | Never edit counselling record | Never | Counselling content |
| Dean/HOD/Executive | Aggregate service demand/wait times only | Never | Aggregate report only | Identifiable counselling cases, notes, diagnosis |
| Disciplinary Case Officer | Never by default | Never | Never | Counselling records as disciplinary evidence without explicit lawful process |
| Auditor | Control evidence/minimized sample only | Never | Restricted audit extract | Routine clinical/session content |
| System/IAM Admin | Never by default | Technical access controls only | Never | Counselling content |

### Safeguarding

Safeguarding requires a separate `Highly restricted` policy gate.

- Only assigned authorized responders view the case.
- Every access requires purpose/reason and enhanced audit.
- No routine dashboard or global search.
- No automatic disclosure to adviser, Dean, family, lecturer, Finance or Discipline.
- Break-glass does not automatically grant safeguarding access.

## 15.12 Disability-support information and accommodation plans

| Role | View | Create/update | Export | Explicit limit |
|---|---|---|---|---|
| Student | Own request, plan status and approved adjustments | Submit/review request | Own permitted plan | Restricted evidence/assessment notes as policy limits |
| Disability-support Officer | Assigned support case and evidence | Draft/approve/renew plan within authority | Restricted case extract | Unrelated support cases |
| Lecturer/Tutor | Course-scoped implementation instruction | Record implementation issue only | No default export | Diagnosis/evidence/rationale |
| Examinations Officer | Examination-scoped instruction | Record implementation confirmation | Controlled operational list | Diagnosis/private evidence |
| Adviser | Minimal status only if relevant | Refer/request support | No plan export | Diagnosis and evidence |
| Discipline Officer | Procedural adjustment instruction only when required | Request implementation support | No disability record export | Full support case |
| QAO/Auditor | Aggregate/accessibility-control evidence | Never | Approved aggregate/sample | Individual evidence by default |

An accommodation-plan instruction may say “extra time” or “accessible materials required.” It must not reveal why.

## 15.13 Welfare information

| Role | View | Create/update | Export | Explicit limit |
|---|---|---|---|---|
| Student | Own request, appointment, support plan and student-visible status | Submit/update own request | Own permitted summary | Internal assessment notes |
| Welfare Officer | Assigned welfare cases and necessary evidence | Support plan, referral, closure | Restricted case export | Counselling notes/unrelated finance account |
| Finance Officer | Minimum referral/request needed for finance support | Finance case only | Finance-controlled export | Welfare narrative unless necessary/authorized |
| Adviser | Minimum service status where permitted | Offer/referral | No welfare case export | Private welfare details |
| Dean/Executive | Aggregate demand/capacity only | Never | Aggregate report | Individual welfare narratives |
| Auditor | Control/sampled evidence only | Never | Restricted audit export | Routine case browsing |

## 15.14 Disciplinary information

| Role | View | Create/update | Approve | Export | Explicit limit |
|---|---|---|---|---|---|
| Student | Own notices, permitted evidence, decision and appeal status | Submit response/appeal | Never | Own permitted documents | Protected witness/safeguarding material |
| Disciplinary Case Officer | Assigned case evidence and procedure data | Case administration, notice, hearing record | Recommendation/decision only if assigned | Restricted case package | Counselling/welfare notes by default |
| Committee/panel member | Assigned hearing package only | Record decision within authority | Configured decision | Restricted meeting package | Unrelated cases |
| Dean/Dean of Students | Aggregate trends; individual case only as formally assigned | Decision/delegation only within policy | Configured export | Routine unrestricted case browse |
| Disability Support | Procedural adjustment need only | Support instruction | Never | Never | Allegation/evidence unless necessary |
| Counsellor/Welfare Officer | Support offer status only where permitted | Service support record | Never | Never | Disciplinary evidence/case notes |
| Auditor | Sampled control evidence | Never | Restricted audit extract | Full case content unless engagement requires it |
| Executive | Aggregate trend/assigned appeal decision only | Authorized decision | Decision package | Routine case lists |

Disciplinary data cannot be joined with counselling, welfare, academic observation or finance data to make automated disciplinary decisions.

## 15.15 Quality-assurance information

| Role | View | Create/update | Approve/verify | Export | Explicit limit |
|---|---|---|---|---|---|
| QAO | Assigned reviews, evidence, findings/actions | Reviews, requests, proposed findings | Verify only if independent | Controlled QA package | Alter source results/records |
| Programme Owner/Coordinator | Assigned programme review and evidence requests | Self-evaluation/evidence/action response | Cannot independently certify own evidence | Scoped submission export | Other programme reviews |
| School Quality Lead | School-scoped reviews/actions | Evidence/coordination tasks | Configured recommendation | School report | Institution-wide unrelated review |
| Independent verifier | Assigned action and evidence only | Verification assessment | Verify | No broad export | Own correction/action verification |
| Committee member | Frozen assigned package | Decision/note as authorized | Configured committee decision | Controlled package | Live broad evidence browse |
| Dean/Executive | Assigned quality decision package, aggregate portfolio | Sponsor/action update | Configured authority | Decision/report export | Routine restricted support/finance data |
| Student | Publicly released quality information only | Feedback where permitted | Never | Public item only | Internal findings/reviewer notes |
| Auditor | QA-control evidence/sample | Never | Audit verification | Audit extract | Operate QA process |

## 15.16 Leadership, risk and strategy information

| Role | View | Create/update | Decide | Export | Explicit limit |
|---|---|---|---|---|---|
| Executive Leader | Institution/scope aggregate indicators, assigned packages, risks/interventions | Intervention/risk update | Authority-bound decision | Approved executive package | Unrestricted individual/sensitive cases |
| Intervention owner | Assigned intervention/actions | Progress evidence and risk update | Never unless separately delegated | Own action extract | Unrelated strategy portfolio |
| Risk owner | Assigned risk/control | Risk update | Recommend/accept only if authorized | Scoped risk report | Close risk without authority |
| Dean/HOD | Scope-level strategic actions/metrics | Progress/action update | Scoped academic decision | Approved scope report | Institution-wide private data |
| QAO | Linked quality evidence/actions | QA update | Never substitute leadership decision | QA report | Strategic budget decision |
| Finance Manager | Finance indicators/budget references needed for assigned intervention | Financial update | Within finance authority | Finance report | Academic/support case content |
| Student-support lead | Service-capacity indicators | Operational update | Never strategy decision | Aggregate report | Individual support records |
| Auditor | Assigned governance evidence | Never | Audit conclusion only | Audit package | Operate strategy process |

## 15.17 Audit information

| Role | View | Create/update | Approve/close | Export | Explicit limit |
|---|---|---|---|---|---|
| Internal Auditor | Assigned audit scope/evidence | Audit plan, test, workpaper, finding | Audit finding/verification within authority | Restricted audit evidence | Operate audited process |
| Audit Lead | Audit portfolio and assigned engagements | Assignment/quality review | Configured audit closure recommendation | Audit committee package | Override evidence history |
| Management response owner | Finding and required evidence only | Response/action plan | Cannot close own finding | Own response evidence | Full audit workpapers |
| Audit Committee member | Frozen audit package | Governance decision | Configured oversight decision | Controlled package | Unrelated audit data |
| Executive | Assigned material audit finding/action | Sponsor/action decision | Within authority | Approved package | Edit audit workpaper |
| QAO | Only linked QA finding/action information | QA response where assigned | Never close audit finding | No broad audit export | Full audit workpapers |
| System Admin | Technical evidence for assigned audit request | Provide evidence only | Never | Controlled technical extract | Edit audit engagement |

## 15.18 Regulatory submission information

| Role | View | Create/update | Approve/release | Export | Explicit limit |
|---|---|---|---|---|---|
| Regulatory Reporting User | Draft submissions, certified metrics, required evidence | Prepare narrative/package | Never alter source data | Controlled draft package | Submit without authority |
| Metric Owner/Data Steward | Source definition/quality issue | Certify/recalculate metric through governed workflow | Metric certification authority | Metric report | Regulatory narrative outside purpose |
| Authorized signatory | Frozen submission and evidence summary | Return/request clarification | Approve/sign | Signed package | Change field/source data directly |
| Submission role | Approved frozen package and delivery status | Delivery attempt | Submit only within authority | Final controlled package | Change content/sign-off |
| QAO | Quality evidence linked to submission | Provide/verify evidence | No statutory submission alone | QA extract | Alter metrics |
| Executive | Assigned statutory package | Decision/approval within authority | Configured sign-off | Governance package | Direct source correction |
| Auditor | Sampled submission-control evidence | Never | Audit conclusion | Audit extract | Delivery/submission |
| Regulator/external recipient | Only delivered configured package | Query/acknowledgement through controlled channel | Never alter institution record | Received package only | SIS access |

## 15.19 Operations and technical data

| Role | View | Create/update | Export | Explicit limit |
|---|---|---|---|---|
| System Administrator | Health, incidents, approved technical configuration | Execute approved operational change/recovery | Controlled operational log | Business-data browsing |
| IAM Administrator | Person/account/role-assignment records | Role/access/recovery workflow | Security-approved access report | Academic/finance/support content |
| Moodle Administrator | Moodle mapping, sync, technical course state | Moodle configuration/reconciliation | Operational sync extract | Official SIS result/registration alteration |
| Integration-support Officer | Event queues, mappings, provider responses | Retry/reconcile/request mapping change | Controlled integration log | Source-domain data edits |
| Security Administrator | Security events/access patterns | Security response/configuration | Restricted security report | Business decision authority |
| Domain Administrator | Domain configuration explicitly assigned | Versioned domain configuration | Scoped config export | Global platform/sensitive-case access |
| Support Service Admin | Service capacity/configuration only | Service setup where authorized | Aggregate service report | Restricted counselling content unless assigned practitioner |

## 15.20 Break-glass access

Break-glass is not a broad “admin override.”

A request requires:

- Active incident/emergency reference
- Urgent reason
- Exact requested information category/scope
- Requested duration
- Authorized approver where configured
- Enhanced audit and post-use review

It grants only the minimal temporary capability. It must not be used for convenience, routine support, staff curiosity, or bypassing academic/finance/disciplinary governance.

## 15.21 Permission decision pseudocode

```text
allow only when:
  active role is valid
  AND role contains the requested verb
  AND organizational scope contains the record
  AND assignment/state/purpose conditions are satisfied
  AND consent/policy basis allows the data category
  AND delegation/authority is active where needed
  AND no hold, conflict or segregation-of-duties rule blocks it
```

Deny by default. The application checks this server-side for every read, change, export and action.

## 15.22 Part 3B acceptance requirements

Part 3B is accepted only when:

- Counselling, safeguarding, disability, welfare and discipline have separate enforceable boundaries.
- Leadership sees aggregates by default and cannot casually drill into sensitive cases.
- QA, audit and regulatory workflows preserve independent roles and evidence controls.
- Technical administrators can operate the platform without browsing business-domain records.
- Export is separately checked, classified and audited.
- Break-glass is minimal, time-bound, reasoned and reviewed.
- All permissions are evaluated server-side using role, scope, assignment, state, purpose and policy/consent.

**The permission and information-visibility matrix is complete.**
