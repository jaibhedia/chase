'use client';

import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

interface SocketContextType {
  socket: Socket | null;
  createRoom: (data: {
    walletAddress: string;
    mapId: string;
    gameMode: 'single-player' | 'multiplayer';
    characterId: number;
    playerName?: string;
    isPublic?: boolean;
    maxPlayers?: number;
    gameTime?: number;
  }) => Promise<any>;
  joinRoom: (data: {
    roomCode: string;
    walletAddress: string;
    characterId: number;
    playerName?: string;
  }) => Promise<any>;
  setPlayerReady: (isReady: boolean) => void;
  startGame: () => void;
  sendGameState: (roomCode: string, gameState: any) => void;
  sendPlayerInput: (roomCode: string, playerId: string, position: any, velocity: any) => void;
  sendGameFinished: (roomCode: string, results: any) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Only create socket once when provider mounts
    if (!socketRef.current) {
      console.log('🔌 Creating persistent socket connection to:', SOCKET_URL);
      
      socketRef.current = io(SOCKET_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('✅ Connected to game server:', socket.id);
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from game server:', reason);
        // Auto-reconnect if disconnected
        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      socket.on('error', (error: any) => {
        console.error('❌ Socket error:', error?.message || error);
      });

      // DEBUG: Log ALL incoming events
      socket.onAny((eventName, ...args) => {
        console.log('📩 Received event:', eventName, args);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt', attemptNumber);
      });

      socket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error?.message);
      });

      socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after max attempts');
      });
    }

    // NEVER disconnect - socket persists for entire app lifetime
    return () => {
      console.log('⚠️ SocketProvider unmounting - this should only happen on app exit');
      // Don't disconnect here either - let browser handle cleanup
    };
  }, []);

  const createRoom = (data: {
    walletAddress: string;
    mapId: string;
    gameMode: 'single-player' | 'multiplayer';
    characterId: number;
    playerName?: string;
    isPublic?: boolean;
  }) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('📤 Emitting create-room:', data);
      
      // Set a timeout in case backend doesn't respond
      const timeout = setTimeout(() => {
        console.log('⏰ Create room timeout - cleaning up listeners');
        socketRef.current?.off('room-created');
        socketRef.current?.off('error');
        reject(new Error('Create room timeout - no response from server'));
      }, 10000);

      socketRef.current.once('room-created', (response) => {
        clearTimeout(timeout);
        console.log('📥 Received room-created:', response);
        socketRef.current?.off('error');
        resolve(response);
      });

      socketRef.current.once('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Room creation error:', error);
        socketRef.current?.off('room-created');
        reject(error);
      });

      socketRef.current.emit('create-room', data);
    });
  };

  const joinRoom = (data: {
    roomCode: string;
    walletAddress: string;
    characterId: number;
    playerName?: string;
  }) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('📤 Emitting join-room:', data);
      
      // Set a timeout in case backend doesn't respond
      const timeout = setTimeout(() => {
        console.log('⏰ Join room timeout - cleaning up listeners');
        socketRef.current?.off('room-joined');
        socketRef.current?.off('player-joined');
        socketRef.current?.off('error');
        reject(new Error('Join room timeout - no response from server'));
      }, 10000);

      // Listen for BOTH possible response events from backend
      const handleSuccess = (response: any) => {
        clearTimeout(timeout);
        console.log('📥 Received join response:', response);
        socketRef.current?.off('room-joined');
        socketRef.current?.off('player-joined');
        socketRef.current?.off('error');
        resolve(response);
      };

      socketRef.current.once('room-joined', handleSuccess);
      socketRef.current.once('player-joined', handleSuccess); // Fallback if backend sends this

      socketRef.current.once('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Room join error:', error);
        socketRef.current?.off('room-joined');
        socketRef.current?.off('player-joined');
        reject(error);
      });

      socketRef.current.emit('join-room', data);
    });
  };

  const setPlayerReady = (isReady: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit('set-ready', { isReady });
    }
  };

  const startGame = () => {
    if (socketRef.current) {
      socketRef.current.emit('start-game');
    }
  };

  const sendGameState = (roomCode: string, gameState: any) => {
    if (socketRef.current) {
      socketRef.current.emit('game-state-update', { roomCode, gameState });
    }
  };

  const sendPlayerInput = (roomCode: string, playerId: string, position: any, velocity: any) => {
    if (socketRef.current) {
      socketRef.current.emit('player-input', { 
        roomCode, 
        playerId, 
        position, 
        velocity 
      });
    }
  };

  const sendGameFinished = (roomCode: string, results: any) => {
    if (socketRef.current) {
      socketRef.current.emit('game-finished', { roomCode, results });
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket: socketRef.current,
      createRoom,
      joinRoom,
      setPlayerReady,
      startGame,
      sendGameState,
      sendPlayerInput,
      sendGameFinished,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}
