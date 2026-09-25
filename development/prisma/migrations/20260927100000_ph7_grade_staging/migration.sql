-- TASK-PH7-002: Moodle grade staging snapshot.
-- Immutable grade batches per ACTIVE mapping + source revision (one batch
-- per mapping+revision; resource-idempotent replay returns stored batch).
-- Grade lines carry the 11 DS5 §4 provenance fields; per-line quarantine
-- flags (OUT_OF_RANGE, DUPLICATE, STRUCTURALLY_INVALID, MOODLE_ONLY)
-- isolate invalid lines while preserving valid ones (TEST-REC-003).
-- Staging never makes results official (ACT-ASM-001, REQ-LRN-005).
-- ASSESSMENT-DEMO-v1 is fictional (SUP-009).
CREATE TABLE "GradeBatch" (
    "id" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "sourceRevision" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GradeBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GradeBatch_mapping_revision_key" ON "GradeBatch"("mappingId", "sourceRevision");
CREATE INDEX "GradeBatch_mapping_status_idx" ON "GradeBatch"("mappingId", "status");

CREATE TABLE "GradeLine" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentRef" TEXT NOT NULL,
    "rawValue" DOUBLE PRECISION,
    "outcome" TEXT NOT NULL DEFAULT 'MARK_RECORDED',
    "convertedValue" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'STAGED',
    "flagCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GradeLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GradeLine_batch_student_key" ON "GradeLine"("batchId", "studentRef");
CREATE INDEX "GradeLine_batch_status_idx" ON "GradeLine"("batchId", "status");

ALTER TABLE "GradeBatch" ADD CONSTRAINT "GradeBatch_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "GradeActivityMapping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GradeLine" ADD CONSTRAINT "GradeLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "GradeBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
