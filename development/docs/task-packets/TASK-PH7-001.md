# TASK-PH7-001: Assessment scheme and grade-activity mapping plan

## Authority and ownership

User authorization: Phase 7 slices 1–3 implementation request, 2026-09-24.
Release v0.8.0 track. Proposed lead Chitundu Milimbo; reviewer Charles
Hangoma. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 1; Design Sec 5 §§1–2,14 (scheme
instantiation, component workflow DRAFT→LOCKED, effective-dated grade
scales); Lecturer/Tutor Book Part 2 §§1–5 (plan workspace, component
fields/states, TG quiz permissions, activity mapping screen + 6 validity
conditions, change control); REQ-ASM-001/002, REQ-LRN-001; permission
§§15.6–15.7 (Lecturer assigned-scope capture, Tutor granted-only,
Programme Coordinator/HOD governance, Moodle Administrator never
approves academic marks); UI-DECISION-001 (approval sign-off, frozen
package); SCR-REC-LEC-001 (course workspace). Exact records as prior
packets. SUP-001–SUP-013 apply. Depends on TASK-PH6-000/001 (TG sources,
mapping registry pattern). Owning module `assessment` (new).

## User outcome and boundaries

Versioned assessment-scheme registry per offering+period: components
(code, max mark, weight, scale ref, moderation requirement) with
DRAFT→APPROVED lifecycle; approval under four-eyes (approver ≠ creator)
on a UI-DECISION-001 page with frozen package + exact declaration;
changes supersede, never edit. Grade-activity mappings bind one Moodle
activity to one approved component (both SIS + Moodle identifiers, 6
validity conditions incl. correct offering/period/component/scale/
workflow); synthetic validation writes nothing; activation is four-eyes.
One ACTIVE plan per offering+period (partial unique). Lecturer mapping
of an arbitrary quiz after review stays blocked without authorized
change (Part 1 §6.4).

## Policy and explicit demonstration scope

`ASSESSMENT-DEMO-v1` fictional only (SUP-009): components CA-QUIZ1
max 20 weight 20, CA-ASSIGN max 30 weight 20, FINAL-EXAM max 100
weight 60 (extends DEMO-ACADEMIC-2026-v1 CA 40/exam 60/pass 50);
scale 0–100; rounding half-up 2dp; moderation route
coordinator→examinations (demo only); provisional marks hidden from
students (config choice). Non-numeric outcomes allow-listed per DS5 §3
(never stored as zero). No real policy, scales, or authorities claimed.

## State authorization failure and recovery

Lecturer capture within assignment scope only (LEC + stage-marks,
scope OFFERING — enforced here; previously seeded but unchecked);
plan/mapping approval by COORDINATOR + approve-assessment (new demo
role/capability, scope SCHOOL); Moodle Admin technical mapping only,
never academic approve; SYSADMIN denied on all assessment writes;
neutral 404s; denials 403 + audit; version-checked writes +
idempotency; CSRF on POSTs. New demo accounts seeded (GAP-022).

## Proof and documentation

API tests: plan draft/approve/supersede + versioning, four-eyes
refusal (self-approve 403), mapping draft/test/activate, closed
component kinds, synthetic pass/fail (fail writes nothing),
test-required refusal, both-identifier enforcement, post-review
arbitrary-mapping block, denials (tutor ungranted, sysadmin,
moodle-admin academic), neutrals, concurrency, idempotence. Browser:
plan → map → activate journey (390px, keyboard/focus, no overflow,
empty localStorage). Record in PHASE-7 review + NOTE-PH7-001.

## Out of scope and open gates

Grade staging (slice 2); validation queue (slice 3); moderation/board/
release/amendment (slices 4–7); calculation engine beyond staging
display; real policy/providers/SSO. Gates: GAP-022 (authority + demo
values), open decisions (results authorities, Moodle instance).

## Completion

Pending; see VERIFICATION. Human review pending.
