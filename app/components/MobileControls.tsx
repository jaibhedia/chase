'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface MobileControlsProps {
  onDirectionChange: (direction: { x: number; y: number }) => void;
  onPowerUpPress: () => void;
  powerUpReady?: boolean;
  powerUpActive?: boolean;
}

export default function MobileControls({ onDirectionChange, onPowerUpPress, powerUpReady = false, powerUpActive = false }: MobileControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const [isTouching, setIsTouching] = useState(false);
  const touchIdRef = useRef<number | null>(null);
  const [showControls, setShowControls] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                     window.innerWidth <= 1024 || 
                     window.innerHeight <= 1024 ||
                     ('ontouchstart' in window);
      setShowControls(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (!joystickRef.current) return;
      
      const touch = Array.from(e.changedTouches).find(t => {
        const rect = joystickRef.current!.getBoundingClientRect();
        return (
          t.clientX >= rect.left &&
          t.clientX <= rect.right &&
          t.clientY >= rect.top &&
          t.clientY <= rect.bottom
        );
      });

      if (touch) {
        e.preventDefault(); // Prevent scrolling
        touchIdRef.current = touch.identifier;
        setIsTouching(true);
        handleTouchMove(e);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!joystickRef.current || touchIdRef.current === null) return;
      
      e.preventDefault(); // Prevent scrolling while moving
      
      const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
      if (!touch) return;

      const rect = joystickRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = touch.clientX - centerX;
      const deltaY = touch.clientY - centerY;
      
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 40; // Maximum joystick movement
      
      let x = deltaX;
      let y = deltaY;
      
      if (distance > maxDistance) {
        x = (deltaX / distance) * maxDistance;
        y = (deltaY / distance) * maxDistance;
      }
      
      setJoystickPosition({ x, y });
      
      // Normalize direction for game control (-1 to 1)
      const normalizedX = x / maxDistance;
      const normalizedY = y / maxDistance;
      
      onDirectionChange({ x: normalizedX, y: normalizedY });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
      if (touch) {
        e.preventDefault(); // Prevent any default touch behavior
        touchIdRef.current = null;
        setIsTouching(false);
        setJoystickPosition({ x: 0, y: 0 });
        onDirectionChange({ x: 0, y: 0 });
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onDirectionChange]);

  // Don't render on desktop
  if (!showControls) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {/* Joystick - Left side - Smaller for mobile */}
      <div className="absolute bottom-4 left-4 pointer-events-auto">
        <div
          ref={joystickRef}
          className="relative w-24 h-24 bg-white/10 backdrop-blur-sm rounded-full border-2 border-purple-500/50 shadow-2xl"
        >
          {/* Joystick background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20" />
          
          {/* Joystick handle */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full shadow-lg -translate-x-1/2 -translate-y-1/2"
            style={{
              x: joystickPosition.x,
              y: joystickPosition.y,
            }}
            animate={{
              scale: isTouching ? 1.1 : 1,
            }}
          >
            <div className="absolute inset-1 rounded-full bg-white/20" />
          </motion.div>
          
          {/* Directional indicators */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute top-1 text-white/50 text-[10px]">↑</div>
            <div className="absolute bottom-1 text-white/50 text-[10px]">↓</div>
            <div className="absolute left-1 text-white/50 text-[10px]">←</div>
            <div className="absolute right-1 text-white/50 text-[10px]">→</div>
          </div>
        </div>
        <p className="text-center text-white/70 text-[10px] mt-1">Move</p>
      </div>

      {/* Power-up button - Right side - Smaller with ready state */}
      <div className="absolute bottom-4 right-4 pointer-events-auto">
        <motion.button
          onTouchStart={(e) => {
            e.preventDefault();
            if (powerUpReady && !powerUpActive) {
              onPowerUpPress();
            }
          }}
          disabled={!powerUpReady || powerUpActive}
          className={`
            w-16 h-16 rounded-full shadow-2xl flex items-center justify-center border-2
            ${powerUpReady && !powerUpActive
              ? 'bg-gradient-to-br from-yellow-500 to-orange-500 border-yellow-300 animate-pulse' 
              : powerUpActive
              ? 'bg-gradient-to-br from-green-500 to-emerald-500 border-green-300'
              : 'bg-gray-500/50 border-gray-400/50'
            }
          `}
          whileTap={powerUpReady && !powerUpActive ? { scale: 0.9 } : {}}
          animate={powerUpReady && !powerUpActive ? {
            boxShadow: [
              '0 0 20px 5px rgba(251, 191, 36, 0.7)',
              '0 0 30px 10px rgba(251, 191, 36, 0)',
              '0 0 20px 5px rgba(251, 191, 36, 0.7)'
            ]
          } : {}}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        >
          <div className={`font-bold text-xl ${powerUpReady ? 'text-white' : 'text-gray-400'}`}>
            {powerUpActive ? '✓' : '⚡'}
          </div>
        </motion.button>
        <p className="text-center text-white/70 text-[10px] mt-1">
          {powerUpActive ? 'Active' : powerUpReady ? 'Ready!' : '15s'}
        </p>
      </div>
    </div>
  );
}
