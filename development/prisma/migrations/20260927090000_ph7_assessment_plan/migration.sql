-- TASK-PH7-001: assessment scheme and grade-activity mapping plan.
-- Versioned scheme registry per offering+period (DRAFT→APPROVED, supersede
-- never edit; one APPROVED plan per offering+period). Grade-activity
-- mappings bind one Moodle activity to one approved component (both SIS +
-- Moodle identifiers; DRAFT→TESTED→ACTIVE, activation four-eyes, single
-- ACTIVE per component). Partial uniques admit a single APPROVED/ACTIVE row
-- (Prisma cannot express them; same hand-maintained pattern as
-- ReviewRecommendation). ASSESSMENT-DEMO-v1 is fictional (SUP-009).
CREATE TABLE "AssessmentPlan" (
    "id" TEXT NOT NULL,
    "offeringRef" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "policyVersion" TEXT NOT NULL,
    "createdByAccountId" TEXT NOT NULL,
    "approvedByAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    CONSTRAINT "AssessmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentPlan_offering_period_version_key" ON "AssessmentPlan"("offeringRef", "periodCode", "version");
CREATE UNIQUE INDEX "AssessmentPlan_approved_key" ON "AssessmentPlan"("offeringRef", "periodCode") WHERE "status" = 'APPROVED';
CREATE INDEX "AssessmentPlan_offering_period_status_idx" ON "AssessmentPlan"("offeringRef", "periodCode", "status");

CREATE TABLE "AssessmentComponent" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "maxMark" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "scaleRef" TEXT NOT NULL DEFAULT '0-100',
    "moderationRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentComponent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentComponent_plan_code_key" ON "AssessmentComponent"("planId", "code");
CREATE INDEX "AssessmentComponent_plan_status_idx" ON "AssessmentComponent"("planId", "status");

CREATE TABLE "GradeActivityMapping" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "moodleActivityId" TEXT NOT NULL,
    "moodleCourseRef" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByAccountId" TEXT NOT NULL,
    "activatedByAccountId" TEXT,
    "testResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GradeActivityMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GradeActivityMapping_component_version_key" ON "GradeActivityMapping"("componentId", "version");
CREATE UNIQUE INDEX "GradeActivityMapping_active_key" ON "GradeActivityMapping"("componentId") WHERE "status" = 'ACTIVE';
CREATE INDEX "GradeActivityMapping_component_status_idx" ON "GradeActivityMapping"("componentId", "status");

ALTER TABLE "AssessmentComponent" ADD CONSTRAINT "AssessmentComponent_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AssessmentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GradeActivityMapping" ADD CONSTRAINT "GradeActivityMapping_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "AssessmentComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
