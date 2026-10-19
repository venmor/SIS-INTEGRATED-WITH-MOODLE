CREATE TABLE "MoodleLiveDeliveryClaim" (
 "id" TEXT PRIMARY KEY, "runId" TEXT NOT NULL REFERENCES "MoodleLiveTestRun"("id") ON DELETE RESTRICT,
 "outboxId" TEXT NOT NULL REFERENCES "OutboxEvent"("id") ON DELETE RESTRICT,
 "courseRegistrationId" TEXT NOT NULL REFERENCES "CourseRegistration"("id") ON DELETE RESTRICT,
 "mappingId" TEXT NOT NULL REFERENCES "MoodleMapping"("id") ON DELETE RESTRICT,
 "mappingVersion" INTEGER NOT NULL CHECK ("mappingVersion" > 0), "sourceChecksum" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'DELIVERING' CHECK ("state" IN ('DELIVERING','RETRY','DELIVERED','MANUAL_REVIEW')),
 "leaseToken" TEXT NOT NULL, "leaseUntil" TIMESTAMP(3) NOT NULL, "attempt" INTEGER NOT NULL DEFAULT 1,
 "nextRunAt" TIMESTAMP(3), "moodleUserId" INTEGER, "evidenceChecksum" TEXT, "lastCode" TEXT,
 "deliveredAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "MoodleLiveDeliveryClaim_outboxId_courseRegistrationId_key" ON "MoodleLiveDeliveryClaim"("outboxId","courseRegistrationId");
CREATE INDEX "MoodleLiveDeliveryClaim_state_leaseUntil_idx" ON "MoodleLiveDeliveryClaim"("state","leaseUntil");
