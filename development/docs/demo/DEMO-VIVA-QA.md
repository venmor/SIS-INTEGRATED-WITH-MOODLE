# Demonstration Viva — Supervisor Question Bank with Model Answers

Purpose: preparation for a supervised demonstration of the SIS–Moodle prototype. An invigilator (supervisor) asks from this bank; the presenting team answers aloud, then shows the evidence in the running system or code.

Ground rules for candidates:

- Answer from what is **actually built and verified**. Where something is deferred or demo-only, say so plainly — the review docs require it (`../learning/PHASE-2-IMPLEMENTATION-REVIEW.md`, lines on claims you must not make).
- Every answer below cites the file or record that proves it. Point the supervisor there when in doubt.
- Never claim: real account/contact verification, enforced MFA, live payments, live Moodle enrolment, real notification delivery, production retention/storage, accessibility certification, or human sign-off. Those gates are open and recorded.

Difficulty key: ★ warm-up · ★★ core · ★★★ stretch/challenge.

---

## A. Project overview, scope and governance

**A1. ★ What is this project, in one paragraph?**
A workflow-led Student Information System integrated with Moodle for a fictional Zambian university. It takes an applicant from application through admission, student registration, finance clearance, assessment and controlled result publication, with every high-impact decision owned by a named role, recorded in an immutable audit trail, and never delegated to Moodle. Evidence: `../../unza-sis-moodle-design-handbook-v3.0.0/00-ORIENTATION/01-purpose-audience-and-boundary.md`.

**A2. ★ Why integrate an SIS with Moodle at all — why not run everything in Moodle?**
Because Moodle is a learning platform, not a system of record. The project's core design principle is an authority boundary: the SIS is authoritative for identity, programmes, registration, official results, finance and awards; Moodle is authoritative only for teaching activity and provisional gradebook detail (`../../unza-sis-moodle-design-handbook-v3.0.0/06-ARCHITECTURE-INTEGRATIONS/05-moodle-authority-and-reconciliation.md`). Treating Moodle data as an official record is one of the explicit problems the project solves.

**A3. ★ Is this built on real University of Zambia data?**
No — and that is deliberate. No real student data or production credentials are permitted without an approved ADR. The demo runs a synthetic, fictional university (`../policies/SYNTHETIC-UNIVERSITY-SETUP-POLICY.md`; demo seed requires `ALLOW_DEMO_SEED=true`, `prisma/seed/seed.ts`). The handbook go-live gate states that a prototype that has not passed DPO/DPIA/MFA/penetration/restore gates must remain labelled a prototype on synthetic data (Design Section 10, §33).

**A4. ★ Who are the system's users?**
Ninety roles are catalogued in `../../unza-sis-moodle-design-handbook-v3.0.0/03-USER-EXPERIENCE-BLUEPRINTS/00-role-catalogue-and-coverage.md`: public visitor, applicant, student, lecturer, tutor, academic adviser, admissions officer/approver, registry officer, examinations officer, finance officer, counsellor, discipline officer, QA officer, dean, regulatory reporter, integration support, system administrator and auditor. Each has explicit limits — for example a lecturer enters and stages marks but cannot release official results; a registry officer owns authoritative records but cannot change payments.

**A5. ★★ How do you prevent one person from concentrating too much power?**
Three mechanisms: (1) role assignments are scoped and the browser never decides its own authority — the server resolves the live assignment per request (`apps/api/src/identity-access/session.guard.ts`); (2) segregation-of-duties pairs are configured and enforced, e.g. moderation refuses the same account that staged the grades, finance maker/checker requires requester ≠ decider (`grants-sod.spec.ts`, `apps/api/src/assessment/`); (3) multi-role users must actively switch workspace, and every command records the active role and scope — permissions are never merged into a super-role (role catalogue, lines 117–119).

**A6. ★ Who maintains this project and how is quality controlled?**
Charles Hangoma and Chitundu Milimbo, rotating vertical-slice ownership with mandatory peer review; the merge rule is "if Charles and Chitundu cannot explain the change, it does not merge" (`../../unza-sis-moodle-design-handbook-v3.0.0/AGENTS.md`, `../../PROJECT-STATUS.md`). AI agents assist only through bounded task packets and never invent policy (`../AGENTS.md`).

---

## B. Architecture and technology stack

**B1. ★ Name the locked technology stack.**
Next.js + TypeScript + CSS Modules (web), NestJS + TypeScript (API), PostgreSQL + Prisma (database and migrations), Docker Compose, GitHub Actions CI, Playwright plus Vitest for testing. Integration patterns: transactional outbox, idempotency, retry/dead-letter and reconciliation (`../AGENTS.md`, handbook `08-ENGINEERING-DELIVERY/01-locked-stack…`). Node is pinned to 24.21.0 (`.nvmrc`).

**B2. ★ Why a modular monolith instead of microservices?**
The handbook locked the modular monolith decision: 13–14 domain modules with strict ownership and no cross-module writes to another module's tables (`06-ARCHITECTURE-INTEGRATIONS/01-domain-and-module-architecture.md`). Microservices are forbidden without an approved ADR. For a two-person team and a correctness-critical domain, a monolith gives transactional consistency (registration + outbox in one transaction), one deployment, and testability — while module boundaries preserve the option to extract services later.

**B3. ★★ Walk me through one request end-to-end.**
Next.js screen → authenticated same-origin proxy route (path allow-list, Origin check) → NestJS controller → `SessionGuard` (live session + active role/scope) → `CsrfGuard` on mutations → in-service capability/scope/SoD checks → command handler with domain validation and state transition → single Prisma transaction writing domain state + `OutboxEvent` (+ audit) → receipt to the client → integration worker delivers the outbox event to the Moodle adapter → reconciliation compares expected vs actual state. Flow documented in `01-domain-and-module-architecture.md` lines 56–67; implemented in `apps/api/src/app.module.ts` and `apps/web/app/api/**`.

**B4. ★ Why does the browser never call the API directly?**
Every browser→API call goes through same-origin Next.js proxy routes (`apps/web/app/api/<domain>/[[...path]]/route.ts`) with deny-by-default path allow-lists, query-key filtering, Origin/`sec-fetch-site` validation (`apps/web/lib/same-origin.ts`), and a 10s upstream timeout. This centralizes CSRF/origin proof, prevents accidental API exposure, and returns 404 for unlisted routes — a missing proof fails closed, even for curl.

**B5. ★ What are `packages/config`, `packages/contracts` and `packages/ui` for?**
Shared, versioned kernel packages: `@sis/config` holds policy constants (`security.ts`, `finance.ts`, `moodle.ts`, `assessment.ts`) so thresholds are configuration, not hard-coded; `@sis/contracts` holds typed DTOs shared by API and web so both sides agree on payloads; `@sis/ui` is the CSS-Modules design system (ActionButton, DataTable, Money, StatusChip, ErrorSummary, tokens). This keeps module and app boundaries explicit.

**B6. ★ Which database and why?**
PostgreSQL 18 with Prisma 7. Postgres was chosen because the domain needs real transactions, row locks (`FOR UPDATE` on registration and finance), constraints, and SQL triggers for append-only official tables. Prisma gives typed access while migrations stay as readable SQL (~78 migrations, phases ph1→ph8 + v2, `prisma/migrations/`).

**B7. ★★ How many tables/models, and how do you keep the schema honest?**
145 Prisma models across identity/audit, admissions, academic, finance, integration and assessment clusters (`prisma/schema.prisma`, 2,718 lines). All 73 migrations were exercised on isolated targets including a brand-new empty install (`../learning/VERIFICATION.md:17`), and a backup/restore drill counted 103/103 model tables with zero orphans.

---

## C. Implementation — end-to-end flows

**C1. ★★ Walk me through the applicant-to-student journey.**
1) `POST /applications` creates a draft; the applicant saves sections and uploads documents (MinIO storage, ClamAV scan, structural PDF validation). 2) `POST /applications/:id/submit` commits with an idempotency key and outbox event — rollback proven by SQL failure-injection test. 3) Staff claim the case in the review queue, record findings/clarifications, make a recommendation, release a decision, extend an offer. 4) The applicant accepts the offer. 5) Registry converts: `records.service.ts:251 convert()` gates on submitted state, accepted offer response, released decision, no blocking condition, and completed onboarding tasks, then creates the Student + ProgrammeAttempt — resource-idempotent, so re-running returns the stored student. Evidence: `apps/api/src/admissions/`, `apps/api/src/records/records.service.ts`.

**C2. ★★ What protects registration against races and double submission?**
`registration.service.ts:984` runs in one transaction: `FOR UPDATE` lock on the ProgrammeAttempt, checks the student is ACTIVE/not withdrawn, the academic period is OPEN inside the registration window, optimistic version check on the payload, capacity and window re-checks, then creates the InstitutionalRegistration + CourseRegistrations and writes the outbox events that feed Moodle. A repeat submit returns the stored receipt instead of duplicating. Moodle delivery status is reported back in the registration response (lines ~1299–1357).

**C3. ★ How does a student pay fees in the demo?**
Finance assesses charges → invoice (`finance.service.ts:385 assessCharges`) → the student initiates payment (`finance.service.ts:949`): method and simulator scenario validated, `FOR UPDATE` lock on the FinanceAccount, outstanding-balance and open-attempt guards, then a sequence-generated `PAY-YYYY-XXXX` reference with TTL. The "provider" is a local payment **simulator** — no real money and no real provider. Amounts are integer minor units and posted transactions are immutable (migration `20260926130000_phase5_immutable_payment_reversal`).

**C4. ★ How do you handle a payment callback you cannot trust?**
Callbacks are signature-gated, not session-gated: HMAC signature check, nonce replay window, per-IP rate budget, versioned callback budget (`apps/api/src/finance/finance-callback.controller.ts:26–65`). Mismatches open a reconciliation case (202 `CASE_OPENED`) instead of silently applying money. Clearance (`FinanceClearance`) is the gate that feeds registration; finance officers cannot toggle it manually.

**C5. ★★★ Show me how marks become official results.**
Assessment plan → course-assessment mapping → grade batch staging from Moodle → validation findings → moderation (a same-account moderation attempt is refused — SoD) → board package, which freezes with an integrity hash and `weighted-total-v1` trace → `POST /assessment/packages/:id/release` (`apps/api/src/assessment/publication.controller.ts:30`). Release requires the `release-results` capability, an independent publisher (not the person who staged/moderated), and a verified step-up proof consumed inside the transaction. `ResultRelease` and `OfficialResultVersion` rows are append-only (SQL triggers in migration `20260929090000_ph7_result_publication`). Amendments require a separate approving officer and create new versions — nothing is edited in place.

**C6. ★ How does the student see results, and when?**
Only released results, via `GET /assessment/me/results` scoped to the signed-in student. Nothing provisional is ever visible to students — the board-assembly step refuses to publish anything with unmoderated marks, open findings, or superseded provenance, and stores nothing when it refuses (`../learning/VERIFICATION.md` Phase 7 slice 5).

**C7. ★ What happens if a student changes courses after registering?**
Amendments and course changes are separate governed commands (`apps/api/src/registration/`: amendments, course changes, waitlist), each re-checked against window, capacity and readiness rules and recorded as `RegistrationAmendment` rows with audit — not by editing the original registration.

**C8. ★★ How does the timetable system work?**
Fictional validation rules → conflict detection → governed publication → student views (`apps/api/src/timetabling/`, walkthrough `../demo/TIMETABLE-PUBLICATION-WALKTHROUGH.md`). Drafts and publications are append-only versioned records (migration `20261007113000_v2_demo_university_setup`). Real timetable validation against the institution is an open gap (GAP-021) and is labelled as such.

**C9. ★ How do you stop someone submitting 500 applications or 2 GB of documents?**
Per-user, per-Lusaka-day upload quota enforced by `UploadQuotaGuard`: 429 with `Retry-After` and an audited DENY (Phase 8 slice 4). Plus per-action-family rate limiting (sign-in, recovery, catalogue search, workspace switch) with audited denials (`apps/api/src/identity-access/rate-limit.ts`).

**C10. ★ What protects uploaded documents?**
Uploads land in MinIO in quarantine, are scanned by ClamAV, then structurally validated as PDFs (`pdf-lib`) before release. If the scanner is down, the document stays `SecurityScanPending` — "scanner failure is never interpreted as safe" (`apps/api/src/admissions/scanner.ts:14`). The demo fixture scanner requires **both** `APPLICATION_SCANNER=demo-fixtures` and `DEMO_MODE=true` and matches exact SHA-256 bytes. Document preview is an owned, `no-store` streamed response with sandbox/nosniff/CSP headers — never a public storage URL.

---

## D. Security

**D1. ★★ How are passwords stored and sign-in hardened?**
argon2 (memory-hard) hashing (`apps/api/src/identity-access/session.service.ts:11–20`). Enumeration resistance: an unknown username still burns a real argon2 verification (`dummyVerify`) so timing matches a real check (REQ-IAM-006). Failed sign-ins increment a counter with `lockedUntil` lockout plus progressive 1–5s failure delay. Recovery tokens are single-use and rate-limited; changing credentials kills existing sessions.

**D2. ★★ How do sessions work?**
HTTP-only cookie, `SameSite=Lax`, `Secure` in production, never localStorage (`cookies.ts:23–37`). The raw token is never stored — the DB keeps a SHA-256 hash. Absolute expiry plus sliding idle window. Account status is re-checked **on every request**, so a suspended account is rejected on its next request even for safe reads (`session.service.ts:182–198` — a repair found in peer review). Individual or bulk session revocation exists; expired/revoked role assignments resolve to *no* workspace.

**D3. ★ How does authorization actually decide?**
Deny-by-default. The policy service denies unknown actions (`policy.service.ts:41`). `SessionGuard` resolves the live active role assignment per request — authority never comes from client state — and then service-level checks consider role, scope, relationship, state, purpose and time-bound authority as the handbook requires. Both allow **and** deny tests are mandatory per feature (`../AGENTS.md` engineering requirements).

**D4. ★ What is CSRF and how do you defeat it?**
Cross-site request forgery: a victim's browser is tricked into sending an authenticated mutation. Two layers here: `SameSite=Lax` cookies, plus `CsrfGuard` requiring an `x-requested-with` marker that only the trusted same-origin proxy sets after validating `Origin`/`Host` (or `sec-fetch-site: same-origin`) in `apps/web/lib/same-origin.ts`. A missing proof fails closed — even curl is denied — and CSRF denials are audited with a neutral message and reference (`csrf.guard.ts:19–36`). Regression tests: `scripts/same-origin.test.mjs`.

**D5. ★ What about XSS and malicious documents?**
Never a public storage URL — preview is streamed through an owned endpoint with `no-store`, sandbox, `X-Content-Type-Options: nosniff` and CSP, and the proxy forwards CSP headers. Sensitive values are kept out of localStorage (browser specs assert it is empty). Uploaded PDFs are antivirus-scanned and structurally validated (see C10).

**D6. ★ How do you validate API input?**
Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` (`apps/api/src/main.ts:18–26`) — unknown fields are rejected on every route rather than silently stripped, because silent stripping could corrupt a command. Typed DTOs come from `@sis/contracts`.

**D7. ★★ What stops replay attacks on the payment callback?**
HMAC signature over the payload, a nonce with a bounded replay window, per-IP rate budget and a versioned callback budget (`finance-callback.controller.ts:26–58`). Duplicate/out-of-window callbacks cannot apply money twice; mismatches open reconciliation cases rather than mutating balances.

**D8. ★ How is rate limiting implemented, and what is its honest limitation?**
In-memory sliding-window limiter with a bounded bucket map, configured per action family from `SECURITY_V1` (`rate-limit.ts`), returning 429 + `Retry-After` with audited DENY. Honest limitation: it is in-memory and single-instance because Redis is excluded by the locked stack; multi-instance deployment needs a shared limiter — recorded in GAP-024.

**D9. ★ What is break-glass access and how is it controlled?**
Emergency access for sysadmins: minimal scope, time-bound, approver-gated (never self-approval), idempotent, with enhanced auditing; an expiry daemon revokes the bound sessions (`break-glass.service.ts:32–39`). It exists precisely so emergencies do not push people to share credentials.

**D10. ★★ What is step-up authentication and where is it enforced?**
Re-authentication (MFA challenge) for high-impact actions, via time-limited challenges (`step-up.service.ts`). Result release consumes a verified step-up proof **inside the transaction** (`apps/api/src/assessment/publication-ports.ts`). If MFA is not enrolled, step-up returns DENY + audit — a high-risk action cannot proceed on weaker auth. Honest limitation: finance decision endpoints do **not** yet require re-auth (GAP-020), and MFA is not enforced end-to-end (GAP-015).

**D11. ★★ How do secrets and encryption keys behave in this prototype?**
MFA TOTP secrets are AES-256-GCM encrypted at rest. Backup-drill passwords are passed only via PostgreSQL env vars, with sanitized failure output and a fictional-password canary test proving no secret disclosure (`../learning/PRIOR-PHASE-REVIEW.md`). A source/secret scanner (`npm run scan`, `scripts/check-source.mjs`) fails on private keys/`sk-live`/`ghp_` patterns and **exits 2 if it cannot run** — a blind spot cannot go green. Honest limitation: `mfa.service.ts` falls back to a default dev key if `MFA_ENCRYPTION_KEY` is unset — a documented production blocker.

**D12. ★ What does your security testing actually prove?**
Layered evidence: unit/API tests for allow **and** deny paths (e.g. `grants-authority.spec.ts`, `grants-sod.spec.ts`, `integration-deferral.spec.ts`); browser tests asserting cross-origin proxy routes are denied and localStorage stays empty; a 429 was observed honored, never bypassed; SQL failure injection proving transaction rollback; independent AI source review found no confirmed Critical or Important issues (`../learning/VERIFICATION.md:19`). What it does **not** prove: a penetration test — that is an open go-live gate, and we say so.

---

## E. Privacy and data protection

**E1. ★ Which law anchors your privacy design?**
The Zambia Data Protection Act No. 3 of 2021 (Data Protection Commissioner), alongside the Cyber Security Act No. 3 of 2025, Cyber Crime Act No. 4 of 2025 and the Electronic Communications and Transactions Act 2021 (Design Section 10, §2).

**E2. ★ What privacy controls does the design specify?**
Record of processing activities; field-level data classification (PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED); privacy notices at every collection point with purpose-bound collection of sensitive fields; a DPIA workflow before high-risk processing; **Zambia data residency by default** (personal data, documents, logs, backups hosted in Zambia; cross-border transfer only with documented legal basis); data-subject rights where erasure is *not* automatic for official records; retention by record class with legal holds; breach notification to the Commissioner within 24 hours (Design Section 10, §§5–32).

**E3. ★ How is student privacy protected between roles?**
Minimum-necessary boundaries with explicit deny + audit tests: an academic adviser cannot see counselling/disability notes; applicants see only their own status events (`applicantVisible` filter); support-case privacy boundaries have named deny test cases; notification previews are privacy-safe; important reads of counselling/health/identity/bulk records are themselves audited (§19 audit model).

**E4. ★ Are you processing real personal data right now?**
No. The entire demo runs synthetic data on a fictional university, and identifiable student data must not be sent to external AI services by default. Retention configuration, DPIA execution and DPO appointment are institutional decisions deliberately **not invented** by the team — recorded as open production decisions (`90-TRACEABILITY-AND-GOVERNANCE/07-open-production-decisions.md`).

---

## F. Official records, audit and immutability

**F1. ★ What is an official record here, and how is it protected?**
Submissions, decisions, offers, posted financial transactions, official results, board decisions, published setup/timetable versions and Moodle live-run manifests. Protection is **database-level**: SQL triggers `RAISE EXCEPTION` on UPDATE/DELETE (e.g. migration `20260919120000_ph2_applications/migration.sql:129`; `20260929090000_ph7_result_publication/migration.sql:145–161`). Corrections never rewrite — they create a new version or amendment row with its own audit. Proof it works: in the 20,000-row load test the trigger refused a "cleanup" delete attempt (`../learning/VERIFICATION.md:491`).

**F2. ★ What does your audit trail record?**
`AuditEvent` rows with action, outcome ALLOW/DENY, actor, active role + scope, target, reason, error category, purpose, idempotency reference, prior/new state (masked), policy version and a fresh correlation ID (`apps/api/src/identity-access/audit.ts`). The correlation ID doubles as the user-facing support reference. Denials are audited too (missing session, CSRF, failed sign-in), and passwords/tokens never enter audit rows. Sensitive corrections are append-only: a correction creates a new event, never an edit (Design §20).

**F3. ★★ What happens if the audit write itself fails?**
A denial stands — an audit failure never converts a 403 into a 500 or into a success (`session.guard.ts:25–37`, `csrf.guard.ts:19–32`). On fan-out paths audit and notification are written in the same transaction as the domain change, so they cannot drift (`../learning/PHASE-8-IMPLEMENTATION-REVIEW.md:40–41`).

**F4. ★ How does an auditor or regulator use the system?**
The auditor role is read-only and purpose-limited. A cross-domain audit timeline endpoint performs gate-first joins with audited reads; applicants see only their own rows with staff rows filtered; a tutor or student reading a foreign record gets 404 (`audit-entity-timeline.e2e`, 10/10). Regulatory users receive certified packages and cannot correct source records (role catalogue).

**F5. ★ How do you keep high-impact decisions honest over time?**
Configuration items are versioned (`ConfigurationItem`/`ConfigurationVersion`), board packages are frozen with an integrity hash, and grants/authorities expire with an expiry daemon. Old authority cannot retroactively justify new actions — expired grants yield 403 with **zero** decision rows stored (`../learning/VERIFICATION.md` Phase 7 slice 5).

---

## G. Moodle integration

**G1. ★★ Who is the source of truth for what?**
SIS is authoritative for person/student identity, programme/course offering, institutional registration, and official results/progression/awards. Moodle is authoritative for teaching activity/submissions and provisional gradebook detail, and merely *displays* approved returned information. Table: `06-ARCHITECTURE-INTEGRATIONS/05-moodle-authority-and-reconciliation.md`.

**G2. ★★★ How does the SIS reliably synchronise with Moodle?**
Seven-step design: (1) the SIS transaction commits domain state **and** an outbox event atomically; (2) an integration worker maps the versioned event to the configured Moodle adapter; (3) delivery carries an idempotency/correlation key and records a normalized response; (4) transient failures back off and retry, permanent failures enter a governed dead-letter queue; (5) reconciliation compares expected vs actual Moodle state; (6) operators may replay events or fix mappings — but **cannot** hand-edit official registration to make a queue green; (7) a case closes only when both states and evidence agree. Implemented in `apps/api/src/integration/delivery.worker.ts`, `outbox-delivery.worker.ts`, `operations-queue.service.ts`.

**G3. ★ How do you demonstrate failures like duplicates and outages without a real Moodle?**
`MOODLE_INTEGRATION_MODE=SimulatorAdapter` writes to `Sim*` projection tables with injectable scenarios: SUCCESS, DUPLICATE, OUTAGE, TIMEOUT, MISMATCH (`apps/api/src/integration/moodle-simulator.ts`). This lets the demo show delayed delivery, duplicate suppression, failure queues, replay and reconciliation honestly — the simulator tables are explicitly labelled demo state.

**G4. ★ Can a Moodle callback change an official registration or result?**
No. Publishing official results is a separate authorized command that cannot be triggered by a Moodle callback; Moodle grades land in a staging snapshot (course, assessment mapping, student, source revision, import time) and validation/moderation happens in the SIS. Similarly, an operator replaying events cannot alter official registration (G2).

**G5. ★ Is the demo writing to a real Moodle instance?**
No — live writes are fail-closed deferred. The live path is a gated run state machine (`apps/api/src/integration/moodle-live-run.controller.ts`): writes are refused until a persisted run manifest, scope manifest, mapping and authentication receipts with technical approval exist. `integration-deferral.spec.ts` proves simulator successes never count as live. One historical read-only preflight against a real Moodle 5.2.2 site was recorded; the token was deleted and no live write was ever made (`../learning/VERIFICATION.md:32`). Setup doc: `MOODLE-CLOUD-CONNECTION-SETUP.md`.

**G6. ★ What evidence does a student's registration produce for Moodle?**
The registration response includes a Moodle delivery status block (`registration.service.ts` ~1299–1357), backed by `IntegrationDeliveryAttempt` rows — so the team can show exactly what was sent, when, with which correlation key, and what Moodle answered.

---

## H. Testing and verification

**H1. ★ What is your testing pyramid here?**
Unit (Vitest, 44 spec files; latest aggregate **483 passed, 13 skipped** — skips explicitly "not certified"), API e2e (64 `*.e2e-spec.ts` files, ~767 cases, against isolated migrated+seeded PostgreSQL), browser E2E (Playwright, ~48 specs, including axe accessibility and 390px/keyboard/no-overflow checks), plus Node script tests and a repo scan. Ledger: `../learning/VERIFICATION.md`.

**H2. ★★ How do you know tests aren't just testing themselves?**
Method, not just counts: a **fresh isolated PostgreSQL database per run** — shared databases are never reset; tests were repeatedly observed red before implementation (TDD); SQL failure injection proves rollback when the outbox write fails; browser network interception drops a response *after* server commit to prove lost-response recovery; a fictional-password canary proves backups cannot leak credentials; an independent AI code review found 4 material issues which were then fixed.

**H3. ★ What does CI run?**
`.github/workflows/ci.yml` at repo root: secret/prohibited-pattern scan → script tests → lint → `prisma migrate deploy` → demo seed (`DEMO_MODE=true`, `APPLICATION_SCANNER=demo-fixtures`) → `npm test` → `scripts/isolated-e2e.mjs` with independent baseline DB clones and a backup rehearsal. Honest limitation: remote CI and branch protection have **never executed** for this repo; all evidence is local — do not claim otherwise.

**H4. ★ How do you test backup and restore?**
`pg_dump` → restore into scratch databases, count 103/103 model tables, check zero orphans, verify document hashes, drop the scratch DB; a deliberate collision test proves the script refuses to erase an existing database; passwords travel only through env vars (`../learning/VERIFICATION.md:72–73`). Limitation: `npm run backup:test` predates the Phase 3–8 tables, so manual container drills cover those (NOTE-PH8-006).

**H5. ★ What accessibility work is done, and what is not claimed?**
axe serious/critical clean on four journeys, a contrast script (11/11, which caught two sub-AA pairs and drove token amendments), zoom/reflow/slow-connection tests, keyboard/focus browser specs. **Not claimed:** manual screen-reader acceptance and cross-platform replay — explicitly unverified (`../learning/VERIFICATION.md` Phase 8 slice 5).

**H6. ★ How do you handle concurrency bugs?**
With tests that force them: a moderation lost-update was caught by a concurrency test and fixed with row locking; optimistic version counters guard stale overwrites on submissions and registrations; sequence-generated references prevent payment-ID collisions. The pattern is: write the racing test first, watch it fail, then fix.

---

## I. Operations, DevOps and resilience

**I1. ★ What happens when an external service is down mid-operation?**
The domain change and outbox event commit together, so nothing is half-recorded; the worker retries with backoff; permanent failures land in a governed operations queue with replay controls; reconciliation later proves expected vs actual state. Registration submissions, document uploads (scan-pending quarantine) and notifications all follow this shape.

**I2. ★ How would you deploy this?**
Docker Compose (PostgreSQL 18 + MinIO + ClamAV + API + web) with pinned versions and one lockfile; the web app also carries Vercel config and the API adjusts its `/api` prefix when `VERCEL` is set. Production encryption-at-rest, key rotation and storage encryption are recorded as deployment decisions, not built.

**I3. ★ How do you reset the demo safely?**
`npm run demo:reset` (`scripts/demo-reset.mjs`) refuses to run against a shared project or port — exit 2, zero side effects. The same fail-closed posture protects the backup test from dropping an existing database.

**I4. ★ What monitoring exists?**
An ops module with incidents and queues, a per-action audit timeline usable as an operational trail, notification records with a delivery worker, and reconciliation runs as health evidence for the integration. Full RPO/RTO and production alerting remain open (GAP-008/009).

---

## J. Limitations, gaps and honesty

**J1. ★★ What is explicitly NOT built? Name your top gaps.**
Honest answer, straight from `../docs/gaps/` and `../learning/VERIFICATION.md`: enforced MFA/step-up end-to-end (GAP-015, GAP-020); real payment provider and real Moodle writes (simulator-only, deferral state machine); real notification delivery (email/SMS simulated — GAP-008); real timetable validation (GAP-021); production retention/DPIA/DPO decisions; production object storage; suspicious-recovery review (GAP-011); scope hierarchy/capability registries (GAP-003/004/006/012); remote CI execution; pinned-runtime validation.

**J2. ★ Why should we trust a prototype with open gaps?**
Because the gaps are **named, filed and machine-checked where possible**, not hidden. The system defaults to deny in every uncertain path: scanner outage → quarantined; missing same-origin proof → 403; unenrolled MFA on step-up → DENY; expired grant → 403 with zero decision rows; source scan cannot run → exit 2; live Moodle writes → refused until governance prerequisites exist. A gap register with 30+ records (`../docs/gaps/`) plus a verification ledger is stronger evidence than an unqualified "it works".

**J3. ★ There is a known Node version mismatch — explain it.**
The repo pins Node 24.21.0 (`.nrc`/`engines`), but verification runs used the installed Node 22/26. This is recorded as unverified pinned-runtime work in `../learning/VERIFICATION.md`, alongside unverified remote CI. It is disclosed, not concealed.

**J4. ★ What is the biggest technical debt you know about?**
Candidates (pick one and justify): the in-memory rate limiter is single-instance (GAP-024); the self-registration flow uses a demo-grade temporary store (`auth.controller.ts:674–676` comment); MFA secrets fall back to a default dev key when `MFA_ENCRYPTION_KEY` is unset; e2e suites are order-fragile on shared DBs; 43 pre-existing API lint warnings are reported rather than hidden. Each is filed with a reason.

**J5. ★ If we gave you four more weeks, what would you do first?**
Ordered proposal: (1) enforce MFA/step-up for finance and admissions decisions (closes GAP-015/020 — highest institutional risk); (2) run remote CI with branch protection and pinned Node 24 to close the verification gap; (3) replace the in-memory limiter with a DB/Prisma-backed limiter or approved ADR; (4) one manual screen-reader acceptance session. Ground the answer in the gap register rather than new features.

---

## K. Teamwork, process and AI governance

**K1. ★ How is work organized so nothing is coded casually?**
No code without a task packet (`../../unza-sis-moodle-design-handbook-v3.0.0/14-TEMPLATES/TASK-PACKET.md`) naming requirement, role, screen, action, permission, command/event, failure/recovery behaviour, tests, human lead, reviewer and an out-of-scope list. Development entry also requires checking the supersession register, readiness matrix and open decisions (`09-AI-AGENT-OPERATING-MANUAL/09-development-entry-gate.md`).

**K2. ★ What do you do when the design is silent or contradictory?**
Stop and record a `GAP-*` record — never guess policy, permissions, states or approval authority (`../AGENTS.md` authority and stop rule). The gap register in `../docs/gaps/` is the artefact that proves this happened rather than being claimed.

**K3. ★ How do two developers avoid stepping on each other?**
Rotating vertical-slice ownership with mandatory peer review — one leads a slice, the other reviews; the merge rule is that both must be able to explain the change. Evidence of the loop working: peer review caught real bugs (a moderation lost-update, credential-bearing backup errors, an escaped-PDF-name screening gap) which were then fixed with regression tests (`../learning/PRIOR-PHASE-REVIEW.md`).

**K4. ★ Why is there a handbook outside the code folder? What is its authority?**
`unza-sis-moodle-design-handbook-v3.0.0/` is the controlling design — not runnable code. Authority order: later approved decisions → security/privacy/official-record rules → the 70 exact approved evidence records in `15-APPROVED-DESIGN-EVIDENCE/` (active requirements, not history) → curated journey handbooks → templates. Implementation that contradicts the handbook is a defect in the implementation.

**K5. ★ How do you use AI agents without letting them invent policy?**
AI works only through bounded task packets with explicit scope, must read the controlling records first, and must stop-and-gap rather than guess. Human lead and reviewer sign off; the merge rule is human-explainability. AI code review supplements but never substitutes for human peer review (`../learning/PHASE-2-IMPLEMENTATION-REVIEW.md` claims section).

---

## L. Rapid-fire / challenge round

**L1. ★ Why Postgres triggers instead of only application checks for immutability?**
Because application checks can be bypassed by a bug, a migration, a console session or a future new endpoint. SQL triggers sit below every code path; the load test proved a delete attempt was refused even from an unexpected direction.

**L2. ★ Why not use an off-the-shelf IAM (Keycloak, Auth0)?**
Locked stack + synthetic-data constraint + the domain needs scoped, effective-dated, SoD-aware role assignments with break-glass and step-up recorded as official-record evidence. A third-party IdP would externalize exactly the parts the handbook requires the system to own and audit — and would need credentials/network access the prototype forbids.

**L3. ★ Your rate limiter dies on restart. Why is that acceptable?**
It is acceptable only as a disclosed prototype limitation (Redis is forbidden without an ADR). Deny-by-default authorization, lockout counters and audit still hold after a restart; the limiter is abuse-hardening, not the primary control. Filed as GAP-024.

**L4. ★ How do you prove idempotency works, not just claim it?**
Retry tests return the original receipt/result; payload reuse against a consumed idempotency key is denied; re-conversion of an admitted applicant returns the stored student rather than a duplicate; duplicate Moodle callbacks are suppressed via correlation keys in the simulator DUPLICATE scenario.

**L5. ★ What stops a lecturer from releasing results?**
The `release-results` capability, an independent-publisher check (not the stager/moderator), verified step-up consumed in-transaction, board package integrity, and append-only release tables. Each is an explicit deny test, not just a missing button.

**L6. ★ Could an admin edit the database directly and break immutability?**
Not for protected tables — triggers reject UPDATE/DELETE even for a superuser session at the SQL level (that is the point of doing it in the database). For other tables, every application action is audited, and direct database access is an operational/physical control outside the app's scope — which is why production access control is listed as a deployment decision, not claimed.

**L7. ★ Why is the finance "payment" not a real payment?**
No real provider credentials may exist in this prototype, and charging real money from a synthetic university would be improper. The simulator exercises the exact trust boundary (initiate → signed callback → reconciliation → clearance) so the integration contract is tested; only the external provider is stubbed.

**L8. ★ You used AI to build this. Why is it trustworthy?**
The artefacts are: 483+ unit tests, ~767 e2e cases, allow *and* deny tests, dated verification ledger, independent AI review with findings fixed, and two humans who must explain every merge. AI accelerated writing code; the evidence standard is the same as any other implementation, and human sign-off is still the open gate — we do not claim otherwise.

---

## M. Claims you must NOT make during the demo

From `../learning/PHASE-2-IMPLEMENTATION-REVIEW.md` and `../learning/VERIFICATION.md` — a candidate who claims any of these fails the honesty portion:

1. Real account or contact verification exists.
2. MFA is enforced end-to-end (it is implemented but not enforced; GAP-015).
3. Payments are live (simulator only) or that finance actions require re-auth (GAP-020).
4. Live Moodle enrolment/delivery works (deferred by the live-run state machine).
5. Email/SMS notifications are delivered (in-system records only; GAP-008).
6. Production retention, storage encryption, DPIA or DPO appointments are done.
7. Full accessibility or screen-reader certification is achieved.
8. Remote CI, branch protection or pinned-Node runs have passed (never executed).
9. Human acceptance/sign-off by Charles and Chitundu or the institution has occurred.
10. An AI review substitutes for human peer review.

When in doubt, the strongest answer is: "That is an open gap — here is its `GAP-*` record, here is why it is deferred, and here is the fail-closed behaviour that protects us in the meantime."
