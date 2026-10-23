-- CreateTable
CREATE TABLE "MoodleProvisionRequest" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "requestedByAccountId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'WAITING',
    "validityPolicy" TEXT NOT NULL DEFAULT 'WHILE_ENROLLED',
    "validUntil" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "outboxId" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "error" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodleProvisionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodleProvisionRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseRegistrationId" TEXT,
    "offeringId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'WAITING',
    "moodleRole" TEXT NOT NULL DEFAULT 'Student',
    "shellRef" TEXT,
    "outboxId" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "error" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodleProvisionRequestItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MoodleProvisionRequest" ADD CONSTRAINT "MoodleProvisionRequest_requestedByAccountId_fkey" FOREIGN KEY ("requestedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodleProvisionRequest" ADD CONSTRAINT "MoodleProvisionRequest_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES "OutboxEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodleProvisionRequestItem" ADD CONSTRAINT "MoodleProvisionRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MoodleProvisionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodleProvisionRequestItem" ADD CONSTRAINT "MoodleProvisionRequestItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodleProvisionRequestItem" ADD CONSTRAINT "MoodleProvisionRequestItem_courseRegistrationId_fkey" FOREIGN KEY ("courseRegistrationId") REFERENCES "CourseRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodleProvisionRequestItem" ADD CONSTRAINT "MoodleProvisionRequestItem_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ProgrammeOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodleProvisionRequestItem" ADD CONSTRAINT "MoodleProvisionRequestItem_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES "OutboxEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "MoodleProvisionRequest_requestId_key" ON "MoodleProvisionRequest"("requestId");

-- CreateIndex
CREATE INDEX "MoodleProvisionRequest_requestId_state_idx" ON "MoodleProvisionRequest"("requestId", "state");

-- CreateIndex
CREATE INDEX "MoodleProvisionRequest_requestedByAccountId_state_idx" ON "MoodleProvisionRequest"("requestedByAccountId", "state");

-- CreateIndex
CREATE INDEX "MoodleProvisionRequest_state_createdAt_idx" ON "MoodleProvisionRequest"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MoodleProvisionItem_target_key" ON "MoodleProvisionRequestItem"("requestId", "studentId", "courseRegistrationId");

-- CreateIndex
CREATE INDEX "MoodleProvisionRequestItem_requestId_state_idx" ON "MoodleProvisionRequestItem"("requestId", "state");

-- CreateIndex
CREATE INDEX "MoodleProvisionRequestItem_studentId_state_idx" ON "MoodleProvisionRequestItem"("studentId", "state");

-- CreateIndex
CREATE INDEX "MoodleProvisionRequestItem_offeringId_state_idx" ON "MoodleProvisionRequestItem"("offeringId", "state");