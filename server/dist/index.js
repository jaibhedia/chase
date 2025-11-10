"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const zod_1 = require("zod");
const supabase_1 = require("./supabase");
const app = (0, express_1.default)();
// CORS configuration
const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.CLIENT_URL?.replace(/\/$/, ''),
    'http://localhost:3000',
    'http://localhost:3001'
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        const normalizedOrigin = origin.replace(/\/$/, '');
        const isAllowed = allowedOrigins.some(allowed => allowed?.replace(/\/$/, '') === normalizedOrigin);
        callback(null, isAllowed || false);
    },
    credentials: true,
    methods: ['GET', 'POST']
}));
app.use(express_1.default.json());
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: function (origin, callback) {
            if (!origin)
                return callback(null, true);
            const normalizedOrigin = origin.replace(/\/$/, '');
            const isAllowed = allowedOrigins.some(allowed => allowed?.replace(/\/$/, '') === normalizedOrigin);
            callback(null, isAllowed || false);
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});
// Constants
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const GAME_DURATION = 30000; // 30 seconds
const COUNTDOWN_SECONDS = 5;
// Store active game timers for cleanup
const gameTimers = new Map();
// Input validation schemas
const WalletAddressSchema = zod_1.z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address')
    .or(zod_1.z.string().regex(/^temp_[a-z0-9]{9}$/, 'Invalid temp wallet'));
const CreateRoomSchema = zod_1.z.object({
    walletAddress: WalletAddressSchema,
    mapId: zod_1.z.string().min(1).max(50),
    gameMode: zod_1.z.string().min(1).max(20),
    characterId: zod_1.z.number().int().min(1).max(20),
    playerName: zod_1.z.string().min(1).max(30).regex(/^[a-zA-Z0-9_ ]+$/, 'Invalid player name'),
    isPublic: zod_1.z.boolean().optional().default(true)
});
const JoinRoomSchema = zod_1.z.object({
    roomCode: zod_1.z.string().length(6).regex(/^[A-Z0-9]+$/, 'Invalid room code'),
    walletAddress: WalletAddressSchema,
    characterId: zod_1.z.number().int().min(1).max(20),
    playerName: zod_1.z.string().min(1).max(30).regex(/^[a-zA-Z0-9_ ]+$/, 'Invalid player name')
});
const PlayerReadySchema = zod_1.z.object({
    roomCode: zod_1.z.string().length(6).regex(/^[A-Z0-9]+$/),
    walletAddress: WalletAddressSchema
});
const StartGameSchema = zod_1.z.object({
    roomCode: zod_1.z.string().length(6).regex(/^[A-Z0-9]+$/)
});
const GetRoomStateSchema = zod_1.z.object({
    roomCode: zod_1.z.string().length(6).regex(/^[A-Z0-9]+$/)
});
const rateLimiters = new Map();
function checkRateLimit(socketId, key, maxRequests = 10, windowMs = 1000) {
    const limitKey = `${socketId}:${key}`;
    const now = Date.now();
    const limiter = rateLimiters.get(limitKey);
    if (!limiter || now > limiter.resetAt) {
        rateLimiters.set(limitKey, { count: 1, resetAt: now + windowMs });
        return true;
    }
    if (limiter.count >= maxRequests) {
        return false;
    }
    limiter.count++;
    return true;
}
// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimiters.entries()) {
        if (now > entry.resetAt + 60000) { // 1 minute past reset
            rateLimiters.delete(key);
        }
    }
}, 300000);
// Helper: Broadcast public rooms to all connected clients
async function broadcastPublicRooms() {
    try {
        const { data: publicRooms } = await supabase_1.supabase
            .from('game_rooms')
            .select('room_code, current_players, max_players, map_id, is_public')
            .eq('status', 'waiting')
            .eq('is_public', true)
            .order('created_at', { ascending: false });
        console.log(`📡 Broadcasting ${publicRooms?.length || 0} public rooms`);
        io.emit('public-rooms-list', publicRooms || []);
    }
    catch (error) {
        console.error('❌ Error broadcasting public rooms:', error);
        // Still emit empty array so clients don't hang
        io.emit('public-rooms-list', []);
    }
}
// Helper: Get and broadcast room data
async function broadcastRoomUpdate(roomCode) {
    try {
        const { data: room } = await supabase_1.supabase
            .from('game_rooms')
            .select('id, current_players, max_players')
            .eq('room_code', roomCode)
            .single();
        if (!room)
            return;
        const { data: players } = await supabase_1.supabase
            .from('players_in_room')
            .select('*')
            .eq('room_id', room.id);
        console.log(`🔄 Broadcasting room update for ${roomCode}: ${players?.length || 0} players`);
        // Use io.in() to send to ALL players including sender
        io.in(roomCode).emit('room-update', {
            players: players || [],
            currentPlayers: room.current_players,
            maxPlayers: room.max_players
        });
        // Update public rooms list for everyone
        await broadcastPublicRooms();
    }
    catch (error) {
        console.error('Error broadcasting room update:', error);
    }
}
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    // Send public rooms list on connect
    broadcastPublicRooms();
    // Get public rooms (remove duplicate)
    socket.on('get-public-rooms', async () => {
        // Rate limiting (prevent spam refreshing)
        if (!checkRateLimit(socket.id, 'get-public-rooms', 20, 10000)) {
            return; // Silently ignore (not critical)
        }
        console.log('🔍 Client requested public rooms list');
        await broadcastPublicRooms();
    });
    // Create room
    socket.on('create-room', async (data) => {
        try {
            // Rate limiting
            if (!checkRateLimit(socket.id, 'create-room', 3, 10000)) {
                socket.emit('error', { message: 'Too many requests. Please wait before creating another room.' });
                return;
            }
            // Validate input
            const parsed = CreateRoomSchema.safeParse(data);
            if (!parsed.success) {
                console.error('Invalid create-room data:', parsed.error.flatten());
                socket.emit('error', { message: 'Invalid input data' });
                return;
            }
            const { walletAddress, mapId, gameMode, characterId, playerName, isPublic } = parsed.data;
            const roomCode = generateRoomCode();
            // Prepare room data (conditionally include is_public if column exists)
            const roomData = {
                room_code: roomCode,
                host_id: walletAddress,
                map_id: mapId,
                game_mode: gameMode,
                status: 'waiting',
                min_players: MIN_PLAYERS,
                max_players: MAX_PLAYERS,
                current_players: 1,
                is_public: isPublic
            };
            // Create room in database
            const { data: room, error } = await supabase_1.supabase
                .from('game_rooms')
                .insert(roomData)
                .select()
                .single();
            if (error || !room) {
                console.error('Room creation error:', error);
                socket.emit('error', { message: 'Failed to create room' });
                return;
            }
            // Add host as first player (auto-ready)
            const { error: playerError } = await supabase_1.supabase
                .from('players_in_room')
                .insert({
                room_id: room.id,
                wallet_address: walletAddress,
                character_id: characterId,
                player_name: playerName || `Player ${walletAddress.slice(0, 6)}`,
                is_ready: true // Host is automatically ready
            });
            if (playerError) {
                console.error('Add player error:', playerError);
                await supabase_1.supabase.from('game_rooms').delete().eq('id', room.id);
                socket.emit('error', { message: 'Failed to add player to room' });
                return;
            }
            // Join socket room
            socket.join(roomCode);
            socket.data = { roomCode, walletAddress, characterId, playerName, isHost: true };
            // Get players for response
            const { data: players } = await supabase_1.supabase
                .from('players_in_room')
                .select('*')
                .eq('room_id', room.id);
            // Send response to creator
            socket.emit('room-created', {
                roomCode,
                room,
                players: players || []
            });
            // Also send room-update to sync state
            io.in(roomCode).emit('room-update', {
                players: players || [],
                currentPlayers: 1,
                maxPlayers: MAX_PLAYERS,
                readyPlayers: 1 // Host is ready
            });
            console.log(`🏠 Room ${roomCode} created by ${walletAddress.slice(0, 8)} ${isPublic ? '(PUBLIC)' : '(PRIVATE)'}`);
            console.log(`   Host: temp_${walletAddress.slice(5, 8)}✓ (auto-ready)`);
            // Update public rooms list if public
            if (isPublic) {
                await broadcastPublicRooms();
            }
        }
        catch (error) {
            console.error('Error creating room:', error);
            socket.emit('error', { message: 'Server error creating room' });
        }
    });
    // Join room
    socket.on('join-room', async (data) => {
        try {
            // Rate limiting
            if (!checkRateLimit(socket.id, 'join-room', 5, 5000)) {
                socket.emit('error', { message: 'Too many join attempts. Please wait.' });
                return;
            }
            // Validate input
            const parsed = JoinRoomSchema.safeParse(data);
            if (!parsed.success) {
                console.error('❌ Invalid join-room data:', parsed.error.flatten().fieldErrors);
                socket.emit('error', { message: `Invalid input: ${Object.keys(parsed.error.flatten().fieldErrors).join(', ')}` });
                return;
            }
            const { roomCode, walletAddress, characterId, playerName } = parsed.data;
            console.log(`🔍 Join attempt - Room: ${roomCode}, Player: ${walletAddress.slice(0, 8)}, Char: ${characterId}`);
            // Get room
            const { data: room, error } = await supabase_1.supabase
                .from('game_rooms')
                .select('*')
                .eq('room_code', roomCode)
                .single();
            if (error || !room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }
            if (room.status !== 'waiting') {
                socket.emit('error', { message: 'Game already started' });
                return;
            }
            if (room.current_players >= room.max_players) {
                socket.emit('error', { message: 'Room is full' });
                return;
            }
            // Check if player already in room
            const { data: existingPlayer } = await supabase_1.supabase
                .from('players_in_room')
                .select('*')
                .eq('room_id', room.id)
                .eq('wallet_address', walletAddress)
                .single();
            if (existingPlayer) {
                // Player reconnecting - just join socket room
                socket.join(roomCode);
                socket.data = { roomCode, walletAddress, characterId, playerName };
                const { data: players } = await supabase_1.supabase
                    .from('players_in_room')
                    .select('*')
                    .eq('room_id', room.id);
                socket.emit('room-joined', {
                    room,
                    players: players || [],
                    reconnected: true
                });
                // Notify others that player reconnected
                io.in(roomCode).emit('player-joined', {
                    players: players || [],
                    currentPlayers: room.current_players,
                    maxPlayers: room.max_players
                });
                io.in(roomCode).emit('room-update', {
                    players: players || [],
                    currentPlayers: room.current_players,
                    maxPlayers: room.max_players
                });
                console.log(`🔄 Player ${walletAddress.slice(0, 8)} reconnected to room ${roomCode}`);
                return;
            }
            // Add new player
            const { error: playerError } = await supabase_1.supabase
                .from('players_in_room')
                .insert({
                room_id: room.id,
                wallet_address: walletAddress,
                character_id: characterId,
                player_name: playerName || `Player ${walletAddress.slice(0, 6)}`,
                is_ready: false
            });
            if (playerError) {
                console.error('Join room player error:', playerError);
                socket.emit('error', { message: 'Failed to join room' });
                return;
            }
            // Update room player count
            const newCount = room.current_players + 1;
            await supabase_1.supabase
                .from('game_rooms')
                .update({ current_players: newCount })
                .eq('id', room.id);
            // Join socket room
            socket.join(roomCode);
            socket.data = { roomCode, walletAddress, characterId, playerName };
            // Get all players
            const { data: players } = await supabase_1.supabase
                .from('players_in_room')
                .select('*')
                .eq('room_id', room.id);
            console.log(`➕ Player ${walletAddress.slice(0, 8)} joined room ${roomCode}`);
            console.log(`   Total players in DB: ${players?.length || 0}/${room.max_players}`);
            console.log(`   Players:`, players?.map(p => `${p.wallet_address.slice(0, 8)}${p.is_ready ? '✓' : '○'}`));
            // Send to joiner
            socket.emit('room-joined', {
                room,
                players: players || []
            });
            // Broadcast to ALL players in room (including joiner)
            io.in(roomCode).emit('player-joined', {
                players: players || [],
                currentPlayers: newCount,
                maxPlayers: room.max_players
            });
            // Also send room-update for redundancy
            io.in(roomCode).emit('room-update', {
                players: players || [],
                currentPlayers: newCount,
                maxPlayers: room.max_players
            });
            // Update public rooms list
            await broadcastPublicRooms();
        }
        catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: 'Server error joining room' });
        }
    });
    // Player ready
    socket.on('player-ready', async (data) => {
        try {
            // Rate limiting (prevent ready spam)
            if (!checkRateLimit(socket.id, 'player-ready', 10, 5000)) {
                socket.emit('error', { message: 'Too many ready toggles. Please wait.' });
                return;
            }
            // Validate input
            const parsed = PlayerReadySchema.safeParse(data);
            if (!parsed.success) {
                console.error('Invalid player-ready data:', parsed.error.flatten());
                socket.emit('error', { message: 'Invalid input data' });
                return;
            }
            const { roomCode, walletAddress } = parsed.data;
            const { data: room } = await supabase_1.supabase
                .from('game_rooms')
                .select('id')
                .eq('room_code', roomCode)
                .single();
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }
            // Update player ready status
            await supabase_1.supabase
                .from('players_in_room')
                .update({ is_ready: true })
                .eq('room_id', room.id)
                .eq('wallet_address', walletAddress);
            // Get all players
            const { data: players } = await supabase_1.supabase
                .from('players_in_room')
                .select('*')
                .eq('room_id', room.id);
            const readyCount = players?.filter(p => p.is_ready).length || 0;
            const totalCount = players?.length || 0;
            console.log(`✅ Player ${walletAddress.slice(0, 8)} ready in room ${roomCode}`);
            console.log(`   Ready: ${readyCount}/${totalCount}`);
            console.log(`   Players:`, players?.map(p => `${p.wallet_address.slice(0, 8)}${p.is_ready ? '✓' : '○'}`));
            // Broadcast to ALL players in room
            io.in(roomCode).emit('player-ready-update', {
                players,
                readyCount,
                totalCount
            });
            // Also send room-update for redundancy
            io.in(roomCode).emit('room-update', {
                players,
                currentPlayers: totalCount,
                readyPlayers: readyCount
            });
        }
        catch (error) {
            console.error('Error player ready:', error);
        }
    });
    // Start game (only host can start - manual trigger)
    socket.on('start-game', async (data) => {
        try {
            // Rate limiting
            if (!checkRateLimit(socket.id, 'start-game', 2, 10000)) {
                socket.emit('error', { message: 'Too many start attempts. Please wait.' });
                return;
            }
            // Validate input
            const parsed = StartGameSchema.safeParse(data);
            if (!parsed.success) {
                console.error('Invalid start-game data:', parsed.error.flatten());
                socket.emit('error', { message: 'Invalid input data' });
                return;
            }
            const { roomCode } = parsed.data;
            const { data: room } = await supabase_1.supabase
                .from('game_rooms')
                .select('id, host_id')
                .eq('room_code', roomCode)
                .single();
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }
            // Verify sender is host
            if (socket.data?.walletAddress !== room.host_id) {
                socket.emit('error', { message: 'Only host can start the game' });
                return;
            }
            // Get all players
            const { data: players } = await supabase_1.supabase
                .from('players_in_room')
                .select('*')
                .eq('room_id', room.id);
            const allReady = players?.every(p => p.is_ready) || false;
            const enoughPlayers = (players?.length || 0) >= MIN_PLAYERS;
            if (!allReady) {
                socket.emit('error', { message: 'Not all players are ready' });
                return;
            }
            if (!enoughPlayers) {
                socket.emit('error', { message: `Need at least ${MIN_PLAYERS} players to start` });
                return;
            }
            // Start countdown
            io.in(roomCode).emit('game-starting', { countdown: COUNTDOWN_SECONDS });
            console.log(`Game starting in room ${roomCode} with ${players?.length} players`);
            // Send countdown updates
            for (let i = COUNTDOWN_SECONDS; i > 0; i--) {
                const secondsLeft = i; // Capture value to avoid closure bug
                setTimeout(() => {
                    io.in(roomCode).emit('countdown-tick', { secondsLeft });
                }, (COUNTDOWN_SECONDS - i) * 1000);
            }
            // Create timers FIRST, store immediately for cleanup
            const countdownTimer = setTimeout(async () => {
                const gameStartTime = Date.now();
                await supabase_1.supabase
                    .from('game_rooms')
                    .update({
                    status: 'in-progress',
                    started_at: new Date().toISOString()
                })
                    .eq('id', room.id);
                // Get players for game start
                const { data: gamePlayers } = await supabase_1.supabase
                    .from('players_in_room')
                    .select('*')
                    .eq('room_id', room.id);
                // Send synchronized game start with server timestamp and players
                io.in(roomCode).emit('game-started', {
                    serverTime: gameStartTime,
                    players: gamePlayers || [],
                    gameDuration: GAME_DURATION / 1000 // in seconds
                });
                console.log(`Game started in room ${roomCode}`);
                // Update public rooms list (game started, remove from public list)
                await broadcastPublicRooms();
            }, COUNTDOWN_SECONDS * 1000);
            const gameEndTimer = setTimeout(async () => {
                io.in(roomCode).emit('game-ended', {
                    serverTime: Date.now()
                });
                // Update room status
                await supabase_1.supabase
                    .from('game_rooms')
                    .update({
                    status: 'finished',
                    finished_at: new Date().toISOString()
                })
                    .eq('id', room.id);
                // Update public rooms list
                await broadcastPublicRooms();
                // Clean up timers
                gameTimers.delete(roomCode);
                console.log(`Game ended in room ${roomCode}`);
            }, COUNTDOWN_SECONDS * 1000 + GAME_DURATION);
            // Store timer references IMMEDIATELY (before they fire)
            gameTimers.set(roomCode, { countdownTimer, gameEndTimer });
            console.log(`⏱️  Stored game timers for room ${roomCode}`);
        }
        catch (error) {
            console.error('Error starting game:', error);
            socket.emit('error', { message: 'Failed to start game' });
        }
    });
    // Game state update (from host or server authority)
    socket.on('game-state-update', async ({ roomCode, gameState }) => {
        try {
            const { data: room } = await supabase_1.supabase
                .from('game_rooms')
                .select('id')
                .eq('room_code', roomCode)
                .single();
            if (!room)
                return;
            // Save to database
            await supabase_1.supabase
                .from('game_states')
                .upsert({
                room_id: room.id,
                game_data: gameState,
                updated_at: new Date().toISOString()
            });
            // Broadcast to all players in room (including sender for confirmation)
            io.in(roomCode).emit('game-state-sync', { gameState });
        }
        catch (error) {
            console.error('Error updating game state:', error);
        }
    });
    // Player input (movement, power-up)
    socket.on('player-input', ({ roomCode, input }) => {
        // Broadcast player input to ALL players in room
        io.in(roomCode).emit('player-input-sync', {
            walletAddress: socket.data.walletAddress,
            input
        });
    });
    // Game finished
    socket.on('game-finished', async ({ roomCode, results }) => {
        try {
            const { data: room } = await supabase_1.supabase
                .from('game_rooms')
                .select('id')
                .eq('room_code', roomCode)
                .single();
            if (!room) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }
            // Update room status
            await supabase_1.supabase
                .from('game_rooms')
                .update({ status: 'finished', finished_at: new Date().toISOString() })
                .eq('id', room.id);
            // Optimize player stats update - batch fetch then parallel upsert
            const walletAddresses = results.players.map((p) => p.walletAddress);
            // Batch SELECT all player stats
            const { data: allStats } = await supabase_1.supabase
                .from('player_stats')
                .select('*')
                .in('wallet_address', walletAddresses);
            // Build upsert operations
            const upsertData = results.players.map((player) => {
                const existingStats = allStats?.find(s => s.wallet_address === player.walletAddress);
                if (existingStats) {
                    // Update existing stats
                    const newTotalGames = existingStats.total_games + 1;
                    const newTotalTags = existingStats.total_tags + player.tagCount;
                    return {
                        wallet_address: player.walletAddress,
                        total_games: newTotalGames,
                        wins: existingStats.wins + (player.isWinner ? 1 : 0),
                        total_tags: newTotalTags,
                        avg_tags_per_game: newTotalTags / newTotalGames,
                        power_ups_used: existingStats.power_ups_used + (player.usedPowerUp ? 1 : 0),
                        updated_at: new Date().toISOString()
                    };
                }
                else {
                    // New player stats
                    return {
                        wallet_address: player.walletAddress,
                        total_games: 1,
                        wins: player.isWinner ? 1 : 0,
                        total_tags: player.tagCount,
                        avg_tags_per_game: player.tagCount,
                        power_ups_used: player.usedPowerUp ? 1 : 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                }
            });
            // Batch upsert all stats (single query instead of N queries)
            if (upsertData.length > 0) {
                await supabase_1.supabase
                    .from('player_stats')
                    .upsert(upsertData, { onConflict: 'wallet_address' });
            }
            // Broadcast results to ALL players
            io.in(roomCode).emit('game-results', { results });
        }
        catch (error) {
            console.error('Error finishing game:', error);
        }
    });
    // Get current room state (for sync check)
    socket.on('get-room-state', async (data) => {
        try {
            // Rate limiting
            if (!checkRateLimit(socket.id, 'get-room-state', 30, 10000)) {
                return; // Silently ignore (periodic sync)
            }
            // Validate input
            const parsed = GetRoomStateSchema.safeParse(data);
            if (!parsed.success) {
                return; // Silently ignore invalid sync requests
            }
            const { roomCode } = parsed.data;
            const { data: room } = await supabase_1.supabase
                .from('game_rooms')
                .select('id, room_code, current_players, max_players, status')
                .eq('room_code', roomCode)
                .single();
            if (!room) {
                console.log(`❌ get-room-state: Room ${roomCode} not found`);
                return;
            }
            const { data: players } = await supabase_1.supabase
                .from('players_in_room')
                .select('wallet_address, is_ready, character_id, player_name')
                .eq('room_id', room.id);
            console.log(`🔍 get-room-state for ${roomCode}: ${players?.length || 0} players in DB`);
            console.log('   DB Players:', players?.map(p => p.wallet_address.slice(0, 8)));
            // Send current state back to requester
            socket.emit('room-state-response', {
                room,
                players: players || []
            });
        }
        catch (error) {
            console.error('Error getting room state:', error);
        }
    });
    // Disconnect
    socket.on('disconnect', async () => {
        console.log('Player disconnected:', socket.id);
        // Clean up rate limiters for this socket
        for (const key of rateLimiters.keys()) {
            if (key.startsWith(socket.id)) {
                rateLimiters.delete(key);
            }
        }
        if (socket.data?.walletAddress) {
            const { roomCode, walletAddress } = socket.data;
            if (roomCode) {
                try {
                    const { data: room } = await supabase_1.supabase
                        .from('game_rooms')
                        .select('id, current_players')
                        .eq('room_code', roomCode)
                        .single();
                    if (room) {
                        // Remove player from room
                        await supabase_1.supabase
                            .from('players_in_room')
                            .delete()
                            .eq('room_id', room.id)
                            .eq('wallet_address', walletAddress);
                        // Update player count
                        const newCount = Math.max(0, room.current_players - 1);
                        await supabase_1.supabase
                            .from('game_rooms')
                            .update({ current_players: newCount })
                            .eq('id', room.id);
                        // If room empty, delete it
                        if (newCount === 0) {
                            // Clear any active game timers
                            const timers = gameTimers.get(roomCode);
                            if (timers) {
                                clearTimeout(timers.countdownTimer);
                                clearTimeout(timers.gameEndTimer);
                                gameTimers.delete(roomCode);
                                console.log(`⏱️  Cleared game timers for room ${roomCode}`);
                            }
                            await supabase_1.supabase
                                .from('game_rooms')
                                .delete()
                                .eq('id', room.id);
                            console.log(`Room ${roomCode} deleted (empty)`);
                        }
                        else {
                            // Notify others
                            const { data: players } = await supabase_1.supabase
                                .from('players_in_room')
                                .select('*')
                                .eq('room_id', room.id);
                            console.log(`➖ Player left ${roomCode}: ${walletAddress.slice(0, 8)}`);
                            console.log(`   Remaining players in DB: ${players?.length || 0}`);
                            console.log(`   Broadcasting to room with players:`, players?.map(p => p.wallet_address.slice(0, 8)));
                            // Broadcast to ALL remaining players in room
                            io.in(roomCode).emit('player-left', {
                                walletAddress,
                                players,
                                currentPlayers: newCount
                            });
                            // Also send room-update for redundancy
                            io.in(roomCode).emit('room-update', {
                                players,
                                currentPlayers: newCount
                            });
                        }
                        // Update public rooms list
                        await broadcastPublicRooms();
                    }
                }
                catch (error) {
                    console.error('Error handling disconnect:', error);
                }
            }
        }
    });
});
// Helper function
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Chase Game Server',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/health',
            websocket: 'Socket.io connection available'
        },
        message: 'Server is running successfully! Connect via Socket.io from your frontend.'
    });
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🎮 Chase Game Server running on port ${PORT}`);
});
