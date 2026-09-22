-- TASK-PH3-006: offer acceptance and onboarding handoff (no conversion).
-- acceptBy makes the offer acceptance deadline explicit; legacy rows keep
-- NULL and are treated as already closed for new acceptances. The offer
-- response is write-once per application; onboarding tasks track applicant-
-- vs institution-owned work without creating any student record.
ALTER TABLE "ApplicationDecision" ADD COLUMN "acceptBy" TIMESTAMP(3);

CREATE TABLE "ApplicationOfferResponse" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "receipt" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationOfferResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApplicationOfferResponse_applicationId_key" ON "ApplicationOfferResponse"("applicationId");

ALTER TABLE "ApplicationOfferResponse" ADD CONSTRAINT "ApplicationOfferResponse_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OnboardingTask" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingTask_application_task_key" ON "OnboardingTask"("applicationId", "taskKey");
CREATE INDEX "OnboardingTask_application_status_idx" ON "OnboardingTask"("applicationId", "status");

ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
