-- TASK-PH8-001: notification record and delivery status (slice 1).
-- Authoritative in-system records (§16.11) with versioned templates
-- (supersede, never edit) and per-channel delivery states (§16.12).
-- Staff signals are a scoped projection over NotificationRecord, not
-- a parallel table (GAP-016 design note). Demo values only (SUP-009,
-- GAP-008).
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionLabel" TEXT,
    "office" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationTemplate_event_version_key" ON "NotificationTemplate"("event", "version");

CREATE TABLE "NotificationRecord" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL REFERENCES "NotificationTemplate"("id") ON DELETE RESTRICT,
    "templateVersion" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionPath" TEXT,
    "deadlineAt" TIMESTAMP(3),
    "office" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT FALSE,
    "recipientKind" TEXT NOT NULL,
    "recipientAccountId" TEXT,
    "recipientRole" TEXT,
    "scopeType" TEXT,
    "scopeRef" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationRecord_dedupe_key" ON "NotificationRecord"("dedupeKey");
CREATE INDEX "NotificationRecord_recipient_idx" ON "NotificationRecord"("recipientAccountId", "status");
CREATE INDEX "NotificationRecord_signal_idx" ON "NotificationRecord"("recipientRole", "scopeType", "scopeRef", "status");

CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL REFERENCES "NotificationRecord"("id") ON DELETE RESTRICT,
    "channel" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'CREATED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "providerRef" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NotificationDelivery_due_idx" ON "NotificationDelivery"("state", "nextRunAt");
CREATE INDEX "NotificationDelivery_record_idx" ON "NotificationDelivery"("recordId");
