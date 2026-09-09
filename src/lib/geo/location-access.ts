import { AREA_CENTROIDS, nearestDiscoveryArea } from "@/config/geo-areas";
import { saveSessionLocation } from "@/lib/geo/session-location";
import {
  CURRENT_LOCATION_LABEL,
  CURRENT_LOCATION_VALUE,
  locateDevicePosition,
  resetDeviceLocateCache,
  type LocateFailureReason,
  type LocateResult,
} from "@/lib/geo/device-location";

export type LocationAccessReason = LocateFailureReason | "prompt";

type LocationAccessState = {
  open: boolean;
  reason: LocationAccessReason;
};

const ACCESS_EVENT = "apnapick:location-access";
const DISMISS_KEY = "apnapick.geo.access-dismissed.v1";
export const DISCOVERY_AREA_EVENT = "apnapick:discovery-area";
export const DISCOVERY_AREA_SESSION_KEY = "apnapick.discovery.area.v4";

let state: LocationAccessState = { open: false, reason: "prompt" };

function emitAccess() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACCESS_EVENT, { detail: state }));
}

export function getLocationAccessState(): LocationAccessState {
  return state;
}

export function subscribeLocationAccess(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onAccess = () => listener();
  window.addEventListener(ACCESS_EVENT, onAccess);
  return () => window.removeEventListener(ACCESS_EVENT, onAccess);
}

export function isLocationAccessDismissed() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function openLocationAccess(
  reason: LocationAccessReason,
  options?: { force?: boolean },
) {
  if (!options?.force && isLocationAccessDismissed()) return;
  state = { open: true, reason };
  emitAccess();
}

export function closeLocationAccess() {
  state = { ...state, open: false };
  emitAccess();
}

export function dismissLocationAccess() {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
  closeLocationAccess();
}

export function writeDiscoveryArea(slug: string) {
  try {
    window.sessionStorage.setItem(DISCOVERY_AREA_SESSION_KEY, slug);
  } catch {
    /* ignore quota / private mode */
  }
}

export function emitDiscoveryArea(slug: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DISCOVERY_AREA_EVENT, { detail: slug }));
}

export function keepCurrentLocationSelection() {
  writeDiscoveryArea(CURRENT_LOCATION_VALUE);
  emitDiscoveryArea(CURRENT_LOCATION_VALUE);
}

export function persistCurrentLocation(position: { lat: number; lng: number }) {
  const areaSlug = nearestDiscoveryArea(position);
  if (areaSlug) {
    const label = AREA_CENTROIDS[areaSlug]?.label ?? areaSlug;
    saveSessionLocation({
      position,
      label,
      areaSlug,
      source: "device",
    });
    writeDiscoveryArea(areaSlug);
    emitDiscoveryArea(areaSlug);
    return;
  }
  saveSessionLocation({
    position,
    label: CURRENT_LOCATION_LABEL,
    areaSlug: CURRENT_LOCATION_VALUE,
    source: "device",
  });
  writeDiscoveryArea(CURRENT_LOCATION_VALUE);
  emitDiscoveryArea(CURRENT_LOCATION_VALUE);
}

export async function requestDeviceLocation(): Promise<LocateResult> {
  resetDeviceLocateCache();
  const result = await locateDevicePosition();
  if (result.ok) {
    persistCurrentLocation(result.position);
    closeLocationAccess();
  } else {
    state = { open: true, reason: result.reason };
    emitAccess();
  }
  return result;
}
