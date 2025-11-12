'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Timer, User, Gamepad2, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { audioManager } from '@/app/utils/audioManager';

export default function GameHUD() {
  const { selectedCharacter } = useGameStore();
  const [muted, setMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                     window.innerWidth <= 1024 || 
                     window.innerHeight <= 1024 ||
                     ('ontouchstart' in window);
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggleMute = () => {
    audioManager.toggleMute();
    setMuted(audioManager.isMuted);
  };

  // Don't render anything on mobile
  if (isMobile) return null;

  // Don't render anything on mobile
  if (isMobile) return null;

  return (
    <>
      <motion.div
        className="fixed top-4 left-4 right-4 z-[55]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-purple-900/90 to-blue-900/90 backdrop-blur-sm border-purple-500/50 shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left - Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMute}
                  className="p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
                  aria-label={muted ? "Unmute" : "Mute"}
                  title={muted ? "Unmute" : "Mute"}
                >
                  {muted ? (
                    <VolumeX className="w-6 h-6 text-red-400" />
                  ) : (
                    <Volume2 className="w-6 h-6 text-purple-400" />
                  )}
                </button>
              </div>

              {/* Center - Character Info */}
              {selectedCharacter && (
                <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-lg">
                  <User className="w-6 h-6 text-purple-400" />
                  <div>
                    <p className="text-xs text-gray-400">Playing as</p>
                    <p className="text-white text-base font-bold">{selectedCharacter.name}</p>
                  </div>
                </div>
              )}

              {/* Right - Controls Hint */}
              <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-lg">
                <Gamepad2 className="w-6 h-6 text-purple-400" />
                <div className="text-right">
                  <p className="text-xs text-gray-400">Controls</p>
                  <p className="text-white text-sm font-semibold">WASD / Arrow Keys</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
