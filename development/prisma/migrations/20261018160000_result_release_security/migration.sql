CREATE TABLE "ResultReleaseProof" (
 "id" TEXT NOT NULL PRIMARY KEY, "tokenHash" TEXT NOT NULL UNIQUE,
 "accountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
 "assignmentId" TEXT NOT NULL REFERENCES "RoleAssignment"("id") ON DELETE RESTRICT,
 "sessionHash" TEXT NOT NULL REFERENCES "Session"("tokenHash") ON DELETE RESTRICT,
 "action" TEXT NOT NULL CHECK ("action" IN ('ReleaseOfficialCourseResults','ApproveOfficialResultAmendment')),
 "commandDigest" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
 "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ResultReleaseProof_accountId_expiresAt_idx" ON "ResultReleaseProof"("accountId","expiresAt");
CREATE TABLE "ResultDemoReleasePolicy" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "courseId" TEXT NOT NULL REFERENCES "Course"("id") ON DELETE RESTRICT,
 "offeringRef" TEXT NOT NULL, "periodCode" TEXT NOT NULL,
 "version" TEXT NOT NULL UNIQUE, "releaseAt" TIMESTAMP(3) NOT NULL,
 "showMarks" BOOLEAN NOT NULL, "reviewInstructions" TEXT NOT NULL,
 "preparedByAccountId" TEXT NOT NULL REFERENCES "Account"("id") ON DELETE RESTRICT,
 "preparedAssignmentId" TEXT NOT NULL REFERENCES "RoleAssignment"("id") ON DELETE RESTRICT,
 "idempotencyKey" TEXT NOT NULL, "requestDigest" TEXT NOT NULL,
 UNIQUE("preparedByAccountId", "idempotencyKey"),
 "approvedByAccountId" TEXT REFERENCES "Account"("id") ON DELETE RESTRICT,
 "approvedAssignmentId" TEXT REFERENCES "RoleAssignment"("id") ON DELETE RESTRICT,
 "approvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ("approvedByAccountId" IS NULL OR "preparedByAccountId" <> "approvedByAccountId"),
 CHECK (("approvedAt" IS NULL AND "approvedByAccountId" IS NULL AND "approvedAssignmentId" IS NULL) OR ("approvedAt" IS NOT NULL AND "approvedByAccountId" IS NOT NULL AND "approvedAssignmentId" IS NOT NULL))
);
CREATE INDEX "ResultDemoReleasePolicy_offeringRef_periodCode_approvedAt_idx" ON "ResultDemoReleasePolicy"("offeringRef","periodCode","approvedAt");
CREATE FUNCTION protect_result_demo_policy() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP = 'DELETE' OR OLD."approvedAt" IS NOT NULL OR
 (to_jsonb(NEW) - ARRAY['approvedAt','approvedByAccountId','approvedAssignmentId']) IS DISTINCT FROM
 (to_jsonb(OLD) - ARRAY['approvedAt','approvedByAccountId','approvedAssignmentId']) THEN
 RAISE EXCEPTION 'Result demonstration policy history is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER result_demo_policy_immutable BEFORE UPDATE OR DELETE ON "ResultDemoReleasePolicy" FOR EACH ROW EXECUTE FUNCTION protect_result_demo_policy();
