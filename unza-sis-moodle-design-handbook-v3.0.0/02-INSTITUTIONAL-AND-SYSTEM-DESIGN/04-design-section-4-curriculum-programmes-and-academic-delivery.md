## Design Section 4 — Curriculum, programmes and academic delivery

> Controlling content recovered from the approved design chat; approval prompts are omitted in this reading copy.


The academic model will support multiple schools, departments, programmes and delivery arrangements without assuming that the unit owning a programme must teach every course in that programme.

### Core academic hierarchy

```text
Qualification
└── Programme
    └── Curriculum Version
        └── Requirement Structure
            ├── Required courses
            ├── Elective groups
            ├── Research components
            ├── Practicum or clinical components
            ├── Credit requirements
            └── Completion rules
```

A programme is not itself a list of courses. Its approved curriculum version defines what a particular intake must complete.

### Principal academic entities

| Entity | Meaning |
|---|---|
| Qualification | The award category, level and title, such as bachelor’s degree, postgraduate diploma, master’s degree or doctorate |
| Programme | A stable course of study leading to a qualification |
| Programme Version | Effective-dated programme metadata such as title, duration, delivery modes and admission rules |
| Curriculum Version | The requirements assigned to an intake or approved student cohort |
| Curriculum Requirement | A required course, elective group, research milestone, practicum, credit total or other completion condition |
| Course | Stable institutional identity for a unit of learning |
| Course Version | Approved course title, credits, learning outcomes, prerequisites and other versioned attributes |
| Course Equivalence | Approved relationship between interchangeable or replacement courses |
| Course Offering | Delivery of a course version during a defined academic period |
| Section | A teaching group within an offering |
| Teaching Assignment | Effective-dated assignment of a lecturer, tutor, coordinator or other teaching responsibility |
| Programme Attempt | A student’s enrolment in a programme and curriculum version |
| Course Registration | A student’s authoritative enrolment in a particular course offering |

### Qualification and programme configuration

Each programme defines:

- Qualification and academic career.
- Owning organisational unit.
- Contributing organisational units.
- Lead programme coordinator position.
- Permitted campuses and delivery modes.
- Full-time and part-time duration ranges.
- Admission routes and entry requirements.
- Applicable academic calendars.
- Curriculum versions.
- Award title and transcript title.
- Whether it supports taught, research or combined components.
- Applicable grading and progression policy.
- Professional or regulatory accreditation metadata.
- Programme status and effective dates.

Programme configuration must not encode logic in programme names. For example, the system must not infer that a programme is postgraduate because its title contains “Master.”

### Flexible curriculum structure

A curriculum version can contain hierarchical requirement groups:

```text
All-of
Any-of
Minimum-count
Minimum-credits
Maximum-credits
Choose-from-list
Conditional requirement
Non-course requirement
Research milestone group
```

Example:

```text
Master of Science Curriculum 2026
├── Complete all 6 core courses
├── Complete at least 2 electives from Group A
├── Maintain the configured minimum GPA
├── Complete Research Methodology
├── Obtain ethics clearance where applicable
├── Pass research proposal milestone
└── Complete and pass dissertation examination
```

A PhD curriculum may contain primarily non-course requirements but can still include prescribed courses or seminars.

### Curriculum lifecycle

```text
DRAFT
→ UNDER_REVIEW
→ APPROVED
→ PUBLISHED
→ SUPERSEDED
→ RETIRED
```

Rules:

- Only published curricula can receive new students.
- Published curriculum requirements cannot be edited in place.
- Changes create a new curriculum version.
- Existing students remain attached to their assigned version.
- Moving a student to another version requires an approved transition plan.
- The transition records satisfied, substituted, waived and outstanding requirements.
- Retiring a programme does not delete its students or historical curricula.

### Course lifecycle

```text
DRAFT
→ UNDER_REVIEW
→ APPROVED
→ ACTIVE
→ RETIRED
```

A course version defines:

- Code and title.
- Owning academic unit.
- Credit value.
- Academic level.
- Learning outcomes.
- Contact or study hours where required.
- Prerequisites and co-requisites.
- Anti-requisites and prohibited combinations.
- Repeatability rules.
- Default assessment scheme.
- Delivery constraints.
- Effective dates.

A course code may not be reused for an unrelated course.

### Cross-school academic integration

Cross-school delivery is represented explicitly through four separate relationships:

1. **Programme ownership:** The unit academically responsible for the programme.
2. **Curriculum contribution:** A unit contributes courses or requirements to another unit’s programme.
3. **Course ownership:** The unit responsible for maintaining the course definition.
4. **Offering delivery:** The unit responsible for teaching a particular course offering.

Example:

```text
School A owns Programme P.
School B owns Course C.
Programme P includes Course C.
School B delivers Course C to students from Programmes P, Q and R.
```

This arrangement creates one course offering with authorised sections or reserved capacities, not three duplicated course definitions.

Joint programmes may have:

- One lead owner.
- Multiple contributing owners.
- Defined approval responsibilities.
- Shared curriculum governance.
- Explicit revenue or workload metadata for reporting without embedding accounting rules.

### Academic calendar model

The system will support a configurable period hierarchy:

```text
Academic Year
├── Semester or Term
│   ├── Registration period
│   ├── Teaching period
│   ├── Examination period
│   └── Result-processing period
└── Optional block, quarter or session
```

Rules:

- “Semester” is not hard-coded as the only period type.
- Registration, teaching, assessment and examination dates are separate.
- Deadlines may vary by campus, programme, student category or offering.
- Every transaction records the applicable policy and calendar version.
- Date extensions require an authorised exception.

### Course-offering lifecycle

```text
PLANNED
→ AWAITING_APPROVAL
→ APPROVED
→ OPEN_FOR_REGISTRATION
→ REGISTRATION_CLOSED
→ IN_PROGRESS
→ ASSESSMENT_PROCESSING
→ COMPLETED
→ CLOSED
```

Exceptional states:

```text
CANCELLED
SUSPENDED
ARCHIVED
```

An offering defines:

- Course and course version.
- Academic period.
- Delivering unit.
- Campus and delivery mode.
- Capacity and waitlist policy.
- Sections and groups.
- Teaching assignments.
- Registration dates.
- Moodle mapping.
- Assessment-scheme instance.
- Published schedule references.

Cancellation requires a reason, impact analysis and resolution of existing registrations.

### Teaching allocation

Teaching assignments support:

- Course coordinator.
- Lecturer.
- Tutor or teaching assistant.
- Marker.
- Moderator.
- Clinical or practicum supervisor.
- Guest lecturer.
- External examiner where appropriate.

Each assignment has:

- Person.
- Position or assignment role.
- Offering or section scope.
- Effective dates.
- Workload contribution.
- Required capabilities.
- Confirmation state.

A lecturer receives class and assessment access only after the assignment becomes active.

### Registration rule engine

Course-registration validation will use versioned rules rather than hard-coded programme checks.

Rules can evaluate:

- Curriculum applicability.
- Prerequisites and co-requisites.
- Equivalent courses already completed.
- Failed or repeated courses.
- Minimum and maximum credit load.
- Timetable conflicts.
- Offering capacity.
- Programme and level restrictions.
- Academic standing.
- Financial or administrative holds.
- Required approvals.
- Deadline compliance.

Each result is returned as one of:

```text
PASS
WARNING
BLOCK
APPROVAL_REQUIRED
```

Every warning or block includes a stable rule code and a user-readable explanation.

### Credit transfer, exemption and prior learning

The model distinguishes:

- **Credit transfer:** External or previous institutional credit counts toward completion.
- **Course exemption:** A requirement is waived, with or without replacement credit.
- **Course substitution:** Another approved course satisfies the requirement.
- **Recognition of prior learning:** Prior formal, informal or professional learning is evaluated.
- **Curriculum transition:** Completed work is mapped when changing curriculum versions.

Each decision requires evidence, evaluator, authority, date, reason and effect on completion calculations.

### Timetabling boundary

The initial SIS will support:

- Manual creation and import of teaching schedules.
- Venues, dates, recurrence and section schedules.
- Timetable-conflict detection during registration.
- Published student and lecturer timetables.
- Integration contracts for a future specialised timetabling engine.

Automatic timetable optimisation is not required in the initial implementation.
