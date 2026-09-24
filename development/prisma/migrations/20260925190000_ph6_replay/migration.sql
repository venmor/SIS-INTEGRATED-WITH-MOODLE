-- TASK-PH6-005: replay decisions and incidents. Replays approve with
-- frozen evidence and a declaration under four-eyes separation.
-- Incidents close only with recovery evidence.
CREATE TABLE "ReplayDecision" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "attemptId" TEXT,
    "rangeFrom" TIMESTAMP(3),
    "rangeTo" TIMESTAMP(3),
    "evidence" JSONB NOT NULL,
    "declaration" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requesterAccountId" TEXT NOT NULL,
    "deciderAccountId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReplayDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReplayDecision_status_created_idx" ON "ReplayDecision"("status", "createdAt");

CREATE TABLE "IntegrationIncident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "ownerAccountId" TEXT,
    "detail" JSONB,
    "closureEvidence" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrationIncident_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IntegrationIncident_status_created_idx" ON "IntegrationIncident"("status", "createdAt");
