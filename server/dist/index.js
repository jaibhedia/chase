"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
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
// Helper: Broadcast public rooms to all connected clients
async function broadcastPublicRooms() {
    try {
        const { data: publicRooms } = await supabase_1.supabase
            .from('game_rooms')
            .select('room_code, current_players, max_players, map_id, is_public')
            .eq('status', 'waiting')
            .eq('is_public', true)
            .order('created_at', { ascending: false });
        io.emit('public-rooms-list', publicRooms || []);
    }
    catch (error) {
        console.error('Error broadcasting public rooms:', error);
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
        io.to(roomCode).emit('room-update', {
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
    // Get public rooms
    socket.on('get-public-rooms', async () => {
        await broadcastPublicRooms();
    });
    // Get public rooms
    socket.on('get-public-rooms', async () => {
        await broadcastPublicRooms();
    });
    // Create room
    socket.on('create-room', async ({ walletAddress, mapId, gameMode, characterId, playerName, isPublic = true }) => {
        try {
            const roomCode = generateRoomCode();
            // Create room in database
            const { data: room, error } = await supabase_1.supabase
                .from('game_rooms')
                .insert({
                room_code: roomCode,
                host_id: walletAddress,
                map_id: mapId,
                game_mode: gameMode,
                status: 'waiting',
                min_players: MIN_PLAYERS,
                max_players: MAX_PLAYERS,
                current_players: 1,
                is_public: isPublic
            })
                .select()
                .single();
            if (error || !room) {
                console.error('Room creation error:', error);
                socket.emit('error', { message: 'Failed to create room' });
                return;
            }
            // Add host as first player
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
            console.log(`Room ${roomCode} created by ${walletAddress} (${isPublic ? 'PUBLIC' : 'PRIVATE'})`);
            // Broadcast public rooms list to all
            await broadcastPublicRooms();
        }
        catch (error) {
            console.error('Error creating room:', error);
            socket.emit('error', { message: 'Server error creating room' });
        }
    });
    // Join room
    socket.on('join-room', async ({ roomCode, walletAddress, characterId, playerName }) => {
        try {
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
                console.log(`Player ${walletAddress} reconnected to room ${roomCode}`);
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
            // Send to joiner
            socket.emit('room-joined', {
                room,
                players: players || []
            });
            // Broadcast to everyone in room
            io.to(roomCode).emit('player-joined', {
                players: players || [],
                currentPlayers: newCount
            });
            console.log(`Player ${walletAddress} joined room ${roomCode}`);
            // Update public rooms list
            await broadcastPublicRooms();
        }
        catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: 'Server error joining room' });
        }
    });
    // Create room
    socket.on('create-room', async ({ walletAddress, mapId, gameMode, characterId, playerName }) => {
        try {
            const roomCode = generateRoomCode();
            // Create room in Supabase
            const { data: room, error } = await supabase_1.supabase
                .from('game_rooms')
                .insert({
                room_code: roomCode,
                host_id: walletAddress,
                map_id: mapId,
                game_mode: gameMode,
                status: 'waiting',
                min_players: MIN_PLAYERS,
                max_players: MAX_PLAYERS,
                current_players: 1
            })
                .select()
                .single();
            if (error || !room) {
                socket.emit('error', { message: 'Failed to create room' });
                return;
            }
            // Add host as first player
            await supabase_1.supabase
                .from('players_in_room')
                .insert({
                room_id: room.id,
                wallet_address: walletAddress,
                character_id: characterId,
                player_name: playerName || `Player ${walletAddress.slice(0, 6)}`,
                is_ready: true // Host is always ready
            });
            // Join socket room
            socket.join(roomCode);
            socket.data = {
                roomCode,
                walletAddress,
                characterId,
                playerName,
                isHost: true
            };
            socket.emit('room-created', {
                roomCode,
                room
            });
            console.log(`Room ${roomCode} created by ${walletAddress}`);
        }
        catch (error) {
            console.error('Error creating room:', error);
            socket.emit('error', { message: 'Server error' });
        }
    });
    // Player ready
    socket.on('player-ready', async ({ roomCode, walletAddress }) => {
        try {
            const { data: room } = await supabase_1.supabase
                .from('game_rooms')
                .select('id')
                .eq('room_code', roomCode)
                .single();
            if (!room)
                return;
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
            io.to(roomCode).emit('player-ready-update', { players });
            // Check if all players ready and minimum met
            const allReady = players?.every(p => p.is_ready) || false;
            const enoughPlayers = (players?.length || 0) >= MIN_PLAYERS;
            if (allReady && enoughPlayers) {
                // Start countdown
                const countdownSeconds = 5;
                io.to(roomCode).emit('game-starting', { countdown: countdownSeconds });
                // Send countdown updates
                for (let i = countdownSeconds; i > 0; i--) {
                    setTimeout(() => {
                        io.to(roomCode).emit('countdown-tick', { secondsLeft: i });
                    }, (countdownSeconds - i) * 1000);
                }
                // Start game after countdown
                setTimeout(async () => {
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
                    io.to(roomCode).emit('game-started', {
                        serverTime: gameStartTime,
                        players: gamePlayers || [],
                        gameDuration: GAME_DURATION / 1000 // in seconds
                    });
                    // Update public rooms list (game started, remove from public list)
                    await broadcastPublicRooms();
                    // Set up game end timer
                    setTimeout(async () => {
                        io.to(roomCode).emit('game-ended', {
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
                    }, GAME_DURATION);
                }, COUNTDOWN_SECONDS * 1000);
            }
        }
        catch (error) {
            console.error('Error player ready:', error);
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
            // Broadcast to all players in room except sender
            socket.to(roomCode).emit('game-state-sync', { gameState });
        }
        catch (error) {
            console.error('Error updating game state:', error);
        }
    });
    // Player input (movement, power-up)
    socket.on('player-input', ({ roomCode, input }) => {
        // Broadcast player input to others
        socket.to(roomCode).emit('player-input-sync', {
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
            if (!room)
                return;
            // Update room status
            await supabase_1.supabase
                .from('game_rooms')
                .update({ status: 'finished', finished_at: new Date().toISOString() })
                .eq('id', room.id);
            // Update player stats
            for (const player of results.players) {
                const { data: stats } = await supabase_1.supabase
                    .from('player_stats')
                    .select('*')
                    .eq('wallet_address', player.walletAddress)
                    .single();
                if (stats) {
                    await supabase_1.supabase
                        .from('player_stats')
                        .update({
                        total_games: stats.total_games + 1,
                        wins: stats.wins + (player.isWinner ? 1 : 0),
                        total_tags: stats.total_tags + player.tagCount,
                        avg_tags_per_game: (stats.total_tags + player.tagCount) / (stats.total_games + 1),
                        power_ups_used: stats.power_ups_used + (player.usedPowerUp ? 1 : 0),
                        updated_at: new Date().toISOString()
                    })
                        .eq('wallet_address', player.walletAddress);
                }
                else {
                    await supabase_1.supabase
                        .from('player_stats')
                        .insert({
                        wallet_address: player.walletAddress,
                        total_games: 1,
                        wins: player.isWinner ? 1 : 0,
                        total_tags: player.tagCount,
                        avg_tags_per_game: player.tagCount,
                        power_ups_used: player.usedPowerUp ? 1 : 0
                    });
                }
            }
            // Broadcast results
            io.to(roomCode).emit('game-results', { results });
        }
        catch (error) {
            console.error('Error finishing game:', error);
        }
    });
    // Disconnect
    socket.on('disconnect', async () => {
        console.log('Player disconnected:', socket.id);
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
                            io.to(roomCode).emit('player-left', {
                                walletAddress,
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
