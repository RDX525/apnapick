import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("createAdminDataClient", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("falls back to the signed-in admin session when the service role key is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const sessionClient = { from: vi.fn(), auth: {} };
    vi.doMock("@/lib/db/supabase-server", () => ({
      createServerSupabaseClient: async () => sessionClient,
    }));

    const { createAdminDataClient } = await import("@/lib/db/supabase-admin");
    const client = await createAdminDataClient();
    expect(client?.canManageAuthUsers).toBe(false);
    expect(client?.supabase).toBe(sessionClient);
  });

  it("uses the service role when it is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiJ9.service");
    const serviceClient = { kind: "service" };
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => serviceClient,
    }));
    vi.doMock("@/lib/db/supabase-server", () => ({
      createServerSupabaseClient: async () => ({ kind: "session" }),
    }));

    const { createAdminDataClient } = await import("@/lib/db/supabase-admin");
    const client = await createAdminDataClient();
    expect(client?.canManageAuthUsers).toBe(true);
    expect(client?.supabase).toBe(serviceClient);
  });
});
