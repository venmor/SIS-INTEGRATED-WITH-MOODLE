-- AlterTable
ALTER TABLE "BreakGlassRequest" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewOutcome" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT;

-- Hand-maintained (Prisma cannot express partial indexes): one open expiry
-- warning per assignment across concurrent daemon ticks. Mirrored in
-- schema.prisma comments; never auto-drop (see ph1_hardening rule).
CREATE UNIQUE INDEX "ExpiryWarning_open_key" ON "ExpiryWarning"("assignmentId") WHERE "acknowledgedAt" IS NULL;

-- Role risk levels for quarterly review scheduling (packet-local demo
-- mapping; GAP-010 institutional override pending). Read by the shared
-- scheduleReview hook as security.roleRiskLevels.
INSERT INTO "ConfigurationItem" ("id", "key", "category", "subCategory", "value", "valueType", "label", "description", "minValue", "maxValue", "allowedValues", "isSecret", "isReadOnly", "version", "createdAt", "updatedAt", "updatedBy") VALUES
('cfg_role_risk_levels', 'security.roleRiskLevels', 'security', 'review', '{"SYSADMIN":"high","DEAN":"high","LEC":"medium","TUT":"low","STU":"low","APP":"low"}', 'object', 'Role Risk Levels', 'Risk level per role for review scheduling (packet-local demo mapping)', NULL, NULL, NULL, false, false, 1, NOW(), NOW(), 'system');
