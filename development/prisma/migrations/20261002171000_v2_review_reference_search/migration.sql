-- Existing queue reference lookup uses case-insensitive equality (ILIKE).
-- pg_trgm keeps that predicate indexed without changing stored references.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Application_reference_trgm_idx"
  ON "Application" USING GIN ("reference" gin_trgm_ops);
