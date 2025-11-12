'use client';

import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { gameMaps } from '../data/maps';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2 } from 'lucide-react';

// Map preview renderer component
const MapPreview = ({ mapId, color }: { mapId: string, color: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawMap = () => {
      // Clear canvas
      ctx.clearRect(0, 0, 320, 180);

      // Background
      const bgGradient = ctx.createLinearGradient(0, 0, 320, 180);
      bgGradient.addColorStop(0, '#1a1a2e');
      bgGradient.addColorStop(1, '#0f0f1e');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, 320, 180);

      // Scale factor for preview (1400x900 -> 320x180)
      const scaleX = 320 / 1400;
      const scaleY = 180 / 900;

      // Draw walls based on map
      ctx.fillStyle = '#4a5568';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;

      if (mapId === 'cozy-house') {
        // Top wall
        ctx.fillRect(10 * scaleX, 10 * scaleY, 1380 * scaleX, 30 * scaleY);
        // Bottom wall
        ctx.fillRect(10 * scaleX, 860 * scaleY, 1380 * scaleX, 30 * scaleY);
        // Left wall
        ctx.fillRect(10 * scaleX, 10 * scaleY, 30 * scaleX, 880 * scaleY);
        // Right wall
        ctx.fillRect(1360 * scaleX, 10 * scaleY, 30 * scaleX, 880 * scaleY);
      } else if (mapId === 'office-space') {
        // Office cubicles pattern
        ctx.fillRect(10 * scaleX, 10 * scaleY, 1380 * scaleX, 30 * scaleY);
        ctx.fillRect(10 * scaleX, 860 * scaleY, 1380 * scaleX, 30 * scaleY);
        ctx.fillRect(10 * scaleX, 10 * scaleY, 30 * scaleX, 880 * scaleY);
        ctx.fillRect(1360 * scaleX, 10 * scaleY, 30 * scaleX, 880 * scaleY);
      } else if (mapId === 'laboratory') {
        // Lab layout
        ctx.fillRect(10 * scaleX, 10 * scaleY, 1380 * scaleX, 30 * scaleY);
        ctx.fillRect(10 * scaleX, 860 * scaleY, 1380 * scaleX, 30 * scaleY);
        ctx.fillRect(10 * scaleX, 10 * scaleY, 30 * scaleX, 880 * scaleY);
        ctx.fillRect(1360 * scaleX, 10 * scaleY, 30 * scaleX, 880 * scaleY);
      }

      // Draw hiding spots (wooden crates)
      ctx.fillStyle = '#8B4513';
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 2;

      const spots = mapId === 'cozy-house' ? 12 : mapId === 'office-space' ? 8 : 5;
      
      for (let i = 0; i < spots; i++) {
        const x = (100 + (i % 4) * 300) * scaleX;
        const y = (100 + Math.floor(i / 4) * 250) * scaleY;
        const w = 60 * scaleX;
        const h = 60 * scaleY;
        
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      }

      // Draw furniture (tables/desks)
      ctx.fillStyle = '#2d3748';
      ctx.strokeStyle = '#1a202c';
      
      const furniture = mapId === 'cozy-house' ? 8 : mapId === 'office-space' ? 10 : 6;
      
      for (let i = 0; i < furniture; i++) {
        const x = (150 + (i % 3) * 400) * scaleX;
        const y = (200 + Math.floor(i / 3) * 200) * scaleY;
        const w = 80 * scaleX;
        const h = 40 * scaleY;
        
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      }

      // Add glow effect
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.strokeRect(0, 0, 320, 180);
      ctx.shadowBlur = 0;
    };

    drawMap();
  }, [mapId, color]);

  return <canvas ref={canvasRef} width={320} height={180} className="w-full h-full rounded-xl" />;
};

export default function MapSelection() {
  const router = useRouter();
  const { authenticated } = usePrivy();
  const { gameMode, selectedCharacter, setMap } = useGameStore();

  useEffect(() => {
    if (!authenticated) {
      router.push('/');
    } else if (!gameMode) {
      router.push('/mode-selection');
    } else if (!selectedCharacter) {
      router.push('/character-selection');
    }
  }, [authenticated, gameMode, selectedCharacter, router]);

  const handleMapSelect = (map: any) => {
    setMap(map);
    
    // Route based on game mode
    if (gameMode === 'multiplayer') {
      router.push('/multiplayer-lobby');
    } else {
      router.push('/game');
    }
  };

  if (!gameMode || !selectedCharacter) return null;

  const mapColors = ['#10b981', '#06b6d4', '#8b5cf6']; // green, cyan, purple

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 p-4 relative overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}/>
      </div>

      <div className="w-full max-w-7xl mx-auto text-center space-y-8 p-4 relative z-10">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="text-6xl md:text-7xl font-black text-white mb-4">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 text-transparent bg-clip-text">
              CHOOSE ARENA
            </span>
          </h1>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="px-4 py-2 rounded-full bg-purple-600/30 border-2 border-purple-400">
              <p className="font-black text-purple-300 uppercase text-sm">
                {selectedCharacter.name}
              </p>
            </div>
            <span className="text-2xl">⚔️</span>
            <div className="px-4 py-2 rounded-full bg-yellow-600/30 border-2 border-yellow-400">
              <p className="font-black text-yellow-300 uppercase text-sm">
                {gameMode === 'single-player' ? 'SINGLE PLAYER' : 'MULTIPLAYER'}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {gameMaps.map((map, index) => (
            <motion.div
              key={map.id}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: index * 0.2,
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMapSelect(map)}
              className="relative group cursor-pointer"
            >
              <div 
                className="absolute inset-0 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                style={{ backgroundColor: mapColors[index] }}
              />
              <div className="relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-3xl p-6 border-4 group-hover:scale-105 transition-all overflow-hidden"
                style={{ borderColor: `${mapColors[index]}80` }}
              >
                {/* Map Preview with Actual Map Layout */}
                <div className="relative aspect-video bg-slate-950 rounded-xl mb-4 overflow-hidden border-4 border-slate-600 group-hover:border-slate-500">
                  <MapPreview mapId={map.id} color={mapColors[index]} />
                </div>

                {/* Map Name */}
                <h3 className="text-3xl font-black text-white mb-3 uppercase tracking-wider">{map.name}</h3>
                
                {/* Description */}
                <p className="text-green-200 mb-4 font-bold">{map.description}</p>
                
                {/* Map Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between bg-black/30 rounded-lg p-3 border-2 border-green-500/30">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-bold text-green-300">Dimensions</span>
                    </div>
                    <span className="text-sm font-black text-white">{map.width} × {map.height}</span>
                  </div>
                  <div className="flex items-center justify-between bg-black/30 rounded-lg p-3 border-2 border-cyan-500/30">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📦</span>
                      <span className="text-sm font-bold text-cyan-300">Hiding Spots</span>
                    </div>
                    <span className="text-sm font-black text-white">
                      {index === 0 ? 'Many' : index === 1 ? 'Medium' : 'Few'}
                    </span>
                  </div>
                </div>

                {/* Select Button */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-full py-3 rounded-xl font-black text-white text-lg uppercase tracking-wider shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${mapColors[index]}, ${mapColors[index]}cc)`,
                  }}
                >
                  Deploy Here
                </motion.div>

                {/* Corner Decoration */}
                <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg opacity-50"
                  style={{ borderColor: mapColors[index] }}
                />
                <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg opacity-50"
                  style={{ borderColor: mapColors[index] }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={() => router.push('/character-selection')}
            variant="ghost"
            size="lg"
            className="mt-8 text-white hover:text-emerald-300 gap-2 text-lg font-bold border-2 border-emerald-500/30 hover:border-emerald-400"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Button>
        </motion.div>
      </div>
    </main>
  );
}
