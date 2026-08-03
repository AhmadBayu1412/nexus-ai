/**
 * lib/rate-limit.ts
 * 
 * Upstash Redis Rate Limiter
 * Protects against spam and billing abuse
 * 
 * Config: 10 requests per 10 seconds per user
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  limit: number;       // Max requests allowed
  remaining: number;   // Requests remaining
  reset: number;       // Timestamp when limit resets
}

/**
 * Check rate limit for a given identifier
 * Uses lazy initialization to avoid errors when Redis is not configured
 * @param identifier - User ID or IP address
 */
export async function rateLimit(identifier: string): Promise<RateLimitResult> {
  // Skip rate limiting in development if Redis is not configured
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_URL === 'your-upstash-redis-rest-url' ||
    !process.env.UPSTASH_REDIS_REST_URL.startsWith('https')
  ) {
    // Development fallback: allow all requests with no rate limiting
    return {
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 10000,
    };
  }

  // Create Redis instance lazily
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Create rate limiter
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 s'),
    analytics: false, // Disable analytics to reduce overhead
    prefix: 'ratelimit:chat',
  });

  const result = await ratelimit.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}
