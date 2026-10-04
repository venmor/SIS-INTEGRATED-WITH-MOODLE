# Outbox Delivery Worker Implementation Plan (Task 1.6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire notification delivery handlers into outbox worker for non-Moodle events (ApplicationSubmitted, ClarificationRequested, etc.) with operations queue for failed deliveries.

**Architecture:** Create a new outbox delivery worker that processes ALL event types (not just Moodle events), uses the existing delivery handler registry to route to email/SMS/internal/webhook channels, and provides an operations queue service for manual retry/redirect of failed deliveries.

**Tech Stack:** NestJS, Prisma, TypeScript, existing delivery handlers, @nestjs/schedule for cron

**Spec:** GAP-015 Row 6 + GAP-008/009 from design handbook

## Global Constraints

- Locked stack: NestJS + TypeScript, PostgreSQL + Prisma, Docker Compose
- No Redis, Kafka, RabbitMQ, microservices without ADR
- Outbox pattern: domain row + event commit atomically; worker delivery is v0.9
- Exponential backoff retry (max 5 attempts) with capped delay + jitter
- Dead-letter handling for permanently failed events
- All event types must be processed: ApplicationSubmitted, ClarificationRequested, CorrectionRequested, DecisionReleased, OfferReleased, WithdrawalConfirmed, StudentConverted, StaffAssessmentAssigned
- Delivery channels: email, SMS, internal, webhook based on recipient preferences

## Review Focus

1. **Event type coverage:** Ensure all 8 non-Moodle event types map to correct templates
2. **Delivery channel selection:** Verify email/SMS/internal/webhook routing works per recipient preferences
3. **Retry logic:** Exponential backoff with max 5 attempts, proper dead-letter transition
4. **Operations queue:** Manual retry, redirect to different channel, metrics
5. **Idempotency:** Duplicate delivery handling via idempotency keys in envelopes

---

### Task 1: Create Outbox Delivery Worker

**Files:**
- Create: `development/apps/api/src/integration/outbox-delivery.worker.ts`
- Modify: `development/apps/api/src/integration/integration.module.ts` (add provider)
- Test: `development/apps/api/src/integration/outbox-delivery.worker.spec.ts`

**Interfaces:**
- Consumes: `IntegrationService` (for DB access), `deliveryHandlerRegistry` (for handlers)
- Produces: `OutboxDeliveryWorker` class with `processOutbox()` method called by cron

- [ ] **Step 1: Write failing tests for OutboxDeliveryWorker**

```typescript
// Test file: development/apps/api/src/integration/outbox-delivery.worker.spec.ts
// Tests for:
// - Worker processes pending outbox events (not just Moodle events)
// - Worker uses deliveryHandlerRegistry to find matching handlers
// - Worker routes to correct channels (email, SMS, internal, webhook)
// - Exponential backoff retry (max 5 attempts)
// - Dead-letter handling for permanently failed events
// - Idempotency via deliveredAt check
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=outbox-delivery.worker.spec.ts
Expected: FAIL (worker doesn't exist yet)
```

- [ ] **Step 3: Implement OutboxDeliveryWorker class**

Key implementation details:
- Cron job every 30 seconds (configurable via policy)
- Fetches pending OutboxEvent rows where `deliveredAt` is null
- For each event, finds matching notification templates via deliveryHandlerRegistry
- Renders template with event payload
- Delivers via appropriate channel based on recipient preferences
- Records IntegrationDeliveryAttempt with status
- Marks OutboxEvent.deliveredAt on success
- Implements exponential backoff retry (max 5 attempts)
- Dead-letter handling for permanently failed events

- [ ] **Step 4: Register OutboxDeliveryWorker in IntegrationModule**

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=outbox-delivery.worker.spec.ts
Expected: PASS
```

---

### Task 2: Create Operations Queue Service (GAP-009)

**Files:**
- Create: `development/apps/api/src/integration/operations-queue.service.ts`
- Modify: `development/apps/api/src/integration/integration.module.ts` (add provider)
- Test: `development/apps/api/src/integration/operations-queue.service.spec.ts`

**Interfaces:**
- Consumes: PrismaService
- Produces: `OperationsQueueService` with methods:
  - `getFailedDeliveries(filters): Promise<PaginatedResult<FailedDelivery>>`
  - `retryDelivery(deliveryAttemptId): Promise<DeliveryAttempt>`
  - `redirectDelivery(deliveryAttemptId, newChannel): Promise<DeliveryAttempt>`
  - `getDeliveryMetrics(): Promise<DeliveryMetrics>`

- [ ] **Step 1: Write failing tests for OperationsQueueService**

```typescript
// Test file: development/apps/api/src/integration/operations-queue.service.spec.ts
// Tests for:
// - getFailedDeliveries returns paginated failed deliveries with filters
// - retryDelivery resets attempt state to PENDING with nextRunAt = now
// - redirectDelivery changes delivery channel for retry
// - getDeliveryMetrics returns queue depth, success rate, latency
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement OperationsQueueService**

Key implementation details:
- Query IntegrationDeliveryAttempt where state in ['DEAD_LETTER', 'MANUAL_REVIEW']
- Support filtering by eventType, date range, state
- Pagination with cursor-based or offset-based
- retryDelivery: reset state to PENDING, attempt = 0, nextRunAt = now, lastError = null
- redirectDelivery: update outbox payload with new channel config, reset for retry
- getDeliveryMetrics: count by state, success rate, avg latency

- [ ] **Step 4: Run tests to verify they pass**

---

### Task 3: Add OutboxEvent Emission in ApplicationsService

**Files:**
- Modify: `development/apps/api/src/admissions/applications.service.ts` (submit method)
- Test: Existing tests should cover

**Interfaces:**
- Consumes: PrismaService (for outboxEvent.create)
- Produces: OutboxEvent for ApplicationSubmitted

- [ ] **Step 1: Update submit() method to emit ApplicationSubmitted OutboxEvent with full payload**

Required payload structure:
```typescript
{
  eventType: 'ApplicationSubmitted',
  aggregateId: applicationId,
  aggregateType: 'Application',
  payload: {
    applicationId,
    snapshotId,
    receiptReference,
    applicantName,
    reference,
    programmeName,
    intake,
    submittedAt,
    emailTo, // from person.email
    smsTo, // from person.phone
    recipientAccountId: actor.accountId,
    templateKey: 'APPLICATION_SUBMITTED',
    templateVars: { ... },
    channels: ['email', 'internal'], // based on verified contacts
    correlationId,
    idempotencyKey: dto.idempotencyKey
  },
  recipientId: actor.accountId,
  channels: ['email', 'internal'],
  correlationId: randomUUID()
}
```

- [ ] **Step 2: Run existing tests to verify no regression**

---

### Task 4: Add OutboxEvent Emission in ReviewService

**Files:**
- Modify: `development/apps/api/src/admissions/review.service.ts` (raiseClarification, decideCorrection, releaseDecision, extendOffer)
- Test: Existing tests should cover

**Interfaces:**
- Consumes: PrismaService (for outboxEvent.create)
- Produces: OutboxEvents for:
  - ApplicationClarificationRequested
  - ApplicationCorrectionRequested (when correction requested)
  - ApplicationDecisionReleased (when decision released)
  - ApplicationOfferReleased (when offer released via ADMIT/ADMIT_WITH_CONDITIONS)

- [ ] **Step 1: Update raiseClarification() to emit ApplicationClarificationRequested OutboxEvent**

- [ ] **Step 2: Update decideCorrection() to emit ApplicationCorrectionRequested OutboxEvent** (when correction requested, not when decided)

- [ ] **Step 3: Update releaseDecision() to emit ApplicationDecisionReleased AND ApplicationOfferReleased** (if outcome is ADMIT or ADMIT_WITH_CONDITIONS)

- [ ] **Step 4: Update extendOffer() to emit ApplicationOfferReleased** (updated offer)

- [ ] **Step 5: Run existing tests to verify no regression**

---

### Task 5: Add OutboxEvent Emission in CaseService

**Files:**
- Modify: `development/apps/api/src/admissions/case.service.ts` (withdraw method)
- Test: Existing tests should cover

**Interfaces:**
- Consumes: PrismaService (for outboxEvent.create)
- Produces: OutboxEvent for:
  - ApplicationWithdrawalConfirmed

- [ ] **Step 1: Update withdraw() to emit ApplicationWithdrawalConfirmed OutboxEvent**

- [ ] **Step 2: Run existing tests to verify no regression**

---

### Task 6: Add OutboxEvent for Student Conversion and Staff Assessment

**Files:**
- Create/Modify: Service(s) that handle student conversion and staff assessment assignment
- Test: Existing/new tests

**Interfaces:**
- Consumes: PrismaService
- Produces: OutboxEvents for:
  - StudentConverted (when applicant becomes student)
  - StaffAssessmentAssigned (when review case is claimed)

- [ ] **Step 1: Find where student conversion happens** (likely in onboarding completion)

- [ ] **Step 2: Add OutboxEvent for StudentConverted** with student account details

- [ ] **Step 3: Update ReviewService.claim() to emit StaffAssessmentAssigned OutboxEvent**

- [ ] **Step 4: Run tests to verify**

---

### Task 7: Update Delivery Handler Registry Integration

**Files:**
- Modify: `development/apps/api/src/integration/delivery/index.ts` (ensure all handlers exported)
- Test: Integration test

**Interfaces:**
- Consumes: All delivery handlers
- Produces: Proper auto-registration of all handlers

- [ ] **Step 1: Verify all handlers are properly exported and auto-registered**

- [ ] **Step 2: Add integration test for full delivery flow**

---

### Task 8: End-to-End Integration Tests

**Files:**
- Create: `development/apps/api/src/integration/outbox-delivery.e2e.spec.ts`

**Interfaces:**
- Consumes: All above services
- Produces: E2E test coverage

- [ ] **Step 1: Write E2E test for ApplicationSubmitted → email delivery**

- [ ] **Step 2: Write E2E test for ClarificationRequested → email + internal delivery**

- [ ] **Step 3: Write E2E test for retry with exponential backoff**

- [ ] **Step 4: Write E2E test for dead-letter → operations queue → manual retry**

- [ ] **Step 5: Run all tests**

```bash
npm test -- --testPathPattern=integration
Expected: ALL PASS
```