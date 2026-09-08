import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("requireAdminSession", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("allows SUPER_ADMIN session when roles are present", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.doMock("@/config/feature-flags", () => ({
      isFeatureEnabled: () => true,
    }));
    vi.doMock("@/config/env", () => ({
      hasSupabaseConfig: () => true,
    }));
    vi.doMock("@/lib/auth/session", () => ({
      getSessionUser: async () => ({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        email: "admin@example.com",
        displayName: "Admin",
        roles: ["SUPER_ADMIN"],
      }),
    }));

    const { requireAdminSession } = await import("@/lib/auth/admin");
    const user = await requireAdminSession("admin:moderate");
    expect(user.email).toBe("admin@example.com");
  });

  it("rejects non-admin sessions when Supabase is configured", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.doMock("@/config/feature-flags", () => ({
      isFeatureEnabled: () => true,
    }));
    vi.doMock("@/config/env", () => ({
      hasSupabaseConfig: () => true,
    }));
    vi.doMock("@/lib/auth/session", () => ({
      getSessionUser: async () => ({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        email: "user@example.com",
        displayName: "User",
        roles: ["USER"],
      }),
    }));

    const { requireAdminSession } = await import("@/lib/auth/admin");
    await expect(requireAdminSession()).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });
});
