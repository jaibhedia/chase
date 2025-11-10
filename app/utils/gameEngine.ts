import { useGameStore } from '../store/gameStore';
import { Player, GameObject } from '../store/gameStore';
import { characters } from '../data/characters';
import { audioManager } from './audioManager';

// Image cache for character images
const characterImageCache: { [key: string]: HTMLImageElement } = {};

// Preload character images
function preloadCharacterImage(imagePath: string): HTMLImageElement {
  if (characterImageCache[imagePath]) {
    return characterImageCache[imagePath];
  }
  
  const img = new Image();
  img.src = imagePath;
  characterImageCache[imagePath] = img;
  return img;
}

interface GameState {
  players: Player[];
  objects: GameObject[];
  keys: { [key: string]: boolean };
  playerPosition: { x: number; y: number };
  lastTagTime: number;
  lastTaggedPlayerId: string | null;
  gameStartTime: number;
  earthquakeEffects: Array<{ x: number; y: number; radius: number; alpha: number; cracks: Array<{ angle: number; length: number }> }>;
  portalEffects: Array<{ x: number; y: number; alpha: number; isEntry: boolean }>;
  forceFieldEffects: Array<{ x: number; y: number; radius: number; alpha: number }>;
  punchEffects: Array<{ x: number; y: number; targetX: number; targetY: number; alpha: number }>;
}

const PLAYER_SIZE = 25;
const TAG_DISTANCE = 40;
const COUNTDOWN_DURATION = 3;
const GAME_DURATION = 30;
const TAG_COOLDOWN = 3000; // 3 second cooldown in milliseconds

// Helper function to find a safe spawn position (not inside obstacles)
function findSafeSpawnPosition(
  mapWidth: number, 
  mapHeight: number, 
  objects: GameObject[], 
  existingPlayers: Player[] = [],
  minDistance: number = 100
): { x: number; y: number } {
  const maxAttempts = 50;
  const margin = 80; // Keep away from edges
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = Math.random() * (mapWidth - margin * 2) + margin;
    const y = Math.random() * (mapHeight - margin * 2) + margin;
    
    // Check if position collides with any furniture
    const hasCollision = objects.some(obj => {
      if (obj.type === 'furniture') {
        return (
          x + PLAYER_SIZE / 2 > obj.x &&
          x - PLAYER_SIZE / 2 < obj.x + obj.width &&
          y + PLAYER_SIZE / 2 > obj.y &&
          y - PLAYER_SIZE / 2 < obj.y + obj.height
        );
      }
      return false;
    });
    
    // Check if too close to other players
    const tooCloseToOthers = existingPlayers.some(player => {
      const distance = Math.hypot(x - player.x, y - player.y);
      return distance < minDistance;
    });
    
    // If no collision and not too close to others, this is a safe position
    if (!hasCollision && !tooCloseToOthers) {
      return { x, y };
    }
  }
  
  // Fallback: return center of map if no safe position found
  return { x: mapWidth / 2, y: mapHeight / 2 };
}

export function initializeGame(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const store = useGameStore.getState();
  const { gameMode, selectedCharacter, selectedMap, setGamePhase, setPlayers, setGameObjects, setTimeRemaining, setCountdownTimer, setGameResult, updatePlayer } = store;

  if (!gameMode || !selectedCharacter || !selectedMap) return;

  // Calculate scale to fit map in canvas edge-to-edge
  const scaleX = canvas.width / selectedMap.width;
  const scaleY = canvas.height / selectedMap.height;
  const scale = Math.min(scaleX, scaleY);
  
  const offsetX = (canvas.width - selectedMap.width * scale) / 2;
  const offsetY = (canvas.height - selectedMap.height * scale) / 2;

  const gameState: GameState = {
    players: [],
    objects: [],
    keys: {},
    playerPosition: { x: 100, y: 100 },
    lastTagTime: 0,
    lastTaggedPlayerId: null,
    gameStartTime: Date.now(),
    earthquakeEffects: [],
    portalEffects: [],
    forceFieldEffects: [],
    punchEffects: [],
  };

  const objects: GameObject[] = createMapObjects(selectedMap.id, selectedMap.width, selectedMap.height);
  gameState.objects = objects;
  setGameObjects(objects);

  const players: Player[] = [];
  
  // Spawn human player in a safe position
  const humanSpawn = findSafeSpawnPosition(selectedMap.width, selectedMap.height, objects);
  const humanPlayer: Player = {
    id: 'player',
    x: humanSpawn.x,
    y: humanSpawn.y,
    character: selectedCharacter,
    isBot: false,
    isChaser: false,
    tagCount: 0,
    walletAddress: store.walletAddress || undefined,
    powerUpReady: false,
    powerUpActive: false,
    powerUpCooldown: 0,
    isInvisible: false,
    speedBoostActive: false,
    trail: [],
  };
  players.push(humanPlayer);
  gameState.playerPosition = { x: humanPlayer.x, y: humanPlayer.y };

  // Get available characters for bots (excluding the human player's character)
  const availableCharacters = characters.filter(char => char.id !== selectedCharacter.id);
  
  // Add 5 bots to make total 6 players (1 human + 5 bots)
  const numBots = 5;
  for (let i = 0; i < numBots; i++) {
    // Assign unique characters to bots, cycling through available ones
    const botChar = availableCharacters[i % availableCharacters.length];
    
    // Find safe spawn position for each bot, keeping distance from existing players
    const botSpawn = findSafeSpawnPosition(selectedMap.width, selectedMap.height, objects, players, 120);
    
    const botPlayer = {
      id: `bot-${i}`,
      x: botSpawn.x,
      y: botSpawn.y,
      character: botChar,
      isBot: true,
      isChaser: false,
      tagCount: 0,
      powerUpReady: false,
      powerUpActive: false,
      powerUpCooldown: 0,
      isInvisible: false,
      speedBoostActive: false,
      trail: [],
    };
    
    players.push(botPlayer);
    
    // Lock the character so it can't be used again
    store.lockCharacter(botChar.id);
  }

  gameState.players = players;
  setPlayers(players);

  const randomChaser = players[Math.floor(Math.random() * players.length)];
  randomChaser.isChaser = true;
  updatePlayer(randomChaser.id, { isChaser: true });

  let currentPhase: 'countdown' | 'playing' = 'countdown';
  let countdownTimer = COUNTDOWN_DURATION;
  let gameTimer = GAME_DURATION;
  
  setGamePhase('countdown');
  setCountdownTimer(COUNTDOWN_DURATION);
  setTimeRemaining(GAME_DURATION);

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    
    // Spacebar to activate power-up (prevent repeat with key already pressed check)
    if (key === ' ' && currentPhase === 'playing' && !gameState.keys[key]) {
      e.preventDefault();
      const humanPlayer = gameState.players.find(p => p.id === 'player');
      if (humanPlayer && humanPlayer.powerUpReady && !humanPlayer.powerUpActive && !humanPlayer.powerUpCooldown) {
        activatePowerUp(humanPlayer, gameState, selectedMap);
      }
    }
    
    gameState.keys[key] = true;
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    gameState.keys[e.key.toLowerCase()] = false;
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  const endGame = () => {
    const sortedPlayers = [...gameState.players].sort((a, b) => a.tagCount - b.tagCount);
    const winner = sortedPlayers[0];
    
    let message = '';
    if (winner.id === 'player') {
      message = `You won with ${winner.tagCount} tag${winner.tagCount !== 1 ? 's' : ''}!`;
    } else {
      message = `${winner.character.name} won with ${winner.tagCount} tag${winner.tagCount !== 1 ? 's' : ''}!`;
    }
    
    setGameResult(winner, message);
  };

  let lastTime = Date.now();
  let phaseTickAccumulator = 0;
  let animationId: number;
  let frameCount = 0;
  const targetFPS = 60;
  const frameInterval = 1000 / targetFPS;
  let lastFrameTime = Date.now();

  const gameLoop = () => {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    const timeSinceLastFrame = currentTime - lastFrameTime;
    
    if (timeSinceLastFrame < frameInterval) {
      animationId = requestAnimationFrame(gameLoop);
      return;
    }
    
    lastTime = currentTime;
    lastFrameTime = currentTime - (timeSinceLastFrame % frameInterval);
    frameCount++;

    phaseTickAccumulator += deltaTime;
    if (phaseTickAccumulator >= 1) {
      phaseTickAccumulator = 0;
      
      if (currentPhase === 'countdown') {
        countdownTimer--;
        setCountdownTimer(countdownTimer);
        
        if (countdownTimer <= 0) {
          currentPhase = 'playing';
          setGamePhase('playing');
          audioManager.play('phase');
        }
      } else if (currentPhase === 'playing') {
        gameTimer--;
        setTimeRemaining(gameTimer);
        
        if (gameTimer <= 0) {
          endGame();
          return;
        }
      }
    }

    if (currentPhase === 'playing') {
      updateGame(gameState, deltaTime, selectedMap);
      updatePowerUps(gameState, deltaTime);
      updateEffects(gameState, deltaTime);
    }

    render(ctx, canvas, gameState, currentPhase, countdownTimer, scale, offsetX, offsetY);

    animationId = requestAnimationFrame(gameLoop);
  };

  gameLoop();

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
}

function createMapObjects(mapId: string, width: number, height: number): GameObject[] {
  const objects: GameObject[] = [];

  // Add invisible boundary walls (1px thick for collision only)
  objects.push(
    { id: 'wall-top', x: 0, y: 0, width, height: 1, type: 'wall', color: '#1a1a2e' },
    { id: 'wall-bottom', x: 0, y: height - 1, width, height: 1, type: 'wall', color: '#1a1a2e' },
    { id: 'wall-left', x: 0, y: 0, width: 1, height, type: 'wall', color: '#1a1a2e' },
    { id: 'wall-right', x: width - 1, y: 0, width: 1, height, type: 'wall', color: '#1a1a2e' }
  );

  if (mapId === 'map-1') {
    // Cozy House - Living room, kitchen, bedroom areas with lots of furniture
    objects.push(
      // Living room area
      { id: 'sofa-1', x: 150, y: 200, width: 180, height: 80, type: 'furniture', color: '#8B4513' },
      { id: 'sofa-2', x: 150, y: 300, width: 80, height: 120, type: 'furniture', color: '#8B4513' },
      { id: 'coffee-table', x: 250, y: 250, width: 100, height: 60, type: 'furniture', color: '#654321' },
      { id: 'tv-stand', x: 50, y: 150, width: 60, height: 100, type: 'furniture', color: '#4A4A4A' },
      { id: 'armchair', x: 400, y: 180, width: 70, height: 70, type: 'furniture', color: '#A0522D' },
      
      // Kitchen area
      { id: 'counter-1', x: 200, y: height - 180, width: 250, height: 60, type: 'furniture', color: '#696969' },
      { id: 'counter-2', x: 200, y: height - 240, width: 60, height: 150, type: 'furniture', color: '#696969' },
      { id: 'island', x: 350, y: height - 350, width: 150, height: 100, type: 'furniture', color: '#8B8B8B' },
      { id: 'fridge', x: 50, y: height - 230, width: 80, height: 100, type: 'furniture', color: '#D3D3D3' },
      { id: 'dining-table', x: 550, y: height - 300, width: 140, height: 100, type: 'furniture', color: '#654321' },
      
      // Bedroom area
      { id: 'bed', x: width - 280, y: 120, width: 180, height: 140, type: 'furniture', color: '#A0522D' },
      { id: 'nightstand-1', x: width - 320, y: 120, width: 50, height: 50, type: 'furniture', color: '#654321' },
      { id: 'nightstand-2', x: width - 100, y: 120, width: 50, height: 50, type: 'furniture', color: '#654321' },
      { id: 'wardrobe', x: width - 280, y: 300, width: 100, height: 180, type: 'furniture', color: '#5C4033' },
      { id: 'dresser', x: width - 160, y: 300, width: 120, height: 60, type: 'furniture', color: '#8B4513' },
      
      // Hallway and additional items
      { id: 'bookshelf-1', x: 50, y: 450, width: 80, height: 150, type: 'furniture', color: '#8B4513' },
      { id: 'bookshelf-2', x: width - 130, y: 520, width: 80, height: 150, type: 'furniture', color: '#8B4513' },
      { id: 'plant-1', x: 500, y: 150, width: 40, height: 40, type: 'furniture', color: '#228B22' },
      { id: 'plant-2', x: width - 380, y: 500, width: 40, height: 40, type: 'furniture', color: '#228B22' },
      { id: 'rug-center', x: 600, y: 350, width: 120, height: 80, type: 'furniture', color: '#8B0000' },
      { id: 'sideboard', x: 700, y: 150, width: 150, height: 60, type: 'furniture', color: '#654321' },
      { id: 'desk', x: 900, y: height - 450, width: 120, height: 70, type: 'furniture', color: '#654321' },
      { id: 'chair-1', x: 920, y: height - 380, width: 50, height: 50, type: 'furniture', color: '#4A4A4A' }
    );
  } else if (mapId === 'map-2') {
    // Office Space - Multiple cubicle rows, meeting rooms, desks
    // Cubicle grid
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        objects.push({
          id: `cubicle-${row}-${col}`,
          x: 100 + col * 220,
          y: 100 + row * 180,
          width: 140,
          height: 100,
          type: 'furniture',
          color: '#4A4A4A'
        });
      }
    }
    
    // Meeting rooms and additional furniture
    objects.push(
      // Conference room
      { id: 'conf-table', x: width - 350, y: 150, width: 250, height: 120, type: 'furniture', color: '#654321' },
      { id: 'chair-conf-1', x: width - 370, y: 140, width: 45, height: 45, type: 'furniture', color: '#555555' },
      { id: 'chair-conf-2', x: width - 370, y: 240, width: 45, height: 45, type: 'furniture', color: '#555555' },
      { id: 'chair-conf-3', x: width - 80, y: 140, width: 45, height: 45, type: 'furniture', color: '#555555' },
      { id: 'chair-conf-4', x: width - 80, y: 240, width: 45, height: 45, type: 'furniture', color: '#555555' },
      
      // Break room area
      { id: 'break-counter', x: 150, y: height - 180, width: 200, height: 60, type: 'furniture', color: '#696969' },
      { id: 'vending', x: 50, y: height - 200, width: 70, height: 120, type: 'furniture', color: '#D32F2F' },
      { id: 'break-table-1', x: 400, y: height - 250, width: 100, height: 80, type: 'furniture', color: '#654321' },
      { id: 'break-table-2', x: 550, y: height - 250, width: 100, height: 80, type: 'furniture', color: '#654321' },
      
      // Executive desks
      { id: 'exec-desk-1', x: width - 400, y: height - 200, width: 180, height: 90, type: 'furniture', color: '#5C4033' },
      { id: 'exec-desk-2', x: width - 180, y: height - 200, width: 180, height: 90, type: 'furniture', color: '#5C4033' },
      
      // File cabinets and storage
      { id: 'file-cab-1', x: 60, y: 60, width: 60, height: 80, type: 'furniture', color: '#808080' },
      { id: 'file-cab-2', x: width - 120, y: 60, width: 60, height: 80, type: 'furniture', color: '#808080' },
      { id: 'storage-1', x: 700, y: height - 450, width: 100, height: 120, type: 'furniture', color: '#696969' },
      
      // Office plants
      { id: 'plant-off-1', x: 300, y: 60, width: 40, height: 40, type: 'furniture', color: '#228B22' },
      { id: 'plant-off-2', x: width - 200, y: 400, width: 40, height: 40, type: 'furniture', color: '#228B22' },
      { id: 'plant-off-3', x: 120, y: height - 350, width: 40, height: 40, type: 'furniture', color: '#228B22' }
    );
  } else {
    // Laboratory - Multiple lab benches, equipment, and research stations
    objects.push(
      // Main lab benches in rows
      { id: 'lab-table-1', x: 150, y: 150, width: 200, height: 90, type: 'furniture', color: '#2F4F4F' },
      { id: 'lab-table-2', x: 150, y: 280, width: 200, height: 90, type: 'furniture', color: '#2F4F4F' },
      { id: 'lab-table-3', x: 150, y: 410, width: 200, height: 90, type: 'furniture', color: '#2F4F4F' },
      { id: 'lab-table-4', x: 400, y: 150, width: 200, height: 90, type: 'furniture', color: '#2F4F4F' },
      { id: 'lab-table-5', x: 400, y: 280, width: 200, height: 90, type: 'furniture', color: '#2F4F4F' },
      { id: 'lab-table-6', x: 400, y: 410, width: 200, height: 90, type: 'furniture', color: '#2F4F4F' },
      { id: 'lab-table-7', x: 650, y: 150, width: 200, height: 90, type: 'furniture', color: '#2F4F4F' },
      { id: 'lab-table-8', x: 650, y: 280, width: 200, height: 90, type: 'furniture', color: '#2F4F4F' },
      
      // Large equipment
      { id: 'equipment-1', x: 100, y: height - 250, width: 120, height: 130, type: 'furniture', color: '#778899' },
      { id: 'equipment-2', x: 280, y: height - 250, width: 100, height: 110, type: 'furniture', color: '#778899' },
      { id: 'equipment-3', x: width - 280, y: 200, width: 150, height: 150, type: 'furniture', color: '#778899' },
      { id: 'equipment-4', x: width - 280, y: 400, width: 140, height: 120, type: 'furniture', color: '#778899' },
      { id: 'centrifuge', x: 900, y: 150, width: 80, height: 80, type: 'furniture', color: '#A9A9A9' },
      { id: 'microscope-station', x: 1000, y: 280, width: 100, height: 70, type: 'furniture', color: '#696969' },
      
      // Storage cabinets
      { id: 'cabinet-1', x: 50, y: 100, width: 80, height: 120, type: 'furniture', color: '#4A4A4A' },
      { id: 'cabinet-2', x: 50, y: 250, width: 80, height: 120, type: 'furniture', color: '#4A4A4A' },
      { id: 'cabinet-3', x: width - 130, y: height - 300, width: 80, height: 150, type: 'furniture', color: '#4A4A4A' },
      { id: 'chemical-storage', x: width - 230, y: height - 200, width: 180, height: 100, type: 'furniture', color: '#8B0000' },
      
      // Research stations
      { id: 'computer-desk-1', x: 1100, y: 150, width: 150, height: 80, type: 'furniture', color: '#5C4033' },
      { id: 'computer-desk-2', x: 1100, y: 280, width: 150, height: 80, type: 'furniture', color: '#5C4033' },
      { id: 'computer-desk-3', x: 1100, y: 410, width: 150, height: 80, type: 'furniture', color: '#5C4033' },
      
      // Additional lab furniture
      { id: 'sink-station', x: 450, y: height - 180, width: 180, height: 70, type: 'furniture', color: '#B0C4DE' },
      { id: 'fume-hood', x: 700, y: height - 220, width: 200, height: 140, type: 'furniture', color: '#D3D3D3' },
      { id: 'supply-cart-1', x: 950, y: height - 350, width: 70, height: 100, type: 'furniture', color: '#808080' },
      { id: 'supply-cart-2', x: 1100, y: height - 450, width: 70, height: 100, type: 'furniture', color: '#808080' },
      { id: 'specimen-fridge', x: width - 350, y: height - 150, width: 100, height: 120, type: 'furniture', color: '#E0E0E0' },
      
      // Safety equipment
      { id: 'safety-shower', x: 50, y: height - 150, width: 60, height: 80, type: 'furniture', color: '#FFD700' },
      { id: 'first-aid', x: width - 100, y: 50, width: 50, height: 60, type: 'furniture', color: '#FF0000' }
    );
  }

  return objects;
}

function updateGame(gameState: GameState, deltaTime: number, selectedMap: any) {
  const store = useGameStore.getState();
  const humanPlayer = gameState.players.find(p => p.id === 'player');
  if (!humanPlayer) return;

  // Apply speed boost if active
  const speedMultiplier = humanPlayer.speedBoostActive ? 2.5 : 1.0;
  const speed = humanPlayer.character.speed * 60 * deltaTime * speedMultiplier;
  let newX = humanPlayer.x;
  let newY = humanPlayer.y;

  if (gameState.keys['w'] || gameState.keys['arrowup']) newY -= speed;
  if (gameState.keys['s'] || gameState.keys['arrowdown']) newY += speed;
  if (gameState.keys['a'] || gameState.keys['arrowleft']) newX -= speed;
  if (gameState.keys['d'] || gameState.keys['arrowright']) newX += speed;

  if (!checkCollision(newX, newY, PLAYER_SIZE, gameState.objects, selectedMap.width, selectedMap.height)) {
    humanPlayer.x = newX;
    humanPlayer.y = newY;
    gameState.playerPosition = { x: newX, y: newY };
    store.updatePlayer('player', { x: newX, y: newY });
  }

  gameState.players.forEach(player => {
    if (player.isBot) {
      updateBotPlayer(player, gameState, deltaTime, selectedMap);
    }
  });

  const chaser = gameState.players.find(p => p.isChaser);
  if (chaser) {
    // Filter out invisible players from being tagged
    const otherPlayers = gameState.players.filter(p => !p.isChaser && !p.isInvisible);
    const currentTime = Date.now();
    
    // Check if enough time has passed since last tag
    if (currentTime - gameState.lastTagTime >= TAG_COOLDOWN) {
      otherPlayers.forEach(player => {
        // Don't tag the player who was just tagged (prevent immediate re-tag)
        if (player.id === gameState.lastTaggedPlayerId) return;
        
        const distance = Math.hypot(chaser.x - player.x, chaser.y - player.y);
        if (distance < TAG_DISTANCE && !player.isInvisible) {
          // Calculate push direction (away from old chaser) - increased distance
          const pushDistance = 120;
          const angle = Math.atan2(player.y - chaser.y, player.x - chaser.x);
          let newPlayerX = player.x + Math.cos(angle) * pushDistance;
          let newPlayerY = player.y + Math.sin(angle) * pushDistance;
          
          // Try push, if collision, try smaller push
          if (checkCollision(newPlayerX, newPlayerY, PLAYER_SIZE, gameState.objects, selectedMap.width, selectedMap.height)) {
            const smallerPush = 80;
            newPlayerX = player.x + Math.cos(angle) * smallerPush;
            newPlayerY = player.y + Math.sin(angle) * smallerPush;
          }
          
          // Apply push if valid
          if (!checkCollision(newPlayerX, newPlayerY, PLAYER_SIZE, gameState.objects, selectedMap.width, selectedMap.height)) {
            player.x = newPlayerX;
            player.y = newPlayerY;
          }
          
          // Old chaser loses chaser status
          chaser.isChaser = false;
          // Reset old chaser's AI targets so they start fleeing immediately
          if (chaser.isBot) {
            chaser.targetX = undefined;
            chaser.targetY = undefined;
          }
          store.updatePlayer(chaser.id, { isChaser: false });
          
          // Tagged player becomes chaser and gets tag count incremented
          player.isChaser = true;
          player.tagCount++;
          // Reset new chaser's AI targets so they start chasing immediately
          if (player.isBot) {
            player.targetX = undefined;
            player.targetY = undefined;
          }
          store.updatePlayer(player.id, { isChaser: true, tagCount: player.tagCount, x: player.x, y: player.y });
          
          // Update last tag time and remember who was just tagged
          gameState.lastTagTime = currentTime;
          gameState.lastTaggedPlayerId = chaser.id; // The OLD chaser can't be re-tagged immediately
          
          audioManager.play('tag');
        }
      });
    }
  }
}

function updateBotPlayer(bot: Player, gameState: GameState, deltaTime: number, selectedMap: any) {
  // Apply speed boost if active
  const speedMultiplier = bot.speedBoostActive ? 2.5 : 1.0;
  const speed = bot.character.speed * 60 * deltaTime * speedMultiplier;

  if (bot.isChaser) {
    // Get all non-chaser players (including invisible ones as fallback)
    const visiblePlayers = gameState.players.filter(p => !p.isChaser && !p.isInvisible);
    const allOtherPlayers = gameState.players.filter(p => !p.isChaser);
    
    // Prefer visible players, but chase invisible ones if no visible players exist
    const targetPlayers = visiblePlayers.length > 0 ? visiblePlayers : allOtherPlayers;
    
    if (targetPlayers.length > 0) {
      // Find nearest player to chase
      let nearestPlayer = targetPlayers[0];
      let minDistance = Math.hypot(bot.x - nearestPlayer.x, bot.y - nearestPlayer.y);
      
      for (const player of targetPlayers) {
        const distance = Math.hypot(bot.x - player.x, bot.y - player.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPlayer = player;
        }
      }
      
      // Reset target when chasing
      bot.targetX = undefined;
      bot.targetY = undefined;
      
      moveTowards(bot, nearestPlayer.x, nearestPlayer.y, speed, gameState, selectedMap);
    } else {
      // No other players - wander around
      if (!bot.targetX || !bot.targetY || Math.hypot(bot.x - bot.targetX, bot.y - bot.targetY) < 30) {
        bot.targetX = Math.random() * (selectedMap.width - 100) + 50;
        bot.targetY = Math.random() * (selectedMap.height - 100) + 50;
      }
      moveTowards(bot, bot.targetX, bot.targetY, speed, gameState, selectedMap);
    }
  } else {
    // Bot is not the chaser
    const chaser = gameState.players.find(p => p.isChaser);
    
    if (chaser) {
      const distance = Math.hypot(bot.x - chaser.x, bot.y - chaser.y);
      
      // Run away if chaser is close and visible
      if (distance < 250 && !chaser.isInvisible) {
        // Calculate direction away from chaser
        const awayX = bot.x + (bot.x - chaser.x) * 2;
        const awayY = bot.y + (bot.y - chaser.y) * 2;
        
        // Reset wander target when fleeing
        bot.targetX = undefined;
        bot.targetY = undefined;
        
        moveTowards(bot, awayX, awayY, speed, gameState, selectedMap);
      } else {
        // Wander around when safe
        if (!bot.targetX || !bot.targetY || Math.hypot(bot.x - bot.targetX, bot.y - bot.targetY) < 30) {
          bot.targetX = Math.random() * (selectedMap.width - 100) + 50;
          bot.targetY = Math.random() * (selectedMap.height - 100) + 50;
        }
        moveTowards(bot, bot.targetX, bot.targetY, speed, gameState, selectedMap);
      }
    } else {
      // No chaser found - just wander
      if (!bot.targetX || !bot.targetY || Math.hypot(bot.x - bot.targetX, bot.y - bot.targetY) < 30) {
        bot.targetX = Math.random() * (selectedMap.width - 100) + 50;
        bot.targetY = Math.random() * (selectedMap.height - 100) + 50;
      }
      moveTowards(bot, bot.targetX, bot.targetY, speed, gameState, selectedMap);
    }
  }
}

function moveTowards(player: Player, targetX: number, targetY: number, speed: number, gameState: GameState, selectedMap: any) {
  // Validate inputs
  if (!player || isNaN(targetX) || isNaN(targetY) || isNaN(speed)) return;
  
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const distance = Math.hypot(dx, dy);

  if (distance > 5 && !isNaN(distance) && distance > 0) {
    // Ensure minimum speed for bots so they never get stuck
    const minSpeed = player.isBot ? 2 : 0;
    const actualSpeed = Math.max(speed, minSpeed);
    
    const newX = player.x + (dx / distance) * actualSpeed;
    const newY = player.y + (dy / distance) * actualSpeed;

    // Validate new position
    if (!isNaN(newX) && !isNaN(newY) && isFinite(newX) && isFinite(newY)) {
      if (!checkCollision(newX, newY, PLAYER_SIZE, gameState.objects, selectedMap.width, selectedMap.height)) {
        player.x = newX;
        player.y = newY;
        useGameStore.getState().updatePlayer(player.id, { x: newX, y: newY });
      } else {
        // If collision, try moving in just one direction
        if (!checkCollision(newX, player.y, PLAYER_SIZE, gameState.objects, selectedMap.width, selectedMap.height)) {
          player.x = newX;
          useGameStore.getState().updatePlayer(player.id, { x: newX, y: player.y });
        } else if (!checkCollision(player.x, newY, PLAYER_SIZE, gameState.objects, selectedMap.width, selectedMap.height)) {
          player.y = newY;
          useGameStore.getState().updatePlayer(player.id, { x: player.x, y: newY });
        } else if (player.isBot) {
          // Bot is stuck, generate new random target
          player.targetX = Math.random() * (selectedMap.width - 100) + 50;
          player.targetY = Math.random() * (selectedMap.height - 100) + 50;
        }
      }
    }
  }
}

function checkCollision(x: number, y: number, size: number, objects: GameObject[], mapWidth: number, mapHeight: number): boolean {
  // Check boundary collision (keep players within the map)
  if (x - size / 2 < 0 || x + size / 2 > mapWidth || y - size / 2 < 0 || y + size / 2 > mapHeight) {
    return true;
  }

  // Check collision with furniture only (not walls)
  for (const obj of objects) {
    if (obj.type === 'furniture') {
      if (
        x + size / 2 > obj.x &&
        x - size / 2 < obj.x + obj.width &&
        y + size / 2 > obj.y &&
        y - size / 2 < obj.y + obj.height
      ) {
        return true;
      }
    }
  }

  return false;
}

// Power-up system functions
function updatePowerUps(gameState: GameState, deltaTime: number) {
  const currentTime = Date.now();
  const elapsedTime = currentTime - gameState.gameStartTime;
  
  gameState.players.forEach(player => {
    // Enable power-up after 15 seconds (only if not already used)
    if (!player.powerUpReady && !player.powerUpCooldown && elapsedTime >= 15000) {
      player.powerUpReady = true;
      useGameStore.getState().updatePlayer(player.id, { powerUpReady: true });
    }
    
    // No cooldown system - once used, it's gone forever
    
    // Update speed trail for speed boost
    if (player.speedBoostActive && player.trail) {
      player.trail.push({ x: player.x, y: player.y, alpha: 1.0 });
      if (player.trail.length > 20) player.trail.shift();
      
      player.trail.forEach(point => {
        point.alpha -= deltaTime * 2;
      });
      player.trail = player.trail.filter(point => point.alpha > 0);
    }
    
    // Bots use power-ups randomly (less frequently, only once)
    if (player.isBot && player.powerUpReady && !player.powerUpActive && !player.powerUpCooldown && Math.random() < 0.005) {
      const selectedMap = useGameStore.getState().selectedMap;
      if (selectedMap) {
        activatePowerUp(player, gameState, selectedMap);
      }
    }
  });
}

function updateEffects(gameState: GameState, deltaTime: number) {
  // Update earthquake effects
  gameState.earthquakeEffects = gameState.earthquakeEffects.filter(effect => {
    effect.alpha -= deltaTime * 0.5;
    return effect.alpha > 0;
  });
  
  // Update portal effects
  gameState.portalEffects = gameState.portalEffects.filter(effect => {
    effect.alpha -= deltaTime * 1.5;
    return effect.alpha > 0;
  });
  
  // Update force field effects
  gameState.forceFieldEffects = gameState.forceFieldEffects.filter(effect => {
    effect.alpha -= deltaTime * 1.0;
    effect.radius += deltaTime * 100;
    return effect.alpha > 0;
  });
  
  // Update punch effects
  gameState.punchEffects = gameState.punchEffects.filter(effect => {
    effect.alpha -= deltaTime * 2.0;
    return effect.alpha > 0;
  });
}

function activatePowerUp(player: Player, gameState: GameState, selectedMap: any) {
  // Prevent activation if already used or active
  if (!player.powerUpReady || player.powerUpActive || player.powerUpCooldown) return;
  
  const powerUp = player.character.powerUp;
  player.powerUpActive = true;
  player.powerUpReady = false;
  player.powerUpCooldown = 1; // Mark as used immediately
  
  const store = useGameStore.getState();
  store.updatePlayer(player.id, { powerUpActive: true, powerUpReady: false, powerUpCooldown: 1 });
  
  switch (powerUp.type) {
    case 'speed-boost':
      // Skinny Flash - Speed trail
      player.speedBoostActive = true;
      player.trail = [];
      setTimeout(() => {
        player.speedBoostActive = false;
        player.powerUpActive = false;
        player.powerUpCooldown = 1; // Mark as used (never resets)
        store.updatePlayer(player.id, { speedBoostActive: false, powerUpActive: false, powerUpCooldown: 1 });
      }, powerUp.duration);
      break;
      
    case 'earthquake':
      // Fat Jumper - Earthquake
      const earthquakeCracks = [];
      for (let i = 0; i < 8; i++) {
        earthquakeCracks.push({
          angle: (Math.PI * 2 * i) / 8,
          length: 80 + Math.random() * 40
        });
      }
      gameState.earthquakeEffects.push({
        x: player.x,
        y: player.y,
        radius: 150,
        alpha: 1.0,
        cracks: earthquakeCracks
      });
      
      // Stun nearby players
      gameState.players.forEach(other => {
        if (other.id !== player.id) {
          const dist = Math.hypot(other.x - player.x, other.y - player.y);
          if (dist < 150) {
            // Push away and slow down briefly
            const angle = Math.atan2(other.y - player.y, other.x - player.x);
            const pushDist = 100;
            const newX = other.x + Math.cos(angle) * pushDist;
            const newY = other.y + Math.sin(angle) * pushDist;
            
            if (!checkCollision(newX, newY, PLAYER_SIZE, gameState.objects, selectedMap.width, selectedMap.height)) {
              other.x = newX;
              other.y = newY;
              store.updatePlayer(other.id, { x: newX, y: newY });
            }
          }
        }
      });
      
      setTimeout(() => {
        player.powerUpActive = false;
        player.powerUpCooldown = 1; // Mark as used (never resets)
        store.updatePlayer(player.id, { powerUpActive: false, powerUpCooldown: 1 });
      }, powerUp.duration);
      break;
      
    case 'punch':
      // Muscle Man - Hulk Punch
      const chaser = gameState.players.find(p => p.isChaser && p.id !== player.id);
      if (chaser) {
        const dist = Math.hypot(chaser.x - player.x, chaser.y - player.y);
        if (dist < 200) {
          gameState.punchEffects.push({
            x: player.x,
            y: player.y,
            targetX: chaser.x,
            targetY: chaser.y,
            alpha: 1.0
          });
          
          // Throw chaser away
          const angle = Math.atan2(chaser.y - player.y, chaser.x - player.x);
          const throwDist = 200;
          const newX = chaser.x + Math.cos(angle) * throwDist;
          const newY = chaser.y + Math.sin(angle) * throwDist;
          
          if (!checkCollision(newX, newY, PLAYER_SIZE, gameState.objects, selectedMap.width, selectedMap.height)) {
            chaser.x = newX;
            chaser.y = newY;
            store.updatePlayer(chaser.id, { x: newX, y: newY });
          }
        }
      }
      
      setTimeout(() => {
        player.powerUpActive = false;
        player.powerUpCooldown = 1; // Mark as used (never resets)
        store.updatePlayer(player.id, { powerUpActive: false, powerUpCooldown: 1 });
      }, powerUp.duration);
      break;
      
    case 'teleport':
      // Alien - Portal Teleport
      gameState.portalEffects.push({ x: player.x, y: player.y, alpha: 1.0, isEntry: true });
      
      const newX = Math.random() * (selectedMap.width - 200) + 100;
      const newY = Math.random() * (selectedMap.height - 200) + 100;
      
      setTimeout(() => {
        if (!checkCollision(newX, newY, PLAYER_SIZE, gameState.objects, selectedMap.width, selectedMap.height)) {
          player.x = newX;
          player.y = newY;
          store.updatePlayer(player.id, { x: newX, y: newY });
          gameState.portalEffects.push({ x: newX, y: newY, alpha: 1.0, isEntry: false });
        }
        
        player.powerUpActive = false;
        player.powerUpCooldown = 1; // Mark as used (never resets)
        store.updatePlayer(player.id, { powerUpActive: false, powerUpCooldown: 1 });
      }, 500);
      break;
      
    case 'invisibility':
      // Shadow Creep - Invisibility
      player.isInvisible = true;
      store.updatePlayer(player.id, { isInvisible: true });
      
      setTimeout(() => {
        player.isInvisible = false;
        player.powerUpActive = false;
        player.powerUpCooldown = 1; // Mark as used (never resets)
        store.updatePlayer(player.id, { isInvisible: false, powerUpActive: false, powerUpCooldown: 1 });
      }, powerUp.duration);
      break;
      
    case 'force-field':
      // Dog Hybrid - Force Field Blast
      gameState.forceFieldEffects.push({
        x: player.x,
        y: player.y,
        radius: 50,
        alpha: 1.0
      });
      
      gameState.players.forEach(other => {
        if (other.id !== player.id) {
          const dist = Math.hypot(other.x - player.x, other.y - player.y);
          if (dist < 200) {
            const angle = Math.atan2(other.y - player.y, other.x - player.x);
            const pushDist = 150;
            const newX = other.x + Math.cos(angle) * pushDist;
            const newY = other.y + Math.sin(angle) * pushDist;
            
            if (!checkCollision(newX, newY, PLAYER_SIZE, gameState.objects, selectedMap.width, selectedMap.height)) {
              other.x = newX;
              other.y = newY;
              store.updatePlayer(other.id, { x: newX, y: newY });
            }
          }
        }
      });
      
      setTimeout(() => {
        player.powerUpActive = false;
        player.powerUpCooldown = 1; // Mark as used (never resets)
        store.updatePlayer(player.id, { powerUpActive: false, powerUpCooldown: 1 });
      }, powerUp.duration);
      break;
  }
  
  // Already updated at the start of function, no need to update again
}

function renderEffects(ctx: CanvasRenderingContext2D, gameState: GameState) {
  // Render earthquake effects
  gameState.earthquakeEffects.forEach(effect => {
    ctx.globalAlpha = effect.alpha;
    
    // Draw ground cracks
    effect.cracks.forEach(crack => {
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      const endX = effect.x + Math.cos(crack.angle) * crack.length;
      const endY = effect.y + Math.sin(crack.angle) * crack.length;
      ctx.lineTo(endX, endY);
      
      // Add branching cracks
      const branchAngle = crack.angle + (Math.random() - 0.5) * 0.5;
      const branchLen = crack.length * 0.4;
      const branchX = effect.x + Math.cos(crack.angle) * crack.length * 0.6;
      const branchY = effect.y + Math.sin(crack.angle) * crack.length * 0.6;
      ctx.moveTo(branchX, branchY);
      ctx.lineTo(branchX + Math.cos(branchAngle) * branchLen, branchY + Math.sin(branchAngle) * branchLen);
      ctx.stroke();
    });
    
    // Draw shockwave circle
    ctx.strokeStyle = '#FF6600';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.globalAlpha = 1.0;
  });
  
  // Render portal effects
  gameState.portalEffects.forEach(effect => {
    ctx.globalAlpha = effect.alpha;
    
    // Draw swirling portal
    for (let i = 0; i < 5; i++) {
      const radius = 30 + i * 10;
      const gradient = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, radius);
      gradient.addColorStop(0, effect.isEntry ? '#FF00FF' : '#00FFFF');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw portal edges
    ctx.strokeStyle = effect.isEntry ? '#FF00FF' : '#00FFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, 40, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.globalAlpha = 1.0;
  });
  
  // Render force field effects
  gameState.forceFieldEffects.forEach(effect => {
    ctx.globalAlpha = effect.alpha;
    
    // Draw expanding energy rings
    for (let i = 0; i < 3; i++) {
      const ringRadius = effect.radius + i * 30;
      ctx.strokeStyle = '#AA44FF';
      ctx.lineWidth = 5 - i;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw energy particles
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const px = effect.x + Math.cos(angle) * effect.radius;
      const py = effect.y + Math.sin(angle) * effect.radius;
      
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1.0;
  });
  
  // Render punch effects
  gameState.punchEffects.forEach(effect => {
    ctx.globalAlpha = effect.alpha;
    
    // Draw punch line with stars
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y);
    ctx.lineTo(effect.targetX, effect.targetY);
    ctx.stroke();
    
    // Draw impact stars
    for (let i = 0; i < 3; i++) {
      const t = i / 3;
      const starX = effect.x + (effect.targetX - effect.x) * t;
      const starY = effect.y + (effect.targetY - effect.y) * t;
      
      ctx.fillStyle = '#FFFF00';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('★', starX, starY);
    }
    
    ctx.globalAlpha = 1.0;
  });
}

function render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, gameState: GameState, phase: 'countdown' | 'playing', countdown: number, scale: number, offsetX: number, offsetY: number) {
  // Clear canvas
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Save context state
  ctx.save();
  
  // Apply scale and offset transformations
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Render objects
  gameState.objects.forEach(obj => {
    if (obj.type === 'wall') {
      ctx.fillStyle = obj.color;
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    } else if (obj.type === 'furniture') {
      ctx.fillStyle = obj.color;
      ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 / scale; // Adjust line width for scale
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    }
  });

  // Render power-up effects
  renderEffects(ctx, gameState);

  // Render players
  gameState.players.forEach(player => {
    // Skip invisible players
    if (!player.isInvisible) {
      // Draw speed trail if active
      if (player.speedBoostActive && player.trail) {
        player.trail.forEach((point, index) => {
          ctx.globalAlpha = point.alpha * 0.6;
          ctx.fillStyle = player.character.color;
          const trailSize = 15 - (index * 0.5);
          ctx.beginPath();
          ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;
      }
      
      drawPlayer(ctx, player, scale);
      
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${12 / scale}px Arial`; // Adjust font size for scale
      ctx.textAlign = 'center';
      ctx.fillText(`Tags: ${player.tagCount}`, player.x, player.y - 20);
    }
  });

  // Restore context state before drawing UI overlay
  ctx.restore();

  // Draw countdown overlay (not scaled)
  if (phase === 'countdown') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 100px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(countdown.toString(), canvas.width / 2, canvas.height / 2);
    
    ctx.font = 'bold 30px Arial';
    ctx.fillText('GET READY!', canvas.width / 2, canvas.height / 2 + 80);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, scale: number) {
  const baseRadius = 12.5;
  const shadowBlur = 10 / scale;
  const shadowOffset = 4 / scale;
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = shadowOffset;
  ctx.shadowOffsetY = shadowOffset;

  // Draw chaser glow effect
  if (player.isChaser) {
    ctx.fillStyle = '#FF0000';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y + 4, baseRadius + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Reset shadow for character rendering
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw character image if available, otherwise fall back to drawn character
  if (player.character.image) {
    const img = preloadCharacterImage(player.character.image);
    
    // Draw image if loaded
    if (img.complete && img.naturalHeight !== 0) {
      const imgSize = baseRadius * 3.5; // Size of the character image
      ctx.drawImage(
        img,
        player.x - imgSize / 2,
        player.y - imgSize / 2,
        imgSize,
        imgSize
      );
    } else {
      // Draw fallback circle while image loads
      ctx.fillStyle = player.character.color;
      ctx.beginPath();
      ctx.arc(player.x, player.y, baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Original drawn character (fallback)
    ctx.fillStyle = player.character.color;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 4, baseRadius * 0.9, baseRadius * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = player.character.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y - baseRadius * 0.6, baseRadius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    const eyeY = player.y - baseRadius * 0.7;
    ctx.fillStyle = player.isChaser ? '#ff0000' : '#ffffff';

    ctx.beginPath();
    ctx.arc(player.x - baseRadius * 0.3, eyeY, baseRadius * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(player.x + baseRadius * 0.3, eyeY, baseRadius * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(player.x - baseRadius * 0.3, eyeY, baseRadius * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + baseRadius * 0.3, eyeY, baseRadius * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 4, baseRadius * 0.9, baseRadius * 1.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(player.x, player.y - baseRadius * 0.6, baseRadius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw chaser crown on top of character (for both image and drawn characters)
  if (player.isChaser) {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(player.x - 8, player.y - 18);
    ctx.lineTo(player.x - 4, player.y - 22);
    ctx.lineTo(player.x, player.y - 20);
    ctx.lineTo(player.x + 4, player.y - 22);
    ctx.lineTo(player.x + 8, player.y - 18);
    ctx.lineTo(player.x + 6, player.y - 15);
    ctx.lineTo(player.x - 6, player.y - 15);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 1 / scale;
    ctx.stroke();
  }

  if (!player.isBot) {
    ctx.fillStyle = '#00ff00';
    ctx.font = `bold ${10 / scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('YOU', player.x, player.y + 25);
  }
}
