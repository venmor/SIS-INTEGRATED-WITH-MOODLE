<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: d64a2aac-04f0-5aed-aa6c-8df3d2faf11c; chronological message: 286. -->

# Section 21 — Presentation MVP and demonstration institution

## 21.1 Presentation release objective

The first presentation-ready release will prove that the architecture works through complete, connected journeys. It will not pretend that every designed university module is fully implemented.

Target release:

> `v1.0.0-presentation`

## 21.2 Implemented MVP modules

| Module | Presentation capability |
|---|---|
| Identity and Access | Login, session management, role/workspace switching and scoped authorization |
| Admissions | Application draft, document upload, submission, evidence review and offer decision |
| Student Records | Convert accepted applicant into a student record |
| Registration | Select eligible courses and confirm registration |
| Finance | Generate charges, simulate payment callback and calculate financial clearance |
| Learning Integration | Simulate Moodle enrolment, failure, retry and reconciliation |
| Assessment | Stage marks, validate them and release an official result through controlled approval |
| Notifications | Create in-system notifications and simulated delivery records |
| Audit and Operations | Display important actions, integration failures and recovery evidence |

## 21.3 Designed but initially limited modules

These remain documented and scaffolded but will receive smaller presentation implementations after the core journey works:

- Adviser and student-support workflows
- Counselling and disability-support records
- Quality assurance reviews and findings
- Regulatory reporting
- Graduation and certification
- Sponsorships, refunds and complex finance arrangements
- Full Moodle connectivity
- Real payment, SMS, email or verification providers
- Production-grade high-availability infrastructure

They are deferred, not removed from the architecture.

## 21.4 Fictional demonstration institution

Use:

> **Kafue Ridge University — Demonstration Institution**

This name and all related records are fictional.

Initial branding:

| Token | Demonstration value |
|---|---|
| Primary colour | Deep institutional blue |
| Accent | Muted gold |
| Page background | Light neutral grey |
| Main surface | White |
| Text | Dark charcoal |
| Success | Restrained green |
| Warning | Amber |
| Error | Deep red |

Branding remains configuration, not hard-coded throughout components.

## 21.5 Academic configuration

```text
Academic year: 2026
Period structure: Semester 1 and Semester 2
Primary currency: ZMW
Default time zone: Africa/Lusaka
Teaching model: Programme → course offering → class/Tutorial Group
Assessment model: Continuous assessment + final examination
```

Initial faculties and programmes:

- School of Computing — Bachelor of Science in Software Engineering
- School of Health Sciences — Bachelor of Science in Radiography
- School of Business — Bachelor of Business Administration

The first complete journey will use the Software Engineering programme. The other programmes demonstrate that policies and records are configurable.

## 21.6 Demonstration academic policy

The initial policy is fictional and versioned as `DEMO-ACADEMIC-2026-v1`.

Example values:

- Continuous assessment: 40%
- Final examination: 60%
- Overall pass mark: 50%
- Course prerequisites are enforced from configuration.
- Duplicate registration for the same course offering is prohibited.
- Released results cannot be overwritten.
- Result amendments require a new version, reason and approval.
- Financial clearance is calculated from configured rules—not manually switched on.

These values demonstrate the policy engine; they do not claim to be the rules of a real university.

## 21.7 Demonstration users

All identities use fictional names and reserved test addresses such as `@example.test`.

| Persona | Purpose |
|---|---|
| Applicant | Creates and submits an application |
| Admissions Officer | Reviews evidence and records a recommendation |
| Admissions Approver | Approves an offer |
| Student | Registers and views official status |
| Lecturer | Views an assigned course and stages marks |
| Examinations Officer | Validates a result package |
| Result Approver | Authorizes official release |
| Finance Officer | Reviews charge/payment reconciliation |
| Integration Support | Recovers failed Moodle enrolment |
| System Administrator | Manages technical accounts without editing academic results |
| Unauthorized user | Demonstrates denial and non-disclosure |

Passwords will not be embedded in source files. A safe development seed/reset process will create the accounts.

## 21.8 Presentation stories

### Story 1 — Applicant to registered student

1. Applicant saves an application draft.
2. Applicant uploads an approved test document.
3. Applicant reviews and submits.
4. Admissions checks evidence and approves an offer.
5. The applicant accepts the offer.
6. The system creates the student record.
7. The student selects eligible courses.
8. Finance simulation confirms payment.
9. Registration is confirmed.

### Story 2 — Moodle failure and recovery

1. Confirmed registration creates an enrolment event.
2. The Moodle simulator temporarily fails.
3. Registration remains valid in the SIS.
4. The event enters retry/reconciliation state.
5. Integration Support replays it safely.
6. Duplicate delivery does not create duplicate enrolment.
7. Audit evidence confirms recovery.

### Story 3 — Controlled result release

1. Lecturer stages marks for an assigned course.
2. Invalid marks are rejected.
3. Examinations validates the result package.
4. An authorized approver releases the result.
5. The student sees the official result.
6. A system administrator is denied permission to alter it.
7. Any amendment creates a new audited version.

## 21.9 Failure demonstrations

The presentation will deliberately show:

- Invalid login throttling
- Unauthorized record access denial
- Duplicate application submission prevention
- Invalid or oversized file rejection
- Failed payment callback reconciliation
- Moodle retry and idempotency
- Invalid mark rejection
- Denied direct result modification
- Safe user-facing errors with detailed internal audit evidence

## 21.10 Demonstration dataset size

Keep the initial data small and understandable:

- 20 applicants
- 12 converted students
- 10 staff users
- 3 programmes
- 12 courses
- 2 academic periods
- Several successful and failed integration events
- Several result packages in different states

This is large enough to demonstrate queues, searching and permissions without making the project difficult to explain.

## 21.11 Reset mechanism

The repository will provide a controlled development command such as:

```bash
npm run demo:reset
```

It will:

1. Confirm that the environment is development/demo.
2. Reset only the configured demonstration database.
3. Apply migrations.
4. Load fictional configuration and records.
5. Create predictable demonstration scenarios.
6. Report successful completion.

It must refuse to run against an environment marked as production.

## 21.12 Presentation ownership

Charles and Chitindu will both present technical and functional aspects.

A recommended split:

- Charles: problem, architecture, applicant-to-registration journey and Git workflow.
- Chitindu: security, Moodle recovery, result governance and testing.
- Both: code explanation, database relationships, CI evidence and questions.

The split can rotate during practice so both developers understand the full system.

## 21.13 MVP acceptance gate

The presentation release is accepted only when:

- All three stories work from the browser.
- Role and scope denials are demonstrated.
- The demo resets reliably.
- No real personal data or credentials exist.
- CI passes from a clean checkout.
- Arch Linux and Windows/WSL setup are verified.
- Failure and recovery evidence is visible.
- Every implemented feature links to requirements, code and tests.
- Both developers can explain each journey at business, architecture and code level.

Please approve **Section 21**. After approval, we can begin assembling the design-controlled base repository and its documentation structure.

---

## Following user responses before the next design record

### User message 0287

Okay approved,then we also need to take into account of the progression from mvp to expansion of modules and system towards completion
