-- Migration: Add host_address column to game_rooms table
-- Date: 2025-11-11
-- Description: The refactored backend uses 'host_address' instead of 'host_id' to track room hosts by wallet address

-- Add the host_address column to game_rooms table
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS host_address VARCHAR(255);

-- Copy data from host_id to host_address (if host_id contains wallet addresses)
UPDATE game_rooms SET host_address = host_id WHERE host_address IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_rooms_host_address ON game_rooms(host_address);

-- Optional: You can drop host_id if you're fully migrating to host_address
-- ALTER TABLE game_rooms DROP COLUMN IF EXISTS host_id;

-- Note: If you want to keep both columns for backwards compatibility, keep host_id
-- Otherwise, uncomment the DROP COLUMN statement above
