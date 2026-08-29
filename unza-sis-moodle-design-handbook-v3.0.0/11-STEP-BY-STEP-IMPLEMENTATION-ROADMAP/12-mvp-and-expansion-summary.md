# MVP and System Expansion Roadmap

> **Coverage notice:** The MVP sequence is approved and every role family has a controlling standalone or composite journey. Staff-side tasks still require exact institutional/demo authority, policy values and acceptance evidence through the task entry gate.

## Maturity levels

| Level | Meaning |
|---|---|
| Designed | Requirements, permissions, workflows and tests documented |
| Scaffolded | Module boundary/contracts/configuration structure exist in future codebase |
| Functional | Core vertical journey works and is tested |
| Operational | Failure, security, accessibility, audit, recovery and operations are proven |

## Presentation MVP (`v1.0.0-presentation`)

Connected functional scope:

1. Identity, secure session, active role/workspace and scoped authorization
2. Applicant draft, personal details, document upload, review and receipt
3. Admissions evidence review, recommendation, approval and offer
4. Accepted-applicant conversion to student
5. Eligible course selection and academic registration
6. Simulated charges/payment and calculated financial clearance
7. Simulated Moodle enrolment failure, replay and reconciliation
8. Mark staging, validation and controlled official result release
9. Notification records, audit timeline and operations queue

## Foundation releases

| Release | Outcome |
|---|---|
| `v0.1.0` | Repository, Docker, CI, documentation and UI foundation |
| `v0.2.0` | Identity/authentication/authorization |
| `v0.3.0` | Applicant journey |
| `v0.4.0` | Admissions review/offer |
| `v0.5.0` | Student conversion/registration |
| `v0.6.0` | Finance simulation/clearance |
| `v0.7.0` | Moodle simulation/recovery |
| `v0.8.0` | Assessment/result release |
| `v0.9.0` | Audit, notifications, operations and demo hardening |
| `v1.0.0` | Presentation release |

## Expansion families

- **1.1 Student/academic depth:** corrections, study plans, add/drop, prerequisites, repeats, progression, supplementary/deferred assessment, transcript basis.
- **1.2 Teaching/Moodle depth:** teaching assignment, Tutorial Groups, real shell/enrolment/grade staging, calendars and reconciliation.
- **1.3 Finance depth:** sponsorship, allocation, partial payment, waiver, refund, reversal, holds and reports.
- **1.4 Student support:** advising, counselling/disability/welfare/safeguarding boundaries, consent and restricted workload reporting.
- **1.5 Quality/governance:** programme review, evidence, findings, action ownership, verification and leadership packages.
- **1.6 Graduation/certification:** readiness, award approval, certificate/transcript verification, replacement/revocation and archive.
- **1.7 Reporting/regulatory:** metric definitions, certified reports, privacy suppression, signatory submission, acknowledgement and resubmission.
- **1.8 Production integrations:** real approved providers, credentials, monitoring and reconciliation.
- **2.0 Operational completion:** all agreed modules at declared maturity with threat/load/accessibility/restore/monitoring/UAT evidence.

## Expansion gate

```text
Approved requirement
→ task packet
→ vertical slice
→ contracts/data/state change
→ permission/audit/recovery
→ tests and learning note
→ peer-reviewed PR
→ staging demonstration
→ versioned release
```

Later work must not silently break established journeys. Prefer additive migrations and contracts, keep regression tests, version policy changes and document deprecation/rollback.

## Module maturity baseline

| Module | Design | MVP target | Later operational target |
|---|---|---|---|
| Identity & Access | Complete | Functional/operational baseline | 2.0 |
| Admissions | Complete | Functional | 1.1/2.0 |
| Student Records/Registration | Complete | Functional | 1.1/2.0 |
| Finance | Complete | Functional simulation | 1.3/1.8/2.0 |
| Learning Integration | Complete | Functional simulation/recovery | 1.2/1.8/2.0 |
| Assessment/Examinations | Complete | Functional controlled release | 1.1/2.0 |
| Support Services | Complete | Scaffold/deferred | 1.4/2.0 |
| Quality Governance | Complete | Scaffold/deferred | 1.5/2.0 |
| Graduation/Certification | Complete | Deferred | 1.6/2.0 |
| Reporting/Regulatory | Complete | Scaffold/deferred | 1.7/2.0 |
| Audit/Notifications/Operations | Complete | Functional baseline | 1.8/2.0 |

Completion means operational evidence for the declared scope—not that every imaginable university feature exists.
