-- TASK-PH7-004: lecturer correction and moderation handoff (slice 4).
-- Validated batches submit for moderation with a recorded declaration;
-- moderation cases move SUBMITTED→UNDER_MODERATION→APPROVED/RETURNED/
-- CLARIFICATION_REQUESTED/REFERRED with version checks (moderator never
-- the stager). Approval locks the batch and writes immutable official CA
-- records (one per student+component, versioned, supersede on
-- re-moderation). Corrections stage new revisions; history is preserved.
-- The candidate list carries expected participants per offering+period
-- (seed-managed demo; Registry owns it in production). Demo values only
-- (SUP-009, GAP-022).
ALTER TABLE "GradeBatch" ADD COLUMN "lockedAt" TIMESTAMP(3);

CREATE TABLE "AssessmentCandidateList" (
    "id" TEXT NOT NULL,
    "offeringRef" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "studentRefs" TEXT[] NOT NULL DEFAULT '{}',
    "createdByAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentCandidateList_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentCandidateList_offering_period_version_key" ON "AssessmentCandidateList"("offeringRef", "periodCode", "version");
CREATE UNIQUE INDEX "AssessmentCandidateList_active_key" ON "AssessmentCandidateList"("offeringRef", "periodCode") WHERE "status" = 'ACTIVE';
CREATE INDEX "AssessmentCandidateList_offering_period_status_idx" ON "AssessmentCandidateList"("offeringRef", "periodCode", "status");

CREATE TABLE "ModerationCase" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "declaration" TEXT NOT NULL,
    "submittedByAccountId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewerAccountId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decidedByAccountId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModerationCase_batch_key" ON "ModerationCase"("batchId");
CREATE INDEX "ModerationCase_status_idx" ON "ModerationCase"("status");

ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "GradeBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OfficialCARecord" (
    "id" TEXT NOT NULL,
    "offeringRef" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "componentCode" TEXT NOT NULL,
    "planVersion" INTEGER NOT NULL DEFAULT 1,
    "studentRef" TEXT NOT NULL,
    "resolvedStudentId" TEXT,
    "mark" DOUBLE PRECISION,
    "outcome" TEXT NOT NULL DEFAULT 'MARK_RECORDED',
    "policyVersion" TEXT NOT NULL DEFAULT 'ASSESSMENT-DEMO-v1',
    "caseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfficialCARecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfficialCARecord_scope_student_version_key" ON "OfficialCARecord"("offeringRef", "periodCode", "componentCode", "studentRef", "version");
CREATE INDEX "OfficialCARecord_scope_status_idx" ON "OfficialCARecord"("offeringRef", "periodCode", "componentCode", "status");

ALTER TABLE "OfficialCARecord" ADD CONSTRAINT "OfficialCARecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ModerationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
