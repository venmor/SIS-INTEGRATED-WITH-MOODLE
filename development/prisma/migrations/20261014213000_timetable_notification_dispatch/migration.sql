CREATE TABLE "TimetableNotificationDispatch" (
  "eventId" TEXT NOT NULL PRIMARY KEY,
  "publicationId" TEXT,
  "policyVersion" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'PENDING',
  "lastAccountId" TEXT,
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "notificationCount" INTEGER NOT NULL DEFAULT 0,
  "failureCode" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimetableNotificationDispatch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "OutboxEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TimetableNotificationDispatch_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "TimetableDemoPublication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TimetableNotificationDispatch_state_check" CHECK ("state" IN ('PENDING', 'COMPLETE', 'BLOCKED')),
  CONSTRAINT "TimetableNotificationDispatch_counts_check" CHECK ("recipientCount" >= 0 AND "notificationCount" >= 0)
);
CREATE INDEX "TimetableNotificationDispatch_state_createdAt_idx" ON "TimetableNotificationDispatch"("state", "createdAt");
CREATE INDEX "TimetableNotificationDispatch_publicationId_idx" ON "TimetableNotificationDispatch"("publicationId");
CREATE INDEX "OutboxEvent_type_aggregate_occurredAt_idx" ON "OutboxEvent"("type", "aggregate", "occurredAt");
