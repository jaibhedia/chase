import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { ALLOWED_ORIGINS, SOCKET_CONFIG } from './config/constants';
import { GameManager } from './services/GameManager';
import { SocketManager } from './services/SocketManager';

/**
 * Chase Game Backend Server
 * Clean architecture with separated concerns:
 * - GameManager: Business logic and game state
 * - SocketManager: Real-time communication
 * - Rate limiting and validation built-in
 */

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    const isAllowed = ALLOWED_ORIGINS.some(allowed => 
      allowed?.replace(/\/$/, '') === normalizedOrigin
    );
    callback(null, isAllowed || false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Request-ID'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Explicit preflight OPTIONS handler
app.options('*', cors(corsOptions));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server with enhanced configuration
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/$/, '');
      const isAllowed = ALLOWED_ORIGINS.some(allowed => 
        allowed?.replace(/\/$/, '') === normalizedOrigin
      );
      callback(null, isAllowed || false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: SOCKET_CONFIG.PING_TIMEOUT,
  pingInterval: SOCKET_CONFIG.PING_INTERVAL
});

// Initialize services
const gameManager = new GameManager();
const socketManager = new SocketManager(io, gameManager);

console.log('🎮 GameManager initialized');
console.log('🔌 SocketManager initialized');

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'chase-game-backend',
    clientIP: req.ip,
    origin: req.get('Origin')
  });
});

// API info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: 'Chase Game Backend',
    version: '2.0.0',
    architecture: 'Service-Oriented with Socket.IO',
    features: [
      'Real-time multiplayer',
      'Public/Private rooms',
      'Auto-start when 4/4 ready',
      'Disconnect grace period',
      'Rate limiting',
      'Input validation'
    ],
    endpoints: {
      health: '/health',
      info: '/api/info'
    },
    socketEvents: {
      client_to_server: [
        'create-room',
        'join-room',
        'leave-room',
        'player-ready',
        'start-game',
        'player-position',
        'get-public-rooms'
      ],
      server_to_client: [
        'room-created',
        'room-joined',
        'player-joined',
        'player-left',
        'player-ready-update',
        'room-update',
        'game-starting',
        'game-started',
        'game-ended',
        'player-moved',
        'public-rooms-list',
        'game-update',
        'error'
      ]
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: ['/health', '/api/info']
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log('🚀 Chase Game Backend Server Started');
  console.log(`📡 HTTP Server listening on port ${PORT}`);
  console.log(`🔌 WebSocket Server ready`);
  console.log(`🌐 CORS enabled for:`, ALLOWED_ORIGINS);
  console.log(`🎮 Game Config: ${2}-${4} players, ${30}s game duration`);
  console.log(`⏱️  Disconnect grace period: ${60}s`);
  console.log('');
  console.log('✅ Server is ready to accept connections');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export { app, httpServer, io, gameManager, socketManager };
