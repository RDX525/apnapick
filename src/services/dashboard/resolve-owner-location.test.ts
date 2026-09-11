import { describe, expect, it, vi } from "vitest";
import { createEmptyWorkspace } from "@/services/dashboard/workspace";
import { resolveOwnerLocationForSave } from "@/services/dashboard/resolve-owner-location";
import { AppError } from "@/lib/errors/app-error";

describe("resolveOwnerLocationForSave", () => {
  it("keeps an existing pin", async () => {
    const workspace = createEmptyWorkspace();
    workspace.profile.addressLine1 = "Lane 5";
    workspace.profile.lat = 18.55;
    workspace.profile.lng = 73.94;
    const geocode = vi.fn();
    const next = await resolveOwnerLocationForSave(workspace, {
      hasPrimaryLocation: false,
      geocode,
    });
    expect(next.profile.lat).toBe(18.55);
    expect(geocode).not.toHaveBeenCalled();
  });

  it("geocodes a new address when there is no location yet", async () => {
    const workspace = createEmptyWorkspace();
    workspace.profile.addressLine1 = "Lane 5, North Main Road";
    workspace.profile.suburb = "Koregaon Park";
    workspace.profile.city = "Pune";
    const geocode = vi.fn().mockResolvedValue([
      {
        id: "1",
        label: "Lane 5",
        position: { lat: 18.5362, lng: 73.8938 },
        source: "places",
      },
    ]);
    const next = await resolveOwnerLocationForSave(workspace, {
      hasPrimaryLocation: false,
      geocode,
    });
    expect(next.profile.lat).toBe(18.5362);
    expect(next.profile.lng).toBe(73.8938);
  });

  it("errors when a new listing address cannot be placed", async () => {
    const workspace = createEmptyWorkspace();
    workspace.profile.addressLine1 = "Unknown alley";
    const geocode = vi.fn().mockResolvedValue([]);
    await expect(
      resolveOwnerLocationForSave(workspace, {
        hasPrimaryLocation: false,
        geocode,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("allows address-only updates when a primary location already exists", async () => {
    const workspace = createEmptyWorkspace();
    workspace.profile.addressLine1 = "Unknown alley";
    const geocode = vi.fn().mockResolvedValue([]);
    const next = await resolveOwnerLocationForSave(workspace, {
      hasPrimaryLocation: true,
      geocode,
    });
    expect(next.profile.lat).toBeNull();
  });
});
