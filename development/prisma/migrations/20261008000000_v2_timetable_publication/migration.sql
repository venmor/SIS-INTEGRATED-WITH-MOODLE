-- AlterTable
ALTER TABLE "TimetableDemoMasterDraft" ADD COLUMN     "createdByAssignmentId" TEXT,
ADD COLUMN     "createdByPersonId" TEXT,
ADD COLUMN     "sourceFingerprint" TEXT;

-- CreateTable
CREATE TABLE "TimetableDemoPublication" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "masterDraftId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "previousPublicationId" TEXT,
    "approvedByAccountId" TEXT NOT NULL,
    "approvedByAssignmentId" TEXT NOT NULL,
    "approvedByPersonId" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "contentDigest" TEXT NOT NULL,
    "commandDigest" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "authenticationStrength" TEXT NOT NULL,
    "approvalMeaning" TEXT NOT NULL,
    "impact" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimetableDemoPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableStudentSession" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "courseRegistrationId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "teacherAssignmentId" TEXT NOT NULL,
    "sectionCode" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "venueCode" TEXT NOT NULL,
    "campusCode" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "deliveryMode" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimetableStudentSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimetableDemoPublication_masterDraftId_key" ON "TimetableDemoPublication"("masterDraftId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableDemoPublication_previousPublicationId_key" ON "TimetableDemoPublication"("previousPublicationId");

-- CreateIndex
CREATE INDEX "TimetableDemoPublication_periodId_publishedAt_idx" ON "TimetableDemoPublication"("periodId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableDemoPublication_periodId_version_key" ON "TimetableDemoPublication"("periodId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableDemoPublication_approvedByAccountId_clientRequestI_key" ON "TimetableDemoPublication"("approvedByAccountId", "clientRequestId");

-- CreateIndex
CREATE INDEX "TimetableStudentSession_attemptId_periodId_publicationId_idx" ON "TimetableStudentSession"("attemptId", "periodId", "publicationId");

-- CreateIndex
CREATE INDEX "TimetableStudentSession_courseRegistrationId_publicationId_idx" ON "TimetableStudentSession"("courseRegistrationId", "publicationId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableStudentSession_publicationId_courseRegistrationId__key" ON "TimetableStudentSession"("publicationId", "courseRegistrationId", "sessionId");

-- AddForeignKey
ALTER TABLE "TimetableDemoMasterDraft" ADD CONSTRAINT "TimetableDemoMasterDraft_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "RoleAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableDemoMasterDraft" ADD CONSTRAINT "TimetableDemoMasterDraft_createdByPersonId_fkey" FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableDemoPublication" ADD CONSTRAINT "TimetableDemoPublication_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableDemoPublication" ADD CONSTRAINT "TimetableDemoPublication_masterDraftId_fkey" FOREIGN KEY ("masterDraftId") REFERENCES "TimetableDemoMasterDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableDemoPublication" ADD CONSTRAINT "TimetableDemoPublication_previousPublicationId_fkey" FOREIGN KEY ("previousPublicationId") REFERENCES "TimetableDemoPublication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableDemoPublication" ADD CONSTRAINT "TimetableDemoPublication_approvedByAccountId_fkey" FOREIGN KEY ("approvedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableDemoPublication" ADD CONSTRAINT "TimetableDemoPublication_approvedByAssignmentId_fkey" FOREIGN KEY ("approvedByAssignmentId") REFERENCES "RoleAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableDemoPublication" ADD CONSTRAINT "TimetableDemoPublication_approvedByPersonId_fkey" FOREIGN KEY ("approvedByPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableStudentSession" ADD CONSTRAINT "TimetableStudentSession_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "TimetableDemoPublication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableStudentSession" ADD CONSTRAINT "TimetableStudentSession_courseRegistrationId_fkey" FOREIGN KEY ("courseRegistrationId") REFERENCES "CourseRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableStudentSession" ADD CONSTRAINT "TimetableStudentSession_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ProgrammeAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableStudentSession" ADD CONSTRAINT "TimetableStudentSession_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableStudentSession" ADD CONSTRAINT "TimetableStudentSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TeachingSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableStudentSession" ADD CONSTRAINT "TimetableStudentSession_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseDeliveryOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableStudentSession" ADD CONSTRAINT "TimetableStudentSession_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "CourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableStudentSession" ADD CONSTRAINT "TimetableStudentSession_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "TeachingVenue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableStudentSession" ADD CONSTRAINT "TimetableStudentSession_teacherAssignmentId_fkey" FOREIGN KEY ("teacherAssignmentId") REFERENCES "RoleAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Legacy proposals remain immutable and intentionally lack original appointment
-- proof. Their new nullable columns are not backfilled with invented authority.
ALTER TABLE "TimetableDemoPublication" ADD CONSTRAINT "TimetableDemoPublication_version_positive" CHECK ("version" > 0);
ALTER TABLE "TimetableDemoPublication" ADD CONSTRAINT "TimetableDemoPublication_digest_valid" CHECK ("contentDigest" ~ '^[a-f0-9]{64}$' AND "commandDigest" ~ '^[a-f0-9]{64}$' AND "sourceFingerprint" ~ '^[a-f0-9]{64}$');
ALTER TABLE "TimetableDemoPublication" ADD CONSTRAINT "TimetableDemoPublication_reason_valid" CHECK (length(btrim("reason")) BETWEEN 10 AND 500);
ALTER TABLE "TimetableStudentSession" ADD CONSTRAINT "TimetableStudentSession_dates_ordered" CHECK ("startAt" < "endAt");
CREATE UNIQUE INDEX "TimetableDemoPublication_initial_period_key" ON "TimetableDemoPublication" ("periodId") WHERE "previousPublicationId" IS NULL;
CREATE TRIGGER "TimetableDemoPublication_no_update_delete" BEFORE UPDATE OR DELETE ON "TimetableDemoPublication" FOR EACH ROW EXECUTE FUNCTION forbid_timetable_demo_rule_mutation();
CREATE TRIGGER "TimetableStudentSession_no_update_delete" BEFORE UPDATE OR DELETE ON "TimetableStudentSession" FOR EACH ROW EXECUTE FUNCTION forbid_timetable_demo_rule_mutation();
