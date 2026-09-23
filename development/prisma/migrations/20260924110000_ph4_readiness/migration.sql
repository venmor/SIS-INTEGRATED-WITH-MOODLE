-- TASK-PH4-003: holds and finance clearance reads. Holds block registration
-- with office + reason; clearance rows carry status + expiry written by the
-- Phase 5 finance ledger (fixtures insert them in tests until then).
CREATE TABLE "Hold" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "holdType" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "office" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    CONSTRAINT "Hold_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Hold_student_status_idx" ON "Hold"("studentId", "status");

ALTER TABLE "Hold" ADD CONSTRAINT "Hold_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FinanceClearance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_ASSESSED',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceClearance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceClearance_student_period_key" ON "FinanceClearance"("studentId", "periodId");
CREATE INDEX "FinanceClearance_student_status_idx" ON "FinanceClearance"("studentId", "status");

ALTER TABLE "FinanceClearance" ADD CONSTRAINT "FinanceClearance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
