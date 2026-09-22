-- TASK-PH3-004: eligibility and recommendation package. One ACTIVE row per
-- application; superseded versions stay as history. The partial unique index
-- admits a single ACTIVE row (Prisma cannot express it; same hand-maintained
-- pattern as ReviewAssignment). createdByAccountId supports the slice-5
-- self-approval check. Recommendations never modify applicant data.
CREATE TABLE "ReviewRecommendation" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "eligibilityOutcome" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "criteriaVersion" TEXT NOT NULL,
    "criteria" JSONB,
    "rationale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdByAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    CONSTRAINT "ReviewRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewRecommendation_active_key" ON "ReviewRecommendation"("applicationId") WHERE "status" = 'ACTIVE';
CREATE INDEX "ReviewRecommendation_application_status_idx" ON "ReviewRecommendation"("applicationId", "status");

ALTER TABLE "ReviewRecommendation" ADD CONSTRAINT "ReviewRecommendation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
