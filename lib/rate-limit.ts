/**
 * In-memory IP-based rate limiter with a global daily budget.
 *
 * Two layers of protection:
 *  1. Per-IP:  10 requests per hour  — prevents individual abuse
 *  2. Global: 500 requests per day   — caps total Anthropic API spend
 *
 * On Vercel serverless the in-memory store resets on cold starts and
 * is not shared across instances. This is acceptable for a low-traffic
 * demo — it still catches abuse within a warm instance. For heavier
 * traffic, swap to Upstash Redis or Vercel KV.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const MAX_REQUESTS_PER_IP = 10;
export const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const DAILY_BUDGET = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Evict when the store exceeds this many entries to prevent memory growth. */
const MAX_STORE_SIZE = 10_000;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

let globalBudget = { count: 0, resetAt: Date.now() + DAY_MS };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
} {
  const now = Date.now();

  // --- Global daily budget -----------------------------------------------
  if (globalBudget.resetAt <= now) {
    globalBudget = { count: 0, resetAt: now + DAY_MS };
  }

  if (globalBudget.count >= DAILY_BUDGET) {
    const retryAfter = Math.ceil((globalBudget.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  // --- Sweep expired per-IP entries --------------------------------------
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }

  // --- Store size cap (evict oldest half if exceeded) --------------------
  if (store.size >= MAX_STORE_SIZE) {
    const sorted = [...store.entries()].sort(
      (a, b) => a[1].resetAt - b[1].resetAt
    );
    const evictCount = Math.floor(sorted.length / 2);
    for (let i = 0; i < evictCount; i++) {
      store.delete(sorted[i][0]);
    }
  }

  // --- Per-IP check ------------------------------------------------------
  const entry = store.get(ip);

  if (!entry || entry.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    globalBudget.count++;
    return { allowed: true, remaining: MAX_REQUESTS_PER_IP - 1, retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS_PER_IP) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  globalBudget.count++;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_IP - entry.count,
    retryAfter: 0,
  };
}
