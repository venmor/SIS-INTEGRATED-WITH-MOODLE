-- TASK-PH7-007: result amendment skeleton (slice 7). Controlled
-- post-release correction cases on RELEASED official results; approval
-- writes a NEW immutable OfficialCourseResult version (supersede link
-- in trace, never edits history) + an academic-impact stub task
-- (progression recalculation queue per DS5 section 18). Demo values
-- only (SUP-009, GAP-022).
CREATE TABLE "ResultAmendmentCase" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL REFERENCES "ResultPackage"("id") ON DELETE RESTRICT,
    "offeringRef" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "studentRef" TEXT NOT NULL,
    "supersedesId" TEXT REFERENCES "OfficialCourseResult"("id") ON DELETE RESTRICT,
    "correctedTotal" DOUBLE PRECISION NOT NULL,
    "correctedOutcome" TEXT NOT NULL DEFAULT 'PASS',
    "reason" TEXT NOT NULL,
    "evidence" TEXT,
    "declaration" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "requestedByAccountId" TEXT NOT NULL,
    "decidedByAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    CONSTRAINT "ResultAmendmentCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResultAmendmentCase_package_student_version_key" ON "ResultAmendmentCase"("packageId", "studentRef", "version");
CREATE INDEX "ResultAmendmentCase_package_idx" ON "ResultAmendmentCase"("packageId");
CREATE INDEX "ResultAmendmentCase_student_status_idx" ON "ResultAmendmentCase"("studentRef", "status");

CREATE TABLE "AcademicImpactTask" (
    "id" TEXT NOT NULL,
    "amendmentCaseId" TEXT NOT NULL REFERENCES "ResultAmendmentCase"("id") ON DELETE RESTRICT,
    "studentRef" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PROGRESSION_RECALC',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "detail" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcademicImpactTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AcademicImpactTask_case_idx" ON "AcademicImpactTask"("amendmentCaseId");
CREATE INDEX "AcademicImpactTask_student_status_idx" ON "AcademicImpactTask"("studentRef", "status");
