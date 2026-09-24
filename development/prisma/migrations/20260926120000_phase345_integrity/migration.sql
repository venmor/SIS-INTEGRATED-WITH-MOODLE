CREATE TABLE "ApplicationDecisionRevision" (
  "id" TEXT NOT NULL,
  "decisionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "outcome" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "conditions" JSONB,
  "acceptBy" TIMESTAMP(3),
  "reason" TEXT NOT NULL,
  "actorAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationDecisionRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApplicationDecisionRevision_decisionId_version_key" ON "ApplicationDecisionRevision"("decisionId", "version");
ALTER TABLE "ApplicationDecisionRevision" ADD CONSTRAINT "ApplicationDecisionRevision_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "ApplicationDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing demo decisions become the first retained version. No unknown actor
-- is invented; the existing audit remains the authority for that history.
INSERT INTO "ApplicationDecisionRevision" ("id", "decisionId", "version", "outcome", "message", "conditions", "acceptBy", "reason", "actorAccountId", "createdAt")
SELECT gen_random_uuid()::text, "id", "version", "outcome", "message", "conditions", "acceptBy", 'MIGRATED_CURRENT_TERMS', NULL, "decidedAt"
FROM "ApplicationDecision";

CREATE TABLE "FinanceAllocationReversal" (
  "id" TEXT NOT NULL,
  "allocationId" TEXT NOT NULL,
  "providerRef" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceAllocationReversal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinanceAllocationReversal_allocationId_key" ON "FinanceAllocationReversal"("allocationId");
ALTER TABLE "FinanceAllocationReversal" ADD CONSTRAINT "FinanceAllocationReversal_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "FinanceAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
