'use client';

import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useDisconnect } from 'wagmi';
import { useEffect } from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Button } from '@/components/ui/button';

export default function WalletConnect() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const setWalletAddress = useGameStore((state) => state.setWalletAddress);

  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
    } else {
      setWalletAddress(null);
    }
  }, [isConnected, address, setWalletAddress]);

  if (isConnected) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center space-y-4"
      >
        <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-500/50 rounded-xl px-6 py-3 backdrop-blur-sm">
          <p className="text-green-400 font-mono text-lg font-semibold">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
        <Button
          onClick={() => disconnect()}
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
      onClick={() => open()}
      variant="game"
      size="xl"
      className="gap-2"
    >
      <Wallet className="w-5 h-5" />
      Connect Wallet
    </Button>
  );
}
