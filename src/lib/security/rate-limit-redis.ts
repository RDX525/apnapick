import { createLogger } from "@/lib/logging/logger";
import {
  MemoryRateLimitStore,
  type RateLimitResult,
  type RateLimitStore,
} from "@/lib/security/rate-limit";

const log = createLogger({ module: "rate-limit.redis" });
const fallback = new MemoryRateLimitStore();

type RedisSender = (args: string[]) => Promise<unknown>;

function isHttpUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

function isUpstashUrl(url: string) {
  try {
    return new URL(url).hostname.endsWith("upstash.io");
  } catch {
    return false;
  }
}

/** Convert rediss://default:TOKEN@host:6379 to Upstash REST. */
export function redisUrlToRest(url: string): { base: string; token: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const token = decodeURIComponent(parsed.password || parsed.username);
  if (!token) return null;
  if (isHttpUrl(url)) {
    return { base: `${parsed.protocol}//${parsed.host}`, token };
  }
  if (isUpstashUrl(url)) {
    return { base: `https://${parsed.hostname}`, token };
  }
  return null;
}

export function createRestRedisSender(
  url: string,
  fetchImpl: typeof fetch = fetch,
): RedisSender {
  const rest = redisUrlToRest(url);
  if (!rest) {
    throw new Error("Redis REST URL is invalid");
  }
  return async (args: string[]) => {
    const response = await fetchImpl(rest.base, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rest.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    const json = (await response.json().catch(() => ({}))) as {
      result?: unknown;
      error?: string;
    };
    if (!response.ok || json.error) {
      throw new Error(json.error ?? `Redis REST ${response.status}`);
    }
    return json.result;
  };
}

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly send: RedisSender) {}

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const redisKey = `rl:${key}`;
    try {
      const count = Number(await this.send(["INCR", redisKey]));
      if (count === 1) {
        await this.send(["PEXPIRE", redisKey, String(windowMs)]);
      }
      const ttlRaw = await this.send(["PTTL", redisKey]);
      const ttl = Number(ttlRaw);
      const resetAt = Date.now() + (ttl > 0 ? ttl : windowMs);
      if (count > limit) {
        return { allowed: false, remaining: 0, resetAt, limit };
      }
      return {
        allowed: true,
        remaining: Math.max(0, limit - count),
        resetAt,
        limit,
      };
    } catch (error) {
      log.error("redis_rate_limit_failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      return fallback.hit(key, limit, windowMs);
    }
  }
}

async function createNodeRedisSender(url: string): Promise<RedisSender> {
  const { createClient } = await import("redis");
  const client = createClient({ url });
  client.on("error", (error) => {
    log.error("redis_client_error", { message: error.message });
  });
  await client.connect();
  return async (args: string[]) => {
    const command = args[0];
    const key = args[1];
    if (!key) throw new Error("Redis command missing key");
    switch (command) {
      case "INCR":
        return client.incr(key);
      case "PEXPIRE":
        return client.pExpire(key, Number(args[2]));
      case "PTTL":
        return client.pTTL(key);
      default:
        throw new Error(`Unsupported redis command ${command}`);
    }
  };
}

let redisStorePromise: Promise<RateLimitStore> | null = null;

export function createRedisRateLimitStore(url: string): Promise<RateLimitStore> {
  if (isHttpUrl(url) || isUpstashUrl(url)) {
    return Promise.resolve(new RedisRateLimitStore(createRestRedisSender(url)));
  }
  return createNodeRedisSender(url).then((send) => new RedisRateLimitStore(send));
}

export function getSharedRedisRateLimitStore(
  url: string | undefined,
): Promise<RateLimitStore> | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (!redisStorePromise) {
    redisStorePromise = createRedisRateLimitStore(trimmed).catch((error) => {
      log.error("redis_rate_limit_init_failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      redisStorePromise = null;
      return fallback;
    });
  }
  return redisStorePromise;
}
