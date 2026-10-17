-- CreateTable
CREATE TABLE "MoodleLiveTestRun" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL DEFAULT 'MOODLE-LIVE-TEST-v1',
    "state" TEXT NOT NULL DEFAULT 'PREPARED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "scopeType" TEXT NOT NULL,
    "scopeRef" TEXT NOT NULL,
    "dbFingerprint" TEXT NOT NULL,
    "schemaChecksum" TEXT NOT NULL,
    "scopeManifestChecksum" TEXT NOT NULL,
    "configFingerprint" TEXT NOT NULL,
    "expectedHost" TEXT NOT NULL,
    "expectedSiteId" INTEGER NOT NULL,
    "expectedRelease" TEXT NOT NULL,
    "cohortPrefix" TEXT NOT NULL,
    "nonProductionConfirmed" BOOLEAN NOT NULL,
    "syntheticOnlyConfirmed" BOOLEAN NOT NULL,
    "creatorAccountId" TEXT NOT NULL,
    "technicalApproverAccountId" TEXT,
    "operationalApproverAccountId" TEXT,
    "technicalReceiptId" TEXT,
    "retirementReceiptId" TEXT,
    "identityStatus" TEXT NOT NULL DEFAULT 'NOT_CHECKED',
    "identityCheckedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodleLiveTestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodleLiveTestRunTransition" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "fromState" TEXT NOT NULL,
    "toState" TEXT NOT NULL,
    "actorAccountId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "actorCapability" TEXT NOT NULL,
    "actorScopeType" TEXT NOT NULL,
    "actorScopeRef" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "freshAuthRef" TEXT,
    "policyVersion" TEXT NOT NULL DEFAULT 'MOODLE-LIVE-TEST-v1',
    "evidenceChecksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodleLiveTestRunTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodleScopeManifest" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "sealedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodleScopeManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodleScopeManifestEntry" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "cohortPrefix" TEXT NOT NULL,
    "addedByAccountId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodleScopeManifestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodleRunAuthenticationReceipt" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "evidenceChecksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "MoodleRunAuthenticationReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MoodleLiveTestRun_runId_key" ON "MoodleLiveTestRun"("runId");

-- CreateIndex
CREATE INDEX "MoodleLiveTestRun_state_idx" ON "MoodleLiveTestRun"("state");

-- CreateIndex
CREATE INDEX "MoodleLiveTestRunTransition_runId_createdAt_idx" ON "MoodleLiveTestRunTransition"("runId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MoodleScopeManifest_runId_key" ON "MoodleScopeManifest"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "MoodleScopeManifestEntry_manifestId_entity_entityId_key" ON "MoodleScopeManifestEntry"("manifestId", "entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "MoodleRunAuthenticationReceipt_tokenHash_key" ON "MoodleRunAuthenticationReceipt"("tokenHash");

-- CreateIndex
CREATE INDEX "MoodleRunAuthenticationReceipt_runId_accountId_idx" ON "MoodleRunAuthenticationReceipt"("runId", "accountId");

-- AddForeignKey
ALTER TABLE "MoodleLiveTestRunTransition" ADD CONSTRAINT "MoodleLiveTestRunTransition_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MoodleLiveTestRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodleScopeManifest" ADD CONSTRAINT "MoodleScopeManifest_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MoodleLiveTestRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodleScopeManifestEntry" ADD CONSTRAINT "MoodleScopeManifestEntry_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "MoodleScopeManifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodleRunAuthenticationReceipt" ADD CONSTRAINT "MoodleRunAuthenticationReceipt_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MoodleLiveTestRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- One active run per connected database, independently of caller races.
CREATE UNIQUE INDEX "MoodleLiveTestRun_one_active" ON "MoodleLiveTestRun" ((1))
WHERE "state" IN ('PREPARED','RUNNING','PAUSED');
ALTER TABLE "MoodleLiveTestRun" ADD CONSTRAINT "MoodleLiveTestRun_state_check"
CHECK ("state" IN ('PREPARED','RUNNING','PAUSED','COMPLETED','FAILED','CLOSED'));
ALTER TABLE "MoodleScopeManifestEntry" ADD CONSTRAINT "MoodleScopeManifestEntry_entity_check"
CHECK ("entity" IN ('Account','Student','ProgrammeOffering','ProgrammeAttempt','CourseRegistration','TutorialGroup','TeachingAssignment'));
ALTER TABLE "MoodleRunAuthenticationReceipt"
  ADD FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT,
  ADD FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT,
  ADD FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT,
  ADD FOREIGN KEY ("assignmentId") REFERENCES "RoleAssignment"("id") ON DELETE RESTRICT;

CREATE FUNCTION reject_moodle_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Moodle evidence is append-only'; END $$;
CREATE TRIGGER "MoodleLiveTestRunTransition_append_only" BEFORE UPDATE OR DELETE ON "MoodleLiveTestRunTransition"
FOR EACH ROW EXECUTE FUNCTION reject_moodle_evidence_mutation();
CREATE TRIGGER "MoodleScopeManifestEntry_append_only" BEFORE UPDATE OR DELETE ON "MoodleScopeManifestEntry"
FOR EACH ROW EXECUTE FUNCTION reject_moodle_evidence_mutation();

CREATE FUNCTION guard_moodle_manifest_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sealed timestamp;
BEGIN
  -- Serializes insertion against sealing and other scope commands.
  SELECT "sealedAt" INTO sealed FROM "MoodleScopeManifest" WHERE id=NEW."manifestId" FOR UPDATE;
  IF sealed IS NOT NULL THEN RAISE EXCEPTION 'Moodle scope manifest is sealed'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "MoodleScopeManifestEntry_sealed_insert" BEFORE INSERT ON "MoodleScopeManifestEntry"
FOR EACH ROW EXECUTE FUNCTION guard_moodle_manifest_insert();
CREATE FUNCTION guard_moodle_manifest_seal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Moodle manifest cannot be deleted'; END IF;
  IF OLD."sealedAt" IS NOT NULL THEN RAISE EXCEPTION 'Moodle manifest seal is immutable'; END IF;
  IF NEW."runId"<>OLD."runId" OR NEW.id<>OLD.id THEN RAISE EXCEPTION 'Moodle manifest identity is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "MoodleScopeManifest_immutable_seal" BEFORE UPDATE OR DELETE ON "MoodleScopeManifest"
FOR EACH ROW EXECUTE FUNCTION guard_moodle_manifest_seal();
CREATE FUNCTION guard_moodle_run_binding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Moodle runs retain their evidence'; END IF;
  IF ROW(OLD."runId",OLD."scopeType",OLD."scopeRef",OLD."dbFingerprint",OLD."schemaChecksum",OLD."configFingerprint",OLD."expectedHost",OLD."expectedSiteId",OLD."expectedRelease",OLD."cohortPrefix",OLD."nonProductionConfirmed",OLD."syntheticOnlyConfirmed",OLD."creatorAccountId")
    IS DISTINCT FROM ROW(NEW."runId",NEW."scopeType",NEW."scopeRef",NEW."dbFingerprint",NEW."schemaChecksum",NEW."configFingerprint",NEW."expectedHost",NEW."expectedSiteId",NEW."expectedRelease",NEW."cohortPrefix",NEW."nonProductionConfirmed",NEW."syntheticOnlyConfirmed",NEW."creatorAccountId")
    THEN RAISE EXCEPTION 'Moodle run binding is immutable'; END IF;
  IF OLD."scopeManifestChecksum"<>NEW."scopeManifestChecksum" AND EXISTS (SELECT 1 FROM "MoodleScopeManifest" WHERE "runId"=OLD.id AND "sealedAt" IS NOT NULL)
    THEN RAISE EXCEPTION 'Moodle run scope seal is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "MoodleLiveTestRun_immutable_binding" BEFORE UPDATE OR DELETE ON "MoodleLiveTestRun"
FOR EACH ROW EXECUTE FUNCTION guard_moodle_run_binding();
CREATE FUNCTION guard_moodle_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Moodle password proof is retained'; END IF;
  IF OLD."usedAt" IS NOT NULL OR NEW."usedAt" IS NULL OR (to_jsonb(OLD)-'usedAt') IS DISTINCT FROM (to_jsonb(NEW)-'usedAt')
    THEN RAISE EXCEPTION 'Moodle password proof is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "MoodleRunAuthenticationReceipt_immutable" BEFORE UPDATE OR DELETE ON "MoodleRunAuthenticationReceipt"
FOR EACH ROW EXECUTE FUNCTION guard_moodle_receipt();
