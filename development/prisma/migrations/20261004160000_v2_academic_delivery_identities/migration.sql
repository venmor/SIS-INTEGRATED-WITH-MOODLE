-- Additive v2 timetable identities. No legacy roster or tutorial-group rows
-- are inferred, updated, or promoted to published delivery records.
CREATE TABLE "InstitutionUnit" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstitutionUnit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InstitutionUnit_code_key" ON "InstitutionUnit"("code");

CREATE TABLE "InstitutionUnitVersion" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "unitType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstitutionUnitVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InstitutionUnitVersion_version_positive" CHECK ("version" > 0),
  CONSTRAINT "InstitutionUnitVersion_effective_range" CHECK ("effectiveTo" IS NULL OR "effectiveFrom" IS NULL OR "effectiveTo" > "effectiveFrom")
);
CREATE UNIQUE INDEX "InstitutionUnitVersion_unitId_version_key" ON "InstitutionUnitVersion"("unitId", "version");
CREATE INDEX "InstitutionUnitVersion_unitType_status_idx" ON "InstitutionUnitVersion"("unitType", "status");
ALTER TABLE "InstitutionUnitVersion" ADD CONSTRAINT "InstitutionUnitVersion_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InstitutionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InstitutionUnitRelationship" (
  "id" TEXT NOT NULL,
  "fromUnitId" TEXT NOT NULL,
  "toUnitId" TEXT NOT NULL,
  "relationshipType" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstitutionUnitRelationship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InstitutionUnitRelationship_no_self" CHECK ("fromUnitId" <> "toUnitId"),
  CONSTRAINT "InstitutionUnitRelationship_effective_range" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
);
CREATE UNIQUE INDEX "InstitutionUnitRelationship_fromUnitId_toUnitId_relationshi_key" ON "InstitutionUnitRelationship"("fromUnitId", "toUnitId", "relationshipType", "effectiveFrom");
CREATE INDEX "InstitutionUnitRelationship_toUnitId_relationshipType_effec_idx" ON "InstitutionUnitRelationship"("toUnitId", "relationshipType", "effectiveFrom");
ALTER TABLE "InstitutionUnitRelationship" ADD CONSTRAINT "InstitutionUnitRelationship_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "InstitutionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InstitutionUnitRelationship" ADD CONSTRAINT "InstitutionUnitRelationship_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "InstitutionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CourseVersion" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "credits" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourseVersion_version_positive" CHECK ("version" > 0),
  CONSTRAINT "CourseVersion_credits_nonnegative" CHECK ("credits" >= 0),
  CONSTRAINT "CourseVersion_effective_range" CHECK ("effectiveTo" IS NULL OR "effectiveFrom" IS NULL OR "effectiveTo" > "effectiveFrom")
);
CREATE UNIQUE INDEX "CourseVersion_courseId_version_key" ON "CourseVersion"("courseId", "version");
CREATE INDEX "CourseVersion_status_effectiveFrom_idx" ON "CourseVersion"("status", "effectiveFrom");
ALTER TABLE "CourseVersion" ADD CONSTRAINT "CourseVersion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CourseDeliveryOffering" (
  "id" TEXT NOT NULL,
  "courseVersionId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "deliveryUnitId" TEXT NOT NULL,
  "campusUnitId" TEXT NOT NULL,
  "deliveryMode" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseDeliveryOffering_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourseDeliveryOffering_capacity_nonnegative" CHECK ("capacity" >= 0)
);
CREATE UNIQUE INDEX "CourseDeliveryOffering_courseVersionId_periodId_deliveryUni_key" ON "CourseDeliveryOffering"("courseVersionId", "periodId", "deliveryUnitId", "campusUnitId", "deliveryMode");
CREATE INDEX "CourseDeliveryOffering_periodId_campusUnitId_status_idx" ON "CourseDeliveryOffering"("periodId", "campusUnitId", "status");
ALTER TABLE "CourseDeliveryOffering" ADD CONSTRAINT "CourseDeliveryOffering_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "CourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseDeliveryOffering" ADD CONSTRAINT "CourseDeliveryOffering_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseDeliveryOffering" ADD CONSTRAINT "CourseDeliveryOffering_deliveryUnitId_fkey" FOREIGN KEY ("deliveryUnitId") REFERENCES "InstitutionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseDeliveryOffering" ADD CONSTRAINT "CourseDeliveryOffering_campusUnitId_fkey" FOREIGN KEY ("campusUnitId") REFERENCES "InstitutionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TeachingSection" (
  "id" TEXT NOT NULL,
  "offeringId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "deliveryMode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeachingSection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeachingSection_capacity_nonnegative" CHECK ("capacity" >= 0)
);
CREATE UNIQUE INDEX "TeachingSection_offeringId_code_key" ON "TeachingSection"("offeringId", "code");
CREATE INDEX "TeachingSection_offeringId_status_idx" ON "TeachingSection"("offeringId", "status");
ALTER TABLE "TeachingSection" ADD CONSTRAINT "TeachingSection_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseDeliveryOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TeachingBuilding" (
  "id" TEXT NOT NULL,
  "campusUnitId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeachingBuilding_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeachingBuilding_campusUnitId_code_key" ON "TeachingBuilding"("campusUnitId", "code");
ALTER TABLE "TeachingBuilding" ADD CONSTRAINT "TeachingBuilding_campusUnitId_fkey" FOREIGN KEY ("campusUnitId") REFERENCES "InstitutionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TeachingVenue" (
  "id" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "teachingCapacity" INTEGER NOT NULL,
  "examinationCapacity" INTEGER,
  "stepFreeAccess" BOOLEAN,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeachingVenue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeachingVenue_capacity_nonnegative" CHECK ("teachingCapacity" >= 0 AND ("examinationCapacity" IS NULL OR "examinationCapacity" >= 0))
);
CREATE UNIQUE INDEX "TeachingVenue_buildingId_code_key" ON "TeachingVenue"("buildingId", "code");
CREATE INDEX "TeachingVenue_status_teachingCapacity_idx" ON "TeachingVenue"("status", "teachingCapacity");
ALTER TABLE "TeachingVenue" ADD CONSTRAINT "TeachingVenue_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "TeachingBuilding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
