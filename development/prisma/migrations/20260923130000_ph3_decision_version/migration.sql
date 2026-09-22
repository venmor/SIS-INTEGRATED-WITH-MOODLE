-- TASK-PH3-005: explicit offer version on decisions. Existing rows read as
-- version 1. A linked superseding decision bumps the version; the release
-- path refuses to overwrite a released decision (ALREADY_RELEASED).
ALTER TABLE "ApplicationDecision" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
