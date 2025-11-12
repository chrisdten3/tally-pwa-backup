-- Migration: add stripe_account_id to clubs
-- Run this migration with your Postgres/Supabase migration tooling, e.g.:
--   psql $DATABASE_URL -f 20251112_add_stripe_account_id.sql
-- or using the Supabase CLI:
--   supabase db push

BEGIN;

ALTER TABLE IF EXISTS clubs
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

COMMIT;

-- Optional: create an index if you will query by stripe_account_id
-- CREATE INDEX IF NOT EXISTS idx_clubs_stripe_account_id ON clubs (stripe_account_id);
