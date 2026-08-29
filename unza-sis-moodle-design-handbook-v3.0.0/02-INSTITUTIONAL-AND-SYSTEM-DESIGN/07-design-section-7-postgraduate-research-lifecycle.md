## Design Section 7 — Postgraduate research lifecycle

> Controlling content recovered from the approved design chat; approval prompts are omitted in this reading copy.


UNZA publishes postgraduate progress forms intended to follow each stage of a student’s progress, including research registration, supervisor review and thesis submission. Its research-ethics structure also distinguishes Humanities and Social Sciences, Natural and Applied Sciences, and Biomedical ethics committees. [UNZA postgraduate forms](https://graduate.unza.zm/graduate/forms), [UNZA research ethics](https://www.unza.zm/r-and-i/research-ethics)

The SIS will model these as configurable digital workflows rather than reproducing paper forms.

### 1. Coursework and research pathways

| Programme pattern | Supported lifecycle |
|---|---|
| Taught postgraduate diploma | Coursework, assessment, results and completion |
| Taught master’s | Coursework followed by dissertation or research project |
| Mixed master’s | Coursework and research running partly in parallel |
| Master’s by research | Proposal, ethics where required, research, dissertation and examination |
| Doctorate | Proposal, optional prescribed coursework, ethics, milestones, thesis and examination |

The curriculum determines when the research candidature begins and which coursework must be completed first.

### 2. Research candidature

A `ResearchCandidature` is linked to the student’s programme attempt.

```text
PRE_RESEARCH_REQUIREMENTS
→ PROVISIONAL_CANDIDATURE
→ PROPOSAL_DEVELOPMENT
→ PROPOSAL_APPROVAL
→ ETHICS_AND_PERMISSIONS
→ ACTIVE_RESEARCH
→ SUBMISSION_PREPARATION
→ THESIS_SUBMITTED
→ UNDER_EXAMINATION
→ CORRECTIONS
→ EXAMINATION_COMPLETE
→ COMPLETION_APPROVED
```

Exceptional states include:

```text
INTERRUPTED
EXTENSION_APPROVED
SUSPENDED
WITHDRAWN
TERMINATED
RESEARCH_CHANGE_PENDING
```

Not every programme uses every stage. The applicable route comes from the approved curriculum and research-policy versions.

### 3. Supervision team

A supervision team may contain:

- Principal supervisor.
- Co-supervisor.
- Specialist adviser.
- Industrial or clinical supervisor.
- Research mentor.

A supervisor assignment records:

- Person.
- Role.
- Department and institution.
- Expertise areas.
- Internal or external status.
- Effective dates.
- Workload allocation.
- Conflict-of-interest declaration.
- Acceptance.
- Approval route.

```text
PROPOSED
→ INVITED
→ ACCEPTED
→ APPROVED
→ ACTIVE
→ ENDED
```

Alternative states include:

```text
DECLINED
REPLACEMENT_REQUIRED
SUSPENDED
WITHDRAWN
```

### 4. Supervisor capacity

The system validates:

- Maximum active candidates.
- Programme level the supervisor may supervise.
- Required qualifications or experience.
- Subject-area alignment.
- Existing workload.
- Conflicts of interest.
- Institutional affiliation.

A capacity warning can trigger review but cannot automatically assign or reject a supervisor.

### 5. Supervisor changes

A supervisor-change request records:

- Requesting party.
- Reason.
- Student comments.
- Current supervisor comments where appropriate.
- Proposed replacement.
- Research continuity assessment.
- Intellectual-property or data-access implications.
- Approval.

Historical supervision remains visible after the change.

### 6. Research proposal

Each proposal version contains:

- Title.
- Research problem.
- Aim and objectives.
- Questions or hypotheses.
- Literature foundation.
- Methodology.
- Study population or data sources.
- Data-management plan.
- Ethical considerations.
- Work plan.
- Budget where applicable.
- References.
- Supporting instruments.

Proposal workflow:

```text
DRAFT
→ SUPERVISOR_REVIEW
→ DEPARTMENTAL_REVIEW
→ SCHOOL_POSTGRADUATE_REVIEW
→ GRADUATE_AUTHORITY_APPROVAL
→ APPROVED
```

Possible outcomes:

```text
CHANGES_REQUIRED
REJECTED
WITHDRAWN
SUPERSEDED
```

The exact approval levels are configurable.

### 7. Proposal amendments

An approved proposal is not edited in place.

Material changes—such as title, objectives, methodology, population, data sources or supervisor—create an amendment:

```text
DRAFT_AMENDMENT
→ IMPACT_REVIEW
→ SUPERVISOR_APPROVAL
→ ACADEMIC_APPROVAL
→ ETHICS_REVIEW_IF_REQUIRED
→ EFFECTIVE
```

The original proposal remains part of the research record.

### 8. Ethics determination

Every research project receives an ethics determination:

```text
NOT_ASSESSED
→ ETHICS_NOT_REQUIRED
```

or:

```text
NOT_ASSESSED
→ ETHICS_REQUIRED
→ APPLICATION_PREPARATION
→ SUBMITTED
→ UNDER_REVIEW
→ APPROVED
```

Other outcomes include:

```text
MODIFICATIONS_REQUIRED
DEFERRED
REJECTED
EXPIRED
SUSPENDED
REVOKED
```

A decision that ethics review is unnecessary still requires an authorised basis.

### 9. Ethics committees and evidence

Committee configuration supports different review bodies and study categories. For the Zambia profile, example committees include:

- Humanities and Social Sciences Research Ethics Committee.
- Natural and Applied Sciences Research Ethics Committee.
- Biomedical Research Ethics Committee.

The ethics record may include:

- Full proposal.
- Proposal summary.
- Participant information.
- Consent forms.
- Questionnaires or interview guides.
- Institutional permission.
- External ethics approval.
- Clearance reference.
- Approval conditions.
- Effective and expiry dates.

These reflect document categories publicly listed by UNZA’s research-ethics service. [UNZA ethics requirements](https://www.unza.zm/r-and-i/research-ethics)

### 10. Research cannot begin prematurely

Where ethics clearance is required:

- Data collection cannot be marked as started before approval.
- Expired clearance blocks new data collection.
- Material amendments may require renewed ethics review.
- Ethics approval does not itself approve academic quality.
- Academic proposal approval and ethics approval remain separate decisions.

### 11. Milestone plan

A candidature receives an approved milestone plan, which may contain:

- Coursework completion.
- Concept note.
- Proposal seminar.
- Proposal approval.
- Ethics submission.
- Ethics approval.
- Data collection.
- Progress seminar.
- Analysis.
- Draft chapter submissions.
- Conference or publication requirement.
- Notice of intention to submit.
- Thesis submission.
- Viva.
- Corrections.
- Final repository deposit.

Each milestone records:

```text
NOT_STARTED
→ IN_PROGRESS
→ SUBMITTED
→ UNDER_REVIEW
→ SATISFIED
```

Alternative outcomes:

```text
CHANGES_REQUIRED
OVERDUE
WAIVED
NOT_APPLICABLE
FAILED
```

### 12. Progress reviews

Progress reviews record:

- Student report.
- Supervisor report.
- Work completed.
- Delays and risks.
- Ethics status.
- Resources required.
- Updated completion forecast.
- Recommended actions.
- Student response.
- Committee decision.

Review frequency is configurable by programme and study mode.

Repeated unsatisfactory progress does not automatically terminate candidature. It initiates the applicable warning, support and academic-review process.

### 13. Extensions and interruptions

Requests record:

- Requested dates.
- Reason.
- Supporting evidence.
- Supervisor recommendation.
- Funding implications.
- Ethics and data implications.
- Maximum-candidature impact.
- Fee implications.
- Approval.

Approved interruptions pause only deadlines identified by policy. They do not delete earlier milestones or financial transactions.

### 14. Thesis-submission readiness

Before submission, the system checks:

- Required coursework.
- Proposal approval.
- Ethics and permission compliance.
- Mandatory milestones.
- Registration status.
- Supervisor recommendation.
- Formatting requirements.
- Originality or similarity-review evidence.
- Notice-of-intention period.
- Financial requirements where applicable.

A failed check produces a specific requirement, not a general “not eligible” message.

### 15. Unsupported supervisor recommendation

A supervisor recommendation is recorded but must not become an unchallengeable technical lock.

Where a supervisor does not recommend submission:

```text
SUBMISSION_NOT_RECOMMENDED
→ REASONS_RECORDED
→ STUDENT_NOTIFIED
→ POSTGRADUATE_COMMITTEE_REVIEW
→ SUBMISSION_ALLOWED | FURTHER_WORK_REQUIRED
```

UNZA’s public thesis-submission form similarly provides for a supervisor who does not support submission to provide a report through the academic structure. [UNZA thesis-submission form](https://graduate.unza.zm/images/files/progress/5.pdf)

### 16. Thesis submission

The submission package contains:

- Thesis or dissertation version.
- Abstract.
- Metadata.
- Declarations.
- Supervisor recommendation.
- Ethics references.
- Similarity-review evidence.
- Associated publications where required.
- Restricted-data declarations.
- Embargo request where applicable.

```text
DRAFT_SUBMISSION
→ SUBMITTED
→ ADMINISTRATIVE_CHECK
→ ACADEMIC_CHECK
→ ACCEPTED_FOR_EXAMINATION
```

Alternative outcomes:

```text
CHANGES_REQUIRED
WITHDRAWN
REJECTED_AS_INCOMPLETE
```

### 17. Examiner management

Examiner records include:

- Internal or external status.
- Expertise.
- Institution.
- Conflict-of-interest declaration.
- Nomination.
- Approval.
- Invitation.
- Acceptance.
- Report deadline.
- Report receipt.

Examiner identity and reports are protected according to institutional policy.

### 18. Thesis examination

```text
EXAMINERS_APPOINTED
→ THESIS_DISPATCHED
→ REPORTS_PENDING
→ REPORTS_RECEIVED
→ VIVA_PENDING
→ PANEL_DECISION
→ CORRECTIONS_REQUIRED
→ CORRECTIONS_VERIFIED
→ EXAMINATION_COMPLETE
```

The viva stage can be optional where programme rules do not require it.

Configurable examination outcomes include:

```text
PASS
PASS_WITH_MINOR_CORRECTIONS
PASS_WITH_MAJOR_CORRECTIONS
REVISE_AND_RESUBMIT
REEXAMINATION_REQUIRED
FAIL
```

The institution defines the meaning, deadlines and authority for each outcome.

### 19. Corrections and resubmission

Every correction cycle records:

- Required corrections.
- Responsible reviewer.
- Deadline.
- Submitted corrected version.
- Student response matrix.
- Verification decision.
- Remaining issues.
- Attempt number.

The initially examined thesis and all corrected versions remain preserved.

### 20. Research examination fees

Student finance can assess:

- Research-period fees.
- Continuation fees.
- Examination fees.
- Re-examination fees.
- Extension-related charges.
- Approved waivers.

Academic modules send the relevant event and context; they never calculate the monetary amount.

### 21. Final completion and repository deposit

```text
EXAMINATION_COMPLETE
→ FINAL_VERSION_SUBMITTED
→ REPOSITORY_AND_METADATA_CHECK
→ COMPLETION_RECOMMENDED
→ COMPLETION_APPROVED
→ AWARD_ELIGIBLE
```

The final record includes:

- Approved thesis version.
- Repository identifier.
- Embargo and access conditions.
- Final title and abstract.
- Supervisors.
- Examination outcome.
- Completion date.
- Research outputs.

Award conferral remains the responsibility of the graduation and credentials domain.
