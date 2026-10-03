# Course assessment and official result publication policy — proposed UNZA profile

**Status:** policy proposal prepared 2026-10-01 for Academic Affairs, Examinations, Registry, Quality Assurance and Senate governance review. It is **not adopted UNZA policy** and does not grant release authority. Use as a decision-ready proposal, not as a production configuration. Implementation gap: [GAP-022](../gaps/GAP-022-assessment-authority-scheme-chain.md) and [Phase 7 continuation](../gaps/GAP-PH7-CONTINUATION.md).

**UNZA public-source basis:** [Academic Affairs](https://www.unza.zm/academics/academic-affairs), [Academic Appeals Guidelines](https://www.unza.zm/sites/default/files/2026-01/Academic%20Appeals%20Guidelines.pdf), [2025 Sessional Dates](https://www.unza.zm/sites/default/files/2025-05/Sessional-Dates-2025.pdf), [2025/26 Sessional Dates](https://www.unza.zm/sites/default/files/2026-04/2025-2026%20Sessional%20Dates.pdf), and [Postgraduate Regulations and Guidelines](https://www.unza.zm/sites/default/files/article_files/2026-02/Postgraduate%20Regulations%20%26%20Guidelines.pdf). These sources inform governance and the review-calendar defaults below; they do not establish that this proposal has been approved. Programme regulations and current institutional decisions take precedence.

## Purpose and governing principles

This policy governs the capture, approval, publication, access, review and correction of course assessment outcomes in the SIS. It applies to each approved course offering and academic period, including regular and distance/IDE offerings. Postgraduate, professional, clinical and other programmes retain any approved programme-specific regulations; where requirements differ, the stricter approved control applies until the policy owner resolves the conflict.

The SIS is the authoritative record for approved and published results. Moodle is an assessment source and may supply marks once through a validated, traceable staging process. Importing, calculating, moderating or approving a mark in Moodle does not publish an official SIS result. A result becomes official only through the recorded institutional approval and controlled SIS publication steps below.

The proposed defaults are: no student access to provisional marks; full numeric mark and approved outcome shown after publication where lawful and supported by the programme rules; distinct coded non-numeric states; no financial or teaching-evaluation block unless a separately approved rule explicitly authorizes it; and corrections only through a new linked version. These defaults must be adopted or changed by the authorized UNZA authority before production use.

## Governance and authority

UNZA’s public Academic Affairs description identifies that office as custodian of Senate-approved academic policies and student records, with Admissions and Examinations and Senate functions handling examination and results work. The public Academic Appeals Guidelines describe examination-board recommendations to Senate. Current postgraduate regulations contain a distinct School Board of Graduate Studies route. Accordingly, the SIS must configure separate approval routes by programme/stream where required; it must not assume one board or workflow covers every student.

Before activation, Academic Affairs must provide or approve a delegation schedule that identifies, for each stream and result type: the recommending body, approving body, quorum and valid meeting/electronic decision evidence, any Senate or School Board ratification required, the final record custodian, and the role permitted to execute publication after approval. The publication operator executes an approved decision and cannot substitute for it. The operator must not have prepared, marked, moderated or decided the package. Role titles alone confer no authority: each assignment is named, scoped to a period and offering/programme as approved, time-limited, auditable and revocable.

System administrators, Moodle administrators, lecturers, tutors, moderators and package preparers cannot publish results unless independently appointed to a distinct approved release assignment and separation-of-duties checks pass. A user may not approve their own appointment or their own release package. Institutional IAM must verify a fresh, single-use step-up proof bound to the authenticated session, purpose, exact action, target package/version and command digest; the proof must be consumed in the publication transaction. If IAM cannot provide this, publication is denied.

## Assessment scheme and result calculation

Every offering receives an immutable assessment scheme before student registration or assessment begins. The version records: course and period identity; applicability by programme, cohort, mode and campus; component identifiers, maxima and weights; required components and minima; valid non-numeric states; calculation precision and rounding; grade scale and boundaries; moderation and approval route; deferred, supplementary, repeat and progression references; effective dates; approval evidence; and change/supersession history.

No single institution-wide mark threshold, grade boundary, CA/examination ratio, rounding mode or supplementary rule is assumed here. The responsible academic authority must approve these in the relevant regulations or an authoritative versioned schedule. Until configured, the SIS may validate and preserve imported source marks but must not produce an official total, grade, GPA or progression decision. Moodle values outside the approved component range, duplicate or unresolved identities, absent registrations, missing mandatory marks, unmapped activities or changed source values block acceptance until resolved and audited.

`0` means the student was assessed and awarded zero. `ABSENT`, `ABSENT_WITH_PERMISSION`, `DEFERRED`, `MISSING_MARK`, `INCOMPLETE`, `EXEMPT`, `CARRIED_FORWARD`, `WITHHELD`, `MISCONDUCT_PENDING` and `CANCELLED` are distinct states and never silently converted to zero. Each exceptional state requires its approved reason code, responsible office, authorized evidence reference and next action where disclosure is safe. Misconduct and other protected case details are stored outside student-facing result data.

Changes to an assessment scheme after registration begins require the applicable academic approval, a recorded reason and impact analysis, version preservation, and notice to affected students before the change takes effect. A configuration edit cannot retrospectively alter results already approved or published.

## Moodle intake and reconciliation

Each transfer identifies the Moodle instance, course and activity IDs, SIS offering/component/period, learner and registration mapping, original mark/status, scale conversion, source timestamp, import batch, reviewer and accepted SIS value. SIS validates the complete candidate set against Registry’s authoritative registration list. Moodle enrolment alone never proves registration or examination eligibility.

The import is idempotent and versioned. Replays with the same key and payload return the original receipt; changed payloads conflict and require reconciliation. Imports never overwrite submitted, moderated, board-approved or published values. SIS stores source provenance and the accepted value separately. Connectivity failures, partial batches and changed/deleted Moodle activities enter a reconciliation queue; they do not produce silent partial official results. Manual SIS correction follows the controlled return/amendment path and retains the original source value.

## Approval and publication workflow

The controlled flow is:

```text
Moodle source → SIS staging → identity/registration validation → academic review
→ moderation → frozen complete decision package → authorized board decision
→ independent release review → atomic SIS publication → student notification
```

The frozen package contains the candidate set, all numeric and non-numeric outcomes, calculation trace, source and scheme versions, validations, moderation evidence, authorized decisions/conditions, approver identities, package digest and period/offering references. Conditional or unresolved decisions block publication until an authorized officer records satisfaction evidence against each condition. No operator may infer that a condition is met.

One publication command releases the entire approved offering/period batch, not selected students, except where an approved institutional procedure explicitly defines a safe split-release rule. Before publication, SIS rechecks package digest/version, approval status, scope, step-up proof, scheme version, registrations, unresolved exceptions, release window and authorized holds. A single database transaction writes the immutable official batch and result versions, audit event, idempotency receipt and notification outbox. Repeated identical commands return the original receipt; a changed command conflicts. Notification delivery failure cannot roll back the official result and remains visible for retry/reconciliation.

The default release schedule is the current, formally issued annual/term sessional calendar for the specific stream and period, with an exact Africa/Lusaka date/time and any embargo recorded in the release policy. SIS must not calculate a generic `publication date + 14 days` appeal deadline: UNZA’s published appeals guidance describes 14 days as general while sessional calendars set actual deadlines by year. If a current calendar or approved release window is missing or contradictory, publication is blocked pending Academic Affairs clarification.

## Holds, eligibility and exceptions

Only an approved rule may create a result or examination-entry hold. Every hold has a type, policy citation/version, affected scope, owner, evidence, start time, review/expiry condition, student-safe reason, appeal/contact route and authorized override path. A hold is not a mark and does not change the result calculation. SIS blocks release only for an unresolved hold expressly defined to block result publication; it does not infer a hold from a debt, conduct flag, support case, evaluation status or free-text note.

Financial status must not block examination entry or result publication by default. Any proposed financial restriction needs explicit review against applicable UNZA rules and law, approval by the competent academic/finance governance bodies, a published student notice, safeguards for disputed balances and hardship/accessibility cases, and an appeal and emergency override path. Teaching-evaluation completion must not block an examination slip or result by default. If UNZA intends such a gate, it must approve its purpose and privacy safeguards, make the survey anonymous to teaching staff, separate response content from completion proof, define accessible alternatives and outage exceptions, and prohibit use of responses in grading or retaliation.

An exception is approved only by the named authority, with scope, reason, evidence, expiry and independent review captured in the audit record. Break-glass access is time-limited, alerts the data owner and is reviewed; it cannot waive the academic approval or separation-of-duties requirements.

## Student access, notice and review

After publication, an authenticated student may view only their own official outcomes for the correct period. The default display includes course code/title, period, approved numeric final mark and grade/outcome where applicable, publication date, version status, and the applicable review route and deadline. The display never includes another learner, marker notes, internal deliberations, protected evidence, misconduct details, or unpublished/provisional values. No public roster or bulk student-result export is provided.

If a result is withheld or unresolved, the student sees a neutral status and the responsible office/contact route only where disclosure is authorized; internal grounds and protected records are not exposed. Deferred, supplementary, repeat, exempt and carried-forward outcomes use institution-approved wording and link to next steps. Accessibility, mobile use and assistive technology must be supported. A notification contains minimal information and directs the student to authenticated SIS; email/SMS alone is not the result record. Every result read and staff access to restricted result records is auditable.

The review route distinguishes (a) a grade check for arithmetic/transcription/component inclusion from (b) a formal academic appeal. UNZA’s published guidelines describe appeal grounds and Quality Assurance/Dean/department/panel roles; the current approved form, channel, evidence rules, exact deadline, fee if any, response stages and escalation are configured per current policy/calendar. SIS must show the applicable deadline and accept/receipt status without deciding the merits. It must not promise a universal 14-day window or replace the approved institutional process. A review request never silently alters a result; only a separately approved amendment can do so.

## Correction and downstream impact

Any correction to an approved or published result uses a new package and a new official version. The request records the source of error, evidence, affected students, old/new values, calculation and policy snapshots, impact analysis, independent moderation/approval, approving authority, decision reference, release operator and student notice. The person who requested or prepared the change cannot approve or publish it. The old version remains immutable and visible to authorized auditors; the student history presents the current version and a clear correction notice without exposing restricted internal details.

Publication or amendment creates durable assessment-owned impact tasks for Registry, progression, finance, awards/credentials or other affected domains. Those domains independently apply their own approved rules and acknowledge with decision references. The assessment service cannot edit their records or claim a recalculation occurred merely because a task was sent. Notification failures and downstream outages are retried and reconciled; official history is preserved throughout.

## Privacy, audit, retention and incident handling

Results and linked identity are confidential student records. Apply least-privilege access, purpose limitation, encryption, access auditing, secure backups, tested restoration and the approved institutional retention schedule. Audit records identify actor, authority assignment, action, target/version/digest, time, decision reference and outcome without copying unnecessary sensitive evidence into general logs. Result exports require a separate approved purpose, capability, recipient, format, scope, expiry and audit trail; no hidden administrative export is permitted.

Suspected unauthorized disclosure, tampering, wrong-recipient notice, lost device or integrity failure is reported through the institutional security/privacy incident process. Preserve evidence, contain access, assess affected records, notify the Data Protection Officer and other responsible authorities as required by current law and institutional procedure, and record corrective actions. Retention, deletion, legal hold and data-subject requests are governed by approved records and privacy schedules; this proposal does not invent a retention period.

## Versioning, review and adoption

Each approved policy version has an identifier, approving authority and meeting reference, approval date, effective start/end, covered streams, superseded version, owner, review date, source documents, change rationale and technical configuration digest. Annual calendar values are separate signed/versioned data linked to the applicable policy. SIS refuses publication if policy is absent, expired, conflicting, outside scope or not linked to the frozen package.

Before adoption, Academic Affairs coordinates review with Admissions and Examinations, Registry/Senate records, Quality Assurance, graduate governance, programme/school boards, Finance for any proposed financial restriction, the Data Protection Officer, ICT/IAM and student representatives. Legal and records-management review confirms current statutory obligations and retention. The authorized Senate/University body then approves the policy and delegates implementation. The institution records the decision in its official policy register. This document itself is not that approval.

| Adoption item | Recommended decision | Evidence required to activate |
|---|---|---|
| Policy owner | Academic Affairs, with Admissions and Examinations operational stewardship and Senate records custody | Written delegation and accountable policy owner |
| Student result visibility | Numeric mark and approved outcome after official publication; no provisional display | Senate-approved rules by programme/stream and approved student wording |
| Calculation/grade rules | Per approved course/programme scheme; no universal threshold assumed | Current signed regulations and versioned scheme per offering |
| Release authority | Independent period-scoped examinations release officer executes authorized board decision | Approved delegation, appointments, board decision and release evidence |
| Release timing | Current annual calendar exact time in Africa/Lusaka | Approved calendar and release schedule per stream |
| Appeal timing | Current annual calendar/form value; do not hardcode 14 days | Current guideline, form, published deadline and channel |
| Holds | Only enumerated, cited, owned and reviewable policy holds; no inferred debt/SET block | Approved hold rules, notices, appeal and override procedures |
| Amendments | New linked immutable version; independent approval; affected-student notice and impact tasks | Approved correction authority, forms/evidence and downstream owners |
| Moodle boundary | Moodle is a source; SIS official record; one validated import with provenance | Approved integration agreement, instance/API credentials, field mapping and reconciliation owner |
| Privacy/retention | Confidential by default, least privilege and auditable access; retention per records schedule | DPO review, data inventory, retention schedule and incident contacts |

## Isolated fictional demonstration policy

`RESULT-PUBLICATION-DEMO-v1` is an executable **fictional** profile for synthetic course codes beginning `RESULT-DEMO-` in period `DEMO-2026S1`. It is off unless `DEMO_MODE=true`, `SIS_ENABLE_RESULT_DEMO_POLICY=true`, the database hostname is loopback, and its name contains `test`, `review` or `ci`. It never selects an institutional course or a remote database. The course code must exactly match the assessment offering reference and the period must exist. The fictional release instant is 2026-01-01 00:00 Africa/Lusaka; the student may see their published numeric mark and outcome, with the instruction “For this fictional result, contact the demo examinations office to request a review.” Fictional fixtures contain no holds or incidents; any unresolved or exceptional candidate result remains blocked by the publication service. No actual appeal deadline, faculty appointment, Senate quorum or production restriction is claimed.

This profile provides policy test data only. A real browser release still requires the separately bound and transactionally consumed MFA proof, an explicitly granted demo examinations publisher, and a complete synthetic Moodle-to-board result fixture. Never set these flags on an institutional database or treat a passing demo as policy signoff.
