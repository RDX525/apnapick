export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

export interface RateLimitStore {
  hit(
    key: string,
    limit: number,
    windowMs: number,
  ): RateLimitResult | Promise<RateLimitResult>;
}

const MAX_MEMORY_RATE_LIMIT_KEYS = 10_000;

/** In-memory sliding window — replace with Redis in multi-instance production. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();
  private lastSweepAt = 0;
  private maxWindowMs = 0;

  hit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    this.maxWindowMs = Math.max(this.maxWindowMs, windowMs);
    if (now - this.lastSweepAt >= 60_000) {
      const oldestActive = now - this.maxWindowMs;
      for (const [storedKey, timestamps] of this.hits) {
        if ((timestamps.at(-1) ?? 0) <= oldestActive) this.hits.delete(storedKey);
      }
      this.lastSweepAt = now;
    }
    if (!this.hits.has(key) && this.hits.size >= MAX_MEMORY_RATE_LIMIT_KEYS) {
      const oldestKey = this.hits.keys().next().value as string | undefined;
      if (oldestKey) this.hits.delete(oldestKey);
    }
    const windowStart = now - windowMs;
    const prev = this.hits.get(key) ?? [];
    const recent = prev.filter((t) => t > windowStart);

    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return {
        allowed: false,
        remaining: 0,
        resetAt: (recent[0] ?? now) + windowMs,
        limit,
      };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return {
      allowed: true,
      remaining: Math.max(0, limit - recent.length),
      resetAt: now + windowMs,
      limit,
    };
  }
}

const defaultStore = new MemoryRateLimitStore();

export const SEARCH_RATE_LIMIT_MAX = 60;
export const SEARCH_RATE_LIMIT_WINDOW_MS = 60_000;

export function searchRateLimitKey(ip: string) {
  return `search:${ip}`;
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return headers.get("x-real-ip")?.trim() || "anon";
}

async function resolveStore(): Promise<RateLimitStore> {
  const url = process.env.RATE_LIMIT_REDIS_URL?.trim();
  if (!url) return defaultStore;
  const { getSharedRedisRateLimitStore } = await import("@/lib/security/rate-limit-redis");
  return (await getSharedRedisRateLimitStore(url)) ?? defaultStore;
}

export async function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
  store?: RateLimitStore,
): Promise<RateLimitResult> {
  const resolved = store ?? (await resolveStore());
  return resolved.hit(key, limit, windowMs);
}
