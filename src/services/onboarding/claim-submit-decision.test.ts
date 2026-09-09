import { describe, expect, it } from "vitest";
import { decideClaimSubmitAction } from "@/services/onboarding/claim-submit-decision";

const published = {
  id: "b1",
  status: "PUBLISHED",
  isClaimed: false,
  deletedAt: null,
};

describe("decideClaimSubmitAction", () => {
  it("updates an existing pending claim instead of blocking on membership", () => {
    expect(
      decideClaimSubmitAction({
        userId: "u1",
        businessId: "b1",
        business: { ...published, isClaimed: true },
        pendingClaim: { id: "c1", claimantId: "u1", status: "PENDING" },
        membership: { userId: "u1", businessId: "b1" },
      }),
    ).toEqual({ action: "update-pending", claimId: "c1", status: "PENDING" });
  });

  it("treats a real membership as already-member, not an error", () => {
    expect(
      decideClaimSubmitAction({
        userId: "u1",
        businessId: "b1",
        business: published,
        pendingClaim: null,
        membership: { userId: "u1", businessId: "b1" },
      }),
    ).toEqual({ action: "already-member" });
  });

  it("ignores another user's membership row", () => {
    expect(
      decideClaimSubmitAction({
        userId: "u1",
        businessId: "b1",
        business: published,
        pendingClaim: null,
        membership: { userId: "someone-else", businessId: "b1" },
      }),
    ).toEqual({ action: "insert" });
  });

  it("rejects a listing claimed by someone else", () => {
    expect(
      decideClaimSubmitAction({
        userId: "u1",
        businessId: "b1",
        business: { ...published, isClaimed: true },
        pendingClaim: null,
        membership: null,
      }),
    ).toEqual({ action: "unavailable", reason: "claimed" });
  });
});
