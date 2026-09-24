-- TASK-PH6-004: maintenance windows. Scheduled through approved
-- change; the worker defers deliveries inside an active window and
-- health reports MAINTENANCE. Windows are never edited.
CREATE TABLE "MoodleMaintenance" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "creatorAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MoodleMaintenance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MoodleMaintenance_status_starts_idx" ON "MoodleMaintenance"("status", "startsAt");
