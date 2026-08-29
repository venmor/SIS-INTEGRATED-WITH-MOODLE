# Cross-Blueprint Implementation Set, Part 3A — Permission and information-visibility matrix: core academic and financial records

> Approved cross-blueprint implementation contract.


This matrix is the authorization contract. It controls data visibility, actions, export and disclosure—not merely which menu item appears.

A permission decision evaluates:

> **Identity + active role + organizational scope + assignment + record state + purpose + policy/consent + time-bound authority**

## 15.1 Permission verbs

| Verb | Meaning |
|---|---|
| `View` | Read permitted data in the application |
| `Create` | Start a new governed record |
| `Update` | Change permitted draft/operational data |
| `Submit` | Send a record into a controlled workflow |
| `Recommend` | Provide non-final professional recommendation |
| `Approve` | Make a configured institutional decision |
| `Verify` | Independently test/confirm evidence or action |
| `Release` | Publish an official institutional outcome |
| `Export` | Produce a controlled extract |
| `Administer` | Manage technical configuration, not business content |
| `Never` | No ordinary access; exception requires explicit policy workflow |

A visible record does not imply every verb is permitted.

## 15.2 Data classifications

| Class | Examples | Default rule |
|---|---|---|
| Public | Public programme information | Broad view |
| Institutional internal | Course offering, staff assignment | Role/scope view |
| Personal confidential | Contact data, application evidence, marks | Need-to-know |
| Financial confidential | Balances, payments, sponsor records | Finance role or student self-view |
| Restricted support | Counselling/welfare/disability records | Service/assignment/consent bound |
| Highly restricted | Safeguarding, sensitive disciplinary evidence | Explicit assigned authority only |
| Regulatory/audit restricted | Audit workpapers, submission packages | Authorized governance role only |

## 15.3 Core identity and contact data

| Role | View | Update | Export | Explicit limit |
|---|---|---|---|---|
| Student/applicant | Own identity/contact | Own permitted contact fields | Own permitted record | Cannot change verified identity without workflow |
| Admissions Officer | Assigned applicant identity/contact | Controlled correction request | Approved case extract | Cannot change identity evidence without audit |
| Records Officer | Student identity needed for records work | Controlled correction workflow | Authorized transcript/record extract | No support/finance details |
| Lecturer/Tutor | Name, student number, institutional contact only for taught students | Never | Approved class-list extract | No private contact by default |
| Adviser | Assigned advisee contact and communication preference | Request correction | Limited assigned-caseload extract | No unrelated student search |
| Programme Coordinator/HOD | Programme-scoped minimum identity | Never | Approved operational list | No unrestricted personal profile |
| Dean | Aggregate by default; individual only authorized escalation | Never | Controlled decision-package extract | No broad student browsing |
| Finance roles | Identity/contact needed for account case | Controlled contact update request | Finance-authorized extract | No academic/support narrative |
| Support roles | Identity/contact required for assigned case | Service-specific contact preference | Restricted case export only | No unrelated profile browsing |
| QAO/Auditor | Minimum identity only when approved test/review requires it | Never | Purpose-controlled extract | Default aggregate |
| System/IAM Admin | Identity/account linkage required for access administration | Account/identity workflow only | Security-approved extract | No academic/finance/support content |

## 15.4 Admissions and applicant records

| Role | View | Create/update | Decide/approve | Export | Never access |
|---|---|---|---|---|---|
| Applicant | Own application, own evidence/status | Draft, submit, respond to clarification | Accept/decline offer only | Own receipt/permittted copy | Staff notes, matching confidence, other applications |
| Admissions Officer | Assigned/intake-scoped applications | Verification/case updates | Recommend; decision only if assigned authority | Controlled assigned-case/batch extract | Counselling/discipline content |
| Academic assessor | Assigned academic evidence and criteria | Recommendation | No final offer unless authority assigned | No bulk export by default | Finance/payment full detail, unrelated personal data |
| Admissions Manager | Intake/programme queue | Assignment, exception case | Authorized batch/final decision | Approved aggregate/batch export | Unrelated support records |
| Records Officer | Converted applicant minimum data | Conversion/identity resolution | No admissions decision by default | Controlled record extract | Admissions assessor private notes without need |
| Finance Officer | Application fee/waiver status only | Finance case only | Fee waiver within authority | Finance extract | Qualifications and admissions recommendation unless needed |
| QAO/Auditor | Aggregate or scoped sampled evidence | Never | Never | Approved audit/QA extract | Routine applicant browsing |
| System Admin | No ordinary access | No business update | Never | Never | Application content |

## 15.5 Academic registration, course and progression data

| Role | View | Create/update | Decide/approve | Export | Explicit boundary |
|---|---|---|---|---|---|
| Student | Own registration, selected courses, progression status/reasons | Select/submit permitted registration changes | Never | Own registration receipt | Other students’ registration |
| Lecturer/Tutor | Official class list for assigned course/TG; necessary registration state | Teaching-related operational update only | Never | Approved course/TG list | Student’s unrelated course history |
| Adviser | Assigned advisee’s relevant study plan/progression | Recommend plan/exception | Recommendation only unless separately assigned | Assigned caseload extract | Change registration directly |
| Programme Coordinator | Programme/course/cohort registrations | Manage offering/TG assignment within authority | Configured academic exception recommendation/approval | Approved programme operational export | Unrelated programmes |
| HOD | Department scope | Teaching/course-offering operations | Configured departmental decision | Approved department export | Counselling/finance detail |
| Dean | School aggregate and authorized escalations | Assign/delegate task | Configured school-level academic decision | Decision-package export | Routine individual browsing |
| Examinations Officer | Course/period official candidate list | Examination operational status | No programme progression decision | Approved candidate-list export | Support/finance narrative |
| Records Officer | Institutional registration/progression records | Controlled correction/record update | Authorized administrative correction | Transcript/record export | Change policy interpretation |
| Finance role | Clearance result only | No registration edit | Never | Finance purposes only | Course grades/progression detail not needed |
| QAO | Aggregate quality indicators; authorized sampled detail | Never | Never | Governed QA export | Full individual records by default |

## 15.6 Learning, Moodle and assessment data

| Role | View | Create/update | Approve/release | Export | Explicit boundary |
|---|---|---|---|---|---|
| Student | Own Moodle access, activities, submissions, permitted marks | Submit own learning work | Never | Own permitted learning evidence | Other students’ work/marks |
| Lecturer | Assigned course/TG activities, official class list, staged grade data | Materials/activities/marks within role | Submit for moderation; no official result release | Approved course extract | Unassigned courses/support content |
| Tutor | Assigned TG/course with granted capability | Quiz/activity action only if explicitly granted | No official mark release | TG-scoped permitted export | Full course administration if not granted |
| Moodle Administrator | Mapping/sync operational metadata | Technical Moodle configuration and sync resolution | Never approve academic marks | Operational audit export | Official SIS mark alteration |
| Examinations Officer | Official candidate list, approved CA/result staging | Validation/board package operations | Official release only if authority assigned | Controlled examination export | Moodle private teaching content not needed |
| Programme Coordinator/HOD | Aggregate course delivery/assessment status | Course/assessment governance where assigned | No unilateral official result release | Programme aggregate export | Individual submissions unless purpose permits |
| External Examiner | Assigned review sample/evidence | Report/recommendation only | Never alter/release result | Restricted assignment export where authorized | Unrelated courses/student records |
| QAO | Approved aggregate/course evidence | Review evidence only | Never alter grades | QA-controlled extract | Raw student activity by default |

## 15.7 Official results, progression and award data

| Role | View | Create/update | Approve/release | Export | Explicit boundary |
|---|---|---|---|---|---|
| Student | Own released results/progression | Appeal/correction request | Never | Own transcript/result statement | Internal moderation/board notes |
| Lecturer | Assigned-course provisional/staged marks | Submit and correct through workflow | No official release | Assigned course list where approved | Other courses’ final data |
| Examinations Officer | Course/period result records | Validation, board package, amendment case | Release only with active authority | Controlled board/candidate export | Change academic policy |
| Programme Coordinator/HOD | Programme outcome summaries | Recommendation/exception review | Configured authority only | Scoped approved report | Bypass board workflow |
| Dean | School aggregate + authorized escalations | Decision/recommendation within scope | Configured authority only | Decision package | Routine detailed marks |
| Graduation/Senate Officer | Award evaluation and clearance state | Prepare award/certificate case | No result change | Authorized award report | Private support/finance detail |
| Regulatory User | Certified aggregate outcomes | Submission preparation | Never change source results | Approved regulatory package | Individual results unless mandated and approved |
| Auditor | Sampled/authorized result-control evidence | Never | Never | Audit evidence extract | Operational release rights |

## 15.8 Finance information

| Role | View | Create/update | Approve/release | Export | Explicit boundary |
|---|---|---|---|---|---|
| Student | Own charges, payments, sponsorship summary, clearance status | Payment intention, query/refund request | Never change balance | Own statement/receipt | Other students’ finance data |
| Cashier | Payment intake context | Record cash intake/provisional receipt | No adjustment/refund approval | Cashier-session report | Full academic/support record |
| Finance Officer | Assigned/account-scope financial record | Charges, adjustment/reallocation case | Threshold-based approval | Approved finance export | Counselling/discipline notes |
| Reconciliation Officer | Payment/reference/matching data | Match/reconcile case | No waiver/refund approval unless assigned | Reconciliation export | Change source academic records |
| Sponsorship Officer | Sponsor undertaking/coverage/claim data | Coverage/claim case | Configured sponsor decision | Sponsor-approved export | Private welfare/counselling content |
| Finance Manager | Finance aggregate and authorized cases | Policy/approval workflow within authority | Refund/waiver/clearance exceptions within threshold | Controlled finance report | Academic outcomes not needed |
| Registration service | Clearance status and expiry only | Never | Never | Never | Balance/payment history |
| Adviser/Dean/HOD | Aggregate/individual clearance state only when needed | Never | Never | No finance export by default | Balance, transactions, sponsor evidence |
| QAO/Auditor | Aggregate or scoped audit sample | Never | Never | Approved QA/audit extract | Routine student account browsing |

## 15.9 Permission enforcement requirements

For every matrix entry:

- UI navigation hides irrelevant functions but server-side authorization remains mandatory.
- Query filters enforce role/scope before records are returned.
- Export permission is separate from view permission.
- Field-level masking applies even inside an otherwise authorized record.
- All elevated/sensitive access is purpose-logged.
- A role assignment expiry immediately affects authorization.
- Cached or offline client data is cleared/protected after access change.
- No “administrator bypass” exists outside explicit break-glass policy.

## 15.10 Acceptance requirements

Part 3A is accepted only when:

- Identity, admissions, academic, learning, results and finance permissions are separated by role and purpose.
- Student self-service never grants staff-level authority.
- Moodle access never grants authority over official SIS outcomes.
- Academic roles see financial clearance only, not balances.
- Quality and audit roles default to aggregate/minimized data.
- Export is independently authorized and logged.
- Every `Never` boundary is enforced at server/query level, not only hidden in UI.
