## Design Section 12 — Portals, UX, accessibility and communications

> Controlling content recovered from the approved design chat; approval prompts are omitted in this reading copy.


This section directly addresses the original problem: an unprofessional interface, disorganized features and workflows that are difficult to complete.

### 12.1 Selected portal architecture

Three approaches were considered:

| Approach | Advantage | Main problem | Decision |
|---|---|---|---|
| One universal dashboard | One entry point | Becomes crowded and exposes irrelevant functions | Rejected |
| Completely separate portals | Simple for each department | Inconsistent navigation, duplicated features and fragmented identity | Rejected |
| Shared platform with role-specific workspaces | Consistent experience with focused workflows | Requires disciplined shared design standards | Selected |

The system will use one identity and a shared interface framework, with specialized workspaces for each role.

UNZA currently exposes separate entry points for its [SIS](https://sis.unza.zm/), [undergraduate applications](https://applications.unza.zm/) and [postgraduate services](https://pgonline.unza.zm/). The redesign preserves route-specific processes while making them feel like parts of one coherent institutional platform.

### 12.2 Portal and workspace structure

| Workspace | Primary users | Main capabilities |
|---|---|---|
| Public and applicant portal | Prospective applicants | Programme discovery, eligibility guidance, application, document submission, fee payment and status tracking |
| Student portal | Registered students | Registration, finance, timetable, Moodle access, results, appeals, support, research and graduation |
| Teaching workspace | Lecturers and tutors | Class lists, Moodle access, assessment status, grade-submission monitoring and academic communication |
| Advisory workspace | Academic advisers and supervisors | Advisee cases, research milestones, progress review and intervention tasks |
| Administrative workspace | Admissions, records and examinations staff | Work queues, verification, decisions, records, examinations and controlled corrections |
| Finance workspace | Cashiers and finance officers | Billing, payments, reconciliation, sponsorship and financial clearance |
| Student-support workspace | Counsellors, disability services, accommodation and discipline officers | Restricted cases, appointments, referrals and support plans |
| Quality and leadership workspace | QA officers and authorized management | Programme monitoring, regulatory reports, trends and approved aggregates |
| Operations workspace | ICT and integration administrators | Identity, integrations, failed events, reconciliation and service health |

A person holding several roles will use an explicit workspace switcher. The active role, institution scope and academic period will always be visible so that users do not accidentally act in the wrong context.

### 12.3 Shared navigation model

Every workspace will use the same basic structure:

- Home
- My tasks
- Relevant records and services
- Notifications
- Help and support
- User profile and workspace switcher

Navigation items will be ordered around user tasks rather than the university’s internal departmental structure.

The interface will avoid:

- Large undifferentiated menus
- Dashboards filled with decorative charts
- Important actions hidden in icon-only buttons
- Multiple names for the same service
- Features appearing merely because a user can technically access them

Breadcrumbs and page titles will show where the user is, while permission-aware search will help authorized staff locate records without exposing unrestricted institution-wide data.

### 12.4 Task-focused home pages

The home page will answer four questions:

1. What requires my attention?
2. What is approaching its deadline?
3. What recently changed?
4. Where do I continue unfinished work?

Student and applicant home pages will emphasize milestones and required actions. Staff home pages will emphasize assigned queues, overdue cases, service interruptions and decisions awaiting approval.

Analytics remain available in the appropriate workspace but will not displace operational tasks.

### 12.5 Applicant experience

The applicant portal will provide:

- Programme and intake selection
- Zambia-specific qualification routes
- ECZ and ZAQA evidence requirements
- NRC, passport and contact-data capture
- Autosaved application drafts
- Document-upload progress and validation
- Application-fee instructions and payment status
- A final review before submission
- Offer viewing, acceptance and onboarding
- Clear status history

An applicant will never see only “Pending.” Status displays must explain:

- Current status
- Why the application is in that state
- Whether the applicant must act
- What happens next
- Responsible office
- Expected or statutory deadline, where applicable
- Last update time

### 12.6 Student experience

The student home page will combine essential information without becoming a single oversized dashboard:

- Current academic period and registration status
- Outstanding registration actions
- Financial balance and clearance status
- Timetable and upcoming academic events
- Moodle course access and synchronization status
- Released results
- Appeals or requests in progress
- Research milestones, where applicable
- Support appointments and referrals visible to the student
- Graduation-readiness progress

Moodle will open through a clearly labelled learning area. The interface will distinguish SIS-held official records from Moodle learning activities so students are not presented with conflicting versions of marks or enrolment.

### 12.7 Staff work queues

Administrative work will be organized as managed cases rather than disconnected lists.

Each work item will show:

- Applicant or student
- Case type
- Current state
- Assigned officer or team
- Priority and due date
- Required next action
- Blocking reason
- Supporting documents
- Decision and audit history

Bulk actions will only be provided where the same decision can safely apply to every selected record. High-impact approvals, record corrections and adverse decisions will require individual review.

### 12.8 Form design

Long processes will use structured multi-step forms with:

- Meaningful step names
- Visible progress
- Automatic and manual draft saving
- Conditional questions
- Local examples such as `+260`, NRC and ECZ formats
- File type and size guidance before upload
- A review page before submission
- A submission receipt and reference number

Validation will occur at a useful point and will not interrupt users on every keystroke. Previously entered information will remain available after validation or recoverable service errors.

### 12.9 Error prevention and recovery

Errors will be reported in plain language and connected to a recovery action.

For example:

> Payment received, but reconciliation is still in progress. Do not pay again. Check again later or contact Student Finance using reference FIN-20418.

Error handling will include:

- A page-level error summary
- Inline identification of affected fields
- Links from the summary to each field
- Preservation of valid data
- Safe retry controls
- Duplicate-submission prevention
- Last-saved timestamps
- Service reference numbers
- Clear separation between invalid information, authorization denial and system failure

W3C guidance requires erroneous fields to be identified and their errors described in text; colour alone is insufficient. [W3C error-identification guidance](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)

High-impact actions will provide a preview of their consequences. Reversible actions will offer undo; irreversible actions will require deliberate confirmation.

### 12.10 Mobile and low-bandwidth operation

All essential applicant and student journeys must work on a mobile browser without installing an application.

The interface will support:

- Responsive layouts from narrow mobile screens upward
- No horizontal scrolling in critical workflows
- Lightweight pages and compressed assets
- Lazy loading of nonessential content
- Server-side filtering and pagination for large tables
- Resumable or retryable document uploads
- Draft saving during intermittent connectivity
- Clear “last updated” and connection-status information
- Email and SMS fallbacks for important notifications

Official transactions will not silently complete offline. A draft may be retained, but registration, payment confirmation, application submission or approval is complete only after the server issues a receipt.

A separate native mobile application is not part of the initial implementation.

### 12.11 Accessibility standard

The target is WCAG 2.2 Level AA across public, applicant, student and staff interfaces. WCAG 2.2 adds requirements covering areas such as unobscured focus, accessible authentication, target size and consistent help. [W3C WCAG 2.2 overview](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)

Requirements include:

- Complete keyboard operation
- Visible and unobscured keyboard focus
- Correct headings, landmarks, labels and table structures
- Screen-reader announcements for status changes
- Sufficient text and interface contrast
- Zoom and text reflow without loss of function
- No information conveyed by colour alone
- Text alternatives for meaningful images
- Captions or transcripts for instructional media
- Accessible modal dialogs and notifications
- Touch targets meeting the WCAG minimum, with larger targets preferred for primary actions
- Reduced-motion support
- Accessible authentication and account recovery

The WCAG 2.2 target-size criterion establishes a minimum of 24 by 24 CSS pixels in covered cases. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

Authentication will support password managers and copy-and-paste. Image-only CAPTCHA mechanisms will not be the sole verification route. [W3C accessible-authentication guidance](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)

### 12.12 Professional visual design system

The platform will use a versioned institutional design system covering:

- Typography
- Colour and contrast
- Spacing
- Page layouts
- Buttons and links
- Forms
- Tables
- Status labels
- Alerts
- Dialogs
- Timelines
- Loading, empty and error states

The visual language will be restrained and professional. Transactional screens will avoid excessive gradients, oversized promotional banners, decorative cards and animation.

Institution branding will be configurable rather than hard-coded. Status colours will always be accompanied by text or an icon with an accessible label.

Dense staff tables may provide compact and comfortable display modes. On mobile, appropriate records will convert to structured cards instead of forcing desktop tables onto small screens.

### 12.13 Notifications and communications

The in-system notification centre is the authoritative record. Email and SMS are delivery channels, not separate workflow systems.

Notifications will include:

- Event or decision
- Plain-language explanation
- Required action
- Deadline
- Direct link to the relevant task
- Responsible office or support route

Messages and tasks will remain distinct: a message informs the user; a task requires action.

Delivery states will include queued, sent, delivered where supported, failed and retried. Duplicate messages will be suppressed, and sensitive details will be minimized in SMS and email previews.

Users may configure optional communication preferences, but mandatory academic, financial, safety and regulatory notices cannot be disabled.

### 12.14 Help and service recovery

Help will appear in a consistent location throughout the platform, supporting the WCAG 2.2 consistent-help requirement.

It will provide:

- Context-sensitive instructions
- Searchable guidance
- Examples for complex fields
- Contact details for the responsible office
- Support-ticket submission
- Ticket status and conversation history
- Service-health information
- Account-recovery guidance

Automated assistance may later help users locate information, but it will not become the only support channel or make institutional decisions.

### 12.15 Privacy within the interface

Privacy will be visible in the interaction design:

- NRC, passport and financial details masked where full display is unnecessary
- Explanations of why sensitive information is requested
- Restricted notes separated from user-visible reasons
- Warnings before downloading sensitive records
- Session-expiry warnings with draft preservation
- Prominent sign-out for shared devices
- Permission-aware search results
- No sensitive information in lock-screen notification previews

Concurrent edits will not silently overwrite one another. The second user will be shown the conflict and given an appropriate comparison or reload option.

### 12.16 Language and local conventions

English will be the initial operating language, with the interface prepared for later language packs.

The system will consistently use:

- Zambian date, currency and telephone conventions
- Institution-approved terminology
- Plain language alongside formal regulatory terms
- Consistent names for programmes, courses, academic periods and decisions
- Time-zone-aware deadlines

Technical states and internal codes will not be exposed as the primary explanation to students.

### 12.17 UX verification and acceptance

Critical journeys will be tested with representative applicants, students, lecturers, advisers and administrative staff, including users with disabilities and users relying on lower-end mobile devices or unreliable connectivity.

Section 12 will be accepted when:

- Critical journeys work on desktop and mobile
- Every critical task is keyboard operable
- Screen-reader and focus testing passes
- Forms retain information after recoverable failures
- Errors explain both the problem and recovery action
- Statuses include reasons and next steps
- Users do not encounter conflicting Moodle and SIS records
- Permission-aware navigation and search are verified
- Important notifications link to the correct task
- Applicants and students can complete core journeys without staff interpretation
- Staff can process their queues without navigating unrelated modules

Section 12 is ready for approval. After approval, Section 13 will define the implementation scope, legacy-data migration, testing strategy, deployment and phased release.
