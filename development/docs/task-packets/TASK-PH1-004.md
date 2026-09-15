# TASK-PH1-004: Server-side permission policy and denial behaviour

## Authority

- Phase/release: v0.2.0 Phase 1 (slice 4 of handbook 5; one slice)
- Requirement IDs: REQ-IAM-004 (deny unless identity/role/scope/
  relationship/state/capability permit), REQ-IAM-002/003 (active-role
  evaluation; assignment shape), REQ-IAM-005 (re-auth hooks; MFA enforcement
  stays 2b/production), REQ-OPS-004 (append-only audit rows), REQ-NFR-001/003,
  REQ-NFR-004 (high-impact commands transactional/idempotent)
- Role and scope: Lead Charles / Reviewer Chitindu Milimbo / scope
  identity-access policy engine + SoD + purpose + denial UX + grant
  hardening (idempotency, outbox, approver, resolve) only
- Action/screen/component IDs: ACT-IAM-001, UI-ACCESS-001 (denial panel),
  UI-DENIED-001 (catalogue), UI-EMPTY-001 (permission variant),
  UI-CONTEXT-001 (unchanged), UI-SUBMIT-001 (idempotency behaviours)
- Policy/configuration version: SECURITY-v1 (new: SoD pairs, resolve
  budget, purpose labels are free-text per workflow) + demo-seed v0.2
- Acceptance-test IDs (packet-local; mapped in appendix): policy-allow,
  policy-deny-each-arm, sod-deny, purpose-audited, guard-audit, resolve-ok,
  resolve-unknown-empty, resolve-nongrantor-uniform, grant-idempotent,
  grant-receipt-replay, grant-approver-required, status-gate-each-state,
  denial-panel-routes, empty-not-failure, prior-new-audit
- Exact detailed blueprint file(s):
  - …/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/03-phase-1-identity-and-scoped-access.md (slice 4)
  - …/05-REQUIREMENTS-PERMISSIONS-DATA/03-permission-and-visibility-core.md (§15.9, decision formula :10, classifications :30-40)
  - …/05-REQUIREMENTS-PERMISSIONS-DATA/04-permission-and-visibility-restricted.md (§15.21 pseudocode, §15.22 acceptance, SoD 02:93-102)
  - …/05-REQUIREMENTS-PERMISSIONS-DATA/01-functional-requirements.md (REQ-IAM-002/003/004/005, REQ-NFR-004), 02-action-contracts.md (ACT-IAM-001 + command standard), 06-traceability-and-delivery-contract.md (transitions, events, idempotency)
  - …/02-INSTITUTIONAL-AND-SYSTEM-DESIGN/02-design-section-2-stakeholders-roles-and-access-control.md (RBAC+ABAC+relationship, capability IDs :67-91, SoD, delegation 5-tuple, §11.1 account states live in 03/../01-applicant-journey-book.md:1225-1235)
  - …/03-USER-EXPERIENCE-BLUEPRINTS/12-system-moodle-integration-operations-journey-book.md (§12.9 form/validation/lifecycle, §12.12 revocation copy, §12.13 rows)
  - …/04-UI-UX-DESIGN-SYSTEM/05-actions-queues-records-feedback-and-recovery.md (§14.31 empty, §14.33 error panel, §14.34 UI-ACCESS-001, §14.28 permission-aware search, UI-SUBMIT-001)
  - …/06-ARCHITECTURE-INTEGRATIONS/01-domain-and-module-architecture.md + 02-base-repository-and-ai-development-contract.md (§18 outbox/idempotency) + 03-state-command-and-event-contracts.md (:78 transaction rule)
  - …/07-SECURITY-PRIVACY-RESILIENCE/01-security-resilience-and-codebase-health.md (backend final authority, deny-by-default, high-impact idempotency, 19.49/19.51) + 02-security-and-privacy.md (audit fields :72, logging ban) + 04-rate-limiting… (grant key rule) + 06-error-recovery… (§16.1/16.4/16.14)
  - …/12-TESTING-AND-ACCEPTANCE/03-authorization-and-security-test-guide.md (matrix) + 02-acceptance-test-catalogue.md (TEST-AUTH-001–011, TEST-REC-006) + 07-phase-exit-review-checklist.md (12 gates)
- Supersession-register entries checked: SUP-001 to SUP-011
- Readiness-matrix status: Ready (identity/session/role workspace)
- Open design-gap IDs: GAP-001 delegation workflow, GAP-002 session
  concurrency on switch, GAP-003 capability registry, GAP-004 scope
  registry, GAP-005 appointment HR cross-check, GAP-006 approver
  scope-authority, GAP-007 training checks, GAP-008 notification
  delivery/templates, GAP-009 ops queue, GAP-010 review schedules +
  expiry daemon, GAP-011 suspicious-recovery pause (all in docs/gaps/)

## User outcome

Every protected action explains its denial instead of failing silently:
Mutinta acting outside her active scope gets what-was-not-completed plus
the four safe routes; a revoked-while-composing grant attempt shows the
§12.12 sentence; double-clicking Create never makes two assignments; an
admin resolving an unknown username sees a scoped empty state, while a
non-grantor probing the same endpoint gets an indistinguishable denial.

## Architecture boundary

- Owning module: identity-access (new `policy.service.ts` pure evaluator,
  `IdempotencyKey` + `OutboxEvent` tables, `AuditEvent.purpose` column,
  `POST /auth/grants/resolve`, `GET /auth/commands/:key`, `DeniedPanel` +
  resolve-then-create UI; denial routes live in the UI panel, not API
  bodies; no cross-module writes)
- Permitted dependencies: none new
- API/command/event contracts: same-transaction `RoleAssignment +
  OutboxEvent(Requested/Approved/Activated[/ExpiryScheduled])`; grant accepts
  client key in the validated body field `idempotencyKey` (UUID);
  resolve is grantor-only exact-username POST;
  commands CMD-IAM-GrantRole/SwitchWorkspace/ResolveGrantTarget/Guard
  (packet-local)
- Data entities/migration impact: ADDITIVE — `AuditEvent.purpose`,
  `IdempotencyKey(key UNIQUE, receipt)`, `OutboxEvent` (+poll index),
  `RoleAssignment @@index([accountId, role, scopeType, scopeRef])`,
  `AuditEvent @@index([correlationId])`; every new query indexed per rule
- External adapters: none (outbox worker delivery is v0.9)

## Required controls

- Authorization: `PolicyService.evaluate()` implements §15.21 arms verbatim
  except scope-containment hierarchy and delegation windows (GAP-001/
  GAP-004 — arms evaluate what handbook + demo concretely define);
  wired into grant/switch/resolve (`/me` stays authentication-level
  self-read by design); SoD mechanism + tests real, pair data empty
  (GAP-012); approver mandatory, real account, ≠ target; delegation
  fields honored where present (full workflow → GAP-001)
- Privacy/classification: resolve returns username + displayName only;
  non-grantors get uniform denies (no oracle); 404-to-grantors uses the
  UI-EMPTY permission variant, never failure wording
- Validation/state transitions: forbidNonWhitelisted DTOs; 7-state account
  gate, case-insensitive (seed stores ACTIVE/LOCKED; handbook names Active…
  — map is demo): Active allows, Closed never, rest generic-deny;
  effective-dating strict; pending never authorizes; no invented states
- Audit: purpose filled (grant reason / action context); prior/new refs on
  grant ALLOW + replay (idempotencyRef recorded wherever a key is present);
  guard + CSRF rejections audited with references; rate-limit + idempotency
  config in SECURITY-v1
- Idempotency: keyed grants with stored receipts + replay endpoint;
  UI-SUBMIT-001 six behaviours on the grant form
- Failure/recovery: §16.1 five-part; WORKSPACE-005 carries the §12.12
  sentence on dead-workspace switch; four routes on every authority denial
  (UI panel); reference always
- Accessibility/UI states: denial panel distinct from error/empty/loading
  (05-actions:527); keyboard/SR patterns reused; focus to denial on appear

## Out of scope

Slice-5 audit review/expiry daemon, MFA enforcement (2b/production),
break-glass flow, delivery/providers, applicant/student/finance/moodle
modules, TOTP, review-schedule UI, ops queue UI, expiry-warning countdown
(recorded Gate-11), Playwright (deferred decision stands, noted in 19.49 row)

## Definition of done

- [x] Entry gate all YES (this packet)
- [x] PolicyService unit matrix green (each §15.21 arm allow + deny;
      RED watched) + status-gate + contract proofs (unit 7 files/27 green)
- [x] SoD/purpose/status/resolve/idempotency/outbox e2e green (4 files,
      23/23 on fresh `demo:reset`: 5 migrations, seed 4/4/6/4; incl. expiry
      invalidation + full 4-event chain proofs)
- [x] Denial panel + empty variant + resolve-then-create live; no hardcoded copy
- [x] Builds + lint clean; `diff --check` clean; index rule verified live
      in Postgres (13 @@index + PK/unique keys incl. new composite +
      correlationId)
- [x] 19.49 rows addressed: vuln scan manual (`npm audit`, no CI job yet —
      workflows dormant under local-only flow); allow/deny + validation +
      idempotency + migration-deploy test + critical API E2E + secret scan
      green; file-upload N/A (no uploads); no new deps
- [x] Gate-5 rollback understood: migrations are forward-only additive;
      dev recovery is `demo:reset`; production backup/restore belongs to
      slice-5/ops (recorded Gate-11)
- [ ] Reviewer replays denial matrix on WSL and explains the §15.21 decision path

## Source map (anti-hallucination)

Packet-local: SoD pair values (default empty), resolve budget, endpoint
paths, CMD names, kebab test IDs, IdempotencyKey/OutboxEvent table shapes,
purpose column, denial routes (UI panel content, not API fields),
7-state→behaviour map (states are handbook §11.1; the map is demo).
Handbook: §15.21 arms, SoD rules, decision formulae, capability IDs
(18, Sec-2), UI-ACCESS-001/§16.4 copy + routes, §12.12 verbatim
(WORKSPACE-005), UI-EMPTY variant text, audit fields (02:72),
outbox/idempotency rules, TEST-AUTH-* intents.

TEST-AUTH coverage (rows may be DEFERRED, never disappear —
05-traceability:22-28): 002 adviser-unrelated (resolve uniform-403
analogue — COVERED), 006 dean/counselling + 007 unassigned-case (no
counselling domain — DEFERRED to restricted-services slices), 008 QAO
self-verify (GAP-012 SoD review absent — DEFERRED), 009 sysadmin-alters
(SYSADMIN grant authority + no academic targets exist — COVERED as
deny-by-default posture), 011 break-glass scope (no flow — DEFERRED to
hardening), 001/003/004/005/010 (need advisee/roster/quiz/finance/
regulatory domains — DEFERRED to their slices), TEST-REC-006 expired
role (revoke-then-null + expiry e2e — COVERED).
