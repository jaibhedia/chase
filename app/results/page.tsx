'use client';

import { useRouter } from 'next/navigation';
import { useGameStore, Player } from '../store/gameStore';
import { useEffect, useMemo } from 'react';
import { audioManager } from '../utils/audioManager';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Home, RotateCcw, Trophy, Crown, Skull, Medal, Target } from 'lucide-react';

export default function Results() {
  const router = useRouter();
  const { winner, gameMessage, resetGame, players } = useGameStore();

  const playerWon = winner?.id === 'player';

  // Calculate rankings based on tag count (lower is better)
  const rankedPlayers = useMemo(() => {
    return [...players]
      .sort((a, b) => a.tagCount - b.tagCount)
      .map((player, index) => ({
        ...player,
        rank: index + 1
      }));
  }, [players]);

  // Get medal color based on rank
  const getMedalColor = (rank: number) => {
    switch(rank) {
      case 1: return 'text-yellow-400'; // Gold
      case 2: return 'text-gray-300'; // Silver
      case 3: return 'text-orange-600'; // Bronze
      default: return 'text-gray-500';
    }
  };

  // Get rank background gradient
  const getRankGradient = (rank: number) => {
    switch(rank) {
      case 1: return 'from-yellow-900/60 to-orange-900/60 border-yellow-500';
      case 2: return 'from-gray-700/60 to-gray-800/60 border-gray-400';
      case 3: return 'from-orange-900/60 to-red-900/60 border-orange-600';
      default: return 'from-slate-800/60 to-slate-900/60 border-slate-600';
    }
  };

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
          <h3 className="text-3xl font-black text-purple-300 mb-6 uppercase tracking-wider flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8" /> Player Rankings <Trophy className="w-8 h-8" />
          </h3>
          
          {/* Leaderboard */}
          <div className="space-y-4">
            {rankedPlayers.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.02, x: 10 }}
                className={`relative bg-gradient-to-br ${getRankGradient(player.rank)} backdrop-blur-xl rounded-xl p-4 border-2 overflow-hidden ${
                  player.id === 'player' ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950' : ''
                }`}
              >
                {/* Rank Badge */}
                <div className="absolute -left-2 -top-2 w-16 h-16">
                  <div className={`w-full h-full rounded-full ${
                    player.rank === 1 ? 'bg-yellow-500' :
                    player.rank === 2 ? 'bg-gray-400' :
                    player.rank === 3 ? 'bg-orange-600' :
                    'bg-slate-700'
                  } flex items-center justify-center border-4 border-slate-950 shadow-lg`}>
                    <span className="text-white font-black text-xl">#{player.rank}</span>
                  </div>
                </div>

                {/* Player Info */}
                <div className="flex items-center justify-between pl-14">
                  <div className="flex items-center gap-4">
                    {/* Medal Icon */}
                    {player.rank <= 3 && (
                      <Medal className={`w-8 h-8 ${getMedalColor(player.rank)}`} style={{
                        filter: player.rank === 1 ? 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.8))' : 'none'
                      }} />
                    )}
                    
                    {/* Character Image or Color */}
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center border-3 border-white/30"
                      style={{ backgroundColor: player.character.color }}
                    >
                      {player.character.image ? (
                        <img 
                          src={player.character.image} 
                          alt={player.character.name}
                          className="w-12 h-12 object-contain"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full" style={{ backgroundColor: player.character.color }} />
                      )}
                    </div>

                    {/* Player Name */}
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-black text-white">
                          {player.character.name}
                        </h4>
                        {player.id === 'player' && (
                          <span className="px-2 py-1 bg-cyan-500 text-white text-xs font-bold rounded-full uppercase">
                            You
                          </span>
                        )}
                        {player.isBot && (
                          <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full uppercase">
                            Bot
                          </span>
                        )}
                        {player.rank === 1 && (
                          <Crown className="w-5 h-5 text-yellow-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-300">
                        Speed: {player.character.speed.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {/* Performance Stats */}
                  <div className="flex items-center gap-6">
                    {/* Tag Count */}
                    <div className="text-center">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-5 h-5 text-red-400" />
                        <p className="text-sm font-bold text-gray-300 uppercase">Tags</p>
                      </div>
                      <p className={`text-3xl font-black ${
                        player.tagCount === 0 ? 'text-green-400' :
                        player.tagCount <= 2 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {player.tagCount}
                      </p>
                    </div>

                    {/* Performance Label */}
                    <div className="text-right min-w-[100px]">
                      <p className={`text-lg font-black uppercase ${
                        player.tagCount === 0 ? 'text-green-400' :
                        player.tagCount <= 2 ? 'text-yellow-400' :
                        player.tagCount <= 4 ? 'text-orange-400' :
                        'text-red-400'
                      }`}>
                        {player.tagCount === 0 ? '🏆 Perfect!' :
                         player.tagCount <= 2 ? '⭐ Great' :
                         player.tagCount <= 4 ? '👍 Good' :
                         '💪 Try Again'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Winner Glow Effect */}
                {player.rank === 1 && (
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(250, 204, 21, 0.5)',
                        '0 0 40px rgba(250, 204, 21, 0.8)',
                        '0 0 20px rgba(250, 204, 21, 0.5)',
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-xl pointer-events-none"
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Game Summary */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-6 pt-6 border-t-2 border-purple-500/30"
          >
            <p className="text-gray-400 text-sm text-center">
              🎮 The player with the <span className="text-yellow-400 font-bold">fewest tags</span> wins the game!
            </p>
          </motion.div>
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
