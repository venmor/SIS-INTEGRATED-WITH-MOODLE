# Section 19, Part 1 — UI/UX Design Constitution

> Approved Section 19 engineering foundation.


This is the visual and experience rulebook for both human developers and AI agents. It governs every page before any component is coded.

## 19.1 Core principle

> The interface exists to help a person complete a real university task with confidence.

A page is successful when the user can answer:

1. Where am I?
2. What is happening?
3. What do I need to do now?
4. What happens after I act?
5. Where can I get help?

If the page cannot answer these, it is not ready.

## 19.2 Visual character

The system must feel:

- Institutional, calm and trustworthy
- Clear before decorative
- Modern but not trendy
- Human-centred, not technical-user-centred
- Consistent across applicant, student and staff workspaces
- Dense enough for professional work without becoming crowded

The system must avoid:

- Gradient backgrounds
- Oversized welcome banners
- Random illustrations
- Decorative metric cards
- “Glass” effects
- Excessive rounded cards
- Bright status colours everywhere
- Unexplained charts
- Floating chatbot buttons
- Icon-only core actions
- AI-style phrases such as “How can I assist you today?”

## 19.3 Layout rules

### Desktop

- Persistent left navigation for staff workspaces.
- Focused top navigation for applicant/student portal.
- Main content width: readable and task-focused, not edge-to-edge.
- One page title and one primary task area.
- Secondary information appears below or beside the main task only when useful.
- Use a two-column layout only when both columns are necessary to complete the task.

### Mobile

- Navigation collapses into a clear menu.
- Primary actions remain visible but never cover content.
- Tables become labelled record cards.
- Long forms remain one-column.
- No critical action requires hover.
- No workflow requires horizontal scrolling.

## 19.4 Page hierarchy

Every page uses this order:

```text
Workspace/context
Page title
Short explanation
Current status or key facts
Primary task/action
Supporting information
History/evidence/help
```

Example:

> **Student portal · 2026 Academic Year**  
> # Course registration  
> Choose your permitted courses for Semester 2.  
>   
> **Financial clearance: under review**  
> Your selected courses are saved. Finance must confirm your clearance before registration can be finalized.  
>   
> `Review selected courses`

## 19.5 Navigation rules

- Navigation is organized by user goals, not university departments.
- One menu item has one meaning everywhere.
- Active workspace, institution scope and academic period are always visible for staff.
- Users with multiple roles deliberately switch workspace.
- Search respects permission and scope.
- Breadcrumbs show location for deep record pages.
- A user never sees a menu item merely because they have a technical permission if it is irrelevant to their active role.

## 19.6 Typography and spacing

Use a simple typographic scale:

| Element | Purpose |
|---|---|
| Page title | Main task/page identity |
| Section heading | Meaningful grouped content |
| Body text | Explanations and record content |
| Supporting text | Dates, source, helper text |
| Status text | Current state and next action |

Rules:

- Use sentence case.
- Use short paragraphs and meaningful headings.
- Avoid all-capital labels except recognized codes.
- Use enough spacing to separate decisions, not to make pages look empty.
- Never use tiny text for important conditions, deadlines or errors.
- Long text is broken into sections, not placed in one large card.

## 19.7 Colour rules

Institution branding is configurable, but semantic colours are fixed in meaning:

| Meaning | Use |
|---|---|
| Neutral | Draft, ordinary information, inactive state |
| Informational | Guidance, in-progress activity |
| Success | Confirmed or completed action |
| Attention | User action needed |
| Warning | Deadline/risk requiring attention |
| Error | Blocked or failed action |

Colour never carries meaning alone. Every status has text and, where useful, an accessible icon.

A card is not coloured merely to appear attractive.

## 19.8 Component restraint

Use only an approved component when it serves a defined purpose:

- Form field
- Button
- Status explanation
- Task card
- Record summary
- Timeline
- Table
- Notification
- Alert/error panel
- Decision control
- Document viewer
- Chart/metric card

Do not invent:

- “Quick action” tiles without a real task
- Dashboard widgets with no decision purpose
- Multiple card styles for the same information
- New button styles for each module
- Icons that need a tooltip to explain a critical action

## 19.9 Content and language rules

Every message follows:

> **What happened → what it means → what to do next**

Example:

> **Payment confirmation is still in progress.**  
> We have not yet confirmed money on your account. Do not pay again.  
> Check again later or contact Student Finance using reference FIN-20418.

Never write:

> Transaction processing error.

Or:

> Your request failed.

## 19.10 Status and task rules

A status must include:

- State
- Reason
- Last update
- Responsible office/owner where useful
- Required next action

Bad:

> Pending

Approved:

> **Verification in progress**  
> Admissions is checking your qualification evidence. No action is needed unless we contact you.  
> Last updated: 26 August, 14:32.

## 19.11 Forms and decision rules

- One primary action per page/task.
- All required fields clearly marked.
- Labels stay visible; placeholders never replace labels.
- Save draft where the workflow permits.
- Preserve valid entries after failure.
- Review before formal submission.
- Do not preselect high-impact outcomes.
- Show consequences before irreversible actions.
- Use full-page review for major decisions; do not hide them in small popups.
- A disabled action must explain why it is unavailable.

## 19.12 Data and dashboard rules

A chart appears only when it helps a user understand a meaningful pattern.

Every metric/chart must show:

- What is measured
- Period and population
- Data freshness
- Source/metric version
- Limitation
- Accessible table alternative

Leadership sees decisions, risks and interventions first—not a screen full of charts.

## 19.13 Privacy in the visual design

- Mask NRC/passport/payment references where full display is unnecessary.
- Do not expose sensitive detail in notification previews.
- Separate internal notes from student-visible content.
- Use explicit restricted-information notices.
- Show only minimum necessary record fields for the role.
- Do not show private counselling, welfare or finance information in academic screens.

## 19.14 Screen definition of done

A screen is not complete until it has:

- Approved screen/action IDs
- Clear page hierarchy
- Correct role/scope information
- Approved components only
- Loading, empty, error, stale and access-denied states
- Mobile layout
- Keyboard and screen-reader behaviour
- Plain-language content
- Permission checks on the server
- Linked audit and acceptance tests
- No undocumented decorative feature or out-of-scope capability

## 19.15 Key visual screen families

The system will use these consistent screen families:

| Family | Used for |
|---|---|
| Public discovery | Programme search and eligibility guidance |
| Guided task form | Applications, registration, requests |
| Student home | Milestones, urgent actions and personal status |
| Staff work queue | Assigned cases, deadlines and safe filtering |
| Record/case page | Application, payment, finding, student request |
| Evidence review | Documents, criterion, decision and history |
| Decision package | Result release, award, approval, governance |
| Operations queue | Sync failures, incidents and reconciliation |
| Aggregate insight | Quality/leadership metrics and actions |

A new screen must belong to one of these families or receive explicit design approval.
