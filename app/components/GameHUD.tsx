'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Timer, User, Gamepad2, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { useGameStore } from '@/app/store/gameStore';
import { audioManager } from '@/app/utils/audioManager';
import TutorialPopup from './TutorialPopup';

export default function GameHUD() {
  const { selectedCharacter } = useGameStore();
  const [muted, setMuted] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const handleToggleMute = () => {
    audioManager.toggleMute();
    setMuted(audioManager.isMuted);
  };

  return (
    <>
      <TutorialPopup 
        open={showTutorial} 
        onOpenChange={setShowTutorial}
      />
      <motion.div
        className="fixed top-2 left-2 right-2 md:top-4 md:left-4 md:right-4 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-purple-900/90 to-blue-900/90 backdrop-blur-sm border-purple-500/50 shadow-2xl">
          <CardContent className="p-2 md:p-4">
            <div className="flex items-center justify-between gap-2 md:gap-4">
              {/* Left - Controls */}
              <div className="flex items-center gap-1 md:gap-2">
                <button
                  onClick={handleToggleMute}
                  className="p-1.5 md:p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
                  aria-label={muted ? "Unmute" : "Mute"}
                  title={muted ? "Unmute" : "Mute"}
                >
                  {muted ? (
                    <VolumeX className="w-4 h-4 md:w-6 md:h-6 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 md:w-6 md:h-6 text-purple-400" />
                  )}
                </button>
                <button
                  onClick={() => setShowTutorial(true)}
                  className="p-1.5 md:p-2 rounded-lg bg-slate-900/50 hover:bg-slate-800/50 transition-colors"
                  aria-label="Show Tutorial"
                  title="Show Tutorial"
                >
                  <HelpCircle className="w-4 h-4 md:w-6 md:h-6 text-blue-400 hover:text-blue-300" />
                </button>
              </div>

              {/* Center - Character Info */}
              {selectedCharacter && (
                <div className="flex items-center gap-2 md:gap-3 bg-slate-900/50 px-2 py-1 md:px-4 md:py-2 rounded-lg">
                  <User className="w-4 h-4 md:w-6 md:h-6 text-purple-400" />
                  <div className="hidden sm:block">
                    <p className="text-xs text-gray-400">Playing as</p>
                    <p className="text-white text-sm md:text-base font-bold">{selectedCharacter.name}</p>
                  </div>
                  <div className="sm:hidden">
                    <p className="text-white text-xs font-bold">{selectedCharacter.name}</p>
                  </div>
                </div>
              )}

              {/* Right - Controls Hint (hidden on mobile) */}
              <div className="hidden md:flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-lg">
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
