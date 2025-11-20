-- Migration: add phone field to users table
-- This allows users to store their phone number for notifications and contact purposes

BEGIN;

-- Add phone column to users table if it doesn't exist
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN users.phone IS 'User phone number for notifications and contact';

COMMIT;
