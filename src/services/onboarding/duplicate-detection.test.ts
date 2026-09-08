import { describe, expect, it } from "vitest";
import {
  findDuplicateCandidates,
  nameSimilarity,
} from "@/services/onboarding/duplicate-detection";

describe("duplicate detection", () => {
  it("scores similar names", () => {
    expect(nameSimilarity("Spice Route Kitchen", "Spice Route")).toBeGreaterThan(0.5);
  });

  it("flags same phone as duplicate signal", () => {
    const hits = findDuplicateCandidates(
      {
        name: "Other Name",
        phone: "+91 98765 43210",
      },
      [
        {
          id: "1",
          name: "Unrelated Cafe",
          slug: "unrelated",
          phone: "919876543210",
        },
      ],
      { minScore: 0.3 },
    );
    expect(hits[0]?.reasons.some((r) => r.includes("phone"))).toBe(true);
  });

  it("never auto-merges — only returns candidates", () => {
    const hits = findDuplicateCandidates(
      { name: "Spice Route Kitchen", lat: 18.53, lng: 73.89 },
      [
        {
          id: "1",
          name: "Spice Route",
          slug: "spice-route",
          lat: 18.5301,
          lng: 73.8901,
        },
      ],
    );
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.businessId).toBe("1");
  });
});
