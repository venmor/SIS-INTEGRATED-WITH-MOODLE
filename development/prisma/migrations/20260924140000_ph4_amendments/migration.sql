-- TASK-PH4-006: registration amendments and waitlist skeleton. Snapshots stay
-- immutable; changes are versioned amendment rows with reason, evidence
-- note and authority. Roster rows flip status, never delete. Waitlist
-- entries expire per policy and revalidate fully on accept.
CREATE TABLE "RegistrationAmendment" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedByAccountId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistrationAmendment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegistrationAmendment_registration_status_idx" ON "RegistrationAmendment"("registrationId", "status");

ALTER TABLE "RegistrationAmendment" ADD CONSTRAINT "RegistrationAmendment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "InstitutionalRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistrationAmendment" ADD CONSTRAINT "RegistrationAmendment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaitlistEntry_attempt_period_course_key" ON "WaitlistEntry"("attemptId", "periodId", "courseId");
CREATE INDEX "WaitlistEntry_course_status_idx" ON "WaitlistEntry"("courseId", "status");

ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
