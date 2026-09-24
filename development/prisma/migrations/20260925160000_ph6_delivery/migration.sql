-- TASK-PH6-002: delivery attempts. The outbox stays an immutable log;
-- each delivery attempt tracks state, retries and errors here.
-- Envelopes travel inside outbox payloads (registration writes).
CREATE TABLE "IntegrationDeliveryAttempt" (
    "id" TEXT NOT NULL,
    "outboxId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrationDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntegrationDeliveryAttempt_state_next_idx" ON "IntegrationDeliveryAttempt"("state", "nextRunAt");
CREATE INDEX "IntegrationDeliveryAttempt_outbox_idx" ON "IntegrationDeliveryAttempt"("outboxId");

ALTER TABLE "IntegrationDeliveryAttempt" ADD CONSTRAINT "IntegrationDeliveryAttempt_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES "OutboxEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
