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
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
// Game rooms storage (in-memory for now, can move to Redis later)
const gameRooms = new Map();
const playerSockets = new Map(); // wallet_address -> socket.id
// Constants
const MIN_PLAYERS = 2; // For testing
const MAX_PLAYERS = 6; // Final version
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    // Join room
    socket.on('join-room', async ({ roomCode, walletAddress, characterId, playerName }) => {
        try {
            // Check if room exists in Supabase
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
                socket.emit('error', { message: 'Room already started' });
                return;
            }
            if (room.current_players >= room.max_players) {
                socket.emit('error', { message: 'Room is full' });
                return;
            }
            // Add player to room in Supabase
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
                socket.emit('error', { message: 'Failed to join room' });
                return;
            }
            // Update room player count
            await supabase_1.supabase
                .from('game_rooms')
                .update({ current_players: room.current_players + 1 })
                .eq('id', room.id);
            // Join socket room
            socket.join(roomCode);
            playerSockets.set(walletAddress, socket.id);
            // Store player info in socket
            socket.data = {
                roomCode,
                walletAddress,
                characterId,
                playerName
            };
            // Get all players in room
            const { data: players } = await supabase_1.supabase
                .from('players_in_room')
                .select('*')
                .eq('room_id', room.id);
            // Notify room
            io.to(roomCode).emit('player-joined', {
                players,
                currentPlayers: room.current_players + 1
            });
            console.log(`Player ${walletAddress} joined room ${roomCode}`);
        }
        catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: 'Server error' });
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
            playerSockets.set(walletAddress, socket.id);
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
                io.to(roomCode).emit('game-starting', { countdown: 5 });
                setTimeout(async () => {
                    await supabase_1.supabase
                        .from('game_rooms')
                        .update({ status: 'in-progress', started_at: new Date().toISOString() })
                        .eq('id', room.id);
                    io.to(roomCode).emit('game-started');
                }, 5000);
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
            playerSockets.delete(walletAddress);
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
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🎮 Chase Game Server running on port ${PORT}`);
});
