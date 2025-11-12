import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface Game {
  id: string;
  room_code: string;
  host_id: string;
  settings: GameSettings;
  state: any;
  status: 'waiting' | 'starting' | 'in-progress' | 'finished';
  created_at: string;
  started_at?: string;
  finished_at?: string;
  updated_at: string;
}

export interface GameSettings {
  mapId: string;
  gameMode: 'single-player' | 'multiplayer';
  maxPlayers: number;
  isPublic: boolean;
  gameTime: number;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  player_id: string;
  player_name?: string;
  character_id: number;
  is_host: boolean;
  player_state: any;
  score: number;
  joined_at: string;
  updated_at: string;
}

export interface GameEvent {
  id: string;
  game_id: string;
  event_type: string;
  event_data: any;
  timestamp: string;
}

export interface PlayerStats {
  id: string;
  player_id: string;
  player_name?: string;
  total_games: number;
  wins: number;
  total_tags: number;
  avg_tags_per_game: number;
  power_ups_used: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Get game details by room code
 */
export async function getGameByRoomCode(roomCode: string): Promise<Game | null> {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching game:', error);
    return null;
  }
}

/**
 * Get players in a game
 */
export async function getGamePlayers(roomCode: string): Promise<GamePlayer[]> {
  try {
    const game = await getGameByRoomCode(roomCode);
    if (!game) return [];

    const { data, error } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', game.id);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching game players:', error);
    return [];
  }
}

/**
 * Get player statistics
 */
export async function getPlayerStats(playerId: string): Promise<PlayerStats | null> {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return null;
  }
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit = 10): Promise<PlayerStats[]> {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .order('wins', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

/**
 * Get player match history
 */
export async function getPlayerMatchHistory(playerId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('game_players')
      .select(`
        *,
        games (*)
      `)
      .eq('player_id', playerId)
      .order('joined_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching match history:', error);
    return [];
  }
}

/**
 * Subscribe to real-time game updates
 */
export function subscribeToGame(
  roomCode: string,
  onUpdate: (game: Game) => void
) {
  return supabase
    .channel(`game:${roomCode}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `room_code=eq.${roomCode}`
      },
      (payload) => {
        if (payload.new) {
          onUpdate(payload.new as Game);
        }
      }
    )
    .subscribe();
}

/**
 * Subscribe to real-time player updates in a game
 */
export function subscribeToGamePlayers(
  gameId: string,
  onUpdate: (players: GamePlayer[]) => void
) {
  return supabase
    .channel(`game_players:${gameId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameId}`
      },
      async () => {
        // Fetch all players when any change occurs
        const { data } = await supabase
          .from('game_players')
          .select('*')
          .eq('game_id', gameId);
        
        if (data) {
          onUpdate(data as GamePlayer[]);
        }
      }
    )
    .subscribe();
}

