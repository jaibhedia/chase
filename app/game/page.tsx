'use client';

import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import GameCanvas from '../components/GameCanvas';
import GameHUD from '../components/GameHUD';
import MobileControls from '../components/MobileControls';
import LandscapePrompt from '../components/LandscapePrompt';

export default function Game() {
  const router = useRouter();
  const { authenticated } = usePrivy();
  const { gameMode, selectedCharacter, selectedMap, gamePhase, players, walletAddress } = useGameStore();
  const [mobileDirection, setMobileDirection] = useState({ x: 0, y: 0 });
  const [mobilePowerUpPressed, setMobilePowerUpPressed] = useState(false);

  // Get current player's power-up state
  const currentPlayer = players.find(p => p.walletAddress === walletAddress || (!p.isBot && players.length > 0));
  const powerUpReady = currentPlayer?.powerUpReady ?? false;
  const powerUpActive = currentPlayer?.powerUpActive ?? false;

  // Prevent scrolling on mobile for game page only
  useEffect(() => {
    const isMobile = window.innerWidth <= 1024;
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.touchAction = 'none';
    }
    
    return () => {
      // Restore scrolling when leaving game page
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
    };
  }, []);

  useEffect(() => {
    if (!authenticated) {
      router.push('/');
    } else if (!gameMode || !selectedCharacter || !selectedMap) {
      router.push('/');
    }
  }, [authenticated, gameMode, selectedCharacter, selectedMap, router]);

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
    <main className="h-screen w-screen bg-black overflow-hidden relative touch-none" style={{ touchAction: 'none' }}>
      <LandscapePrompt />
      <GameHUD />
      <div className="absolute inset-0 w-full h-full">
        <GameCanvas />
      </div>
      <MobileControls
        onDirectionChange={setMobileDirection}
        onPowerUpPress={() => setMobilePowerUpPressed(true)}
        powerUpReady={powerUpReady}
        powerUpActive={powerUpActive}
      />
    </main>
  );
}
