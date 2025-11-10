import { Server, Socket } from 'socket.io';
import { GameManager } from './GameManager';

/**
 * SocketManager - Pure real-time multiplayer communication
 * All game state is in GameManager, this just handles Socket.IO events
 */

export class SocketManager {
  private io: Server;
  private gameManager: GameManager;

  constructor(io: Server, gameManager: GameManager) {
    this.io = io;
    this.gameManager = gameManager;
    this.gameManager.setSocketManager(this);
    this.setupSocketHandlers();
    console.log('🔌 SocketManager initialized');
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Room management
      socket.on('create-room', (data) => this.handleCreateRoom(socket, data));
      socket.on('join-room', (data) => this.handleJoinRoom(socket, data));
      socket.on('player-ready', (data) => this.handlePlayerReady(socket, data));
      
      // Disconnection
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  /**
   * Create room
   */
  private handleCreateRoom(socket: Socket, data: any) {
    try {
      console.log('📤 create-room:', data);

      const roomCode = this.gameManager.createRoom({
        socketId: socket.id,
        walletAddress: data.walletAddress,
        mapId: data.mapId,
        characterId: data.characterId,
        playerName: data.playerName
      });

      // Join socket.io room
      socket.join(`room-${roomCode}`);

      // Send response
      socket.emit('room-created', { roomCode });

      // Broadcast to room
      this.broadcastRoomState(roomCode);

      console.log(`✅ Room created: ${roomCode}`);
    } catch (error: any) {
      console.error('❌ Create room error:', error);
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Join room
   */
  private handleJoinRoom(socket: Socket, data: any) {
    try {
      console.log('📤 join-room:', data);

      const room = this.gameManager.joinRoom({
        socketId: socket.id,
        walletAddress: data.walletAddress,
        roomCode: data.roomCode,
        characterId: data.characterId,
        playerName: data.playerName
      });

      // Join socket.io room
      socket.join(`room-${data.roomCode}`);

      // Send response
      socket.emit('room-joined', { roomCode: data.roomCode });

      // Broadcast to all in room
      this.broadcastRoomState(data.roomCode);

      console.log(`✅ Player joined: ${data.playerName} -> ${data.roomCode}`);
    } catch (error: any) {
      console.error('❌ Join room error:', error);
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Player ready
   */
  private handlePlayerReady(socket: Socket, data: any) {
    try {
      console.log('📤 player-ready:', socket.id);

      const room = this.gameManager.markPlayerReady(socket.id);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Broadcast to room
      this.broadcastRoomState(room.roomCode);

      // Check if all ready
      if (this.gameManager.areAllPlayersReady(room.roomCode)) {
        console.log(`🎮 All players ready in ${room.roomCode}`);
        
        // Start game
        if (this.gameManager.startGame(room.roomCode)) {
          // Broadcast game start
          const startTime = Date.now() + 3000;
          this.io.to(`room-${room.roomCode}`).emit('game-starting', {
            startTime,
            countdown: 3
          });

          console.log(`🚀 Game starting in ${room.roomCode}`);
        }
      }
    } catch (error: any) {
      console.error('❌ Player ready error:', error);
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(socket: Socket) {
    const result = this.gameManager.handleDisconnect(socket.id);
    
    if (result) {
      console.log(`👋 Client disconnected: ${socket.id}`);
      this.broadcastRoomState(result.roomCode);
    } else {
      console.log(`👋 Client disconnected: ${socket.id} (no active room)`);
    }
  }

  /**
   * Broadcast room state to all players in room
   */
  public broadcastRoomState(roomCode: string) {
    const room = this.gameManager.getRoom(roomCode);
    if (!room) return;

    const players = Array.from(room.players.values()).map(p => ({
      walletAddress: p.walletAddress,
      playerName: p.playerName,
      characterId: p.characterId,
      isReady: p.isReady,
      isHost: p.isHost,
      isConnected: p.isConnected
    }));

    this.io.to(`room-${roomCode}`).emit('room-state', {
      roomCode: room.roomCode,
      hostAddress: room.hostAddress,
      mapId: room.mapId,
      status: room.status,
      players,
      maxPlayers: room.maxPlayers,
      currentPlayers: room.players.size
    });
  }

  /**
   * Broadcast to specific player
   */
  public emitToPlayer(walletAddress: string, event: string, data: any) {
    // Not implemented yet - need to track wallet -> socket mapping
  }
}
