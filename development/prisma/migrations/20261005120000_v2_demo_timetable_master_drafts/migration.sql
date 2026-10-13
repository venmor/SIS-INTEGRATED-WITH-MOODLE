CREATE TABLE "TimetableDemoMasterDraft" (
  "id" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "ruleDraftId" TEXT NOT NULL,
  "sessions" JSONB NOT NULL,
  "issues" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "createdByAccountId" TEXT NOT NULL,
  "clientRequestId" TEXT NOT NULL,
  "contentDigest" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimetableDemoMasterDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TimetableDemoMasterDraft_version_positive" CHECK ("version" > 0),
  CONSTRAINT "TimetableDemoMasterDraft_status_check" CHECK ("status" IN ('BLOCKED', 'CONFLICT_FREE_FOR_REVIEW'))
);
CREATE UNIQUE INDEX "TimetableDemoMasterDraft_periodId_version_key" ON "TimetableDemoMasterDraft"("periodId", "version");
CREATE UNIQUE INDEX "TimetableDemoMasterDraft_createdByAccountId_clientRequestId_key" ON "TimetableDemoMasterDraft"("createdByAccountId", "clientRequestId");
CREATE INDEX "TimetableDemoMasterDraft_periodId_createdAt_idx" ON "TimetableDemoMasterDraft"("periodId", "createdAt");
ALTER TABLE "TimetableDemoMasterDraft" ADD CONSTRAINT "TimetableDemoMasterDraft_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableDemoMasterDraft" ADD CONSTRAINT "TimetableDemoMasterDraft_ruleDraftId_fkey" FOREIGN KEY ("ruleDraftId") REFERENCES "TimetableDemoRuleDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableDemoMasterDraft" ADD CONSTRAINT "TimetableDemoMasterDraft_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER "TimetableDemoMasterDraft_no_update_delete"
  BEFORE UPDATE OR DELETE ON "TimetableDemoMasterDraft"
  FOR EACH ROW EXECUTE FUNCTION forbid_timetable_demo_rule_mutation();
