import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CURRENT_LOCATION_LABEL,
  CURRENT_LOCATION_VALUE,
  FINE_LOCATE_TIMEOUT_MS,
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

  it("requests a neighbourhood-accurate GPS fix first", async () => {
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
        enableHighAccuracy: true,
        timeout: FINE_LOCATE_TIMEOUT_MS,
      }),
    );
  });

  it("falls back to a coarse fix when high accuracy times out", async () => {
    const getCurrentPosition = vi.fn(
      (
        success: (pos: GeolocationPosition) => void,
        error: (err: GeolocationPositionError) => void,
        options?: PositionOptions,
      ) => {
        if (options?.enableHighAccuracy) {
          error({ code: 3, message: "timeout", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
          return;
        }
        success({
          coords: { latitude: 18.551, longitude: 73.94 },
        } as GeolocationPosition);
      },
    );
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
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });
});
