import { describe, expect, it } from "vitest";
import { canTransitionClaim, ClaimStateMachine } from "@/services/claims/claim-service";
import { canManageBusiness, recordOwnershipChange } from "@/services/business/ownership";
import { validatePhotoFile } from "@/services/onboarding/photo-validation";

describe("claim state machine", () => {
  it("allows PENDING → UNDER_REVIEW → VERIFIED", () => {
    expect(canTransitionClaim("PENDING", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionClaim("UNDER_REVIEW", "VERIFIED")).toBe(true);
    expect(canTransitionClaim("VERIFIED", "PENDING")).toBe(false);
  });

  it("blocks duplicate active claims", () => {
    const sm = new ClaimStateMachine();
    sm.create({
      id: "c1",
      businessId: "b1",
      claimantId: "u1",
      evidence: {},
    });
    expect(() =>
      sm.create({
        id: "c2",
        businessId: "b1",
        claimantId: "u1",
        evidence: {},
      }),
    ).toThrow(/active claim/i);
  });
});

describe("ownership authorization", () => {
  it("allows owners and denies strangers", () => {
    expect(
      canManageBusiness({
        userId: "u1",
        roles: ["BUSINESS_OWNER"],
        membership: { businessId: "b1", userId: "u1", role: "OWNER" },
      }),
    ).toBe(true);

    expect(
      canManageBusiness({
        userId: "u2",
        roles: ["USER"],
        membership: null,
      }),
    ).toBe(false);
  });

  it("allows staff only with manage_profile", () => {
    expect(
      canManageBusiness({
        userId: "s1",
        roles: ["BUSINESS_STAFF"],
        membership: {
          businessId: "b1",
          userId: "s1",
          role: "STAFF",
          permissions: [],
        },
      }),
    ).toBe(false);

    expect(
      canManageBusiness({
        userId: "s1",
        roles: ["BUSINESS_STAFF"],
        membership: {
          businessId: "b1",
          userId: "s1",
          role: "STAFF",
          permissions: { manage_profile: true },
        },
      }),
    ).toBe(true);
  });

  it("audits ownership changes", () => {
    const events: Parameters<typeof recordOwnershipChange>[0] = [];
    recordOwnershipChange(events, {
      action: "member_added",
      businessId: "b1",
      actorId: "owner",
      subjectUserId: "staff",
      toRole: "STAFF",
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe("member_added");
  });
});

describe("photo validation", () => {
  it("rejects oversized and invalid types", () => {
    expect(validatePhotoFile({ size: 6_000_000, type: "image/jpeg" })).toBe("too_large");
    expect(validatePhotoFile({ size: 100, type: "application/pdf" })).toBe(
      "invalid_type",
    );
    expect(validatePhotoFile({ size: 100, type: "image/png" })).toBeNull();
  });
});
