import { describe, expect, it } from "vitest";
import { publicEnvSchema, serverEnvSchema } from "@/config/env";
import { MemoryRateLimitStore } from "@/lib/security/rate-limit";
import { AppError, toErrorResponse } from "@/lib/errors/app-error";

describe("env schemas", () => {
  it("parses public defaults", () => {
    const env = publicEnvSchema.parse({});
    expect(env.NEXT_PUBLIC_DEFAULT_CITY).toBe("Pune");
    expect(env.NEXT_PUBLIC_DEFAULT_COUNTRY).toBe("IN");
  });

  it("parses server defaults", () => {
    const env = serverEnvSchema.parse({});
    expect(env.SEARCH_DEFAULT_RADIUS_M).toBe(8000);
    expect(env.LOG_LEVEL).toBe("info");
  });
});

describe("rate limit", () => {
  it("blocks after limit", () => {
    const store = new MemoryRateLimitStore();
    expect(store.hit("k", 2, 60_000).allowed).toBe(true);
    expect(store.hit("k", 2, 60_000).allowed).toBe(true);
    expect(store.hit("k", 2, 60_000).allowed).toBe(false);
  });
});

describe("AppError", () => {
  it("maps exposed client errors", () => {
    const mapped = toErrorResponse(
      new AppError({ message: "Nope", code: "NOPE", status: 400 }),
    );
    expect(mapped.status).toBe(400);
    expect(mapped.body.error).toBe("Nope");
  });

  it("hides internal messages", () => {
    const mapped = toErrorResponse(new Error("secret stack"));
    expect(mapped.status).toBe(500);
    expect(mapped.body.error).toBe("Internal server error");
  });
});
