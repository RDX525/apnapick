"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AREA_CENTROIDS, isDiscoveryAreaSlug } from "@/config/geo-areas";
import type { LatLng } from "@/domain/geo/types";
import {
  CURRENT_LOCATION_VALUE,
  isCurrentLocationValue,
  locateDevicePosition,
} from "@/lib/geo/device-location";
import {
  DISCOVERY_AREA_EVENT,
  DISCOVERY_AREA_SESSION_KEY,
  emitDiscoveryArea,
  keepCurrentLocationSelection,
  openLocationAccess,
  persistCurrentLocation,
  requestDeviceLocation,
  writeDiscoveryArea,
} from "@/lib/geo/location-access";
import {
  loadSessionLocation,
  saveSessionLocation,
} from "@/lib/geo/session-location";

type DiscoveryAreaValue = {
  area: string;
  setArea: (next: string) => void;
  position: LatLng | null;
  locating: boolean;
  placeLabel: string | null;
};

const DiscoveryAreaContext = createContext<DiscoveryAreaValue | null>(null);

function readSavedArea(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.sessionStorage.getItem(DISCOVERY_AREA_SESSION_KEY);
    if (!saved) return null;
    if (isCurrentLocationValue(saved) || isDiscoveryAreaSlug(saved)) return saved;
    return null;
  } catch {
    return null;
  }
}

function applyDeviceSession(
  location: NonNullable<ReturnType<typeof loadSessionLocation>>,
  setAreaState: (slug: string) => void,
  setPosition: (next: LatLng) => void,
  setLocating: (next: boolean) => void,
  setPlaceLabel: (next: string | null) => void,
) {
  const slug =
    location.areaSlug && isDiscoveryAreaSlug(location.areaSlug)
      ? location.areaSlug
      : CURRENT_LOCATION_VALUE;
  setPosition(location.position);
  setPlaceLabel(location.label);
  writeDiscoveryArea(slug);
  setAreaState(slug);
  setLocating(false);
  emitDiscoveryArea(slug);
}

function useDiscoveryAreaController(enableLocate: boolean) {
  const startArea = CURRENT_LOCATION_VALUE;
  const [area, setAreaState] = useState(startArea);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    function onArea(event: Event) {
      const slug = (event as CustomEvent<string>).detail;
      if (isCurrentLocationValue(slug) || isDiscoveryAreaSlug(slug)) {
        setAreaState(slug);
      }
      const saved = loadSessionLocation();
      if (saved?.source === "device") {
        setPosition(saved.position);
        setPlaceLabel(saved.label);
      }
    }
    window.addEventListener(DISCOVERY_AREA_EVENT, onArea);
    return () => window.removeEventListener(DISCOVERY_AREA_EVENT, onArea);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!enableLocate) {
      queueMicrotask(() => {
        if (!cancelled) setLocating(false);
      });
      return () => {
        cancelled = true;
      };
    }

    const saved = readSavedArea();
    if (saved && isDiscoveryAreaSlug(saved)) {
      const centroid = AREA_CENTROIDS[saved]?.position ?? null;
      queueMicrotask(() => {
        if (cancelled) return;
        setLocating(false);
        setAreaState(saved);
        setPlaceLabel(AREA_CENTROIDS[saved]?.label ?? saved);
        if (centroid) setPosition(centroid);
        emitDiscoveryArea(saved);
      });
      return () => {
        cancelled = true;
      };
    }

    const sessionLoc = loadSessionLocation();
    if (sessionLoc?.source === "device") {
      queueMicrotask(() => {
        if (cancelled) return;
        applyDeviceSession(
          sessionLoc,
          setAreaState,
          setPosition,
          setLocating,
          setPlaceLabel,
        );
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setLocating(true);
      writeDiscoveryArea(CURRENT_LOCATION_VALUE);
      setAreaState(CURRENT_LOCATION_VALUE);
      emitDiscoveryArea(CURRENT_LOCATION_VALUE);
    });

    void locateDevicePosition().then(async (result) => {
      if (cancelled) return;
      const chosen = readSavedArea();
      if (chosen && isDiscoveryAreaSlug(chosen)) {
        const centroid = AREA_CENTROIDS[chosen]?.position;
        setLocating(false);
        setAreaState(chosen);
        setPlaceLabel(AREA_CENTROIDS[chosen]?.label ?? chosen);
        if (centroid) setPosition(centroid);
        emitDiscoveryArea(chosen);
        return;
      }
      setLocating(false);
      if (result.ok) {
        setPosition(result.position);
        const resolved = await persistCurrentLocation(result.position);
        if (cancelled) return;
        setPlaceLabel(resolved.label);
        setAreaState(resolved.areaSlug ?? CURRENT_LOCATION_VALUE);
        return;
      }
      if (result.reason === "denied") {
        keepCurrentLocationSelection();
        setAreaState(CURRENT_LOCATION_VALUE);
        setPlaceLabel(null);
        openLocationAccess("denied");
        return;
      }
      keepCurrentLocationSelection();
      setAreaState(CURRENT_LOCATION_VALUE);
      setPlaceLabel(null);
    });

    return () => {
      cancelled = true;
    };
  }, [enableLocate]);

  const setArea = useCallback((next: string) => {
    if (isCurrentLocationValue(next)) {
      writeDiscoveryArea(CURRENT_LOCATION_VALUE);
      setAreaState(CURRENT_LOCATION_VALUE);
      emitDiscoveryArea(CURRENT_LOCATION_VALUE);
      setLocating(true);
      void requestDeviceLocation().then((result) => {
        if (!aliveRef.current) return;
        setLocating(false);
        if (!result.ok) {
          setPlaceLabel(null);
          return;
        }
        setPosition(result.position);
        const saved = loadSessionLocation();
        if (saved?.source === "device") {
          setPlaceLabel(saved.label);
          setAreaState(
            saved.areaSlug && isDiscoveryAreaSlug(saved.areaSlug)
              ? saved.areaSlug
              : CURRENT_LOCATION_VALUE,
          );
        }
      });
      return;
    }
    if (!isDiscoveryAreaSlug(next)) return;
    const centroid = AREA_CENTROIDS[next];
    writeDiscoveryArea(next);
    setAreaState(next);
    setLocating(false);
    setPlaceLabel(centroid?.label ?? next);
    if (centroid) {
      setPosition(centroid.position);
      saveSessionLocation({
        position: centroid.position,
        label: centroid.label,
        areaSlug: next,
        source: "manual",
      });
    }
    emitDiscoveryArea(next);
  }, []);

  return useMemo(
    () => ({ area, setArea, position, locating, placeLabel }),
    [area, setArea, position, locating, placeLabel],
  );
}

export function DiscoveryAreaProvider({
  children,
  enableLocate = true,
}: {
  children: ReactNode;
  enableLocate?: boolean;
}) {
  const value = useDiscoveryAreaController(enableLocate);
  return (
    <DiscoveryAreaContext.Provider value={value}>{children}</DiscoveryAreaContext.Provider>
  );
}

/**
 * Shared dropdown area. On load, request GPS and snap the picker to
 * Kharadi, Wagholi, or Lohegaon when the place name or pin is in that
 * neighbourhood. Otherwise the menu shows the current location name.
 */
export function useDiscoveryArea() {
  const ctx = useContext(DiscoveryAreaContext);
  if (!ctx) {
    throw new Error("useDiscoveryArea must be used within DiscoveryAreaProvider");
  }
  return ctx;
}
