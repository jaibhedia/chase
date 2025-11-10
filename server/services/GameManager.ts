import { supabase } from '../supabase';
import { GAME_CONFIG } from '../config/constants';
import { generateRoomCode } from '../utils/helpers';

/**
 * GameManager - Pure in-memory multiplayer game state management
 * Database is only used for persistence, NOT for game logic
 */

interface Player {
  socketId: string;
  walletAddress: string;
  playerName: string;
  characterId: number;
  isReady: boolean;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: number;
}

interface Room {
  roomCode: string;
  hostAddress: string;
  mapId: string;
  players: Map<string, Player>; // walletAddress -> Player
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  maxPlayers: number;
  createdAt: number;
  startTime?: number;
}

export class GameManager {
  // IN-MEMORY STATE - Source of truth
  private rooms = new Map<string, Room>();
  private playerToRoom = new Map<string, string>(); // walletAddress -> roomCode
  private socketToWallet = new Map<string, string>(); // socketId -> walletAddress
  
  private socketManager: any = null;

  constructor() {
    console.log('🎮 GameManager initialized (in-memory mode)');
  }

  setSocketManager(socketManager: any) {
    this.socketManager = socketManager;
  }

  /**
   * Create a new room - Pure in-memory
   */
  createRoom(data: {
    socketId: string;
    walletAddress: string;
    mapId: string;
    characterId: number;
    playerName: string;
  }): string {
    const roomCode = generateRoomCode();
    
    // Create room in memory
    const room: Room = {
      roomCode,
      hostAddress: data.walletAddress,
      mapId: data.mapId,
      players: new Map(),
      status: 'waiting',
      maxPlayers: GAME_CONFIG.MAX_PLAYERS,
      createdAt: Date.now()
    };

    // Add host as first player
    const hostPlayer: Player = {
      socketId: data.socketId,
      walletAddress: data.walletAddress,
      playerName: data.playerName,
      characterId: data.characterId,
      isReady: true, // Host is auto-ready
      isHost: true,
      isConnected: true,
      joinedAt: Date.now()
    };

    room.players.set(data.walletAddress, hostPlayer);
    this.rooms.set(roomCode, room);
    this.playerToRoom.set(data.walletAddress, roomCode);
    this.socketToWallet.set(data.socketId, data.walletAddress);

    // Persist to database (async, non-blocking)
    this.persistRoomToDatabase(room).catch(err => 
      console.error('Database persist error (non-critical):', err)
    );

    console.log(`✅ Room ${roomCode} created by ${data.playerName} (${room.players.size}/${room.maxPlayers})`);
    
    return roomCode;
  }

  /**
   * Join existing room - Pure in-memory
   */
  joinRoom(data: {
    socketId: string;
    walletAddress: string;
    roomCode: string;
    characterId: number;
    playerName: string;
  }): Room {
    const room = this.rooms.get(data.roomCode);
    
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'waiting') {
      throw new Error('Game already started');
    }

    if (room.players.size >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    // Check if player already in room (reconnection)
    const existingPlayer = room.players.get(data.walletAddress);
    if (existingPlayer) {
      existingPlayer.socketId = data.socketId;
      existingPlayer.isConnected = true;
      this.socketToWallet.set(data.socketId, data.walletAddress);
      console.log(`🔄 ${data.playerName} reconnected to ${data.roomCode}`);
      return room;
    }

    // Add new player
    const player: Player = {
      socketId: data.socketId,
      walletAddress: data.walletAddress,
      playerName: data.playerName,
      characterId: data.characterId,
      isReady: false,
      isHost: false,
      isConnected: true,
      joinedAt: Date.now()
    };

    room.players.set(data.walletAddress, player);
    this.playerToRoom.set(data.walletAddress, data.roomCode);
    this.socketToWallet.set(data.socketId, data.walletAddress);

    console.log(`➕ ${data.playerName} joined ${data.roomCode} (${room.players.size}/${room.maxPlayers})`);
    
    return room;
  }

  /**
   * Mark player as ready
   */
  markPlayerReady(socketId: string): Room | null {
    const walletAddress = this.socketToWallet.get(socketId);
    if (!walletAddress) return null;

    const roomCode = this.playerToRoom.get(walletAddress);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.get(walletAddress);
    if (!player) return null;

    player.isReady = true;
    console.log(`✅ ${player.playerName} is ready in ${roomCode}`);

    return room;
  }

  /**
   * Get room state
   */
  getRoom(roomCode: string): Room | null {
    return this.rooms.get(roomCode) || null;
  }

  /**
   * Get all players in room
   */
  getRoomPlayers(roomCode: string): Player[] {
    const room = this.rooms.get(roomCode);
    if (!room) return [];
    return Array.from(room.players.values());
  }

  /**
   * Check if all players are ready
   */
  areAllPlayersReady(roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || room.players.size < GAME_CONFIG.MIN_PLAYERS) return false;
    
    return Array.from(room.players.values()).every(p => p.isReady);
  }

  /**
   * Start game
   */
  startGame(roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    if (room.status !== 'waiting') return false;
    if (room.players.size < GAME_CONFIG.MIN_PLAYERS) return false;

    room.status = 'countdown';
    room.startTime = Date.now() + 3000; // 3 second countdown

    console.log(`🎮 Game starting in ${roomCode} with ${room.players.size} players`);

    // Auto-transition to playing after countdown
    setTimeout(() => {
      if (room.status === 'countdown') {
        room.status = 'playing';
        console.log(`▶️ Game ${roomCode} is now playing`);
      }
    }, 3000);

    return true;
  }

  /**
   * Handle player disconnect
   */
  handleDisconnect(socketId: string): { roomCode: string; room: Room } | null {
    const walletAddress = this.socketToWallet.get(socketId);
    if (!walletAddress) return null;

    const roomCode = this.playerToRoom.get(walletAddress);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.get(walletAddress);
    if (!player) return null;

    // Mark as disconnected but don't remove (60s grace period)
    player.isConnected = false;
    console.log(`👋 ${player.playerName} disconnected from ${roomCode}`);

    // If game hasn't started, remove player after 10s
    if (room.status === 'waiting') {
      setTimeout(() => {
        if (!player.isConnected && room.status === 'waiting') {
          room.players.delete(walletAddress);
          this.playerToRoom.delete(walletAddress);
          this.socketToWallet.delete(socketId);
          console.log(`❌ ${player.playerName} removed from ${roomCode} (timeout)`);
          
          // If room is empty, delete it
          if (room.players.size === 0) {
            this.rooms.delete(roomCode);
            console.log(`🗑️ Room ${roomCode} deleted (empty)`);
          }
        }
      }, 10000);
    }

    return { roomCode, room };
  }

  /**
   * Persist room to database (async, non-blocking)
   */
  private async persistRoomToDatabase(room: Room): Promise<void> {
    try {
      await supabase.from('game_rooms').insert({
        room_code: room.roomCode,
        host_id: room.hostAddress,
        map_id: room.mapId,
        status: room.status,
        current_players: room.players.size,
        max_players: room.maxPlayers,
      });
    } catch (error) {
      // Non-critical, just log
      console.error('Database persistence failed:', error);
    }
  }

  /**
   * Get room by socket ID
   */
  getRoomBySocketId(socketId: string): Room | null {
    const walletAddress = this.socketToWallet.get(socketId);
    if (!walletAddress) return null;

    const roomCode = this.playerToRoom.get(walletAddress);
    if (!roomCode) return null;

    return this.rooms.get(roomCode) || null;
  }

  /**
   * Debug: Get all rooms
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }
}
