/**
 * Configuration constants for the chase game
 */

export const GAME_CONFIG = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  GAME_DURATION: 30000, // 30 seconds in milliseconds
  COUNTDOWN_SECONDS: 5,
  ROOM_CODE_LENGTH: 6,
  MAX_GAME_TIMEOUT: 30 * 60 * 1000, // 30 minutes
} as const;

export const RATE_LIMITS = {
  DEFAULT_MAX_REQUESTS: 10,
  DEFAULT_WINDOW_MS: 1000,
  CLEANUP_INTERVAL_MS: 300000, // 5 minutes
  CLEANUP_GRACE_MS: 60000, // 1 minute
} as const;

export const SOCKET_CONFIG = {
  DISCONNECT_GRACE_PERIOD: 60 * 1000, // 60 seconds
  PING_TIMEOUT: 60000,
  PING_INTERVAL: 25000,
  TRANSPORTS: ['websocket', 'polling'],
} as const;

export const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL?.replace(/\/$/, ''),
  'http://localhost:3000',
  'http://localhost:3001'
].filter(Boolean) as string[];
