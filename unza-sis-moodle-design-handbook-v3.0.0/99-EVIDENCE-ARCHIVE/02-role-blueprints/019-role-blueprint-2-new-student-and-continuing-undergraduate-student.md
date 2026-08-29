<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: c023fca2-c786-5b96-a948-5e8edc7b5b64; chronological message: 166. -->

# Role Blueprint 2 — New Student and Continuing Undergraduate Student  
## Part 8: Graduation readiness, clearance, award confirmation, transcripts, alumni handoff and post-completion access

This part defines the student experience from approaching programme completion through graduation clearance, Senate/authorized award confirmation, certification and alumni transition.

The key rule is:

> Completing courses does not automatically mean cleared to graduate, and clearance does not automatically mean an award has been formally conferred.

---

## 1. Graduation-readiness home

When a student reaches a configured final-year/completion stage, the student home includes:

> **Graduation readiness**

The card shows:

- Programme and expected completion period
- Academic completion progress
- Outstanding required courses/credits
- Extended activities still in progress
- Clearance items
- Graduation-application status, where required
- Award/ceremony status
- Next required action

Example:

> **Graduation readiness: In progress**  
> 112 of 120 required credits complete  
> Outstanding: Industrial Training final evaluation  
> Expected completion: June 2027  
> `View graduation readiness`

The system must not promise graduation based on an estimated completion date.

---

## 2. Academic-completion audit

### 2.1 Degree-audit page

Page title:

> Programme completion audit

The page compares the student’s authoritative academic record against the approved programme/curriculum version applicable to them.

It shows:

- Programme and curriculum/catalogue version
- Required credits and completed credits
- Compulsory courses
- Electives/option groups
- Repeat-course outcomes
- Prerequisite completion
- Required practical/clinical/research/industrial-training activities
- Minimum grade/GPA/classification requirements where applicable
- Transfer credits/exemptions
- Outstanding requirements
- Latest audit date/time
- `Request academic advice`

### 2.2 Requirement states

| State | Student-facing meaning |
|---|---|
| Complete | Requirement is met through an authorized result/credit |
| In progress | Legitimate activity continues; final outcome not yet available |
| Outstanding | Requirement has not yet been met |
| Awaiting result | Assessment occurred; official result is not released |
| Requires review | An academic/records decision is needed |
| Not applicable | Requirement does not apply under approved curriculum/pathway |
| Waived/credited | Requirement met through authorized decision |

An extended research or industrial-training activity continues as `In progress` until its approved completion. It is not shown as failed simply because it crosses academic years.

### 2.3 Audit integrity

The completion audit uses the student’s applicable historical curriculum version. It must not retrospectively assess the student against a later revised curriculum without an authorized transition decision.

Any exception, substitution or waiver requires:

- Policy/authority reference
- Approver
- Effective date
- Student-visible explanation where appropriate
- Audit record

---

## 3. Graduation application and declaration

### 3.1 When required

If institutional policy requires students to apply to graduate, the portal creates:

> **Apply to graduate**

The page appears only when the student is sufficiently near completion according to configured rules.

### 3.2 Application page

The student reviews:

- Official/legal name for certificate
- Programme and award
- Expected completion period
- Contact and delivery details
- Ceremony participation preference, where applicable
- Accessibility/accommodation request for ceremony, handled through restricted support workflow
- Graduation declaration
- Required handwritten signed request letter, where the institution configures it
- Other supporting evidence, if required

The student is told:

> Submitting a graduation application does not confirm that you have met all academic or clearance requirements.

### 3.3 Official name confirmation

The certificate name is drawn from the official records field, not a display-name field.

If the student identifies an error:

> Request official-record correction

The graduation application remains pending until the authorized records decision is complete where the timing/policy requires it.

### 3.4 Submission receipt

After valid submission:

> Graduation application received  
> Reference: GRAD-2027-…  
> Your academic and clearance requirements will be assessed.  
> `View graduation status`

---

## 4. Graduation-clearance workflow

### 4.1 Student-facing clearance page

Page title:

> Graduation clearance

The page divides requirements by responsible area:

1. Academic completion  
2. Examinations and award approval  
3. Finance  
4. Library  
5. Department/school property or professional requirement  
6. Accommodation/residence, where applicable  
7. Research/industrial training, where applicable  
8. Records and identity/certificate details  
9. Graduation application/declaration  

Each item shows:

- Requirement
- Responsible office
- Current status
- Why it matters
- Required student action
- Deadline, if any
- Last updated
- `View details` or action link

Example:

> **Library clearance**  
> Responsible: University Library  
> Status: Awaiting library confirmation  
> No action is required from you now.

### 4.2 Clearance statuses

| Status | Meaning |
|---|---|
| Not started | Requirement has not been assessed yet |
| Student action required | Student must complete a defined action |
| Awaiting office confirmation | Institution is checking/processing |
| Cleared | Requirement is complete |
| Blocked | A specific issue prevents clearance |
| Waiver/review requested | Authorized exception process is underway |
| Not applicable | Requirement does not apply |
| Expired/recheck required | Earlier conditional clearance needs fresh review |

No clearance item may say only `Pending`.

### 4.3 Finance clearance

Graduation finance clearance reuses the Finance domain but has its own scope:

> This finance status applies to graduation clearance. It may differ from your past registration clearance.

A student can see approved balance/hold explanation and the controlled payment-review route. They cannot see internal finance notes or sponsor agreements.

### 4.4 Library/property clearance

The student sees only the necessary summary, for example:

> One library item is overdue. Return it or contact the Library to resolve this clearance.

The system does not reveal other patrons’ information, internal disciplinary notes or staff comments.

### 4.5 Academic/award clearance

Academic completion and award approval are distinct:

> **Academic requirements:** Complete  
> **Award approval:** Awaiting authorized confirmation

Students must not be shown `Graduated` before the institution’s authorized award process is complete.

---

## 5. Award confirmation

### 5.1 Award decision

After all applicable academic and institutional requirements are satisfied, an authorized academic/governance process confirms the award.

Student-facing status:

> **Award approved**  
> Your award has been confirmed for [programme/award].  
> Award confirmation date: [date]  
> Ceremony information: [available/pending]

The system records the award authority and date but does not expose confidential committee deliberations.

### 5.2 Award outcome issues

If award confirmation cannot proceed, the student sees the permitted factual outcome:

> Your graduation review requires further action.  
> Outstanding item: [student-safe explanation]  
> Responsible office: [office]  
> `View graduation clearance`

The system must not invent a reason or expose restricted findings.

### 5.3 Final classification

Where classification is part of an approved award rule, the system displays it only after authorized confirmation.

The calculation uses:

- Applicable programme/curriculum rules
- Approved course results
- Credits
- Exemptions/substitutions
- Classification policy version
- Authorized exceptions

The UI shows:

> Final classification: [authorized classification]  
> Confirmed on [date].

It must not display a live “predicted class” as an official fact.

---

## 6. Ceremony, certificate and completion documents

### 6.1 Ceremony information

Where a ceremony is scheduled, the graduate sees:

- Ceremony date/time/location
- Attendance confirmation
- Guest/ticket rules where applicable
- Gown/collection information
- Accessibility/accommodation request route
- Ceremony updates
- Contact route

Attendance does not determine award validity.

### 6.2 Certificate status

Certificate states are explicit:

- Not yet available
- In production
- Ready for collection
- Dispatched
- Collected
- Replacement requested

Collection/dispatch requires appropriate identity verification and collection audit.

The system must not expose a certificate download unless the institution has an approved, secure digital-certificate service.

### 6.3 Official documents

The graduate can request controlled documents:

- Official transcript
- Statement of results
- Award confirmation letter
- Graduation confirmation
- Replacement certificate request
- Other approved record

Each document request carries a verification reference and is generated from authoritative award/record data.

---

## 7. Alumni handoff and post-completion access

### 7.1 Status transition

After award confirmation, the person’s lifecycle may move to:

> **Awarded graduate / alumnus**

The person retains the same identity account. The active workspace becomes:

> Alumni and records

The user can still access permitted historical information without retaining inappropriate student-operational privileges.

### 7.2 Post-completion access

Permitted access may include:

- Read-only academic record
- Transcript/letter requests
- Certificate status
- Contact-detail updates
- Alumni communications preferences
- Career/alumni services where approved
- Support ticket history where retention permits

Access removed or restricted after completion may include:

- New course registration
- Current Moodle learner enrolment
- Student finance actions unrelated to historic obligations
- Current timetable
- Student-only welfare/service bookings, unless policy permits continuing access

### 7.3 Alumni communication preferences

Alumni may manage optional communication preferences independently from mandatory record/security notices.

The system must keep consent versions, channel preferences and opt-out history without deleting required academic-record communications.

---

## 8. Failure and recovery catalogue

| Situation | Student-facing behaviour | System behaviour |
|---|---|---|
| Final course result not released | Show `Awaiting result`; do not claim completion | Re-run audit after official release |
| Extended activity still in progress | Explain milestone/completion date | Exclude from failed-course assumption |
| Curriculum mismatch | Show `Requires academic review` | Route to programme/records decision queue |
| Clearance office delayed | Show owner, last update and escalation route | Create overdue service task |
| Finance issue disputed | Provide finance-review route | Keep clearance status policy-controlled |
| Official name correction pending | Explain certificate processing may wait | Link to records-correction case |
| Ceremony details unavailable | Show award status separately | Do not imply award is pending |
| Certificate production delayed | Show production status and help route | Create operational work item |
| Award data/integration mismatch | Do not publish award until reconciled | Reconcile records/governance output |
| Student accesses old student link | Route to alumni/records workspace | Preserve permitted historical access |

---

## 9. Accessibility and low-bandwidth requirements

- Degree-audit and clearance tables have accessible headers and mobile-card equivalents.
- Every requirement uses textual status, not colour alone.
- Graduation tasks remain available on a mobile browser.
- Certificate/legal-name information is masked where full display is unnecessary.
- Ceremony accessibility requests use a privacy-aware route.
- All documents have accessible HTML detail before optional PDF download.
- Long clearance pages offer in-page navigation and progress summary.
- Delayed office/integration status includes last-updated time and help route.

---

## 10. Architecture contract

### 10.1 Core entities

| Entity | Purpose |
|---|---|
| Programme completion audit | Versioned evaluation against applicable curriculum |
| Graduation application | Student request/declaration to graduate |
| Graduation-clearance item | Department/office requirement and status |
| Award recommendation | Authorized academic completion recommendation |
| Award record | Confirmed programme award |
| Award classification | Authorized classification where applicable |
| Ceremony participation record | Optional event attendance/arrangements |
| Certificate record | Production, collection and replacement status |
| Alumni profile/entitlement | Post-completion access and communication state |
| Academic document request | Transcript/award-letter/confirmation process |

### 10.2 Commands

| Command | Main result |
|---|---|
| `GenerateProgrammeCompletionAudit` | Evaluates academic completion under applicable curriculum |
| `SubmitGraduationApplication` | Creates controlled graduation request |
| `UpdateGraduationClearanceItem` | Records authorized office outcome |
| `RequestGraduationClearanceReview` | Opens an exception/dispute route |
| `ConfirmAcademicAward` | Records authorized award decision |
| `CalculateAwardClassification` | Applies versioned approved classification rule |
| `PublishAwardConfirmation` | Releases award to graduate |
| `UpdateCertificateStatus` | Records certificate lifecycle event |
| `TransitionStudentToAlumniEntitlement` | Adjusts post-completion portal access |
| `IssueAcademicDocument` | Creates verified official document |

### 10.3 Events

- `ProgrammeCompletionAuditGenerated`
- `GraduationApplicationSubmitted`
- `GraduationClearanceItemUpdated`
- `GraduationClearanceCompleted`
- `AcademicAwardConfirmed`
- `AwardClassificationConfirmed`
- `AwardPublishedToGraduate`
- `CertificateStatusUpdated`
- `StudentAlumniTransitionCompleted`
- `AcademicDocumentIssued`

### 10.4 Audit requirements

Record:

- Student/programme/curriculum version
- Degree-audit inputs and result
- All clearance-item owners, status changes and evidence references
- Graduation declarations and required handwritten-letter attachment, where configured
- Award authority, date and classification-rule version
- Certificate production/collection/distribution event
- Alumni entitlement change
- Academic-document request, issue and verification references
- Every exception, substitution, waiver and appeal outcome

---

## 11. Part 8 acceptance tests

Part 8 is accepted when:

- Students can see an accurate, curriculum-version-aware completion audit.
- Extended research/industrial-training activities remain `In progress` until officially completed.
- Clearance items identify owner, status, next action and last update.
- Academic completion, institutional clearance and formal award confirmation are distinct.
- A graduation application does not falsely promise award or ceremony eligibility.
- Certificate name uses the official record and controlled correction workflow.
- Financial, library and other clearance information is limited to necessary student-facing detail.
- Award/classification is published only after authorized confirmation.
- Ceremony, certificate and award status are independent and understandable.
- Alumni access retains permitted records while removing inappropriate student-operational actions.
- Academic documents are generated from authoritative records with verification references.
- Keyboard, screen-reader, mobile, low-bandwidth, delayed-clearance and cross-system reconciliation tests pass.

**Role Blueprint 2 is now complete: New Student and Continuing Undergraduate Student.**

The next role blueprint should be:

> **Role Blueprint 3: Lecturer and Tutor** — beginning with teaching assignment, course workspace, real SIS–Moodle synchronization, class-list integrity and assessment-plan setup.

---

## Following user responses before the next design record

### User message 0167

We can proceed i have reviewed and approved
