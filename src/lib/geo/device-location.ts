import type { LatLng } from "@/domain/geo/types";

export const CURRENT_LOCATION_VALUE = "current";
export const CURRENT_LOCATION_LABEL = "Current location";

/** Neighbourhood chips need GPS, not a stale city-level Wi‑Fi/IP guess. */
export const FINE_LOCATE_TIMEOUT_MS = 8_000;
export const COARSE_LOCATE_TIMEOUT_MS = 5_000;
export const LOCATE_MAX_AGE_MS = 60_000;

export function isCurrentLocationValue(value: string) {
  return value === CURRENT_LOCATION_VALUE;
}

export type LocateFailureReason =
  | "unsupported"
  | "denied"
  | "unavailable";

export type LocateResult =
  | { ok: true; position: LatLng }
  | { ok: false; reason: LocateFailureReason };

export type GeolocationPermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "unknown";

export function locateFailureReasonFromCode(code?: number): LocateFailureReason {
  if (code === 1) return "denied";
  return "unavailable";
}

export async function queryGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (typeof navigator === "undefined") return "unknown";
  try {
    if (!navigator.permissions?.query) return "unknown";
    const status = await navigator.permissions.query({
      name: "geolocation",
    });
    if (
      status.state === "granted" ||
      status.state === "denied" ||
      status.state === "prompt"
    ) {
      return status.state;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

function readDevicePosition(options: PositionOptions): Promise<LocateResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, reason: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          ok: true,
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
        }),
      (error) =>
        resolve({
          ok: false,
          reason: locateFailureReasonFromCode(error?.code),
        }),
      options,
    );
  });
}

let locatePromise: Promise<LocateResult> | null = null;

/** Shared in-flight GPS read so header, search, and filters prompt once. */
export function locateDevicePosition(): Promise<LocateResult> {
  if (locatePromise) return locatePromise;
  locatePromise = (async () => {
    const permission = await queryGeolocationPermission();
    if (permission === "denied") {
      return { ok: false, reason: "denied" };
    }
    const fine = await readDevicePosition({
      enableHighAccuracy: true,
      timeout: FINE_LOCATE_TIMEOUT_MS,
      maximumAge: LOCATE_MAX_AGE_MS,
    });
    if (fine.ok || fine.reason === "denied" || fine.reason === "unsupported") {
      return fine;
    }
    return readDevicePosition({
      enableHighAccuracy: false,
      timeout: COARSE_LOCATE_TIMEOUT_MS,
      maximumAge: LOCATE_MAX_AGE_MS,
    });
  })();
  return locatePromise;
}

export function resetDeviceLocateCache() {
  locatePromise = null;
}
