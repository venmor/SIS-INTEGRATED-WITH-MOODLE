-- Phase 3 slices 1-2 hardening: indexes for the staff queue hot paths
-- (pool listing by state, active-claim lookup). Additive only.
CREATE INDEX "Application_state_created_idx" ON "Application"("state", "createdAt");
CREATE INDEX "ReviewAssignment_status_app_idx" ON "ReviewAssignment"("status", "applicationId");
