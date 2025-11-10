import { RATE_LIMITS } from '../config/constants';

/**
 * Rate limiting utility for preventing abuse
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private limiters = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup old rate limit entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, RATE_LIMITS.CLEANUP_INTERVAL_MS);
  }

  checkLimit(
    socketId: string, 
    key: string, 
    maxRequests: number = RATE_LIMITS.DEFAULT_MAX_REQUESTS, 
    windowMs: number = RATE_LIMITS.DEFAULT_WINDOW_MS
  ): boolean {
    const limitKey = `${socketId}:${key}`;
    const now = Date.now();
    const limiter = this.limiters.get(limitKey);
    
    if (!limiter || now > limiter.resetAt) {
      this.limiters.set(limitKey, { count: 1, resetAt: now + windowMs });
      return true;
    }
    
    if (limiter.count >= maxRequests) {
      return false;
    }
    
    limiter.count++;
    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limiters.entries()) {
      if (now > entry.resetAt + RATE_LIMITS.CLEANUP_GRACE_MS) {
        this.limiters.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.limiters.clear();
  }
}

export const rateLimiter = new RateLimiter();
