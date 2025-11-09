'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to game server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from game server');
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return socketRef.current;
}

// Helper hook for multiplayer game room
export function useGameRoom() {
  const socket = useSocket();

  const createRoom = (data: {
    walletAddress: string;
    mapId: string;
    gameMode: 'single-player' | 'multiplayer';
    characterId: number;
    playerName?: string;
  }) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('create-room', data);

      socket.once('room-created', (response) => {
        resolve(response);
      });

      socket.once('error', (error) => {
        reject(error);
      });
    });
  };

  const joinRoom = (data: {
    roomCode: string;
    walletAddress: string;
    characterId: number;
    playerName?: string;
  }) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('join-room', data);

      socket.once('player-joined', (response) => {
        resolve(response);
      });

      socket.once('error', (error) => {
        reject(error);
      });
    });
  };

  const setPlayerReady = (roomCode: string, walletAddress: string) => {
    if (socket) {
      socket.emit('player-ready', { roomCode, walletAddress });
    }
  };

  const sendGameState = (roomCode: string, gameState: any) => {
    if (socket) {
      socket.emit('game-state-update', { roomCode, gameState });
    }
  };

  const sendPlayerInput = (roomCode: string, input: any) => {
    if (socket) {
      socket.emit('player-input', { roomCode, input });
    }
  };

  const sendGameFinished = (roomCode: string, results: any) => {
    if (socket) {
      socket.emit('game-finished', { roomCode, results });
    }
  };

  return {
    socket,
    createRoom,
    joinRoom,
    setPlayerReady,
    sendGameState,
    sendPlayerInput,
    sendGameFinished,
  };
}
