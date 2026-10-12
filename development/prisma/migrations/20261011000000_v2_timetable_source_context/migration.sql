-- Preserve the exact non-personal source version facts with each immutable
-- master proposal. Legacy proposals stay readable but cannot be published
-- without a new source-validated version; no provenance is invented/backfilled.
ALTER TABLE "TimetableDemoMasterDraft" ADD COLUMN "sourceContext" JSONB;
