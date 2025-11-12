# Chase - Crypto Web Game

A fast-paced **real-time multiplayer** chase game built with Next.js, Socket.io, and Supabase featuring Privy authentication and engaging top-down gameplay.

## Features

- 🔐 **Privy Authentication**: Secure wallet & email authentication
- 🌐 **Real-time Multiplayer**: Play with friends using Socket.io
- 🎮 **Game Modes**: Choose Single Player or Multiplayer
- 👤 **Unique Characters**: 6 characters with unique power-ups
- 💥 **Power-Up System**: 6 special abilities (Speed Boost, Earthquake, Punch, Teleport, Invisibility, Force Field)
- 🗺️ **Multiple Maps**: Three different environments to play in
- 🤖 **Smart AI Bots**: Intelligent bot players with realistic behavior
- 🎨 **Top-Down Graphics**: Smooth animations and fast-paced action
- ⏱️ **Timed Gameplay**: 3-second countdown, then 30 seconds of intense chase action
- 🏆 **Tag-Based Victory**: Player who gets tagged the least wins!
- 📊 **Player Stats**: Track your wins, tags, and power-up usage

## Game Mechanics

### Chase Rules:
- Game starts with a 3-second countdown
- One player is randomly chosen as the chaser
- The chaser must tag other players within 30 seconds
- When tagged, you become the new chaser
- Goal: Avoid being tagged or be tagged the least
- Winner: Player with the fewest tags after 30 seconds

### Power-Ups:
- Unlock after 15 seconds of gameplay
- Each character has a unique power-up
- Can only be used **once per game**
- Press **SPACEBAR** to activate

### Multiplayer:
- **Testing**: 2 players minimum
- **Production**: 4 players maximum
- Create or join rooms with unique codes
- All players must ready up to start
- Real-time synchronized gameplay

## Quick Setup

### Option 1: Automated Setup (Recommended)
```bash
./setup.sh
```
This will install all dependencies and create environment file templates.

### Option 2: Manual Setup

1. **Install dependencies**:
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   cp server/.env.example server/.env
   ```

3. **Configure Supabase** (see `BACKEND_SETUP.md` for details):
   - Create project at [https://supabase.com](https://supabase.com)
   - Run SQL schema from `/supabase/schema.sql`
   - Update `.env.local` and `server/.env` with your Supabase credentials

4. **Get Privy App ID**:
   - Visit [Privy Dashboard](https://dashboard.privy.io/)
   - Create a new app
   - Copy your App ID

5. **Update `.env.local`**:
   ```
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   ```

6. **Run the servers**:
   ```bash
   # Terminal 1 - Backend Server
   cd server
   npm run dev
   
   # Terminal 2 - Frontend
   npm run dev
   ```

7. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## How to Play

### Single Player
1. **Connect Wallet**: Click "Connect Wallet" and connect your crypto wallet
2. **Choose Mode**: Select Single Player
3. **Pick Character**: Choose a character with your preferred power-up
4. **Select Map**: Pick your preferred battlefield
5. **Play**: 
   - Use **WASD** or **Arrow Keys** to move
   - Press **SPACEBAR** to use your power-up (unlocks at 15 seconds)
   - Get close to other players to tag them when you're the chaser
   - Avoid the chaser when you're not it!
6. **Win**: Be the player with the fewest tags after 30 seconds!

### Multiplayer
1. **Connect Wallet**: Both players connect their wallets
2. **Choose Mode**: Both select Multiplayer
3. **Pick Character**: Both choose characters
4. **Create/Join Room**: 
   - Player 1: Click "Create Room" and share the room code
   - Player 2: Click "Join Room" and enter the code
5. **Ready Up**: Both players click "Ready Up!"
6. **Play**: Same controls as single player, but against real players!

## Tech Stack

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Authentication**: Privy
- **Game Rendering**: HTML5 Canvas
- **Real-time Communication**: Socket.io Client
- **Wallet Support**: MetaMask, Coinbase Wallet, and more via Privy

### Backend
- **Server**: Node.js + Express
- **Real-time**: Socket.io
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Render (recommended)
- **Authentication**: Wallet-based

## Project Structure

```
```
Chase/
├── app/
│   ├── components/          # React components
│   │   ├── WalletConnect.tsx  # Privy authentication UI
│   │   ├── GameCanvas.tsx
│   │   ├── GameHUD.tsx
│   │   └── AudioInitializer.tsx
│   ├── data/               # Game data
│   │   ├── characters.ts    # 6 characters with power-ups
│   │   └── maps.ts
│   ├── hooks/              # Custom hooks
│   │   └── useSocket.ts     # Socket.io multiplayer hook
│   ├── providers/          # Context providers
│   │   ├── PrivyProvider.tsx  # Privy authentication provider
│   │   └── SocketProvider.tsx
│   ├── store/              # State management
│   │   └── gameStore.ts
│   ├── utils/              # Game logic
│   │   ├── gameEngine.ts    # Core game loop
│   │   └── audioManager.ts
│   ├── mode-selection/      # Mode selection page
│   ├── character-selection/ # Character selection page
│   ├── multiplayer-lobby/   # Multiplayer waiting room
│   ├── map-selection/       # Map selection page (single player)
│   ├── game/               # Main game page
│   ├── results/            # Results page
│   └── page.tsx            # Home page
```
├── server/                 # Backend server
│   ├── index.ts            # Socket.io server
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── supabase/
│   └── schema.sql          # Database schema
├── lib/
│   ├── supabase.ts         # Supabase client
│   └── utils.ts
├── public/
├── .env.example
├── BACKEND_SETUP.md        # Detailed backend setup guide
├── setup.sh                # Automated setup script
├── package.json
└── tsconfig.json
```

## Game Features Breakdown

### Characters (6 Total)

Each character has a unique power-up:
1. **Skinny Flash** - Speed Trail (2.5x speed boost for 3s)
2. **Fat Jumper** - Earthquake Jump (stuns nearby players)
3. **Muscle Man** - Power Punch (knocks back and stuns target)
4. **Alien Walker** - Teleport (instant teleportation)
5. **Shadow Creep** - Invisibility (become invisible for 5s)
6. **Dog Hybrid** - Force Field (invulnerable for 3s)

### Maps

1. **Cozy House**: Small house with furniture and hiding spots
2. **Office Space**: Office with cubicles and desks
3. **Laboratory**: Science lab with equipment and tables

### Multiplayer Features

- **Room System**: Create or join rooms with 6-character codes
- **2-4 Players**: Minimum 2 for testing, maximum 4 for full games
- **Ready System**: All players must ready up before game starts
- **Real-time Sync**: Game state synchronized across all players
- **Player Stats**: Track wins, tags, and power-up usage in database
- **Persistent Rooms**: Rooms stored in Supabase database

### AI Behavior (Single Player)

- **Bot Players**: Navigate the map and try to tag the chaser or avoid being tagged
- **Intelligent Movement**: Bots chase when they're "it" and flee when they're not
- **Pathfinding**: Bots navigate around obstacles
- **Dynamic Decisions**: Bots make strategic choices based on game state
- **Power-up Usage**: Bots can use power-ups strategically

## Development

### Running Backend Server
```bash
cd server
npm run dev
```

### Running Frontend
```bash
npm run dev
```

### Build for Production
```bash
# Frontend
npm run build
npm start

# Backend
cd server
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Deployment

### Frontend (Vercel/Netlify)
1. Push code to GitHub
2. Connect repository to Vercel/Netlify
3. Add environment variables
4. Deploy!

### Backend (Render)
See `BACKEND_SETUP.md` for detailed deployment instructions.

## Customization

### Adding New Characters
Edit `app/data/characters.ts` to add new characters with unique power-ups.

### Creating New Maps
Edit `app/data/maps.ts` and add map objects in `app/utils/gameEngine.ts`.

### Adjusting Game Balance
Modify constants in `app/utils/gameEngine.ts`:
- `TAG_DISTANCE`: How close you need to be to tag someone (default: 40)
- `TAG_COOLDOWN`: Cooldown between tags (default: 3000ms)
- `GAME_DURATION`: Total game time (default: 30 seconds)
- `COUNTDOWN_DURATION`: Pre-game countdown (default: 3 seconds)
- `POWER_UP_UNLOCK_TIME`: When power-ups unlock (default: 15 seconds)

### Changing Player Limits
Edit `server/index.ts`:
- `MIN_PLAYERS`: Minimum for testing (default: 2)
- `MAX_PLAYERS`: Maximum players (default: 4)

## Documentation

- **BACKEND_SETUP.md**: Complete backend setup guide
- **server/README.md**: Backend quick start
- **.env.example**: Environment variable template

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - feel free to use this project for learning or building your own games!

## Support

For issues or questions, please open an issue on GitHub.

---

**Enjoy playing Chase!** 🎮
