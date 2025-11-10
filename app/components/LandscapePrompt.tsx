'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone } from 'lucide-react';

export default function LandscapePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isPortrait = window.innerHeight > window.innerWidth;
      
      setShowPrompt(isMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      >
        <div className="text-center px-8">
          <motion.div
            animate={{ rotate: 90 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
            className="mb-8"
          >
            <Smartphone className="w-24 h-24 text-purple-500 mx-auto" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Please Rotate Your Device
          </h2>
          <p className="text-gray-400 text-lg">
            This game is best played in landscape mode
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="w-16 h-24 border-4 border-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-purple-500 text-3xl">📱</span>
            </div>
            <span className="text-white text-2xl">→</span>
            <div className="w-24 h-16 border-4 border-green-500 rounded-lg flex items-center justify-center">
              <span className="text-green-500 text-3xl">📱</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
