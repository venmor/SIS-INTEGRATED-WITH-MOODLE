# System Scope and Research Boundary

## Problem statement

University information is often fragmented across admissions records, spreadsheets, finance systems, learning platforms, examination processes and support offices. Fragmentation causes repeated data entry, inconsistent status, weak auditability, slow recovery from integration failures and inappropriate access to sensitive information.

The proposed SIS provides one governed coordination layer for the student lifecycle while respecting the ownership boundaries of academic, finance, support, quality and external learning systems.

## Objectives

- Give applicants and students an understandable view of tasks, status, reasons and next steps.
- Give staff role-specific queues and records rather than unrestricted database-like access.
- Preserve authoritative student, academic, financial and decision history.
- Express university policy as approved, effective-dated configuration.
- Integrate with Moodle and external providers without making them the authority for official SIS decisions.
- Enforce least privilege, confidentiality and auditable approval.
- Recover safely from duplicate, delayed and failed external interactions.
- Support quality, reporting and regulatory evidence without allowing reports to rewrite source records.
- Remain explainable to student developers, supervisors, operators and future maintainers.

## In-scope domains

1. Identity, authentication, role assignment and scope
2. Programme discovery, applications, evidence review and admissions decisions
3. Authoritative student records and controlled corrections
4. Academic registration, study plans, prerequisites, progression and repeats
5. Course charges, payments, allocation, sponsorship, refunds and clearance
6. Moodle shell/enrolment/Tutorial Group/grade staging and reconciliation
7. Assessment plans, marks, moderation, boards, release and amendments
8. Advising, counselling, disability, welfare, safeguarding and discipline boundaries
9. Programme quality review, evidence, findings and corrective action
10. Certified reporting, regulatory packages and submission acknowledgement
11. Notifications and delivery evidence
12. Integration operations, retry, reconciliation, incident handling, audit and archive

## Boundary rules

- Moodle supports teaching and grade staging; it does not publish official results.
- Payment-provider callbacks provide evidence; Finance decides allocation and clearance under policy.
- Reporting calculates and certifies views; it does not correct source records.
- System administrators manage infrastructure and access mechanisms; they do not make academic or financial decisions.
- Support-service confidentiality is not inherited by senior academic or technical roles.
- A notification communicates a decision; it does not create that decision.
- The SIS never treats a successful browser response alone as proof of a completed high-impact action; authoritative state and audit evidence are required.

## Out of initial presentation scope

Real provider credentials, real student data, nationwide scale claims, native mobile applications, AI chatbots, biometric systems, microservices, Kubernetes and production legal certification are excluded from the initial presentation release.

## Success criteria

The system succeeds when critical journeys are complete, role-correct, recoverable, accessible, auditable and traceable from requirement through test evidence. A happy-path interface demonstration alone is insufficient.
