# Handbook review and source map — 2026-09-19

The handbook describes the whole intended SIS–Moodle system. The `development/` folder implements a growing portion. A design marked “Ready” means it is specified sufficiently to plan a task; it does not mean its code, tests, deployment or human review are finished.

## How the documents fit together

| Source | Use it for | Effect on this work |
|---|---|---|
| Orientation, status, supersession and readiness | Which document governs a disagreement | Later approved decisions and privacy/official-record rules win; do not silently choose the easier implementation |
| Institutional design and architecture | Domain ownership and SIS/Moodle boundaries | Admissions owns applications; identity owns credentials; no conversion, registration or Moodle write on submit |
| Role journey books and exact evidence | What each person may see, do, recover and hand off | Read Applicant Parts 1–8 for these slices; Parts 9–10 define later status/offer boundaries |
| UI contracts | Forms, save states, safe uploads, review, confirmation, error recovery | Save is visibly distinct from submit; stale versions and uncertain requests require recovery |
| Permissions, data and configuration | Own-record checks, classification, effective dates and policy | Server checks applicant relationship and current active workspace; hidden buttons are insufficient |
| Security and resilience | File quarantine, transactions, idempotency, backups | Scan failure cannot become success; one committed submission creates one snapshot and handoff |
| AI manual and developer learning | Task packets, no invented policy, explanation and review | Keep the source→screen→API→data→test chain in the repository; no invented human approval |
| Roadmaps | Dependency order and exit gates | Review prior slices first; deliver Phase 2 slices 2–5; slice 6 and later phases remain separate |
| Testing and presentation | What proof a feature needs | Allow/deny/failure/browser evidence plus an unchecked human rehearsal checklist |

The task-relevant applicant, permissions, UI, security, roadmap and AI/learning contracts were reviewed for implementation. All handbook file titles and all 37 individual role records were inventoried. Future-role records were checked for ownership/access/handoff boundaries; this is not a claim that every future feature has been implemented or every future-role acceptance clause has been tested. The [file inventory](HANDBOOK-FILE-INVENTORY.md) keeps those sources visible to the next task.

## All role evidence is part of the project

The former `99-EVIDENCE-ARCHIVE` is now `15-APPROVED-DESIGN-EVIDENCE`, by the user's instruction. Its 70 individual source records are preserved, including following approval messages. Navigation and AI instructions now call them active requirements; the repository root now has an AGENTS.md entry point directing agents to them. The rename does not approve new policy values.

| Individual role records | Coverage | Boundary relevant now |
|---|---|---|
| 001 | Role blueprint catalogue | Experience depends on role, scope, relationship, state and time |
| 002–011 | Applicant Parts 1–10 | Own drafts; separate account verification; safe files; immutable submit; later clarification and offer acceptance |
| 012–019 | Undergraduate student Parts 1–8 | Same person identity after governed conversion; submission/offer/student number do not mean registered |
| 020–024 | Lecturer/Tutor Parts 1–5 | Assigned teaching scope; Moodle evidence is not official SIS result authority |
| 025–027 | Adviser Parts 1–3 | Assigned advisees only; academic support does not expose counselling or unrestricted records |
| 028–030 | Coordinator/HoD Parts 1–3 | Explicit role switch, programme/department scope, no automatic result/finance authority |
| 031–034 | Quality, leadership, audit/regulatory Parts 2–5 | Governed evidence and disclosure, separate recommendation and approval |
| 035–037 | System/IAM, Moodle administrator, integration support | Technical administration does not grant business-record authority; restore/reconciliation and minimum emergency access |

Role families 6–10 and Quality Part 1 are covered by curated composites with source lineage, as recorded in SUP-011. Their absence as standalone recovered messages is not missing project scope. The admissions/registry composite defines the next handoff: a submitted snapshot can enter authorized assessment; staff must not silently edit the applicant's submission or inspect unfinished drafts.

## Contradictions corrected

1. **“Archive” versus active requirements:** rename and source-loading guidance corrected (SUP-012); relative references updated. Exact source bodies retained.
2. **“No runnable application” versus existing code:** application README/status now describe the repository correctly (SUP-013). Original ZIP counts still describe the handbook package alone.
3. **Permanent lead versus rotation:** historical lead assignments retained; future slice rehearsal roles alternate and are labelled proposed, with human review pending.
4. **Phase 1 slice 5 packet repeated conflicting sections:** consolidated ownership/routes and corrected scheduler name to the existing Nest scheduler. Historical execution evidence remains.
5. **Old gap records said review schedules/reinstatement did not exist:** factual addenda distinguish the implemented bounded mechanisms from remaining production policy and identity-case gaps.
6. **CI inside `development/.github` versus GitHub discovery:** active workflow moved to outer `.github/workflows`; old path is a pointer.
7. **Readiness/implemented/demo/approved were easy to confuse:** current reports separate automated evidence, human learning review and production gates.

Historical evidence may contain earlier proposals or approval requests. It is intentionally not rewritten to erase that history; the supersession register establishes which later decision controls. Existing source text about future phases remains future design, not a contradiction to current partial implementation.

## Roadmap beyond this review

Phase 2 slice 6 adds status/clarification and controlled post-submission recovery. Phase 3 adds admissions assessment, decisions and offers. Phase 4 performs governed applicant-to-student conversion and registration. Phase 5 handles simulated finance/clearance. Phase 6 adds Moodle adapters and reconciliation. Phase 7 governs assessment and official results. Phases 8–9 harden operations and assemble presentation/release evidence. Each needs its own task packet, source review and tests; a submission receipt does not claim those later workflows.

## Continuing with AI

Read `development/AGENTS.md`, `DESIGN-INDEX.md`, the slice packet, exact role records, cross-blueprint UI/permission/recovery contracts and this review. Inspect Git status and current tests. Explain any changed policy in an ADR or gap; never infer it from an old chat. End with code/tests/limitations and a learner explanation. Superpowers was already installed and enabled; its debugging, regression and independent-review workflows were used during this review. Its use is not institutional approval or human signoff.
