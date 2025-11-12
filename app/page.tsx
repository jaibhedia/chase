'use client';

import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { motion } from 'framer-motion';
import { Twitter, Send } from 'lucide-react';
import WalletConnect from './components/WalletConnect';
import { Button } from '@/components/ui/button';
import { useGameStore } from './store/gameStore';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const { authenticated } = usePrivy();
  const router = useRouter();
  const { selectedCharacter } = useGameStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(err => {
        console.log('Video autoplay failed:', err);
      });
    }
  }, []);

  // Removed auto-redirect to allow users to return to home page

  return (
    <main className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Background Video */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-purple-900 via-black to-blue-900">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
          onLoadedData={() => {
            console.log('Video loaded successfully');
            setVideoLoaded(true);
          }}
          onError={(e) => {
            console.error('Video failed to load:', e);
            (e.target as HTMLVideoElement).style.display = 'none';
          }}
        >
          <source src="/intro-video.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Top Right - Wallet Connect */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <WalletConnect />
        </motion.div>
      </div>

      {/* Spacer to push content down */}
      <div className="flex-1"></div>

      {/* Play Button - Just Above Footer */}
      <div className="relative z-10 flex justify-center px-4 pb-1 md:pb-1">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
        >
          {authenticated ? (
            <Button
              onClick={() => router.push('/mode-selection')}
              className="px-6 py-3 md:px-10 md:py-5 text-lg md:text-2xl font-black bg-black/80 border-4 border-white text-white rounded-2xl hover:bg-white hover:text-black transition-all duration-300 uppercase tracking-wider shadow-none backdrop-blur-sm"
            >
              Play
            </Button>
          ) : (
            <Button
              disabled
              className="px-6 py-3 md:px-10 md:py-5 text-lg md:text-2xl font-black bg-black/80 border-4 border-white/40 text-white/30 rounded-2xl uppercase tracking-wider cursor-not-allowed backdrop-blur-sm shadow-none"
            >
              Play
            </Button>
          )}
        </motion.div>
      </div>

      {/* Bottom Footer */}
      <motion.footer
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="relative z-10 border-t border-white/20 bg-black/50 backdrop-blur-sm"
      >
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Social Icons */}
            <div className="flex items-center gap-3 md:gap-4">
              <a
                href="https://t.me/shantanucsd"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 md:w-12 md:h-12 border-2 border-white rounded-lg flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"
              >
                <Send className="w-5 h-5 md:w-6 md:h-6" />
              </a>
              <a
                href="https://x.com/ShantanuSwami11"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 md:w-12 md:h-12 border-2 border-white rounded-lg flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"
              >
                <Twitter className="w-5 h-5 md:w-6 md:h-6" />
              </a>
            </div>

            {/* Copyright */}
            <div className="text-white/50 text-xs md:text-sm">
              © 2025 Chase
            </div>
          </div>
        </div>
      </motion.footer>
    </main>
  );
}
