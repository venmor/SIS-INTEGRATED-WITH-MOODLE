-- CreateTable
CREATE TABLE "QualificationRoute" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualificationRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "awardLevel" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "department" TEXT,
    "duration" TEXT NOT NULL,
    "overview" TEXT NOT NULL,
    "feeScheduleRef" TEXT NOT NULL,
    "publishedVersion" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "owningOffice" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeOffering" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "intake" TEXT NOT NULL,
    "studyMode" TEXT NOT NULL,
    "campus" TEXT NOT NULL,
    "availability" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "statusNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgrammeOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementRule" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "routeId" TEXT,
    "ruleKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "minGrade" INTEGER,
    "requiresVerification" BOOLEAN NOT NULL DEFAULT false,
    "evidence" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidanceSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "GuidanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QualificationRoute_code_key" ON "QualificationRoute"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Programme_code_key" ON "Programme"("code");

-- CreateIndex
CREATE INDEX "ProgrammeOffering_programmeId_idx" ON "ProgrammeOffering"("programmeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeOffering_programmeId_intake_studyMode_campus_key" ON "ProgrammeOffering"("programmeId", "intake", "studyMode", "campus");

-- CreateIndex
CREATE INDEX "RequirementRule_programmeId_idx" ON "RequirementRule"("programmeId");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementRule_programmeId_ruleKey_version_key" ON "RequirementRule"("programmeId", "ruleKey", "version");

-- CreateIndex
CREATE INDEX "GuidanceSession_expiresAt_idx" ON "GuidanceSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "ProgrammeOffering" ADD CONSTRAINT "ProgrammeOffering_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRule" ADD CONSTRAINT "RequirementRule_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementRule" ADD CONSTRAINT "RequirementRule_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "QualificationRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
