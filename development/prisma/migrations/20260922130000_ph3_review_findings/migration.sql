-- TASK-PH3-002: immutable staff review findings. Findings record what the
-- reviewer saw (completeness, mismatches, document quality, payment notes,
-- internal notes) without modifying applicant data. No update/delete path
-- exists in the API; corrections to a finding are new findings.
CREATE TABLE "ReviewFinding" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdByAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewFinding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewFinding_application_status_idx" ON "ReviewFinding"("applicationId", "status");

ALTER TABLE "ReviewFinding" ADD CONSTRAINT "ReviewFinding_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
