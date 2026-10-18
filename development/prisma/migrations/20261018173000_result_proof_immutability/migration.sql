-- Preserve authentication evidence; only one exact consumption is mutable.
CREATE FUNCTION protect_result_release_proof() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
   RAISE EXCEPTION 'Result confirmation evidence cannot be deleted';
 END IF;
 IF OLD."consumedAt" IS NOT NULL OR NEW."consumedAt" IS NULL OR
    NEW."consumedAt" < OLD."createdAt" OR NEW."consumedAt" > OLD."expiresAt" OR
    (to_jsonb(NEW) - 'consumedAt') IS DISTINCT FROM (to_jsonb(OLD) - 'consumedAt') THEN
   RAISE EXCEPTION 'Result confirmation evidence is immutable except for one consumption';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER result_release_proof_immutable BEFORE UPDATE OR DELETE ON "ResultReleaseProof"
FOR EACH ROW EXECUTE FUNCTION protect_result_release_proof();
