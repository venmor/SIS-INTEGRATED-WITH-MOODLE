-- Additive completion of fictional rule drafts. Older rows remain immutable and
-- nullable; they are incomplete for any future dated planning preview.
ALTER TABLE "TimetableDemoRuleDraft"
  ADD COLUMN "periodId" TEXT,
  ADD COLUMN "teachingStartDate" DATE,
  ADD COLUMN "teachingEndDate" DATE,
  ADD COLUMN "dailyStartTime" TEXT,
  ADD COLUMN "dailyEndTime" TEXT,
  ADD COLUMN "allowedWeekdays" JSONB,
  ADD COLUMN "maxSessionMinutes" INTEGER;

ALTER TABLE "TimetableDemoRuleDraft"
  ADD CONSTRAINT "TimetableDemoRuleDraft_periodId_fkey"
  FOREIGN KEY ("periodId") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableDemoRuleDraft"
  ADD CONSTRAINT "TimetableDemoRuleDraft_teaching_dates_order"
  CHECK ("teachingStartDate" IS NULL OR "teachingEndDate" IS NULL OR "teachingStartDate" <= "teachingEndDate");
ALTER TABLE "TimetableDemoRuleDraft"
  ADD CONSTRAINT "TimetableDemoRuleDraft_session_minutes_range"
  CHECK ("maxSessionMinutes" IS NULL OR "maxSessionMinutes" BETWEEN 15 AND 480);
ALTER TABLE "TimetableDemoRuleDraft"
  ADD CONSTRAINT "TimetableDemoRuleDraft_daily_time_format"
  CHECK (("dailyStartTime" IS NULL OR "dailyStartTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    AND ("dailyEndTime" IS NULL OR "dailyEndTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    AND ("dailyStartTime" IS NULL OR "dailyEndTime" IS NULL OR "dailyStartTime" < "dailyEndTime"));
