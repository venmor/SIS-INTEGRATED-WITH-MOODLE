-- CreateTable
CREATE TABLE "ContactVerification" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "contactType" TEXT NOT NULL,
    "contactValue" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MFAEnrollment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "secretEncrypted" TEXT,
    "backupCodesEncrypted" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "MFAEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepUpChallenge" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetAction" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepUpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryMethod" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "valueHash" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactVerification_personId_contactType_contactValue_idx" ON "ContactVerification"("personId", "contactType", "contactValue");

-- CreateIndex
CREATE INDEX "ContactVerification_expiresAt_idx" ON "ContactVerification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MFAEnrollment_accountId_key" ON "MFAEnrollment"("accountId");

-- CreateIndex
CREATE INDEX "MFAEnrollment_accountId_idx" ON "MFAEnrollment"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "StepUpChallenge_challengeId_key" ON "StepUpChallenge"("challengeId");

-- CreateIndex
CREATE INDEX "StepUpChallenge_accountId_targetAction_idx" ON "StepUpChallenge"("accountId", "targetAction");

-- CreateIndex
CREATE INDEX "StepUpChallenge_expiresAt_idx" ON "StepUpChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "RecoveryMethod_accountId_idx" ON "RecoveryMethod"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryMethod_accountId_type_priority_key" ON "RecoveryMethod"("accountId", "type", "priority");
