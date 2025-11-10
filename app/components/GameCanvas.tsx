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
  const gameInitializedRef = useRef(false);

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
      requestAnimationFrame(() => {
        cleanup = initializeGame(canvas, ctx);
        gameInitializedRef.current = true;
      });
    }

    // MULTIPLAYER: Listen for server start event
    if (gameMode === 'multiplayer' && socket) {
      const handleGameStarted = ({ serverTime }: { serverTime: number }) => {
        console.log('🎮 Multiplayer game starting with server time:', serverTime);
        
        if (!gameInitializedRef.current) {
          requestAnimationFrame(() => {
            cleanup = initializeGame(canvas, ctx, serverTime);
            gameInitializedRef.current = true;
            console.log('✅ Multiplayer game initialized');
          });
        }
      };

      socket.on('game-started', handleGameStarted);

      // Cleanup
      return () => {
        socket.off('game-started', handleGameStarted);
        if (cleanup) cleanup();
        window.removeEventListener('resize', resizeCanvas);
        gameInitializedRef.current = false;
      };
    }

    // Cleanup for single-player
    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('resize', resizeCanvas);
      gameInitializedRef.current = false;
    };
  }, [selectedMap, gameMode, socket]);

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
