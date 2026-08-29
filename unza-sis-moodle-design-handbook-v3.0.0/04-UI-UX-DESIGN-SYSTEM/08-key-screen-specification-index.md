# Key Screen Specification Index

Every implemented screen belongs to an approved family and receives a stable `SCR-*` identifier before coding.

| Priority screen | Family | Primary purpose | Required states |
|---|---|---|---|
| Applicant programme search/detail | Public discovery | Understand and compare programmes | Loading, no results, stale requirements, unavailable intake |
| Applicant application shell | Guided task form | Complete/save/review a draft | Saved, saving, validation error, conflict, deadline passed |
| Student home | Student home | See milestones and next actions | No urgent work, action required, stale integration, denied |
| Course registration | Guided task form/decision review | Select eligible courses and formally register | Eligible, blocked with reason, conflict, uncertain external sync |
| Lecturer course/TG workspace | Staff record/work queue | Manage assigned teaching evidence | No assignment, Moodle stale, submission conflict, locked results |
| Adviser observation review | Case/evidence review | Understand concern and choose respectful follow-up | Duplicate, stale, no contact, access changed, provider failure |
| Admissions evidence review | Evidence review | Compare declarations/documents and recommend | Quarantine, replacement needed, conflict, incomplete evidence |
| Finance reconciliation case | Record/case page | Resolve provider/SIS mismatch | Uncertain, duplicate, amount mismatch, resolved/reopened |
| Examinations validation/release | Decision package | Validate and release official results | Missing/unmapped mark, conflict, returned, release failure |
| Quality finding/action | Evidence/decision package | Propose, respond, verify and close | Draft, challenged, overdue, verification failed, closed |
| Executive decision package | Decision package | Record accountable institutional decision | Conflict, stale evidence, delegation, authority expired |
| Moodle reconciliation queue | Operations queue | Recover SIS/Moodle differences | Retryable, dead-letter, replay approval, reconciled |
| System incident page | Operations case | Coordinate incident, recovery and evidence | Investigating, contained, recovering, monitoring, closed |

For each screen record page hierarchy, fields, actions, permission source, command/event, focus/keyboard behaviour, mobile transformation, content strings and linked tests.
