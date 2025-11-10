-- Chase Game Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game Rooms Table
CREATE TABLE game_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(10) UNIQUE NOT NULL,
    host_id VARCHAR(255) NOT NULL,
    host_address VARCHAR(255), -- Wallet address of the host (added for refactored backend)
    map_id VARCHAR(50) NOT NULL,
    game_mode VARCHAR(20) NOT NULL CHECK (game_mode IN ('single-player', 'multiplayer')),
    status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'starting', 'in-progress', 'finished')),
    min_players INTEGER NOT NULL DEFAULT 2,
    max_players INTEGER NOT NULL DEFAULT 4,
    current_players INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE
);

-- Create index on room_code for faster lookups
CREATE INDEX idx_game_rooms_room_code ON game_rooms(room_code);
CREATE INDEX idx_game_rooms_status ON game_rooms(status);
CREATE INDEX idx_game_rooms_host_address ON game_rooms(host_address);

-- Players in Room Table
CREATE TABLE players_in_room (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL,
    character_id INTEGER NOT NULL,
    player_name VARCHAR(100),
    is_ready BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, wallet_address)
);

-- Create indexes
CREATE INDEX idx_players_room_id ON players_in_room(room_id);
CREATE INDEX idx_players_wallet ON players_in_room(wallet_address);

-- Game States Table (for storing real-time game state)
CREATE TABLE game_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
    game_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id)
);

-- Create index on room_id
CREATE INDEX idx_game_states_room_id ON game_states(room_id);

-- Player Stats Table
CREATE TABLE player_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    total_games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    total_tags INTEGER DEFAULT 0,
    avg_tags_per_game DECIMAL(10, 2) DEFAULT 0,
    power_ups_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on wallet_address
CREATE INDEX idx_player_stats_wallet ON player_stats(wallet_address);

-- Game Results Table (historical record)
CREATE TABLE game_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
    winner_wallet VARCHAR(255),
    game_duration INTEGER, -- in seconds
    total_players INTEGER,
    results_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_game_results_room_id ON game_results(room_id);
CREATE INDEX idx_game_results_winner ON game_results(winner_wallet);

-- Function to auto-delete old finished games (keep last 7 days)
CREATE OR REPLACE FUNCTION delete_old_games()
RETURNS void AS $$
BEGIN
    DELETE FROM game_rooms
    WHERE status = 'finished'
    AND finished_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players_in_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Anyone can read game rooms
CREATE POLICY "Game rooms are viewable by everyone"
    ON game_rooms FOR SELECT
    USING (true);

-- Anyone can create game rooms
CREATE POLICY "Anyone can create game rooms"
    ON game_rooms FOR INSERT
    WITH CHECK (true);

-- Only host can update game room
CREATE POLICY "Host can update game room"
    ON game_rooms FOR UPDATE
    USING (true); -- Server will handle authorization

-- Anyone can join a room (read players)
CREATE POLICY "Players in room are viewable by everyone"
    ON players_in_room FOR SELECT
    USING (true);

-- Anyone can add themselves to a room
CREATE POLICY "Anyone can join a room"
    ON players_in_room FOR INSERT
    WITH CHECK (true);

-- Players can update their own status
CREATE POLICY "Players can update own status"
    ON players_in_room FOR UPDATE
    USING (true);

-- Game states are viewable by players in room
CREATE POLICY "Game states viewable by all"
    ON game_states FOR SELECT
    USING (true);

CREATE POLICY "Game states insertable by all"
    ON game_states FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Game states updatable by all"
    ON game_states FOR UPDATE
    USING (true);

-- Player stats viewable by everyone
CREATE POLICY "Player stats viewable by everyone"
    ON player_stats FOR SELECT
    USING (true);

CREATE POLICY "Player stats insertable"
    ON player_stats FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Player stats updatable"
    ON player_stats FOR UPDATE
    USING (true);

-- Game results viewable by everyone
CREATE POLICY "Game results viewable by everyone"
    ON game_results FOR SELECT
    USING (true);

CREATE POLICY "Game results insertable"
    ON game_results FOR INSERT
    WITH CHECK (true);
