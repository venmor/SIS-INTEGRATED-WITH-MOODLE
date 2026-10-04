# Design Index

This is an implementation navigation index, not a replacement for the handbook. When sources conflict, use the handbook authority order and supersession register.

| Implementation concern | Controlling handbook starting point |
|---|---|
| Development entry and task scope | [Development entry gate](../unza-sis-moodle-design-handbook-v3.0.0/09-AI-AGENT-OPERATING-MANUAL/09-development-entry-gate.md) |
| Phase sequencing | [Implementation roadmap](../unza-sis-moodle-design-handbook-v3.0.0/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/00-roadmap-navigation.md) |
| Repository and stack | [Locked baseline](../unza-sis-moodle-design-handbook-v3.0.0/08-ENGINEERING-DELIVERY/01-locked-stack-repository-and-learning-baseline.md) |
| First vertical slice | [Applicant journey](../unza-sis-moodle-design-handbook-v3.0.0/03-USER-EXPERIENCE-BLUEPRINTS/01-applicant-journey-book.md) |
| Permissions and visibility | [Requirements and permissions](../unza-sis-moodle-design-handbook-v3.0.0/05-REQUIREMENTS-PERMISSIONS-DATA/) |
| Architecture and integration | [Architecture and integrations](../unza-sis-moodle-design-handbook-v3.0.0/06-ARCHITECTURE-INTEGRATIONS/) |
| Security and recovery | [Security, privacy and resilience](../unza-sis-moodle-design-handbook-v3.0.0/07-SECURITY-PRIVACY-RESILIENCE/) |
| Testing and acceptance | [Testing and acceptance](../unza-sis-moodle-design-handbook-v3.0.0/12-TESTING-AND-ACCEPTANCE/) |
| Open decisions and readiness | [Governance](../unza-sis-moodle-design-handbook-v3.0.0/90-TRACEABILITY-AND-GOVERNANCE/) |

Store application-local task packets, ADRs, learning records and evidence in the folders named in `docs/`.

## Current implementation review (2026-09-21)

- [Complete handbook file inventory and role source map](docs/learning/HANDBOOK-REVIEW.md): exact evidence is active requirements, not optional history.
- [Phase 0, Phase 1 and Phase 2 slice 1 review](docs/learning/PRIOR-PHASE-REVIEW.md).
- [Phase 2 slices 2–5 requirement-to-code-to-test map](docs/learning/PHASE-2-IMPLEMENTATION-REVIEW.md), with slice 6 post-submit case row added 2026-09-21 (code committed in `e44170a`; human review pending).
- [Phase 2 slice 6 learning note](docs/learning/NOTE-PH2-006.md): status timeline, clarification, correction, decision, tickets, withdrawal, inbox.
- [Phase 3 slices 1–6 learning notes](docs/learning/NOTE-PH3-001.md) ([slice 2](docs/learning/NOTE-PH3-002.md), [slice 3](docs/learning/NOTE-PH3-003.md), [slice 4](docs/learning/NOTE-PH3-004.md), [slice 5](docs/learning/NOTE-PH3-005.md), [slice 6](docs/learning/NOTE-PH3-006.md)).
- [Runbook and presentation rehearsal](docs/demo/APPLICANT-WALKTHROUGH.md).
- [Institutional and production gaps](docs/gaps/GAP-015-applicant-production-and-prior-phase-gates.md).
- [Recorded decisions](docs/adr/ADR-002-applicant-demonstration-boundaries.md).
- [Phase 3 slices 1–6 review (2026-09-21; slices 1–2 in `e44170a`, slices 3–6 in the worktree)](docs/learning/PHASE-3-IMPLEMENTATION-REVIEW.md): assigned queue, evidence comparison, clarification round-trip, recommendation, decision/offer, acceptance/onboarding; Phase 4 conversion pending.
- [Phase 7 slices 1–2 review (2026-09-25, uncommitted)](docs/learning/PHASE-7-IMPLEMENTATION-REVIEW.md): assessment scheme + mapping plan ([note](docs/learning/NOTE-PH7-001.md)), staging snapshot with frozen provenance ([note](docs/learning/NOTE-PH7-002.md)); validation queue (slice 3) not started. Lead Chitundu Milimbo, reviewer Charles Hangoma.

`REQ-ADM-002`/`ACT-APP-001` map to owned draft/section saving. `REQ-ADM-003` maps to current-section/document readiness. `REQ-ADM-004`/`ACT-APP-002` map to immutable, idempotent submission. Exact Blueprint 1 Parts 4–8 supply detailed actions without invented handbook identifiers. Endpoint names and test titles are implementation references, not new institutional requirement IDs.

## Phase7 continuation and expansion review — 2026-10-01

- [Continuation task](docs/task-packets/TASK-PH7-006-007.md), [verification](docs/learning/PHASE-7-CONTINUATION-VERIFICATION.md) and [gates](docs/gaps/GAP-PH7-CONTINUATION.md): controlled publication, own student results and amendment history in the separate review worktree. Lead Chitundu Milimbo; reviewer Charles Hangoma; human signoff pending.
- [Repository-wide MVP audit](docs/learning/MVP-AUDIT-2026-09-30.md): implemented journeys, OpenCode integration boundary and acceptance evidence still missing.
- [Detailed v1.1–v2.0 implementation plan](plan/feature-sis-expansion-2.0.md): includes dedicated timetable, examination, student support and student-AI workstreams, with [maturity](docs/roadmap/MODULE-MATURITY.md) and [source authority](docs/roadmap/SOURCE-MAP.md).
- [Approved v2.0 operating-SIS direction](docs/superpowers/specs/2026-10-02-v2-operating-sis-design.md), [sequenced execution plan](docs/superpowers/plans/2026-10-02-v2-operating-sis-plan.md), and [open institutional setup authority gap](docs/gaps/GAP-V2-001-institution-configuration-authority.md). The admissions-queue slices are implemented in the review worktree with [verification evidence](docs/learning/VERIFICATION.md); the remaining v2.0 work and human acceptance are pending. Moodle cloud stays deferred. The user lifted the limited-internet-data restriction on 2026-10-02; synthetic-data and paid-provider boundaries remain.
- [Institution setup readiness packet](docs/task-packets/TASK-V2-SETUP-001.md), [learning note](docs/learning/NOTE-V2-SETUP-001.md) and [configuration governance decision proposal](docs/policies/INSTITUTION-CONFIGURATION-GOVERNANCE-PROPOSAL.md): read-only operational status is implemented, while the authority gap still blocks setup writes.
- [Admissions reference-search packet](docs/task-packets/TASK-V2-ADM-002.md) and [learning note](docs/learning/NOTE-V2-ADM-002.md): exact reference lookup under the current reviewer scope; Task 3 allocation, routing and batch preparation remain open.
- [Admissions ordering packet](docs/task-packets/TASK-V2-ADM-003.md) and [learning note](docs/learning/NOTE-V2-ADM-003.md): oldest/newest server-side queue traversal under the same reviewer scope and signed cursor, without priority or allocation policy.
- [Assigned-case preparation packet](docs/task-packets/TASK-V2-ADM-004.md) and [learning note](docs/learning/NOTE-V2-ADM-004.md): bounded read-only file/request inventory for selected claimed cases, with live authority and version checks; no bulk decision or completeness certification.
- [Student timetable availability packet](docs/task-packets/TASK-V2-TIME-001.md) and [learning note](docs/learning/NOTE-V2-TIME-001.md): official registered-course source and honest publication-pending state. [GAP-021](docs/gaps/GAP-021-real-timetable-validation.md) still blocks real schedule and conflict claims.
- [Timetable conflict foundation](docs/task-packets/TASK-V2-TIME-002.md) and [learning note](docs/learning/NOTE-V2-TIME-002.md): versioned synthetic rules validate dated occurrences; no schedule is published or shown to students yet.
- [Draft academic-delivery identities](docs/task-packets/TASK-V2-TIME-003.md) and [learning note](docs/learning/NOTE-V2-TIME-003.md): additive effective-dated unit, course version, offering/section and venue records; no institutional write or timetable publication authority is implied.
- [Applicant document handoff repair](docs/task-packets/TASK-V2-APP-001.md) and [learning note](docs/learning/NOTE-V2-APP-001.md): upload progress, exact-fixture demo guidance, qualification blocker and next-step navigation; file-safety and official verification gates remain unchanged.
- [Applicant result and upload blockers](docs/task-packets/TASK-V2-APP-002.md) and [learning note](docs/learning/NOTE-V2-APP-002.md): selectable Science can satisfy the published Science-subject requirement, while inline result and local demo-file blockers name the next action.
- [Applicant UI foundation](docs/task-packets/TASK-V2-UI-001.md), [Tailwind decision](docs/adr/ADR-003-tailwind-ui-layer.md) and [verification note](docs/learning/NOTE-V2-UI-001.md): user-directed additive Tailwind layer mapped to semantic tokens, first applied to the applicant shell and supporting-document workflow. The remaining SIS screen families still need workflow-led visual review and incremental migration.
- [Admissions workbench presentation](docs/task-packets/TASK-V2-UI-002.md) and [verification note](docs/learning/NOTE-V2-UI-002.md): comparable table/cards, applied-scope clarity and stale-page recovery for the existing server-scoped queue. Staff allocation and safe batch preparation remain separate Task 3 work.
- [Student portal presentation](docs/task-packets/TASK-V2-UI-003.md) and [verification note](docs/learning/NOTE-V2-UI-003.md): focused navigation and an authoritative registration-status summary with task-first routes, without inferring registration from the student record.
- [Public programme discovery presentation](docs/task-packets/TASK-V2-UI-004.md) and [verification note](docs/learning/NOTE-V2-UI-004.md): focused search, expandable filters, visible intake and URL-preserving server-backed paging for anonymous visitors.
- [Student support activation gap](docs/gaps/GAP-V2-002-student-support-routing-and-ownership.md): approved adviser/referral journey requires named receiving services, scoped appointments, confidential custody and an accountable follow-up owner before live request submission.
- [Synthetic academic-support slice](docs/task-packets/TASK-V2-SUPPORT-001.md) and [verification note](docs/learning/NOTE-V2-SUPPORT-001.md): student-owned request, named adviser receiver, assignment-scoped queue and secure two-way replies; explicitly demo-only while the institutional activation gap remains open.
- [Academic-support queue triage](docs/task-packets/TASK-V2-SUPPORT-002.md) and [verification note](docs/learning/NOTE-V2-SUPPORT-002.md): appointment-scoped reply-need/status filtering and exact case-reference lookup, with cursor context retained and Tailwind spacing corrected in the base layer.
- [Agreed academic follow-up](docs/task-packets/TASK-V2-SUPPORT-003.md) and [verification note](docs/learning/NOTE-V2-SUPPORT-003.md): synthetic student/adviser action, agreement or decline, due date and confirmed completion with transition audit; live support remains gated.
- [Assigned follow-up worklist](docs/task-packets/TASK-V2-SUPPORT-004.md) and [verification note](docs/learning/NOTE-V2-SUPPORT-004.md): bounded, appointment-scoped active action queue with target-date and confirmation filters; no unapproved SLA or escalation.
- [Controlled academic-support closure](docs/task-packets/TASK-V2-SUPPORT-005.md) and [verification note](docs/learning/NOTE-V2-SUPPORT-005.md): reasoned, auditable closure with unfinished-work gate and student-visible outcome inside the synthetic route.
- [Adviser workload summary](docs/task-packets/TASK-V2-SUPPORT-006.md) and [verification note](docs/learning/NOTE-V2-SUPPORT-006.md): appointment-scoped counts and links to existing queues; no risk score or institutional SLA.
- [Workspace shell](docs/task-packets/TASK-V2-UI-005.md), [region map](docs/design/WORKSPACE-SHELL-V2.md) and [implementation note](docs/learning/NOTE-V2-UI-005.md): stable sidebar/top-bar/portal navigation positions, with live links only for implemented role journeys.
- [SIS entry and public admissions split](docs/task-packets/TASK-V2-UI-006.md) and [implementation note](docs/learning/NOTE-V2-UI-006.md): direct SIS sign-in beside separate programme discovery, with an optional demo-account disclosure.
- [Finance reconciliation queue](docs/task-packets/TASK-V2-FIN-001.md) and [verification note](docs/learning/NOTE-V2-FIN-001.md): bounded case pages, exact staff workload counts and signed actor/appointment/filter-bound cursor; money actions and provider scope are unchanged.
- [Payment-arrangement review queue](docs/task-packets/TASK-V2-FIN-002.md) and [verification note](docs/learning/NOTE-V2-FIN-002.md): bounded pending requests, oldest/newest navigation and a current-page decision selector under existing authority.
- [Adjustment/refund review queue](docs/task-packets/TASK-V2-FIN-003.md) and [verification note](docs/learning/NOTE-V2-FIN-003.md): bounded kind-filtered pages, selected-role forms and signed appointment-bound navigation; money decisions remain individual and server-authorized.
- [Student finance periods](docs/task-packets/TASK-V2-FIN-004.md) and [verification note](docs/learning/NOTE-V2-FIN-004.md): own invoiced periods drive account, statement, payment and arrangement context; no live provider or institutional current-period rule is inferred.
