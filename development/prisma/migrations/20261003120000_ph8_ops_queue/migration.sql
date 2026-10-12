-- TASK-PH8-003: generic ops incident queue (slice 3). Cross-domain
-- incidents auto-opened convergently from dead-letters plus manual
-- operator opens. One OPEN per (sourceKind, sourceRef) structurally
-- (partial unique index). Lifecycle OPEN→ACKNOWLEDGED→RESOLVED→CLOSED
-- with recovery evidence. Demo values only (SUP-009, GAP-009).
CREATE TABLE "OpsIncident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "sourceKind" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "ownerAccountId" TEXT,
    "ownerRole" TEXT,
    "targetResponseAt" TIMESTAMP(3),
    "detail" JSONB NOT NULL DEFAULT '{}',
    "rootCause" TEXT,
    "recoveryEvidence" TEXT,
    "preventiveAction" TEXT,
    "linkedRef" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpsIncident_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpsIncident_open_source_key" ON "OpsIncident"("sourceKind", "sourceRef") WHERE status = 'OPEN';
CREATE INDEX "OpsIncident_status_idx" ON "OpsIncident"("status", "createdAt");
