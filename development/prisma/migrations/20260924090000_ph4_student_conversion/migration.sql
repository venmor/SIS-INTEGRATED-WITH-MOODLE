-- TASK-PH4-002: student conversion tables (records module). Student links one
-- surviving person to a unique human-readable number; attempts pin a
-- published curriculum version; identity candidates queue human duplicate
-- review (never auto-merge). Person gains status + duplicateOfPersonId.
-- The student-number sequence makes concurrent conversions collision-free.
ALTER TABLE "Person" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Person" ADD COLUMN "duplicateOfPersonId" TEXT;
ALTER TABLE "Person" ADD CONSTRAINT "Person_duplicateOfPersonId_fkey" FOREIGN KEY ("duplicateOfPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE SEQUENCE IF NOT EXISTS "StudentNumberSeq" START WITH 1 INCREMENT BY 1;

CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Student_personId_key" ON "Student"("personId");
CREATE UNIQUE INDEX "Student_studentNumber_key" ON "Student"("studentNumber");
CREATE INDEX "Student_status_createdAt_idx" ON "Student"("status", "createdAt");

ALTER TABLE "Student" ADD CONSTRAINT "Student_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "IdentityMatchCandidate" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "candidatePersonId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedByAccountId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdentityMatchCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdentityMatchCandidate_application_person_candidate_key" ON "IdentityMatchCandidate"("applicationId", "personId", "candidatePersonId");
CREATE INDEX "IdentityMatchCandidate_status_createdAt_idx" ON "IdentityMatchCandidate"("status", "createdAt");
CREATE INDEX "IdentityMatchCandidate_application_status_idx" ON "IdentityMatchCandidate"("applicationId", "status");

CREATE TABLE "CurriculumVersion" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "effectiveFrom" TIMESTAMP(3),
    "rules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurriculumVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CurriculumVersion_programme_version_key" ON "CurriculumVersion"("programmeId", "version");
CREATE INDEX "CurriculumVersion_programme_status_idx" ON "CurriculumVersion"("programmeId", "status");

CREATE TABLE "ProgrammeAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "intake" TEXT NOT NULL,
    "curriculumVersionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ADMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgrammeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProgrammeAttempt_applicationId_key" ON "ProgrammeAttempt"("applicationId");
CREATE INDEX "ProgrammeAttempt_student_status_idx" ON "ProgrammeAttempt"("studentId", "status");

ALTER TABLE "ProgrammeAttempt" ADD CONSTRAINT "ProgrammeAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProgrammeAttempt" ADD CONSTRAINT "ProgrammeAttempt_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ProgrammeOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProgrammeAttempt" ADD CONSTRAINT "ProgrammeAttempt_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
