import type { LatLng } from "@/domain/geo/types";

export const CURRENT_LOCATION_VALUE = "current";
export const CURRENT_LOCATION_LABEL = "Current location";

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

let locatePromise: Promise<LocateResult> | null = null;

/** Shared in-flight GPS read so header, search, and filters prompt once. */
export function locateDevicePosition(): Promise<LocateResult> {
  if (locatePromise) return locatePromise;
  locatePromise = new Promise((resolve) => {
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
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300_000 },
    );
  });
  return locatePromise;
}

export function resetDeviceLocateCache() {
  locatePromise = null;
}
