-- Version the synthetic request disclosure accepted by the student.
-- No request rows exist before this demo-only workflow is activated.
ALTER TABLE "AcademicSupportRequest" ADD COLUMN "noticeVersion" TEXT NOT NULL;
