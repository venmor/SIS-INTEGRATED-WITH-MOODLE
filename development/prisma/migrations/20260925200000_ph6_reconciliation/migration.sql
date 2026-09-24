-- TASK-PH6-006: reconciliation runs and cases. Runs compare SIS
-- expected against simulator actual; safe diffs auto-repair by
-- requeueing delivery, everything else opens governed cases.
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'FULL',
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "summary" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReconciliationRun_status_started_idx" ON "ReconciliationRun"("status", "startedAt");

CREATE TABLE "ReconciliationCase" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "studentId" TEXT,
    "shellId" TEXT,
    "detail" JSONB,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReconciliationCase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReconciliationCase_status_kind_idx" ON "ReconciliationCase"("status", "kind");
CREATE INDEX "ReconciliationCase_student_status_idx" ON "ReconciliationCase"("studentId", "status");

ALTER TABLE "ReconciliationCase" ADD CONSTRAINT "ReconciliationCase_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
