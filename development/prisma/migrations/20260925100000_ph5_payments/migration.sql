-- TASK-PH5-003: payment initiation and simulator staging tables. Requests
-- carry idempotency references; uncertain requests block re-initiation.
-- Simulator transactions are staged provider evidence, never confirmation.
CREATE SEQUENCE IF NOT EXISTS "PayNumberSeq" START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS "ProviderRefSeq" START WITH 1 INCREMENT BY 1;

CREATE TABLE "FinancePaymentRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_CONFIRMATION',
    "idempotencyKey" TEXT NOT NULL,
    "simulatorScenario" TEXT,
    "payerReference" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancePaymentRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancePaymentRequest_reference_key" ON "FinancePaymentRequest"("reference");
CREATE UNIQUE INDEX "FinancePaymentRequest_idempotencyKey_key" ON "FinancePaymentRequest"("idempotencyKey");
CREATE INDEX "FinancePaymentRequest_account_status_idx" ON "FinancePaymentRequest"("accountId", "status");
CREATE INDEX "FinancePaymentRequest_invoice_status_idx" ON "FinancePaymentRequest"("invoiceId", "status");

ALTER TABLE "FinancePaymentRequest" ADD CONSTRAINT "FinancePaymentRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancePaymentRequest" ADD CONSTRAINT "FinancePaymentRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "FinanceInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FinancePaymentTransaction" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "accountId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STAGED',
    "signatureValid" BOOLEAN,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancePaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancePaymentTransaction_providerRef_key" ON "FinancePaymentTransaction"("providerRef");
CREATE INDEX "FinancePaymentTransaction_account_status_idx" ON "FinancePaymentTransaction"("accountId", "status");

ALTER TABLE "FinancePaymentTransaction" ADD CONSTRAINT "FinancePaymentTransaction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FinancePaymentRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancePaymentTransaction" ADD CONSTRAINT "FinancePaymentTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
