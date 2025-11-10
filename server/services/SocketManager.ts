import { Server, Socket } from 'socket.io';
import { GameManager } from './GameManager';
import { SOCKET_CONFIG, GAME_CONFIG } from '../config/constants';
import { rateLimiter } from '../utils/rateLimiter';
import {
  CreateRoomSchema,
  JoinRoomSchema,
  PlayerReadySchema,
  StartGameSchema,
  PlayerPositionSchema,
  LeaveRoomSchema
} from '../config/validation';
import { supabase } from '../supabase';

/**
 * SocketManager - Handles all real-time Socket.IO communication
 * Manages player connections, disconnections, and game events
 */

export class SocketManager {
  private io: Server;
  private gameManager: GameManager;
  private playerSockets = new Map<string, Socket>(); // walletAddress -> socket
  private socketGames = new Map<string, string>(); // socketId -> roomCode
  private disconnectTimers = new Map<string, NodeJS.Timeout>(); // walletAddress -> timeout

  constructor(io: Server, gameManager: GameManager) {
    this.io = io;
    this.gameManager = gameManager;
    this.gameManager.setSocketManager(this);
    this.setupSocketHandlers();
  }

  /**
   * Setup all socket event handlers
   */
  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Room management
      socket.on('create-room', (data) => this.handleCreateRoom(socket, data));
      socket.on('join-room', (data) => this.handleJoinRoom(socket, data));
      socket.on('leave-room', (data) => this.handleLeaveRoom(socket, data));
      
      // Game flow
      socket.on('player-ready', (data) => this.handlePlayerReady(socket, data));
      socket.on('start-game', (data) => this.handleStartGame(socket, data));
      
      // Gameplay
      socket.on('player-position', (data) => this.handlePlayerPosition(socket, data));
      
      // Public rooms
      socket.on('get-public-rooms', () => this.handleGetPublicRooms(socket));
      
      // Connection management
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  /**
   * Handle room creation
   */
  private async handleCreateRoom(socket: Socket, data: any) {
    try {
      // Rate limiting
      if (!rateLimiter.checkLimit(socket.id, 'create-room', 3, 60000)) {
        socket.emit('error', { message: 'Rate limit exceeded for room creation' });
        return;
      }

      // Validation
      const validated = CreateRoomSchema.parse(data);

      // Create room
      const result = await this.gameManager.createRoom(validated);

      // Join socket room
      socket.join(`room-${result.roomCode}`);
      this.playerSockets.set(validated.walletAddress, socket);
      this.socketGames.set(socket.id, result.roomCode);

      // Send response
      socket.emit('room-created', {
        roomCode: result.roomCode,
        room: result.room
      });

      // Broadcast public rooms update
      await this.broadcastPublicRooms();

      console.log(`✅ Room ${result.roomCode} created by ${validated.walletAddress}`);
    } catch (error: any) {
      console.error('❌ Error creating room:', error);
      socket.emit('error', { 
        message: error.message || 'Failed to create room',
        code: 'CREATE_ROOM_ERROR'
      });
    }
  }

  /**
   * Handle player joining room
   */
  private async handleJoinRoom(socket: Socket, data: any) {
    try {
      // Rate limiting
      if (!rateLimiter.checkLimit(socket.id, 'join-room', 5, 5000)) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      // Validation
      const validated = JoinRoomSchema.parse(data);

      // Cancel any pending disconnect timer (player reconnecting)
      if (this.disconnectTimers.has(validated.walletAddress)) {
        console.log(`🔄 Player ${validated.walletAddress} reconnected - canceling disconnect timer`);
        clearTimeout(this.disconnectTimers.get(validated.walletAddress));
        this.disconnectTimers.delete(validated.walletAddress);

        // Notify other players of reconnection
        socket.to(`room-${validated.roomCode}`).emit('game-update', {
          type: 'player-reconnected',
          walletAddress: validated.walletAddress,
          timestamp: Date.now()
        });
      }

      // Join room
      const result = await this.gameManager.joinRoom(validated);

      // Join socket room
      socket.join(`room-${validated.roomCode}`);
      this.playerSockets.set(validated.walletAddress, socket);
      this.socketGames.set(socket.id, validated.roomCode);

      // Get current room state
      const { room, players } = await this.gameManager.getRoom(validated.roomCode);

      // Send response to joining player
      socket.emit('room-joined', {
        roomCode: validated.roomCode,
        room,
        players
      });

      // Broadcast to other players
      this.io.in(`room-${validated.roomCode}`).emit('player-joined', {
        players,
        currentPlayers: players.length,
        walletAddress: validated.walletAddress
      });

      // Broadcast updated room state
      await this.broadcastRoomUpdate(validated.roomCode);
      await this.broadcastPublicRooms();

      console.log(`✅ Player ${validated.walletAddress} joined room ${validated.roomCode}`);
    } catch (error: any) {
      console.error('❌ Error joining room:', error);
      socket.emit('error', { 
        message: error.message || 'Failed to join room',
        code: 'JOIN_ROOM_ERROR'
      });
    }
  }

  /**
   * Handle player ready
   */
  private async handlePlayerReady(socket: Socket, data: any) {
    try {
      // Rate limiting
      if (!rateLimiter.checkLimit(socket.id, 'player-ready', 10, 1000)) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      // Validation
      const validated = PlayerReadySchema.parse(data);

      // Mark player as ready
      const result = await this.gameManager.markPlayerReady(
        validated.roomCode,
        validated.walletAddress
      );

      console.log(`✅ Player ready: ${validated.walletAddress} in ${validated.roomCode}`);
      console.log(`   Ready: ${result.readyCount}/${result.totalCount}`);
      console.log(`   Broadcasting player list:`, JSON.stringify(result.players.map(p => ({
        wallet: p.wallet_address.slice(0, 8),
        ready: p.is_ready,
        character: p.character_id,
        name: p.player_name
      }))));

      // Broadcast to all players in room
      this.io.in(`room-${validated.roomCode}`).emit('player-ready-update', {
        players: result.players,
        readyCount: result.readyCount,
        totalCount: result.totalCount
      });

      // Broadcast room update
      await this.broadcastRoomUpdate(validated.roomCode);

      // Check if game should auto-start (4/4 players ready)
      if (this.gameManager.shouldAutoStart(result.players)) {
        console.log(`🎮 Auto-starting game ${validated.roomCode} (${result.totalCount}/${GAME_CONFIG.MAX_PLAYERS} ready)`);
        
        // Emit game-starting event
        this.io.in(`room-${validated.roomCode}`).emit('game-starting', {
          countdown: GAME_CONFIG.COUNTDOWN_SECONDS
        });

        // Start countdown timer
        const countdownTimer = setTimeout(async () => {
          try {
            const gameState = await this.gameManager.startGame(validated.roomCode);
            
            // Emit game-started event with initial state
            this.io.in(`room-${validated.roomCode}`).emit('game-started', {
              gameState: gameState.gameState,
              startTime: gameState.gameState?.startTime,
              endTime: gameState.gameState?.endTime
            });

            console.log(`🎮 Game started in room ${validated.roomCode}`);
          } catch (error) {
            console.error('❌ Error starting game:', error);
            this.io.in(`room-${validated.roomCode}`).emit('error', {
              message: 'Failed to start game'
            });
          }
        }, GAME_CONFIG.COUNTDOWN_SECONDS * 1000);

        // Store countdown timer
        const gameEndTimer = setTimeout(async () => {
          console.log(`🏁 Game time ended in room ${validated.roomCode}`);
          await this.handleGameEnd(validated.roomCode);
        }, (GAME_CONFIG.COUNTDOWN_SECONDS * 1000) + GAME_CONFIG.GAME_DURATION);

        // Store timers for cleanup
        this.gameManager.setGameTimers(validated.roomCode, {
          countdownTimer,
          gameEndTimer
        });
      }
    } catch (error: any) {
      console.error('❌ Error marking player ready:', error);
      socket.emit('error', { 
        message: error.message || 'Failed to mark ready',
        code: 'PLAYER_READY_ERROR'
      });
    }
  }

  /**
   * Handle manual game start (host only)
   */
  private async handleStartGame(socket: Socket, data: any) {
    try {
      // Rate limiting
      if (!rateLimiter.checkLimit(socket.id, 'start-game', 3, 5000)) {
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }

      // Validation
      const validated = StartGameSchema.parse(data);

      // Start game
      const result = await this.gameManager.startGame(validated.roomCode);

      // Emit to all players
      this.io.in(`room-${validated.roomCode}`).emit('game-started', {
        gameState: result.gameState,
        startTime: result.gameState.startTime,
        endTime: result.gameState.endTime
      });

      console.log(`🎮 Game manually started in room ${validated.roomCode}`);
    } catch (error: any) {
      console.error('❌ Error starting game:', error);
      socket.emit('error', { 
        message: error.message || 'Failed to start game',
        code: 'START_GAME_ERROR'
      });
    }
  }

  /**
   * Handle player position updates
   */
  private handlePlayerPosition(socket: Socket, data: any) {
    try {
      // Rate limiting (allow more frequent position updates)
      if (!rateLimiter.checkLimit(socket.id, 'player-position', 60, 1000)) {
        return; // Silently drop - don't spam error messages
      }

      // Validation
      const validated = PlayerPositionSchema.parse(data);

      // Update position
      const game = this.gameManager.updatePlayerPosition(
        validated.roomCode,
        validated.walletAddress,
        validated.x,
        validated.y
      );

      // Broadcast to other players (excluding sender)
      socket.to(`room-${validated.roomCode}`).emit('player-moved', {
        walletAddress: validated.walletAddress,
        x: validated.x,
        y: validated.y
      });
    } catch (error: any) {
      // Silently handle position errors - they're frequent
      if (error.message !== 'Game not found') {
        console.error('❌ Error updating position:', error);
      }
    }
  }

  /**
   * Handle player leaving room
   */
  private async handleLeaveRoom(socket: Socket, data: any) {
    try {
      // Validation
      const validated = LeaveRoomSchema.parse(data);

      // Leave room
      await this.gameManager.leaveRoom(validated.roomCode, validated.walletAddress);

      // Leave socket room
      socket.leave(`room-${validated.roomCode}`);
      this.playerSockets.delete(validated.walletAddress);
      this.socketGames.delete(socket.id);

      // Get updated room state
      const { room, players } = await this.gameManager.getRoom(validated.roomCode);

      // Broadcast to remaining players
      if (players && players.length > 0) {
        this.io.in(`room-${validated.roomCode}`).emit('player-left', {
          walletAddress: validated.walletAddress,
          players,
          currentPlayers: players.length
        });

        await this.broadcastRoomUpdate(validated.roomCode);
      }

      // Broadcast public rooms update
      await this.broadcastPublicRooms();

      console.log(`👋 Player ${validated.walletAddress} left room ${validated.roomCode}`);
    } catch (error: any) {
      console.error('❌ Error leaving room:', error);
      socket.emit('error', { 
        message: error.message || 'Failed to leave room',
        code: 'LEAVE_ROOM_ERROR'
      });
    }
  }

  /**
   * Handle disconnect with grace period
   */
  private async handleDisconnect(socket: Socket) {
    const roomCode = this.socketGames.get(socket.id);
    if (!roomCode) {
      console.log(`👋 Client disconnected: ${socket.id} (no active room)`);
      return;
    }

    // Find player address
    let playerAddress: string | null = null;
    for (const [address, sock] of this.playerSockets.entries()) {
      if (sock.id === socket.id) {
        playerAddress = address;
        break;
      }
    }

    if (!playerAddress) {
      console.log(`👋 Client disconnected: ${socket.id} (no player address found)`);
      return;
    }

    const { room } = await this.gameManager.getRoom(roomCode);

    // Only use grace period for active games (not lobby/waiting)
    if (room && room.status === 'playing') {
      console.log(`⏳ Player ${playerAddress} disconnected from active game ${roomCode} - starting ${SOCKET_CONFIG.DISCONNECT_GRACE_PERIOD / 1000}s grace period`);

      // Notify other players of temporary disconnect
      this.io.to(`room-${roomCode}`).emit('game-update', {
        type: 'player-disconnected-temporary',
        walletAddress: playerAddress,
        gracePeriod: SOCKET_CONFIG.DISCONNECT_GRACE_PERIOD,
        timestamp: Date.now()
      });

      // Start grace period timer
      const timer = setTimeout(async () => {
        console.log(`❌ Player ${playerAddress} did not reconnect within grace period - removing from game`);

        try {
          // Remove player
          await this.gameManager.leaveRoom(roomCode, playerAddress!);

          // Notify all players
          this.io.to(`room-${roomCode}`).emit('game-update', {
            type: 'player-afk',
            walletAddress: playerAddress,
            timestamp: Date.now()
          });

          await this.broadcastRoomUpdate(roomCode);
        } catch (error) {
          console.error(`❌ Error handling AFK player ${playerAddress}:`, error);
        }

        // Cleanup
        this.disconnectTimers.delete(playerAddress!);
        this.playerSockets.delete(playerAddress!);
      }, SOCKET_CONFIG.DISCONNECT_GRACE_PERIOD);

      // Store timer for potential cancellation on reconnect
      this.disconnectTimers.set(playerAddress, timer);
    } else {
      // Lobby phase - remove immediately
      console.log(`👋 Player ${playerAddress} disconnected from lobby ${roomCode} - removing immediately`);
      this.playerSockets.delete(playerAddress);
      
      socket.to(`room-${roomCode}`).emit('game-update', {
        type: 'player-disconnected',
        walletAddress: playerAddress,
        timestamp: Date.now()
      });
    }

    this.socketGames.delete(socket.id);
  }

  /**
   * Get public rooms
   */
  private async handleGetPublicRooms(socket: Socket) {
    try {
      const publicRooms = await this.gameManager.getPublicRooms();
      socket.emit('public-rooms-list', publicRooms);
    } catch (error) {
      console.error('❌ Error getting public rooms:', error);
      socket.emit('public-rooms-list', []);
    }
  }

  /**
   * Broadcast updated room state
   */
  private async broadcastRoomUpdate(roomCode: string) {
    try {
      const { room, players } = await this.gameManager.getRoom(roomCode);
      
      if (room && players) {
        const readyPlayers = players.filter(p => p.is_ready).length;
        
        this.io.in(`room-${roomCode}`).emit('room-update', {
          room,
          players,
          readyPlayers
        });
      }
    } catch (error) {
      console.error('❌ Error broadcasting room update:', error);
    }
  }

  /**
   * Broadcast public rooms to all clients
   */
  private async broadcastPublicRooms() {
    try {
      const publicRooms = await this.gameManager.getPublicRooms();
      console.log(`📡 Broadcasting ${publicRooms.length} public rooms`);
      this.io.emit('public-rooms-list', publicRooms);
    } catch (error) {
      console.error('❌ Error broadcasting public rooms:', error);
      this.io.emit('public-rooms-list', []);
    }
  }

  /**
   * Handle game end
   */
  private async handleGameEnd(roomCode: string) {
    try {
      const result = await this.gameManager.endGame(roomCode);
      
      // Emit results to all players
      this.io.in(`room-${roomCode}`).emit('game-ended', {
        players: result?.players || [],
        timestamp: Date.now()
      });

      console.log(`🏁 Game ended in room ${roomCode}`);
    } catch (error) {
      console.error('❌ Error handling game end:', error);
    }
  }

  /**
   * Emit game state update to room
   */
  emitGameStateUpdate(roomCode: string) {
    const game = this.gameManager.getGame(roomCode);
    if (game) {
      this.io.in(`room-${roomCode}`).emit('game-state-update', {
        game,
        timestamp: Date.now()
      });
    }
  }
}
