<!-- Exact assistant design message extracted from the shared conversation. -->
<!-- Message ID: aa749c59-8bf0-5f81-ae22-f48d15337ec1; chronological message: 99. -->

You are exactly right. The earlier descriptions identify capabilities, but they are not yet detailed enough to become an implementation contract for AI agents.

A statement such as:

> “The adviser contacts a student.”

is only a domain-level summary. It does not tell an implementation agent:

- Where the adviser starts
- What information they see
- Which student they are allowed to contact
- What button they select
- What fields appear
- What message is pre-filled
- What happens when they send it
- What architectural command is executed
- What happens if the notification fails
- What the student experiences
- What is audited
- What the adviser sees afterwards

We therefore need to redesign Section 12 as a collection of complete role and action blueprints.

# Revised experience-design method

## 1. A role will receive an entire experience blueprint

Each role will have its own chapter containing:

1. Role purpose
2. Organizational scope
3. Lifecycle and work context
4. Default workspace
5. Navigation
6. Home-page structure
7. Information the role can see
8. Information the role cannot see
9. Complete action inventory
10. Each action described screen by screen
11. Cross-role handoffs
12. Notifications
13. Empty, loading, blocked and error states
14. Mobile and accessibility behaviour
15. Architecture commands and events
16. Audit requirements
17. Acceptance tests

The existing portal matrix becomes only a role inventory—not the final experience design.

## 2. Experience is determined by more than the user type

The system should calculate an experience from:

> **Identity + active role + organizational scope + lifecycle state + assigned work + permissions + current context**

For example, “student” is not one fixed experience.

A student may currently be:

- An admitted applicant completing onboarding
- A first-year student registering for the first time
- A continuing student
- A student repeating a course
- A sponsored student
- A postgraduate researcher
- A student awaiting graduation
- A student with an active appeal
- A student receiving an academic intervention

Their navigation may remain familiar, but their home page, tasks, warnings and available actions change according to their state.

## 3. Every action receives a multi-layer action contract

Each action will be specified at five levels.

| Level | What must be defined |
|---|---|
| Institutional and policy | Who may perform it, under what conditions and according to which rule |
| Domain architecture | Entities, state transitions, invariants and resulting events |
| Application architecture | Permission check, command handling, integrations, transaction and audit |
| Experience design | Entry point, sequence, decisions, feedback, errors and recovery |
| Interface design | Pages, controls, labels, hierarchy, responsive and accessible behaviour |

# Example of the required depth

## Action ADV-OBS-04: Adviser sends a support invitation

### A. User goal

The adviser has reviewed an academic observation and wants to contact the student respectfully, offer assistance and create a follow-up responsibility.

### B. Preconditions

Before showing the action, the system verifies that:

- The user is operating in the Adviser workspace
- The student is assigned to the adviser or explicitly referred to them
- The observation is still active
- The observation data is not too stale for action
- The student has at least one permitted communication channel
- There is no duplicate open outreach for the same concern
- The adviser is not attempting to access restricted counselling information

If these conditions are not met, the action remains visible with the reason it cannot currently be used.

### C. Adviser’s starting experience

The adviser begins from:

> **My advisees → Support observations → Awaiting review**

The observation card shows:

- Student name and programme
- Why the observation was created
- Course or process involved
- Source and last-confirmed time
- Previous outreach
- Recommended follow-up date
- Existing assigned staff
- `Review observation` action

The interface must not provide a one-click `Send message` button directly from the queue because the adviser first needs context.

### D. Observation review

After selecting `Review observation`, the adviser sees:

1. Why the observation exists
2. Relevant academic events
3. Information freshness
4. Previous communication
5. Existing support actions
6. Student’s verified contact methods
7. Available next actions

The primary action is:

> `Contact student`

### E. Message composer

Selecting `Contact student` opens a focused panel containing:

- Purpose of contact
- Communication channel
- Approved message template
- Student-visible message
- Response choices offered to the student
- Adviser’s reply route
- Follow-up date
- Internal note, clearly separated from the student-visible message

Default message:

> We noticed that you may be having difficulty completing recent activities in CSC 4792. I am available to help you review the situation and discuss your options.

The adviser may personalize the message but must not introduce diagnoses, threats or unapproved disciplinary language.

### F. Message preview

Before sending, the adviser can select:

> `Preview as student`

The preview shows:

- Notification title
- Message
- Adviser’s identity
- Available response buttons
- Whether SMS or email contains only a short notice
- What the student sees after signing in

This prevents staff from accidentally sending internal language to students.

### G. Sending interaction

The primary button is:

> `Send support invitation`

When selected:

1. The button changes to `Sending invitation…`
2. Duplicate clicks are blocked
3. The composer remains visible
4. The system creates an idempotent outreach request
5. The observation moves to `Outreach queued`
6. A follow-up task is created
7. An audit record is written
8. A communication event is placed in the reliable event outbox

The interface must not immediately say `Student contacted`.

The first confirmation is:

> Invitation recorded and queued for delivery.

After provider confirmation, its status becomes:

> Delivered by SMS at 14:32.

### H. Architectural behaviour

The application executes a command equivalent to:

`RequestStudentSupportOutreach`

The transaction creates or updates:

- Student observation
- Outreach attempt
- Follow-up task
- Communication record
- Audit entry
- Outbox event

Possible resulting events include:

- `StudentSupportOutreachRequested`
- `StudentSupportOutreachQueued`
- `StudentSupportOutreachDelivered`
- `StudentSupportOutreachFailed`
- `StudentRespondedToSupportInvitation`
- `AdviserFollowUpScheduled`

Moodle, email and SMS providers do not directly update the student observation. They return delivery events that the SIS processes through the integration layer.

### I. Student experience

The student receives a neutral notice:

> Your academic adviser has sent you a support message. Sign in to view it securely.

After signing in, the student sees:

- The reason for the outreach
- The adviser’s name
- The full message
- Suggested actions
- Privacy explanation
- Response deadline where relevant

Available responses might include:

- `Book an appointment`
- `Ask my adviser to contact me`
- `Request another type of support`
- `I have already resolved this`
- `I do not need support right now`

Selecting a response immediately shows what happens next.

For example:

> Your adviser has received your request and will contact you through your verified mobile number. Follow-up is due by 20 August.

### J. Delivery and error states

#### No verified contact method

The adviser sees:

> This student has no verified phone number or email address. Create a contact-update task or use an approved institutional contact route.

The system does not pretend to send the message.

#### Duplicate outreach

> A support invitation for this observation was sent by M. Phiri on 15 August and is awaiting a response.

Actions:

- `View existing outreach`
- `Add follow-up note`
- `Send another message` only if policy allows

#### Connection lost before confirmation

> We could not confirm whether the request was received. Do not send it again yet. Checking request status…

The application checks the idempotency reference before enabling Retry.

#### Communication provider failure

> The invitation was recorded but could not be delivered by SMS. Nothing needs to be re-entered.

Actions:

- `Retry SMS`
- `Use verified email`
- `Create manual contact task`

The observation is not marked `Student contacted`.

#### Access changed during composition

> Your assignment to this student has changed. The message was not sent.

The draft is protected from unauthorized reopening.

### K. Adviser’s follow-up experience

After delivery, the adviser’s timeline shows:

- Message sent
- Delivery status
- Student response
- Follow-up due date
- Next assigned action

The card moves from `Awaiting review` to either:

- Awaiting student response
- Appointment requested
- Adviser follow-up required
- Student declined
- Delivery failed
- Resolved

### L. Audit record

The audit trail stores:

- Acting user
- Active role
- Organizational scope
- Observation
- Student
- Message-template identifier
- Final message
- Channel
- Date and time
- Delivery updates
- Follow-up date
- Student response
- Any subsequent changes

### M. Interface and accessibility requirements

- The composer must work as a full page on narrow mobile screens
- Focus moves to the composer heading when opened
- Sending status is announced to screen readers
- Delivery state is not communicated by colour alone
- Internal and student-visible text must have strong visual separation
- Keyboard users can preview, return and send without losing the draft
- Reduced-motion settings are respected

That is the depth every important action requires.

# Role blueprint catalogue

We should now build full chapters in the following order.

## Group 1 — Applicant and student experiences

1. Prospective applicant
2. Applicant
3. Offered applicant
4. New student completing onboarding
5. Continuing undergraduate student
6. Postgraduate taught student
7. Postgraduate researcher
8. Student completing graduation clearance
9. Former student or alumnus requesting records

## Group 2 — Academic users

10. Lecturer or tutor
11. Academic adviser
12. Research supervisor
13. Programme coordinator
14. Head of Department
15. School or Faculty Dean
16. External examiner

## Group 3 — Student Affairs

17. Counsellor
18. Disability-support officer
19. Student-welfare officer
20. Accommodation officer
21. Disciplinary case officer or committee member
22. Dean of Students
23. Deputy or Assistant Dean of Students

## Group 4 — Administrative users

24. Admissions officer
25. Academic-records officer
26. Examinations officer
27. Graduation and Senate officer
28. Cashier
29. Finance and reconciliation officer
30. Sponsorship officer
31. Academic Affairs manager or Registrar

## Group 5 — Governance and operations

32. Quality-assurance officer
33. Executive leadership
34. System administrator
35. Identity and access administrator
36. Moodle administrator
37. Integration-support officer
38. Auditor
39. Regulator or authorized reporting user

This catalogue will be validated against the institutional structure so we do not invent authority simply from a job title.

# Documentation structure for AI-agent implementation

To keep the project manageable, the final design should be divided into linked specifications:

1. **Institutional and domain architecture**
2. **Role experience blueprints**
3. **Action and workflow contracts**
4. **UI component and microinteraction system**
5. **Permissions and information-visibility matrix**
6. **Error, recovery and notification catalogue**
7. **Architecture-to-UX traceability matrix**
8. **Acceptance and end-to-end test scenarios**

Every development task will reference an exact chain such as:

| Requirement | Role | Screen | Action | Domain command | Resulting event | Test |
|---|---|---|---|---|---|---|
| Student support outreach | Adviser | Observation review | ADV-OBS-04 | `RequestStudentSupportOutreach` | `StudentSupportOutreachRequested` | E2E-ADV-04 |

This prevents one AI agent from building an API, another building a screen and a third interpreting the workflow differently.

Sections 1–11 can remain as the approved institutional and domain foundation. However, Section 12, 12A and 12B should remain open while we produce these complete role and action blueprints.

The next design chapter should now begin with the **prospective applicant and applicant experience**, including every screen, action, architecture command, state, error and recovery path.

---

## Following user responses before the next design record

### User message 0100

hello can you recall where we ended ?

### User message 0103

what is next in this reaserch?

### User message 0106

check if we did not do that for student experience, then lecturers/advisers, administrators, finance, support services, deans, and operations users. then if not we can proceed with Role Blueprint 1: Prospective Applicant and Applicant — complete UX, UI, workflow and architecture specification first

### User message 0109

alright we may proceed,here what we are working on shouldnt be forgotten because later the requirements design,architecture design and ui design and system design is what the ai agents will use to start development hence we need to be specific and deliberate ,and at the end of this section we will create a fil zip for the base repo encompasing all the discussed enegineering in order.


you may continue please
