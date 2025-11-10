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
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Only resize if we have valid dimensions
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          console.log('Canvas resized to:', width, height);
        }
      }
    };

    // Initial resize with a small delay to ensure container has dimensions
    setTimeout(resizeCanvas, 0);
    window.addEventListener('resize', resizeCanvas);

    // Initialize the game
    let cleanup: (() => void) | undefined;
    
    const initGame = () => {
      if (canvas.width === 0 || canvas.height === 0) {
        console.log('Canvas has no dimensions yet, waiting...');
        return;
      }

      if (gameMode === 'single-player') {
        console.log('Initializing single-player game');
        cleanup = initializeGame(canvas, ctx);
      } else if (gameMode === 'multiplayer') {
        if (gameInitialized && serverStartTime) {
          console.log('Initializing multiplayer game with server time:', serverStartTime);
          cleanup = initializeGame(canvas, ctx, serverStartTime);
        } else {
          console.log('Waiting for game-started event...');
        }
      }
    };

    // Try to initialize after canvas is sized
    requestAnimationFrame(() => {
      resizeCanvas();
      setTimeout(initGame, 50);
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
