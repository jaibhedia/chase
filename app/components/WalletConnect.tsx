'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect } from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Button } from '@/components/ui/button';

export default function WalletConnect() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const setWalletAddress = useGameStore((state) => state.setWalletAddress);

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      setWalletAddress(user.wallet.address);
    } else {
      setWalletAddress(null);
    }
  }, [authenticated, user, setWalletAddress]);

  // Don't render until Privy is ready
  if (!ready) {
    return (
      <div className="h-12 w-40 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-2 border-purple-500/50 rounded-xl animate-pulse" />
    );
  }

  if (authenticated && user) {
    const address = user.wallet?.address || user.email?.address || 'Connected';
    const displayText = user.wallet?.address 
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : user.email?.address || 'Connected';

    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center space-y-4"
      >
        <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-500/50 rounded-xl px-6 py-3 backdrop-blur-sm">
          <p className="text-green-400 font-mono text-lg font-semibold">
            {displayText}
          </p>
        </div>
        <Button
          onClick={logout}
          variant="destructive"
          size="lg"
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </Button>
      </motion.div>
    );
  }

  return (
    <Button
      onClick={login}
      variant="game"
      size="xl"
      className="gap-2"
    >
      <Wallet className="w-5 h-5" />
      Connect Wallet
    </Button>
  );
}
