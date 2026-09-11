import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { persistBusinessClaim } from "@/services/onboarding/submit-claim";

describe("persistBusinessClaim", () => {
  it("uses submit_business_claim RPC even when a service role key exists", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiJ9.test");
    const rpc = vi.fn().mockResolvedValue({
      data: { claimId: "claim-1", businessId: "biz-1", status: "PENDING" },
      error: null,
    });
    const result = await persistBusinessClaim({
      userId: "user-1",
      businessId: "biz-1",
      payload: { mode: "claim", name: "Cafe" },
      userClient: { rpc } as never,
    });
    expect(rpc).toHaveBeenCalledWith("submit_business_claim", {
      p_business_id: "biz-1",
      p_payload: { mode: "claim", name: "Cafe" },
    });
    expect(result).toEqual({
      claimId: "claim-1",
      businessId: "biz-1",
      status: "PENDING",
    });
    vi.unstubAllEnvs();
  });
});
