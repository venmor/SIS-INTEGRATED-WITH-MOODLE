# Cross-Blueprint Implementation Set, Part 2A — UI system foundations and input components

> Approved cross-blueprint implementation contract.


This starts a multi-part component catalogue. It is the approved boundary for frontend work: agents and developers build only the documented components and states, then compose them into the approved role screens.

No “creative” extra dashboard cards, animated illustrations, chatbot panels, gradients, floating action buttons, decorative charts or generic admin templates are permitted unless separately designed and approved.

## 14.1 Design-system scope

The system uses a restrained institutional design system for transactional work.

It must feel:

- Clear, calm and professional
- Useful before decorative
- Familiar across applicant, student, staff and leadership workspaces
- Mobile-capable and low-bandwidth conscious
- Accessible without a separate “accessible version”
- Configurable for institutional brand, without hard-coding a university identity

It must not feel:

- Like a consumer social app
- Like a generic AI-generated administration template
- Like a dense technical back-office system for student-facing work
- Like a marketing landing page inside academic workflows

## 14.2 Component contract required for every component

Every component entry in this catalogue must define:

| Field | What developers must know |
|---|---|
| Component ID | Stable identifier, e.g. `UI-FIELD-001` |
| Purpose | The user problem it solves |
| Allowed contexts | Which screen/workflow types may use it |
| Explicit non-uses | Where it must not be used |
| Anatomy | Required visible parts |
| Content rules | Labels, helper text, wording and data format |
| States | Default, focus, filled, error, disabled, loading and others |
| Interaction | Keyboard, pointer, touch and timing behaviour |
| Validation | When/how validity is checked |
| Error/recovery | Exact behaviour after a problem |
| Accessibility | Semantics, focus, screen-reader and contrast requirements |
| Responsive behaviour | Small-screen adaptation |
| Data/audit | What it may persist, log or avoid logging |
| Acceptance tests | What must be verified before release |

A component without this contract is not approved for production use.

## 14.3 Global visual rules

### Layout

- Use one primary task per page.
- Use a clear page title and short task explanation.
- Use consistent content width; reading/form pages must not stretch excessively on wide screens.
- Place primary actions at the end of the task and, where necessary, in a persistent but non-obscuring mobile action area.
- Do not create nested cards simply to make a page look modern.
- Use cards only to group genuinely separate records, decisions or tasks.
- Use tables only when comparison across rows is needed; transform them into labelled record cards on narrow screens.

### Colour and status

Colour reinforces a written status; it never carries meaning alone.

Approved semantic meanings are configurable but consistent:

- Informational
- Success/confirmed
- Attention required
- Warning
- Error/blocked
- Neutral/draft

A “red” state must state why and what the user can do next.

### Motion

- No animation is required to understand a workflow.
- Motion is brief and functional: opening a panel, confirming save, showing progress.
- Respect reduced-motion preference.
- No automatic looping animation on transactional screens.
- No confetti, celebratory effects or distracting visual reward for routine administrative actions.

### Content style

- Use sentence case: `Submit application`, not `SUBMIT APPLICATION`.
- Name the real action: `Send support invitation`, not `Continue`.
- Use plain language first; define institutional terms where necessary.
- Never expose internal codes as the main explanation.
- Do not blame the user for system or provider failure.

---

# Form foundation

## 14.4 `UI-FORM-001` — Task form

### Purpose

Collect information required to complete one defined institutional action, such as applying, registering, submitting evidence, requesting support or approving a decision.

### Allowed contexts

- Applicant and student forms
- Staff workflow forms
- Controlled approvals
- Evidence submission
- Support requests
- Configuration forms with role protection

### Must not be used for

- Browsing records
- Dashboard filtering
- Simple confirmation actions with no additional information
- Bulk change actions
- Display-only case timelines

### Anatomy

1. Page title
2. One-sentence purpose
3. Required-field explanation
4. Form sections with meaningful headings
5. Field label, control, helper text and error region
6. Page-level error summary when validation fails
7. Save-draft action where workflow permits
8. Primary action
9. Safe secondary action: cancel, return or save and exit
10. Support/contact route

### Form behaviour

- Save entered content locally in the current secure session while the user is working.
- Persist a server draft only where the workflow explicitly supports drafts.
- Do not validate every field on every keystroke.
- Validate when the user leaves a field where immediate correction is useful, and again on submission.
- After a failed submission, move focus to the error summary.
- The summary lists all errors and links to each affected field.
- Retain valid entries after validation or recoverable system errors.
- Never clear a password field after unrelated errors unless security policy requires it.

### Buttons

- One primary action per form: `Submit application`, `Save evidence`, `Approve decision`.
- Secondary actions visually quieter: `Save draft`, `Cancel`.
- Destructive actions are visually and textually distinct: `Withdraw application`.
- Disabled buttons state why through nearby text; do not rely on a disabled button without explanation.

---

# Field components

## 14.5 `UI-FIELD-001` — Single-line text field

### Purpose

Collect a short, plain text value: name, city, reference, course title search or reason label.

### Anatomy

- Visible label
- Required indicator if applicable
- Input control
- Optional helper text
- Optional character guidance
- Error message region
- Optional clear button only when it reduces effort

### Content rules

- Labels name the value, not the instruction: `First name`, not `Enter first name`.
- Helper text gives an example only when useful.
- Placeholder text never replaces a label.
- Character limit is shown when it matters.

### States

- Empty
- Focused
- Filled
- Read-only
- Disabled
- Validation warning
- Error
- Loading/pre-filled
- Success confirmation only where meaningful

### Error behaviour

Example:

> **Student number**  
> Enter a valid student number, for example `202612345`.

Do not use:

> Invalid input.

### Accessibility

- `<label>` is programmatically linked to the input.
- Error text is programmatically associated with the input.
- Focus indicator remains visible and unobscured.
- Keyboard focus order follows visual/task order.
- Error is announced without forcing screen-reader users away from their current work.

### Responsive behaviour

- Field uses full available width on mobile.
- Label and helper text remain above/below the input; never collapse into icon-only help.

---

## 14.6 `UI-FIELD-002` — Phone-number field

### Purpose

Collect a contact number in a format suitable for the configured country/region while preserving a clear international representation.

### Anatomy

- Label: `Mobile number`
- Country/region selector or fixed institutional default
- Telephone input
- Format example
- Verification state, when relevant
- Change-number action where verified number exists

### Default behaviour

For a Zambian-default institution, show:

> Country/region: Zambia (+260)  
> Mobile number: `097 123 4567`

The stored value is normalized to an international format, for example `+260971234567`, but the user sees a familiar local format.

The country/region is configurable; no source code assumes Zambia.

### Validation

Validate after the user leaves the field or submits the form:

- Required/optional state
- Valid number length/pattern for selected region
- Unsupported characters
- Duplicate/contact conflict where relevant
- Whether the number is already verified

The system must not reject a legitimate international number merely because it is unfamiliar.

### Verification interaction

After a valid number is saved:

> We will send a verification code to **+260 97••• 4567**.  
> `Send code`

Code-entry page:

- Six separate visual cells or one accessible numeric field with clear label
- Paste allowed
- Password-manager/autofill support where appropriate
- Countdown displayed in text
- `Resend code` enabled only under configured rate limit
- `Use another number` preserves other form data

### Error and recovery

| Situation | User message | Behaviour |
|---|---|---|
| Number invalid | “Enter a valid mobile number for the selected country/region.” | Keep entered number |
| Code incorrect | “That verification code does not match. Try again.” | Do not erase remaining form data |
| Code expired | “This code has expired. Request a new one.” | Enable resend under policy |
| SMS delayed | “Your code may take a few minutes. Do not request another unless it does not arrive.” | Show alternative verified route where available |
| Too many attempts | “For your security, try again later or use another verification method.” | Record rate-limit/security event |
| Number changes after verification | “Changing this number will require verification again.” | Preserve old verified record until new verification succeeds |

### Non-goals

- Do not use a telephone field as proof of identity by itself.
- Do not expose full phone numbers in staff queues unless required.
- Do not put verification codes in app logs or audit displays.

---

## 14.7 `UI-FIELD-003` — Password creation and sign-in field

### Purpose

Support secure authentication without making account creation and recovery unnecessarily difficult.

### Anatomy

- Label
- Password field
- Show/hide password control with accessible label
- Password manager support
- Requirement guidance
- Strength/requirement feedback, if configured
- Caps-lock warning where detectable
- Forgot-password route on sign-in only

### Password creation behaviour

Before typing, show the institution’s current policy in plain language, for example:

> Use at least 12 characters. A phrase with several words is easier to remember and stronger than a short complex word.

Rules are configurable. The UI never hard-codes a fixed minimum or particular special-character requirement.

As the user types, show satisfied/unsatisfied requirements without exposing password content:

- At least configured minimum length
- Not on known compromised-password list, where supported
- Does not match prohibited personal/account information
- Meets configured password policy

Do not use vague strength labels alone such as `Weak`.

### Sign-in behaviour

- Allow password managers and paste.
- Do not block copy/paste into password fields.
- Preserve email/username after failed sign-in.
- Do not identify whether a specific account exists in public error messages.
- Provide accessible account-recovery route.

Neutral failure message:

> We could not sign you in with those details. Check them and try again, or reset your password.

### Error and recovery

| Situation | Behaviour |
|---|---|
| Password does not meet policy | Identify unmet policy rule without exposing value |
| Password confirmation differs | “The passwords do not match.” |
| Caps Lock appears active | Non-blocking warning |
| Too many failed attempts | Rate-limit safely; offer recovery without disclosing account existence |
| Password reset link expired | Explain expiry and offer a fresh request |
| User changes password during active session | Revoke/refresh other sessions according to policy and explain outcome |
| Accessibility need prevents use of image challenge | Provide non-image accessible verification route |

### Explicit non-goals

- No forced periodic password changes unless configured security policy requires them.
- No image-only CAPTCHA as the sole access/recovery method.
- No password shown in audit records, telemetry, logs or support tickets.

---

## 14.8 `UI-FIELD-004` — Structured choice field

### Purpose

Let a user select a defined option: programme, intake, course, reason, role, payment method or decision outcome.

### Approved variants

- Radio group: 2–5 mutually exclusive options where all should be visible.
- Select/dropdown: larger but finite list.
- Permission-aware search-and-select: large authorized record lists.
- Checkbox group: multiple independent choices.

### Rules

- Never use a dropdown for two visible yes/no options.
- Never use a free-text field where a governed option catalogue exists.
- Do not preselect a high-impact decision such as `Approve`, `Withdraw`, `Disciplinary finding` or `Close case`.
- Explain conditional effects immediately after selection.

Example:

> **Application type**  
> ○ Undergraduate  
> ○ Postgraduate taught  
> ○ Postgraduate research  
>   
> Choosing postgraduate research will ask for proposed supervisor and research information.

### Search-and-select

For people, programmes, courses and records:

- Search is permission-aware.
- Result row includes enough context to avoid wrong selection.
- Search returns no inaccessible result or suggestion.
- User confirms selection before proceeding.
- Selected value can be cleared or changed before submit.

---

## 14.9 `UI-FIELD-005` — Date and time field

### Purpose

Collect a date or deadline without ambiguity.

### Behaviour

- Accept typing and accessible date picker.
- Display local date format configured by institution.
- Include day, month and year labels; never rely only on placeholder order.
- State local time zone for deadlines and appointments.
- For long date ranges, provide start and end separately.
- Prevent impossible dates and clearly explain deadline constraints.

Example error:

> **Supporting-document date**  
> Enter a date on or before 25 August 2026.

Do not automatically change a typed date to a different interpretation without confirmation.

---

## 14.10 Form fields: privacy, logging and analytics

Field interaction telemetry must be limited to operational need, such as:

- Form started/completed
- Validation-error category
- Save failure
- Upload failure
- Abandonment at step level, using privacy-preserving aggregation

It must not collect:

- Password value
- Verification code
- Counselling narrative
- Disability evidence
- Full financial reference
- Unnecessary free-text content
- Keystroke-level behavioural profiling

## 14.11 Component acceptance requirements

This first component set is accepted only when:

- Every form has labels, help, error summary, data retention and safe actions.
- Phone numbers are region-configurable, normalized safely and verified without losing form progress.
- Password fields support managers, paste, recovery and accessible authentication.
- Every field has defined states, error text and keyboard/screen-reader behaviour.
- No placeholder substitutes for a label.
- High-impact options are not silently preselected.
- Form telemetry avoids sensitive values.
- These components are the only approved base components for short text, phone, password, controlled choice and date/time input until a new component is designed.
