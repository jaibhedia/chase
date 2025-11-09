'use client';

import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { characters } from '../data/characters';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap } from 'lucide-react';

// Character sprite renderer component
const CharacterSprite = ({ character }: { character: any }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawCharacter = () => {
      const centerX = 60;
      const centerY = 60;
      const baseRadius = 20;

      // Clear canvas
      ctx.clearRect(0, 0, 120, 120);

      // Draw shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;

      // Draw body (larger oval)
      ctx.fillStyle = character.color;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 8, baseRadius * 0.9, baseRadius * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw head
      const headGradient = ctx.createRadialGradient(
        centerX - 3, centerY - baseRadius * 0.8, 0,
        centerX, centerY - baseRadius * 0.6, baseRadius * 0.7
      );
      headGradient.addColorStop(0, shadeColor(character.color, 50));
      headGradient.addColorStop(1, character.color);

      ctx.fillStyle = headGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY - baseRadius * 0.6, baseRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Draw eyes
      const eyeY = centerY - baseRadius * 0.7;
      ctx.fillStyle = '#ffffff';

      // Left eye
      ctx.beginPath();
      ctx.arc(centerX - baseRadius * 0.3, eyeY, baseRadius * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Right eye
      ctx.beginPath();
      ctx.arc(centerX + baseRadius * 0.3, eyeY, baseRadius * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Draw pupils
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(centerX - baseRadius * 0.3, eyeY, baseRadius * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + baseRadius * 0.3, eyeY, baseRadius * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Friendly eyebrows
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(centerX - baseRadius * 0.5, eyeY - baseRadius * 0.2);
      ctx.lineTo(centerX - baseRadius * 0.1, eyeY - baseRadius * 0.15);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX + baseRadius * 0.1, eyeY - baseRadius * 0.15);
      ctx.lineTo(centerX + baseRadius * 0.5, eyeY - baseRadius * 0.2);
      ctx.stroke();

      // Add outline to body
      ctx.strokeStyle = shadeColor(character.color, -50);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 8, baseRadius * 0.9, baseRadius * 1.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Add outline to head
      ctx.beginPath();
      ctx.arc(centerX, centerY - baseRadius * 0.6, baseRadius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    };

    drawCharacter();
  }, [character]);

  const shadeColor = (color: string, percent: number): string => {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = Math.min(255, Math.max(0, R + percent));
    G = Math.min(255, Math.max(0, G + percent));
    B = Math.min(255, Math.max(0, B + percent));

    const RR = R.toString(16).padStart(2, '0');
    const GG = G.toString(16).padStart(2, '0');
    const BB = B.toString(16).padStart(2, '0');

    return `#${RR}${GG}${BB}`;
  };

  return <canvas ref={canvasRef} width={120} height={120} className="mx-auto" />;
};

export default function CharacterSelection() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { gameMode, setCharacter } = useGameStore();

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    } else if (!gameMode) {
      router.push('/mode-selection');
    }
  }, [isConnected, gameMode, router]);

  const handleCharacterSelect = (character: any) => {
    setCharacter(character);
    // Route to multiplayer lobby for multiplayer mode, otherwise map selection
    if (gameMode === 'multiplayer') {
      router.push('/multiplayer-lobby');
    } else {
      router.push('/map-selection');
    }
  };

  if (!gameMode) return null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: ['-100%', '100%'],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
            className="absolute w-1 bg-gradient-to-b from-transparent via-purple-500 to-transparent"
            style={{
              left: `${Math.random() * 100}%`,
              height: `${Math.random() * 200 + 100}px`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-7xl mx-auto text-center space-y-8 p-4 relative z-10">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
        >
          <h1 className="text-6xl md:text-7xl font-black text-white mb-4">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-transparent bg-clip-text">
              SELECT CHARACTER
            </span>
          </h1>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block"
          >
            <p className="text-2xl font-black mb-8 px-6 py-3 rounded-full border-4 border-yellow-400 bg-yellow-400/20 text-yellow-300 uppercase tracking-wider">
              {gameMode === 'single-player' ? '🤖 SINGLE PLAYER' : '👥 MULTIPLAYER'}
            </p>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {characters.map((character, index) => (
            <motion.div
              key={character.id}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCharacterSelect(character)}
              className="relative group cursor-pointer"
            >
              <div 
                className="absolute inset-0 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                style={{ backgroundColor: character.color }}
              />
              <div className="relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-2xl p-6 border-4 group-hover:border-4 transition-all"
                style={{ borderColor: `${character.color}80` }}
              >
                {/* Character Icon with Sprite */}
                <motion.div
                  animate={{ 
                    boxShadow: [
                      `0 0 20px ${character.color}`,
                      `0 0 40px ${character.color}`,
                      `0 0 20px ${character.color}`
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/20 relative overflow-hidden"
                  style={{ backgroundColor: character.color }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  <div className="relative z-10">
                    <CharacterSprite character={character} />
                  </div>
                </motion.div>

                {/* Character Name */}
                <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-wider">{character.name}</h3>
                
                {/* Speed Info */}
                <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg p-3 mb-4 border-2 border-blue-500/50">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <p className="font-black text-blue-300 text-xs uppercase">Movement Speed</p>
                  </div>
                  <p className="font-bold text-white text-sm">Speed: {character.speed.toFixed(1)}/5.0</p>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-300 uppercase flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Speed
                      </span>
                      <span className="text-sm font-black text-white">{character.speed.toFixed(1)}/5.0</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(character.speed / 5) * 100}%` }}
                        transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                        className="h-2 rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${character.color}, ${character.color}dd)`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Select Button */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-full py-2 rounded-lg font-black text-white text-sm uppercase tracking-wider"
                  style={{
                    background: `linear-gradient(135deg, ${character.color}, ${character.color}cc)`,
                  }}
                >
                  Choose
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={() => router.push('/mode-selection')}
            variant="ghost"
            size="lg"
            className="mt-8 text-white hover:text-indigo-300 gap-2 text-lg font-bold border-2 border-indigo-500/30 hover:border-indigo-400"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
