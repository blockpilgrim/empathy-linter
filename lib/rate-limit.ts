/**
 * Simple in-memory IP-based rate limiter.
 *
 * This is sufficient for a stateless prototype deployed on a single
 * Vercel serverless instance. For production use, swap to Redis or
 * Vercel KV.
 */

const MAX_REQUESTS = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check whether a request from `ip` is allowed under the rate limit.
 *
 * Performs a simple sweep of expired entries on each call to prevent
 * unbounded memory growth.
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
} {
  const now = Date.now();

  // Sweep expired entries
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }

  const entry = store.get(ip);

  if (!entry || entry.resetAt <= now) {
    // First request in this window (or window expired)
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: MAX_REQUESTS - entry.count, retryAfter: 0 };
}
