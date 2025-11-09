import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface GameRoom {
  id: string;
  room_code: string;
  host_id: string;
  map_id: string;
  game_mode: 'single-player' | 'multiplayer';
  status: 'waiting' | 'starting' | 'in-progress' | 'finished';
  min_players: number;
  max_players: number;
  current_players: number;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface PlayerInRoom {
  id: string;
  room_id: string;
  wallet_address: string;
  character_id: number;
  player_name?: string;
  is_ready: boolean;
  joined_at: string;
}

export interface GameState {
  id: string;
  room_id: string;
  game_data: any; // JSON object containing full game state
  updated_at: string;
}

export interface PlayerStats {
  id: string;
  wallet_address: string;
  total_games: number;
  wins: number;
  total_tags: number;
  avg_tags_per_game: number;
  power_ups_used: number;
  created_at: string;
  updated_at: string;
}
