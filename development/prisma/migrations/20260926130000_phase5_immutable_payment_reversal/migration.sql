CREATE TABLE "FinancePaymentReversal" (
  "id" TEXT NOT NULL,
  "originalTransactionId" TEXT NOT NULL,
  "reversalTransactionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancePaymentReversal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinancePaymentReversal_originalTransactionId_key" ON "FinancePaymentReversal"("originalTransactionId");
CREATE UNIQUE INDEX "FinancePaymentReversal_reversalTransactionId_key" ON "FinancePaymentReversal"("reversalTransactionId");
ALTER TABLE "FinancePaymentReversal" ADD CONSTRAINT "FinancePaymentReversal_originalTransactionId_fkey" FOREIGN KEY ("originalTransactionId") REFERENCES "FinancePaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancePaymentReversal" ADD CONSTRAINT "FinancePaymentReversal_reversalTransactionId_fkey" FOREIGN KEY ("reversalTransactionId") REFERENCES "FinancePaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
