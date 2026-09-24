-- TASK-PH6-001: mapping registry and connection health. Mappings bind
-- both SIS and Moodle identifiers with versions; activation is
-- four-eyes with synthetic validation. Connection health never stores
-- secrets.
CREATE TABLE "MoodleConnection" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "baseUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'HEALTHY',
    "capabilities" JSONB,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MoodleConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MoodleConnection_provider_key" ON "MoodleConnection"("provider");

CREATE TABLE "MoodleMapping" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sisType" TEXT NOT NULL,
    "sisId" TEXT NOT NULL,
    "moodleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "creatorAccountId" TEXT NOT NULL,
    "activatorAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MoodleMapping_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MoodleMapping_kind_sis_status_idx" ON "MoodleMapping"("kind", "sisType", "sisId", "status");
CREATE INDEX "MoodleMapping_status_updated_idx" ON "MoodleMapping"("status", "updatedAt");

CREATE TABLE "MappingCheck" (
    "id" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "reasons" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MappingCheck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MappingCheck_mapping_created_idx" ON "MappingCheck"("mappingId", "createdAt");

ALTER TABLE "MappingCheck" ADD CONSTRAINT "MappingCheck_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "MoodleMapping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
