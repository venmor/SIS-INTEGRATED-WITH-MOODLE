-- Academic-help routing and requests. No production route is seeded or
-- activated by this migration. Restricted support domains remain separate.
CREATE TABLE "AcademicSupportService" (
  "id" TEXT NOT NULL,
  "programmeId" TEXT NOT NULL,
  "campus" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ownerAssignmentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "demoOnly" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "approvalRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicSupportService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentAdviserAssignment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "adviserAssignmentId" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "sourceRef" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentAdviserAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicSupportRequest" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "ownerAssignmentId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "contactMethod" TEXT NOT NULL,
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "idempotencyKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicSupportRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademicSupportRequestEvent" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "actorAccountId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicSupportRequestEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademicSupportRequest_reference_key" ON "AcademicSupportRequest"("reference");
CREATE UNIQUE INDEX "AcademicSupportRequest_idempotencyKey_key" ON "AcademicSupportRequest"("idempotencyKey");
CREATE INDEX "AcademicSupportService_programmeId_campus_status_effectiveFrom_idx" ON "AcademicSupportService"("programmeId", "campus", "status", "effectiveFrom");
CREATE INDEX "AcademicSupportService_ownerAssignmentId_status_idx" ON "AcademicSupportService"("ownerAssignmentId", "status");
CREATE INDEX "StudentAdviserAssignment_studentId_effectiveFrom_effectiveTo_idx" ON "StudentAdviserAssignment"("studentId", "effectiveFrom", "effectiveTo");
CREATE INDEX "StudentAdviserAssignment_adviserAssignmentId_effectiveFrom_effectiveTo_idx" ON "StudentAdviserAssignment"("adviserAssignmentId", "effectiveFrom", "effectiveTo");
CREATE INDEX "AcademicSupportRequest_studentId_createdAt_id_idx" ON "AcademicSupportRequest"("studentId", "createdAt", "id");
CREATE INDEX "AcademicSupportRequest_ownerAssignmentId_createdAt_id_idx" ON "AcademicSupportRequest"("ownerAssignmentId", "createdAt", "id");
CREATE INDEX "AcademicSupportRequestEvent_requestId_createdAt_idx" ON "AcademicSupportRequestEvent"("requestId", "createdAt");

ALTER TABLE "AcademicSupportService" ADD CONSTRAINT "AcademicSupportService_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicSupportService" ADD CONSTRAINT "AcademicSupportService_ownerAssignmentId_fkey" FOREIGN KEY ("ownerAssignmentId") REFERENCES "RoleAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAdviserAssignment" ADD CONSTRAINT "StudentAdviserAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAdviserAssignment" ADD CONSTRAINT "StudentAdviserAssignment_adviserAssignmentId_fkey" FOREIGN KEY ("adviserAssignmentId") REFERENCES "RoleAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicSupportRequest" ADD CONSTRAINT "AcademicSupportRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicSupportRequest" ADD CONSTRAINT "AcademicSupportRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "AcademicSupportService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicSupportRequest" ADD CONSTRAINT "AcademicSupportRequest_ownerAssignmentId_fkey" FOREIGN KEY ("ownerAssignmentId") REFERENCES "RoleAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicSupportRequestEvent" ADD CONSTRAINT "AcademicSupportRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AcademicSupportRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
