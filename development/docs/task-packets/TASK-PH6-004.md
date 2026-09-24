# TASK-PH6-004: Delivery queue, workspaces and maintenance

## Authority and ownership

User authorization: Phase 6 all-slices implementation request, 2026-09-24.
Release v0.7.0 track. Proposed lead Chitindu Milimbo (operations UI);
reviewer Charles Hangoma. Rehearsal duties only. Human review pending.

Controlling sources: roadmap slice 4; Blueprint 12 §§12.16/12.38 navs
(Moodle Administration + Integration Support workspaces, explicit
switcher, never merged); REQ-OPS-003 (queues show state/reason/attempts/
next action/owner/correlation); maintenance (approved change + student
wording "registration unaffected"); UI catalogue (fresh build:
UI-RECORD-001/UI-TABLE-001/UI-TASK-001/UI-TIMELINE-001/UI-STATUS-001,
UI-DECISION-001 for approvals, message pattern, no-modal rule);
ROLE-INTEGRATION catalogue entry. Exact records as prior packets.
SUP-001–SUP-013 apply. Depends on TASK-PH6-003. Owning modules
`integration` + web admin pages.

## User outcome and boundaries

Two workspaces: Moodle Administration (sync health, shell queue,
enrolment/role queue, TG queue, mappings, maintenance) and Integration
Support (health, event-delivery queue with attempts/errors/safe action,
reconciliation entry, incidents, replay entry). Maintenance windows
scheduled through approved change, flip health, student-safe wording.
Every screen gets a stable SCR-* identifier before coding; replay and
mapping approvals link to decision pages (slice 5), never modals.

## Policy and explicit demonstration scope

`MOODLE-DEMO-v1` fictional; health simulator-driven. Fresh UI per user
decision; design-preview fixtures stay untouched.

## State authorization failure and recovery

MOODLE_ADMIN vs INTEGRATION_SUPPORT scopes server-side; students see
own sync states only; stale/failed loads show last-confirmed wording;
neutral 404s; denials 403 + audit.

## Proof and documentation

API tests: queue scoping per role, health transitions, maintenance
scheduling + effect, student sync-state reads, denials, neutrals.
Browser: officer triage queue → event detail; maintenance banner
wording (mobile/keyboard/SR). Record in PHASE-6 review + NOTE-PH6-004.

## Out of scope and open gates

Replay approval execution (slice 5); reconciliation engine (slice 6).
Gates as TASK-PH6-000.

## Completion

Pending; see VERIFICATION. Human review pending.
