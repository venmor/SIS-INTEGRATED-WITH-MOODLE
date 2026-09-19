<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: 5b6e5dd1-9309-55b7-a691-4af54fd85489; chronological message: 177. -->

# Role Blueprint 3 — Lecturer and Tutor  
## Part 3: Final-result submission, moderation, examination-board workflow, result correction and controlled student-result release

This part defines how approved CA, final-examination marks and other authorized assessment outcomes become an official course result.

The key rule is:

> A lecturer or tutor may prepare and submit results within their authority. Official results are released only after the required moderation, examination governance and authorized publication workflow.

No Moodle total, spreadsheet upload or individual staff action may directly publish an official final result.

---

## 1. Result-preparation workspace

An authorized lecturer or course coordinator opens:

> CSC 4792 → Final results

The page displays:

- Course offering and academic period
- Assessment-plan version
- Official CA status
- Final-examination/import status
- Student count from the official class list
- Missing/exception cases
- Result formula/version
- Moderation and board stage
- Submission deadline
- Current result-release state

Example:

> **Final results — CSC 4792 · January 2027**  
> Official CA: Approved  
> Final examination marks: Awaiting import  
> Students on official class list: 118  
> Result submission deadline: 25 June 2027, 17:00 CAT  
> Status: Preparing results

A tutor sees this page only to the extent their assignment permits—for example, they may submit an assigned TG’s practical component but not calculate or submit the full course result.

---

## 2. Result inputs and calculation

### 2.1 Authorized inputs

The final-result calculation uses only approved inputs:

- Official CA component records
- Authorized final-examination marks
- Approved practical/clinical/research assessment records
- Approved supplementary outcome, where applicable
- Authorized deferred/make-up assessment result
- Approved course-credit/exemption status
- Versioned course result rule

The formula is defined by the approved course/programme regulation and assessment plan.

Example:

> Official CA: 50%  
> Final examination: 50%  
> Pass threshold: configured course rule  
> Result formula version: CSC4792-2027-v1

The system must not calculate final results from raw Moodle totals unless those values have completed the official CA process.

### 2.2 Automatic calculation with human review

The system may calculate proposed result outcomes, such as pass/fail or grade, from approved inputs and configured rules.

However, it must flag—not decide—cases requiring human attention:

- Missing CA component
- Missing final examination mark
- Out-of-range mark
- Student not on official class list
- Inconsistent assessment attempt
- Approved deferred assessment
- Special accommodation result pending
- Formula/version mismatch
- Result changed after prior submission
- Course marked as extended/in progress

The system must never use an AI model to determine an official grade, progression outcome or disciplinary conclusion.

### 2.3 Extended activities

For research, industrial training or another extended activity:

- The course remains `In progress` where the official completion period has not arrived.
- No final pass/fail result is generated prematurely.
- The result workspace shows applicable milestones and authorized final-assessment date.
- The student is not included in failed-course counts because a final result is not yet due.

---

## 3. Result states

| State | Meaning |
|---|---|
| Preparing results | Course team is assembling authorized inputs |
| Incomplete | One or more required result inputs missing |
| Ready for internal review | All required inputs present; calculations ready |
| Returned for correction | Reviewer found a defined issue |
| Submitted for moderation | Lecturer/coordinator submitted result batch |
| Under moderation | Assigned moderator/examiner reviewing |
| Submitted to examinations | Moderation complete; awaiting examinations process |
| Board review pending | Awaiting authorized academic/examination board |
| Approved for release | Authorized result publication permitted |
| Released | Official result visible to students |
| Amendment under review | A published result needs controlled correction |
| Superseded | Replaced by authorized amended result version |
| In progress | Extended activity not yet ready for final result |

A student-facing result is released only from `Released`.

---

## 4. Lecturer and tutor actions

### 4.1 Lecturer/course coordinator

A lecturer or coordinator may:

- Review official CA data
- Import/enter authorized final-assessment marks
- Review calculated proposed outcomes
- Identify exceptions
- Attach permitted supporting record
- Submit batch for moderation
- Respond to moderator correction requests
- View status after submission

They may not:

- Bypass moderation/board rules
- Change an approved official result silently
- Release results to students without authority
- Include an unregistered student in the official result batch

### 4.2 Tutor

A tutor may, only within explicit assignment scope:

- Submit marked component results for their TG
- Confirm attendance/assessment participation
- Correct returned component-mark issues
- View result-submission status relevant to their component

A tutor may not:

- Calculate the complete course final result
- Submit the course-wide official final result
- Release CA/final result
- Override a lecturer/coordinator or moderator
- View another TG’s detailed marks without authorized scope

---

## 5. Final-examination mark handling

### 5.1 Examination mark source

Final-examination marks enter the result workflow through an authorized examinations process, for example:

- Controlled electronic marking system
- Approved mark-entry batch
- Authorized examination officer import
- Approved manual-entry process with dual review

The lecturer sees whether the marks are:

- Not received
- Imported for review
- Validated
- Returned due to issue
- Approved for result calculation

Raw exam scripts, candidate identifiers and confidential marking material remain within the authorised examination-security boundary.

### 5.2 Missing or irregular exam result

If a student has no final-examination mark, the lecturer sees a specific reason where permitted:

- Absent
- Deferred examination approved
- Result withheld under authorized examination rule
- Mark not yet entered
- Assessment irregularity under separate restricted process
- Data mismatch requiring examinations reconciliation

The lecturer must not assume absence means failure. The final course outcome follows the configured examination rule and authorized decision.

---

## 6. Moderation workflow

### 6.1 Submission for moderation

Before sending a result batch, the lecturer/coordinator sees a final checklist:

- Official class-list count reconciled
- CA components approved
- Final-examination status valid
- Formula/version confirmed
- Missing/exception cases resolved or classified
- Extended activities correctly excluded/in progress
- Required comments/evidence attached
- Result-submission declaration accepted

Selecting `Submit for moderation`:

1. Locks the submitted batch version.
2. Creates a moderation case.
3. Records the lecturer/coordinator declaration.
4. Sends the batch to the assigned moderator/examiner.
5. Prevents direct editing until returned.
6. Creates audit and notification events.

### 6.2 Moderator review

The authorized moderator/examiner sees:

- Course/period and assessment-plan version
- Official class-list reconciliation
- Mark distributions and configured anomaly checks
- Missing/exception cases
- Formula calculation
- Prior result versions
- Supporting evidence/justifications
- Lecturer/coordinator notes
- Actions: `Approve`, `Return for correction`, `Request clarification`, `Refer to examinations`

A moderator may not silently overwrite a result. Any material mark correction requires:

- Reason
- Authority
- Evidence/reference
- Audit event
- Appropriate re-review

### 6.3 Return for correction

The lecturer sees:

> **Results returned for correction**  
> Reason: Two students have final-examination marks outside the permitted range.  
> Required action: Correct or refer these entries before resubmitting.

The returned batch remains historically traceable. The corrected resubmission becomes a new version, not an erased replacement.

---

## 7. Examination-board workflow

### 7.1 Board submission

After moderation, the system submits an approved result package to the authorized examinations/board workflow.

The package includes:

- Course/period
- Official class-list reconciliation
- Approved CA and examination outcomes
- Result formula/policy version
- Moderation decision
- Exception cases and authorized handling
- Required sign-off/declarations
- Batch hash/version for integrity

### 7.2 Board decision

The board or authorized examinations authority may:

- Approve for release
- Return to course team/examinations for correction
- Request clarification
- Approve subject to a recorded condition
- Defer decision
- Refer a restricted matter to another authority

The system records the formal decision, date, authority and applicable conditions.

The student never sees internal board discussion. They see only the official released result or an approved student-facing status such as `Result not yet available`.

### 7.3 Batch-release safety

Results are released as a controlled batch only when all configured checks pass.

The system prevents:

- Partial accidental release presented as complete
- A course result released before board authority
- A result from the wrong academic period
- Release to a student who is not on the authorized course record
- Unapproved result-file overwrite

If a release job fails, the last certified result state remains intact and operations receives a reconciliation task.

---

## 8. Student-result release

### 8.1 Lecturer/tutor view after release

After results are officially released, teaching staff see:

> **Official results released**  
> Release date: 3 July 2027, 09:00 CAT  
> Students notified: [delivery summary]  
> Student queries/review requests: [count]

The lecturer can view released results within course scope but cannot alter them through routine grade entry.

### 8.2 Student experience

Students receive a neutral notice:

> Your official results for January 2027 are available. Sign in to view them securely.

Inside the student portal, the result is labelled:

> **Official result — released**

It includes:

- Course
- Result/outcome
- Published date
- Supplementary eligibility where applicable
- Repeat/progression next action
- `Request result review` where policy permits

---

## 9. Published-result correction

### 9.1 Correction triggers

An amendment may begin because of:

- Verified clerical/data-entry error
- Authorized result-review outcome
- Examination reconciliation issue
- Approved academic-board decision
- Corrected assessment input with documented authority

It must not begin merely because a staff member changes their mind without the required academic process.

### 9.2 Amendment workflow

1. Authorized role opens a result-amendment case.
2. System identifies original official result/version.
3. Reason, evidence and affected student/course are recorded.
4. Corrected outcome is calculated using applicable rule version.
5. Required moderation/board approval occurs.
6. New official result version is approved.
7. Student progression, supplementary eligibility, registration and finance effects are recalculated.
8. Student receives secure amended-result notification.
9. Original result remains in immutable audit history as superseded.

Student-facing notice:

> An official result for CSC 4792 has been updated after an authorized review. Sign in to view the current result and next steps.

### 9.3 Correction impact

If a correction changes a student’s progression/registration:

- The system creates a controlled academic-impact task.
- It does not silently remove student courses or Moodle access.
- Records/academic authority determine the effective action.
- The student sees clear explanation, dates and support route.

---

## 10. Failure and recovery catalogue

| Situation | Staff-facing response | System behaviour |
|---|---|---|
| CA not approved | Identify missing component/batch | Block final result submission |
| Final-exam marks missing | Show exact missing status | Block or apply approved deferred rule |
| Student not on official class list | Show reconciliation route | Prevent result inclusion |
| Tutor enters outside TG scope | Explain permission limit | Reject entry and audit scope denial |
| Formula changed after marking | Require versioned academic change approval | Recalculate only after authority |
| Batch submitted twice | Return original submission status | Idempotent handling |
| Moderator unavailable | Show assigned replacement/escalation route | Enforce delegation authority |
| Board returns batch | Show decision and required action | Preserve prior versions |
| Result-release job fails | Do not show partial release as complete | Retain certified state; reconcile/retry |
| Published result amended | Show amendment case and impact | Preserve original/audit and recalculate dependencies |
| Extended activity not complete | Show `In progress` | Exclude from false fail result |

---

## 11. Architecture contract

### 11.1 Core entities

| Entity | Purpose |
|---|---|
| Final-result batch | Course-wide proposed official outcomes |
| Result-calculation rule | Versioned course/result formula |
| Final-assessment mark | Authorized examination or final-assessment input |
| Result exception | Missing, deferred, irregular or reconciliation case |
| Moderation case | Controlled academic review |
| Examination-board submission | Formal result package |
| Board decision | Authorized release/return/defer outcome |
| Official course-result version | Released or superseded final result |
| Result-amendment case | Controlled post-release correction |
| Academic-impact task | Follow-up caused by amended result |

### 11.2 Commands

| Command | Main result |
|---|---|
| `PrepareFinalResultBatch` | Combines approved inputs into proposed results |
| `ValidateFinalResultBatch` | Checks class list, rules and exceptions |
| `SubmitFinalResultsForModeration` | Locks version and starts moderation |
| `RecordModerationDecision` | Approves/returns/refers result batch |
| `SubmitResultsToExaminationsBoard` | Creates formal board package |
| `RecordExaminationsBoardDecision` | Records release authority |
| `ReleaseOfficialCourseResults` | Publishes authorized outcomes |
| `RequestOfficialResultAmendment` | Opens controlled correction case |
| `ApproveOfficialResultAmendment` | Publishes approved revised result |
| `RecalculateAcademicImpact` | Updates affected progression/registration states |

### 11.3 Events

- `FinalResultBatchPrepared`
- `FinalResultBatchValidated`
- `FinalResultsSubmittedForModeration`
- `FinalResultsReturnedForCorrection`
- `FinalResultsModerated`
- `ResultsSubmittedToExaminationsBoard`
- `ExaminationsBoardDecisionRecorded`
- `OfficialCourseResultsReleased`
- `OfficialResultAmendmentRequested`
- `OfficialResultAmended`
- `AcademicImpactRecalculated`

### 11.4 Audit requirements

Record:

- Course, academic period, official class-list snapshot and plan/formula version
- CA and final-assessment input sources
- Lecturer/tutor scope and submitted declaration
- Missing/exception classification and authorized handling
- Moderation/board authority, decision and timestamp
- Batch hash/version and release job result
- Every post-release amendment, reason, evidence and impact
- Student notifications and visible result version
- Denied actions, especially cross-TG/cross-course grade access

---

## 12. Part 3 acceptance tests

Part 3 is accepted when:

- Only approved CA, final-assessment and configured rule inputs can produce proposed final results.
- Tutors cannot calculate, submit or release course-wide final results outside their explicit assignment.
- Extended research/industrial-training activity remains `In progress` until final authorized completion.
- Result batches reconcile against the official class list.
- Moderation and board stages are required and versioned before official release.
- Moodle totals cannot directly become official final results.
- Returned batches, duplicate submissions and formula changes preserve traceable versions.
- Student results are released only by the authorized batch-release process.
- Published-result corrections are controlled, auditable and recalculate affected academic/finance states safely.
- Partial release, wrong-period release and silent overwrite failures are prevented.
- Keyboard, screen-reader, mobile, low-bandwidth, authorization-boundary and release-recovery tests pass.

**Please approve Role Blueprint 3, Part 3: Final-result submission, moderation, examination-board workflow, result correction and controlled student-result release.**

After approval, I will continue with Part 4: **course communication, attendance and learning-participation signals, academic concerns, student referrals and lecturer/tutor follow-up boundaries.**

---

## Following user responses before the next design record

### User message 0178

I approve we can proceed please
