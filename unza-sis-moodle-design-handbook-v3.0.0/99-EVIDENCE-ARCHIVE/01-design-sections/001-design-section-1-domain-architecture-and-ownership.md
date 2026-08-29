<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: b1047be4-f976-5389-9a17-a31ea01402d1; chronological message: 55. -->

## Design Section 1 — Domain architecture and ownership

The SIS will use explicit domain ownership. Each domain module owns its records, rules and state transitions. Other modules may interact only through published commands, queries or domain events—not by directly modifying another module’s tables.

### Foundational modelling rules

1. **Institutional structure is an effective-dated graph**

   - Organisational unit types are configurable: university, college, school, faculty, institute, directorate, department, centre and campus.
   - Relationships such as `reports-to`, `academically-owned-by`, `delivered-by` and `located-at` are separately recorded.
   - The model does not assume every programme follows a fixed School → Department hierarchy.
   - Historical structures remain queryable after reorganisations.

2. **People, positions and access are separate**

   - A person can simultaneously be a student, lecturer, supervisor, adviser or staff member.
   - Positions such as Dean or Head of Department exist independently of their occupants.
   - Appointments assign people to positions for effective date ranges.
   - Permissions are scoped by organisational unit, programme, course offering, case type and academic period.
   - Identity providers authenticate users; the SIS remains authoritative for SIS permissions.

3. **Programmes and curricula are versioned**

   - A programme is a stable identity, such as Bachelor of Computer Science.
   - A curriculum version defines requirements applicable from a particular intake or date.
   - Existing students remain attached to their admitted curriculum unless an approved curriculum-transfer process occurs.
   - Curriculum components can include coursework, research, practicum, clinical placement, internship, seminar, dissertation or thesis.
   - Programme ownership, teaching responsibility and delivery location are separate relationships.

4. **A student is not represented by one fixed “type”**

   A student can have multiple concurrent classifications:

   - Academic career: undergraduate, taught postgraduate or research postgraduate.
   - Programme attempt and curriculum version.
   - Full-time, part-time or another configured study load.
   - Campus, distance, blended or online delivery.
   - Government-sponsored, self-sponsored, scholarship or another funding category.
   - Domestic or international.
   - Active, interrupted, withdrawn, completed or another lifecycle status.

5. **Official records are state-controlled**

   - Applications, registrations, marks, results, progression decisions and awards use explicit state machines.
   - Published or approved records cannot be silently overwritten.
   - Corrections require authority, reason, evidence, version history and audit records.
   - Hard deletion is prohibited for official academic and financial transactions.

### Domain modules

| Domain module | Authoritative responsibility |
|---|---|
| Institution and Organisation | Institutional profile, campuses, organisational units, relationships, positions, committees and effective-dated appointments |
| Party, Identity and Access | People, contact details, accounts, institutional identifiers, role assignments, delegations, consent and authentication-provider links |
| Academic Policy and Calendar | Academic years, semesters/terms, teaching periods, deadlines, grading schemes, progression-policy versions and institutional code sets |
| Curriculum and Catalogue | Qualifications, programmes, curriculum versions, courses, credits, prerequisites, elective groups, research components and completion requirements |
| Admissions | Undergraduate and postgraduate applications, programme choices, documents, referees, evaluations, decisions, offers, acceptance and admission conditions |
| Student Registry | Student numbers, academic careers, programme attempts, curriculum assignment, student statuses, biographical record and status history |
| Academic Delivery | Course offerings, class sections, capacity, delivery mode, timetable references, lecturers, teaching teams and venues |
| Registration | Institutional registration, course registration, add/drop, withdrawal, exemptions, overrides, prerequisite checks and registration approvals |
| Student Finance | Fee rules, assessed charges, invoices, statements, sponsorships, scholarships, payments, allocations, refunds, balances and financial holds |
| Moodle Integration | Moodle identity/course mappings, provisioning requests, enrolment synchronisation, reconciliation, contextual launches and grade-import staging |
| Assessment and Examinations | Assessment schemes, assessment items, examination scheduling, candidate lists, marks, moderation, missing-mark resolution and board preparation |
| Results and Progression | Official course outcomes, GPA calculations, academic standing, progression decisions, exclusions, result amendments and academic appeals |
| Postgraduate Research | Supervisors, research proposals, ethics clearance, milestones, progress reviews, thesis/dissertation submission, examination, viva and corrections |
| Student Success and Support | Risk signals, alert reviews, intervention cases, action plans, referrals, follow-ups and intervention outcomes |
| Counselling, Wellbeing and Conduct | Restricted counselling/wellbeing cases, discipline cases, evidence, hearings, decisions and authorised disclosures |
| Graduation and Credentials | Completion evaluation, clearance, graduation applications, award approval, conferral, transcripts, certificates and alumni handoff |
| Documents and Communications | Document metadata, templates, generated letters, notifications, email/SMS requests and communication history |
| Workflow and Governance | Approval tasks, work queues, committee actions, escalation timers and workflow execution; business rules remain owned by the relevant domain |
| Reporting and Compliance | Governed read models, statutory reports, operational dashboards, data-quality reports and controlled exports |
| Integration and Data Exchange | External-system registrations, API clients, import batches, mappings, idempotency records, outbox delivery and reconciliation |

### Sensitive-domain separation

Student success, counselling, wellbeing and discipline may reuse a common case-management framework, but they must not share unrestricted visibility:

- Academic advisers can see intervention information relevant to academic support.
- Counsellors can see protected counselling details.
- Discipline officers can see conduct-case records.
- Ordinary lecturers cannot see counselling or discipline details.
- Early-alert models receive only the minimum authorised attributes.
- Reports use aggregated or pseudonymised data unless identifiable data is explicitly authorised.

### Critical authority boundaries

- The SIS is authoritative for programmes, registrations, official results, progression and awards.
- Moodle is authoritative for learning activities, submissions, participation and provisional gradebook details.
- Imported Moodle marks remain provisional until validated, moderated and officially published in the SIS.
- The student-finance module owns student balances; the external general ledger owns institutional accounting.
- Banks and payment gateways report transactions but cannot directly mark a student as financially cleared.
- AI can recommend, summarise and draft actions but cannot change authoritative records.

Do you approve **Design Section 1: Domain architecture and ownership**?

---

## Following user responses before the next design record

### User message 0056

yes i approve
