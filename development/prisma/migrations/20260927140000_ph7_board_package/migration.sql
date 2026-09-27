-- TASK-PH7-005: board/decision package (slice 5).
-- Result packages assemble frozen inputs per offering+period (approved
-- official CA refs, weighted-total-v1 preview + trace, moderation refs,
-- candidate-list reconciliation, declarations, SHA-256 hash). Assembly is
-- blocked unless every component is moderated-approved, no OPEN MISSING
-- findings remain, and no input comes Moodle-direct. Board decisions are
-- versioned with four-eyes (decider ≠ preparer); conditions store for
-- slice-6 enforcement; deferrals re-submit as new versions. Demo values
-- only (SUP-009, GAP-022).
CREATE TABLE "ResultPackage" (
    "id" TEXT NOT NULL,
    "offeringRef" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ASSEMBLED',
    "packageHash" TEXT NOT NULL,
    "trace" JSONB NOT NULL DEFAULT '{}',
    "candidateListId" TEXT NOT NULL,
    "declaration" TEXT NOT NULL,
    "preparedByAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResultPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResultPackage_offering_period_version_key" ON "ResultPackage"("offeringRef", "periodCode", "version");
CREATE INDEX "ResultPackage_offering_period_status_idx" ON "ResultPackage"("offeringRef", "periodCode", "status");

CREATE TABLE "BoardDecision" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "to" TEXT NOT NULL,
    "reason" TEXT,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "decidedByAccountId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoardDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BoardDecision_package_version_key" ON "BoardDecision"("packageId", "version");
CREATE INDEX "BoardDecision_package_idx" ON "BoardDecision"("packageId");

ALTER TABLE "BoardDecision" ADD CONSTRAINT "BoardDecision_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ResultPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
