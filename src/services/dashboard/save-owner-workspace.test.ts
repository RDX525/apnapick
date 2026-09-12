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
    workspace.profile.lat = 18.551;
    workspace.profile.lng = 73.94;
    workspace.hours = workspace.hours.map((day) =>
      day.dayOfWeek === 1
        ? { ...day, isClosed: false, opensAt: "10:00", closesAt: "22:00" }
        : day,
    );
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
        storagePath: null,
        sortOrder: 0,
        isCover: true,
      },
    ];

    const payload = ownerWorkspaceSavePayload(workspace);

    expect(payload.name).toBe("Flow Kitchen");
    expect(payload.description).toBe("Neighbourhood meals");
    expect(payload.phone).toBe("9876543210");
    expect(payload.lat).toBe(18.551);
    expect(payload.lng).toBe(73.94);
    expect(payload.hours[1]).toMatchObject({
      dayOfWeek: 1,
      isClosed: false,
      opensAt: "10:00",
      closesAt: "22:00",
    });
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
        storagePath: null,
      },
    ]);
    expect(payload.photos[0]).not.toHaveProperty("previewUrl");
  });

  it("dedupes weekday hours and normalizes clock strings", () => {
    const workspace = createEmptyWorkspace();
    workspace.profile.name = "Flow Kitchen";
    workspace.hours = [
      { dayOfWeek: 1, isClosed: false, opensAt: "9:00:00", closesAt: "17:30:00" },
      { dayOfWeek: 1, isClosed: false, opensAt: "10:00", closesAt: "22:00" },
      { dayOfWeek: 2, isClosed: false, opensAt: "bad", closesAt: "22:00" },
    ];
    const hours = ownerWorkspaceSavePayload(workspace).hours;
    expect(hours).toHaveLength(7);
    expect(hours[1]).toMatchObject({
      dayOfWeek: 1,
      isClosed: false,
      opensAt: "10:00",
      closesAt: "22:00",
    });
    expect(hours[2]).toMatchObject({
      dayOfWeek: 2,
      isClosed: true,
      opensAt: null,
      closesAt: null,
    });
  });

  it("rounds catalog and menu prices to whole cents", () => {
    const workspace = createEmptyWorkspace();
    workspace.profile.name = "Flow Kitchen";
    workspace.products = [
      {
        id: "11111111-1111-1111-1111-111111111201",
        kind: "product",
        name: "Curry",
        description: "",
        priceCents: 24900.7,
        published: true,
        sortOrder: 0,
        attributes: [],
      },
    ];
    workspace.menu = [
      {
        id: "menu-1",
        name: "Mains",
        sortOrder: 0,
        items: [
          {
            id: "item-1",
            name: "Thali",
            description: "",
            priceCents: 19999.4,
            published: true,
            sortOrder: 0,
            dietary: [],
          },
        ],
      },
    ];
    const payload = ownerWorkspaceSavePayload(workspace);
    expect(payload.products[0]?.priceCents).toBe(24901);
    expect(payload.menu[0]?.items[0]?.priceCents).toBe(19999);
  });

  it("sends persisted photo object keys", () => {
    const workspace = createEmptyWorkspace();
    workspace.profile.name = "Flow Kitchen";
    workspace.photos = [
      {
        id: "11111111-1111-1111-1111-111111111301",
        role: "cover",
        name: "Storefront",
        previewUrl: "https://example.supabase.co/storage/v1/object/public/business-photos/a.jpg",
        storagePath: "11111111-1111-1111-1111-111111111101/cover.jpg",
        sortOrder: 0,
        isCover: true,
      },
    ];
    expect(ownerWorkspaceSavePayload(workspace).photos[0]?.storagePath).toBe(
      "11111111-1111-1111-1111-111111111101/cover.jpg",
    );
  });

  it("keeps a single cover when several photos are marked as cover", () => {
    const workspace = createEmptyWorkspace();
    workspace.profile.name = "Flow Kitchen";
    workspace.photos = [
      {
        id: "11111111-1111-1111-1111-111111111301",
        role: "cover",
        name: "Storefront",
        previewUrl: null,
        storagePath: "biz/cover.jpg",
        sortOrder: 0,
        isCover: true,
      },
      {
        id: "11111111-1111-1111-1111-111111111302",
        role: "cover",
        name: "Gallery",
        previewUrl: null,
        storagePath: "biz/gallery.jpg",
        sortOrder: 1,
        isCover: true,
      },
    ];
    const photos = ownerWorkspaceSavePayload(workspace).photos;
    expect(photos.filter((photo) => photo.isCover)).toHaveLength(1);
    expect(photos[0]?.isCover).toBe(true);
    expect(photos[1]?.isCover).toBe(false);
    expect(photos[1]?.role).toBe("gallery");
  });
});

describe("ownerEditPendingFromMetadata", () => {
  it("reads the admin-review flag from listing metadata", () => {
    expect(ownerEditPendingFromMetadata({ ownerEditPending: true })).toBe(true);
    expect(ownerEditPendingFromMetadata({ ownerEditPending: false })).toBe(false);
    expect(ownerEditPendingFromMetadata({})).toBe(false);
  });
});
