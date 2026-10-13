# SIS v2.0 — university operations platform design

- **Status:** written specification approved by the user on 2026-10-02; implementation is underway in the Phase 7 review worktree. Task-level authority, operational acceptance and release gates remain separate.
- **Purpose:** extend the existing SIS toward the handbook-defined, operationally complete university information system, with reliable student and staff workflows at institutional scale.
- **Scope baseline:** the existing v2.0 backlog in [feature-sis-expansion-2.0.md](../../../plan/feature-sis-expansion-2.0.md), refined by this specification and the approved handbook. This file adds requirements and acceptance gates; it does not replace the backlog or amend approved handbook evidence.
- **Data constraint:** use repository source, approved documentation and generated synthetic fixtures; do not download or import real university/student datasets. The user lifted the limited-internet-data restriction on 2026-10-02. Report substantial transfers and any provider cost before starting; cloud Moodle and paid/real providers remain separately gated.
- **Moodle constraint:** keep the simulator as the active integration during this work. Defer the cloud Moodle connection until the user separately resumes that work.

## 1. User and institutional outcome

The system must support the actual operating work of a university: the institution can configure its structure and approved rules; applicants can complete and track a real application journey; staff can process large queues through scoped, explainable workflows; students and staff can complete academic, finance, teaching, examination, support and governance tasks; leaders can use trustworthy, reproducible reports; and each action leaves a recoverable, auditable record.

The SIS is a configurable modular monolith, not a set of screens that imitate a university. Each domain owns its records and decisions. Official outcomes remain with the accountable institution and owning domain. External systems report evidence or perform approved delivery; they do not silently change SIS authority.

## 2. Controlling design sources

Read task-linked exact records fully before each implementation slice. In order, later approved decisions and security/privacy/official-record rules take precedence over exact approved evidence, curated handbooks and examples. Existing fictional rules remain test fixtures only.

Key handbook sources include:

- [Domain ownership and effective-dated institutional graph](../../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/001-design-section-1-domain-architecture-and-ownership.md).
- [Student lifecycle and institutional setup outcome](../../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/003-design-section-3-student-lifecycle-and-principal-use-cases.md).
- Exact domain records for [curriculum and delivery](../../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/004-design-section-4-curriculum-programmes-and-academic-delivery.md), [assessment and results](../../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/005-design-section-5-assessment-examinations-results-and-progression-operations.md), [admissions and finance](../../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/006-design-section-6-admissions-onboarding-and-student-finance.md), [research](../../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/007-design-section-7-postgraduate-research-lifecycle.md), [student support](../../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/008-design-section-8-student-success-counselling-wellbeing-and-discipline.md), [integration](../../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/009-design-section-9-integration-architecture.md), [security/privacy](../../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/010-design-section-10-security-privacy-audit-records-and-resilience.md), [analytics and responsible AI](../../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/011-design-section-11-quality-assurance-regulatory-reporting-analytics-and-responsible-ai.md), [portals and accessibility](../../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/012-design-section-12-portals-ux-accessibility-and-communications.md), and [proactive observation and follow-up](../../../../unza-sis-moodle-design-handbook-v3.0.0/15-APPROVED-DESIGN-EVIDENCE/01-design-sections/013-design-section-12b-proactive-student-observation-and-follow-up.md).
- The [approved UI constitution](../../../../unza-sis-moodle-design-handbook-v3.0.0/04-UI-UX-DESIGN-SYSTEM/01-ui-ux-constitution.md), task-linked role and cross-blueprint evidence, supersession register and readiness matrix.
- The implementation's [current maturity](../../roadmap/MODULE-MATURITY.md), [MVP audit](../../learning/MVP-AUDIT-2026-09-30.md), and [source map](../../roadmap/SOURCE-MAP.md).

## 3. Design decisions

### 3.1 Configure the institution before enabling its workflows

Provide a guided, role-scoped institution setup workspace. Its first setup journey establishes the institutional profile, campuses, effective-dated organisational units and relationships, academic years/terms/semesters/teaching periods, programme catalogue and offerings, curriculum versions, admissions cycles, policy owners, workflow routes, approved terminology/languages, and operational readiness.

Organisational units form a graph with configurable unit types and separately versioned relationships such as reporting, academic ownership, delivery and location. Do not require every programme to fit one fixed School → Department hierarchy. Reorganisations preserve historical relationships and existing student decisions.

Configuration uses a constrained, typed schema and supported rule operators. Authorized institutional users can edit values and rule sets through forms, tables and guided workflows; they cannot upload or execute arbitrary code. Every policy/configuration change has an owner, scope, version, approval evidence, effective dates, validation results and supersession history. The workbench supports draft, validate, preview affected records, compare, approve, schedule, publish, rollback/supersede, and audit. A rule without approved values remains inactive and explains what decision is needed. Existing source policies and published academic outcomes are never rewritten by editing current configuration.

### 3.2 Process large workloads as queues and batches

Replace workflows that require staff to open and decide one record at a time with scoped work allocation and safe batch operations. Admissions work is routed by configured intake, school/programme, qualification/evidence task and staff appointment. Supervisors can see workload and overdue states within their authority and reassign with an audit reason. The system can validate completeness, detect duplicates, classify routine/exception cases and prepare recommendations in bulk where policy permits. It cannot automatically admit, reject, grade, clear fees, diagnose, discipline or make another high-impact decision unless an approved rule explicitly delegates that decision and its controls are implemented.

Large record lists use server-side search, filters, stable sorting, pagination or cursor navigation, saved views where useful, selection counts and explicit bulk-action review. Bulk actions return per-record success/refusal/review status and a reconciliation reference; partial success is never hidden behind one green message. High-impact decisions remain individually attributable and follow the applicable approval/separation-of-duties route. Queue freshness, assignment, source, age, priority reason and next permitted action remain visible.

### 3.3 Modern, locally useful workflow UI

Apply the approved UI constitution: calm and professional, clear before decorative, dense enough for office work without crowding, and consistent across applicant, student and staff workspaces. Present context, task, current state and next action first; progressively reveal detail and advanced options. Use concise, plain institutional language and the university's approved terminology. Do not assume US school terminology or force “roster,” a fixed term/semester model, or a particular national ID format into every screen.

Make terminology and language resources configurable and versioned. English remains available; other languages are enabled only after institutional translation review. Dates, time zones, currency, phone numbers, addresses, names and identifiers use institutional formats. High-impact policy and legal copy must use approved translations, not unreviewed machine translation.

Every dense table supports accessible keyboard operation, server-side page/sort/filter, clear result counts, empty/loading/stale/forbidden/error states, and a labelled record-card presentation on small screens. Keep primary actions textual and concise, show why an action is unavailable, preserve entered data after recoverable failure, and add small motion only to confirm real loading, save, upload, retry or completion states. Do not use decorative metric cards, unexplained charts or mock success responses.

### 3.4 Applicant and admissions journey

Upgrade the application journey based on the applicant blueprint: current programme information and requirements; eligibility guidance clearly marked non-binding; concise, conditional steps; saved/resumable drafts; robust document upload and scanning state; applicant-readable correction requests; a review before submission; idempotent receipt; and a secure status history with the next action. Avoid asking for information the institution already has or showing all fields to every applicant.

Admissions staff receive assigned queues and bulk completeness/duplicate checks. Qualification exceptions, conflicting evidence, fee-waiver cases and policy exceptions route to the right authorized reviewer. A batch may be assigned or validated together; each decision, reason and notice remains per applicant and individually auditable. Design and test an intake of 20,000 synthetic applications so one or two officers are not expected to process every item sequentially. The institution's service-level and staffing targets are measured and agreed before operational acceptance; this design does not invent them.

### 3.5 Academic delivery, timetable, examinations and attendance

Complete the planned academic foundation and timetable/examination workstreams: effective course/offering/period data; curriculum-aware registration and progression; teaching assignments and groups; conflict-aware teaching timetables; examination scheduling, eligibility, accessible slips, accommodations, invigilation, material/script custody, incidents, reconciliation, appeals and official results. Calendar, eligibility, scheme and approval rules are versioned and changeable by authorized configuration without code edits.

Attendance is captured for each configured teaching session, linked to the authoritative class list, section, teacher and session. The proposed default is a short-lived session challenge presented in the teaching context, authenticated student check-in, lecturer confirmation/exception correction, and tamper-evident records. Prevent replay, duplicate check-in and check-in outside configured time/session; offer accessible/manual recovery that records who confirmed it and why. Treat device location or a shared QR as weak evidence, never proof by itself. The product must say “fraud-resistant” rather than promise “cheat-proof”: no software-only remote method can establish physical presence with certainty. Do not add biometrics or continuous location tracking without separate institutional policy, privacy impact approval and a non-biometric alternative. Attendance and learning engagement may support explainable human review; they do not automatically fail, exclude, discipline or label a student.

### 3.6 Moodle boundary

During this program, keep the local simulator as the active Moodle provider and keep real credentials absent. Preserve the one-entry, source-versioned integration design: Moodle is authoritative for permitted learning activity/raw marks; SIS validates mapped evidence and owns registration, moderation, board decisions, official results and corrections. No direct Moodle-to-official-result shortcut. Add contract and drift tests against synthetic fixtures, but do not make a cloud call until the user separately asks to resume that setup and its live-test safety gates are complete.

### 3.7 Student success and protected services

Implement explainable student-success signals only from approved, fresh, purpose-allowed SIS and (later) Moodle data. Show source and freshness, let authorized staff verify, correct, dismiss or assign follow-up, and let students accept, decline or request help. Never infer a diagnosis or automatically create discipline, exclusion, a financial hold or a counselling case.

Counselling, disability, welfare, safeguarding and discipline are real, separate, owner-operated workflows with scoped assignments, consent/disclosure rules, appointments/referrals, response and outcome status, audited restricted access, retention and escalation. Academic callers receive only the minimum permitted referral/adjustment status. A screen or button that reports an action without a persisted case, owner, audit and recoverable next state does not satisfy v2.0.

### 3.8 Student assistance, reporting and payments

Student assistance has a persistent, searchable conversation history owned by the student; clear new/rename/archive/delete controls; source citations and freshness; permission-checked student-owned context; and a visible human route. Knowledge search can ship without a model. A model provider, training/use of data, retention, cost budget and allowed tools require a separate reviewed ADR and privacy approval. Keep an ordinary non-AI route at all times. The assistant can explain and draft; it cannot make official decisions or write records without student confirmation through the existing approved workflow.

Reports use governed, versioned metric definitions and identify population, period, source, freshness, caveats and approving owner. Provide role-scoped summaries and controlled CSV, spreadsheet and PDF exports with minimized fields, small-cell/privacy suppression, access audit, expiry, safe spreadsheet escaping and reproducible source snapshots. Export does not bypass underlying permissions.

Payment workflows retain the SIS ledger as authoritative for charges/allocations/clearance and integrate through separately configured adapters. Production use requires the institution's selected provider, agreement, current fees, credentials and sandbox/settlement/reconciliation evidence. Until those are approved and funded, test only against synthetic fixtures or a provider's approved sandbox. A callback never marks a ledger decision paid/cleared without verification. Do not claim a payment completed while its provider result is uncertain.

## 4. Delivery sequence

The existing detailed backlog remains the task inventory. Re-sequence it into independently reviewable programs:

1. **Acceptance foundation:** reconcile the active review branch and primary work safely; close Phase 7 release-policy/IAM blockers or preserve deny-by-default; restore complete regression evidence and record the actual MVP boundary.
2. **Institution setup and configuration:** establish effective-dated organisation, periods, catalogue and typed policy/workflow configuration with approvals and historical preservation. This is the first new vertical slice because later workflows depend on it.
3. **Workflow scale and UI foundation:** shared dense-list query contracts, workload routing, safe bulk operations, terminology/language resources, and the applicant/admissions journey. Prove with 20,000 synthetic cases and browser journeys.
4. **Academic operations:** curriculum/rules/registration/progression; timetable, teaching operations, examinations, class attendance and student-facing academic journeys. Moodle remains simulator-only.
5. **Finance and provider readiness:** approved versioned charges/clearance, real sandbox provider adapters, reconciliation and truthful uncertain states. No live-money charge without separate authorization.
6. **Student support and assistance:** academic follow-up, restricted services, persistent cited student assistance, and then separately approved model/provider pilot.
7. **Governance, credentials and reporting:** quality/research/graduation/regulatory workflows with reproducible, privacy-preserving outputs.
8. **Operational acceptance:** security, scale, low-bandwidth, accessibility, backup/restore, rollback, provider reconciliation, support runbooks, role UAT and evidence-backed maturity.

Dependencies and existing task IDs remain governed by the detailed backlog. Any missing authority, value, state owner, disclosure rule, provider agreement or retention period is a recorded gap; implementation does not fill it with a guessed institutional rule.

## 5. New requirements added to the existing v2 backlog

These make implicit user expectations explicit; they do not narrow any existing task.

| Requirement | Added expectation | Acceptance evidence |
|---|---|---|
| V2-SETUP-001 | Institution can configure organisational graph, calendars, catalogue and approved rules before enabling dependent operations, without code changes | Setup journey, effective-date/relationship validation, policy preview/approval/supersession, two configuration versions and historical decision proof |
| V2-ADM-OPS-001 | Admissions scales through routing, prioritization and safe batch work rather than one-by-one review | 20,000 synthetic applications, scoped queue pagination/sort/filter, assignment/load reporting, partial bulk-action reconciliation, no unauthorized final decision |
| V2-UX-001 | Every role workflow has concise next actions, progressive disclosure, local terminology and accessible dense-list support | Approved UI review, keyboard/screen reader/mobile/no-overflow checks, loading/error/stale/unknown-outcome states |
| V2-LOCALE-001 | University terminology and language/format choices are institution-configurable | Reviewed terminology pack and language-format tests; no unreviewed high-impact translation |
| V2-ATTEND-001 | Teaching attendance is recorded each configured session with replay/duplicate controls and reviewable exceptions | Session-bound signed challenge, identity/roster checks, lecturer exception audit, offline/retry path, privacy review, false-positive/false-negative pilot evidence; no claim of perfect anti-cheat |
| V2-REAL-001 | Payment, support and integration actions are backed by real owner records and truthful provider/recovery state | Provider contract/sandbox evidence, end-to-end reconciliation, persisted owner/audit/receipt, outage/retry proof; no simulated success described as operational |
| V2-REPORT-001 | Leaders get explainable, reproducible and privacy-safe trends and downloadable reports | Versioned metrics, source/freshness display, CSV/XLSX/PDF output tests, suppression and export-security tests |
| V2-AI-001 | Student assistant has persistent conversations and permission-checked cited context while preserving human/non-AI routes | Ownership/isolation tests, citation/stale-source/adversarial evaluation, consent/cost/privacy approval, provider-off and failed-handoff journeys |

## 6. Scope and cost limits

- No external student, staff, finance, regulatory or Moodle datasets are downloaded or used. Generate synthetic fixtures locally, including the 20,000-application scale test.
- No package, browser, image or container download was required for the initial design and local slices. Later missing dependencies may be obtained under the 2026-10-02 data-use update, with substantial transfers and costs reported before starting.
- The design, plan and local implementation have no download charge. They may consume existing development-machine resources only.
- No model API, paid cloud storage, payment provider, paid Moodle plan or real transaction is activated by this specification. Before any such activation, present the chosen provider, the current price basis, expected test volume/cost and whether a free sandbox exists. The user then authorizes that external spend separately.
- Do not copy or expose secrets in chat, source control, tests, screenshots or audit data.

## 7. Acceptance for v2.0

The release can be called operationally complete only when each agreed module/journey reaches operational maturity, every approved workflow is connected to an accountable role and source of truth, configured rules are versioned and testable, student/staff tasks work at the agreed scale, sensitive data stays within policy, failure/recovery is demonstrated, and human role UAT plus operational runbooks and release approval are recorded. Presence of a route, screen, mock provider or passing simulator test is not operational acceptance.

## 8. Related artifacts

- [Detailed v2.0 implementation plan](../../../plan/feature-sis-expansion-2.0.md)
- [Product roadmap](../../roadmap/PRODUCT-ROADMAP.md)
- [Release gates](../../roadmap/RELEASE-PLAN.md)
- [Maturity](../../roadmap/MODULE-MATURITY.md)
- [Source map](../../roadmap/SOURCE-MAP.md)
- [MVP audit](../../learning/MVP-AUDIT-2026-09-30.md)
