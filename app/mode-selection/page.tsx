'use client';

import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Users } from 'lucide-react';

export default function ModeSelection() {
  const router = useRouter();
  const { authenticated } = usePrivy();
  const { setGameMode, gameMode, resetGame } = useGameStore();

  useEffect(() => {
    if (!authenticated) {
      router.push('/');
    }
  }, [authenticated, router]);

  const handleModeSelect = (mode: 'single-player' | 'multiplayer') => {
    setGameMode(mode);
    router.push('/character-selection');
  };

  const handleBackToHome = () => {
    resetGame();
    router.push('/');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-pink-950 p-4 relative overflow-hidden md:overflow-visible">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"
        />
      </div>

      <div className="w-full max-w-6xl mx-auto text-center space-y-4 md:space-y-8 p-2 md:p-4 relative z-10 overflow-y-auto md:overflow-visible">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="py-2 md:py-0"
        >
          <h1 className="text-3xl md:text-7xl font-black text-white mb-2 md:mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-transparent bg-clip-text animate-pulse">
              CHOOSE YOUR MODE
            </span>
          </h1>
          <p className="text-sm md:text-xl text-purple-300 font-bold uppercase tracking-widest">
            Single Player or Multiplayer
          </p>
        </motion.div>

        <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-8 mt-4 md:mt-12 pb-20 md:pb-0">
          {/* Single Player Card */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleModeSelect('single-player')}
            className="relative group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl md:rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-gradient-to-br from-blue-900/90 to-cyan-900/90 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-8 border-2 md:border-4 border-blue-500/50 group-hover:border-blue-400 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-16 md:w-32 h-16 md:h-32 bg-blue-500/20 rounded-full -mr-8 md:-mr-16 -mt-8 md:-mt-16"></div>
              <div className="absolute bottom-0 left-0 w-12 md:w-24 h-12 md:h-24 bg-cyan-500/20 rounded-full -ml-6 md:-ml-12 -mb-6 md:-mb-12"></div>
              
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-3 md:mb-6"
              >
                <User className="w-12 md:w-24 h-12 md:h-24 mx-auto text-blue-400 drop-shadow-2xl" />
              </motion.div>
              
              <h2 className="text-2xl md:text-4xl font-black text-white mb-2 md:mb-4 uppercase tracking-wider">
                Single Player
              </h2>
              
              <div className="bg-black/30 rounded-xl p-2 md:p-4 mb-3 md:mb-6">
                <p className="text-cyan-200 font-bold text-sm md:text-lg">
                  Play against AI bots in a fast-paced chase game!
                </p>
              </div>

              <ul className="text-left space-y-2 md:space-y-3 text-blue-100 mb-3 md:mb-6 text-xs md:text-base">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 text-sm md:text-xl">✓</span>
                  <span>Compete against smart AI opponents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 text-sm md:text-xl">✓</span>
                  <span>Perfect for practicing your skills</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 text-sm md:text-xl">✓</span>
                  <span>Quick matches, instant action</span>
                </li>
              </ul>

              <Button className="w-full py-3 md:py-6 text-sm md:text-xl font-black bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white border-0 rounded-xl shadow-lg hover:shadow-cyan-500/50 transition-all">
                PLAY SOLO
              </Button>
            </div>
          </motion.div>

          {/* Multiplayer Card */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.05, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleModeSelect('multiplayer')}
            className="relative group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl md:rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-gradient-to-br from-green-900/90 to-emerald-900/90 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 md:p-8 border-2 md:border-4 border-green-500/50 group-hover:border-green-400 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-16 md:w-32 h-16 md:h-32 bg-green-500/20 rounded-full -mr-8 md:-mr-16 -mt-8 md:-mt-16"></div>
              <div className="absolute bottom-0 left-0 w-12 md:w-24 h-12 md:h-24 bg-emerald-500/20 rounded-full -ml-6 md:-ml-12 -mb-6 md:-mb-12"></div>
              
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                className="mb-3 md:mb-6"
              >
                <Users className="w-12 md:w-24 h-12 md:h-24 mx-auto text-green-400 drop-shadow-2xl" />
              </motion.div>
              
              <h2 className="text-2xl md:text-4xl font-black text-white mb-2 md:mb-4 uppercase tracking-wider">
                Multiplayer
              </h2>
              
              <div className="bg-black/30 rounded-xl p-2 md:p-4 mb-3 md:mb-6">
                <p className="text-emerald-200 font-bold text-sm md:text-lg">
                  Compete with real players + AI in chaotic chases!
                </p>
              </div>

              <ul className="text-left space-y-2 md:space-y-3 text-green-100 mb-3 md:mb-6 text-xs md:text-base">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 text-sm md:text-xl">✓</span>
                  <span>Play with friends and other players</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 text-sm md:text-xl">✓</span>
                  <span>Unpredictable and exciting gameplay</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 text-sm md:text-xl">✓</span>
                  <span>More players, more chaos!</span>
                </li>
              </ul>

              <Button className="w-full py-3 md:py-6 text-sm md:text-xl font-black bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white border-0 rounded-xl shadow-lg hover:shadow-emerald-500/50 transition-all">
                PLAY MULTIPLAYER
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Back Button */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 md:mt-8 pb-4"
        >
          <Button
            onClick={handleBackToHome}
            variant="outline"
            className="px-4 md:px-8 py-2 md:py-4 text-sm md:text-lg font-bold bg-black/50 border-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50 rounded-xl backdrop-blur-sm"
          >
            <ArrowLeft className="mr-2 h-4 md:h-5 w-4 md:w-5" />
            Back to Home
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
