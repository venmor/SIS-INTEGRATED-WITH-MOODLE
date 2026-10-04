---
goal: Deliver the handbook-defined SIS from a verified presentation MVP to operational v2.0
version: 2.0-plan.2
date_created: 2026-09-30
last_updated: 2026-10-02
owner: Charles Hangoma and Chitundu Milimbo; per-slice lead and reviewer recorded before execution
status: Planned
tags: [architecture, feature, migration, security, accessibility, roadmap]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This is an executable expansion backlog, not approval to invent university policy or a claim that v1.0 has passed acceptance. It extends the original handbook roadmap without changing its approved text. The implementation audit is [MVP audit](../docs/learning/MVP-AUDIT-2026-09-30.md). Release completion requires evidence, not a page count.

The 2026-10-02 operating-SIS design and detailed execution plan refine this inventory: [approved-direction design](../docs/superpowers/specs/2026-10-02-v2-operating-sis-design.md), [execution plan](../docs/superpowers/plans/2026-10-02-v2-operating-sis-plan.md), and [institution setup authority gap](../docs/gaps/GAP-V2-001-institution-configuration-authority.md). Use only generated synthetic records. The user lifted the limited-internet-data restriction on 2026-10-02; report substantial transfers and any provider charges, while keeping real institutional data and cloud Moodle deferred. Institutional configuration writes remain disabled until approved proposer, independent approver, scope and recovery authority is recorded.

Paths below are relative to `development/`. New module and screen paths are proposed implementation locations, not claims that they exist. Before each slice, read its exact source records in full and confirm later supersession; the source map is [SOURCE-MAP](../docs/roadmap/SOURCE-MAP.md). A policy gate with no approved input remains blocked. Do not substitute an AI-authored numerical threshold or institutional appointment.

**Demonstration completion direction, 2026-10-04:** The immediate target is a coherent fictional university operated through the SIS, not live institutional deployment. Synthetic policies, academic periods, programmes, timetables and student records must be created or revised through governed setup UI and then used by the actual workflow engines. Seed files may bootstrap a rehearsal but cannot be the only way to change a feature. Every demonstrated decision must identify its fictional policy version, accountable actor, scope and effective date; official and high-impact actions retain independent approval and audit. A complete demonstration follows connected applicant, student, teaching, examination, results, finance, support and reporting journeys with denial/recovery cases, rather than counting screens. The existing Moodle simulator may stand in for cloud Moodle until connection work resumes; payment actions remain labelled simulated until a real provider contract and recovery are verified. Institutional authority and production acceptance remain separate later gates. Before editable demo configuration is enabled, define explicit fictional proposer/approver appointments and bind every write to isolated `DEMO_MODE` data; GAP-V2-001 still forbids treating these as live university appointments.

For timetable specifically, use synthetic periods, offerings, rooms, staff and sessions. The demonstration must let an authorized scheduler define versioned rules and a draft schedule, detect room/teacher/student conflicts, obtain the configured approval, publish a version, and show the student's own timetable and changes. It does not require a real university timetable or imported institutional data. The configured rule can be fictional, but hard constraints must be enforced by the server and tested.

Applicant usability increment [TASK-V2-APP-002](../docs/task-packets/TASK-V2-APP-002.md) makes the current Radiography result and demo upload blockers actionable. It does not define alternative-science-subject equivalence. The institution setup/rule workstream must model accepted subject groups explicitly and version them so future policy changes do not invalidate existing application records silently.

## 1. Requirements & Constraints

- **REQ-001**: Preserve the three connected MVP stories and their authorization, failure and recovery tests throughout expansion.
- **REQ-002**: Build each slice across the user journey, accessible UI, scoped API, owned data, policy, audit/outbox, failure recovery and tests. A bare module or dashboard cannot complete a slice.
- **REQ-003**: Preserve one person/account with deliberate role switching; scope uses current appointment, relationship, state, purpose and time. Cross-school delivery and concurrent programme attempts must remain explicit.
- **REQ-004**: Version curriculum, calendars, grading/progression rules and approved decisions. Never recalculate historical official results against today's policy.
- **REQ-005**: Keep Moodle authoritative for learning activity and raw marks; SIS governs staging, validation, moderation, board decisions, publication and amendments. Enter marks once in the approved source.
- **REQ-006**: Include undergraduate, postgraduate, teaching, finance, support, governance, credentials and reporting outcomes before claiming complete v2.0 scope.
- **SEC-001**: Staff MFA and purpose/target/version/session-bound step-up precede high-impact commits. Test overrides never become production bypasses.
- **SEC-002**: Counselling, disability evidence, discipline, examiner reports and sensitive exports have separate disclosure rules, audited access and configured retention. Deans and administrators do not gain blanket case access.
- **CON-001**: Retain Next.js/TypeScript/CSS Modules, NestJS modular monolith, PostgreSQL/Prisma, Docker Compose, GitHub Actions and Playwright. New infrastructure or AI requires its own approved ADR.
- **CON-002**: OpenCode's `b9fa96d` is integrated only in the separate review branch at `eef552e`. The primary checkout and its untracked findings remain untouched. This plan authorizes no reset, push, deployment or shared-database migration.
- **CON-003**: Prefer installed dependencies and local synthetic fixtures. The user has authorized internet data usage as of 2026-10-02; report substantial downloads and any cost before starting. Do not download or import real student or institutional datasets.
- **REQ-007**: Institution onboarding must configure an effective-dated organization graph, academic-calendar model, catalogue, versioned rules, approved terminology and operational readiness without arbitrary code; unapproved values remain inactive. Privileged setup is gated by GAP-V2-001.
- **REQ-008**: High-volume admissions uses server-side scoped filters and stable navigation, clear ownership/workload, safe batch preparation and per-item audit. High-impact decisions remain separately attributable unless approved configuration delegates them.
- **REQ-009**: Class-session attendance, proactive success, real counselling/welfare/accommodation, examination operations, persistent student AI, trusted reporting/exports and provider-backed payments are separate owned workflows with the security, consent, authority, recovery and human-review gates stated in the operating-sis plan.
- **GUD-001**: Every task packet records lead, independent reviewer, exact evidence sections, requirement/action/permission/UI/test IDs, exclusions, dependencies and evidence paths. Charles and Chitundu rotate after each slice; no human signoff is prefilled.
- **PAT-001**: Use optimistic versions plus transaction serialization, durable idempotency receipts, minimal outbox events and owner-module consumers. External delivery cannot reverse an official decision. Unknown outcomes retry the original request reference.

## 2. Implementation Steps

A task starts only when every stated dependency has acceptance evidence. Within a release, execute rows in order unless a row explicitly allows parallel work. Release numbers describe outcomes, not fixed dates or a promise of effort. Record estimates after the authority and data migration questions are resolved.

### Implementation Phase 1 — Integrate and accept v1.0 before expansion

- **GOAL-001**: Produce a reproducible fictional presentation baseline with a complete connected result-release story and documented operational limits.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Record both Git SHAs and dirty-file ownership in the integration review; compare OpenCode's IAM, admissions storage/scanning, finance step-up, notifications and operations changes against the gaps and migration history; incorporate them only in the authorized review worktree. This is code integration, not regression or acceptance. | Yes | 2026-10-01 |
| TASK-002 | After TASK-001, implement adapters for `assessment/publication-ports.ts` using reviewed IAM `StepUpService` and approved effective-dated release configuration. Bind proof to actor, session, action, package/amendment version and digest; consume atomically. Add the accessible re-authentication journey to `admin/assessment/publications/forms.tsx`. Supply no policy defaults or new automatic grants. Test expiry, reuse, session switch, target change, transaction rollback and concurrent attempts. | No | — |
| TASK-003 | Review the [publication policy draft](../docs/policies/RESULT-PUBLICATION-POLICY-DRAFT.md) and close GAP-022 through recorded human decisions on demo scheme, scope registry, offering-to-course mapping, candidate authority, period release appointment, visibility/restrictions and review route. The opt-in fictional test profile is not signoff. Persist approved versioned configuration in `packages/config` and controlled configuration records. Reconcile `STU`/`STUDENT`, `LEC`/other legacy role strings with explicit migration and old-session invalidation. | No | — |
| TASK-004 | After TASK-002/003, run one browser story from Moodle simulator source through staging, validation, moderation, board approval, independent step-up release, owned student view and independent amendment. Prove no provisional disclosure, no duplicate successor, old-version preservation and pending downstream impact review. Add `tests/browser/result-release-connected.spec.ts`; archive trace and privacy-safe screenshots. | No | — |
| TASK-005 | Finish Phase 8 in `docs/operations/`: exercise notification consumer failure/retry, incident assignment/closure, audit search, throttling, low-bandwidth/unknown outcomes and keyboard/screen-reader journeys. Restore an isolated backup and reconcile money, enrolment delivery and official result chains. Rehearse failed-deployment rollback. Run fresh complete API/browser suites and CI; do not infer their status from older ledgers. | No | — |
| TASK-006 | Finish Phase 9: cold reset with approved fictional fixtures; rehearse all three stories on supported Linux and Windows/WSL paths, with both presenters swapping roles. Build an evidence index, limitations, release manifest/checksums and rollback reference. A release tag/push remains a separate user-authorized action. Gate: all mandatory stories and hardening evidence accepted by both developers. | No | — |

### Implementation Phase 2 — v1.1 Student and academic depth

- **GOAL-002**: Explain and govern each student's academic path across curriculum, registration, results and progression; start the postgraduate path without postponing it indefinitely.

Sources: exact DS3/4/5/7, Student 012–019, Adviser 025–027, Coordinator 028–030, journey books 02/04/05/07/10 and permissions/recovery/tests. Depends on GOAL-001. TASK-011 is the shared foundation for all later academic consumers.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Extend `catalogue` and `prisma/schema.prisma` with course versions, actual course offerings, academic-period hierarchy, organisational ownership/delivery, curriculum requirement groups, majors/minors and streams. Add reviewed migration mapping current string offering references and `CourseRegistration.courseId` to offering/version references; ambiguous records enter a reconciliation queue. Preserve old IDs and published snapshots; dual-read until reconciliation counts match. Test cross-school shared courses and full/half-course periods. | No | — |
| TASK-012 | Add `registration/rule-evaluator.ts` with effective policy snapshots and stable PASS/WARNING/BLOCK/APPROVAL_REQUIRED reasons for prerequisites/co-requisites, equivalence, load, timetable, capacity, standing, holds and dates. Render explanations and next actions in course-plan/readiness pages. Test exact deadline boundaries, curriculum transitions, concurrency for last seat and no enrollment mutation from a preview. Depends on TASK-011 and approved rules. | No | — |
| TASK-013 | Add evidence-led exemption/transfer/substitution/RPL and curriculum-transition cases under `records/academic-credit/`, plus student request and independent academic decision pages. Persist original evidence, evaluator, authority, satisfied/waived requirements and replacement credit separately. Test no credit double counting, permission denials, supersession and revoked evidence; emit approved effects for TASK-012. | No | — |
| TASK-014 | Add `assessment/progression/` with versioned previews and independent decisions for progression, carry, repeat year, academic standing, supplementary eligibility and lab exemptions. Policy distinguishes mandatory failure, failure count, CA/exam scheme, changed lab curriculum and prerequisite blockage. The handbook's 40/60 and 50/50 examples become fictional known-answer fixtures, not global rules. Consume `ResultAcademicImpact` idempotently and record successor decisions; never silently delete registrations. | No | — |
| TASK-015 | Extend registration add/drop/withdrawal/leave/return and repeat-course journeys. Show proposed effects on credits, fees, prerequisites and learning access before submission; explicit authorized exceptions preserve prior records. Finance owns repeat charges and integration owns access delivery. Add review/appeal intake, admissibility, evidence exchange, independent decision, implementation and outcome notification under `assessment/reviews/`; deadlines and reviewer authority require approved configuration. | No | — |
| TASK-016 | Add `postgraduate/candidature/` and student research home with curriculum-derived candidature, effective supervision, milestone owners/deadlines, progress evidence and interruption/extension review. Keep supervisor recommendation separate from final authority. Test conflicting/expired assignments, unsupported-supervisor escalation and interrupted submissions. This foundation feeds TASK-024 and TASK-064. | No | — |

Exit: a student with a major stream, shared half/full courses and a failed prerequisite can see an explainable approved progression decision, request a review and retain the original evidence; an amended mark reopens affected decisions without removing access. Known-answer rule fixtures and migration reconciliation pass.

### Implementation Phase 3 — v1.2 Teaching, examination and Moodle depth

- **GOAL-003**: Operate teaching and examinations with authoritative offering assignments and recoverable real-test-Moodle exchange.

Sources: exact DS4/5/7/9/11, Lecturer 020–024, Coordinator 028–030, Operations 036–037 and journeys 03/05/10/12. Depends on TASK-011; progression-dependent paths depend on TASK-014.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | Extend `teaching/` assignment lifecycle and TG allocation to real offering/section scope, capacity, substitute teachers, workload and effective dates. Implement timetable import/manual publication with versioned venue/recurrence/conflict checks; replace GAP-021 string-slot shortcuts. Screens show assigned roster, schedule freshness, next action and handover. Test teacher expiry, cross-section denial, concurrent allocation and cancellation impact. | No | — |
| TASK-022 | Implement approved grade-source adapter alongside `integration/moodle-live.ts` and `assessment` staging. Verify Moodle course/activity/user identity, source revision, scale, enrolment truth, changed mapping and archive state before transfer. Stage once; SIS never writes unofficial results back as marks. Test read-back after timeout, duplicate/out-of-order batches, partial provider outage, restricted errors and real sandbox contract fixtures. | No | — |
| TASK-023 | Add assessment-owned examination eligibility, teaching-evaluation completion reference and exam-slip versioning. Store only completion proof at the eligibility boundary; anonymous response content remains in QA. Add exam schedule, conflict/accommodation routing, invigilation and material custody with restricted access. Student screen explains each block and authorized exception route. Test failed SET refresh, schedule changes, duplicated slip issuance and misconduct/absence outcomes without converting them to zero. | No | — |
| TASK-024 | Extend `postgraduate/` with proposal versions, independent academic/ethics decisions, expiry/amendment gates, supervisor capacity/COI and progress reviews. The researcher cannot mark data collection started before required clearance. Separate academic approval from ethics; pause only policy-defined deadlines. Test expired ethics, material-method change and preserved supervision history. Depends on TASK-016. | No | — |
| TASK-025 | Run mapped offering close/archive/reopen and learner/staff access reconciliation in `integration` using approved retention policy. Verify delayed grade transfer cannot reopen a closed official result or remove valid enrolment. Establish load evidence for registration peaks and batch marking; last known status remains visible during outage. | No | — |

Exit: a real test Moodle offering, its enrolled students and time-bound teachers reconcile; one raw mark follows controlled SIS approval; exam-slip eligibility does not expose SET responses; postgraduate ethics gates work.

#### Timetable management workstream — required v1.2 depth

The user explicitly reaffirmed timetable and exam management on 2026-09-30. These are complete workflows with separate teaching and examination publication authority. This workstream expands TASK-021/023; it is not complete when a calendar widget exists.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-101 | Under proposed `apps/api/src/timetabling/`, model campus/building/venue, accessibility features, teaching versus examination capacity, resource requirements, availability and maintenance blackouts. Reference actual course offerings/sections and approved period calendars from TASK-011. Migrate existing TG slot labels through a reconciliation map, preserving historical allocations. | No | — |
| TASK-102 | Add versioned teaching schedule drafts: recurring lectures, labs/tutorials, full/half-course delivery blocks, assigned teachers and cohorts. Staff can import a validated template, place/change a session and preview affected people; invalid rows remain in a correction queue without partially publishing a file. Store local institutional time zone and explicit exception dates. | No | — |
| TASK-103 | Implement deterministic clashes for rooms, teacher commitments, registered students/shared curricula, accessibility needs and configured campus travel/setup time. Show the exact conflicting sessions and permitted resolution route. Test shared courses across streams/schools, elective overlap, capacity changes, recurrence exceptions and concurrent room booking. Hard constraints never become warnings through client flags. | No | — |
| TASK-104 | Add draft→validation→independent approval→published version with an impact preview for change/cancellation. Publish complete versions atomically; create neutral notifications and acknowledgement/follow-up tasks where policy requires. Student and lecturer pages default to their own approved timetable, highlight changed sessions and retain prior versions with dates. | No | — |
| TASK-105 | Add agenda/day/week views, text-list alternative, accessible filters, printable/downloadable personal calendar and explicit freshness. Show teaching and exam entries distinctly. Tokenized calendar subscriptions require revocation/expiry and minimum fields; no class roster in exported calendars. Test keyboard, small screens, stale cached feeds and cancelled-event updates. | No | — |
| TASK-106 | Optional advanced scheduler: first record an approved ADR and scheduling policy for constraint solving/import from a specialist engine. Produce scored draft alternatives with unmet constraints and human approval; never auto-publish. Test reproducibility, unsatisfiable constraints, manual overrides and return to manual scheduling on solver failure. No solver is required to close the initial timetable slice. | No | — |

Sequence: TASK-101→102→103→104→105; TASK-106 follows evidence from the manual workflow. Exit: a cross-school timetable change cannot double-book a room/teacher or silently alter a student's published schedule; every affected user can identify the change and next action.

Read-only foundation, 2026-10-02: [TASK-V2-TIME-001](../docs/task-packets/TASK-V2-TIME-001.md) exposes official registered courses and a truthful publication-pending state on the student portal ([evidence](../docs/learning/NOTE-V2-TIME-001.md)). No TASK-101–105 row is complete; the page contains no published class session or conflict validation.

#### Examination management workstream — required v1.2 depth

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-111 | Under proposed `apps/api/src/assessment/examinations/`, define exam periods/events for ordinary, supplementary, deferred, special, practical and other approved types, linked to offering, assessment scheme, duration and responsible authority. Build operations queue and event detail with readiness blockers, owners and deadlines; types and authority come from approved configuration. | No | — |
| TASK-112 | Build exam timetable drafts, room/seat allocation and invigilator assignment using TASK-101/103 resources with exam-specific capacity, student overlap/rest-spacing policy, COI and special arrangements. Allow controlled venue/time change with impact review and approved replacement schedule. Prove seat allocation is unique under concurrent requests. | No | — |
| TASK-113 | Expand TASK-023 eligibility into a per-student reasoned decision over current registration, academic requirements, approved holds, SET completion and permitted exceptions. Student completes teaching evaluation before obtaining an exam slip per the approved correction to DS5. Record only anonymous-survey completion proof, not responses. Issue versioned slips with authenticated verification and revocation on approved eligibility change; unavailable provider data stays unresolved, not falsely ineligible. | No | — |
| TASK-114 | Implement paper setter/moderator assignments, secure paper versions, independent approval, restricted timed download/printing, sealed-copy references and custody handoffs. Use private storage and quarantine from reviewed document services. Audit every access; general exam scheduling permission does not grant paper access. Handle compromised paper with incident and authorized replacement. | No | — |
| TASK-115 | Implement attendance/identity verification, permitted late entry, seat change, collected-script count, script handover and discrepancy reconciliation. Invigilators record incidents as allegations/evidence; authorized review controls withheld/misconduct/deferred states without silently changing numeric marks. Test lost script, absent versus zero, interrupted attendance submission and incomplete handover. | No | — |
| TASK-116 | Connect script moderation/results processing to Phase7 and review/appeal routes. Supplementary/deferred eligibility and fees consume approved progression and finance decisions; exam officers cannot invent them. Close an exam event only after attendance, scripts, incidents and handovers reconcile. Rehearse venue disruption, paper compromise and approved reschedule with privacy-safe student messages. | No | — |

Sequence: TASK-111→112; TASK-113 depends on TASK-051 participation proof and approved exception policy; TASK-114 can proceed alongside 112; TASK-115 follows published event/material controls; TASK-116 follows all and TASK-014/034. Exit: an eligible student completes SET, receives an authentic current slip, attends a scheduled/accommodated examination and can follow any result review while the office reconciles papers and scripts.

### Implementation Phase 4 — v1.3 Finance depth

- **GOAL-004**: Extend the existing finance ledger into governed operational money flows without rebuilding implemented sponsorship and arrangement basics.

Sources: DS6, finance journey08, security/recovery and official-record controls. Depends on TASK-011/014 for academic charging context; approved provider agreements required for external money.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-031 | Inventory existing invoices, allocations, reversals, adjustments, sponsorships and arrangements in `finance.service.ts`. Close GAP-020 with reviewed IAM adapter; represent amounts in existing exact monetary units and version fee/clearance policy. Test zero/negative/rounding/currency and payment allocation conservation; never overwrite posted transactions. | No | — |
| TASK-032 | Complete sponsor agreements, coverage eligibility, split liability, partial payment and arrangement installment/default review. Student sees payer split, upcoming obligation and clearance explanation; sponsor sees only approved sponsored records. Add finance officer review/reconciliation screens and scoped exports. Test expired coverage, overpayment, duplicated sponsor batch and disputed allocation. | No | — |
| TASK-033 | Add refund request→eligibility→independent approval→provider execution→reconciliation, with linked reversals and lost-response recovery. A failed refund delivery does not become a completed refund; provider replay cannot pay twice. Add cashier receipt/void workflows only after approved authority and cash controls. | No | — |
| TASK-034 | Consume repeat/supplementary/research events from TASK-014/024 to create fee assessments using fee-policy version and source decision reference. Academic services never calculate money. An amended result opens financial review; it cannot erase a paid charge. Test duplicate events, withdrawn academic decisions and manual dispute closure. | No | — |
| TASK-035 | Implement period reconciliation/control totals and close/reopen review in `finance/reporting/`; verify payment webhook signing, source account reconciliation and restore replay against an approved sandbox provider. Establish provider outage/refund runbooks and finance UAT evidence. | No | — |

Exit: one split-sponsored repeating student can pay partially, receive a governed correction/refund and reproduce the complete statement after restore with no duplicate money movement.

Review-worktree finance workbench increments, 2026-10-03: [TASK-V2-FIN-001](../docs/task-packets/TASK-V2-FIN-001.md) bounds reconciliation cases and supplies exact home counts; [TASK-V2-FIN-002](../docs/task-packets/TASK-V2-FIN-002.md) bounds pending arrangement review; [TASK-V2-FIN-003](../docs/task-packets/TASK-V2-FIN-003.md) bounds pending adjustment/refund review by kind and shows role-appropriate forms. These make portions of TASK-032 easier to operate but do not complete TASK-031–035, authorize live payments, or certify finance reports.

[TASK-V2-FIN-004](../docs/task-packets/TASK-V2-FIN-004.md) replaces the student's fixed demo finance period with own invoiced-period navigation and keeps payment/arrangement requests tied to the visible period. This closes a student-navigation gap only; it does not complete the finance goals above.

The shared [v2.0 workspace shell](../docs/design/WORKSPACE-SHELL-V2.md) now fixes sidebar, top bar, mobile navigation and future module positions. Each additional workbench must add only a working, role-relevant route with its own task packet and server authority; a reserved position is not a feature-complete claim.

### Implementation Phase 5 — v1.4 Student support and protected services

- **GOAL-005**: Deliver human-reviewed support with explicit ownership and deadlines while keeping confidential services separate.

Sources: exact DS8/12B, Adviser025–027, Dean journey06, services journey09 and restricted-permissions Part3B. Depends on TASK-011 and reliable source freshness from GOAL-003.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-041 | Add `student-success/` explainable observations from approved academic/learning/registration sources with source version, freshness, owner, due date and expiry. Queue supports validate, dismiss with reason, merge duplicate, monitor and assign adviser. No automatic diagnosis, discipline, exclusion or counselling case. Test delayed Moodle feeds and duplicate outreach. | No | — |
| TASK-042 | Add student/adviser appointment, outreach and follow-up journey with agreement, correction, decline and escalation routes. Store delivery attempts separately; unverified contact creates a contact-update task. School Dean sees aggregates and only authorized escalations, with definition and refresh time. Test stale source, reassigned adviser and declined ordinary support. | No | — |
| TASK-043 | Add separate `counselling/` protected case store and purpose-bound service: consent/self-referral, intake, appointment, restricted notes, professional referrals and closure. Academic callers receive only permitted referral status. Audit reads/downloads/disclosures and time-limited emergency access. Prove adviser, lecturer, dean, system admin and unrelated counsellor denials at API and export boundaries. | No | — |
| TASK-044 | Add disability/accommodation and welfare/service journeys under distinct scoped modules; expose operational adjustments without disclosing medical evidence. Cover service capacity/waitlists, approved housing allocation/appeal and appointment collision recovery. Approved service catalogue and safeguarding policy are prerequisites, not coded guesses. | No | — |
| TASK-045 | Add `discipline/` report, jurisdiction, notice, response, investigation, hearing, reasoned decision, sanction and appeal. Store allegations separately from findings; COI/reassignment and student response are required. Send explicit effective-dated commands to record/registration owners after approval; never directly edit Moodle, money or grades. Test overturned sanction restoration and counselling-note isolation. | No | — |

Exit: an explainable academic concern becomes an accepted or declined support invitation, with a due follow-up and no confidential leakage; an appealed disciplinary decision preserves procedural history.

Review-worktree academic-support increment, 2026-10-03: [TASK-V2-SUPPORT-003](../docs/task-packets/TASK-V2-SUPPORT-003.md) supports an agreed or declined, dated follow-up within a synthetic student-initiated case. It is a partial TASK-042 building block; proactive observations, real appointment capacity, confidential services and institutional activation remain open.

[TASK-V2-SUPPORT-004](../docs/task-packets/TASK-V2-SUPPORT-004.md) adds a bounded, selected-adviser worklist for those open actions and confirmation claims. It improves caseload navigation; it does not create reminders, service-level deadlines, supervisor escalation or live operation.

[TASK-V2-SUPPORT-005](../docs/task-packets/TASK-V2-SUPPORT-005.md) adds evidenced, immutable closure to the synthetic academic case. It completes this case's basic student/adviser lifecycle while TASK-041/042 still require proactive observations, approved outreach/delivery, appointment capacity, reassignment, escalation and institutional activation.

#### Student-facing AI assistance — staged v1.4 pilot to v2.0

This workstream is explicitly requested by the user on 2026-09-30. It extends the plan; it does not treat existing handbook approval of responsible analytics as blanket approval of a deployed student chatbot. The required ADR/privacy/provider/use-case gates remain, with ordinary search, help and staff contact available when AI is unavailable or declined.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-121 | Create `docs/adr/ADR-student-assistance.md` and a use-case/data-disclosure register. Define approved intents (explain a SIS status, find institutional guidance, plan study time, locate learning resources, prepare an adviser question, navigate support), prohibited decisions, hosting/provider, retention, consent/notice, cost limits and human owner. Record proposed UI, threat model and acceptance dataset; obtain the required institutional/ADR decisions before activation. | No | — |
| TASK-122 | Add proposed `student-assistance/knowledge/` ingestion of approved effective-dated policies, programme guidance, service contacts and permitted learning resources. Preserve provenance, approval, audience/scope, checksum, effective/expiry dates and supersession. Search/retrieval enforces authorization before ranking or model context; missing/conflicting/outdated authority produces an explicit uncertainty and responsible-office link. | No | — |
| TASK-123 | Add a student-owned context service returning minimal, current, permission-checked summaries of registration, own published results, timetable, deadlines and finance status through existing owner APIs. Counselling notes, peer data, examiner papers, unpublished marks and protected allegations never enter the model context. Cache keys include account, workspace and source version; revalidate permission on every follow-up. | No | — |
| TASK-124 | Build `apps/web/app/student/assistance/` with suggested tasks and an accessible conversation/help UI: explain a hold with source/next action; create an editable study plan around the student's published timetable; explain curriculum options without asserting eligibility; find permitted Moodle resources; help prepare a support/referral request. Answers display source links, dates and uncertainty. Student confirms any proposed task/draft; official registration, money, results and referrals retain their existing forms/approval routes. | No | — |
| TASK-125 | Add human escalation with student-reviewed summary and explicit recipient/consent. The assistant may offer academic, disability, financial or counselling services but cannot diagnose, infer a mental-health condition, assess crisis safety, discipline or automatically create a sensitive case. Show approved urgent-contact guidance when relevant; a failed handoff remains visible with a receipt/retry route. | No | — |
| TASK-126 | Build known-answer and adversarial evaluations for citation accuracy, stale/conflicting rules, hallucinated deadlines, cross-student access, prompt injection in retrieved documents, hidden-instruction extraction, tool misuse, multilingual ambiguity and accessibility. Test provider timeout, cost/rate limits, interrupted responses, account switch and source revocation. Redact logs; no identifiable student data is used to train an external model without separate approval. | No | — |
| TASK-127 | Run an opt-in, monitored pilot with approved synthetic then explicitly authorized institutional data, support ownership, student feedback and a disable switch. Gate rollout on agreed quality/privacy/cost thresholds and documented false-answer correction. Version prompts/models/knowledge and rerun evaluations before change. Retain non-AI routes; poor quality rolls back assistance, never underlying SIS records. | No | — |

Sequence: TASK-121→122→123→124→125→126→127; knowledge/help search may be delivered without model activation. The pilot depends on reliable source modules and approved provider arrangements from TASK-082. Study suggestions are advisory; only the authoritative rule engine can state an approved academic decision. Exit: a student can obtain a cited explanation and useful editable plan, resolve uncertainty with a human, and use the SIS fully when AI is off.

### Implementation Phase 6 — v1.5 Quality and governance

- **GOAL-006**: Complete evidence-led review and independent corrective-action closure with useful institutional decisions.

Sources: exact DS11, QAO031–034, journey11/11a, decision/evidence UI and restricted permissions. Depends on TASK-011 and source projections; TASK-051 can follow v1.1 before the other v1.5 tasks to serve exam-slip completion.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-051 | Add `quality/surveys/` SET cycles, eligible participants, anonymous responses, completion proofs, aggregation/suppression and publication approval. Separate identity-linked participation from responses; emit only a completion reference for TASK-023. Test small cohorts, repeated submissions and lecturer inability to identify respondents. | No | — |
| TASK-052 | Add quality review cycles, standards/criteria versions, evidence requests, quarantine-safe evidence versions and provenance. QAO workspace shows current stage, assigned owner, deadline, missing items, verification state and next action. Evidence replacement must not change a frozen submission. | No | — |
| TASK-053 | Add finding→owner response→corrective action→implementation evidence→independent verification→close/reopen/escalate. Reviewer cannot close their own corrective action without independent authority. Test rejected evidence, overdue reassignment, conflicting review roles and reopened findings. | No | — |
| TASK-054 | Add programme review/accreditation register with campus/mode/curriculum scope, conditions, renewal and student-protection/teach-out routing. Add committee agenda, quorum/COI, frozen papers, decision and assigned follow-up; leadership dashboard links approved metrics to actions. Authority/quorum values must be configured from approved decisions. | No | — |
| TASK-055 | Add audit engagement, evidence-preservation/legal-hold routing and permitted regulatory evidence pack handoff. Audit findings do not mutate source transactions. Test restricted download expiry, replacement evidence, reproducibility and official report correction handoff to TASK-072. | No | — |

Exit: a programme review produces a finding, independently verified correction and a traceable committee decision; anonymous student feedback remains anonymous.

### Implementation Phase 7 — v1.6 Graduation, research examination and credentials

- **GOAL-007**: Confer and verify awards from complete approved source records, including postgraduate completion.

Sources: exact DS3/5/7/10, Student completion records and journey07/10. Depends on TASK-014/024/034; award and signatory rules require approval.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-061 | Add `graduation/readiness/` versioned requirement evaluation over curriculum, official results, approved credit, research completion, holds and clearance. Student sees each unmet condition and responsible office; officers reconcile source issues through source workflows. Test later result amendment invalidates readiness and does not silently revoke a conferred award. | No | — |
| TASK-062 | Add independent completion recommendation, approved award list, conferral decision and immutable award record. Preserve source snapshot and authorized signatory reference. Handle deferred/conflict cases individually without hiding incomplete batches. Test duplicate conferral and unauthorized authority. | No | — |
| TASK-063 | Add `credentials/` transcript/certificate issue, controlled download/print, delivery tracking, public minimal verification, replacement and revocation. Verify source checksums and bind document version to award/results; official correction creates replacement, never edits an issued PDF. Test guessed identifiers, tampering, stale verification cache and delivery outage. | No | — |
| TASK-064 | Complete research submission readiness, explicit non-recommendation escalation, quarantined thesis version, examiner nomination/COI/time-limited access, reports, optional viva, independent outcome, correction cycles and repository deposit/embargo. Add `postgraduate/examination/` and researcher/supervisor/examiner screens. Approved completion feeds TASK-061; it never issues an award itself. | No | — |
| TASK-065 | Exercise thesis/research fees, protected external examiner access expiry, credential restore and revocation/replacement drills. Reconcile every issued document to one approved source snapshot and evidence audit. | No | — |

Exit: taught and research students each complete an approved route to conferral, receive a verifiable credential, and retain correct history after replacement or academic correction.

### Implementation Phase 8 — v1.7 Reporting and regulatory delivery

- **GOAL-008**: Produce reproducible certified reports whose figures, privacy and correction paths remain controlled.

Sources: exact DS11, QAO034, architecture reporting ownership and restricted export controls. Depends on source modules; do not build an unrestricted production SQL query interface.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-071 | Add `reporting/metrics/` registry with owner, numerator/denominator, cohort/census, exclusions, missing-data treatment, source version, freshness, classification and approval. Build read models from owned events and reconciliation; preserve historical organisation/curriculum dimensions. Known-answer fixtures reconcile to source totals. | No | — |
| TASK-072 | Add census freeze→validation→owner review→authorized snapshot→submission→acknowledgement and correction/versioning. Store query/metric version, source cut, row/control totals and checksum. Reject partial refresh as complete; last certified output stays available with its actual date. | No | — |
| TASK-073 | Implement only supplied HEA/ZAQA/professional-body contracts as versioned adapters. National identifier matching remains separate from internal identity, with duplicate/mismatch review. No developer-invented regulator fields or deadlines. Test rejected files, acknowledgement loss and exact resubmission without duplicate external identities. | No | — |
| TASK-074 | Add purpose-bound export request/approval, field minimization, small-cell and complementary suppression, expiring download and access audit. Test differencing across filters, restricted combinations, spreadsheet formula injection and prohibition of counselling-case drill-down. | No | — |
| TASK-075 | Add role-specific management/leadership views with definition, source, refresh and next action. Add graduate tracer/alumni consent and aggregated outcomes. Keep forecasts labelled separately. Any optional AI assistant is a separate ADR/use-case/privacy/model-validation gate and may query only permitted governed metrics; it cannot decide, submit or fabricate evidence. | No | — |

Exit: a frozen institutional report can be reproduced after source corrections, submitted/acknowledged and superseded with a documented correction; suppressed private populations cannot be reconstructed.

### Implementation Phase 9 — v1.8 Production integrations and migration readiness

- **GOAL-009**: Replace each simulator only after independent provider, security and operational evidence exists.

Sources: DS9/10, Operations035–037, architecture integration contracts and open production decisions. Sandbox contract development can run alongside earlier releases; production activation waits for its domain acceptance.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-081 | Complete approved identity/appointment source, SSO, MFA/recovery, contact verification and delegated authority lifecycle in `identity-access/`. Test terminated appointment, multi-role switch, recovery suspicion, break-glass expiry and provider outage. Authentication success never grants domain authority by itself. | No | — |
| TASK-082 | Validate approved Moodle, payment, email/SMS and private storage/scanning adapters with contract suites, least-privilege secrets, rotation, signatures, replay limits, read-back and reconciliation. Keep environment allowlists and demo/production configuration separate. Neutral notifications contain portal links, not result/health/disciplinary detail. | No | — |
| TASK-083 | Add per-destination outbox/inbox receipts, retries/backoff/dead-letter and independently approved replay if required. Operations queue shows owner, source reference, failure category, age, attempts, next action and reconciliation evidence. Test one destination failing while another succeeds, duplicate/out-of-order events, worker restart and uncertain provider response. | No | — |
| TASK-084 | Rehearse legacy import in isolated databases: inventory/classify, approved mapping, dry run, duplicate/ambiguous identity review, monetary/result control totals, reconciliation and rollback. Never import dirty/unapproved records directly as official decisions. Store import provenance and restricted access. | No | — |
| TASK-085 | Document hosted topology for web/API/workers, private PostgreSQL, private persistent storage, scheduler ownership, backups and observability in `docs/operations/`. Exercise portability/local execution and restore in a separate environment. Production DNS/secrets/activation requires explicit authorization and institutional readiness evidence. | No | — |

Exit: every active provider has an owner, signed-off contract, monitoring, recovery runbook and demonstrated reconciliation; simulator availability remains for tests.

### Implementation Phase 10 — v2.0 Operational completion

- **GOAL-010**: Establish declared operational maturity across every agreed module and user journey.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-091 | Reconcile every approved requirement/action/role/screen/test and open gap against `docs/roadmap/MODULE-MATURITY.md`. No unimplemented journey is hidden under a green parent module. Record explicit accepted deferrals with authority and impact; undocumented absence blocks completion. Depends on GOAL-002 through GOAL-009, required timetable/exam workstreams and an explicit accepted outcome for the student-AI pilot. | No | — |
| TASK-092 | Run independent threat/authorization/privacy review, dependency decisions, session/step-up abuse, upload attack fixtures, export leakage and audit retention/legal-hold tests. Resolve critical/high defects; document residual decisions with owner and expiry. | No | — |
| TASK-093 | Execute representative peak registration, payment callback, Moodle backlog and result-release load; use institution-approved budgets for latency, throughput and recovery. Test interrupted/low-bandwidth journeys, keyboard, screen readers and supported device widths. Do not infer accessibility from screenshots alone. | No | — |
| TASK-094 | Perform full backup/restore, failover and deployment rollback with source-to-provider/report/credential reconciliation, measured recovery time and data loss against approved RTO/RPO. Demonstrate alert acknowledgement and incident ownership during drills. | No | — |
| TASK-095 | Complete named role UAT, operational training, support rota/runbooks, data-migration reconciliation and phased cutover/rollback rehearsal. Archive traceable release manifest and agreed maturity matrix. Only then request release/cutover authorization; this plan contains no pre-authorized production launch. | No | — |

## 3. Alternatives

- **ALT-001**: Adding empty modules for all domains was rejected because it hides missing user journeys and does not satisfy Section22 maturity.
- **ALT-002**: Replacing the modular monolith with distributed services was rejected; no approved requirement currently outweighs the transaction/recovery and operational cost.
- **ALT-003**: Finishing provider production deployment before domain authority was rejected. Sandbox contracts can proceed in parallel, but transport cannot make a provisional academic or financial decision official.

## 4. Dependencies

- **DEP-001**: Approved policy/appointment inputs include academic calendars, grading/rounding, progression/carry/repeat/supplementary/lab rules, fee/refund/clearance rules, review windows, signatory/committee authority, retention, confidentiality and safeguarding. Each missing input has a blocking gap and responsible office, not a guessed value.
- **DEP-002**: Source relationship registry from TASK-011 is required for school/programme/offering/section scope. Reconcile legacy role strings and free offering references before broadening authority.
- **DEP-003**: OpenCode fixes require reviewed integration and fresh tests; filenames and old green runs are not acceptance evidence.
- **DEP-004**: Institutional/provider contracts, credentials and sandbox access precede activation. Regulatory details in the handbook are design inputs; the responsible office must confirm the effective contract at implementation time.

## 5. Files

- **FILE-001**: Existing ownership roots: `apps/api/src/{identity-access,catalogue,admissions,records,registration,finance,teaching,integration,assessment}/`, `prisma/schema.prisma`, additive `prisma/migrations/`, `packages/contracts/src/`, `packages/config/src/`.
- **FILE-002**: Proposed owned modules: `postgraduate/`, `student-success/`, `counselling/`, `discipline/`, `quality/`, `graduation/`, `credentials/`, `reporting/`, `timetabling/`, `student-assistance/`; add their Nest modules only with a working tested vertical slice.
- **FILE-003**: Web journeys extend `apps/web/app/student/`, `apps/web/app/admin/`, explicit scoped workspace routes and allowlisted `app/api/` proxies. New components belong in `packages/ui/src/` only after a demonstrated reusable need.
- **FILE-004**: Evidence belongs in `docs/task-packets/`, `docs/gaps/`, `docs/learning/`, `docs/operations/`, `docs/roadmap/` with API tests in `apps/api/test/` and browser stories in `tests/browser/`.

## 6. Testing

- **TEST-001**: For every command: authorized allow; wrong role/scope/relationship; inactive/revoked/time-expired grant; stale version; repeated same-key receipt; changed-payload conflict; concurrent different actors; rollback after partial internal writes; lost response retry; safe error/audit with no secret/peer leakage.
- **TEST-002**: For every official record: immutable original; correct successor links; frozen source/policy; source correction through its owner; idempotent downstream invalidation; failed delivery independent of decision; restore reproducibility.
- **TEST-003**: For every screen: loading/empty/error/stale/forbidden/success/unknown-outcome states, clear next action and recovery, programmatic labels, keyboard/focus, screen-reader review, 390px and desktop widths, no sensitive localStorage, safe timestamps and long content.
- **TEST-004**: Fresh database migration and reviewed upgrade fixture, data/control-total reconciliation, repeat deployment, rollback/restore rehearsal. Never run destructive reset helpers on an existing shared database.
- **TEST-005**: MVP regression runs use approved fictional seeds and pinned Node24 toolchain. Unit/type/lint/build/source checks are necessary but do not replace real PostgreSQL, provider sandbox, browser or human acceptance evidence.

## 7. Risks & Assumptions

- **RISK-001**: The primary and assessment histories diverge. A passing isolated branch cannot establish combined migration or security compatibility.
- **RISK-002**: Demo rules, string role aliases and free offering references can be mistaken for institutional authority. Keep gates closed until mapped/approved and verified.
- **RISK-003**: Advanced support/reporting can leak sensitive information through joins, notifications or small aggregates even when the screen hides a field. Test API, exports, audit and reporting projections independently.
- **RISK-004**: Cross-domain amendments can leave stale readiness. Every consumer records source version and an explicit review/recalculation outcome; absence of an acknowledgement is visible.
- **RISK-005**: A page-size cap and synthetic happy-path are not proof of 20,000-record operations. Establish query plans, transfer/payload bounds, concurrent queue mutation behavior and institutional service targets before claiming scale.
- **RISK-006**: A setup UI could be mistaken for authority. GAP-V2-001 blocks privileged institutional configuration writes until separate proposer/approver, scope, step-up, emergency and recovery decisions are approved.
- **RISK-007**: Zambian language and terminology support can become misleading if translated policy is unreviewed. Keep English and approved institutional formats; activate other terminology/language packs only after named review/ownership.
- **ASSUMPTION-001**: The approved Section22 release families remain the organising sequence; this plan adds missing detail and dependencies, not a new claim of approval or fixed delivery dates.

## 8. Related Specifications / Further Reading

- [v2.0 operating SIS design](../docs/superpowers/specs/2026-10-02-v2-operating-sis-design.md) and [sequenced implementation plan](../docs/superpowers/plans/2026-10-02-v2-operating-sis-plan.md)
- [GAP-V2-001 institutional setup authority](../docs/gaps/GAP-V2-001-institution-configuration-authority.md)

- [Source map and precedence](../docs/roadmap/SOURCE-MAP.md)
- [MVP audit](../docs/learning/MVP-AUDIT-2026-09-30.md)
- [Module maturity](../docs/roadmap/MODULE-MATURITY.md)
- [Release gates](../docs/roadmap/RELEASE-PLAN.md)
- [Deferred features](../docs/roadmap/DEFERRED-FEATURES.md)
- [Technical debt](../docs/roadmap/TECHNICAL-DEBT.md)
- [Original release families](../../unza-sis-moodle-design-handbook-v3.0.0/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/14-expansion-v1-1-to-v2-0.md)
