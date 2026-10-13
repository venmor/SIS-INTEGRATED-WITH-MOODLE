# Task 1.6 Implementation Plan: Delivery & Later Workflows - Outbox Delivery Worker

## Overview
Implement outbox delivery worker for reliable event delivery, plus notification templates for applicant workflows.

## Files to Create/Modify

### 1. Notification Templates Config
- `packages/config/src/notifications.ts` (new) - Notification template definitions
- `packages/config/src/index.ts` (modify) - Export notification templates

### 2. Delivery Handlers
- `apps/api/src/integration/delivery/webhook-delivery.handler.ts` (new)
- `apps/api/src/integration/delivery/email-delivery.handler.ts` (new)
- `apps/api/src/integration/delivery/sms-delivery.handler.ts` (new)
- `apps/api/src/integration/delivery/internal-delivery.handler.ts` (new)
- `apps/api/src/integration/delivery/delivery.handler.ts` (new) - Base interface/factory
- `apps/api/src/integration/delivery/index.ts` (new) - Barrel export

### 3. Outbox Delivery Worker
- `apps/api/src/integration/outbox-delivery.worker.ts` (new) - Cron-based delivery worker

### 4. Integration Module Updates
- `apps/api/src/integration/integration.module.ts` (modify) - Register new worker and handlers

### 5. Operations Queue Web UI
- `apps/web/app/admin/integration/operations-queue/page.tsx` (new) - List failed deliveries
- `apps/web/app/admin/integration/operations-queue/[id]/page.tsx` (new) - Detail view with actions

### 6. Tests
- `apps/api/src/integration/outbox-delivery.worker.spec.ts` (new)
- `apps/api/src/integration/delivery/webhook-delivery.handler.spec.ts` (new)
- `apps/api/src/integration/delivery/email-delivery.handler.spec.ts` (new)
- `apps/api/src/integration/delivery/sms-delivery.handler.spec.ts` (new)
- `apps/api/src/integration/delivery/internal-delivery.handler.spec.ts` (new)

## Implementation Details

### 1. Notification Templates (packages/config/src/notifications.ts)
Define templates for:
- APPLICATION_SUBMITTED - to applicant
- CLARIFICATION_REQUESTED - to applicant
- CORRECTION_REQUESTED - to applicant
- DECISION_RELEASED - to applicant
- OFFER_RELEASED - to applicant
- WITHDRAWAL_CONFIRMED - to applicant
- STAFF_ASSESSMENT_ASSIGNED - to admissions officer
- STUDENT_CONVERSION - to new student

Each template has: subject, body (text/html), channel (email/sms/internal), required variables

### 2. Delivery Handlers
Common interface:
```typescript
interface DeliveryHandler {
  deliver(event: OutboxEvent, payload: any): Promise<DeliveryResult>;
  supports(eventType: string): boolean;
}
```

- **WebhookDeliveryHandler**: POST to configured URL with HMAC-SHA256 signature
- **EmailDeliveryHandler**: Via SMTP/SendGrid, template-based rendering
- **SmsDeliveryHandler**: Via Twilio, template-based rendering
- **InternalDeliveryHandler**: Create in-system Notification entity

### 3. OutboxDeliveryWorker
- Cron job every 30 seconds using @nestjs/schedule
- Batch fetch unprocessed events (limit 100)
- For each event: determine delivery target from event type/payload
- Deliver with retry/backoff (max 3 attempts, exponential backoff)
- Idempotency: use idempotencyKey from event payload
- On success: mark OutboxEvent.deliveredAt, record IntegrationDeliveryAttempt success
- On failure: increment attempts, schedule retry, after max → IntegrationIncident

### 4. Reconciliation Job
- Scheduled job to detect stuck events (created > 1hr, not processed)
- Create IntegrationIncident for stuck events

### 5. Operations Queue Web UI
- List failed deliveries (IntegrationDeliveryAttempt with state=FAILED/DEAD_LETTER/MANUAL_REVIEW)
- Show event payload, error, retry count
- Actions: Retry, View Event, Mark Resolved

## Test Strategy
- Unit tests for each delivery handler (mock external providers)
- Integration test for worker processing events
- Test idempotency preservation
- Test retry/backoff behavior
- Test reconciliation detection

## Dependencies
- @nestjs/schedule (already installed)
- crypto for HMAC (built-in)
- Environment variables for provider configs (SMTP, Twilio, webhook URLs)