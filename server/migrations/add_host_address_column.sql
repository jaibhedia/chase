-- Migration: Add host_address column to game_rooms table
-- Date: 2025-11-11
-- Description: The refactored backend uses 'host_address' instead of 'host_id' to track room hosts by wallet address

-- Add the host_address column to game_rooms table
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS host_address VARCHAR(255);

-- Copy data from host_id to host_address (if host_id contains wallet addresses)
UPDATE game_rooms SET host_address = host_id WHERE host_address IS NULL;

-- Make host_id nullable (transitioning away from it)
ALTER TABLE game_rooms ALTER COLUMN host_id DROP NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_rooms_host_address ON game_rooms(host_address);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- Note: We're keeping host_id for backwards compatibility during migration
-- Both host_id and host_address will be populated with wallet address
-- In future versions, host_id can be removed entirely
