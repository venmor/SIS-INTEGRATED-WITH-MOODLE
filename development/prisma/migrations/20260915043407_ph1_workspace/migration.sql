-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "activeAssignmentId" TEXT;

-- CreateIndex
CREATE INDEX "Session_activeAssignmentId_idx" ON "Session"("activeAssignmentId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_activeAssignmentId_fkey" FOREIGN KEY ("activeAssignmentId") REFERENCES "RoleAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
