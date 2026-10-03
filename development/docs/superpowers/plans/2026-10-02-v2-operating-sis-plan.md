# SIS v2.0 Operating Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Advance the SIS from presentation-ready vertical slices toward handbook-conformant university operations, with configurable and governed institutional setup, efficient high-volume work, complete student/staff journeys, and reviewable evidence for each release.

**Architecture:** Preserve the existing Next.js, NestJS modular monolith, PostgreSQL/Prisma, existing identity/authority model, and Moodle simulator. CSS Modules remain for existing screens while a user-directed Tailwind utility layer is adopted incrementally under [ADR-003](../../adr/ADR-003-tailwind-ui-layer.md). Deliver one owned, testable vertical slice at a time. Configuration remains typed, versioned and domain-owned; high-impact actions fail closed until exact institutional authority is approved.

**Tech Stack:** Existing Node 24/TypeScript workspaces, Next.js App Router, NestJS, PostgreSQL, Prisma, CSS Modules plus Tailwind CSS v4 for migrated web screens, Playwright, existing local test fixtures.

**Spec:** `development/docs/superpowers/specs/2026-10-02-v2-operating-sis-design.md`; scope is refined by `development/plan/feature-sis-expansion-2.0.md` and controlling handbook evidence.

## Global Constraints

- Use repository source, approved handbook records, and generated synthetic data only.
- The user's limited-data restriction was lifted on 2026-10-02. Continue to report substantial transfers and any paid-provider cost before starting them; use synthetic records, not downloaded student data.
- Keep the Moodle simulator active; defer cloud Moodle connection.
- No external model, payment, messaging, identity, or cloud provider calls without an approved decision and cost/transfer review.
- Never claim demo behavior is institutional policy or operational acceptance.
- No arbitrary executable code in rule/configuration workspaces.
- Preserve role, scope, relationship, state, purpose, effective-time, audit, idempotency and separation-of-duties checks at API/domain boundaries.
- Do not commit, merge, push, deploy, reset shared databases or write production data without separate authorization.

## Review Focus

1. Large queues with equal timestamps, concurrent insertions and changing assignments keep stable, duplicate-free navigation (Task 1).
2. An officer cannot query another appointment's scope or see applicant PII outside the minimum queue projection (Task 1).
3. Filter changes, stale cursors and empty or shrinking result sets recover with clear counts and actions (Task 1).
4. Setup authority is absent, expired, revoked, mismatched or held by one person in both approval roles; all privileged configuration writes remain denied (Task 2).
5. Synthetic 20,000-application load tests do not hide unbounded queries, cross-scope results, partial bulk outcomes or infrastructure-specific performance claims (Task 3).

## File and ownership map

- `apps/api/src/admissions/review.service.ts`, `review.controller.ts`, `dto.ts`: scoped server-side queue query and navigation contract.
- `apps/web/app/admin/admissions/queue/{page.tsx,queue.tsx,queue.module.css}`: URL-addressable, accessible queue filters/navigation and truthful loading/error states.
- `apps/api/test/review-queue.e2e-spec.ts`, `tests/browser/admissions-queue.spec.ts`: API authorization/query contract and end-to-end interaction.
- `prisma/schema.prisma` and additive migrations: only after approved slice-specific ownership, authority, migration and recovery design.
- `apps/api/src/{catalogue,registration,teaching,assessment,finance,student-success,counselling,reporting,student-assistance}/`: modules own their decisions; integrations do not write across owners.
- `docs/task-packets/`, `docs/gaps/`, `docs/learning/`, `docs/roadmap/`: exact source mapping, gaps, evidence and maturity.

## Release sequencing

The existing `feature-sis-expansion-2.0.md` remains the subsystem inventory and dependency backlog. The sequence below sharpens the entry gates and adds the missing operational controls. Each numbered task is a separately reviewable release slice; later tasks do not inherit authority or acceptance from earlier demos.

### Task 1: Stable, navigable admissions queue (first implementation slice)

**Goal:** Let admissions reviewers move through scoped queue results efficiently while preserving the current assign/claim/release and recommendation/decision separation. This task adds query navigation, not batch decisions or expanded authority.

**Approved basis:** `REQ-ADM-005`, `REQ-ADM-006`, `REQ-NFR-005`, `ACT-ADM-001`, permission §15.4; `TASK-PH3-001`/`TASK-PH3-002`; current reviewer assignment gate. Confirm task-linked exact UI, security/recovery, cross-blueprint and later-supersession records before code.

**Current state:** API response is capped to 100 rows but scans an enlarged window, filters scope/action-needed in memory, and has no cursor. Web loads two initial lists, applies filters client-side/server refresh, displays “More available” but cannot navigate onward. Do not call this adequate 20,000-item scaling.

**Files:**
- Modify `apps/api/src/admissions/dto.ts`, `review.controller.ts`, `review.service.ts`.
- Modify `apps/web/app/admin/admissions/queue/page.tsx`, `queue.tsx`, `queue.module.css`.
- Extend `apps/api/test/review-queue.e2e-spec.ts` and `tests/browser/admissions-queue.spec.ts`.
- Add/update `docs/task-packets/TASK-V2-ADM-001.md` and `docs/learning/NOTE-V2-ADM-001.md`.

**Contract:** Add validated opaque `cursor` and bounded `take` query values while retaining `scope`, `state`, and `actionNeeded`. Return `{items, nextCursor, hasMore}`. Sort deterministically by authoritative `createdAt`/`claimedAt` then unique application ID. Apply role/scope and filters in the database query before limiting rows; select only minimum queue fields. Cursor encodes the last sort tuple and is bound to actor, active assignment, scope, and normalized filters; malformed, expired if expiry is implemented, or mismatched cursors fail safely and tell the UI to restart. No applicant PII is added. Page navigation state belongs in URL search params and resets the cursor when filters/view change. No browser persistence of sensitive row data.

- [ ] Read full current `TASK-PH3-001`, role/admissions exact evidence, action/permission records, UI constitution, API security/recovery/test records and supersession register; create `TASK-V2-ADM-001` with named lead/reviewer, IDs, exclusions and commands.
- [ ] Add failing API tests for stable next-page traversal, equal timestamps, no duplicates/omissions, filter-bound cursor, tampered cursor, foreign intake, revoked assignment and minimum response fields.
- [ ] Run the focused e2e suite on its isolated test database; expect new cases to fail before implementation. Never reset the user's shared database.
- [ ] Implement a query that applies assignment/scope/state/action-needed predicates before the bounded page query; use a stable composite ordering and signed opaque cursor with existing Node crypto only (no dependency).
- [ ] Add browser tests for next/previous or load-next navigation, page/filter URL state, refresh, zero results, stale cursor restart, keyboard use and 390px no-overflow behavior.
- [ ] Implement concise navigation controls with accurate page/result status, pending state, disabled controls, and recoverable errors; preserve claim/release behavior and row authority.
- [ ] Run focused API/browser tests, API/web typecheck, lint and source scan using installed dependencies only; record PostgreSQL/browser environment and any unverified checks.

**Exit:** Authorized reviewer can traverse a changing synthetic queue reproducibly without missing/duplicating rows; unauthorized scopes remain invisible; filter/navigation states are shareable by URL without leaking sensitive row data; existing claim/release and privacy tests remain green.

**Progress, 2026-10-02:** Scoped pagination and saved-link recovery are implemented with [TASK-V2-ADM-001](../../task-packets/TASK-V2-ADM-001.md) and [learning evidence](../../learning/NOTE-V2-ADM-001.md). A later-arriving case, equal timestamps, cursor tampering, actor/filter mismatch and revoked assignment are covered. A local synthetic 20,000-case traversal passed in 200 bounded pages while respecting the rate limit. Concurrent staff load, mid-page assignment mutation, production sizing and manual accessibility/low-bandwidth acceptance remain before the stronger scale claim in this exit can be made.

### Task 2: Institution setup readiness (read-only foundation; gated writes)

**Goal:** Make institution configuration discoverable and operationally legible before enabling business workflows, without inventing who may alter policy.

**Files:** Add `docs/task-packets/TASK-V2-SETUP-001.md`; maintain `docs/gaps/GAP-V2-001-institution-configuration-authority.md`; later add role-scoped setup pages and read models only after exact evidence confirms read authority.

- [ ] Reconcile `REQ-NFR-009`, graph/domain setup records, GAP-004/006/012, role blueprint 12, open decisions, and current generic Configuration API boundaries.
- [ ] Obtain the controlling human decision for proposer, independent approver/publisher, scopes/appointments, policy families, effective dating, step-up, emergency change, rollback/supersession and recovery; until then keep privileged writes off.
- [ ] Define a typed schema registry and readiness report over existing approved domain records only; no executable scripts, inferred defaults, or uncontrolled cross-domain writer.
- [ ] Specify effective-dated organization relationship types without requiring one fixed school/department hierarchy; plan reconciliation before replacing legacy strings.
- [ ] When authority is approved, add draft→validation→impact preview→independent approval→scheduled publish→supersession as immutable versioned commands; test old-decision reproducibility and scoped denial.

**Exit:** Readiness explains configured/missing/blocked items and accountable owners. Any write/publish path is denied until authority evidence and action/permission contracts are approved.

**Progress, 2026-10-02:** [TASK-V2-SETUP-001](../../task-packets/TASK-V2-SETUP-001.md) adds a read-only System Operations report over existing record counts and explicit blocked/unverified controls, with API allow/deny/revocation and browser evidence. The [governance proposal](../../policies/INSTITUTION-CONFIGURATION-GOVERNANCE-PROPOSAL.md) is decision-ready but is not an approved appointment or policy. Typed editable configuration, effective-dated graph reconciliation and all write/publish commands remain open behind GAP-V2-001.

### Task 3: High-volume admissions allocation and preparation

**Goal:** Reduce sequential handling for one or two officers through scoped work allocation, preparation and per-case reconciliation, retaining accountable human decisions.

**Dependencies:** Task 1 and approved school/programme/intake scope relationships; current review/approver authority; approved criteria and service targets.

- [ ] Extend admissions queue with database-backed filters/search/sort, saved views only where retention/privacy rules approve, assignment capacity/workload and overdue reasons from configured policy.
- [ ] Add auditable work allocation/reassignment with explicit authority, reason, idempotency and per-row results.
- [ ] Add synthetic batch completeness/duplicate preparation that never labels declared evidence as verified, never silently merges people, and escalates conflicting/exception cases.
- [ ] Allow safe batch *preparation* only; keep admission/rejection and other high-impact decisions individually attributable unless an approved rule delegates them.
- [ ] Generate 20,000 local synthetic records; prove query bounds, stable traversal, scope isolation, partial outcomes, concurrency and UI recovery. Agree real latency, staffing and service targets before claiming operational scale.

**Exit:** Supervisors and reviewers can distribute and prepare work across authorized cohorts, and every item has a visible owner/status/next step with independently auditable decisions.

**Baseline evidence, 2026-10-02:** Task 1's opt-in 20,000-case synthetic traversal passed and measured local queue-request timings ([note](../../learning/NOTE-V2-ADM-001.md)). This verifies navigation over a large isolated intake, not workload routing, staffing capacity, approved batch preparation, safe partial outcomes or production latency. Those Task 3 items remain open behind the organisation/authority decisions.

**Read-only increment, 2026-10-02:** [TASK-V2-ADM-002](../../task-packets/TASK-V2-ADM-002.md) and its [learning note](../../learning/NOTE-V2-ADM-002.md) add exact, case-insensitive reference lookup within the existing live reviewer scope and queue view. This helps locate an individual case in a large intake; it does not establish sorted workload, staffing allocation or approved bulk processing.

**Ordering increment, 2026-10-02:** [TASK-V2-ADM-003](../../task-packets/TASK-V2-ADM-003.md) and its [learning note](../../learning/NOTE-V2-ADM-003.md) add oldest/newest database ordering and direction-bound cursors in the current queue. Reviewer-controlled ordering does not supply policy-based priority, workforce allocation or bulk preparation.

**Preparation increment, 2026-10-02:** [TASK-V2-ADM-004](../../task-packets/TASK-V2-ADM-004.md) and [verification note](../../learning/NOTE-V2-ADM-004.md) add a read-only, version-checked inventory across up to 50 currently claimed cases. It reduces repeated case opening for initial triage but does not certify completeness or replace individual evidence review and decision authority.

### Task 4: Configurable academic structure and rules

- [ ] Deliver TASK-011 course/version/offering/period/org/curriculum foundation only after Task 2 establishes source authority and migration reconciliation.
- [ ] Deliver TASK-012 rule previews and TASK-013 credit cases using versioned criteria, stable explanations and approval boundaries.
- [ ] Complete registration, progression, appeals and postgraduate TASK-014–016; preserve official history and domain ownership.
- [ ] Support institution-approved calendar models, terms/semesters/teaching periods and effective-dated organization relationships without hardcoded national assumptions.
- [ ] Keep every unapproved policy inactive and expose the specific missing decision.

### Task 5: Teaching, timetable, examinations and attendance

- [ ] Execute current TASK-021–024, TASK-051 and TASK-101–106 for teaching assignments, resource-conflict checks, published timetable versions, student/lecturer views and approved-change impact.
- [ ] Execute TASK-111–116 for exam lifecycle, accessibility arrangements, eligibility, slips, confidential paper custody, attendance, script reconciliation and review/appeal handoff.
- [ ] Add a distinct class-session attendance workflow linked to an authorized active teaching session and roster: rotating short-lived session challenge, authenticated student check-in, lecturer exception/confirmation, duplicate/late/offline reconciliation, auditable attendance correction.
- [ ] Do not claim cheat-proof attendance or add biometrics/continuous location tracking without approved purpose, policy and privacy assessment. Attendance is a bounded risk signal, never an automatic failure/discipline action.
- [ ] Test spoof/replay, proxy check-in, network outage, accommodation, roster change, clock skew and lecturer correction across API, UI and audit.

**Student availability increment, 2026-10-02:** [TASK-V2-TIME-001](../../task-packets/TASK-V2-TIME-001.md) and its [learning note](../../learning/NOTE-V2-TIME-001.md) connect the student page to the official registered-course projection and show publication pending. This leaves TASK-101–105 and GAP-021 fully open for actual sessions, venues, conflict checks, approval, publication and changes.

### Task 6: Student support and safeguarding journeys

**Activation gate, 2026-10-02:** [GAP-V2-002](../../gaps/GAP-V2-002-student-support-routing-and-ownership.md) records the missing receiving-service appointments, adviser relationship, confidential custody and operational contact/consent rules. Buildable contracts and synthetic tests may proceed, but no student request may report successful routing until an accountable configured service and owner exist.

**Synthetic academic-support increment, 2026-10-02:** [TASK-V2-SUPPORT-001](../../task-packets/TASK-V2-SUPPORT-001.md) persists an owned academic case and secure two-way portal replies only for an explicit demo-only service and effective-dated student/adviser relationship. The student sees the named receiver before sending; the appointed adviser gets a scoped queue. [Verification and limits](../../learning/NOTE-V2-SUPPORT-001.md) retain GAP-V2-002 for live service, escalation, retention, reassignment and confidential support.

**Adviser queue increment, 2026-10-02:** [TASK-V2-SUPPORT-002](../../task-packets/TASK-V2-SUPPORT-002.md) adds database-side reply-need/status filters and exact case-reference lookup to the bounded appointed-adviser queue. [Evidence and limits](../../learning/NOTE-V2-SUPPORT-002.md) leave allocation, notifications and live service targets open.

**Academic follow-up increment, 2026-10-03:** [TASK-V2-SUPPORT-003](../../task-packets/TASK-V2-SUPPORT-003.md) adds a dated, auditable student/adviser action with agreement, decline and confirmed completion to the synthetic case. [Evidence and limits](../../learning/NOTE-V2-SUPPORT-003.md) leave live service approval, appointment booking, notifications and proactive observations open.

**Follow-up worklist increment, 2026-10-03:** [TASK-V2-SUPPORT-004](../../task-packets/TASK-V2-SUPPORT-004.md) makes open actions searchable by selected adviser appointment, target date and confirmation need in bounded pages. [Evidence and limits](../../learning/NOTE-V2-SUPPORT-004.md) retain the live-service and escalation policy gaps.

**Controlled closure increment, 2026-10-04:** [TASK-V2-SUPPORT-005](../../task-packets/TASK-V2-SUPPORT-005.md) completes an evidenced synthetic academic case with an immutable reason and respectful student view. [Evidence and limits](../../learning/NOTE-V2-SUPPORT-005.md) retain handover, referral, notification, live-service and reopening authority gaps.

- [ ] Deliver TASK-041–045 proactive student-success, adviser assignment, counselling, disability accommodation, welfare referral and discipline/appeals within separate permissioned data stores.
- [ ] Keep counselling narrative and disability evidence hidden from academic dashboards; share the least necessary referral/readiness status under approved consent and emergency access rules.
- [ ] Every intervention has source/freshness, human owner, student communication preference, due date, contact attempt, outcome and reassessment; provide correction/appeal routes.
- [ ] Test noisy/stale signals, false positives, duplicate outreach, confidential notes, role transfer, emergency access and export/disclosure boundaries.

### Task 7: Accessible localized, efficient workbench

- [ ] Apply ADR-003 through screen-family slices: applicant/discovery; admissions and large staff queues; registration/timetable/exams/results; finance and student support; reporting and configuration. For each, review actual role task order, information hierarchy, empty/loading/error/unknown outcomes, 390px layout, keyboard focus, reduced motion and print/export needs. Shared tokens remain the single color and spacing source; CSS Modules may coexist until a screen is migrated and visually verified.
- [ ] Apply the approved UI constitution to all dense queues: API-side filter/sort/page, counts, useful row summaries, progressive disclosure, labelled small-screen cards, keyboard and screen-reader use.
- [ ] Introduce versioned institutional terminology and translation resources after translation owner/approval is set. English remains available; unreviewed machine translation does not render policy/legal copy.
- [ ] Use configured date/time-zone/currency/contact formats; never assume US “roster,” semester model, or identity format.
- [ ] Add concise status/owner/reason/next-action copy and real loading/save/upload/retry microinteractions only where there is an observable operation.
- [ ] Test long Zambian names, Bemba/Nyanja reviewed copy when available, Lusaka dates, low-bandwidth retry, mobile widths, reduced motion and keyboard access using synthetic fixtures.

**UI foundation increment, 2026-10-02:** [TASK-V2-UI-001](../../task-packets/TASK-V2-UI-001.md) adds Tailwind utilities without replacing the existing CSS reset or semantic tokens. The applicant header and document handoff are the first migrated surfaces. This does not make the remaining SIS screens modern or establish manual visual/accessibility acceptance.

**Admissions workbench increment, 2026-10-02:** [TASK-V2-UI-002](../../task-packets/TASK-V2-UI-002.md) applies the governed table/card pattern and explicit stale-refresh recovery to the existing scoped admissions queue. It changes presentation and safe action availability only; it does not add workload allocation, batch decisions or new role scope.

**Student portal increment, 2026-10-02:** [TASK-V2-UI-003](../../task-packets/TASK-V2-UI-003.md) adds focused student navigation and a task-first home with read-only registration status from the authoritative endpoint. [Verification and limits](../../learning/NOTE-V2-UI-003.md) leave the rest of the student/staff screen families and human accessibility review open.

**Public discovery increment, 2026-10-02:** [TASK-V2-UI-004](../../task-packets/TASK-V2-UI-004.md) exposes real catalogue paging, preserves URL search context, shows intake and progressively reveals detailed filters. [Verification and limits](../../learning/NOTE-V2-UI-004.md) record the connected synthetic browser check. The next presentation reviews should follow actual user tasks through programme detail/eligibility, applicant submission, student support and the dense staff case/finance screens; they remain open until verified individually.

### Task 8: Reproducible institutional reporting and exports

- [ ] Execute TASK-071–075 and source-owned read models with definitions for denominator, cohort/census date, exclusions, missing data, source version and freshness.
- [ ] Deliver CSV/spreadsheet/PDF exports through purpose-scoped audited jobs, expiring links, formula-injection protection, minimum fields and small-cell/complementary suppression where approved.
- [ ] Keep counselling, disability, discipline and other restricted cases out of general leader reports; test differencing across filters and independent API/export boundaries.

### Task 9: Guardrailed student AI and persistent study workspace

- [ ] Complete TASK-121–127: approved ADR, intents/data disclosure register, provider/cost/privacy/retention assessment and human owner before activation.
- [ ] Build persistent student-owned chat history, rename/archive/delete controls, source citations/freshness, safe context retrieval, prompt-injection evaluation, refusal/off-route and human handoff while preserving non-AI navigation.
- [ ] AI cannot grant eligibility, interpret unpublished marks, diagnose, counsel, discipline, spend money, alter records or imply provider action. It is fully optional; test provider-off, timeout, stale source, authorization change and data deletion.

### Task 10: Real provider connections and payment reconciliation

- [ ] Keep providers behind adapters and sandbox/test credentials. Complete TASK-081–085 only with an approved provider contract and institutional data/security decision.
- [ ] Payments require verified provider callbacks, idempotent reconciliation, exact minor-unit accounting, reversal/refund/audit trail and user-visible pending/failed states.
- [ ] Never report simulated success as money received; do not charge live funds or incur provider spend without separately approved provider, price, forecast, sandbox limits and test cap.

### Task 11: Production readiness and v2.0 acceptance

- [ ] Reconcile all task requirements to source/actions/permissions/tests and current maturity; close design gaps through approved authority, not code assumptions.
- [ ] Complete concurrency/load, accessibility, privacy/security, migration reconciliation, backup/restore, monitoring, incident/support runbooks and recovery rehearsals.
- [ ] Complete role-based UAT for applicant, student, academic, admissions, finance, exams, support and leaders with evidence; distinguish synthetic demonstration, sandbox validation and live institutional acceptance.
- [ ] Update `MVP-AUDIT`, `MODULE-MATURITY`, `PRODUCT-ROADMAP`, `RELEASE-PLAN`, `SOURCE-MAP`, `VERIFICATION` and learning notes after each accepted slice.
- [ ] Human lead/reviewer and accountable institution approve the release gate; no task list completion is a substitute for signoff.

## Roadmap companion updates

The companion backlog now links this design/plan and records the data, setup-authority and scale constraints. Keep its existing release family structure and completion evidence; revise it as slices acquire approved task packets and verified outcomes. The companion remains the subsystem inventory; this document contains execution gates and first-slice instructions.

## Validation strategy

Use pinned tools and isolated synthetic fixtures. Check availability before tests requiring PostgreSQL or Playwright; the user's 2026-10-02 update permits internet data usage, so missing dependencies need not block local work, but report substantial transfer and any cost before starting. Run focused API tests, focused browser journeys, workspace typecheck/lint and source scan. Never claim test pass without the exact command and observed result.
