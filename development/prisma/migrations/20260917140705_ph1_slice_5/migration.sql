-- CreateTable
CREATE TABLE "ReviewSchedule" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "decision" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,

    CONSTRAINT "ReviewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakGlassRequest" (
    "id" TEXT NOT NULL,
    "requestorId" TEXT NOT NULL,
    "incidentRef" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "BreakGlassRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpiryWarning" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "warnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "ExpiryWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpiryDaemonState" (
    "id" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExpiryDaemonState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewSchedule_nextDueAt_status_idx" ON "ReviewSchedule"("nextDueAt", "status");

-- CreateIndex
CREATE INDEX "BreakGlassRequest_expiresAt_status_idx" ON "BreakGlassRequest"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "ExpiryWarning_assignmentId_acknowledgedAt_idx" ON "ExpiryWarning"("assignmentId", "acknowledgedAt");
