-- AlterTable
ALTER TABLE "InstitutionUnitVersion" ADD COLUMN     "setupVersionId" TEXT,
ADD COLUMN     "unitKind" TEXT;

-- AlterTable
ALTER TABLE "InstitutionUnitRelationship" ADD COLUMN     "setupVersionId" TEXT;

-- CreateTable
CREATE TABLE "AcademicPeriodVersion" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "parentCode" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "setupVersionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicPeriodVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoInstitutionSetupVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "profile" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "contentDigest" TEXT NOT NULL,
    "baseActivationId" TEXT,
    "createdByAccountId" TEXT NOT NULL,
    "createdByAssignmentId" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoInstitutionSetupVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoInstitutionSetupActivation" (
    "id" TEXT NOT NULL,
    "setupVersionId" TEXT NOT NULL,
    "previousActivationId" TEXT,
    "approvedByAccountId" TEXT NOT NULL,
    "approvedByAssignmentId" TEXT NOT NULL,
    "authenticationStrength" TEXT NOT NULL,
    "approvalMeaning" TEXT NOT NULL,
    "contentDigest" TEXT NOT NULL,
    "commandDigest" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoInstitutionSetupActivation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicPeriodVersion_setupVersionId_idx" ON "AcademicPeriodVersion"("setupVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicPeriodVersion_periodId_version_key" ON "AcademicPeriodVersion"("periodId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicPeriodVersion_setupVersionId_periodId_key" ON "AcademicPeriodVersion"("setupVersionId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoInstitutionSetupVersion_version_key" ON "DemoInstitutionSetupVersion"("version");

-- CreateIndex
CREATE UNIQUE INDEX "DemoInstitutionSetupVersion_createdByAccountId_clientReques_key" ON "DemoInstitutionSetupVersion"("createdByAccountId", "clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoInstitutionSetupActivation_setupVersionId_key" ON "DemoInstitutionSetupActivation"("setupVersionId");

-- CreateIndex
CREATE INDEX "DemoInstitutionSetupActivation_approvedAt_idx" ON "DemoInstitutionSetupActivation"("approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DemoInstitutionSetupActivation_approvedByAccountId_clientRe_key" ON "DemoInstitutionSetupActivation"("approvedByAccountId", "clientRequestId");

-- CreateIndex
CREATE INDEX "InstitutionUnitVersion_setupVersionId_idx" ON "InstitutionUnitVersion"("setupVersionId");

-- CreateIndex
CREATE INDEX "InstitutionUnitRelationship_setupVersionId_idx" ON "InstitutionUnitRelationship"("setupVersionId");

-- AddForeignKey
ALTER TABLE "InstitutionUnitVersion" ADD CONSTRAINT "InstitutionUnitVersion_setupVersionId_fkey" FOREIGN KEY ("setupVersionId") REFERENCES "DemoInstitutionSetupVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionUnitRelationship" ADD CONSTRAINT "InstitutionUnitRelationship_setupVersionId_fkey" FOREIGN KEY ("setupVersionId") REFERENCES "DemoInstitutionSetupVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicPeriodVersion" ADD CONSTRAINT "AcademicPeriodVersion_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicPeriodVersion" ADD CONSTRAINT "AcademicPeriodVersion_setupVersionId_fkey" FOREIGN KEY ("setupVersionId") REFERENCES "DemoInstitutionSetupVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoInstitutionSetupVersion" ADD CONSTRAINT "DemoInstitutionSetupVersion_baseActivationId_fkey" FOREIGN KEY ("baseActivationId") REFERENCES "DemoInstitutionSetupActivation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoInstitutionSetupVersion" ADD CONSTRAINT "DemoInstitutionSetupVersion_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoInstitutionSetupActivation" ADD CONSTRAINT "DemoInstitutionSetupActivation_setupVersionId_fkey" FOREIGN KEY ("setupVersionId") REFERENCES "DemoInstitutionSetupVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoInstitutionSetupActivation" ADD CONSTRAINT "DemoInstitutionSetupActivation_previousActivationId_fkey" FOREIGN KEY ("previousActivationId") REFERENCES "DemoInstitutionSetupActivation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoInstitutionSetupActivation" ADD CONSTRAINT "DemoInstitutionSetupActivation_approvedByAccountId_fkey" FOREIGN KEY ("approvedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Explicit source versions are immutable, including installed projections.
CREATE FUNCTION sis_demo_setup_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Fictional setup history is append-only';
END;
$$;
CREATE TRIGGER demo_setup_version_append_only BEFORE UPDATE OR DELETE ON "DemoInstitutionSetupVersion" FOR EACH ROW EXECUTE FUNCTION sis_demo_setup_append_only();
CREATE TRIGGER demo_setup_activation_append_only BEFORE UPDATE OR DELETE ON "DemoInstitutionSetupActivation" FOR EACH ROW EXECUTE FUNCTION sis_demo_setup_append_only();
CREATE TRIGGER demo_calendar_version_append_only BEFORE UPDATE OR DELETE ON "AcademicPeriodVersion" FOR EACH ROW EXECUTE FUNCTION sis_demo_setup_append_only();
CREATE FUNCTION sis_demo_setup_projection_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."setupVersionId" IS NOT NULL THEN
    RAISE EXCEPTION 'Installed setup projection is append-only';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."setupVersionId" IS NOT NULL THEN
    RAISE EXCEPTION 'Setup provenance must be created append-only';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER demo_unit_version_append_only BEFORE UPDATE OR DELETE ON "InstitutionUnitVersion" FOR EACH ROW EXECUTE FUNCTION sis_demo_setup_projection_append_only();
CREATE TRIGGER demo_unit_relation_append_only BEFORE UPDATE OR DELETE ON "InstitutionUnitRelationship" FOR EACH ROW EXECUTE FUNCTION sis_demo_setup_projection_append_only();
ALTER TABLE "AcademicPeriodVersion" ADD CONSTRAINT "AcademicPeriodVersion_ordered_dates" CHECK ("startDate" <= "endDate" AND "version" > 0);
ALTER TABLE "DemoInstitutionSetupVersion" ADD CONSTRAINT "DemoInstitutionSetupVersion_positive_version" CHECK ("version" > 0);
-- One chain head and at most one successor, also outside application locks.
CREATE UNIQUE INDEX "DemoSetup_one_initial_activation" ON "DemoInstitutionSetupActivation" ((1)) WHERE "previousActivationId" IS NULL;
CREATE UNIQUE INDEX "DemoSetup_one_successor" ON "DemoInstitutionSetupActivation" ("previousActivationId") WHERE "previousActivationId" IS NOT NULL;
