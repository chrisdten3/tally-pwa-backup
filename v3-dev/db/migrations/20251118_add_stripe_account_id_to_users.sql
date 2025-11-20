-- Migration: add stripe_account_id to users table
-- This allows users to have their own Stripe connected accounts for receiving payouts

BEGIN;

-- Add stripe_account_id column to users table if it doesn't exist
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Create an index for faster lookups by stripe_account_id
CREATE INDEX IF NOT EXISTS idx_users_stripe_account_id ON users (stripe_account_id);

-- Add a comment to document the column
COMMENT ON COLUMN users.stripe_account_id IS 'Stripe Express Connect account ID for receiving payouts';

COMMIT;
