import { describe, expect, it } from "vitest";
import {
  computeCompleteness,
  completenessScore,
} from "@/services/onboarding/completeness";
import { createEmptyDraft } from "@/domain/onboarding/types";

describe("computeCompleteness (weighted)", () => {
  it("returns 0 for empty draft without verified claim", () => {
    const empty = createEmptyDraft();
    empty.lat = null;
    empty.lng = null;
    empty.priceLevel = null;
    expect(completenessScore(empty)).toBe(0);
  });

  it("awards weighted groups as fields fill", () => {
    const draft = createEmptyDraft();
    draft.name = "Spice Route";
    draft.categorySlug = "restaurants";
    draft.description =
      "A longer description for the business profile page with enough detail.";
    draft.suburb = "Koregaon Park";
    draft.city = "Pune";
    draft.addressLine1 = "Lane 5";
    draft.lat = 18.53;
    draft.lng = 73.89;
    draft.phone = "+91 98765 43210";
    draft.email = "hello@example.com";
    draft.hours = draft.hours.map((h) => ({
      ...h,
      isClosed: false,
      opensAt: "10:00",
      closesAt: "22:00",
    }));
    draft.catalogItems = [
      {
        id: "1",
        kind: "dish",
        name: "Chicken curry",
        description: "",
        priceCents: 1800,
        available: true,
        attributes: [],
      },
    ];
    draft.photos = [
      {
        id: "a",
        role: "cover",
        name: "a.jpg",
        sizeBytes: 1000,
        mimeType: "image/jpeg",
      },
      {
        id: "b",
        role: "gallery",
        name: "b.jpg",
        sizeBytes: 1000,
        mimeType: "image/jpeg",
      },
      {
        id: "c",
        role: "gallery",
        name: "c.jpg",
        sizeBytes: 1000,
        mimeType: "image/jpeg",
      },
    ];
    draft.verificationStatus = "VERIFIED";

    const result = computeCompleteness(draft);
    expect(result.score).toBe(100);
    expect(result.missing).toHaveLength(0);
  });

  it("lists missing groups when incomplete", () => {
    const draft = createEmptyDraft();
    draft.name = "Spice Route";
    draft.categorySlug = "restaurants";
    const result = computeCompleteness(draft);
    expect(result.score).toBe(15);
    expect(result.missing.length).toBeGreaterThan(0);
  });
});
