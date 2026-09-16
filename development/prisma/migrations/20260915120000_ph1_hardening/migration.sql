-- Hand-maintained hardening indexes (NOT expressible in Prisma schema language):
-- future `migrate diff` will flag drift here. Do NOT auto-resolve by dropping;
-- mirror any change back into schema.prisma comments + this file.
-- Partial unique: exactly one ACTIVE credential per account+kind. Concurrent
-- recovery confirms converge here instead of silently doubling credentials.
CREATE UNIQUE INDEX "Credential_accountId_kind_active_key" ON "Credential"("accountId", "kind") WHERE "status" = 'ACTIVE';

-- Support-reference lookups by correlationId must always hit exactly one row.
ALTER TABLE "AuditEvent" ALTER COLUMN "correlationId" SET NOT NULL;
CREATE UNIQUE INDEX "AuditEvent_correlationId_key" ON "AuditEvent"("correlationId");
