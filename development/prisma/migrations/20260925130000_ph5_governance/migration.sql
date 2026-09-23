-- TASK-PH5-006: finance governance tables. Adjustments (credit/waiver/
-- refund) follow request → threshold approval with maker/checker
-- separation; approved credits post compensating lines. Arrangements are
-- student-requested, approver-decided entitlements consumed by clearance.
CREATE TABLE "FinanceAdjustment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "reason" TEXT NOT NULL,
    "evidenceNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "policyVersion" TEXT NOT NULL,
    "requesterAccountId" TEXT NOT NULL,
    "deciderAccountId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "payoutReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceAdjustment_account_status_idx" ON "FinanceAdjustment"("accountId", "status");

ALTER TABLE "FinanceAdjustment" ADD CONSTRAINT "FinanceAdjustment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceAdjustment" ADD CONSTRAINT "FinanceAdjustment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FinanceArrangement" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "terms" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "policyVersion" TEXT NOT NULL,
    "requesterAccountId" TEXT NOT NULL,
    "deciderAccountId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceArrangement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceArrangement_account_status_idx" ON "FinanceArrangement"("accountId", "status");

ALTER TABLE "FinanceArrangement" ADD CONSTRAINT "FinanceArrangement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceArrangement" ADD CONSTRAINT "FinanceArrangement_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
