-- CreateTable
CREATE TABLE "MoodleLaunchTicket" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseRegistrationId" TEXT NOT NULL,
    "provisionItemId" TEXT,
    "issuedToAccountId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodleLaunchTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MoodleLaunchTicket_tokenHash_key" ON "MoodleLaunchTicket"("tokenHash");

-- CreateIndex
CREATE INDEX "MoodleLaunchTicket_studentId_createdAt_idx" ON "MoodleLaunchTicket"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "MoodleLaunchTicket_expiresAt_usedAt_idx" ON "MoodleLaunchTicket"("expiresAt", "usedAt");
