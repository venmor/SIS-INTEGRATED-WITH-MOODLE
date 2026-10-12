-- Restore two conversion protections missing from the deployed demonstration
-- schema. Preserve applied migration history and all records. These checks use
-- structural identity, so fresh installations and renamed indexes are no-ops.
-- Existing orphan attempts or duplicate candidates fail instead of being deleted.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = '"ProgrammeAttempt"'::regclass
      AND c.contype = 'f'
      AND c.confrelid = '"ProgrammeOffering"'::regclass
      AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = '"ProgrammeAttempt"'::regclass AND attname = 'offeringId')]::smallint[]
      AND c.confkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = '"ProgrammeOffering"'::regclass AND attname = 'id')]::smallint[]
      AND c.confdeltype = 'r' AND c.confupdtype = 'c'
      AND c.convalidated
  ) THEN
    ALTER TABLE "ProgrammeAttempt" ADD CONSTRAINT "ProgrammeAttempt_offeringId_fkey"
      FOREIGN KEY ("offeringId") REFERENCES "ProgrammeOffering"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = '"IdentityMatchCandidate"'::regclass
      AND i.indisunique AND i.indisvalid
      AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts = 3
      AND (
        SELECT array_agg(a.attname::text ORDER BY k.ordinality)
        FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ordinality)
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        WHERE k.ordinality <= i.indnkeyatts
      ) = ARRAY['applicationId', 'personId', 'candidatePersonId']::text[]
  ) THEN
    CREATE UNIQUE INDEX "IdentityMatchCandidate_application_person_candidate_key"
      ON "IdentityMatchCandidate"("applicationId", "personId", "candidatePersonId");
  END IF;
END $$;
