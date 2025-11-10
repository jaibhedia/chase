'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { initializeGame } from '../utils/gameEngine';
import { useSocket } from '../providers/SocketProvider';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { selectedMap, gameMode, serverStartTime, setPlayers } = useGameStore();
  const { socket } = useSocket();
  const gameInitializedRef = useRef(false);

  // Reset gameInitializedRef when component mounts (for fresh starts)
  useEffect(() => {
    return () => {
      // Reset on unmount so next game can initialize fresh
      gameInitializedRef.current = false;
      console.log('🧹 GameCanvas unmounted - reset gameInitializedRef');
    };
  }, []);

  // Listen for multiplayer game state updates
  useEffect(() => {
    if (gameMode !== 'multiplayer' || !socket) {
      if (gameMode === 'multiplayer' && !socket) {
        console.log('⏳ Multiplayer mode but socket not ready yet...');
      }
      return;
    }

    console.log('🎮 Setting up GameCanvas socket listeners for multiplayer');

    // Listen for other players' positions and states
    const handleGameStateUpdate = ({ players: serverPlayers }: any) => {
      if (serverPlayers && Array.isArray(serverPlayers)) {
        console.log('📡 Received player data:', serverPlayers.length, 'players');
        setPlayers(serverPlayers);
      }
    };

    const handlePlayerUpdate = ({ playerId, position, state }: any) => {
      const store = useGameStore.getState();
      store.updatePlayer(playerId, { ...position, ...state });
    };

    socket.on('game-state-update', handleGameStateUpdate);
    socket.on('player-update', handlePlayerUpdate);

    return () => {
      console.log('🧹 Cleaning up GameCanvas listeners (keeping socket alive)');
      socket.off('game-state-update', handleGameStateUpdate);
      socket.off('player-update', handlePlayerUpdate);
    };
  }, [socket, gameMode, setPlayers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedMap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to fill available space
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let cleanup: (() => void) | undefined;

    // SINGLE PLAYER: Start immediately
    if (gameMode === 'single-player' && !gameInitializedRef.current) {
      console.log('🎮 Starting single-player game');
      gameInitializedRef.current = true; // Set BEFORE initialization to prevent double init
      requestAnimationFrame(() => {
        cleanup = initializeGame(canvas, ctx);
        console.log('✅ Single-player game initialized');
      });
    }

    // MULTIPLAYER: Use stored server start time
    if (gameMode === 'multiplayer' && serverStartTime && !gameInitializedRef.current) {
      console.log('🎮 Starting multiplayer game with server time:', serverStartTime);
      gameInitializedRef.current = true; // Set BEFORE initialization to prevent double init
      requestAnimationFrame(() => {
        cleanup = initializeGame(canvas, ctx, serverStartTime);
        console.log('✅ Multiplayer game initialized');
      });
    }

    // Cleanup
    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('resize', resizeCanvas);
      // DON'T reset gameInitializedRef here - keep it true to prevent re-initialization
    };
  }, [selectedMap, gameMode, serverStartTime]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full bg-slate-950"
      style={{
        display: 'block'
      }}
    />
  );
}
