'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { initializeGame } from '../utils/gameEngine';
import { useSocket } from '../hooks/useSocket';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { selectedMap, gameMode } = useGameStore();
  const socket = useSocket();
  const [serverStartTime, setServerStartTime] = useState<number | undefined>();
  const [gameInitialized, setGameInitialized] = useState(false);

  useEffect(() => {
    if (!socket || gameMode !== 'multiplayer') return;

    // Listen for server-controlled game start
    socket.on('game-started', ({ serverTime }: { serverTime: number }) => {
      console.log('Game started at server time:', serverTime);
      setServerStartTime(serverTime);
      setGameInitialized(true);
    });

    // Listen for server-controlled game end
    socket.on('game-ended', () => {
      console.log('Game ended by server');
      // The game engine will handle the end based on timer
    });

    return () => {
      socket.off('game-started');
      socket.off('game-ended');
    };
  }, [socket, gameMode]);

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

    // Initialize the game after canvas is properly sized
    let cleanup: (() => void) | undefined;
    
    // Use requestAnimationFrame to ensure canvas dimensions are set
    requestAnimationFrame(() => {
      if (gameMode === 'single-player') {
        cleanup = initializeGame(canvas, ctx);
      } else if (gameMode === 'multiplayer' && gameInitialized && serverStartTime) {
        cleanup = initializeGame(canvas, ctx, serverStartTime);
      }
    });

    // Cleanup on unmount
    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [selectedMap, gameMode, gameInitialized, serverStartTime]);

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
