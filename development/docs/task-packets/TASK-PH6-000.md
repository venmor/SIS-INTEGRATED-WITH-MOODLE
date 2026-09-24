# TASK-PH6-000: Tutorial-group and teaching-assignment sources

## Authority and ownership

User authorization: Phase 6 all-slices implementation request + scope
decision (include TG/staff models), 2026-09-24. Release v0.7.0 track.
Proposed lead Charles Hangoma; reviewer Chitindu Milimbo. Rehearsal
duties only. Human review pending.

Controlling sources: roadmap Phase 6 (TG sync implied by enrolment);
Blueprint 5 §5.2/§5.3/§8/§10 (TG create fields, allocation rules,
activation gates); Blueprint 3 §§2–4 (assignment fields, states, quiz
authority, tutor allow/deny); REQ-LRN-001 (offerings, assignments, TGs
map through versioned config); REQ-ASM-002; TEST-AUTH-004 (tutor quiz
denial); permission catalogue ROLE-TUT; UI catalogue record/table/task
patterns. Exact records as prior packets. SUP-001–SUP-013 apply. No
dependencies. Owning module `teaching` (new, academic-owned).

## User outcome and boundaries

A programme coordinator creates tutorial groups (offering, name/number,
capacity, meeting pattern, tutor requirement, venue/mode, allocation
rule, effective date), allocates registered students with reason
(capacity-balanced, never over-enrolled, never silent), and activates
only when tutor assigned + capacity/timetable-readiness checked.
Teaching assignments record person, role, offering/scope, dates,
capabilities, authorizer, with states Proposed→Awaiting→Active→
Suspended/Ended (+Delegated/Reconciliation). Quiz authority derives
only from explicit assignment capability + TG scope + dates, and is
consumed by Moodle role mapping (slice 3). Students cannot self-assign;
tutors see only assigned TGs.

## Policy and explicit demonstration scope

`TEACHING-DEMO-v1` fictional only (SUP-009): demo programmes/offerings,
quiz capability key `QUIZ_CREATE_MARK`. Timetable-conflict validation
has no source model: capacity/registration/duplicate guards enforced,
timetable check recorded as GAP-021. TG management is coordinator-owned
academic data, never Moodle objects.

## State authorization failure and recovery

Coordinator role + capability, own programme scope; students/tutors read
assigned only; neutral 404s; denials 403 + audit; version-checked
activation; idempotency keys; concurrent allocations serialized per TG.

## Proof and documentation

API tests: TG lifecycle (create/allocate/activate), tutor-required gate,
over-enrolment prevention, duplicate allocation refusal, assignment
states + transitions, quiz-authority predicate (tutor with/without,
scope, dates, substitute explicitness), cross-TG denial, lecturer
scoping, idempotency, concurrency single-allocation. Browser:
coordinator creates TG → allocates → activates (mobile/keyboard/SR).
Record in PHASE-6 review + NOTE-PH6-000.

## Out of scope and open gates

Moodle mirroring (slices 1–3); grade staging/publication (Phase 7);
timetable-conflict validation (GAP-021); real programmes/staff.
Gates: readiness (operations slice needs privileged role controls).

## Completion

Pending; see VERIFICATION. Human review pending.
