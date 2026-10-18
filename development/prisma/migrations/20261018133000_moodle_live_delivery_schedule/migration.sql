CREATE TABLE "MoodleLiveDeliverySchedule" (
 "runId" TEXT PRIMARY KEY, "occurredAt" TIMESTAMP(3), "outboxId" TEXT,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
