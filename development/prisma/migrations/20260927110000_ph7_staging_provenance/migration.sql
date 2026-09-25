-- TASK-PH7-002: frozen DS5 §4 provenance snapshot on grade staging.
-- Batches freeze the source and SIS coordinates in force at stage time
-- (Moodle instance/course/activity, offering/period/component, plan and
-- policy versions, source response), so later supersedes never rewrite the
-- snapshot. Lines record the resolved SIS identity (student or account;
-- null stays MOODLE_ONLY evidence) and the applied conversion formula.
-- ASSESSMENT-DEMO-v1 / MOODLE-SIM-v1 are fictional (SUP-009, GAP-022).
ALTER TABLE "GradeBatch" ADD COLUMN "moodleInstance" TEXT NOT NULL DEFAULT 'MOODLE-SIM-v1';
ALTER TABLE "GradeBatch" ADD COLUMN "moodleCourseRef" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GradeBatch" ADD COLUMN "moodleActivityId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GradeBatch" ADD COLUMN "offeringRef" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GradeBatch" ADD COLUMN "periodCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GradeBatch" ADD COLUMN "componentCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "GradeBatch" ADD COLUMN "planVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "GradeBatch" ADD COLUMN "policyVersion" TEXT NOT NULL DEFAULT 'ASSESSMENT-DEMO-v1';
ALTER TABLE "GradeBatch" ADD COLUMN "sourceResponse" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "GradeLine" ADD COLUMN "resolvedStudentId" TEXT;
ALTER TABLE "GradeLine" ADD COLUMN "resolvedAccountId" TEXT;
ALTER TABLE "GradeLine" ADD COLUMN "conversionFormula" TEXT;
ALTER TABLE "GradeLine" ADD CONSTRAINT "GradeLine_resolvedStudentId_fkey" FOREIGN KEY ("resolvedStudentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GradeLine" ADD CONSTRAINT "GradeLine_resolvedAccountId_fkey" FOREIGN KEY ("resolvedAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "GradeLine_resolvedStudentId_idx" ON "GradeLine"("resolvedStudentId");
