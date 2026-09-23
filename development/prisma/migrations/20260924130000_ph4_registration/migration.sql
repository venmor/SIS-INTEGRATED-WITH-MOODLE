-- TASK-PH4-005: formal registration tables. One immutable registration per
-- attempt+period with a write-once JSON snapshot and a unique human-readable
-- receipt; roster rows enrol courses. Later changes are amendments (slice 6);
-- Moodle delivery runs off the outbox event and never reverses confirmation.
CREATE SEQUENCE IF NOT EXISTS "RegistrationNumberSeq" START WITH 1 INCREMENT BY 1;

CREATE TABLE "InstitutionalRegistration" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "snapshot" JSONB NOT NULL,
    "receipt" TEXT NOT NULL,
    "declarations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InstitutionalRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstitutionalRegistration_attempt_period_key" ON "InstitutionalRegistration"("attemptId", "periodId");
CREATE UNIQUE INDEX "InstitutionalRegistration_receipt_key" ON "InstitutionalRegistration"("receipt");
CREATE INDEX "InstitutionalRegistration_attempt_status_idx" ON "InstitutionalRegistration"("attemptId", "status");

CREATE TABLE "CourseRegistration" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseRegistration_registration_course_key" ON "CourseRegistration"("registrationId", "courseId");
CREATE INDEX "CourseRegistration_registration_status_idx" ON "CourseRegistration"("registrationId", "status");

ALTER TABLE "CourseRegistration" ADD CONSTRAINT "CourseRegistration_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "InstitutionalRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseRegistration" ADD CONSTRAINT "CourseRegistration_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
