-- TASK-PH5-004: callback normalization and reconciliation cases. Callbacks
-- are tracked by provider nonce; mismatches and unknown references open
-- cases instead of moving money. Cases preserve source evidence.
CREATE TABLE "FinanceCallback" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceCallback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceCallback_provider_nonce_key" ON "FinanceCallback"("provider", "nonce");
CREATE INDEX "FinanceCallback_provider_ref_idx" ON "FinanceCallback"("provider", "providerRef");

CREATE TABLE "FinanceReconciliationCase" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "requestId" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "providerRef" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "FinanceReconciliationCase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceReconciliationCase_status_created_idx" ON "FinanceReconciliationCase"("status", "createdAt");
CREATE INDEX "FinanceReconciliationCase_account_status_idx" ON "FinanceReconciliationCase"("accountId", "status");

ALTER TABLE "FinanceReconciliationCase" ADD CONSTRAINT "FinanceReconciliationCase_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
