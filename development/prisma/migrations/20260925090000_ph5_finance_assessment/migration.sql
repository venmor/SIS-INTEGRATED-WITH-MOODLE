-- TASK-PH5-001: versioned fee assessment tables. One finance account per
-- student; invoices group immutable posted charge lines per period. Money
-- is integer minor units + currency, never floating point. Posted lines are
-- never edited; reversals arrive as new rows in later slices.
CREATE SEQUENCE IF NOT EXISTS "InvoiceNumberSeq" START WITH 1 INCREMENT BY 1;

CREATE TABLE "FinanceAccount" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceAccount_studentId_key" ON "FinanceAccount"("studentId");

ALTER TABLE "FinanceAccount" ADD CONSTRAINT "FinanceAccount_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FinanceInvoice" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceInvoice_reference_key" ON "FinanceInvoice"("reference");
CREATE UNIQUE INDEX "FinanceInvoice_account_period_key" ON "FinanceInvoice"("accountId", "periodId");
CREATE INDEX "FinanceInvoice_account_status_idx" ON "FinanceInvoice"("accountId", "status");

ALTER TABLE "FinanceInvoice" ADD CONSTRAINT "FinanceInvoice_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceInvoice" ADD CONSTRAINT "FinanceInvoice_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FinanceChargeLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "courseId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "feeRule" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "inputs" JSONB,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceChargeLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceChargeLine_invoice_status_idx" ON "FinanceChargeLine"("invoiceId", "status");

ALTER TABLE "FinanceChargeLine" ADD CONSTRAINT "FinanceChargeLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "FinanceInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceChargeLine" ADD CONSTRAINT "FinanceChargeLine_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
