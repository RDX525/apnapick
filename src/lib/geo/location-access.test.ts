import { afterEach, describe, expect, it, vi } from "vitest";
import { AREA_CENTROIDS } from "@/config/geo-areas";
import { persistCurrentLocation } from "@/lib/geo/location-access";

describe("persistCurrentLocation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("snaps GPS in Kharadi to the Kharadi chip", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: { result: { suburb: "Kharadi", label: "Kharadi, Pune" } },
        }),
      })),
    );

    await expect(
      persistCurrentLocation(AREA_CENTROIDS.kharadi!.position),
    ).resolves.toEqual({ areaSlug: "kharadi", label: "Kharadi" });
  });

  it("keeps the current place name outside the live neighbourhoods", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: { result: { suburb: "Hadapsar", label: "Hadapsar, Pune" } },
        }),
      })),
    );

    await expect(
      persistCurrentLocation(AREA_CENTROIDS.hadapsar!.position),
    ).resolves.toEqual({ areaSlug: null, label: "Hadapsar" });
  });
});
