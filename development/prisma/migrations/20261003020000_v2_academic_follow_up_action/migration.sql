CREATE TABLE "AcademicSupportAction" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "routeKey" TEXT NOT NULL,
  "dueOn" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROPOSED',
  "proposerAccountId" TEXT NOT NULL,
  "proposalKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicSupportAction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AcademicSupportActionEvent" (
  "id" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "actorAccountId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademicSupportActionEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcademicSupportAction_proposalKey_key" ON "AcademicSupportAction"("proposalKey");
CREATE INDEX "AcademicSupportAction_requestId_status_dueOn_id_idx" ON "AcademicSupportAction"("requestId", "status", "dueOn", "id");
CREATE UNIQUE INDEX "AcademicSupportAction_one_active_per_request_idx" ON "AcademicSupportAction"("requestId") WHERE "status" IN ('PROPOSED', 'ACCEPTED', 'CLAIMED_COMPLETE');
CREATE UNIQUE INDEX "AcademicSupportActionEvent_idempotencyKey_key" ON "AcademicSupportActionEvent"("idempotencyKey");
CREATE INDEX "AcademicSupportActionEvent_actionId_createdAt_id_idx" ON "AcademicSupportActionEvent"("actionId", "createdAt", "id");
ALTER TABLE "AcademicSupportAction" ADD CONSTRAINT "AcademicSupportAction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AcademicSupportRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademicSupportActionEvent" ADD CONSTRAINT "AcademicSupportActionEvent_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "AcademicSupportAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
