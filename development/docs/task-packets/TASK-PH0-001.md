# TASK-PH0-001: Phase 0 folder structure + guardrails

## Authority

- Phase/release: v0.1.0 Phase 0
- Requirement IDs: REQ-NFR-006, REQ-NFR-007, REQ-NFR-008
- Role and scope: Lead (Supervisor) / Reviewer Chitindu Milimbo / scope development/ only
- Action/screen/component IDs: none — foundation only, no business action
- Policy/configuration version: none — no institutional values used
- Acceptance-test IDs: structural verification only (no ACT/PERM test)
- Exact detailed blueprint file(s):
  - unza-sis-moodle-design-handbook-v3.0.0/08-ENGINEERING-DELIVERY/01-locked-stack-repository-and-learning-baseline.md
  - unza-sis-moodle-design-handbook-v3.0.0/08-ENGINEERING-DELIVERY/02-future-base-repository-creation-plan.md
  - unza-sis-moodle-design-handbook-v3.0.0/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/02-phase-0-repository-and-learning-foundation.md
- Supersession-register entries checked: SUP-001 to SUP-011
- Readiness-matrix status: Ready (Repository/Git/learning/CI foundation)
- Open design-gap IDs: none blocking Phase 0

## User outcome

A new developer can clone the repo and distinguish handbook (authoritative design) from development/ (future application workspace), find README/AGENTS/DESIGN-INDEX, and understand where future code will live. No runnable app is claimed.

## Architecture boundary

- Owning module: none (foundation)
- Permitted dependencies: none
- API/command/event contracts: none
- Data entities/migration impact: none
- External adapters: none

## Required controls

- Authorization/relationship: n/a — no routes
- Privacy/classification: fictional fixtures only, no real data
- Validation/state transitions: n/a
- Audit: git status + verification evidence for review
- Idempotency/rate limiting: n/a
- Failure/recovery: n/a — placeholders explicitly state deferred work
- Accessibility/UI states: n/a — no UI yet

## Out of scope

Node pin, npm workspaces, Docker services, Next.js/NestJS scaffold, design tokens/components, CI workflows, any Applicant/Finance/Moodle/Assessment logic, Tailwind/Redis/Kafka/K8s/mobile/chatbot, real credentials or student data.

## Definition of done

- [x] Detailed role/action design exists and no blocking gap applies (Phase 0 exclusion recorded)
- [x] Smallest cohesive vertical slice implemented (folders + guardrails only)
- [x] Approved patterns followed (modular monolith layout, handbook links)
- [ ] Allow and deny tests added (n/a for Phase 0 — deferred to Phase 1)
- [ ] Failure/recovery paths covered (n/a — no runtime)
- [x] Documentation and traceability updated (this packet + rotation ledger)
- [ ] Relevant checks pass (structural verification below)
- [ ] Reviewer can explain the change (pending Chitindu walkthrough)
