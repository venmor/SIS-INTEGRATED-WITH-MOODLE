# Baseline Traceability Matrix

> **Coverage notice:** This matrix shows cross-cutting coverage. Apply `IMPLEMENTATION-READINESS-MATRIX.md` and the relevant standalone or composite role journey before opening a task.

The future implementation repository expands this matrix with code paths, migrations, PRs and release evidence.

| Requirement group | Roles | Actions/screens | Modules | Primary tests | MVP/roadmap |
|---|---|---|---|---|---|
| `REQ-IAM-*` | All; IAM admin | `ACT-IAM-001`, context/sign-in screens | Identity & Access | `TEST-AUTH-*` | Foundation/MVP |
| `REQ-ADM-*` | Applicant, Admissions | `ACT-APP-*`, `ACT-ADM-*`, applicant/review screens | Admissions | `TEST-E2E-APP-001` | MVP |
| `REQ-REG-*` | Student, Registry | `ACT-REG-001`, registration screens | Student Records; Registration | `TEST-E2E-REG-001` | MVP then 1.1 |
| `REQ-LRN-*` | Lecturer, Integration Support | `ACT-LRN-001`, Moodle reconciliation | Learning Integration; Integration Hub | `TEST-E2E-REG-001`, `TEST-REC-004` | MVP then 1.2/1.8 |
| `REQ-ASM-*` | Lecturer, Exams, Approver, Student | `ACT-ASM-*`, result package | Assessment & Examinations | `TEST-E2E-ASM-001` | MVP then 1.1/1.2 |
| `REQ-FIN-*` | Student, Finance | `ACT-FIN-*`, finance reconciliation | Finance | `TEST-REC-002/009` | MVP simulation then 1.3 |
| `REQ-SUP-*` | Adviser, Support, Student | `ACT-SUP-001`, outreach/case screens | Support Services | `TEST-AUTH-006/007/011` | 1.4 |
| `REQ-QA-*` | QAO, Dean, Regulatory | `ACT-QA-001`, `ACT-REP-001` | Quality; Reporting | `TEST-AUTH-008/010`, `TEST-REC-011` | 1.5/1.7 |
| `REQ-OPS-*` | Integration, Sysadmin, Auditor | operational screens | Notifications; Integration; Audit | recovery/security catalogue | MVP then 1.8/2.0 |
| `REQ-NFR-*` | All | All critical screens/actions | Cross-cutting | authorization, recovery, accessibility | Every release |

## Implementation linkage columns

When development begins, add:

```text
Task ID | Repository path | API/command | Migration | PR | Test evidence | Release | Status
```

A row may be `DEFERRED`, but it may not disappear.
