<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: e5abc673-4b10-51d8-9539-918b378d2d0b; chronological message: 120. -->

# Role Blueprint 1 — Prospective Applicant and Applicant  
## Part 4: Starting, saving, resuming and managing an application draft

This part covers the period between choosing to apply and formally submitting an application. Its purpose is to let applicants complete a complex application safely over time, especially on mobile devices or unreliable connections.

---

## 1. Core principle

An application draft is a private, editable working record. It is **not** an application received by Admissions.

The interface must state this plainly:

> Your application is a draft until you review it and select **Submit application**. Admissions cannot assess a draft.

A draft may be saved automatically, saved manually, resumed on another device, and safely corrected before submission.

---

## 2. Starting an application

### 2.1 Entry points

An authenticated applicant can select `Start application` from:

- A programme detail page
- An eligibility-guidance result
- The applicant home page
- `My applications`

If they started before signing in, the selected programme, intake and eligibility-guidance context are restored after successful authentication.

### 2.2 Start-application confirmation

Before creating the draft, the system presents a short confirmation screen:

> **Start an application**  
> Programme: BSc Computer Science  
> Intake: January 2027  
> Mode: Full-time  
> Campus: Main Campus  
>
> You can save your progress and return later. Your application will not be sent until you submit it.

Actions:

- `Start application`
- `Choose a different programme`
- `Cancel`

The applicant must make this choice deliberately. A programme page’s `Start application` button must not silently create an unwanted draft.

### 2.3 Preconditions

The system checks:

- Applicant is signed in with an active account.
- Required contact method is verified.
- Selected programme offering is published and open for the chosen intake.
- The deadline has not passed in the configured Zambia time zone.
- The applicant is allowed to create another application under the applicable admissions rule.
- There is no existing active draft or submitted application that conflicts with the selected programme/intake/mode.
- Any applicable application fee rule is available.

If a check fails, the applicant sees the reason and valid next action.

Example:

> You already have a draft application for BSc Computer Science, January 2027. Continue that application instead of creating another one.

Actions:

- `Continue existing draft`
- `View my applications`

### 2.4 Multiple applications

The system must use configurable rules rather than assuming one application per person.

Possible institutional rules include:

- One application per programme offering
- A maximum number of active applications per intake
- Permitted first, second and third choices within one application
- Separate undergraduate and postgraduate applications
- Restricted reapplication after a final decision

The applicant interface shows the applicable rule in plain language before they start.

Example:

> You may apply for up to three programme choices in this intake. Your choices will be assessed according to the published admissions rules.

---

## 3. Draft-application shell

After creation, the applicant lands on an application overview page.

### 3.1 Page header

The header always shows:

> Application draft · BSc Computer Science · January 2027

It also shows:

- Application reference, labelled as draft reference where appropriate
- Deadline
- Last saved state
- Application progress
- `Save and exit`
- `Help`

Example saving states:

- `Saving changes…`
- `All changes saved at 14:32`
- `Changes not yet saved`
- `We could not save your latest changes`

A saved-state message must be textual, not colour-only.

### 3.2 Application sections

The default sections are configured by programme, intake and qualification route. A typical application may include:

1. Programme choices
2. Personal details
3. Contact details
4. Citizenship/residency details where required
5. Qualifications and results
6. Supporting documents
7. Funding or sponsorship information where required
8. Programme-specific requirements
9. Application-fee payment
10. Review and declaration

Each section displays one of these states:

| State | Meaning |
|---|---|
| Not started | No saved information yet |
| In progress | Some information saved, but required items remain |
| Needs attention | Invalid, missing, expired or returned information |
| Complete | Current required information is valid |
| Locked | Cannot currently be edited; explanation is provided |
| Not required | Does not apply to the chosen route or programme |

The interface must not label a section `Complete` merely because the applicant visited it.

### 3.3 Progress indicator

Progress shows:

> 4 of 9 required sections complete

It must not imply that the application is ready to submit until every required item, payment/waiver condition and declaration is complete.

Selecting a progress item takes the applicant directly to the relevant section.

---

## 4. Saving behaviour

### 4.1 Automatic saving

The system autosaves valid, non-sensitive field changes after a short pause and when the applicant moves between sections.

For each save:

1. The interface shows `Saving changes…`.
2. The request includes application ID, draft version and idempotency reference.
3. The server validates ownership, application state and permitted fields.
4. The server writes a new draft version or field change.
5. The interface confirms `All changes saved at [time]`.

Autosave must not continuously save incomplete or obviously invalid typing as final data. It may preserve locally entered values within the open screen, but it should wait for an appropriate checkpoint before sending the data.

### 4.2 Manual save

Every editable application page also has:

> `Save and continue later`

This action:

- Saves all valid information in the current section.
- Clearly identifies any invalid or incomplete required fields.
- Returns the applicant to the application overview.
- Shows the latest saved time.

### 4.3 What may never be automatically retained

The system must not persist the following in browser local storage or unprotected drafts:

- Passwords
- Verification codes
- Payment-card details
- Bank credentials
- Other secrets

Files and sensitive form information may be stored only in approved, secure server-side draft storage after explicit save conditions are met.

### 4.4 Failed save

If autosave fails:

> Your latest changes have not been saved. Keep this page open while we retry.

Actions:

- `Retry save`
- `Download entered answers` where safe and approved
- `Return to application overview` only after a warning

The system must not display `Saved` if the server did not confirm persistence.

---

## 5. Resume experience

### 5.1 Applicant home card

An unfinished application appears at the top of applicant home:

> **Continue your application**  
> BSc Computer Science · January 2027  
> 4 of 9 required sections complete  
> Next: Add your qualification results  
> Deadline: 30 September 2026, 23:59 CAT  
> Last saved: today, 14:32  
>
> `Continue application`

The card prioritizes the earliest required deadline, not generic promotional content.

### 5.2 My applications page

This page lists every application the applicant is permitted to see.

Columns or mobile cards show:

- Programme and intake
- Application reference
- Current status
- Current required action
- Deadline
- Last updated
- `Continue`, `View`, or other permitted action

Example:

| Programme | Intake | Status | Next action |
|---|---|---|---|
| BSc Computer Science | Jan 2027 | Draft | Enter qualifications |
| Bachelor of Education | Jan 2027 | Submitted | No action required |

### 5.3 Resume on another device

A draft is server-side, so the applicant can sign in from another device and continue.

The system displays the current saved version, not an uncertain browser copy. If local unsaved changes exist on the original device, they must not silently overwrite the latest server version.

---

## 6. Concurrent editing and version conflicts

An applicant may accidentally open the same application in two browser tabs or on two devices.

### 6.1 Standard conflict response

If the applicant tries to save an older version after another version has already been saved:

> This application was updated elsewhere at 14:36. Your latest changes have not been applied yet.

The interface shows:

- Information updated elsewhere
- The applicant’s unsaved changes
- `Review differences`
- `Reload latest version`
- `Keep editing` where safe

The system must never silently overwrite a newer saved version.

### 6.2 Field-level conflict

Where technically feasible, non-overlapping field changes may merge. Conflicting changes to the same field require the applicant to choose which value to retain.

Example:

> **Mobile number changed in another session**  
> Current saved value: +260 97••• 4567  
> Your entered value: +260 96••• 1234  
>
> `Keep my entered value`  
> `Use saved value`

High-risk data, such as contact method changes, may require re-verification after conflict resolution.

---

## 7. Changing programme or intake

### 7.1 Before substantial completion

The applicant may choose `Change programme` from the overview.

The system explains:

> Changing your programme may change required subjects, documents, fees and deadlines. Some answers may no longer apply.

The applicant selects a new offering, reviews the effect, then confirms.

### 7.2 Impact review

Before the change is applied, show:

- Current programme and new programme
- Sections that remain valid
- Sections that must be reviewed
- New mandatory documents or conditions
- Removed requirements
- Fee or deadline changes
- Whether a new eligibility check is recommended

Actions:

- `Apply change`
- `Keep current programme`

The original selection and change reason are retained in audit history.

### 7.3 After formal submission

A submitted application cannot be changed through this draft feature. Any change after submission follows the controlled clarification/correction workflow in later parts of this blueprint.

---

## 8. Discarding a draft

### 8.1 Applicant action

An applicant can select `Discard draft` from the application overview’s secondary actions.

The confirmation screen states:

> Discard this draft application?  
> This removes your unfinished application for BSc Computer Science, January 2027. You cannot undo this action.

It includes:

- Programme and intake
- Draft reference
- Whether payment has been made
- Whether an application deadline is near
- `Keep draft`
- `Discard draft`

The destructive action is visually distinct but not hidden.

### 8.2 Payment protection

If a payment has been initiated, received or is awaiting reconciliation, the draft cannot simply be discarded.

The user sees:

> This draft has a payment record. Contact Admissions or Finance before it can be withdrawn, so your payment can be handled correctly.

The system creates a support route or controlled withdrawal request rather than losing the payment/application link.

### 8.3 Retention

Discarding hides the draft from normal applicant navigation. It does not necessarily erase institutional records immediately. Retention and deletion follow approved data-retention rules.

The audit record captures:

- Applicant
- Draft
- Date/time
- Reason, if collected
- Payment state
- Resulting retention status

---

## 9. Deadline behaviour

### 9.1 Approaching deadline

The system shows reminders at configured intervals, for example:

> Your application deadline is in 3 days. Complete and submit it before 23:59 CAT on 30 September 2026.

A reminder must clearly distinguish:

- Draft saved
- Ready to submit
- Submitted

It must never imply that saving a draft met the deadline.

### 9.2 Deadline passes while editing

When a deadline passes, the server is authoritative.

If the applicant tries to save or submit after the deadline:

> Applications for this intake closed at 23:59 CAT on 30 September 2026. Your draft was not submitted.

The previously saved draft remains viewable where permitted, but editing and submission are locked unless an authorized extension exists.

The system records the exact server time, not the applicant device clock.

### 9.3 Authorized extension

An authorized admissions role may grant a documented extension for a specific applicant or class of applications. The applicant sees:

> Your application deadline has been extended to 5 October 2026, 17:00 CAT.

The reason is shown only where policy allows. Every extension is auditable.

---

## 10. Notifications and applicant tasks

Draft-related notifications are sent only when meaningful:

- Account verified; application can begin
- Draft started
- Required application deadline approaching
- Payment or document action required
- Draft locked because the deadline passed
- Programme requirement changed materially
- Save/recovery issue requiring applicant action

Routine autosaves must not generate notifications.

Each notification includes:

- Clear event description
- Application reference
- Required action, if any
- Deadline
- Direct secure link to the application
- Responsible office/help route

Email and SMS notices remain neutral:

> You have an update about your application. Sign in to view it securely.

---

## 11. Architecture contract

### 11.1 Application draft states

| State | Meaning |
|---|---|
| `Created` | Draft exists but no section has been meaningfully completed |
| `InProgress` | Applicant has saved information but requirements remain |
| `ReadyForReview` | Required sections appear complete; applicant must still review and declare |
| `Blocked` | A defined condition prevents further progress, such as unverified contact, expired deadline or unresolved payment rule |
| `Locked` | Draft is no longer editable, for example after deadline or submission |
| `Discarded` | Applicant abandoned draft through confirmed workflow |
| `Submitted` | Formal submission complete; controlled post-submission process applies |

### 11.2 Commands

| Command | Main result |
|---|---|
| `StartApplication` | Creates a draft linked to applicant, programme offering and intake |
| `SaveApplicationDraft` | Saves a validated version of draft data |
| `ResumeApplicationDraft` | Retrieves applicant-owned current version |
| `ChangeApplicationProgrammeOffering` | Changes programme/intake after impact review |
| `DiscardApplicationDraft` | Moves eligible draft into discarded state |
| `LockApplicationDraft` | Prevents editing because of deadline, submission or other rule |
| `GrantApplicationDeadlineExtension` | Records an authorized exception and new deadline |

### 11.3 Events

- `ApplicationDraftCreated`
- `ApplicationDraftSaved`
- `ApplicationDraftSaveFailed`
- `ApplicationDraftConflictDetected`
- `ApplicationProgrammeOfferingChanged`
- `ApplicationDraftDiscarded`
- `ApplicationDeadlineApproaching`
- `ApplicationDraftLocked`
- `ApplicationDeadlineExtended`

### 11.4 Audit requirements

The system records:

- Applicant and application identifiers
- Programme offering, intake and requirement version
- Draft version number
- Timestamp and actor
- Significant field changes
- Submission/deadline state
- Programme changes and impact confirmation
- Discard action and reason where available
- Authorized extension, approver and justification
- Conflict detection and selected resolution

Autosave events may be summarized to avoid an unusable audit trail, but material field changes and state transitions must remain traceable.

---

## 12. Part 4 acceptance tests

Part 4 is accepted when:

- A verified applicant can start an application only for an eligible open programme offering.
- Creating a draft requires clear confirmation and does not submit an application.
- The applicant always sees selected programme, intake, deadline, status and last saved state.
- The system distinguishes not started, in progress, needs attention, complete, locked and not required sections.
- Autosave does not falsely claim success and a manual save path is always available.
- A draft can be resumed safely from another device.
- Conflicting edits never silently overwrite newer data.
- Changing programme shows its effect on requirements, documents, fees and deadlines before confirmation.
- A draft with payment activity cannot be discarded without controlled handling.
- Server time, not device time, controls the deadline.
- A deadline extension is authorized, visible and auditable.
- Keyboard, mobile, screen-reader, low-bandwidth and interrupted-save tests pass.

**Please approve Part 4: Starting, saving, resuming and managing an application draft.** After approval, I will continue with Part 5: **completing application sections—personal details, contact information, citizenship/residency, qualifications and programme choices.**

---

## Following user responses before the next design record

### User message 0121

approved you can move to part 5
