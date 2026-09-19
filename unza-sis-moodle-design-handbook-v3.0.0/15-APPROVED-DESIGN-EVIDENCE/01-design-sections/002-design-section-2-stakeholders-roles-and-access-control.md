<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 2e3c0a58-afa6-527e-8dd0-d1508cbb7f92; chronological message: 57. -->

## Design Section 2 — Stakeholders, roles and access control

### Stakeholder catalogue

| Stakeholder group | Principal responsibilities |
|---|---|
| Prospects and applicants | Create accounts, submit applications, upload evidence, provide referees, track decisions, accept offers and satisfy admission conditions |
| Students | Complete onboarding, maintain permitted personal details, register, view finances, access Moodle, view published results, request documents, submit appeals and apply for graduation |
| Postgraduate candidates | Perform student functions plus manage proposals, ethics applications, supervision records, milestones, thesis submissions and corrections |
| Alumni | Verify awards, request transcripts and manage permitted contact information |
| Lecturers and instructors | Access assigned offerings, class lists, provisional assessments, attendance, marks and academic interventions |
| Supervisors | Manage assigned research candidates, progress reviews, milestone recommendations and thesis readiness |
| Markers, moderators and external examiners | Perform explicitly assigned assessment, moderation or examination duties |
| Academic advisers and student-success staff | Review authorised risk alerts, coordinate interventions and monitor outcomes |
| Counsellors and wellbeing officers | Manage protected support cases and authorised referrals |
| Discipline and appeals officers | Manage conduct cases, hearings, decisions and appeal workflows |
| Programme coordinators and Heads of Department | Manage programme delivery, approve offerings, teaching assignments, overrides and departmental academic decisions |
| Deans and school boards | Review school-level admissions, results, progression and programme decisions |
| Senate and authorised committees | Approve academic policies, final results, progression exceptions, programmes and awards |
| Admissions officers | Validate applications, documents, evaluations, decisions, offers and admission conditions |
| Registry and academic-office staff | Maintain student records, registrations, results, status changes, transcripts and graduation processes |
| Examination officers | Schedule examinations, assign venues, generate candidate lists, manage missing marks and prepare board documentation |
| Finance officers | Configure fee rules, assess charges, post verified payments, manage sponsorships, refunds and financial holds |
| Executive management | Access authorised institutional dashboards and approved aggregated reports |
| ICT administrators | Configure infrastructure, integrations and operational settings without receiving unrestricted academic authority |
| Security and identity administrators | Manage accounts, identity-provider connections, service accounts and security policies |
| Data-protection officers and auditors | Review processing records, access logs, consent, incidents and compliance evidence |
| Regulators and government agencies | Receive specifically authorised statutory reports |
| Sponsors and scholarship providers | Receive limited sponsored-student financial or progress information under an established legal basis |
| Parents or guardians | Receive only information for which the student has granted valid, revocable consent or where another legal basis applies |
| External systems | Moodle, identity provider, banks, payment gateways, general ledger, email/SMS services and approved reporting systems |

### Authorisation model

The system will combine:

- **RBAC:** roles provide reusable permission bundles.
- **ABAC:** decisions consider attributes such as record state, sensitivity, academic period and programme.
- **Relationship-based access:** access can depend on being the assigned lecturer, adviser, supervisor, examiner or case officer.
- **Scoped assignments:** every role assignment applies to a defined institutional or record scope.
- **Effective dates:** assignments automatically begin and expire on approved dates.

An authorisation decision evaluates:

```text
Principal + Capability + Resource + Scope + Relationship + Record State + Time
```

Access is granted only when every required condition is satisfied. The default outcome is denial.

### Role-assignment examples

```text
Dean @ School of Engineering @ 2026-01-01..2028-12-31
Lecturer @ CourseOffering(CSC4792, Semester-1-2026)
Supervisor @ ResearchCandidate(STU-2026-0042)
FinanceOfficer @ MainCampus
ExternalExaminer @ ThesisExamination(EXAM-0192) @ 2026-07-01..2026-09-30
Counsellor @ CounsellingService
```

A person may hold several assignments simultaneously. The interface must show the currently active context so the user understands under which authority an action is being performed.

### Capability design

Permissions will use stable, namespaced identifiers rather than ambiguous labels:

```text
admissions.application.review
admissions.offer.approve
curriculum.version.publish
registration.override.request
registration.override.approve
finance.payment.verify
assessment.mark.submit
assessment.moderation.complete
results.board.recommend
results.publish
progression.decision.approve
research.milestone.review
student_success.case.manage
counselling.case.read_sensitive
discipline.decision.approve
graduation.award.confer
audit.log.read
```

Every protected API operation, background command and interface action must reference one or more documented capabilities.

### Mandatory segregation of duties

- A user cannot approve their own request or override.
- Application assessment and final admission approval are separate capabilities.
- Mark entry, moderation, board recommendation and official result publication are separate actions.
- The person who captures a financial refund cannot be its sole approver.
- Award eligibility calculation and award conferral are separate actions.
- Security administration does not automatically grant access to counselling, discipline, marks or financial records.
- Developers and database operators do not receive routine business-user permissions.
- Temporary delegation must specify the delegator, delegate, reason, scope and expiry date.

### Identity lifecycle

1. A prospect creates and verifies an applicant account.
2. Duplicate-person checks occur before creating a new person record.
3. An accepted applicant is linked to a student record rather than recreated.
4. Matriculation generates the institutional student identifier.
5. Institutional identity provisioning is requested through an integration event.
6. Staff identities may originate from an identity provider or approved administrative provisioning.
7. Graduation changes access to the alumni profile without deleting the person or student history.
8. Suspended or departed users lose active capabilities while their historical actions remain attributable.

### Exceptional access

Emergency access is permitted only through a controlled break-glass process:

- Explicit justification.
- Short expiry.
- Strong authentication.
- Immediate audit event.
- Notification to the responsible security or data-protection officer.
- Post-access review.
- No break-glass access to protected counselling notes unless separately authorised.

### Audit requirements

Every material action records:

- Actor and active role assignment.
- Resource and institutional scope.
- Action and business reason.
- Date, time and originating channel.
- Before-and-after values where appropriate.
- Approval chain.
- Request and correlation identifiers.
- Integration or service-account identity.
- Whether AI assisted in producing a recommendation or draft.

Do you approve **Design Section 2: Stakeholders, roles and access control**?

---

## Following user responses before the next design record

### User message 0058

i approve design section 2
