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

/** In-memory sliding window — replace with Redis in multi-instance production. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();

  hit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
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

export async function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
  store: RateLimitStore = defaultStore,
): Promise<RateLimitResult> {
  return store.hit(key, limit, windowMs);
}
