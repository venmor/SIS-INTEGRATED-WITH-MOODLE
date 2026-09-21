-- TASK-PH3-001: staff review assignments. One active claim per application:
-- history rows stay (RELEASED) while the partial unique index admits a single
-- CLAIMED row. Prisma cannot express the partial index, so it lives here in
-- SQL like the other hand-maintained constraints (see schema comments).
CREATE TABLE "ReviewAssignment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "assigneeAccountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CLAIMED',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    CONSTRAINT "ReviewAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReviewAssignment_active_claim_key" ON "ReviewAssignment"("applicationId") WHERE "status" = 'CLAIMED';
CREATE INDEX "ReviewAssignment_assignee_status_idx" ON "ReviewAssignment"("assigneeAccountId", "status");

ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
