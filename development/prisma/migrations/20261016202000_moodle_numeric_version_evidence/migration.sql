-- Preserve the target's numeric build evidence independently of its exact
-- release identity. This changes no source or external Moodle state.
ALTER TABLE "MoodleLiveTestRun" ADD COLUMN "actualNumericVersion" TEXT;
