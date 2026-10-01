-- CreateTable
CREATE TABLE "RecoverySuspicion" (
    "id" TEXT NOT NULL,
    "recoveryTokenId" TEXT,
    "accountId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "signalDetails" JSONB NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewDecision" TEXT,
    "reviewNote" TEXT,

    CONSTRAINT "RecoverySuspicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryReviewQueue" (
    "id" TEXT NOT NULL,
    "suspicionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'HIGH',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "decision" TEXT,
    "decisionReason" TEXT,

    CONSTRAINT "RecoveryReviewQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecoverySuspicion_accountId_status_idx" ON "RecoverySuspicion"("accountId", "status");

-- CreateIndex
CREATE INDEX "RecoverySuspicion_recoveryTokenId_idx" ON "RecoverySuspicion"("recoveryTokenId");

-- CreateIndex
CREATE INDEX "RecoverySuspicion_createdAt_idx" ON "RecoverySuspicion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryReviewQueue_suspicionId_key" ON "RecoveryReviewQueue"("suspicionId");

-- CreateIndex
CREATE INDEX "RecoveryReviewQueue_accountId_status_idx" ON "RecoveryReviewQueue"("accountId", "status");

-- CreateIndex
CREATE INDEX "RecoveryReviewQueue_status_priority_createdAt_idx" ON "RecoveryReviewQueue"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "RecoveryReviewQueue_assignedTo_status_idx" ON "RecoveryReviewQueue"("assignedTo", "status");

-- AddForeignKey
ALTER TABLE "RecoverySuspicion" ADD CONSTRAINT "RecoverySuspicion_recoveryTokenId_fkey" FOREIGN KEY ("recoveryTokenId") REFERENCES "RecoveryToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoverySuspicion" ADD CONSTRAINT "RecoverySuspicion_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryReviewQueue" ADD CONSTRAINT "RecoveryReviewQueue_suspicionId_fkey" FOREIGN KEY ("suspicionId") REFERENCES "RecoverySuspicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryReviewQueue" ADD CONSTRAINT "RecoveryReviewQueue_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
