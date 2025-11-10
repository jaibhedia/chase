'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface MobileControlsProps {
  onDirectionChange: (direction: { x: number; y: number }) => void;
  onPowerUpPress: () => void;
}

export default function MobileControls({ onDirectionChange, onPowerUpPress }: MobileControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const [isTouching, setIsTouching] = useState(false);
  const touchIdRef = useRef<number | null>(null);

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
        touchIdRef.current = touch.identifier;
        setIsTouching(true);
        handleTouchMove(e);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!joystickRef.current || touchIdRef.current === null) return;
      
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
        touchIdRef.current = null;
        setIsTouching(false);
        setJoystickPosition({ x: 0, y: 0 });
        onDirectionChange({ x: 0, y: 0 });
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onDirectionChange]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 md:hidden">
      {/* Joystick - Left side */}
      <div className="absolute bottom-8 left-8 pointer-events-auto">
        <div
          ref={joystickRef}
          className="relative w-32 h-32 bg-white/10 backdrop-blur-sm rounded-full border-2 border-purple-500/50"
        >
          {/* Joystick background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20" />
          
          {/* Joystick handle */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full shadow-lg -translate-x-1/2 -translate-y-1/2"
            style={{
              x: joystickPosition.x,
              y: joystickPosition.y,
            }}
            animate={{
              scale: isTouching ? 1.1 : 1,
            }}
          >
            <div className="absolute inset-2 rounded-full bg-white/20" />
          </motion.div>
          
          {/* Directional indicators */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute top-2 text-white/50 text-xs">↑</div>
            <div className="absolute bottom-2 text-white/50 text-xs">↓</div>
            <div className="absolute left-2 text-white/50 text-xs">←</div>
            <div className="absolute right-2 text-white/50 text-xs">→</div>
          </div>
        </div>
        <p className="text-center text-white/70 text-xs mt-2">Move</p>
      </div>

      {/* Power-up button - Right side */}
      <div className="absolute bottom-8 right-8 pointer-events-auto">
        <motion.button
          onTouchStart={(e) => {
            e.preventDefault();
            onPowerUpPress();
          }}
          className="w-24 h-24 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full shadow-lg flex items-center justify-center border-4 border-white/30"
          whileTap={{ scale: 0.9 }}
        >
          <div className="text-white font-bold text-2xl">⚡</div>
        </motion.button>
        <p className="text-center text-white/70 text-xs mt-2">Power-up</p>
      </div>
    </div>
  );
}
