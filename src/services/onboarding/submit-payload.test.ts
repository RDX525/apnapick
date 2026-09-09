import { describe, expect, it } from "vitest";
import { createEmptyDraft } from "@/domain/onboarding/types";
import {
  friendlyOnboardingSubmitError,
  isMissingRpcError,
  prepareOnboardingSubmitPayload,
  resolveOnboardingCategorySlug,
} from "@/services/onboarding/submit-payload";

describe("resolveOnboardingCategorySlug", () => {
  it("keeps a slug that already exists", () => {
    expect(
      resolveOnboardingCategorySlug("food-dining", ["food-dining", "restaurants"]),
    ).toBe("food-dining");
  });

  it("maps Food & Dining onto restaurants when the new slug is missing", () => {
    expect(
      resolveOnboardingCategorySlug("food-dining", ["restaurants", "cafes", "barbers"]),
    ).toBe("restaurants");
  });

  it("maps directory category names onto seed slugs", () => {
    expect(
      resolveOnboardingCategorySlug("Restaurants", ["restaurants", "cafes"]),
    ).toBe("restaurants");
    expect(resolveOnboardingCategorySlug("Cafés", ["cafes"])).toBe("cafes");
    expect(
      resolveOnboardingCategorySlug("Food & Dining", ["restaurants", "cafes"]),
    ).toBe("restaurants");
  });

  it("returns null when nothing matches", () => {
    expect(resolveOnboardingCategorySlug("clothing-fashion", ["restaurants"])).toBe(
      null,
    );
  });
});

describe("prepareOnboardingSubmitPayload", () => {
  it("closes open days that are missing times and drops empty catalog rows", () => {
    const draft = createEmptyDraft();
    draft.name = " Flow Kitchen ";
    draft.hours = [
      { dayOfWeek: 0, isClosed: true, opensAt: null, closesAt: null },
      { dayOfWeek: 1, isClosed: false, opensAt: "10:00", closesAt: "22:00" },
      { dayOfWeek: 2, isClosed: false, opensAt: "", closesAt: "" },
    ];
    draft.catalogItems = [
      {
        id: "1",
        kind: "product",
        name: "Chicken Curry",
        description: "",
        priceCents: 24900,
        available: true,
        attributes: [],
      },
      {
        id: "2",
        kind: "product",
        name: "   ",
        description: "",
        priceCents: null,
        available: true,
        attributes: [],
      },
    ];
    draft.photos = [
      {
        id: "p1",
        role: "cover",
        name: "Storefront",
        sizeBytes: 12,
        mimeType: "image/jpeg",
        previewUrl: "blob:http://localhost/1",
        storagePath: "local/abc",
      },
    ];

    const payload = prepareOnboardingSubmitPayload(draft, "restaurants");
    expect(payload.name).toBe("Flow Kitchen");
    expect(payload.categorySlug).toBe("restaurants");
    expect(payload.hours[1]).toMatchObject({
      isClosed: false,
      opensAt: "10:00",
      closesAt: "22:00",
    });
    expect(payload.hours[2]).toMatchObject({
      isClosed: true,
      opensAt: null,
      closesAt: null,
    });
    expect(payload.catalogItems.map((item) => item.name)).toEqual(["Chicken Curry"]);
    expect(payload.photos[0]?.storagePath).toBeNull();
    expect(payload.photos[0]?.previewUrl).toBeNull();
  });
});

describe("friendlyOnboardingSubmitError", () => {
  it("explains missing claim RPC and already-owned listings", () => {
    expect(
      friendlyOnboardingSubmitError(
        "Could not find the function public.submit_business_claim in the schema cache",
      ),
    ).toMatch(/database/i);
    expect(
      friendlyOnboardingSubmitError("You already have access to this business"),
    ).toMatch(/dashboard/i);
  });
});

describe("isMissingRpcError", () => {
  it("detects PostgREST schema-cache misses", () => {
    expect(
      isMissingRpcError(
        "Could not find the function public.submit_business_claim in the schema cache",
      ),
    ).toBe(true);
    expect(isMissingRpcError("This business is not available to claim")).toBe(
      false,
    );
  });
});
