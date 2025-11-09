'use client';

import { motion } from 'framer-motion';
import { Timer, User, Gamepad2, Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { Card, CardContent } from '@/components/ui/card';
import { audioManager } from '../utils/audioManager';
import { useEffect, useState } from 'react';

export default function GameHUD() {
  const { gamePhase, timeRemaining, countdownTimer, players, selectedCharacter } = useGameStore();
  const [isMuted, setIsMuted] = useState(false);

  const humanPlayer = players.find(p => p.id === 'player');
  const chaser = players.find(p => p.isChaser);

  // Play countdown sound when timer is low
  useEffect(() => {
    if (timeRemaining <= 5 && timeRemaining > 0 && gamePhase === 'playing') {
      audioManager.play('countdown');
    }
  }, [timeRemaining, gamePhase]);

  const toggleMute = () => {
    audioManager.toggleMute();
    setIsMuted(audioManager.isMuted);
    audioManager.play('click');
  };

  const getPhaseText = () => {
    if (gamePhase === 'countdown') {
      return `Starting in ${countdownTimer}...`;
    } else if (gamePhase === 'playing') {
      if (humanPlayer?.isChaser) {
        return 'You are the CHASER! Tag someone!';
      } else {
        return 'Run! Avoid the chaser!';
      }
    }
    return 'Game Over';
  };

  const getPhaseColor = () => {
    if (gamePhase === 'countdown') {
      return 'text-yellow-400';
    } else if (humanPlayer?.isChaser) {
      return 'text-red-400';
    } else {
      return 'text-green-400';
    }
  };

  const getPhaseGradient = () => {
    if (gamePhase === 'countdown') {
      return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
    } else if (humanPlayer?.isChaser) {
      return 'from-red-500/20 to-pink-500/20 border-red-500/30';
    } else {
      return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
    }
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full px-4 py-4 bg-black/50"
    >
      <Card className={`bg-gradient-to-r ${getPhaseGradient()} backdrop-blur-xl border-2 shadow-2xl`}>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-3 gap-4 md:gap-6 items-center">
            {/* Left - Character Info */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <User className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium">Status</p>
                <p className="text-white font-bold text-lg">
                  {humanPlayer?.isChaser ? '🔴 CHASER' : '🟢 RUNNER'}
                </p>
              </div>
              <div className="border-l border-gray-600 pl-4">
                <p className="text-gray-400 text-sm font-medium">Your Tags</p>
                <p className="text-white font-bold text-lg">{humanPlayer?.tagCount || 0}</p>
              </div>
            </div>

            {/* Center - Phase and Timer */}
            <div className="text-center">
              <motion.div
                key={gamePhase}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-2"
              >
                <p className={`text-xl font-bold ${getPhaseColor()}`}>
                  {getPhaseText()}
                </p>
                <motion.div
                  animate={{ scale: timeRemaining <= 5 ? [1, 1.1, 1] : 1 }}
                  transition={{ repeat: timeRemaining <= 5 ? Infinity : 0, duration: 0.5 }}
                  className="flex items-center justify-center gap-2"
                >
                  <Timer className={`w-8 h-8 ${timeRemaining <= 5 ? 'text-red-400' : 'text-white'}`} />
                  <p className={`text-5xl font-black ${timeRemaining <= 5 ? 'text-red-400' : 'text-white'}`}>
                    {timeRemaining}s
                  </p>
                </motion.div>
              </motion.div>
            </div>

            {/* Right - Controls & Sound */}
            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={toggleMute}
                className="bg-slate-900/50 p-3 rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-6 h-6 text-red-400" />
                ) : (
                  <Volume2 className="w-6 h-6 text-purple-400" />
                )}
              </button>
              
              {/* Power-up Status */}
              <div className={`bg-slate-900/50 p-3 rounded-lg border-2 ${
                humanPlayer?.powerUpReady 
                  ? 'border-green-500 animate-pulse' 
                  : humanPlayer?.powerUpActive 
                  ? 'border-yellow-500' 
                  : 'border-gray-700'
              }`}>
                <div className="text-center">
                  <p className="text-xs text-gray-400">Power-up</p>
                  <p className={`text-sm font-bold ${
                    humanPlayer?.powerUpReady 
                      ? 'text-green-400' 
                      : humanPlayer?.powerUpActive 
                      ? 'text-yellow-400' 
                      : humanPlayer?.powerUpCooldown
                      ? 'text-red-400'
                      : 'text-gray-500'
                  }`}>
                    {humanPlayer?.powerUpActive 
                      ? 'ACTIVE!' 
                      : humanPlayer?.powerUpReady 
                      ? 'READY (SPACE)' 
                      : humanPlayer?.powerUpCooldown 
                      ? 'USED'
                      : 'Charging...'}
                  </p>
                  {selectedCharacter && (
                    <p className="text-xs text-purple-300 mt-1">
                      {selectedCharacter.powerUp.name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <Gamepad2 className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm font-medium mb-1">Current Chaser</p>
                <p className="text-white text-sm font-semibold">
                  {chaser?.isBot ? chaser.character.name : 'YOU'}
                </p>
                <p className="text-purple-400 text-sm font-semibold">Controls: WASD</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
