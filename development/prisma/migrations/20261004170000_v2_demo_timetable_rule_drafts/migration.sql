-- Fictional draft rules only. No institutional configuration or publication.
CREATE TABLE "TimetableDemoRuleDraft" (
  "id" TEXT NOT NULL,
  "campusUnitId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "roomTurnaroundMinutes" INTEGER NOT NULL,
  "maxOccurrences" INTEGER NOT NULL,
  "campusTravelMinutes" JSONB NOT NULL,
  "createdByAccountId" TEXT NOT NULL,
  "clientRequestId" TEXT NOT NULL,
  "contentDigest" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimetableDemoRuleDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TimetableDemoRuleDraft_version_positive" CHECK ("version" > 0),
  CONSTRAINT "TimetableDemoRuleDraft_room_turnaround_range" CHECK ("roomTurnaroundMinutes" BETWEEN 0 AND 120),
  CONSTRAINT "TimetableDemoRuleDraft_occurrence_limit_range" CHECK ("maxOccurrences" BETWEEN 1 AND 500)
);
CREATE UNIQUE INDEX "TimetableDemoRuleDraft_campus_version_key" ON "TimetableDemoRuleDraft"("campusUnitId", "version");
CREATE UNIQUE INDEX "TimetableDemoRuleDraft_actor_request_key" ON "TimetableDemoRuleDraft"("createdByAccountId", "clientRequestId");
CREATE INDEX "TimetableDemoRuleDraft_campusUnitId_createdAt_idx" ON "TimetableDemoRuleDraft"("campusUnitId", "createdAt");
ALTER TABLE "TimetableDemoRuleDraft" ADD CONSTRAINT "TimetableDemoRuleDraft_campusUnitId_fkey" FOREIGN KEY ("campusUnitId") REFERENCES "InstitutionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableDemoRuleDraft" ADD CONSTRAINT "TimetableDemoRuleDraft_createdByAccountId_fkey" FOREIGN KEY ("createdByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION forbid_timetable_demo_rule_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Fictional timetable rule drafts are append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "TimetableDemoRuleDraft_no_update_delete"
  BEFORE UPDATE OR DELETE ON "TimetableDemoRuleDraft"
  FOR EACH ROW EXECUTE FUNCTION forbid_timetable_demo_rule_mutation();
