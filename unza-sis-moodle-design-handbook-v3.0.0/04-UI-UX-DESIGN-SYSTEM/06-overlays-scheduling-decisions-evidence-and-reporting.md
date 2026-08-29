# Cross-Blueprint Implementation Set, Part 2D — Controlled overlays, scheduling, decisions, evidence and accessible reporting

> Approved cross-blueprint implementation contract.


## 14.37 `UI-DIALOG-001` — Modal dialog

### Purpose

Handle a short, focused interruption that does not require a full page: confirmation, compact choice, session warning or short clarification.

### Allowed uses

- Confirming a high-impact action
- Confirming discard of unsaved changes
- Selecting a narrow option
- Session-expiry warning
- Short explanation before external redirect

### Must not be used for

- Long forms
- Evidence review
- Decision packages
- Complex case notes
- Multi-step tasks
- Full-page tables
- Primary mobile data entry

### Behaviour

- Move keyboard focus to the dialog heading on open.
- Trap focus inside while open.
- Close using visible `Cancel`, Escape where safe, or completion.
- Return focus to the original trigger on close.
- Do not close a destructive confirmation by clicking outside it.
- On small screens, render as a full-height focused page/panel when needed.

## 14.38 `UI-PANEL-001` — Side panel

### Purpose

Show supporting detail while allowing a staff user to keep their queue context.

### Allowed uses

- Record preview
- Short history
- Filter controls
- Assignment details
- Non-critical evidence metadata

### Rules

- The panel cannot contain the only path to a high-impact approval.
- It has a visible title, close action and full keyboard support.
- On mobile, it becomes a full-page view.
- Closing does not lose unsaved content without the approved leave prompt.

---

## 14.39 `UI-CALENDAR-001` — Appointment and deadline calendar

### Purpose

Display appointments, review meetings, examination events and deadlines in a time-aware, accessible way.

### Calendar types

| Type | Used by |
|---|---|
| Personal appointment calendar | Student, Adviser, Counsellor, Welfare Officer |
| Operational deadline calendar | QAO, Examinations, Finance, Admissions |
| Committee/decision calendar | Leadership, QA, Senate/Graduation staff |
| Academic timetable view | Student, Lecturer, Tutor |

A calendar view does not itself create authority to alter an academic deadline, exam or appointment.

### Required anatomy

- Date range and local time zone
- Calendar title
- Available-date controls
- List/agenda alternative
- Event title and time
- Event status
- Attendee/privacy treatment
- Create/reschedule/cancel actions only where permitted

### Accessibility

- A full agenda/list view is always available.
- Keyboard users can move by date and event.
- Screen readers hear date, time, event title and availability.
- Colour is not the only way to distinguish event type.
- Time-zone changes are stated rather than silently applied.

---

## 14.40 `UI-APPOINT-001` — Appointment scheduler

### Purpose

Allow a student or staff member to request, book, cancel or reschedule a service appointment without double booking or privacy leakage.

### Booking flow

1. Select service and purpose.
2. Select mode: in-person, phone, online or configured option.
3. Select accessible available date/time.
4. Confirm contact preference and any permitted accommodation need.
5. Review booking.
6. Confirm appointment.
7. Receive in-system confirmation and neutral delivery notification.

### Slot handling

- A chosen slot receives a temporary hold.
- Availability is rechecked on confirmation.
- An expired hold returns the user to available slots.
- The system never reveals who holds or booked another slot.
- Cancellation/rescheduling policy is shown before confirmation.

### Student confirmation

> **Appointment confirmed**  
> Student Welfare guidance  
> Tuesday, 3 September · 10:00–10:30 CAT  
> Mode: online  
> `Add to calendar` · `Reschedule` · `Cancel appointment`

### Error handling

| Situation | Behaviour |
|---|---|
| Slot taken before confirmation | Explain; preserve service/purpose; show alternatives |
| Service capacity unavailable | Provide waiting-list state and urgent route where relevant |
| Online joining link unavailable | Keep appointment, alert service, provide contact route |
| Cancellation deadline passed | Explain policy and offer contact option |
| Staff calendar sync failure | Do not claim external-calendar entry succeeded |

---

## 14.41 `UI-DOCVIEW-001` — Secure document and evidence viewer

### Purpose

Review uploaded evidence, controlled records and committee documents without uncontrolled download, exposure or alteration.

### Required anatomy

- Document title and version
- Classification
- Source/submitted by
- Date/time
- Review state
- Page/section navigation
- Zoom and accessible-text alternative where possible
- Download/print actions only where permitted
- Related evidence/record link
- Verification or annotation action where authorized

### Rules

- Viewing access is checked separately from download/export access.
- Watermarking or viewer notice is applied where configured.
- Downloaded extracts are labelled and logged.
- The viewer does not let a reviewer edit the original uploaded file.
- Annotation creates a separate review note/evidence link, not a modified document.
- Restricted counselling, safeguarding and disciplinary documents follow their stricter record controls.

### Low-bandwidth behaviour

- Show file size before load.
- Allow page-by-page loading where safe.
- Provide structured metadata even when preview cannot load.
- State clearly if the document cannot be rendered and offer permitted alternative access.

---

## 14.42 `UI-DECISION-001` — Decision, approval and sign-off control

### Purpose

Record an authorized institutional decision after appropriate review: admission recommendation, result release, award confirmation, refund, quality closure, regulatory sign-off or production change.

### Decision screen anatomy

- Decision title and reference
- Authority basis
- Scope
- Evidence package
- Options
- Consequence of each option
- Required reason/rationale
- Required declaration
- Delegation/conflict status
- Effective date
- Audit preview

### Decision options

The system uses configured options. It does not assume every decision has approve/reject.

Examples:

- Approve
- Approve with conditions
- Return for clarification
- Refer
- Decline with reason
- Defer until named date
- Record recommendation only
- Confirm receipt only

### Sign-off rules

- The system validates active role, scope, delegation and effective date immediately before sign-off.
- A decision package is frozen/versioned before sign-off.
- Required multiple approvals are sequential or parallel according to configured workflow.
- A signatory sees exactly which version they are signing.
- A later document/data change invalidates pending sign-offs where policy requires.
- An approved decision is never overwritten; correction creates a linked superseding decision.

### Digital signature wording

> I confirm that I have reviewed the stated evidence and make this decision within my assigned authority.

The system records signatory, role, scope, time, version, authority source and decision rationale.

---

## 14.43 `UI-CHART-001` — Governed data visualization

### Purpose

Show a relationship more clearly than a table while preventing charts from becoming decorative or misleading.

### Allowed chart use

- Trend over time
- Comparison across a small number of categories
- Composition where whole/part relationship matters
- Distribution for authorized quality review
- Progress against an approved target

### Required chart anatomy

- Plain-language title stating measure and period
- Metric definition/version
- Population/scope
- Data date/freshness
- Source
- Visible values or accessible data table
- Limitation/caveat
- Certified-report link
- Filter/scope context

Example:

> **First-year continuation rate, 2024–2026**  
> Measure: registered first-year entrants active in the following academic year.  
> Data refreshed: 25 August 2026.  
> `View accessible data table`

### Rules

- Do not use charts where one number or a short table is clearer.
- Do not use 3D effects, decorative gauges, unlabelled pies or rainbow colour scales.
- Do not rely on red/green alone.
- Do not display small, identifiable groups.
- Observed outcomes and targets/forecasts are visibly different.
- A chart cannot be the only source of exact values.

### Accessibility

Every chart has an equivalent table and concise written insight. Screen readers can access title, summary, values and data limitations.

---

## 14.44 `UI-METRIC-001` — Certified metric card

### Purpose

Display one approved institutional measure with enough context to prevent misinterpretation.

### Anatomy

- Metric name
- Current certified value
- Comparison period/value where useful
- Population and period
- Data freshness
- Metric version
- Status: certified, draft, stale, refresh failed, superseded
- Limitation
- Link to certified report

Example:

> **Registration completion**  
> 91.2% · Semester 2, 2026  
> Certified metric REG-1.3 · refreshed 25 August  
> 4% of records await reconciliation.  
> `View report`

A metric card is not editable. It cannot show a hand-entered replacement number.

---

## 14.45 `UI-A11Y-001` — Screen accessibility verification contract

Every screen assembled from these components must pass:

- Keyboard-only completion of the primary task
- Visible, unobscured focus
- Correct heading hierarchy and landmarks
- Form labels/instructions/errors programmatically associated
- Status changes announced without relying on focus movement
- Sufficient contrast and no colour-only meaning
- Text resize/reflow without lost functionality
- Accessible table/chart/document alternative
- Touch targets at least WCAG 2.2 minimum where applicable
- Reduced-motion support
- Accessible authentication and account recovery
- Consistent help location
- No keyboard trap except intentional modal behaviour with exit route

The test suite must include screen-reader testing of real workflows, not only automated accessibility scans.

---

## 14.46 `UI-CONTENT-001` — UI content governance

### Purpose

Ensure labels, messages, templates and status explanations remain professional, consistent and approved.

Content records are versioned and include:

- Content identifier
- Message/template text
- Audience and role
- Workflow/action context
- Channel: in-system, email, SMS, document
- Classification
- Required variables
- Approval owner
- Effective dates
- Translation readiness
- Retirement/supersession history

### Writing rules

- State what happened.
- State whether the user must act.
- State what happens next.
- Avoid blame and technical jargon.
- Do not imply a decision before it is official.
- Do not call support surveillance.
- Do not use AI-generated language without human approval where messages are institutionally material.

### Prohibited language examples

| Avoid | Use instead |
|---|---|
| `You are high risk` | `Your adviser would like to offer support with recent course activity.` |
| `Error 500` | `We could not complete this request right now. Try again later.` |
| `Pending` | `Verification in progress. No action is needed unless we contact you.` |
| `Failed` | `Payment was not confirmed. No money was recorded on your account.` |
| `Invalid user` | `We could not sign you in with those details.` |

## 14.47 Part 2D acceptance requirements

Part 2D is accepted only when:

- Modals and panels are used only for their approved scope.
- Appointments prevent double booking and preserve privacy.
- Documents can be viewed, classified and audited without uncontrolled alteration or download.
- Every high-impact decision is tied to authority, a frozen package, rationale and audit.
- Charts and metric cards display definition, source, freshness, limitations and accessible alternatives.
- Every screen meets the accessibility verification contract.
- Institutional UI content is versioned and governed.
- No unapproved component, decorative pattern or generic AI-style interface is introduced.

**The shared UI component and microinteraction catalogue is complete.**
