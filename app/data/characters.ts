import { Character } from '../store/gameStore';

export const characters: Character[] = [
  {
    id: 'char-1',
    name: 'Skinny Flash',
    speed: 4.5,
    color: '#FF4444',
    powerUp: {
      name: 'Speed Trail',
      description: 'Leave a blazing trail with extreme speed',
      duration: 3000, // 3 seconds
      cooldown: 15000, // 15 seconds
      type: 'speed-boost'
    }
  },
  {
    id: 'char-2',
    name: 'Fat Jumper',
    speed: 4.0,
    color: '#FF8844',
    powerUp: {
      name: 'Earthquake Jump',
      description: 'Jump and create ground cracks that stun nearby players',
      duration: 2000, // effect duration
      cooldown: 15000,
      type: 'earthquake'
    }
  },
  {
    id: 'char-3',
    name: 'Muscle Man',
    speed: 3.5,
    color: '#FFAA44',
    powerUp: {
      name: 'Hulk Punch',
      description: 'Powerful punch that throws chasers away',
      duration: 500, // instant effect
      cooldown: 15000,
      type: 'punch'
    }
  },
  {
    id: 'char-4',
    name: 'Alien Walker',
    speed: 3.0,
    color: '#44AAFF',
    powerUp: {
      name: 'Portal Teleport',
      description: 'Teleport randomly through a portal',
      duration: 1000, // animation time
      cooldown: 15000,
      type: 'teleport'
    }
  },
  {
    id: 'char-5',
    name: 'Shadow Creep',
    speed: 2.5,
    color: '#44FF88',
    powerUp: {
      name: 'Invisibility',
      description: 'Become invisible for 2 seconds',
      duration: 2000,
      cooldown: 15000,
      type: 'invisibility'
    }
  },
  {
    id: 'char-6',
    name: 'Dog Hybrid',
    speed: 2.0,
    color: '#AA44FF',
    powerUp: {
      name: 'Force Field Blast',
      description: 'Energy blast that throws everyone away',
      duration: 1000,
      cooldown: 15000,
      type: 'force-field'
    }
  },
];

