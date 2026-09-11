import { describe, expect, it } from "vitest";
import {
  dashboardStatusFromBusiness,
  verificationStatusFromListing,
  workspaceFromOwnerListing,
  type OwnerListingSnapshot,
} from "@/services/dashboard/owner-workspace";

function snapshot(
  overrides: Partial<OwnerListingSnapshot["business"]> = {},
): OwnerListingSnapshot {
  return {
    business: {
      id: "fab8ea58-0fa6-4e9e-b1ff-a273bfaa64f1",
      name: "Flow Test Kitchen",
      slug: "flow-test-kitchen-fab8ea58",
      description: "A neighbourhood kitchen for chicken curry.",
      status: "PENDING_REVIEW",
      phone: "9876543210",
      email: "apnapick.owner.flow@example.com",
      website: null,
      priceLevel: 2,
      completeness: 65,
      isClaimed: false,
      verifiedAt: null,
      metadata: { temporarilyClosed: false },
      updatedAt: "2026-09-08T11:08:36.000Z",
      reviewCount: 0,
      ...overrides,
    },
    location: {
      suburb: "Koregaon Park",
      city: "Pune",
      addressLine1: "12 North Main Road",
      lat: 18.5362,
      lng: 73.8938,
    },
    categorySlug: "restaurants",
    hours: [{ dayOfWeek: 1, opensAt: "10:00:00", closesAt: "22:00:00", isClosed: false }],
    specialHours: [],
    products: [
      {
        id: "prod-1",
        name: "Chicken Curry",
        description: null,
        priceCents: null,
        published: true,
        sortOrder: 0,
      },
    ],
    services: [],
    photos: [],
    menu: [],
    offers: [],
    reviews: [],
    leads: [],
    team: [],
    metrics: {
      views: 0,
      searchImpressions: 0,
      clicks: 0,
      calls: 0,
      directions: 0,
      leads: 0,
      favorites: 0,
    },
  };
}

describe("workspaceFromOwnerListing", () => {
  it("maps a submitted listing to pending review with stored completeness", () => {
    const workspace = workspaceFromOwnerListing(snapshot());
    expect(workspace.profile.name).toBe("Flow Test Kitchen");
    expect(workspace.profile.status).toBe("PENDING_REVIEW");
    expect(workspace.profile.completeness).toBe(65);
    expect(workspace.profile.suburb).toBe("Koregaon Park");
    expect(workspace.profile.lat).toBe(18.5362);
    expect(workspace.profile.lng).toBe(73.8938);
    expect(workspace.profile.verificationStatus).toBe("UNCLAIMED");
    expect(workspace.profile.ownerEditPending).toBe(false);
    expect(workspace.products[0]?.name).toBe("Chicken Curry");
    expect(workspace.hours[1]?.isClosed).toBe(false);
    expect(workspace.hours[1]?.opensAt).toBe("10:00");
  });

  it("maps an approved listing to published", () => {
    const workspace = workspaceFromOwnerListing(
      snapshot({ status: "PUBLISHED", isClaimed: false }),
    );
    expect(workspace.profile.status).toBe("PUBLISHED");
  });

  it("flags published listings with owner edits awaiting admin review", () => {
    const workspace = workspaceFromOwnerListing(
      snapshot({
        status: "PUBLISHED",
        metadata: { ownerEditPending: true },
      }),
    );
    expect(workspace.profile.status).toBe("PUBLISHED");
    expect(workspace.profile.ownerEditPending).toBe(true);
  });
});

describe("dashboard status helpers", () => {
  it("treats merged listings as rejected in the owner dashboard", () => {
    expect(dashboardStatusFromBusiness("MERGED")).toBe("REJECTED");
    expect(dashboardStatusFromBusiness("SUSPENDED")).toBe("SUSPENDED");
  });

  it("marks claimed listings as verified", () => {
    expect(
      verificationStatusFromListing({
        isClaimed: true,
        verifiedAt: "2026-09-08T11:00:00.000Z",
      }),
    ).toBe("VERIFIED");
  });
});
