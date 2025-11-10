'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { initializeGame } from '../utils/gameEngine';
import { useSocket } from '../hooks/useSocket';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { selectedMap, gameMode, serverStartTime } = useGameStore();
  const socket = useSocket();
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
      console.log('🎮 Starting single-player game');
      requestAnimationFrame(() => {
        cleanup = initializeGame(canvas, ctx);
        gameInitializedRef.current = true;
        console.log('✅ Single-player game initialized');
      });
    }

    // MULTIPLAYER: Use stored server start time
    if (gameMode === 'multiplayer' && serverStartTime && !gameInitializedRef.current) {
      console.log('🎮 Starting multiplayer game with server time:', serverStartTime);
      requestAnimationFrame(() => {
        cleanup = initializeGame(canvas, ctx, serverStartTime);
        gameInitializedRef.current = true;
        console.log('✅ Multiplayer game initialized');
      });
    }

    // Cleanup
    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('resize', resizeCanvas);
      gameInitializedRef.current = false;
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
