-- Some isolated environments already applied the earlier object-storage
-- migration before its destructive DROP was corrected. Restore the private
-- demo storage column without pretending that lost bytes can be recreated.
ALTER TABLE "ApplicationDocument" ADD COLUMN IF NOT EXISTS "content" BYTEA;
ALTER TABLE "ApplicationDocument" ALTER COLUMN "content" DROP NOT NULL;
