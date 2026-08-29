# Screen and Component Catalogue

## Screen families

| Family | ID prefix | Purpose |
|---|---|---|
| Public discovery | `SCR-PUB-*` | Programme search, eligibility guidance and public dates |
| Guided task form | `SCR-FRM-*` | Applications, registration and requests |
| Applicant/student home | `SCR-HOME-*` | Milestones, urgent tasks and authoritative personal status |
| Staff work queue | `SCR-QUE-*` | Assigned cases, deadlines and safe filtering |
| Record/case page | `SCR-REC-*` | Application, student request, payment or support case |
| Evidence review | `SCR-EVD-*` | Evidence, criteria, provenance, decision and history |
| Decision package | `SCR-DEC-*` | Offers, result release, awards and governance approval |
| Operations queue | `SCR-OPS-*` | Sync failures, incidents, replay and reconciliation |
| Aggregate insight | `SCR-INS-*` | Governed quality/leadership metrics linked to action |

A new screen must belong to an approved family or receive a design change.

## Key screen contracts

- **SCR-HOME-APP-001 Applicant home:** application period, completeness, latest reliable status, action needed and support route.
- **SCR-FRM-APP-001 Application draft:** step navigation, persistent labels, draft save evidence, validation summary and recovery.
- **SCR-EVD-ADM-001 Admissions review:** assigned application, evidence provenance, criterion review, conflict warning and recommendation history.
- **SCR-FRM-REG-001 Course registration:** eligible selections, reason for unavailable courses, charge implications, saved state and formal review.
- **SCR-REC-LEC-001 Course workspace:** assigned offering, Tutorial Groups, assessment tasks and controlled mark staging.
- **SCR-REC-ADV-001 Adviser outreach:** assigned advisee academic observations and outreach; no restricted support detail.
- **SCR-REC-FIN-001 Finance reconciliation:** charge/payment evidence, allocation, callback history, exception and authorized action.
- **SCR-DEC-ASM-001 Result package:** validation findings, board readiness, approvals, release consequence and immutable history.
- **SCR-REC-QA-001 Quality finding:** scope, evidence, criterion, response, action owner, due date and independent verification.
- **SCR-DEC-EXE-001 Executive package:** decision, risk, evidence, limitation and accountable next action.
- **SCR-OPS-LRN-001 Moodle reconciliation:** correlation, safe payload, attempts, provider result, replay eligibility and final alignment.
- **SCR-OPS-SYS-001 Incident:** affected service/workflow, severity, containment, recovery and evidence.

## Approved component/pattern catalogue

| ID | Component | Required behaviour |
|---|---|---|
| `UI-CONTEXT-001` | Workspace context bar | Shows active role, scope and academic period |
| `UI-STATUS-001` | Status explanation | State, reason, last update, owner/next step |
| `UI-FIELD-001` | Form field | Persistent label, help, validation and accessible association |
| `UI-ERROR-001` | Error summary | Links to affected fields and preserves valid values |
| `UI-TASK-001` | Task summary | One meaningful task, due state and clear action |
| `UI-RECORD-001` | Record summary | Minimum necessary facts with source/freshness |
| `UI-TABLE-001` | Data table | Labelled headers, keyboard access, pagination and safe filtering |
| `UI-TIMELINE-001` | Audit/history timeline | Actor/role, event, time, source and safe details |
| `UI-DECISION-001` | Decision review | Evidence, consequence, authority, reason and confirmation |
| `UI-DOCUMENT-001` | Document viewer | Authorization, safe rendering/download and provenance |
| `UI-NOTICE-001` | Notification/notice | Severity, plain language, action and dismissal rules |
| `UI-EMPTY-001` | Empty state | Explains whether nothing exists, access is scoped, or action is needed |
| `UI-STALE-001` | Stale-data warning | Last refresh, limitation and refresh/recovery route |
| `UI-DENIED-001` | Access denial | No unnecessary existence disclosure; safe support/reference route |

## Microinteraction rules

- Buttons show progress only after action acceptance; repeated activation is prevented.
- Optimistic UI is prohibited for official submissions, payments, registration confirmation and result release.
- Saving a draft shows saved time and sync state.
- Connection loss leaves recoverable local/form state where safe.
- Toasts may acknowledge minor actions but never serve as the only evidence of a high-impact completion.
- Confirmation dialogs name the action and consequence; generic “Are you sure?” is insufficient.
- Focus moves to validation/error/status summaries after submission.
- Success messages include the authoritative reference or receipt when applicable.
