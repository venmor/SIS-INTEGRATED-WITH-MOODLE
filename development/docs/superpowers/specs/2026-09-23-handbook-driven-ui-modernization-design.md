# Handbook-Driven UI Modernization Design

**Date:** 2026-09-23  
**Branch:** `ui-modernization`  
**Project:** SIS Integrated with Moodle  
**Status:** Proposed design for implementation

## 1. Purpose

Modernize the SIS interface so it feels like a contemporary professional institutional workspace while preserving the approved workflows, authority boundaries, status semantics, accessibility requirements, and SIS–Moodle separation defined by the design handbook.

The modernization must make each stage of a user's journey visually understandable: where they are, what is happening, what matters now, what will happen next, and where help or recovery is available.

This is not a SaaS-dashboard redesign. The interface must remain institutional, calm, task-focused, information-dense where professional work requires it, and visually desirable without decorative excess.

## 2. Controlling design sources

The following sources govern this work, in this order of practical design authority:

1. `unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/`
   - Approved role blueprints
   - Approved cross-blueprint implementation sets
   - Approved engineering foundation
   - Approved final review roadmap
2. `unza-sis-moodle-design-handbook-v3.0.0/03-USER-EXPERIENCE-BLUEPRINTS/`
   - Role journeys
   - Cross-role end-to-end journeys
   - Role/screen/action maps
3. `unza-sis-moodle-design-handbook-v3.0.0/02-INSTITUTIONAL-AND-SYSTEM-DESIGN/`
   - Domain ownership
   - role boundaries
   - lifecycle
   - portals/workspaces
   - SIS–Moodle integration
4. `unza-sis-moodle-design-handbook-v3.0.0/04-UI-UX-DESIGN-SYSTEM/`
   - Constitution
   - component rules
   - loading/empty/error/stale/access-denied requirements
   - visual quality checklist
5. Existing implementation plans and roadmaps remain delivery references, but visual completeness may be pulled forward where doing so does not falsify backend capability or authority.

When a current screen technically satisfies an old implementation slice but under-expresses the approved journey, the approved handbook experience wins.

## 3. Experience principles

Every screen must answer:

1. Where am I?
2. What is happening?
3. What do I need to do now?
4. What happens after I act?
5. Where can I get help?

The visual language must be:

- Institutional, calm and trustworthy
- Modern but not trendy
- Professional and pleasant to work in for long sessions
- Clear before decorative
- Interface structure should carry meaning before explanatory prose
- UI copy is short, direct and plain-language; obvious interactions are not narrated
- Human-centred
- Consistent across applicant, student, staff and operations workspaces
- Dense enough for staff work without becoming crowded
- Responsive and low-bandwidth conscious
- Accessible by default

The visual language must avoid:

- Gradients
- Glassmorphism
- Oversized welcome/hero banners
- Decorative metric cards
- Random illustrations
- Excessive rounded cards
- Generic admin-dashboard templates
- Unexplained charts
- Floating assistants/chatbots
- Icon-only critical actions
- Artificial “AI app” phrasing
- Animation whose only purpose is decoration

## 3.1 Microcopy and explanation

The interface should communicate through structure before explanation.

Rules:
- Prefer short labels and status text over explanatory paragraphs.
- Do not repeat what the screen already makes obvious.
- Helper text appears only when the user needs context, consequence, recovery or a non-obvious rule.
- Keep routine guidance to one short sentence where possible.
- Use direct verbs: Continue, Review, Upload, Submit, Retry, Open, Accept.
- Avoid notebook-style prose, long instructional blocks and policy narration in the main workflow.
- Put detailed policy/help behind contextual help or a secondary surface when it is genuinely needed.

## 4. Core modernization idea

The modernization is not a collection of prettier components. It is a consistent **stage model**.

Every major journey is rendered as:

**Context → current state → required action → working area → next state → evidence/history/help**

The user should feel progression through a process rather than navigation through unrelated pages.

Shared visual patterns will therefore represent:

- Workspace context
- Current status
- Required action
- Milestone/progress
- Working content
- Institutional ownership
- History/evidence
- External-system freshness
- Recovery/help

## 5. Shared workspace families

### 5.1 Public discovery

Used for programme search, programme detail, comparison and eligibility guidance.

Experience:
- Calm public admissions entry
- Search and filter controls remain compact
- Results use structured programme records, not marketing cards
- Availability, deadline and requirement version are obvious
- Comparison is factual and non-ranking
- Loading uses stable programme skeletons
- No-result, closed intake, retired programme and stale-requirement states are deliberate

### 5.2 Applicant portal

Uses focused top navigation rather than staff navigation.

Persistent context:
- Applicant workspace
- Selected application where applicable
- Programme/intake
- reference
- deadline
- save/submission status

Home prioritizes:
1. Required action
2. Application progress
3. Status/timeline
4. Payment or document attention
5. Unfinished work
6. Notifications/help

Draft experience:
- Visual progress rail/step system
- Current section is obvious
- Save state visible
- Review before submission is visually distinct
- Upload/payment/external checks show real progress or uncertainty
- Draft never visually resembles submitted completion

Post-submission experience:
- Case-style status page
- Open clarification/correction tasks rise above history
- Timeline provides chronological understanding
- Decision requires deliberate opening
- Offer and onboarding become milestone-driven flows

### 5.3 Student portal

Uses a portal shell related to applicant UX but with academic context.

Persistent context:
- Student role
- student number
- academic period
- registration state

Student home priority:
1. Registration status and required action
2. Urgent tasks/deadlines
3. Holds/clearance blockers
4. Current-period academic summary
5. Moodle synchronization status
6. Timetable/results/requests as they become relevant
7. Recent changes

The student experience must keep SIS authoritative records distinct from Moodle learning activity.

### 5.4 Teaching workspace

Professional work-queue shell.

Persistent context:
- Lecturer/tutor role
- department/school scope
- academic period
- selected course/group

Home priority:
1. Teaching assignments needing attention
2. Course/roster state
3. Moodle synchronization health
4. Assessment work
5. Communication tasks

A course workspace should feel like one professional working surface, not a collection of dashboard widgets.

### 5.5 Administrative workspace

Persistent left navigation on desktop.

Used for admissions, registry, examinations and related operational work.

Each workspace begins with:
- Assigned work
- deadlines
- returned work
- reconciliation exceptions
- policy/freshness context

Case and queue records surface:
- Reference/person
- state
- owner
- age/due date
- priority reason
- source/freshness
- conflict flags
- next permitted action

The design favours compact records/tables on desktop and labelled record cards on mobile.

### 5.6 Finance/support/quality/operations

These use the same professional workspace grammar but expose only role-relevant information.

Operations and Moodle integration surfaces must emphasize:
- service health
- event status
- mismatch/reconciliation
- retry/replay safety
- source and last-confirmed time
- recovery action

Charts are secondary to decisions and operational action.

## 6. Loading and transition model

Loading is a first-class approved state.

Use skeletons when the final page structure is known:
- Programme result skeleton
- Task/status skeleton
- Application overview skeleton
- Form skeleton
- Queue row skeleton
- Case/evidence skeleton
- Timeline skeleton
- Course/student summary skeleton

Rules:
- Skeleton dimensions should approximate final content to reduce layout shift
- Screen readers receive one concise loading announcement
- Skeleton blocks are not individually announced
- No false statuses are shown while loading
- No endless decorative shimmer is required
- Reduced-motion preference must be respected
- Where a load exceeds a normal transition, replace passive skeleton-only presentation with meaningful text and recovery where appropriate

## 7. Surface and hierarchy rules

Modernization comes from layout, typography and hierarchy rather than decorative effects.

Use:
- restrained surfaces
- subtle borders
- purposeful whitespace
- strong page titles
- contextual eyebrow/status text
- compact metadata
- clear primary/secondary action distinction
- limited radius
- selective soft elevation only when a surface genuinely floats above another

Avoid placing every section inside a card.

### UI copy discipline

- Prefer labels, hierarchy, status text and placement over explanatory paragraphs.
- Use the shortest wording that preserves safety and meaning.
- Do not narrate obvious interface behavior.
- Long guidance belongs in Help, policy detail, or exceptional recovery states—not routine screens.
- Safety-critical consequences, uncertainty and irreversible actions may use extra explanation when needed.

Use cards only where they represent genuinely separate:
- applications
- tasks
- records
- decisions
- programme offerings
- evidence items

Long record pages should instead use sectional hierarchy and separators.

## 8. Stage-by-stage applicant experience

### Stage A — Discover

Feeling: informed, not sold to.

The user sees:
- clear admissions context
- search/filters
- factual programme records
- availability/deadline
- requirements summary
- compare/check eligibility actions

### Stage B — Decide whether to apply

Feeling: deliberate and safe.

Programme detail explains:
- what the programme is
- entry requirements
- required evidence
- intake/deadline
- application checklist
- consequence of starting

Starting an application never silently creates a draft.

### Stage C — Build a draft

Feeling: guided, resumable, under control.

The user sees:
- programme/intake/reference/deadline
- completion progress
- section state
- current save state
- clear next section
- contextual help

### Stage D — Provide evidence

Feeling: transparent about what the institution needs.

Document states distinguish:
- not uploaded
- uploading
- checking safety
- received
- replacement needed
- verification in progress
- accepted/replaced

Upload progress and recovery are visible.

### Stage E — Payment

Feeling: financially safe.

The system makes it difficult to pay twice by clearly distinguishing:
- payment required
- initiated
- checking confirmation
- confirmed
- mismatch/review
- waiver/refund states

Uncertain payment results explicitly say not to pay again.

### Stage F — Review and submit

Feeling: consequential but understandable.

The review page:
- summarizes submitted data
- identifies blockers
- links back to corrections
- shows declarations
- explains final consequence
- prevents double submission

Submission confirmation is receipt-based, not merely a green banner.

### Stage G — Track the case

Feeling: not abandoned after submission.

The user sees:
- current state
- reason
- responsible office
- whether they need to act
- last update
- timeline
- clarification/correction tasks

### Stage H — Decision and offer

Feeling: deliberate, respectful and private.

The decision is deliberately opened.
Offer conditions show:
- owner
- status
- deadline
- next action

### Stage I — Onboarding

Feeling: transitioning, not suddenly “already a student.”

The onboarding workspace separates:
- applicant-owned tasks
- institution-owned tasks
- verification dependencies
- conversion readiness

### Stage J — Student conversion

Feeling: clear handoff.

The student portal is not shown as fully ready until the authoritative student record exists.
If conversion/integration is delayed, the portal explains what is being prepared and what the user should do.

## 9. Staff admissions experience

### Queue

Feeling: focused professional work.

Desktop:
- persistent workspace navigation
- context bar
- queue view switch
- filters
- compact case records
- status + age/freshness + action

Mobile:
- records become labelled case cards
- actions remain explicit

### Case review

Feeling: evidence-driven and accountable.

The page should visually separate:
1. Case header/context
2. Restricted-information notice
3. Submitted declarations/evidence
4. Findings
5. Clarifications/corrections
6. Recommendation
7. Decision package where role allows
8. Case history

High-impact actions must not be visually mixed with routine navigation.

## 10. SIS–Moodle experience

Moodle must appear as an integrated learning system, not as a second source of official truth.

Student surfaces distinguish:
- SIS registration
- Moodle access/sync
- learning activity

Teaching surfaces distinguish:
- SIS roster/assignment
- Moodle course shell
- Moodle role/group sync
- assessment staging/import status

Operations surfaces show:
- mapping
- source/target state
- last sync
- mismatch
- retry/reconciliation path

A Moodle outage must never visually imply that SIS registration or official results are lost.

## 11. Responsive strategy

Desktop:
- staff left navigation
- wider professional working canvas
- compact tables/record rows
- selective two-column layouts only where both columns support the task

Tablet:
- navigation may compress
- toolbars wrap
- evidence/side panels stack when necessary

Mobile:
- one-column critical workflows
- tables convert to labelled record cards
- progress rails may become vertical
- primary actions can use full width
- no horizontal scrolling in critical workflows
- no action depends on hover

Target verification widths include:
- 1440px
- 1024px
- 768px
- 390px

## 12. Accessibility

Target: WCAG 2.2 AA as defined by the handbook.

Required:
- visible focus
- keyboard operation
- semantic headings/landmarks
- persistent labels
- text-based statuses
- accessible status announcements
- meaningful loading announcement
- no colour-only meaning
- zoom/reflow
- accessible modals/dialogs if introduced
- touch-target compliance
- reduced-motion support

## 13. Implementation boundaries

This modernization may:
- add approved loading states ahead of the original implementation phase
- improve shells/navigation/layout
- create visual representations of blueprint-defined future workspaces
- build shared UI primitives
- improve responsive behaviour
- reorganize visual composition

This modernization must not:
- invent new institutional authority
- expose data beyond role boundaries
- claim a backend workflow exists when it does not
- make Moodle authoritative for SIS records
- create fake success states
- introduce unapproved functional decisions
- replace plain-language recovery with visual-only treatment

For blueprint-defined screens whose backend is not implemented yet, full-system visualization should be isolated as explicit demo/preview presentation and must not be confused with a completed production workflow.

## 14. Testing strategy

### Component tests

Cover:
- skeleton semantics
- status/action presentation
- role-aware navigation
- progress states
- responsive record transformations where practical

### Browser tests

Cover representative journeys:
- programme discovery loading → results → detail
- applicant home → draft → section → review
- post-submission status/clarification
- admissions queue → claim → case
- 390px mobile versions of critical applicant/staff flows

### Visual regression

Add screenshot baselines for key screen families and states:
- loading
- normal
- empty
- action required
- error/recovery
- mobile

Visual regression is intended to prevent future AI/agent changes from reintroducing inconsistent card grids, generic dashboards or hierarchy regressions.

## 15. Definition of visually complete

A screen is visually complete only when:

- It belongs to an approved screen family
- Its role/workspace context is clear
- Its main purpose is obvious
- Its current status is understandable
- Its next action is obvious
- Loading/empty/error/stale/denied states are designed
- Mobile transformation is defined
- Important information is not buried inside decorative layout
- No unapproved dashboard decoration was introduced
- The screen can be explained against the relevant approved blueprint stage
- Functional authority and backend truth remain unchanged

## 16. Implementation sequence

1. Shared visual foundations and loading primitives
2. Public discovery
3. Applicant home and draft journey
4. Applicant evidence/payment/review/submission
5. Applicant post-submission/decision/onboarding
6. Admissions queue and case workspace
7. Student portal shell and first-registration/home experience
8. Teaching workspace and SIS–Moodle status experience
9. Operations/Moodle reconciliation workspace
10. Remaining staff workspace families as backend phases become available
11. Cross-workspace visual regression and accessibility pass

Existing work already present on `ui-modernization` is treated as the first implementation slice and will be reviewed against this design before further expansion.
