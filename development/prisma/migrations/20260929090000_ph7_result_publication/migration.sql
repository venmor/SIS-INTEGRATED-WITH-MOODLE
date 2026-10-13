-- DropIndex
DROP INDEX IF EXISTS "ResultPackage_offeringRef_periodCode_version_key";
DROP INDEX IF EXISTS "ResultPackage_offering_period_version_key";

-- CreateTable
CREATE TABLE "ResultRelease" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "offeringRef" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "packageHash" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "releasedByAccountId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "declaration" TEXT NOT NULL,
    "previousReleaseId" TEXT,
    "amendmentId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialResultVersion" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentRef" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "courseType" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "mark" DOUBLE PRECISION NOT NULL,
    "outcome" TEXT NOT NULL,
    "previousVersionId" TEXT,
    "calculationSnapshot" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficialResultVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultAmendment" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reason" TEXT NOT NULL,
    "evidenceRef" TEXT NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "decidedByAccountId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultAcademicImpact" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "sourceVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultAcademicImpact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultNotice" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResultRelease_packageId_key" ON "ResultRelease"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultRelease_previousReleaseId_key" ON "ResultRelease"("previousReleaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultRelease_amendmentId_key" ON "ResultRelease"("amendmentId");

-- CreateIndex
CREATE INDEX "ResultRelease_offeringRef_periodCode_idx" ON "ResultRelease"("offeringRef", "periodCode");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialResultVersion_previousVersionId_key" ON "OfficialResultVersion"("previousVersionId");

-- CreateIndex
CREATE INDEX "OfficialResultVersion_studentId_publishedAt_idx" ON "OfficialResultVersion"("studentId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialResultVersion_releaseId_studentId_key" ON "OfficialResultVersion"("releaseId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialResultVersion_studentId_courseId_periodCode_version_key" ON "OfficialResultVersion"("studentId", "courseId", "periodCode", "version");

-- CreateIndex
CREATE INDEX "ResultAmendment_releaseId_status_idx" ON "ResultAmendment"("releaseId", "status");

-- CreateIndex
CREATE INDEX "ResultAcademicImpact_domain_status_idx" ON "ResultAcademicImpact"("domain", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ResultAcademicImpact_resultId_domain_key" ON "ResultAcademicImpact"("resultId", "domain");

-- CreateIndex
CREATE INDEX "ResultNotice_studentId_createdAt_idx" ON "ResultNotice"("studentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResultNotice_releaseId_studentId_key" ON "ResultNotice"("releaseId", "studentId");

-- CreateIndex
CREATE INDEX "ResultPackage_offeringRef_periodCode_version_idx" ON "ResultPackage"("offeringRef", "periodCode", "version");

-- AddForeignKey
ALTER TABLE "ResultRelease" ADD CONSTRAINT "ResultRelease_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ResultPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultRelease" ADD CONSTRAINT "ResultRelease_previousReleaseId_fkey" FOREIGN KEY ("previousReleaseId") REFERENCES "ResultRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialResultVersion" ADD CONSTRAINT "OfficialResultVersion_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "ResultRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialResultVersion" ADD CONSTRAINT "OfficialResultVersion_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "OfficialResultVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultAcademicImpact" ADD CONSTRAINT "ResultAcademicImpact_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "OfficialResultVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Official publication history is append-only, including superseded versions.
CREATE FUNCTION "protectOfficialPublication"() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Official publication history is immutable'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "immutableResultRelease" BEFORE UPDATE OR DELETE ON "ResultRelease"
FOR EACH ROW EXECUTE FUNCTION "protectOfficialPublication"();
CREATE TRIGGER "immutableOfficialResultVersion" BEFORE UPDATE OR DELETE ON "OfficialResultVersion"
FOR EACH ROW EXECUTE FUNCTION "protectOfficialPublication"();
-- Published snapshots cannot be rewritten through a package update either.
CREATE FUNCTION "protectPublishedPackage"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ResultRelease" WHERE "packageId" = OLD.id) THEN
    RAISE EXCEPTION 'A published result package is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "immutablePublishedPackage" BEFORE UPDATE OR DELETE ON "ResultPackage"
FOR EACH ROW EXECUTE FUNCTION "protectPublishedPackage"();
