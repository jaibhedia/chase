'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '../store/gameStore';
import { useGameRoom } from '../hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { gameMaps } from '../data/maps';

export default function MultiplayerLobby() {
  const router = useRouter();
  const { selectedCharacter, selectedMap, gameMode, setMap } = useGameStore();
  const { socket, createRoom, joinRoom, setPlayerReady } = useGameRoom();
  
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [error, setError] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [showMapSelection, setShowMapSelection] = useState(true); // Show map selection first

  // Initialize wallet address on client side only
  useEffect(() => {
    // Get wallet address from localStorage or generate temp ID
    const address = typeof window !== 'undefined' 
      ? localStorage.getItem('walletAddress') || `temp_${Math.random().toString(36).substr(2, 9)}`
      : '';
    setWalletAddress(address);
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for player updates
    socket.on('player-joined', ({ players: updatedPlayers, currentPlayers }) => {
      setPlayers(updatedPlayers);
      console.log(`Player joined. Current players: ${currentPlayers}`);
    });

    socket.on('player-left', ({ walletAddress: leftAddress, players: updatedPlayers, currentPlayers }) => {
      setPlayers(updatedPlayers);
      console.log(`Player ${leftAddress} left. Current players: ${currentPlayers}`);
    });

    socket.on('player-ready-update', ({ players: updatedPlayers }) => {
      setPlayers(updatedPlayers);
    });

    socket.on('game-starting', ({ countdown }) => {
      console.log(`Game starting in ${countdown} seconds...`);
    });

    socket.on('game-started', () => {
      console.log('Game started! Redirecting...');
      router.push('/game');
    });

    return () => {
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('player-ready-update');
      socket.off('game-starting');
      socket.off('game-started');
    };
  }, [socket, router]);

  const handleCreateRoom = async () => {
    if (!selectedCharacter) {
      setError('Please select character first');
      return;
    }

    // Ensure map is selected (should be auto-selected by now)
    const mapToUse = selectedMap || gameMaps[0];

    setIsCreating(true);
    setError('');

    try {
      const response: any = await createRoom({
        walletAddress,
        mapId: mapToUse.id,
        gameMode: 'multiplayer',
        characterId: parseInt(selectedCharacter.id.split('-')[1]),
        playerName: selectedCharacter.name
      });

      setRoomCode(response.roomCode);
      setIsInRoom(true);
      setIsReady(true); // Host is always ready
      console.log('Room created:', response.roomCode);
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (!selectedCharacter) {
      setError('Please select a character first');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      await joinRoom({
        roomCode: roomCode.toUpperCase(),
        walletAddress,
        characterId: parseInt(selectedCharacter.id.split('-')[1]),
        playerName: selectedCharacter.name
      });

      setIsInRoom(true);
      console.log('Joined room:', roomCode);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const handleToggleReady = () => {
    if (!isReady && roomCode) {
      setPlayerReady(roomCode, walletAddress);
      setIsReady(true);
    }
  };

  const minPlayers = 2;
  const maxPlayers = 4;
  const currentPlayers = players.length;
  const allReady = players.every(p => p.is_ready);
  const canStart = currentPlayers >= minPlayers && allReady;

  // Map Selection View (shows first)
  if (showMapSelection && !selectedMap) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <h1 className="text-4xl font-bold text-white text-center mb-8">
            Select Map
          </h1>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {gameMaps.map((map, index) => (
              <Card 
                key={map.id}
                className="p-6 bg-black/40 border-2 border-purple-500/30 cursor-pointer hover:border-purple-400 transition-all"
                onClick={() => {
                  setMap(map);
                  setShowMapSelection(false);
                }}
              >
                <h3 className="text-2xl font-bold text-white mb-2">{map.name}</h3>
                <p className="text-gray-300 mb-4">{map.description}</p>
                <div className="bg-slate-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-400">Dimensions: {map.width} x {map.height}</p>
                </div>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600">
                  Select Map
                </Button>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              onClick={() => router.push('/character-selection')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3"
            >
              ← Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isInRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <h1 className="text-4xl font-bold text-white text-center mb-8">
            Multiplayer Lobby
          </h1>

          {/* Selected Map Display */}
          <Card className="p-4 bg-black/40 border-2 border-green-500/30 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Selected Map</p>
                <p className="text-2xl font-bold text-white">{selectedMap?.name || 'No map selected'}</p>
              </div>
              <Button
                onClick={() => {
                  setMap(null as any);
                  setShowMapSelection(true);
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Change Map
              </Button>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Create Room */}
            <Card className="p-6 bg-black/40 border-2 border-purple-500/30">
              <h2 className="text-2xl font-bold text-white mb-4">Create Room</h2>
              <p className="text-gray-300 mb-6">
                Host a new game and share the room code with friends
              </p>
              <Button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-6 text-lg"
              >
                {isCreating ? 'Creating...' : 'Create Room'}
              </Button>
            </Card>

            {/* Join Room */}
            <Card className="p-6 bg-black/40 border-2 border-blue-500/30">
              <h2 className="text-2xl font-bold text-white mb-4">Join Room</h2>
              <p className="text-gray-300 mb-4">
                Enter a room code to join an existing game
              </p>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
                className="w-full px-4 py-3 bg-black/50 border-2 border-gray-600 rounded-lg text-white text-center text-xl font-bold mb-4 uppercase"
              />
              <Button
                onClick={handleJoinRoom}
                disabled={isJoining || !roomCode.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-6 text-lg"
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </Button>
            </Card>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-500/20 border-2 border-red-500 rounded-lg">
              <p className="text-red-300 text-center font-semibold">{error}</p>
            </div>
          )}

          <div className="mt-8 text-center">
            <Button
              onClick={() => router.push('/character-selection')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3"
            >
              ← Back to Character Selection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Waiting Room
        </h1>

        {/* Room Code Display */}
        <Card className="p-6 bg-black/40 border-2 border-purple-500 mb-6">
          <div className="text-center">
            <p className="text-gray-300 mb-2">Room Code</p>
            <p className="text-5xl font-bold text-white tracking-widest">
              {roomCode}
            </p>
            <p className="text-gray-400 mt-2 text-sm">
              Share this code with your friends
            </p>
          </div>
        </Card>

        {/* Player Count */}
        <Card className="p-4 bg-black/40 border-2 border-blue-500/30 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xl text-white">
              Players: {currentPlayers} / {maxPlayers}
            </span>
            <span className={`text-lg ${currentPlayers >= minPlayers ? 'text-green-400' : 'text-yellow-400'}`}>
              {currentPlayers >= minPlayers ? '✓ Minimum met' : `Need ${minPlayers - currentPlayers} more`}
            </span>
          </div>
        </Card>

        {/* Players List */}
        <Card className="p-6 bg-black/40 border-2 border-purple-500/30 mb-6">
          <h3 className="text-xl font-bold text-white mb-4">Players</h3>
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${player.is_ready ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  <span className="text-white font-semibold">
                    {player.player_name}
                  </span>
                  {player.wallet_address === walletAddress && (
                    <span className="text-purple-400 text-sm">(You)</span>
                  )}
                </div>
                <span className={`text-sm ${player.is_ready ? 'text-green-400' : 'text-yellow-400'}`}>
                  {player.is_ready ? 'Ready' : 'Not Ready'}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Ready Button */}
        {!isReady && (
          <Button
            onClick={handleToggleReady}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-6 text-xl mb-4"
          >
            Ready Up!
          </Button>
        )}

        {isReady && !canStart && (
          <div className="p-4 bg-green-500/20 border-2 border-green-500 rounded-lg mb-4">
            <p className="text-green-300 text-center font-semibold">
              ✓ You are ready! Waiting for other players...
            </p>
          </div>
        )}

        {canStart && (
          <div className="p-4 bg-purple-500/20 border-2 border-purple-500 rounded-lg mb-4 animate-pulse">
            <p className="text-purple-300 text-center font-semibold text-lg">
              🎮 Game starting soon...
            </p>
          </div>
        )}

        <div className="text-center">
          <Button
            onClick={() => {
              socket?.disconnect();
              router.push('/mode-selection');
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
          >
            Leave Room
          </Button>
        </div>
      </div>
    </div>
  );
}
