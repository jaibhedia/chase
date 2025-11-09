'use client';

import { useRouter } from 'next/navigation';
import { useGameStore } from '../store/gameStore';
import { useEffect } from 'react';
import { audioManager } from '../utils/audioManager';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Home, RotateCcw, Trophy, Crown, Skull } from 'lucide-react';

export default function Results() {
  const router = useRouter();
  const { winner, gameMessage, resetGame, players } = useGameStore();

  const playerWon = winner?.id === 'player';

  useEffect(() => {
    if (!winner) {
      router.push('/');
    } else {
      // Play victory or defeat sound
      audioManager.play(playerWon ? 'victory' : 'defeat');
    }
  }, [winner, router, playerWon]);

  const handlePlayAgain = () => {
    resetGame();
    router.push('/mode-selection');
  };

  const handleHome = () => {
    resetGame();
    router.push('/');
  };

  if (!winner) return null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-pink-950 p-4 relative overflow-hidden">
      {/* Animated Confetti/Particles */}
      {playerWon && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -100, x: Math.random() * window.innerWidth, rotate: 0 }}
              animate={{
                y: window.innerHeight + 100,
                rotate: 360,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              className="absolute w-3 h-3 rounded-full"
              style={{
                backgroundColor: ['#fbbf24', '#f59e0b', '#ef4444', '#ec4899', '#a855f7'][Math.floor(Math.random() * 5)],
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto text-center space-y-8 p-4 relative z-10">
        {/* Victory/Defeat Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
          className="relative"
        >
          {playerWon ? (
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Trophy className="w-40 h-40 mx-auto text-yellow-400 drop-shadow-2xl" style={{
                filter: 'drop-shadow(0 0 30px rgba(250, 204, 21, 0.8))',
              }} />
            </motion.div>
          ) : (
            <motion.div
              animate={{ 
                y: [0, -10, 0],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Skull className="w-40 h-40 mx-auto text-red-500 drop-shadow-2xl" style={{
                filter: 'drop-shadow(0 0 30px rgba(239, 68, 68, 0.6))',
              }} />
            </motion.div>
          )}
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className={`text-7xl md:text-8xl font-black mb-4 uppercase tracking-wider ${
            playerWon 
              ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-600 text-transparent bg-clip-text' 
              : 'bg-gradient-to-r from-red-600 via-red-500 to-orange-600 text-transparent bg-clip-text'
          }`}>
            {playerWon ? 'VICTORY!' : 'DEFEATED!'}
          </h1>
        </motion.div>

        {/* Winner Announcement */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className={`relative bg-gradient-to-br ${
            playerWon 
              ? 'from-yellow-900/40 to-orange-900/40 border-yellow-500' 
              : 'from-red-900/40 to-pink-900/40 border-red-500'
          } backdrop-blur-xl rounded-3xl p-8 border-4 overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
          
          <div className="flex items-center justify-center gap-4 mb-4">
            <Crown className="w-8 h-8 text-yellow-400" />
            <h2 className="text-4xl font-black text-white uppercase tracking-wider">
              Champion: {winner?.character.name}
            </h2>
            <Crown className="w-8 h-8 text-yellow-400" />
          </div>
          
          <motion.p
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-2xl font-bold text-white"
          >
            {gameMessage}
          </motion.p>
        </motion.div>

        {/* Match Stats */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border-2 border-purple-500/30"
        >
          <h3 className="text-2xl font-black text-purple-300 mb-6 uppercase tracking-wider flex items-center justify-center gap-2">
            <span>⚔️</span> Match Summary <span>⚔️</span>
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl p-4 border-2 border-blue-500/50"
            >
              <p className="text-blue-300 font-bold mb-2 uppercase text-sm">Your Tags</p>
              <p className="text-white font-black text-2xl capitalize">
                {players.find(p => p.id === 'player')?.tagCount || 0}
              </p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-xl p-4 border-2 border-yellow-500/50"
            >
              <p className="text-yellow-300 font-bold mb-2 uppercase text-sm">Winner Tags</p>
              <p className="text-white font-black text-2xl capitalize">{winner?.tagCount || 0}</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={handlePlayAgain}
            variant="game"
            size="xl"
            className="gap-3 text-xl shadow-2xl"
          >
            <RotateCcw className="w-6 h-6" />
            Play Again
          </Button>
          <Button
            onClick={handleHome}
            variant="outline"
            size="xl"
            className="gap-3 text-xl border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white"
          >
            <Home className="w-6 h-6" />
            Home
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
