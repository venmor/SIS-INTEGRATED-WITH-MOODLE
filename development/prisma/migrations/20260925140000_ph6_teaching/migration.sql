-- TASK-PH6-000: tutorial-group and teaching-assignment sources.
-- SIS-authoritative academic data; Moodle mirrors from slice 3 on.
-- Allocations carry reasons and never over-enrol; assignments gate
-- teaching (incl. quiz) authority by capability, scope and dates.
CREATE TABLE "TutorialGroup" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "meetingPattern" TEXT,
    "tutorRequirement" TEXT,
    "venue" TEXT,
    "mode" TEXT,
    "allocationRule" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TutorialGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TutorialGroup_offering_name_key" ON "TutorialGroup"("offeringId", "name");
CREATE INDEX "TutorialGroup_offering_status_idx" ON "TutorialGroup"("offeringId", "status");

ALTER TABLE "TutorialGroup" ADD CONSTRAINT "TutorialGroup_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ProgrammeOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TGAllocation" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TGAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TGAllocation_group_student_key" ON "TGAllocation"("groupId", "studentId");
CREATE INDEX "TGAllocation_group_status_idx" ON "TGAllocation"("groupId", "status");
CREATE INDEX "TGAllocation_student_status_idx" ON "TGAllocation"("studentId", "status");

ALTER TABLE "TGAllocation" ADD CONSTRAINT "TGAllocation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TutorialGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TGAllocation" ADD CONSTRAINT "TGAllocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TeachingAssignment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "offeringId" TEXT,
    "groupId" TEXT,
    "capabilities" TEXT[] NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "authorizerAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeachingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeachingAssignment_account_status_idx" ON "TeachingAssignment"("accountId", "status");
CREATE INDEX "TeachingAssignment_group_status_idx" ON "TeachingAssignment"("groupId", "status");

ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ProgrammeOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TutorialGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
