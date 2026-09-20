-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Created',
    "version" INTEGER NOT NULL DEFAULT 1,
    "policyVersion" TEXT NOT NULL,
    "requirementVersion" TEXT NOT NULL,
    "personal" JSONB NOT NULL DEFAULT '{}',
    "contact" JSONB NOT NULL DEFAULT '{}',
    "qualifications" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationRevision" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SecurityScanPending',
    "scanner" TEXT,
    "version" INTEGER NOT NULL,
    "replacesId" TEXT,
    "replacementReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationSubmission" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "receipt" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationCommand" (
    "key" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationCommand_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_reference_key" ON "Application"("reference");

-- CreateIndex
CREATE INDEX "Application_accountId_updatedAt_idx" ON "Application"("accountId", "updatedAt");

-- CreateIndex
CREATE INDEX "Application_offeringId_idx" ON "Application"("offeringId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationRevision_applicationId_version_key" ON "ApplicationRevision"("applicationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationDocument_replacesId_key" ON "ApplicationDocument"("replacesId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_category_createdAt_idx" ON "ApplicationDocument"("applicationId", "category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationSubmission_applicationId_key" ON "ApplicationSubmission"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationSubmission_reference_key" ON "ApplicationSubmission"("reference");

-- CreateIndex
CREATE INDEX "ApplicationCommand_accountId_createdAt_idx" ON "ApplicationCommand"("accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ProgrammeOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationRevision" ADD CONSTRAINT "ApplicationRevision_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "ApplicationDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSubmission" ADD CONSTRAINT "ApplicationSubmission_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One active application per owner/offering, even across concurrent devices.
CREATE UNIQUE INDEX "Application_active_owner_offering" ON "Application" ("accountId", "offeringId") WHERE "state" <> 'Discarded';
ALTER TABLE "Application" ADD CONSTRAINT "Application_state_check" CHECK ("state" IN ('Created','InProgress','ReadyForReview','Submitted','Discarded'));
ALTER TABLE "Application" ADD CONSTRAINT "Application_version_check" CHECK ("version" > 0);
CREATE FUNCTION sis_immutable_submission() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Formal application submissions are immutable'; END;
$$;
CREATE TRIGGER "ApplicationSubmission_immutable" BEFORE UPDATE OR DELETE ON "ApplicationSubmission" FOR EACH ROW EXECUTE FUNCTION sis_immutable_submission();
