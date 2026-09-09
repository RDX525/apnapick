import { describe, expect, it } from "vitest";
import { isImportedCatalogListing } from "@/lib/business/imported-catalog";

describe("isImportedCatalogListing", () => {
  it("hides OpenStreetMap bootstrap rows", () => {
    expect(
      isImportedCatalogListing("99548baa-4a09-5aef-ad02-a9741936c1fc", {
        source: "openstreetmap",
      }),
    ).toBe(true);
  });

  it("hides local seed UUIDs such as Spice Route Kitchen", () => {
    expect(isImportedCatalogListing("11111111-1111-1111-1111-111111111101")).toBe(
      true,
    );
  });

  it("keeps owner-created listings", () => {
    expect(
      isImportedCatalogListing("cee33d36-aaaa-bbbb-cccc-ddddeeeeffff", {
        source: "onboarding",
      }),
    ).toBe(false);
  });
});
