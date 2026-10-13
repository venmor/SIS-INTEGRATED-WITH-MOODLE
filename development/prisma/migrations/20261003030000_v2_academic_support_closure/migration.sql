CREATE TABLE "AcademicSupportClosure" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actorAccountId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicSupportClosure_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcademicSupportClosure_requestId_key" ON "AcademicSupportClosure"("requestId");
CREATE UNIQUE INDEX "AcademicSupportClosure_idempotencyKey_key" ON "AcademicSupportClosure"("idempotencyKey");
ALTER TABLE "AcademicSupportClosure" ADD CONSTRAINT "AcademicSupportClosure_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AcademicSupportRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
