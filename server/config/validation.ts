import { z } from 'zod';

/**
 * Validation schemas for all socket events and API requests
 */

export const WalletAddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address')
  .or(z.string().regex(/^temp_[a-z0-9]{9}$/, 'Invalid temp wallet'));

export const CreateRoomSchema = z.object({
  walletAddress: WalletAddressSchema,
  mapId: z.string().min(1).max(50),
  gameMode: z.string().min(1).max(20),
  characterId: z.number().int().min(1).max(20),
  playerName: z.string().min(1).max(30).regex(/^[a-zA-Z0-9_ ]+$/, 'Invalid player name'),
  isPublic: z.boolean().optional().default(true)
});

export const JoinRoomSchema = z.object({
  roomCode: z.string().length(6).regex(/^[A-Z0-9]+$/, 'Invalid room code'),
  walletAddress: WalletAddressSchema,
  characterId: z.number().int().min(1).max(20),
  playerName: z.string().min(1).max(30).regex(/^[a-zA-Z0-9_ ]+$/, 'Invalid player name')
});

export const PlayerReadySchema = z.object({
  roomCode: z.string().length(6).regex(/^[A-Z0-9]+$/),
  walletAddress: WalletAddressSchema
});

export const StartGameSchema = z.object({
  roomCode: z.string().length(6).regex(/^[A-Z0-9]+$/)
});

export const GetRoomStateSchema = z.object({
  roomCode: z.string().length(6).regex(/^[A-Z0-9]+$/)
});

export const PlayerPositionSchema = z.object({
  roomCode: z.string().length(6).regex(/^[A-Z0-9]+$/),
  walletAddress: WalletAddressSchema,
  x: z.number().min(-10000).max(10000),
  y: z.number().min(-10000).max(10000)
});

export const LeaveRoomSchema = z.object({
  roomCode: z.string().length(6).regex(/^[A-Z0-9]+$/),
  walletAddress: WalletAddressSchema
});
