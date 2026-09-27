-- TASK-PH7-006: official result release (slice 6). Immutable official
-- course results, one per student per package version; re-release
-- converges on the stored rows, later packages release independently
-- (slice-7 amendment supersedes, never edits). Demo values only
-- (SUP-009, GAP-022).
CREATE TABLE "OfficialCourseResult" (
    "id" TEXT NOT NULL,
    "offeringRef" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "studentRef" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'PASS',
    "trace" JSONB NOT NULL DEFAULT '{}',
    "packageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'RELEASED',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfficialCourseResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfficialCourseResult_scope_student_version_key" ON "OfficialCourseResult"("offeringRef", "periodCode", "studentRef", "version");
CREATE INDEX "OfficialCourseResult_package_idx" ON "OfficialCourseResult"("packageId");
CREATE INDEX "OfficialCourseResult_student_status_idx" ON "OfficialCourseResult"("studentRef", "status");
