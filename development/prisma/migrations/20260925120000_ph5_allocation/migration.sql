-- TASK-PH5-005: allocation, sponsorship and clearance versioning. Allocations
-- link posted payments to charge lines; balances recompute from posted
-- lines minus allocations. Sponsorship rows are written by slice 6
-- officers; clearance already consumes confirmed coverage. Clearance rows
-- carry the policy version that produced them.
ALTER TABLE "FinanceClearance" ADD COLUMN "policyVersion" TEXT;

CREATE TABLE "FinanceAllocation" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "chargeLineId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceAllocation_tx_line_key" ON "FinanceAllocation"("paymentTransactionId", "chargeLineId");
CREATE INDEX "FinanceAllocation_line_idx" ON "FinanceAllocation"("chargeLineId");
CREATE INDEX "FinanceAllocation_account_idx" ON "FinanceAllocation"("accountId");

ALTER TABLE "FinanceAllocation" ADD CONSTRAINT "FinanceAllocation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceAllocation" ADD CONSTRAINT "FinanceAllocation_tx_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "FinancePaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceAllocation" ADD CONSTRAINT "FinanceAllocation_line_fkey" FOREIGN KEY ("chargeLineId") REFERENCES "FinanceChargeLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FinanceSponsorship" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "sponsorName" TEXT NOT NULL,
    "categories" TEXT[] NOT NULL,
    "coverageType" TEXT NOT NULL,
    "coverageValue" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "evidenceNote" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "decidedByAccountId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceSponsorship_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceSponsorship_account_status_idx" ON "FinanceSponsorship"("accountId", "status");

ALTER TABLE "FinanceSponsorship" ADD CONSTRAINT "FinanceSponsorship_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceSponsorship" ADD CONSTRAINT "FinanceSponsorship_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
