import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COARSE_LOCATE_TIMEOUT_MS,
  CURRENT_LOCATION_LABEL,
  CURRENT_LOCATION_VALUE,
  isCurrentLocationValue,
  locateDevicePosition,
  locateFailureReasonFromCode,
  resetDeviceLocateCache,
} from "@/lib/geo/device-location";

describe("current location value", () => {
  it("identifies the current-location option", () => {
    expect(isCurrentLocationValue(CURRENT_LOCATION_VALUE)).toBe(true);
    expect(isCurrentLocationValue("pune")).toBe(false);
    expect(CURRENT_LOCATION_LABEL).toMatch(/current location/i);
  });

  it("maps geolocation error codes", () => {
    expect(locateFailureReasonFromCode(1)).toBe("denied");
    expect(locateFailureReasonFromCode(2)).toBe("unavailable");
    expect(locateFailureReasonFromCode(3)).toBe("unavailable");
    expect(locateFailureReasonFromCode()).toBe("unavailable");
  });
});

describe("locateDevicePosition", () => {
  afterEach(() => {
    resetDeviceLocateCache();
    vi.unstubAllGlobals();
  });

  it("fails immediately when geolocation permission is already denied", async () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("navigator", {
      permissions: {
        query: vi.fn(async () => ({ state: "denied" })),
      },
      geolocation: { getCurrentPosition },
    });

    await expect(locateDevicePosition()).resolves.toEqual({
      ok: false,
      reason: "denied",
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("requests a coarse GPS fix instead of a long high-accuracy wait", async () => {
    const getCurrentPosition = vi.fn((success: (pos: GeolocationPosition) => void) => {
      success({
        coords: { latitude: 18.551, longitude: 73.94 },
      } as GeolocationPosition);
    });
    vi.stubGlobal("navigator", {
      permissions: {
        query: vi.fn(async () => ({ state: "granted" })),
      },
      geolocation: { getCurrentPosition },
    });

    await expect(locateDevicePosition()).resolves.toEqual({
      ok: true,
      position: { lat: 18.551, lng: 73.94 },
    });
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: false,
        timeout: COARSE_LOCATE_TIMEOUT_MS,
      }),
    );
  });
});
