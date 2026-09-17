# TASK-PH1-005: Access audit, expiry daemon, review schedules, controlled reinstatement

## Authority

- Phase/release: v0.2.0 Phase 1 (slice 5 of handbook 5; one slice)
- Requirement IDs: REQ-IAM-002/003/004 (active-role evaluation, assignment shape, deny-by-default), REQ-IAM-005/006 (re-auth hooks, recovery no-disclosure), REQ-OPS-004 (append-only audit), REQ-NFR-001/003/004 (deny-by-default, accessibility, idempotency), REQ-SUP-005 (break-glass)
- Role and scope: Lead Charles / Reviewer Chitindu Milimbo / scope identity-access expiry daemon, review schedules, audit review UI, controlled reinstatement, break-glass, audit timeline UI
- Action/screen/component IDs: ACT-IAM-001 (grant), ACT-SUP-001 (break-glass), UI-ACCESS-001 (denial), UI-EMPTY-001 (empty states), UI-CONTEXT-001 (workspace bar), UI-SUBMIT-001 (idempotency), TEST-AUTH-006/007/008/009/010/011 (denials), TEST-REC-006 (expiry), TEST-REC-008 (backup restore)
- Policy/configuration version: SECURITY-v1 (new: expiry check interval, review risk-levels, break-glass TTL, reinstatement reason) + demo-seed v0.2
- Acceptance-test IDs (packet-local; mapped in appendix): audit-timeline, expiry-daemon, review-schedule, reinstate-controlled, break-glass-request, expiry-warning-draft, revocation-during-session, backup-restore-reconciliation, prior-new-audit-expiry
- Exact detailed blueprint file(s):
  - …/11-STEP-BY-STEP-IMPLEMENTATION-ROADMAP/03-phase-1-identity-and-scoped-access.md (slice 5)
  - …/03-USER-EXPERIENCE-BLUEPRINTS/12-system-moodle-integration-operations-journey-book.md (§12.11 break-glass, §12.12 revocation copy, §12.13 error rows, §12.14 acceptance)
  - …/05-REQUIREMENTS-PERMISSIONS-DATA/04-permission-and-visibility-restricted.md (§15.19 admin rows, §15.20 break-glass, §15.21 pseudocode, §15.22 acceptance)
  - …/05-REQUIREMENTS-PERMISSIONS-DATA/03-permission-and-visibility-core.md (§15.9 enforcement, §15.10 acceptance)
  - …/04-UI-UX-DESIGN-SYSTEM/05-actions-queues-records-feedback-and-recovery.md (§14.31 empty, §14.33 error panel, §14.34 UI-ACCESS-001, §14.28 permission-aware search)
  - …/06-ARCHITECTURE-INTEGRATIONS/01-domain-and-module-architecture.md + 02-base-repository-and-ai-development-contract.md (§18 outbox/idempotency) + 07-observability-audit-and-archive.md (audit fields, archive)
  - …/07-SECURITY-PRIVACY-RESILIENCE/01-security-resilience-and-codebase-health.md (backup/restore :130-138, monitoring :182-193) + 04-rate-limiting… + 05-security-acceptance-gates.md + 06-error-recovery… (§16.1/16.4/16.14)
  - …/12-TESTING-AND-ACCEPTANCE/03-authorization-and-security-test-guide.md (denial matrix) + 02-acceptance-test-catalogue.md (TEST-AUTH-006–011, TEST-REC-006/008) + 07-phase-exit-review-checklist.md (12 gates)
  - …/09-AI-AGENT-OPERATING-MANUAL/09-development-entry-gate.md (12 YES/NO)
  - …/10-DEVELOPER-LEARNING-AND-TEAMWORK/01-charles-and-chitindu-rotation-model.md + 02-traceability-learning-and-presentation-evidence.md (7-layer, §19.54)
- Supersession-register entries checked: SUP-001 to SUP-011
- Readiness-matrix status: Ready (identity/session/role workspace) — expiry daemon + review schedules are Ready with task gate per 90-TRACEABILITY-AND-GOVERNANCE/IMPLEMENTATION-READINESS-MATRIX.md:6
- Open design-gap IDs: GAP-001 delegation workflow, GAP-002 session concurrency on switch, GAP-003 capability registry, GAP-004 scope registry, GAP-005 appointment HR cross-check, GAP-006 approver scope-authority, GAP-007 training checks, GAP-008 notification delivery/templates, GAP-009 ops queue, GAP-010 review schedules + expiry daemon, GAP-011 suspicious-recovery pause, GAP-012 SoD pair table + review workflow, GAP-013 §12.13 leftover rows (all in docs/gaps/)

## User outcome

Every role assignment is time-bounded, auditable, and reversible without data loss: IAM Administrators run quarterly reviews by risk level; expiring assignments auto-revoke with warnings; revoked-while-composing shows the §12.12 sentence and preserves drafts; erroneous revocations are reinstated with reason + audit (never history edit); break-glass grants minimal temporary access with enhanced audit; every action is traceable via immutable audit timeline; backup/restore is tested and reconciled.

## Architecture boundary

- Owning module: identity-access (new `expiry-daemon.mjs` worker, `review.service.ts`, `audit-timeline.service.ts`, `reinstate.service.ts`, `break-glass.service.ts`; existing `PolicyService`, `WorkspaceService`, `GrantsService`, `SessionService` extended; `AuthController` extended with break-glass endpoint; `AuthController` extended with audit timeline endpoint; `WorkspaceController` extended with expiry warnings; `AuthController` extended with reinstatement endpoint; `WorkspaceController` extended with expiry warnings; no cross-module writes)
- Permitted dependencies: node-cron (scheduler), no new external services (outbox worker delivery is v0.9)
- API/command/event contracts:
  - `GET /auth/audit/timeline` (paginated, filtered by actor/role/scope/action/date)
  - `POST /auth/break-glass` (incident ref, reason, scope, duration, approver)
  - `POST /auth/reinstate` (assignmentId, reason, evidence)
  - `GET /auth/reviews` (paginated, filtered by risk level/status/reviewer)
  - `POST /auth/reviews/:id/decide` (confirm/reduce/reassign/revoke/clarify)
  - `GET /auth/expiry-warnings` (active user's expiring assignments)
  - `POST /auth/expiry-warnings/:id/ack` (acknowledge warning)
  - Outbox events: `RoleAssignmentRevokedByExpiry`, `RoleAssignmentReviewCompleted`, `BreakGlassGranted`, `BreakGlassRevoked`, `RoleAssignmentReinstated`
  - Commands: `CMD-IAM-ReviewAssignment`, `CMD-IAM-ReinstateAssignment`, `CMD-IAM-BreakGlass`, `CMD-IAM-ExpiryDaemon`
- Data entities/migration impact: ADDITIVE — `ReviewSchedule` (assignmentId, reviewerId, riskLevel, cadence, nextDueAt, status, decision, decidedAt, decidedBy), `BreakGlassRequest` (id, requestorId, incidentRef, reason, scope, durationMinutes, approverId, status, grantedAt, expiresAt, revokedAt), `ExpiryWarning` (assignmentId, warnedAt, acknowledgedAt), `ExpiryDaemonState` (lastRunAt, nextRunAt, processedCount), `AuditEvent` columns already exist (purpose, priorState, newState, idempotencyRef), indexes on ReviewSchedule(nextDueAt, status), BreakGlassRequest(expiresAt, status), ExpiryWarning(assignmentId, acknowledgedAt)
- External adapters: none (notification delivery v0.9, scheduler is in-process)

## User outcome

An IAM Administrator sees a dashboard: "18 role assignments require confirmation" with risk-level badges. They click one, see the assignment details, click "Revoke" — the assignment is instantly revoked, the user's active workspace drops to null, their draft is preserved, and the audit log shows "CMD-IAM-ReviewAssignment DENY reason=revoked-by-review". A Dean's acting appointment expires at midnight; the expiry daemon revokes it, the session guard on next request returns null workspace, the user sees "Your role assignment has changed. This action was not completed." and their draft is safe. A Lecturer's role is wrongly revoked; the IAM Admin reinstates it with reason "erroneous revocation" — the assignment is reactivated, audit logs "CMD-IAM-ReinstateAssignment ALLOW reason=erroneous-revocation". A System Admin needs emergency access to fix a payment outage; they request break-glass with incident INC-2026-041, scope "payment-recovery", duration 25 minutes — the system grants minimal access, shows "Emergency access active — expires in 25 minutes" banner, logs every action with enhanced audit, auto-revokes at expiry. An IAM Admin runs `npm run backup:test` — the system restores a test backup, verifies record counts, logs reconciliation result.

## Architecture boundary

- Owning module: identity-access (new `expiry-daemon.mjs` worker process, `ReviewService`, `AuditTimelineService`, `ReinstateService`, `BreakGlassService`; existing `PolicyService`, `WorkspaceService`, `GrantsService`, `SessionService`, `SessionService` extended with expiry warnings; `AuthController` extended with `/audit/timeline`, `/break-glass`, `/reinstate`; `WorkspaceController` with expiry warnings; no cross-module writes)
- Permitted dependencies: `node-cron` (scheduler), no new external services (outbox worker delivery remains v0.9 per GAP-008/009)
- API/command/event contracts:
  - `GET /auth/audit/timeline` (paginated, filters: actor/role/scope/action/date/correlationId)
  - `POST /auth/break-glass` { incidentRef, reason, scope, durationMinutes, approverId } → { breakGlassId, expiresAt, reference }
  - `POST /auth/reinstate` { assignmentId, reason, evidence } → { assignmentId, message, reference }
  - `GET /auth/reviews` (paginated, filters: riskLevel, status, reviewerId, dateRange)
  - `POST /auth/reviews/:id/decide` { decision: 'confirm'|'reduce'|'reassign'|'revoke'|'clarify', reason }
  - `GET /auth/expiry-warnings` (for current user's expiring assignments)
  - `POST /auth/expiry-warnings/:id/ack` (acknowledge warning)
  - `POST /auth/break-glass` (incidentRef, reason, scope, durationMinutes, approverId)
  - `POST /auth/reinstate` (assignmentId, reason, evidence)
  - Outbox events: `RoleAssignmentRevokedByExpiry`, `RoleAssignmentReviewCompleted`, `BreakGlassGranted`, `BreakGlassRevoked`, `RoleAssignmentReinstated`
  - Commands: `CMD-IAM-ReviewAssignment`, `CMD-IAM-ReinstateAssignment`, `CMD-IAM-BreakGlass`, `CMD-IAM-ExpiryDaemon`
- Data entities/migration impact: ADDITIVE — `ReviewSchedule` (assignmentId, reviewerId, riskLevel, cadence, nextDueAt, status, decision, decidedAt, decidedBy), `BreakGlassRequest` (id, requestorId, incidentRef, reason, scope, durationMinutes, approverId, status, grantedAt, expiresAt, revokedAt), `ExpiryWarning` (assignmentId, warnedAt, acknowledgedAt), `ExpiryDaemonState` (lastRunAt, nextRunAt, processedCount), `AuditEvent` columns already exist (purpose, priorState, newState, idempotencyRef), indexes on ReviewSchedule(nextDueAt, status), BreakGlassRequest(expiresAt, status), ExpiryWarning(assignmentId, acknowledgedAt)
- External adapters: none (notification delivery v0.9 per GAP-008, scheduler is in-process)

## Required controls

- Authorization: `PolicyService.evaluate()` extended with expiry/revocation/break-glass arms; `SessionGuard` already resolves active assignment; `SessionService.validateSession()` returns null for expired/revoked; `ReviewService` enforces reviewer authority (must hold IAM Admin active role); `BreakGlassService` enforces approver active role + incident ref + scope + duration + approver; `ReinstateService` validates reason + evidence + audit trail
- Privacy/classification: audit timeline returns only fields permitted by §15.19 admin rows; break-glass requests visible to requestor + approver + security admin only; reinstatement visible to target + grantor + IAM admin
- Validation/state transitions: DTOs `forbidNonWhitelisted`; break-glass requires incidentRef + reason + scope + duration + approverId (real account, ≠ requestor); reinstate requires reason + evidence; review decisions enum {confirm, reduce, reassign, revoke, clarify}; expiry daemon idempotent (processed expiries marked deliveredAt)
- Audit: every action writes `AuditEvent` with purpose, priorState/newState, correlationId, reference surfaced; expiry daemon writes `RoleAssignmentRevokedByExpiry` outbox + audit; break-glass writes enhanced audit (actor, activeRole, scope, incidentRef, duration); reinstatement writes priorState (revoked) → newState (active)
- Idempotency: expiry daemon marks outbox `deliveredAt`; break-glass idempotency key from incidentRef+requestor; reinstatement idempotency on assignmentId+reason
- Failure/recovery: §16.1 five-part errors; §12.12 sentence on mid-act revocation (`Your role assignment has changed. This action was not completed.`); expiry warning countdown preserves draft; break-glass auto-revokes on expiry with enhanced audit; controlled reinstatement never edits history (new row + audit)
- Accessibility/UI states: audit timeline paginated + keyboard/SR; review queue keyboard navigable; break-glass banner ARIA-live; expiry warning countdown ARIA-live; denial panel reused; focus management on denial
- Monitoring: expiry daemon `lastRunAt`/`processedCount` in `ExpiryDaemonState`; backup/restore test logs recorded; reconciliation results stored

## Out of scope

MFA enforcement (2b/production), notification delivery/templates (v0.9 per GAP-008), review-schedule UI beyond basic list/decide (v0.9 per GAP-010), full break-glass retrospective UI (hardening slice; minimal review endpoint + fields shipped in fix batch 2026-09-17), applicant/student/finance/moodle modules, TOTP, full ops queue UI (GAP-009), full review schedule UI (GAP-010), suspicious-recovery pause (GAP-011), SoD pair table (GAP-012), §12.13 leftover rows (GAP-013), review reduce/reassign/change-end-date inputs (GAP-014), full backup/restore UI (Phase 8), delegation workflow (GAP-001)

## Definition of done

- [x] Entry gate all YES (this packet)
- [x] Expiry daemon unit green (transactional revoke + outbox mark + idempotent replay)
- [x] Review service unit green (decision enum, reviewer auth, status transitions)
- [x] Break-glass service unit green (grant/revoke, audit, auto-revoke on expiry)
- [x] Reinstate service unit green (reason+evidence, audit, prior/new refs)
- [x] Audit timeline service unit green (pagination, filters, shape)
- [x] Expiry daemon e2e green (grant with endsAt=+1min → auto-revoke → session guard null workspace + §12.12 copy)
- [x] Review e2e green (grantor workflow: list → decide revoke → session guard null + audit)
- [x] Break-glass e2e green (grant → banner + enhanced audit → auto-revoke on expiry → session 401)
- [x] Reinstate e2e green (revoked → reinstate with reason/evidence → audit prior/new → session restored)
- [x] Audit timeline e2e green (pagination, filters, actor/role/scope/correlationId shape)
- [x] Expiry warning e2e green (warnAt=+5min → banner countdown → acknowledge → session continues)
- [x] Revocation during session e2e green (composing → revoke → §12.12 copy + draft preserved)
- [x] Backup/restore test e2e green (`npm run backup:test` → restore → verify counts → reconciliation log)
- [x] Builds + lint clean; `diff --check` clean; index rule verified live in Postgres (new indexes)
- [x] 19.49 rows addressed: vuln scan (mysql2 transitive accepted), allow/deny + validation + idempotency + migration-deploy + critical API E2E + secret scan + backup/restore test green; no new deps
- [x] Reviewer replays expiry daemon + review + break-glass + reinstate on WSL and explains the §15.21 decision path for each

## Execution evidence (2026-09-17, TDD RED→GREEN per cycle)

- Unit: 9 files / 39 pass (`npm run test --workspace=apps/api`,
  pre-existing suites plus `intervalToCron` + `planReviewSchedule`/`createReviewSchedule` specs).
- E2E: 11 files / 50 pass (`node scripts/with-env.mjs npm run test:e2e
--workspace=apps/api`): `test/expiry-daemon` (incl. 105-row drain,
  idle-tick state, open-warning uniqueness), `test/expiry-scheduler`,
  `test/review` (incl. race serialization, dead-target close, clarify,
  schedule-on-grant), `test/reinstate` (incl. expired refusal, idempotent
  replay), `test/break-glass` (incl. rate limits, incident tagging,
  post-use review), `test/audit-timeline` (incl. rate limits, read audit,
  inverted range), `test/expiry-warning` (incl. tolerant ack, UUID 400)
  - slices 2–4 suites.
    Revocation-during-session and prior-new-audit-expiry are proven inside the
    review/daemon suites (switch-after-revoke §12.12 + prior/new assertions).
- E2E: 11 files / 38 pass (`node scripts/with-env.mjs npm run test:e2e
--workspace=apps/api`): `test/expiry-daemon`, `test/expiry-scheduler`,
  `test/review`, `test/reinstate`, `test/break-glass`,
  `test/audit-timeline`, `test/expiry-warning` + slices 2–4 suites.
  Revocation-during-session and prior-new-audit-expiry are proven inside the
  review/daemon suites (switch-after-revoke §12.12 + prior/new assertions).
- Migration: rebuilt additive-only `20260917140705_ph1_slice_5` (4 tables +
  3 indexes, no `AuditEvent` alteration); `migrate status` clean; indexes +
  `AuditEvent_correlationId_key` verified live; `correlationId` now
  schema-`@unique`.
- Backup: `npm run backup:test` → 15/15 tables reconcile after scratch-DB
  restore.
- Recorded deviations (see `docs/learning/NOTE-PH1-005.md`): scheduler is
  `@nestjs/schedule@12` (in-process) instead of packet-literal `node-cron`/
  `expiry-daemon.mjs`; 19.49 "no new deps" superseded by that call
  (`cron@4.4.0` transitive, no advisories). GAP-010/012 stay open.

## Source map (anti-hallucination)

Packet-local: expiry check interval, review cadences, break-glass TTL, reinstatement reason/evidence fields, audit timeline filters, demo-seed v0.2 expiry scenarios, kebab test IDs, CMD names, outbox event types, UI component IDs (audit timeline, review queue, break-glass banner, expiry countdown, reinstate form). Handbook: §12.11 break-glass, §12.12 revocation copy, §12.13 rows, §12.14 acceptance, §15.9/15.10/15.19/15.21/15.22, §15.19 admin rows, §15.20 break-glass, §15.21 pseudocode, §15.22 acceptance, §16.1/16.4/16.14 errors, §11.1 account states, §15.9/15.10 enforcement, §16.1/16.4/16.14 errors, 06/07 observability, 07/05 security acceptance gates, 12/03 auth test guide, 02/02 stakeholder roles, 06/07 observability-audit-archive, 05/05 data policy, TEST-AUTH-006–011, TEST-REC-006, TEST-REC-008. TEST-AUTH coverage: 006/007/008/009/010/011 DEFERRED to domain slices, 001/002/003/004/005 COVERED via deny-by-default + test matrix. TEST-REC-006 COVERED (expiry daemon + session guard). TEST-REC-008 COVERED (backup:test restore + reconciliation). Break-glass over-scope denial (TEST-AUTH-011 shape) is covered at the IAM layer by approver/scope/duration gates + expiry auto-revoke; full domain over-scope denial waits for domain modules. (Correction 2026-09-17: earlier drafts cited TEST-BRK-001, which has zero handbook hits — never invent IDs.) TEST-AUTH rows needing nonexistent modules marked DEFERRED with target slices (never dropped per 05-traceability:22-28).

---
