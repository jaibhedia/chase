/**
 * Utility functions for room code generation and validation
 */

const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ROOM_CODE_LENGTH = 6;

/**
 * Generate a unique 6-character room code
 */
export function generateRoomCode(): string {
  let roomCode = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    roomCode += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
  }
  return roomCode;
}

/**
 * Validate room code format
 */
export function isValidRoomCode(roomCode: string): boolean {
  if (!roomCode || roomCode.length !== ROOM_CODE_LENGTH) {
    return false;
  }
  return /^[A-Z0-9]+$/.test(roomCode);
}

/**
 * Normalize wallet address (trim, lowercase)
 */
export function normalizeWalletAddress(address: string): string {
  return address.trim().toLowerCase();
}

/**
 * Generate a temporary wallet address for testing
 */
export function generateTempWallet(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 9; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `temp_${id}`;
}
