CREATE TABLE "AcademicSupportMessage" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "authorAccountId" TEXT NOT NULL,
  "authorRole" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicSupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcademicSupportMessage_idempotencyKey_key" ON "AcademicSupportMessage"("idempotencyKey");
CREATE INDEX "AcademicSupportMessage_requestId_createdAt_id_idx" ON "AcademicSupportMessage"("requestId", "createdAt", "id");
ALTER TABLE "AcademicSupportMessage" ADD CONSTRAINT "AcademicSupportMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AcademicSupportRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
