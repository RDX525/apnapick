import { describe, expect, it, vi } from "vitest";
import { RedisRateLimitStore, createRestRedisSender, redisUrlToRest } from "@/lib/security/rate-limit-redis";

describe("redisUrlToRest", () => {
  it("converts Upstash rediss URLs to REST", () => {
    const rest = redisUrlToRest("rediss://default:TOKEN@us1.upstash.io:6379");
    expect(rest).toEqual({ base: "https://us1.upstash.io", token: "TOKEN" });
  });
});

describe("RedisRateLimitStore", () => {
  it("allows then blocks within the window", async () => {
    const counts = new Map<string, number>();
    const send = vi.fn(async (args: string[]) => {
      const command = args[0];
      const key = args[1] ?? "";
      if (command === "INCR") {
        const next = (counts.get(key) ?? 0) + 1;
        counts.set(key, next);
        return next;
      }
      if (command === "PEXPIRE") return 1;
      if (command === "PTTL") return 30_000;
      return 0;
    });
    const store = new RedisRateLimitStore(send);
    expect((await store.hit("search:1.1.1.1", 2, 60_000)).allowed).toBe(true);
    expect((await store.hit("search:1.1.1.1", 2, 60_000)).allowed).toBe(true);
    expect((await store.hit("search:1.1.1.1", 2, 60_000)).allowed).toBe(false);
  });

  it("builds a REST sender that posts command arrays", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ result: 1 }),
    })) as unknown as typeof fetch;
    const send = createRestRedisSender("https://default:TOKEN@example.upstash.io", fetchImpl);
    await send(["INCR", "rl:k"]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.upstash.io",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(["INCR", "rl:k"]),
      }),
    );
  });
});
