-- Add is_public column to game_rooms table
ALTER TABLE game_rooms 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add index for faster queries on public rooms
CREATE INDEX IF NOT EXISTS idx_game_rooms_is_public 
ON game_rooms(is_public, status) 
WHERE is_public = true AND status = 'waiting';

-- Update existing rooms to be public by default
UPDATE game_rooms 
SET is_public = true 
WHERE is_public IS NULL;

-- Add comment
COMMENT ON COLUMN game_rooms.is_public IS 'Whether the room is visible in public room list';
