import { describe, expect, it } from "vitest";
import { createEmptyWorkspace } from "@/services/dashboard/workspace";
import {
  ownerEditPendingFromMetadata,
  ownerWorkspaceSavePayload,
} from "@/services/dashboard/save-owner-workspace";

describe("ownerWorkspaceSavePayload", () => {
  it("sends trimmed listing fields and omits blob photo URLs", () => {
    const workspace = createEmptyWorkspace();
    workspace.profile.name = "  Flow Kitchen  ";
    workspace.profile.description = "  Neighbourhood meals ";
    workspace.profile.phone = " 9876543210 ";
    workspace.profile.categorySlug = "restaurants";
    workspace.profile.suburb = "Kharadi";
    workspace.products = [
      {
        id: "11111111-1111-1111-1111-111111111201",
        kind: "product",
        name: "  Chicken Curry  ",
        description: "Spiced gravy",
        priceCents: 24900,
        published: true,
        sortOrder: 0,
        attributes: [],
      },
      {
        id: "skip",
        kind: "product",
        name: "   ",
        description: "",
        priceCents: null,
        published: true,
        sortOrder: 1,
        attributes: [],
      },
    ];
    workspace.photos = [
      {
        id: "11111111-1111-1111-1111-111111111301",
        role: "cover",
        name: "Storefront",
        previewUrl: "blob:http://localhost/photo",
        sortOrder: 0,
        isCover: true,
      },
    ];

    const payload = ownerWorkspaceSavePayload(workspace);

    expect(payload.name).toBe("Flow Kitchen");
    expect(payload.description).toBe("Neighbourhood meals");
    expect(payload.phone).toBe("9876543210");
    expect(payload.products).toEqual([
      {
        id: "11111111-1111-1111-1111-111111111201",
        name: "Chicken Curry",
        description: "Spiced gravy",
        priceCents: 24900,
        published: true,
        sortOrder: 0,
      },
    ]);
    expect(payload.photos).toEqual([
      {
        id: "11111111-1111-1111-1111-111111111301",
        name: "Storefront",
        isCover: true,
        role: "cover",
        sortOrder: 0,
      },
    ]);
    expect(payload.photos[0]).not.toHaveProperty("previewUrl");
  });
});

describe("ownerEditPendingFromMetadata", () => {
  it("reads the admin-review flag from listing metadata", () => {
    expect(ownerEditPendingFromMetadata({ ownerEditPending: true })).toBe(true);
    expect(ownerEditPendingFromMetadata({ ownerEditPending: false })).toBe(false);
    expect(ownerEditPendingFromMetadata({})).toBe(false);
  });
});
