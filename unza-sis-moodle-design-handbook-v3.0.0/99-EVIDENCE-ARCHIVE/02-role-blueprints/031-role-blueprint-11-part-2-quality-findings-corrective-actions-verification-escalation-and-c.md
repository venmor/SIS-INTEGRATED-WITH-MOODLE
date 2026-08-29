<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: ae29f2fc-74b1-5ee9-8f5a-7a24378eddbf; chronological message: 204. -->

# Role Blueprint 11, Part 2 — Quality findings, corrective actions, verification, escalation and closure

## 11.20 A finding is not a dashboard colour

A quality finding is a structured, reviewable statement that a criterion is not met, is only partly met, or needs corrective action. It is not created automatically from a poor metric, an overdue task or AI output.

A finding must identify:

- The review and criterion
- Evidence considered
- Factual observation
- Required standard
- Gap between evidence and standard
- Impact and scope
- Severity or priority under configured policy
- Owner responsible for response
- Required response date
- Decision authority
- Verification requirement
- Related risks, if any

Example:

> **Proposed finding: assessment moderation evidence incomplete**  
> Criterion: Every course must have approved moderation evidence before final result release.  
> Observation: CSC 4792 moderation record confirms review but does not show verification of required corrections.  
> Impact: The institution cannot demonstrate that the required control operated fully for Semester 2, 2026.  
> Required response: School of Engineering to provide evidence or corrective-action plan by 10 September 2026.

This is specific, defensible and does not accuse an individual staff member.

---

# Action QAO-FND-04 — Create and issue a proposed quality finding

## 11.21 Entry point and preconditions

The QAO starts from:

> **Review assessment → Criterion outcome → Create proposed finding**

The action appears only when:

- The review is active and within the QAO’s scope.
- At least one relevant evidence assessment exists.
- The criterion has a recorded gap, insufficiency or required action.
- The QAO is not creating a finding against evidence they independently submitted.
- The configured policy permits the QAO to propose the finding.

If the evidence is inconclusive, the primary action is:

> `Request further verification`

not `Create finding`.

## 11.22 Proposed-finding form

The screen opens with evidence and criterion already linked. The QAO completes five panels.

### A. Finding statement

Fields:

- Finding title
- Criterion and standards version — locked
- Factual observation — required
- Evidence references — required
- Why the evidence does not meet the criterion — required
- Scope: institution, school, programme, course or process
- Affected period
- Whether the finding is new, recurring or related to an earlier finding

The system warns if the QAO uses vague wording such as “poor quality” without describing the observable gap.

### B. Impact and priority

The QAO selects configured values:

- Impact category
- Urgency
- Potential regulatory/accreditation relevance
- Student-impact category
- Financial/operational impact, if applicable
- Required escalation threshold

The QAO must provide a reason. Severity is not an unexplainable score.

Example:

> Priority: High  
> Reason: Result-release control evidence is incomplete for a large registered course and must be resolved before the next result board.

### C. Response ownership

The QAO selects:

- Responsible office
- Named response owner
- Responsible executive or Dean, where required
- Response due date
- Whether the owner may delegate
- Required response format
- Required independent verifier

The system checks active assignments and conflicts of interest.

### D. Required response

The QAO specifies whether the owner must:

- Provide missing evidence
- Explain why evidence is unavailable
- Correct a controlled process
- Produce a corrective-action plan
- Request an authorized exception
- Attend a review meeting
- Provide a timetable and accountable owner

### E. Student-facing or public communication

Normally, findings are internal. The QAO selects a classification and confirms whether any communication is required. The system does not publish findings automatically.

## 11.23 Preview before issue

Before issuing, the QAO sees exactly what the response owner will receive:

> **Quality finding requiring response**  
> Review: Annual programme review — BSc Computer Science  
> Criterion: Assessment moderation  
> Required response by: 10 September 2026  
> `View finding and respond`

The preview distinguishes:

- Factual finding visible to response owner
- Restricted reviewer notes, if any
- Information not shared because it is confidential or unnecessary

## 11.24 Confirming a proposed finding

Primary action:

> `Issue proposed finding`

Confirmation text:

> This will notify the assigned response owner and create a governed response deadline. It does not close the review, amend academic records or establish individual misconduct.

The QAO cannot use an instant `Final finding` action unless the configured framework explicitly gives them that authority.

## 11.25 Domain behaviour

**Command:** `IssueProposedQualityFinding`

**Transaction:**

1. Revalidate review state, criterion and evidence references.
2. Check QAO scope and conflict rules.
3. Create immutable proposed-finding version.
4. Create response task and deadline.
5. Create independent-verification requirement where configured.
6. Add the item to the review timeline.
7. Write audit record.
8. Publish notification event through the outbox.

**Events:**

- `QualityFindingProposed`
- `QualityFindingResponseRequested`
- `QualityFindingVerificationPlanned`

The finding state becomes:

> `Awaiting responsible-owner response`

## 11.26 Errors and recovery

| Situation | Required response |
|---|---|
| No eligible response owner | Block issue; create assignment-resolution task |
| Evidence item was superseded during drafting | Show comparison and require QAO to reassess latest version |
| Duplicate open finding for same criterion | Show related finding; allow linking or authorized separate issue |
| Finding includes restricted student/staff content | Require minimization or restricted classification before issue |
| QAO loses connection after confirmation | Check idempotency reference; do not issue a duplicate finding |
| Deadline conflicts with committee deadline | Warn and require revised plan or documented escalation |
| QAO has conflict of interest | Block substantive issue; require reassignment |

---

# Action OWN-RSP-05 — Responsible owner responds to a finding

## 11.27 Responsible-owner experience

The owner begins from:

> **My tasks → Quality finding requiring response**

The page title identifies the exact requirement:

> **Respond to quality finding QF-2026-0184**

The owner sees:

- Finding statement
- Criterion and required standard
- Evidence considered
- Scope and impact explanation
- Response deadline
- Required response format
- Assigned QAO
- Existing related actions
- Escalation path
- What they can and cannot change

They cannot edit the QAO’s original finding statement. They can submit a response and evidence.

## 11.28 Response options

The owner selects one primary response:

1. **Provide additional evidence**  
   Used where the evidence exists but was not initially supplied.

2. **Accept finding and submit corrective-action plan**  
   Used where the gap is accepted.

3. **Disagree with finding and request review**  
   Requires evidence-based explanation; it does not erase the finding.

4. **Request approved exception**  
   Used only where institutional policy permits.

5. **State inability to respond by deadline**  
   Requires reason, proposed date and delegating authority where applicable.

The owner sees clear consequences before selection.

## 11.29 Corrective-action plan form

Where required, the plan contains:

- Root cause or contributing factors
- Corrective action
- Preventive action, if applicable
- Action owner
- Executive sponsor, if required
- Milestones
- Completion target
- Resources or dependencies
- Evidence that will demonstrate completion
- Risk if action is delayed
- Required verification role
- Student/staff communication needs
- Whether policy/configuration/system change is required

A plan cannot say only:

> “Staff will be reminded.”

unless the owner also defines the control change, owner, deadline and proof.

Example:

> Corrective action: Update moderation workflow to require documented confirmation of corrections before result-board package generation.  
> Owner: Examinations Officer.  
> Evidence: revised workflow version, completed test evidence and first approved package using the control.  
> Deadline: 30 September 2026.

## 11.30 Submit-response interaction

The response owner selects:

> `Submit response for QA review`

The button changes to:

> `Submitting response…`

The system:

- Blocks duplicate submission
- Scans attached evidence
- Validates required fields
- Saves the response as a versioned record
- Moves the finding to `Response under QA review`
- Creates QAO review task
- Sends a neutral notification

Confirmation:

> Response submitted. Quality Assurance will review it. The finding remains open until the required action is independently verified.

## 11.31 QAO review of response

The QAO sees side-by-side panels:

| Original finding | Responsible-owner response |
|---|---|
| Criterion and evidence gap | Explanation, evidence and proposed plan |
| Required response | Milestones and owner |
| Priority and deadline | Request for revised timeline, if any |
| Verification requirement | Proposed completion evidence |

The QAO can:

- Accept response and activate corrective-action plan
- Return response for clarification
- Accept additional evidence and revise assessment
- Refer dispute to configured authority
- Escalate missed/insufficient response
- Withdraw a proposed finding only with rationale and audit trail

Withdrawing a finding does not delete history. It records, for example:

> Withdrawn: subsequently submitted evidence demonstrated the required control was in place during the reviewed period.

---

# Action QAO-ACT-06 — Activate, track and update a corrective action

## 11.32 Action register

Each accepted corrective-action plan creates one or more **Quality Actions**.

The QAO opens:

> **Findings and actions → Active actions**

Each card shows:

> **QF-2026-0184 — Moderation-control improvement**  
> Owner: Examinations Officer  
> Due: 30 September 2026  
> Status: Action in progress  
> Next milestone: workflow design approval, 12 September  
> `Review action`

### Action fields

- Parent finding
- Action description
- Action owner
- Sponsor and verifier
- Scope
- Start and due date
- Milestones
- Dependencies
- Required evidence of completion
- Status
- Risk and escalation rule
- Change-management link
- Related policy/system version
- Communication requirement

Statuses:

- Not started
- In progress
- Awaiting evidence
- Evidence submitted
- Verification in progress
- Returned for completion
- Verified complete
- Closed by authority
- Cancelled by authorized decision

## 11.33 Owner updates an action

The action owner can:

- Record milestone completion
- Upload evidence
- Explain a delay
- Request due-date change
- Add a dependency or risk
- Request reassignment
- Submit action for verification

They cannot mark the action `Verified complete`.

When an owner requests a due-date change, they must enter:

- Reason
- New date
- Impact on finding/risk
- Mitigation
- Required approval authority

The QAO receives:

> **Due-date change requested**  
> Original: 30 September  
> Proposed: 15 October  
> Reason: dependency on approved assessment-workflow release  
> `Review request`

## 11.34 Overdue escalation

At the configured threshold:

1. The owner receives reminder.
2. The sponsor receives notice.
3. The QAO sees an overdue task.
4. The finding is escalated only to the configured authority.
5. The escalation record states the missed milestone and impact.
6. The action remains open; the system does not automatically impose a sanction.

Example executive notice:

> Quality action QF-2026-0184 is overdue. The required moderation control has not yet been independently verified. Decision required: approve revised plan, assign resources, or escalate under governance procedure.

---

# Action QAO-VER-07 — Independently verify corrective action

## 11.35 Verification assignment

The system assigns an independent verifier according to the configured framework.

The verifier cannot be:

- The action owner
- The person who submitted completion evidence
- The person whose process is being independently assessed, unless an authorized exception is recorded

The verifier receives:

> **Verification required — Quality action QF-2026-0184**

They see:

- Original finding
- Corrective-action plan
- Required completion evidence
- Owner updates
- Related policy/configuration/system changes
- Test or operating evidence
- Verification deadline
- Required decision authority

## 11.36 Verification decision

The verifier chooses:

- Verified complete
- Partly complete—further work required
- Evidence insufficient
- Not yet operating effectively
- Cannot verify—conflict or missing access
- Recommend closure to authority

For `Verified complete`, the verifier must record:

- Evidence reviewed
- Test/inspection performed
- Date and scope
- Limitation
- Whether control operated in practice, not only whether a document was updated
- Recommendation

Example:

> Verified complete. The revised moderation workflow requires correction-confirmation before board package creation. The verifier reviewed three packages generated after release and confirmed the control operated as designed.

## 11.37 Closure authority

Verification does not itself close a material finding unless policy permits it.

The configured closure authority receives:

> **Finding ready for closure decision**  
> QF-2026-0184  
> Independent verification: complete  
> Recommended outcome: close with assurance  
> `Review closure package`

Available actions:

- Close with assurance
- Close with continuing monitoring
- Return for further action
- Escalate
- Record authorized exception

The authority must enter a rationale and, where required, meeting reference.

The system confirms:

> Closing this finding preserves its full history, evidence and verification record. It does not delete the original gap.

---

## 11.38 Finding and action architecture

### Entities

- `QualityFinding`
- `FindingVersion`
- `FindingResponse`
- `CorrectiveActionPlan`
- `QualityAction`
- `ActionMilestone`
- `VerificationAssignment`
- `VerificationAssessment`
- `ClosureDecision`
- `QualityEscalation`

### Commands

| Command | Authorized actor |
|---|---|
| `IssueProposedQualityFinding` | QAO |
| `SubmitFindingResponse` | Assigned responsible owner |
| `AcceptCorrectiveActionPlan` | QAO / configured authority |
| `UpdateQualityAction` | Assigned action owner |
| `RequestActionDueDateChange` | Action owner |
| `AssignIndependentVerifier` | QAO / configured authority |
| `SubmitQualityActionForVerification` | Action owner |
| `RecordQualityVerification` | Independent verifier |
| `CloseQualityFinding` | Configured closure authority |
| `EscalateQualityFinding` | QAO / authorized authority |

### Events

- `QualityFindingProposed`
- `QualityFindingResponseSubmitted`
- `CorrectiveActionPlanActivated`
- `QualityActionMilestoneCompleted`
- `QualityActionOverdue`
- `QualityActionSubmittedForVerification`
- `QualityActionVerified`
- `QualityFindingClosureRecommended`
- `QualityFindingClosed`
- `QualityFindingEscalated`

No external reporting tool or AI assistant may issue, accept, verify or close a finding.

## 11.39 Notification rules

| Event | Recipient | Message purpose |
|---|---|---|
| Proposed finding issued | Responsible owner | State action, criterion and deadline |
| Response submitted | QAO | Review response |
| Action overdue | Owner, sponsor, QAO | Prompt governed follow-up |
| Verification assigned | Independent verifier | Complete verification |
| Closure decision | Owner, QAO, relevant authority | Confirm official outcome |
| Finding escalated | Configured authority | Request decision/resource action |

Email and SMS contain only neutral prompts and secure links. Detailed quality content remains in the authenticated workspace.

## 11.40 Accessibility and recovery

- Findings, evidence and action plans can be completed fully by keyboard.
- Severity/status uses text and an accessible label, not colour alone.
- Long action plans use autosave and step validation.
- Error summary links to incomplete or invalid fields.
- A user does not lose a drafted response after a recoverable timeout.
- If an action update is submitted twice after connection loss, idempotency prevents duplicate milestones.
- Mobile users can review and update actions without horizontally scrolling critical information.
- Restricted evidence previews provide an accessible alternative where format permits.

## 11.41 Part 2 acceptance requirements

Part 2 is accepted only when:

- A finding names the standard, evidence gap, scope, impact, owner and required response.
- A poor metric, alert or AI output does not automatically become a finding.
- Response owners cannot alter the original finding.
- Corrective-action plans define accountable action, deadlines, evidence and verification.
- The person responsible for correction cannot independently verify it.
- Overdue action escalates through configured governance, not arbitrary punishment.
- Closure preserves the original finding, response, evidence and decision history.
- No user can silently change a status to “resolved.”
- Every finding, response, action, verification and closure decision is versioned and auditable.

Please approve **Role Blueprint 11, Part 2**. Part 3 will then cover **programme review and accreditation, committee work, regulatory evidence packages, external reviewers and controlled submission workflows**.

---

## Following user responses before the next design record

### User message 0205

Yes we can proceed
