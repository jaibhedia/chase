'use client';

import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import GameCanvas from '../components/GameCanvas';
import GameHUD from '../components/GameHUD';
import MobileControls from '../components/MobileControls';

export default function Game() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { gameMode, selectedCharacter, selectedMap, gamePhase } = useGameStore();
  const [mobileDirection, setMobileDirection] = useState({ x: 0, y: 0 });
  const [mobilePowerUpPressed, setMobilePowerUpPressed] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    } else if (!gameMode || !selectedCharacter || !selectedMap) {
      router.push('/');
    }
  }, [isConnected, gameMode, selectedCharacter, selectedMap, router]);

  // Simulate keyboard events from mobile controls
  useEffect(() => {
    const keys: { [key: string]: boolean } = {};
    
    // Convert joystick direction to WASD keys
    if (Math.abs(mobileDirection.x) > 0.2 || Math.abs(mobileDirection.y) > 0.2) {
      if (mobileDirection.y < -0.2) keys['w'] = true;
      if (mobileDirection.y > 0.2) keys['s'] = true;
      if (mobileDirection.x < -0.2) keys['a'] = true;
      if (mobileDirection.x > 0.2) keys['d'] = true;
    }

    // Dispatch keyboard events
    Object.keys(keys).forEach(key => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    });

    return () => {
      Object.keys(keys).forEach(key => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key }));
      });
    };
  }, [mobileDirection]);

  // Handle power-up press
  useEffect(() => {
    if (mobilePowerUpPressed) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
        setMobilePowerUpPressed(false);
      }, 100);
    }
  }, [mobilePowerUpPressed]);

  if (!gameMode || !selectedCharacter || !selectedMap) return null;

  if (gamePhase === 'ended') {
    router.push('/results');
    return null;
  }

  return (
    <main className="h-screen w-screen bg-black overflow-hidden flex flex-col">
      <GameHUD />
      <div className="flex-1 w-full overflow-hidden mt-16 md:mt-32">
        <GameCanvas />
      </div>
      <MobileControls
        onDirectionChange={setMobileDirection}
        onPowerUpPress={() => setMobilePowerUpPressed(true)}
      />
    </main>
  );
}
