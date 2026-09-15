-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeRef" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "grantedById" TEXT,
    "reason" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdIp" TEXT,
    "userAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorAccountId" TEXT,
    "activeRole" TEXT,
    "scope" TEXT,
    "action" TEXT NOT NULL,
    "targetRef" TEXT,
    "outcome" TEXT NOT NULL,
    "reason" TEXT,
    "policyVersion" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_username_key" ON "Account"("username");

-- CreateIndex
CREATE INDEX "Account_personId_idx" ON "Account"("personId");

-- CreateIndex
CREATE INDEX "RoleAssignment_accountId_idx" ON "RoleAssignment"("accountId");

-- CreateIndex
CREATE INDEX "RoleAssignment_role_scopeType_scopeRef_idx" ON "RoleAssignment"("role", "scopeType", "scopeRef");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_accountId_idx" ON "Session"("accountId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorAccountId_idx" ON "AuditEvent"("actorAccountId");

-- CreateIndex
CREATE INDEX "AuditEvent_action_occurredAt_idx" ON "AuditEvent"("action", "occurredAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
