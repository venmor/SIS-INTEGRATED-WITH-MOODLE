-- TASK-PH7-003: validation and missing-mark queue (slice 3).
-- Validation writes immutable findings per staged batch (line-level codes
-- from quarantine flags/outcomes plus batch-level UNMAPPED/STALE_MAPPING/
-- SCALE_MISMATCH); findings triage OPEN→ACKNOWLEDGED→RESOLVED/DISMISSED
-- with version checks, never edits source rows. Missing marks set the
-- batch resultState MISSING_MARKS with an owned, deadline-bound work item
-- (DS5 §17); nothing is ever stored as zero. Lanes (TECHNICAL/ACADEMIC/
-- ENROLMENT) scope queue visibility. Demo values only (SUP-009, GAP-022).
ALTER TABLE "GradeBatch" ADD COLUMN "resultState" TEXT;
ALTER TABLE "GradeBatch" ADD COLUMN "validatedAt" TIMESTAMP(3);
ALTER TABLE "GradeBatch" ADD COLUMN "validatedByAccountId" TEXT;

CREATE TABLE "GradeFinding" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "lineId" TEXT,
    "code" TEXT NOT NULL,
    "lane" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "ownerUnit" TEXT,
    "escalationDeadline" TIMESTAMP(3),
    "createdByAccountId" TEXT NOT NULL,
    "resolvedByAccountId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GradeFinding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GradeFinding_batch_status_idx" ON "GradeFinding"("batchId", "status");
CREATE INDEX "GradeFinding_status_code_idx" ON "GradeFinding"("status", "code");

ALTER TABLE "GradeFinding" ADD CONSTRAINT "GradeFinding_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "GradeBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GradeFinding" ADD CONSTRAINT "GradeFinding_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "GradeLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
