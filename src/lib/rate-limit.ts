/**
 * lib/rate-limit.ts
 * 
 * Production-Grade Rate Limiter with Upstash Redis & Resilient In-Memory Fallback
 * Protects AI endpoints, prevents bot abuse, quota exhaustion, and billing spikes.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  limit: number;       // Max requests allowed
  remaining: number;   // Requests remaining in the current window
  reset: number;       // Unix timestamp (ms) when limit resets
}

export interface RateLimitOptions {
  limit?: number;           // Max requests (default: 10)
  windowSeconds?: number;   // Window in seconds (default: 10)
  prefix?: string;          // Rate limit key prefix (default: 'ratelimit:chat')
}

// In-Memory Sliding Window Store for Dev or Redis Outages
interface MemoryRecord {
  timestamps: number[];
}
const memoryStore = new Map<string, MemoryRecord>();

// Clean up stale memory records periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60000);
      if (record.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 300000);
}

/**
 * Extract real client IP from incoming request headers
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Perform rate limiting for a given identifier (User ID or IP address)
 */
export async function rateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const {
    limit = 10,
    windowSeconds = 10,
    prefix = 'ratelimit:chat',
  } = options;

  const isRedisConfigured =
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    process.env.UPSTASH_REDIS_REST_URL !== 'your-upstash-redis-rest-url' &&
    process.env.UPSTASH_REDIS_REST_URL.startsWith('https');

  if (isRedisConfigured) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });

      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        analytics: false,
        prefix,
      });

      const result = await ratelimit.limit(identifier);

      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (err) {
      console.warn('⚠️ [RateLimit] Redis unreachable, falling back to in-memory sliding window:', err);
    }
  }

  // Resilient In-Memory Sliding Window Fallback
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = `${prefix}:${identifier}`;

  let record = memoryStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetTime = oldest + windowMs;
    return {
      success: false,
      limit,
      remaining: 0,
      reset: resetTime,
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - record.timestamps.length),
    reset: now + windowMs,
  };
}
