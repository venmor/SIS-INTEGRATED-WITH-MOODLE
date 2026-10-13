---
goal: "Implement suspicious recovery pause + security review route (GAP-011)"
version: 1.0
date_created: 2026-09-28
last_updated: 2026-09-28
owner: "AI Agent"
status: "Completed"
tags: ["feature", "security", "recovery", "gap-011"]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Implementation of GAP-011: Suspicious Recovery Pause + Security Review Route. This feature adds suspicion signal detection during account recovery (failed attempts, geo anomaly, device change, rate limiting), pauses suspicious recovery attempts, routes them to a security review queue for Security Administrator role, integrates with SecurityEvent model, and maintains audit trail for all decisions.

Based on Handbook Section 12.13 and the role blueprint (035-role-blueprint-12-part-1-system-administration-and-identity-access-administration.md) which states: "Account recovery appears suspicious | Pause recovery and route security review".

## 1. Requirements & Constraints

- **REQ-001**: Detect suspicion signals during recovery (failed attempts, geo anomaly, device change, rate limiting)
- **REQ-002**: Pause recovery and route to security review queue when suspicion detected
- **REQ-003**: Security review queue accessible only to Security Administrator role
- **REQ-004**: Integrate with SecurityEvent model for audit trail
- **REQ-005**: All decisions (approve/deny/escalate) must be audited with correlation IDs
- **REQ-006**: Follow existing patterns in recovery.service.ts, review.service.ts, auth.controller.ts
- **SEC-001**: Never reveal account enumeration - always return generic messages
- **SEC-002**: Use existing rate limiting infrastructure (RateLimiter class)
- **SEC-003**: Use existing auditAuth function for all audit events
- **CON-001**: Must use existing Prisma models and patterns (no new tables without migration)
- **CON-002**: Must follow existing module boundaries (identity-access module)
- **CON-003**: Must use existing configuration service for thresholds
- **PAT-001**: Follow ReviewService pattern for queue-based review workflow
- **PAT-002**: Follow RecoveryService pattern for recovery flow with audit
- **PAT-003**: Follow AuthController pattern for rate limiting and CsrfGuard

## 2. Implementation Steps

### Implementation Phase 1: Database Schema & Configuration

- GOAL-001: Add new Prisma models for RecoverySuspicion and RecoveryReviewQueue

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add RecoverySuspicion model to prisma/schema.prisma with fields: id, recoveryTokenId, accountId, signalType, signalDetails, riskScore, status, createdAt, reviewedAt, reviewedBy, reviewDecision, reviewNote | ✅ | 2026-09-28 |
| TASK-002 | Add RecoveryReviewQueue model to prisma/schema.prisma with fields: id, suspicionId, accountId, priority, status, assignedTo, createdAt, claimedAt, decidedAt, decidedBy, decision, decisionReason | ✅ | 2026-09-28 |
| TASK-003 | Add configuration keys for suspicion thresholds in security config (suspicionFailedAttemptsThreshold, suspicionGeoAnomalyEnabled, suspicionDeviceChangeEnabled, suspicionRateLimitWindow, suspicionRiskScoreThreshold) | ✅ | 2026-09-28 |
| TASK-004 | Run prisma migrate dev to create migration | ✅ | 2026-09-28 |

### Implementation Phase 2: Suspicion Detection Service

- GOAL-002: Implement suspicion detection logic in RecoveryService

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Add checkSuspicionSignals method to RecoveryService that analyzes: failed recovery attempts, geographic anomaly (IP geo lookup), device fingerprint change, rate limit proximity | ✅ | 2026-09-28 |
| TASK-006 | Add createSuspicionRecord method to persist suspicion with risk score | ✅ | 2026-09-28 |
| TASK-007 | Add getSuspicionHistory method to retrieve past suspicion events for account | ✅ | 2026-09-28 |
| TASK-008 | Modify startRecovery to call checkSuspicionSignals before creating recovery token | ✅ | 2026-09-28 |
| TASK-009 | If suspicion detected (riskScore >= threshold), create RecoverySuspicion record, create RecoveryReviewQueue entry, return generic "recovery requested" message without token | ✅ | 2026-09-28 |

### Implementation Phase 3: Security Review Queue Service

- GOAL-003: Create RecoveryReviewService for security administrators

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Create recovery-review.service.ts with methods: getReviewQueue, getReviewById, decideReview (approve/deny/escalate) | ✅ | 2026-09-28 |
| TASK-011 | Add requireSecurityAdmin guard using configurationService.getOrThrow('security.reviewRoles') similar to ReviewService | ✅ | 2026-09-28 |
| TASK-012 | Implement decision logic: approve → allow recovery to proceed (create token), deny → reject recovery, escalate → create SecurityEvent for higher authority | ✅ | 2026-09-28 |
| TASK-013 | All decisions create AuditEvent with correlationId, priorState, newState, metadata | ✅ | 2026-09-28 |
| TASK-014 | Add outbox event for review completion (RecoveryReviewCompleted) | ✅ | 2026-09-28 |

### Implementation Phase 4: Controller Endpoints

- GOAL-004: Add controller endpoints for security review queue

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | Add DTOs to dto.ts: RecoveryReviewQueryDto, RecoveryReviewDecideDto, RecoveryReviewDecision enum | ✅ | 2026-09-28 |
| TASK-016 | Add RecoveryReviewService to identity-access.module.ts providers and exports | ✅ | 2026-09-28 |
| TASK-017 | Inject RecoveryReviewService in AuthController constructor | ✅ | 2026-09-28 |
| TASK-018 | Add GET /auth/recovery/reviews endpoint (list queue) with SessionGuard, rate limiting | ✅ | 2026-09-28 |
| TASK-019 | Add GET /auth/recovery/reviews/:id endpoint (single review) with SessionGuard | ✅ | 2026-09-28 |
| TASK-020 | Add POST /auth/recovery/reviews/:id/decide endpoint (decide review) with CsrfGuard, SessionGuard, rate limiting | ✅ | 2026-09-28 |

### Implementation Phase 5: Integration & SecurityEvent

- GOAL-005: Integrate with SecurityEvent model and audit trail

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | Verify SecurityEvent model exists in schema or add if needed (check for securityEvent model) | ✅ | 2026-09-28 |
| TASK-022 | Create security events for: suspicion detected, review queued, review decided (approve/deny/escalate) | ✅ | 2026-09-28 |
| TASK-023 | Ensure all audit events include: actorAccountId, action, targetRef, outcome, reason, correlationId, priorState, newState, metadata | ✅ | 2026-09-28 |
| TASK-024 | Add audit action constants: CMD-IAM-RecoverySuspicionDetected, CMD-IAM-RecoveryReviewQueued, CMD-IAM-RecoveryReviewDecided | ✅ | 2026-09-28 |

### Implementation Phase 6: Tests

- GOAL-006: Write comprehensive tests for suspicion detection and review flow

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-025 | Create recovery-suspicion.spec.ts for suspicion detection logic tests | ✅ | 2026-09-28 |
| TASK-026 | Create recovery-review.service.spec.ts for review queue service tests | ✅ | 2026-09-28 |
| TASK-027 | Add integration tests for: suspicious recovery paused, review queue populated, approve allows recovery, deny blocks recovery | ✅ | 2026-09-28 |
| TASK-028 | Add authorization tests: non-security-admin cannot access review queue | ✅ | 2026-09-28 |
| TASK-029 | Add rate limiting tests for review endpoints | ✅ | 2026-09-28 |

## 3. Alternatives

- **ALT-001**: Use existing ReviewSchedule model instead of new RecoveryReviewQueue - Rejected: ReviewSchedule is for quarterly access reviews, different workflow and reviewer roles
- **ALT-002**: Block suspicious recovery entirely without review - Rejected: Handbook requires "route security review" not block
- **ALT-003**: Use external queue system (Redis/RabbitMQ) - Rejected: Locked stack prohibits Redis/Kafka, must use database-backed queue

## 4. Dependencies

- **DEP-001**: Existing RecoveryService, ReviewService, AuthController patterns
- **DEP-002**: Prisma schema with RecoveryToken, Account, AuditEvent models
- **DEP-003**: ConfigurationService for threshold values
- **DEP-004**: auditAuth function for audit trail
- **DEP-005**: RateLimiter class for rate limiting
- **DEP-006**: ActiveAuthority and hasActiveAuthority for authorization

## 5. Files

- **FILE-001**: prisma/schema.prisma - Add RecoverySuspicion and RecoveryReviewQueue models
- **FILE-002**: apps/api/src/identity-access/recovery.service.ts - Add suspicion detection logic
- **FILE-003**: apps/api/src/identity-access/recovery-review.service.ts - New service for security review queue
- **FILE-004**: apps/api/src/identity-access/dto.ts - Add DTOs for review queue
- **FILE-005**: apps/api/src/identity-access/identity-access.module.ts - Register new service
- **FILE-006**: apps/api/src/identity-access/auth.controller.ts - Add review queue endpoints
- **FILE-007**: apps/api/src/identity-access/recovery-suspicion.spec.ts - Suspicion detection tests
- **FILE-008**: apps/api/src/identity-access/recovery-review.service.spec.ts - Review queue service tests

## 6. Testing

- **TEST-001**: Suspicion detection triggers on multiple failed recovery attempts
- **TEST-002**: Suspicion detection triggers on geo anomaly (different country)
- **TEST-003**: Suspicion detection triggers on device fingerprint change
- **TEST-004**: Suspicion detection triggers when rate limit proximity exceeded
- **TEST-005**: Suspicious recovery returns generic message without token
- **TEST-006**: RecoveryReviewQueue entry created with correct priority and status
- **TEST-007**: Security admin can list review queue
- **TEST-008**: Security admin can view single review
- **TEST-009**: Security admin approve decision creates recovery token and allows recovery
- **TEST-010**: Security admin deny decision blocks recovery permanently
- **TEST-011**: Non-security-admin gets 403 on review endpoints
- **TEST-012**: All decisions audited with correlationId and proper metadata
- **TEST-013**: Rate limiting enforced on review endpoints

## 7. Risks & Assumptions

- **RISK-001**: Geo IP lookup may require external service - will use simple IP-based heuristic for demo
- **RISK-002**: Device fingerprinting requires client cooperation - will use user-agent + IP hash for demo
- **ASSUMPTION-001**: Security Administrator role exists in security.reviewRoles config
- **ASSUMPTION-002**: Existing audit infrastructure (auditAuth, AuditEvent model) supports new action types
- **ASSUMPTION-003**: Prisma migration will succeed without conflicts

## 8. Related Specifications / Further Reading

- Handbook Section 12.13: Identity & Access Administration
- Role Blueprint: 035-role-blueprint-12-part-1-system-administration-and-identity-access-administration.md (line 424)
- GAP-011: Suspicious Recovery Pause + Security Review Route
- Existing implementation: recovery.service.ts, review.service.ts, auth.controller.ts