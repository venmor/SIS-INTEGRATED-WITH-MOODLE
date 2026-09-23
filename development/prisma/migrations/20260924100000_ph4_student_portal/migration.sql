-- TASK-PH4-001: academic periods and student correction requests. Periods
-- bound registration windows; correction rows preserve request history and
-- never silently overwrite the person record (application is an audited
-- update with old/new values).
CREATE TABLE "AcademicPeriod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "registrationOpen" TIMESTAMP(3),
    "registrationClose" TIMESTAMP(3),
    "addDropClose" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcademicPeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademicPeriod_code_key" ON "AcademicPeriod"("code");
CREATE INDEX "AcademicPeriod_status_code_idx" ON "AcademicPeriod"("status", "code");

CREATE TABLE "StudentCorrectionRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "requestedValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedByAccountId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentCorrectionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentCorrectionRequest_student_status_idx" ON "StudentCorrectionRequest"("studentId", "status");

ALTER TABLE "StudentCorrectionRequest" ADD CONSTRAINT "StudentCorrectionRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
