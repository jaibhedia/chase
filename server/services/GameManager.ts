import { supabase } from '../supabase';
import { GAME_CONFIG } from '../config/constants';
import { generateRoomCode } from '../utils/helpers';

/**
 * GameManager - Core business logic for the chase game
 * Manages game state, rooms, players, and game lifecycle
 */

interface Player {
  wallet_address: string;
  player_name: string;
  character_id: number;
  is_ready: boolean;
  is_host: boolean;
  position?: { x: number; y: number };
  score?: number;
}

interface GameRoom {
  room_code: string;
  host_address: string;
  map_id: string;
  game_mode: string;
  status: 'waiting' | 'playing' | 'finished';
  current_players: number;
  max_players: number;
  is_public: boolean;
  created_at?: string;
}

interface GameState {
  roomCode: string;
  startTime: number;
  endTime: number;
  players: Map<string, { x: number; y: number; score: number }>;
  status: 'active' | 'finished';
}

export class GameManager {
  private games = new Map<string, GameState>(); // roomCode -> game state
  private gameTimers = new Map<string, { countdownTimer: NodeJS.Timeout; gameEndTimer: NodeJS.Timeout }>();
  private gameStartTimes = new Map<string, number>();
  private socketManager: any = null; // Will be set by SocketManager

  constructor() {
    this.startMonitoringService();
  }

  setSocketManager(socketManager: any) {
    this.socketManager = socketManager;
  }

  /**
   * Create a new game room
   */
  async createRoom(data: {
    walletAddress: string;
    mapId: string;
    gameMode: string;
    characterId: number;
    playerName: string;
    isPublic?: boolean;
  }) {
    const roomCode = generateRoomCode();
    
    try {
      // Create room in database
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          room_code: roomCode,
          host_id: data.walletAddress, // Required NOT NULL column
          host_address: data.walletAddress, // New column for wallet tracking
          map_id: data.mapId,
          game_mode: data.gameMode,
          status: 'waiting',
          current_players: 1,
          max_players: GAME_CONFIG.MAX_PLAYERS,
          is_public: data.isPublic ?? true
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add host as first player (automatically ready)
      const { error: playerError } = await supabase
        .from('players_in_room')
        .insert({
          room_code: roomCode,
          wallet_address: data.walletAddress,
          player_name: data.playerName,
          character_id: data.characterId,
          is_ready: true, // Host is auto-ready
          is_host: true
        });

      if (playerError) throw playerError;

      console.log(`🎮 Room created: ${roomCode} by ${data.walletAddress}`);
      console.log(`🌐 Public: ${data.isPublic ? 'YES' : 'NO'}`);

      return { roomCode, room };
    } catch (error) {
      console.error('❌ Error creating room:', error);
      throw error;
    }
  }

  /**
   * Join an existing room
   */
  async joinRoom(data: {
    roomCode: string;
    walletAddress: string;
    characterId: number;
    playerName: string;
  }) {
    try {
      // Check if room exists and has space
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', data.roomCode)
        .eq('status', 'waiting')
        .single();

      if (roomError || !room) {
        throw new Error('Room not found or already started');
      }

      if (room.current_players >= GAME_CONFIG.MAX_PLAYERS) {
        throw new Error('Room is full');
      }

      // Check if player already in room
      const { data: existingPlayer } = await supabase
        .from('players_in_room')
        .select('*')
        .eq('room_code', data.roomCode)
        .eq('wallet_address', data.walletAddress)
        .single();

      if (existingPlayer) {
        console.log(`🔄 Player ${data.walletAddress} rejoining room ${data.roomCode}`);
        return { roomCode: data.roomCode, room };
      }

      // Add player to room
      const { error: playerError } = await supabase
        .from('players_in_room')
        .insert({
          room_code: data.roomCode,
          wallet_address: data.walletAddress,
          player_name: data.playerName,
          character_id: data.characterId,
          is_ready: false,
          is_host: false
        });

      if (playerError) throw playerError;

      // Update room player count
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ current_players: room.current_players + 1 })
        .eq('room_code', data.roomCode);

      if (updateError) throw updateError;

      console.log(`➕ Player ${data.walletAddress} joined room ${data.roomCode}`);

      return { roomCode: data.roomCode, room };
    } catch (error) {
      console.error('❌ Error joining room:', error);
      throw error;
    }
  }

  /**
   * Mark player as ready
   */
  async markPlayerReady(roomCode: string, walletAddress: string) {
    try {
      const { error } = await supabase
        .from('players_in_room')
        .update({ is_ready: true })
        .eq('room_code', roomCode)
        .eq('wallet_address', walletAddress);

      if (error) throw error;

      console.log(`✅ Player ${walletAddress} marked ready in ${roomCode}`);

      // Get updated player list
      const { data: players } = await supabase
        .from('players_in_room')
        .select('*')
        .eq('room_code', roomCode);

      const readyCount = players?.filter(p => p.is_ready).length || 0;
      const totalCount = players?.length || 0;

      return {
        readyCount,
        totalCount,
        players: players || []
      };
    } catch (error) {
      console.error('❌ Error marking player ready:', error);
      throw error;
    }
  }

  /**
   * Check if game should auto-start
   */
  shouldAutoStart(players: any[]): boolean {
    const totalCount = players.length;
    const readyCount = players.filter(p => p.is_ready).length;
    
    const roomFull = totalCount >= GAME_CONFIG.MAX_PLAYERS;
    const allReady = readyCount === totalCount && totalCount > 0;

    return roomFull && allReady;
  }

  /**
   * Start the game countdown
   */
  async startGame(roomCode: string) {
    try {
      // Verify all players are ready
      const { data: room } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (!room) throw new Error('Room not found');

      const { data: players } = await supabase
        .from('players_in_room')
        .select('*')
        .eq('room_code', roomCode);

      if (!players || players.length < GAME_CONFIG.MIN_PLAYERS) {
        throw new Error('Not enough players');
      }

      const allReady = players.every(p => p.is_ready);
      if (!allReady) {
        throw new Error('Not all players are ready');
      }

      // Update room status
      const { error } = await supabase
        .from('game_rooms')
        .update({ status: 'playing' })
        .eq('room_code', roomCode);

      if (error) throw error;

      console.log(`🎮 Starting game in room ${roomCode}`);

      // Initialize game state
      const gameState: GameState = {
        roomCode,
        startTime: Date.now() + (GAME_CONFIG.COUNTDOWN_SECONDS * 1000),
        endTime: Date.now() + (GAME_CONFIG.COUNTDOWN_SECONDS * 1000) + GAME_CONFIG.GAME_DURATION,
        players: new Map(),
        status: 'active'
      };

      players.forEach(player => {
        gameState.players.set(player.wallet_address, {
          x: 0,
          y: 0,
          score: 0
        });
      });

      this.games.set(roomCode, gameState);
      this.gameStartTimes.set(roomCode, Date.now());

      return { success: true, gameState };
    } catch (error) {
      console.error('❌ Error starting game:', error);
      throw error;
    }
  }

  /**
   * Update player position during game
   */
  updatePlayerPosition(roomCode: string, walletAddress: string, x: number, y: number) {
    const game = this.games.get(roomCode);
    if (!game) {
      throw new Error('Game not found');
    }

    const player = game.players.get(walletAddress);
    if (player) {
      player.x = x;
      player.y = y;
    }

    return game;
  }

  /**
   * End the game and calculate results
   */
  async endGame(roomCode: string) {
    try {
      const game = this.games.get(roomCode);
      if (!game) {
        console.warn(`⚠️ Game ${roomCode} not found in memory`);
        return;
      }

      game.status = 'finished';

      // Clean up timers
      const timers = this.gameTimers.get(roomCode);
      if (timers) {
        clearTimeout(timers.countdownTimer);
        clearTimeout(timers.gameEndTimer);
        this.gameTimers.delete(roomCode);
      }

      // Update room status
      await supabase
        .from('game_rooms')
        .update({ status: 'finished' })
        .eq('room_code', roomCode);

      // Update player stats
      const players = Array.from(game.players.entries());
      for (const [walletAddress, playerData] of players) {
        await supabase
          .from('player_stats')
          .upsert({
            wallet_address: walletAddress,
            total_games: 1,
            total_score: playerData.score || 0
          }, {
            onConflict: 'wallet_address',
            ignoreDuplicates: false
          });
      }

      console.log(`🏁 Game ended in room ${roomCode}`);

      // Clean up game state
      this.games.delete(roomCode);
      this.gameStartTimes.delete(roomCode);

      return { players };
    } catch (error) {
      console.error('❌ Error ending game:', error);
      throw error;
    }
  }

  /**
   * Leave room
   */
  async leaveRoom(roomCode: string, walletAddress: string) {
    try {
      // Remove player from room
      const { error: deleteError } = await supabase
        .from('players_in_room')
        .delete()
        .eq('room_code', roomCode)
        .eq('wallet_address', walletAddress);

      if (deleteError) throw deleteError;

      // Get remaining players
      const { data: remainingPlayers } = await supabase
        .from('players_in_room')
        .select('*')
        .eq('room_code', roomCode);

      if (!remainingPlayers || remainingPlayers.length === 0) {
        // Delete empty room
        await supabase
          .from('game_rooms')
          .delete()
          .eq('room_code', roomCode);

        console.log(`🗑️ Empty room ${roomCode} deleted`);
      } else {
        // Update player count
        await supabase
          .from('game_rooms')
          .update({ current_players: remainingPlayers.length })
          .eq('room_code', roomCode);

        // If host left, assign new host
        const wasHost = remainingPlayers.every(p => !p.is_host);
        if (wasHost) {
          await supabase
            .from('players_in_room')
            .update({ is_host: true, is_ready: true })
            .eq('room_code', roomCode)
            .eq('wallet_address', remainingPlayers[0].wallet_address);

          console.log(`👑 New host assigned: ${remainingPlayers[0].wallet_address}`);
        }
      }

      console.log(`👋 Player ${walletAddress} left room ${roomCode}`);

      return { success: true };
    } catch (error) {
      console.error('❌ Error leaving room:', error);
      throw error;
    }
  }

  /**
   * Get game state
   */
  getGame(roomCode: string): GameState | undefined {
    return this.games.get(roomCode);
  }

  /**
   * Get room with players
   */
  async getRoom(roomCode: string) {
    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    const { data: players } = await supabase
      .from('players_in_room')
      .select('*')
      .eq('room_code', roomCode);

    return { room, players: players || [] };
  }

  /**
   * Get public rooms
   */
  async getPublicRooms() {
    const { data: publicRooms } = await supabase
      .from('game_rooms')
      .select('room_code, current_players, max_players, map_id, is_public')
      .eq('status', 'waiting')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    return publicRooms || [];
  }

  /**
   * Store game timers
   */
  setGameTimers(roomCode: string, timers: { countdownTimer: NodeJS.Timeout; gameEndTimer: NodeJS.Timeout }) {
    this.gameTimers.set(roomCode, timers);
  }

  /**
   * Monitor for stuck games and cleanup
   */
  private startMonitoringService() {
    setInterval(() => {
      const now = Date.now();
      for (const [roomCode, startTime] of this.gameStartTimes.entries()) {
        if (now - startTime > GAME_CONFIG.MAX_GAME_TIMEOUT) {
          console.log(`⏰ Game ${roomCode} timed out, cleaning up...`);
          this.endGame(roomCode).catch(console.error);
        }
      }
    }, 60000); // Check every minute
  }
}

export const gameManager = new GameManager();
