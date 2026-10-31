-- AlterTable
ALTER TABLE "MoodleProvisionRequest" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "scopeId" TEXT,
ADD COLUMN     "scopeRef" TEXT,
ADD COLUMN     "scopeType" TEXT;

-- AlterTable
ALTER TABLE "MoodleProvisionRequestItem" ADD COLUMN     "validUntil" TIMESTAMP(3),
ADD COLUMN     "validityPolicy" TEXT NOT NULL DEFAULT 'WHILE_ENROLLED';

-- CreateIndex
CREATE INDEX "MoodleProvisionRequest_scopeId_state_idx" ON "MoodleProvisionRequest"("scopeId", "state");

-- CreateIndex
CREATE INDEX "MoodleProvisionRequestItem_state_validUntil_idx" ON "MoodleProvisionRequestItem"("state", "validUntil");

-- AddForeignKey
ALTER TABLE "MoodleProvisionRequest" ADD CONSTRAINT "MoodleProvisionRequest_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope"("id") ON DELETE SET NULL ON UPDATE CASCADE;
