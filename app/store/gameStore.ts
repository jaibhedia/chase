import { create } from 'zustand';

export type GameMode = 'single-player' | 'multiplayer';
export type GamePhase = 'countdown' | 'playing' | 'ended';
export type PowerUpType = 'speed-boost' | 'earthquake' | 'punch' | 'teleport' | 'invisibility' | 'force-field';

export interface PowerUp {
  name: string;
  description: string;
  duration: number;
  cooldown: number;
  type: PowerUpType;
}

export interface Character {
  id: string;
  name: string;
  speed: number;
  color: string;
  image?: string;
  powerUp: PowerUp;
}

export interface GameMap {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
}

export interface Player {
  id: string;
  x: number;
  y: number;
  character: Character;
  isBot: boolean;
  isChaser: boolean;
  tagCount: number;
  walletAddress?: string;
  targetX?: number;  // For bot AI movement
  targetY?: number;  // For bot AI movement
  powerUpReady?: boolean;
  powerUpActive?: boolean;
  powerUpCooldown?: number;
  isInvisible?: boolean;
  speedBoostActive?: boolean;
  trail?: Array<{ x: number; y: number; alpha: number }>;
}

export interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'furniture' | 'wall' | 'hiding-spot';
  color: string;
}

interface GameState {
  // Player setup
  walletAddress: string | null;
  gameMode: GameMode | null;
  selectedCharacter: Character | null;
  selectedMap: GameMap | null;
  lockedCharacters: string[]; // Character IDs that are already taken

  // Game state
  gamePhase: GamePhase;
  players: Player[];
  gameObjects: GameObject[];
  timeRemaining: number;
  countdownTimer: number;
  
  // Game results
  winner: Player | null;
  gameMessage: string;

  // Actions
  setWalletAddress: (address: string | null) => void;
  setGameMode: (mode: GameMode) => void;
  setCharacter: (character: Character) => void;
  setMap: (map: GameMap) => void;
  setGamePhase: (phase: GamePhase) => void;
  setPlayers: (players: Player[]) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  setGameObjects: (objects: GameObject[]) => void;
  setTimeRemaining: (time: number) => void;
  setCountdownTimer: (time: number) => void;
  setGameResult: (winner: Player | null, message: string) => void;
  lockCharacter: (characterId: string) => void;
  unlockCharacter: (characterId: string) => void;
  resetGame: () => void;
}

const initialState = {
  walletAddress: null,
  gameMode: null,
  selectedCharacter: null,
  selectedMap: null,
  lockedCharacters: [] as string[],
  gamePhase: 'countdown' as GamePhase,
  players: [],
  gameObjects: [],
  timeRemaining: 30,
  countdownTimer: 3,
  winner: null,
  gameMessage: '',
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setWalletAddress: (address) => set({ walletAddress: address }),
  setGameMode: (mode) => set({ gameMode: mode }),
  setCharacter: (character) => set({ selectedCharacter: character }),
  setMap: (map) => set({ selectedMap: map }),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setPlayers: (players) => set({ players }),
  updatePlayer: (id, updates) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
  setGameObjects: (objects) => set({ gameObjects: objects }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  setCountdownTimer: (time) => set({ countdownTimer: time }),
  setGameResult: (winner, message) =>
    set({ winner, gameMessage: message, gamePhase: 'ended' }),
  lockCharacter: (characterId) =>
    set((state) => ({
      lockedCharacters: [...state.lockedCharacters, characterId],
    })),
  unlockCharacter: (characterId) =>
    set((state) => ({
      lockedCharacters: state.lockedCharacters.filter((id) => id !== characterId),
    })),
  resetGame: () => set(initialState),
}));
