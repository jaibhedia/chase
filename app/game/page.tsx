'use client';

import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import GameCanvas from '../components/GameCanvas';
import GameHUD from '../components/GameHUD';

export default function Game() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { gameMode, selectedCharacter, selectedMap, gamePhase } = useGameStore();

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    } else if (!gameMode || !selectedCharacter || !selectedMap) {
      router.push('/');
    }
  }, [isConnected, gameMode, selectedCharacter, selectedMap, router]);

  if (!gameMode || !selectedCharacter || !selectedMap) return null;

  if (gamePhase === 'ended') {
    router.push('/results');
    return null;
  }

  return (
    <main className="h-screen w-screen bg-black overflow-hidden flex flex-col">
      <GameHUD />
      <div className="flex-1 w-full overflow-hidden">
        <GameCanvas />
      </div>
    </main>
  );
}
