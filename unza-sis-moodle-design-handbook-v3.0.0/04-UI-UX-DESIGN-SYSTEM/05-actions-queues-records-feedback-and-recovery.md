# Cross-Blueprint Implementation Set, Part 2C — Actions, queues, records, feedback and recovery components

> Approved cross-blueprint implementation contract.


## 14.21 `UI-ACTION-001` — Buttons and action hierarchy

### Purpose

Make it immediately clear what will happen, which action is primary, and whether an action is safe, reversible or high impact.

### Approved button types

| Type | Use | Example |
|---|---|---|
| Primary | One main next step for the current task | `Submit application` |
| Secondary | Helpful alternative action | `Save draft` |
| Tertiary/text action | Low-emphasis navigation or contextual action | `View policy` |
| Destructive | Irreversible or harmful action | `Withdraw application` |
| Approval/authority action | Controlled decision after review | `Approve and sign` |

### Rules

- One primary action per task region.
- Labels state the action and object, not `Continue`, `Click here` or `OK`.
- A destructive action is never placed beside a primary action without visual separation.
- An approval action must show its authority and consequence before confirmation.
- Buttons must not be icon-only for important actions.
- Buttons meet accessible touch-target requirements and work by keyboard.

### Loading state

After activation:

> `Submitting application…`

The system blocks repeated activation, preserves the task context, and announces progress to screen readers.

A button is not disabled without explanation. Example:

> `Release results` is unavailable until Result Board approval is recorded.

---

## 14.22 `UI-CONFIRM-001` — Confirmation and consequence preview

### Purpose

Prevent accidental high-impact actions while avoiding unnecessary confirmation for harmless routine actions.

### Use confirmation for

- Formal submission
- Withdrawal/cancellation
- Refund approval
- Official result release
- Award/certificate authorization
- Regulatory submission
- Role grant/revocation
- Deletion/disposal under retention policy
- Escalation or safeguarding action
- Disciplinary decision
- Production configuration change

### Do not use confirmation for

- Opening a record
- Saving a normal draft
- Applying a table filter
- Downloading a non-sensitive public template
- Moving between form steps

### Required content

- Clear action statement
- Who/what is affected
- Material consequence
- Reversibility or irreversibility
- Exact final action label
- Cancel/return route
- Required reason or declaration where applicable

Example:

> **Release official results for Semester 2, 2026?**  
> 2,430 students will be able to view approved results.  
> This action cannot be undone. Corrections require the controlled result-amendment process.  
> `Release official results` · `Return`

A confirmation modal is not used for long review work. Use a dedicated review page instead.

---

## 14.23 `UI-STATUS-001` — Status label and status explanation

### Purpose

Show the current workflow state in plain language and always connect it to meaning and next action.

### Anatomy

- Short written status
- Optional semantic icon/colour
- Status explanation
- Last updated time
- Responsible owner/office where appropriate
- Next action or expected update

### Examples

> **Verification in progress**  
> We are checking your transcript. No action is needed unless we contact you.  
> Last updated: 25 August, 14:32.

> **Awaiting your response**  
> Provide the requested clarification by 3 September.  
> `Respond now`

### Rules

- Never use only `Pending`, `Open`, `Processing`, `Failed` or `Completed` as final wording.
- Status vocabulary is defined per workflow state machine and versioned.
- A status label is not editable by ordinary users.
- Status colour is supplementary; text remains the authority.

---

## 14.24 `UI-TASK-001` — Actionable task card

### Purpose

Present one assigned item that requires attention without turning a home page into a wall of cards.

### Allowed contexts

- My tasks
- Work queues
- Deadline/reminder lists
- Assigned reviews/actions
- Student application/registration steps

### Anatomy

- Task title
- Related person/programme/process
- Why it requires action
- Current state
- Due date/urgency
- Assigned owner, where relevant
- One primary action
- Optional secondary view action

Example:

> **Review submitted evidence**  
> BSc Computer Science annual review  
> Assessment moderation evidence was submitted yesterday.  
> Due today  
> `Review evidence`

### Rules

- Cards represent actions, not every available feature.
- No decorative metrics or unrelated charts inside a task card.
- Primary action does not perform irreversible work directly; it opens the review context where needed.
- On mobile, cards remain vertically readable and actions retain text labels.

---

## 14.25 `UI-RECORD-001` — Case/record summary page

### Purpose

Provide a consistent view of an application, student request, finance case, quality review, finding, integration case or other governed record.

### Fixed page regions

1. Title and record reference
2. Current status and explanation
3. Key facts relevant to active role
4. Primary permitted actions
5. Timeline/history
6. Related records
7. Supporting documents/evidence
8. Audit/history access where permitted
9. Help/contact route

The screen is role-aware. A Counsellor, Dean and Adviser can open related student-support information but see different content according to authorization.

### Record header example

> **Application APP-2026-004218**  
> Status: Clarification required  
> Applicant action due: 3 September 2026  
> `Request clarification` · `View submitted evidence`

### Rules

- Do not place every field from the database on the summary page.
- Put related technical IDs behind a permitted “Details” disclosure.
- Mask sensitive identifiers unless full display is necessary.
- Ensure primary actions show why they are enabled/disabled.

---

## 14.26 `UI-TIMELINE-001` — Case and audit timeline

### Purpose

Show what happened, in order, without forcing users to infer workflow history from scattered notes.

### Timeline entry anatomy

- Date/time in local institutional time
- Actor/role, where permitted
- Event title
- Plain-language outcome
- Linked evidence or action
- Delivery/confirmation state where relevant

Example:

> **25 August, 14:32 — Applicant**  
> Submitted requested transcript replacement.  
> Security check passed; verification is now in progress.

### Visibility rules

- Student timeline contains student-visible events only.
- Staff timeline includes role-appropriate operational history.
- Counselling and safeguarding timelines remain restricted.
- Audit events are not all exposed as a general timeline.

### Non-goals

- Do not use a timeline as an editable chat thread.
- Do not let ordinary users edit past workflow events.
- Do not show technical events without a human-readable summary.

---

## 14.27 `UI-TABLE-001` — Governed data table

### Purpose

Support comparison, sorting and review of multiple records, especially staff queues.

### Required anatomy

- Table title and result count
- Plain-language description
- Column headings
- Sort state
- Filters
- Row action
- Pagination
- Loading/empty/error state
- Download/export action only where authorized

### Rules

- Use a table only when rows share comparable columns.
- Do not hide a necessary action in a hover-only menu.
- Keep priority columns visible.
- Do not overload with more columns than the decision requires.
- Sensitive columns are hidden by default and require permission to reveal.
- Bulk actions are limited to safe, homogeneous actions.

### Mobile behaviour

On narrow screens, each row becomes a labelled record card:

> **Chanda M.**  
> Programme: BSc Computer Science  
> Status: Awaiting adviser response  
> Due: 3 September  
> `Review`

No critical data may be accessible only through horizontal scrolling.

---

## 14.28 `UI-SEARCH-001` — Permission-aware search

### Purpose

Help authorized users locate a student, application, course, case, invoice, review or document without enabling institution-wide browsing.

### Search input

- Visible label: `Search students, applications or references`
- Scope indicator
- Search hint
- Result categories
- No-result/restricted-result explanation

### Rules

- Results are filtered by active role, scope and purpose.
- Search indexing respects classification and retention.
- Search previews minimize personal data.
- Partial identifiers may be allowed by policy; sensitive identifiers are masked.
- The system never tells an unauthorized user that a hidden record exists.

No-result message:

> No records match your search in your current workspace and scope.

### Prohibited uses

- Global search across counselling notes
- Unrestricted financial-account search for academic users
- Search-as-you-type logging of sensitive free text
- Search results that reveal other users’ access restrictions

---

## 14.29 `UI-FILTER-001` — Filter, sort and saved view

### Purpose

Let a user narrow a governed queue without changing the authoritative data or hiding important constraints.

### Required behaviour

- Display active filters as removable text chips.
- State result count after filtering.
- Retain filters during safe navigation.
- Allow approved saved views only for the user/role scope.
- Clearly state when no filter is active.
- Use server-side filtering/pagination for large datasets.

Example:

> Showing 18 of 247 applications  
> Filters: `BSc Computer Science` · `Clarification required` · `Due this week`

### Rules

- Filters do not bypass access control.
- A saved view stores filter/sort preferences, not cached sensitive records.
- The export must show the same filters used.

---

## 14.30 `UI-NOTIFY-001` — In-system notification

### Purpose

Deliver an authoritative workflow update and route the recipient to the exact next action.

### Anatomy

- Event title
- Plain-language explanation
- Required action, if any
- Deadline
- Direct secure link
- Responsible office
- Delivery/read state where relevant

Example:

> **Clarification required for your application**  
> Upload a clearer copy of your qualification certificate by 3 September.  
> `Respond to clarification`

### Rules

- In-system notification is authoritative.
- Email/SMS are delivery channels only.
- A notification informs; a task requires action. They are linked but distinct.
- Mandatory academic, financial, safety and regulatory notices cannot be disabled.
- Email/SMS previews contain no sensitive details.

---

## 14.31 `UI-EMPTY-001` — Empty state

### Purpose

Explain when there are no records and guide the user without filling the page with decorative content.

### Approved variants

| Situation | Example |
|---|---|
| No assigned work | `You have no tasks due today.` |
| Filter returns nothing | `No applications match these filters. Clear a filter or change your search.` |
| New user/no records | `You have not started an application yet.` |
| Data unavailable | `This information is not available right now. Try again later.` |
| Permission-restricted | `There are no records available in your current role and scope.` |

An empty state must not imply success if data failed to load.

---

## 14.32 `UI-LOAD-001` — Loading, refresh and stale-data state

### Purpose

Communicate that data is being retrieved or refreshed, and whether the displayed value may be old.

### Rules

- Use lightweight placeholders only where layout is known.
- Never show fake content or fake charts while loading.
- State data freshness for material records, metrics and integrations.
- Allow safe manual refresh where appropriate.
- Distinguish `Loading`, `Refresh failed`, `Last confirmed data`, and `No data`.

Example:

> **Last confirmed update: 25 August, 14:32**  
> Current refresh failed. The information below may be out of date.  
> `Try again`

A stale result cannot be used for a high-impact final decision without the configured policy allowing it.

---

## 14.33 `UI-ERROR-001` — Recoverable error panel

### Purpose

Explain a problem, protect entered work and give the user a safe next step.

### Required message structure

1. What happened
2. What was not completed
3. What information was preserved
4. What the user should do next
5. Reference number where support may be needed

Example:

> **We could not save your payment query.**  
> No request was sent, and your written explanation is still on this page.  
> Check your connection and try again.  
> Reference: `ERR-FIN-20418`

### Error categories

- Validation error
- Permission/access error
- Connection error
- Provider/integration delay
- Concurrent-change conflict
- Temporary service problem
- Unavailable feature
- Unexpected error

Error messages must not expose stack traces, credentials, internal infrastructure or another user’s data.

---

## 14.34 `UI-ACCESS-001` — Access denied and unavailable action

### Purpose

Explain a blocked action without revealing protected information or blaming the user.

### Examples

> You cannot approve this result because your examination authority is not active for this course and period.

> This counselling information is restricted and is not required for your current role.

### Required behaviour

- State that action was not completed.
- Explain the minimum safe reason.
- Provide appropriate route: switch workspace, request access, contact responsible office.
- Do not reveal the existence/details of a hidden record.
- Log denied sensitive access attempts according to policy.

No generic message:

> 403 Forbidden.

---

## 14.35 `UI-BULK-001` — Controlled bulk action

### Purpose

Allow efficient staff work only where the same safe action can apply to each selected record.

### Preconditions

- Same record type and compatible state
- User has permission for every selected record
- Action is reversible or policy-approved for bulk operation
- Selection count is shown
- Impact preview is available
- High-risk actions require individual review or a configured batch authority

Example:

> **Send reminder to 24 evidence owners**  
> This will send the approved reminder template to each owner with an overdue evidence request.  
> `Send 24 reminders`

Bulk actions must not be used for:

- Academic-result approval
- Student disciplinary decision
- Counselling case closure
- Refund approval
- Programme admission/rejection without governed batch review
- Sensitive record deletion

---

## 14.36 Shared component acceptance requirements

Part 2C is accepted only when:

- Action labels name the real outcome and prevent duplicate execution.
- High-impact actions include consequence preview and deliberate confirmation.
- Every status explains meaning, owner, time and next step.
- Queues and record pages expose only role-appropriate facts.
- Search, filters and exports preserve permission boundaries.
- Tables adapt safely to mobile.
- Notifications route to tasks without leaking sensitive detail.
- Empty, loading, stale, error and access-denied states are distinguishable.
- Bulk work is tightly limited to safe, compatible actions.
- No component adds decorative or “AI generated” visual features without a documented user purpose.
