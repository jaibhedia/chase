'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Zap, Keyboard, Target, Clock } from 'lucide-react';

interface TutorialPopupProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function TutorialPopup({ open, onOpenChange }: TutorialPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // If controlled by parent, use that
    if (open !== undefined) {
      setIsOpen(open);
      return;
    }
    
    // Otherwise, check if user has seen tutorial before
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setIsOpen(true);
    }
  }, [open]);

  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      localStorage.setItem('hasSeenTutorial', 'true');
      setIsOpen(false);
    }
  };

  const handleSkip = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />

          {/* Tutorial Modal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-gradient-to-br from-slate-900 via-purple-900/50 to-pink-900/50 rounded-3xl p-8 max-w-2xl w-full border-4 border-yellow-500 shadow-2xl relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

              {/* Close button */}
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Content */}
              <div className="relative z-10">
                {/* Title */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center mb-8"
                >
                  <h2 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-600 text-transparent bg-clip-text mb-2 uppercase">
                    🎮 How to Play
                  </h2>
                  <p className="text-gray-300 text-lg">Master the chase in 30 seconds!</p>
                </motion.div>

                {/* Instructions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {/* Movement */}
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-blue-600/30 to-cyan-600/30 rounded-2xl p-5 border-2 border-blue-500/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-500 p-3 rounded-lg">
                        <Keyboard className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white mb-2">MOVEMENT</h3>
                        <p className="text-blue-200 text-sm mb-2">
                          Use <span className="font-bold text-white">WASD</span> or <span className="font-bold text-white">Arrow Keys</span> to move
                        </p>
                        <div className="flex gap-2 text-xs">
                          <kbd className="px-2 py-1 bg-blue-900/50 rounded border border-blue-400 text-white font-mono">W</kbd>
                          <kbd className="px-2 py-1 bg-blue-900/50 rounded border border-blue-400 text-white font-mono">A</kbd>
                          <kbd className="px-2 py-1 bg-blue-900/50 rounded border border-blue-400 text-white font-mono">S</kbd>
                          <kbd className="px-2 py-1 bg-blue-900/50 rounded border border-blue-400 text-white font-mono">D</kbd>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Objective */}
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-red-600/30 to-orange-600/30 rounded-2xl p-5 border-2 border-red-500/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-red-500 p-3 rounded-lg">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white mb-2">OBJECTIVE</h3>
                        <p className="text-red-200 text-sm">
                          <span className="font-bold text-white">Avoid being tagged!</span>
                        </p>
                        <p className="text-red-200 text-sm mt-1">
                          When you&apos;re the chaser, tag others. When you&apos;re not, run away!
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Power-ups */}
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-2xl p-5 border-2 border-purple-500/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-500 p-3 rounded-lg">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white mb-2">POWER-UPS</h3>
                        <p className="text-purple-200 text-sm mb-1">
                          Press <kbd className="px-2 py-1 bg-purple-900/50 rounded border border-purple-400 text-white font-mono text-xs">SPACE</kbd> to activate
                        </p>
                        <p className="text-purple-200 text-sm">
                          <span className="font-bold text-yellow-300">⚠️ Only usable ONCE per game!</span>
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Timing */}
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-br from-green-600/30 to-teal-600/30 rounded-2xl p-5 border-2 border-green-500/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-green-500 p-3 rounded-lg">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white mb-2">TIMING</h3>
                        <p className="text-green-200 text-sm mb-1">
                          Power-ups unlock after <span className="font-bold text-white">15 seconds</span>
                        </p>
                        <p className="text-green-200 text-sm">
                          Game lasts <span className="font-bold text-white">30 seconds</span> total
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Winning Condition */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-xl p-4 border-2 border-yellow-500/50 mb-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">🏆</span>
                    <div>
                      <h3 className="text-xl font-black text-yellow-300 mb-1">WIN CONDITION</h3>
                      <p className="text-yellow-100 text-sm">
                        The player with the <span className="font-bold text-white">FEWEST TAGS</span> at the end wins!
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex gap-4 justify-center"
                >
                  <Button
                    onClick={handleClose}
                    variant="game"
                    size="lg"
                    className="text-lg px-8 shadow-xl"
                  >
                    Got It! Let&apos;s Play 🎮
                  </Button>
                  <Button
                    onClick={handleSkip}
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white"
                  >
                    Skip for Now
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
