## Design Section 8 — Student success, counselling, wellbeing and discipline

> Controlling content recovered from the approved design chat; approval prompts are omitted in this reading copy.


UNZA’s public structure places counselling, student orientation and discipline within Student Affairs, while describing counselling interaction as professional, confidential and voluntary. The SIS will preserve these local responsibilities while keeping their records technically separated. [UNZA Counselling Centre](https://www.unza.zm/dosa/counselling-centre), [UNZA Student Affairs](https://unza.zm/dosa/about-unit)

### 1. Student-success objective

The purpose is to identify academic difficulty early and coordinate practical support.

The system must answer:

```text
What warning sign was detected?
Why was it detected?
Who reviewed it?
What support was agreed?
Who is responsible?
When is follow-up due?
Did the intervention help?
```

A risk score without an intervention process is not considered a complete feature.

### 2. Permitted signal sources

Student-success signals may originate from:

- Low or declining assessment performance.
- Failed or missed assessments.
- Repeated course attempts.
- Excessive carry courses.
- Prerequisite blockage.
- Attendance information.
- Moodle inactivity or reduced engagement.
- Registration delays.
- Financial-clearance difficulties.
- Repeated timetable or workload problems.
- Overdue postgraduate milestones.
- Student self-referral.
- Lecturer, adviser or supervisor referral.

A signal records:

- Stable signal code.
- Source system and record.
- Observation date.
- Rule or model version.
- Severity.
- Explanation.
- Supporting evidence references.
- Expiry or review date.

### 3. Prohibited signal use

The early-detection system must not:

- Diagnose a mental-health condition.
- treat a disciplinary allegation as proof of misconduct.
- use counselling notes as predictive features.
- expose health or counselling information to lecturers.
- use protected characteristics to impose adverse actions.
- automatically suspend, exclude or deregister a student.
- permanently label a student as “high risk.”
- send identifiable counselling data to an external AI provider.

Protected attributes may be used in a separately governed fairness audit, but not as ordinary prediction inputs.

### 4. Rules-based detection

Transparent rules remain the primary and fallback mechanism.

Example:

```text
IF two required assessments are missing
AND the course is still active
THEN create MISSING_ASSESSMENTS signal
WITH explanation and evidence
```

Each rule has:

- Owner.
- Purpose.
- Data inputs.
- Scope.
- Thresholds.
- Version.
- Effective dates.
- Severity.
- Recommended review route.
- Test cases.
- Approval.

Rules may vary by school, programme, course type or academic period.

### 5. Predictive-model governance

Any predictive model requires a model-registry record containing:

- Approved use case.
- Owner and responsible office.
- Training-data provenance.
- Permitted features.
- Excluded features.
- Validation results.
- False-positive and false-negative rates.
- Fairness evaluation.
- Explanation method.
- Alert threshold.
- Applicable student population.
- Deployment date.
- Review and expiry dates.
- Rollback plan.

```text
DRAFT
→ VALIDATION
→ GOVERNANCE_REVIEW
→ APPROVED
→ PILOT
→ ACTIVE
→ SUSPENDED
→ RETIRED
```

Before predictive profiling is enabled, the institution must complete a privacy and risk assessment. This aligns the system with Zambia’s personal-data protection framework and the NIST AI risk-management approach. [Zambia Data Protection Act](https://www.parliament.gov.zm/node/8853), [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)

### 6. Human-reviewed alert workflow

```text
DETECTED
→ TRIAGE
→ VALIDATED
→ STUDENT_CONTACT
→ CASE_OPENED
→ ACTION_PLAN
→ ACTIVE_SUPPORT
→ FOLLOW_UP
→ RESOLVED
→ CLOSED
```

Alternative outcomes:

```text
FALSE_POSITIVE
DUPLICATE
INSUFFICIENT_EVIDENCE
STUDENT_DECLINED_SUPPORT
REFERRED
MONITORING_ONLY
```

AI or a rule creates a signal, not a case. An authorised staff member must validate it before intervention.

### 7. Staff triage

The reviewer must:

- Confirm that the source data is current.
- Check whether the issue is already resolved.
- Consider missing or delayed data.
- Check for duplicate alerts.
- Read the explanation.
- Record whether the signal is valid.
- Select the appropriate support route.
- Record the review reason.

The reviewer cannot see counselling details merely because a student-success alert exists.

### 8. Intervention case

A case contains:

- Student.
- Validated signals.
- Assigned adviser or team.
- Student’s stated concern.
- Agreed objectives.
- Action plan.
- Due dates.
- Communications.
- Referrals.
- Follow-up reviews.
- Outcome.
- Closure reason.

Possible actions include:

- Academic-adviser meeting.
- Tutoring.
- Study-skills support.
- Course-load review.
- Registration correction.
- Prerequisite planning.
- Financial-counselling referral.
- Lecturer consultation.
- Supervisor meeting.
- Counselling referral.
- Accessibility-support referral.
- Research milestone recovery plan.

### 9. Student participation

Where appropriate, the student can:

- See the academic signal and plain-language explanation.
- Correct inaccurate source information.
- Request a review.
- Accept or decline non-mandatory support.
- View agreed actions and deadlines.
- Upload requested evidence.
- Provide progress feedback.

The student does not see confidential third-party reports or protected internal notes.

### 10. Intervention outcomes

A case may close as:

```text
GOALS_MET
PARTIALLY_RESOLVED
REFERRED_TO_ANOTHER_SERVICE
STUDENT_DECLINED
NO_CONTACT
NO_LONGER_APPLICABLE
PROGRAMME_STATUS_CHANGED
```

The system tracks whether interventions were completed and whether subsequent performance improved, but it must not claim that an intervention caused the improvement without valid analysis.

### 11. Work queues and escalation

Dashboards show:

- Unreviewed signals.
- High-priority cases.
- Students not yet contacted.
- Overdue actions.
- Referrals awaiting acceptance.
- Cases without follow-up.
- Adviser workload.
- Repeated unresolved signals.

Escalation goes to the responsible role assignment, not a hard-coded person.

---

## Counselling and wellbeing

### 12. Counselling access routes

Students may access counselling through:

- Self-referral.
- Appointment request.
- Walk-in registration.
- Academic-adviser referral with student agreement.
- Student-success referral.
- Crisis referral under an approved safety procedure.

The SIS supports the workflow but does not replace professional counselling practice.

### 13. Counselling workflow

```text
REFERRAL_OR_REQUEST
→ INTAKE
→ APPOINTMENT_SCHEDULED
→ ACTIVE_SUPPORT
→ REVIEW
→ CLOSED
```

Alternative states:

```text
WAITLISTED
REFERRED_EXTERNALLY
STUDENT_DECLINED
NO_SHOW
TRANSFERRED
URGENT_RESPONSE
```

### 14. Confidential record separation

Counselling data is stored in a protected record space containing:

- Referral source.
- Consent.
- Appointment information.
- Assigned counsellor.
- Restricted case notes.
- Safety plan where authorised.
- Professional referrals.
- Closure summary.
- Disclosure history.

Ordinary academic users may see at most:

```text
Referral offered
Referral accepted
Referral completed
```

They cannot see the reason, notes, diagnosis or session content.

### 15. Neutral communications

Appointment reminders must use neutral wording, such as:

> You have an appointment with Student Support.

SMS and email must not expose sensitive details on a shared device.

### 16. Counselling AI restrictions

AI may assist with:

- Appointment scheduling.
- Resource discovery.
- Administrative reminders.
- De-identified service-demand reporting.

AI may not:

- Diagnose.
- provide autonomous crisis decisions.
- generate clinical notes without an approved professional process.
- disclose case content.
- decide that a student is safe.
- replace a counsellor.

### 17. Urgent safety situations

The SIS is not an emergency-response service.

An urgent case provides:

- Institution-approved emergency contacts.
- Immediate routing to authorised personnel.
- Timestamped acknowledgement.
- Escalation if not accepted.
- Minimum necessary information.
- Post-incident review.

No chatbot message may be presented as emergency care.

---

## Student discipline

### 18. Discipline case workflow

```text
REPORT_RECEIVED
→ TRIAGE
→ JURISDICTION_CONFIRMED
→ NOTICE_ISSUED
→ INVESTIGATION
→ HEARING
→ DECISION
→ SANCTION_IMPLEMENTATION
→ APPEAL_PERIOD
→ CLOSED
```

Alternative outcomes:

```text
NO_CASE_TO_ANSWER
REFERRED_TO_ANOTHER_AUTHORITY
INFORMAL_RESOLUTION
WITHDRAWN
DISMISSED
APPEALED
```

### 19. Procedural safeguards

The discipline module records:

- Allegation.
- Applicable rule version.
- Reporter.
- Evidence.
- Notice to the student.
- Student response.
- Investigator.
- Hearing membership.
- Conflicts of interest.
- Findings.
- Reasons.
- Sanction.
- Appeal rights and deadline.

A report or allegation is not treated as a proven offence.

### 20. Sanctions and system effects

An approved decision may issue explicit commands such as:

```text
Create registration hold
Withhold specified result
Suspend Moodle access
Restrict campus service
Record academic-misconduct outcome
End or suspend programme attempt
```

Every effect must reference the authorised decision and effective dates. Discipline staff do not directly edit registration, results or Moodle tables.

### 21. Discipline appeals

```text
APPEAL_SUBMITTED
→ ADMISSIBILITY_REVIEW
→ PANEL_REVIEW
→ DECISION
→ IMPLEMENTATION
→ CLOSED
```

Possible outcomes include:

```text
UPHELD
VARIED
OVERTURNED
RETURNED_FOR_REHEARING
```

Original and appeal decisions remain preserved.

### 22. Separation between support and discipline

- Seeking counselling must not be treated as evidence in a discipline case.
- Counselling notes cannot be requested through ordinary discipline permissions.
- A counsellor is not automatically a discipline investigator.
- Student-success cases do not expose allegations.
- Discipline sanctions expose only the minimum operational restriction required by another domain.
- Combined reporting uses anonymised or aggregated information.

### 23. Audit and access review

Sensitive access records include:

- Who opened the case.
- Which sections they viewed.
- Reason for access.
- Export or print activity.
- Disclosure to another office.
- Break-glass access.
- Access revocation.
- Periodic role review.

Managers receive service-level and aggregated reports, not unrestricted case notes.
