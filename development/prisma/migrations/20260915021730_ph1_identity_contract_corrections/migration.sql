/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "passwordHash";

-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "errorCategory" TEXT,
ADD COLUMN     "idempotencyRef" TEXT,
ADD COLUMN     "newState" JSONB,
ADD COLUMN     "priorState" JSONB;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "email" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RoleAssignment" ADD COLUMN     "appointmentRef" TEXT,
ADD COLUMN     "approverId" TEXT,
ADD COLUMN     "authoritySource" TEXT,
ADD COLUMN     "capabilities" TEXT[],
ADD COLUMN     "delegationLimit" TEXT,
ADD COLUMN     "employmentType" TEXT;

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Credential_accountId_kind_status_idx" ON "Credential"("accountId", "kind", "status");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
