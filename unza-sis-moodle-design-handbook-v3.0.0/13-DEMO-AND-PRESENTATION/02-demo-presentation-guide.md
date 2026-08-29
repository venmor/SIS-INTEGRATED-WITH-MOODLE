# Demonstration and Presentation Guide

## Fictional institution

**Kafue Ridge University — Demonstration Institution**

- Academic year 2026, Semesters 1 and 2
- Currency ZMW; time zone Africa/Lusaka
- Schools: Computing, Health Sciences and Business
- Programmes: BSc Software Engineering, BSc Radiography and BBA
- Restrained deep blue, muted gold, neutral grey/white visual theme
- All people use fictional names and reserved test addresses such as `@example.test`

## Dataset guidance

Approximately 20 applicants, 12 converted students, 10 staff, 3 programmes, 12 courses, 2 academic periods and several successful/failed integration events. Data is small enough to explain but sufficient for queues, search, permissions and recovery.

## Demo reset

The future implementation exposes a guarded `npm run demo:reset` or equivalent that refuses production, applies migrations and restores a predictable fictional scenario.

## Three presentation stories

### Applicant to registered student

Application draft → evidence → submission receipt → admissions review/offer → acceptance → student conversion → course selection → simulated payment/clearance → registration.

### Moodle failure and recovery

Confirmed registration → durable enrolment event → simulated outage → retry/dead letter → Integration Support replay → idempotent delivery → reconciliation/audit.

### Controlled result release

Assigned lecturer stages marks → invalid mark rejection → examination validation → authorized release → student result → sysadmin alteration denial → versioned amendment.

## Deliberate failure evidence

Show invalid-login throttling, unrelated-record denial, duplicate-submission prevention, disallowed upload rejection, duplicate payment callback, Moodle retry, invalid marks and denied result modification.

## Presentation flow

1. Problem and research findings
2. Role/domain architecture and policy configurability
3. Lean stack and modular-monolith rationale
4. Three live stories
5. Security, denial, recovery, audit and CI evidence
6. Git history, task packets and learning records
7. MVP-to-completion roadmap and limitations

Suggested initial speaking split: Charles covers problem, architecture, applicant/registration and Git workflow; Chitindu covers security, Moodle recovery, results and tests. Rotate during rehearsals so both can answer end-to-end.

## Defence questions both developers prepare for

- Why modular monolith rather than microservices?
- How are roles, scope and sensitive records protected?
- Why is financial clearance calculated rather than manually toggled?
- What happens when Moodle/payment/notification delivery fails?
- How are duplicate official actions prevented?
- How are released results corrected without rewriting history?
- How do Arch Linux and Windows developers remain consistent?
- How do repository rules prevent AI-generated drift?
- How does the MVP expand without breaking earlier modules?
