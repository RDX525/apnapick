/**
 * Session-only discovery location.
 * Precise coordinates must not be written to localStorage / durable analytics.
 */

import type { DiscoveryLocation } from "@/domain/geo/types";

export const GEO_SESSION_KEY = "apnapick.geo.session.v1";

export function loadSessionLocation(): DiscoveryLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(GEO_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DiscoveryLocation;
  } catch {
    return null;
  }
}

export function saveSessionLocation(location: DiscoveryLocation) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(GEO_SESSION_KEY, JSON.stringify(location));
  } catch {
    // ignore quota / private mode
  }
}

export function clearSessionLocation() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(GEO_SESSION_KEY);
  } catch {
    // ignore
  }
}
