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
import { isDiscoveryAreaSlug } from "@/config/geo-areas";
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
  openLocationAccess,
  persistCurrentLocation,
  requestDeviceLocation,
  writeDiscoveryArea,
} from "@/lib/geo/location-access";
import { loadSessionLocation } from "@/lib/geo/session-location";

type DiscoveryAreaValue = {
  area: string;
  setArea: (next: string) => void;
  position: LatLng | null;
  locating: boolean;
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
) {
  const slug =
    location.areaSlug && isDiscoveryAreaSlug(location.areaSlug)
      ? location.areaSlug
      : CURRENT_LOCATION_VALUE;
  setPosition(location.position);
  writeDiscoveryArea(slug);
  setAreaState(slug);
  setLocating(false);
  emitDiscoveryArea(slug);
}

function useDiscoveryAreaController(enableLocate: boolean) {
  const startArea = CURRENT_LOCATION_VALUE;
  const [area, setAreaState] = useState(startArea);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(() => enableLocate);
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
      if (saved?.source === "device") setPosition(saved.position);
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
      queueMicrotask(() => {
        if (cancelled) return;
        setLocating(false);
        setAreaState(saved);
        emitDiscoveryArea(saved);
      });
      const sessionLoc = loadSessionLocation();
      if (sessionLoc?.source === "device") {
        queueMicrotask(() => {
          if (!cancelled) setPosition(sessionLoc.position);
        });
      }
      return () => {
        cancelled = true;
      };
    }

    const sessionLoc = loadSessionLocation();
    if (sessionLoc?.source === "device") {
      queueMicrotask(() => {
        if (cancelled) return;
        applyDeviceSession(sessionLoc, setAreaState, setPosition, setLocating);
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

    void locateDevicePosition().then((result) => {
      if (cancelled) return;
      const chosen = readSavedArea();
      if (chosen && isDiscoveryAreaSlug(chosen)) {
        setLocating(false);
        setAreaState(chosen);
        emitDiscoveryArea(chosen);
        return;
      }
      setLocating(false);
      if (result.ok) {
        setPosition(result.position);
        persistCurrentLocation(result.position);
        return;
      }
      if (result.reason === "denied") {
        openLocationAccess("denied");
        return;
      }
      writeDiscoveryArea("pune");
      setAreaState("pune");
      emitDiscoveryArea("pune");
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
        if (result.ok) setPosition(result.position);
      });
      return;
    }
    if (!isDiscoveryAreaSlug(next)) return;
    writeDiscoveryArea(next);
    setAreaState(next);
    setLocating(false);
    emitDiscoveryArea(next);
  }, []);

  return useMemo(
    () => ({ area, setArea, position, locating }),
    [area, setArea, position, locating],
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
 * Shared dropdown area. On load, request GPS (browser permission prompt)
 * and snap the picker to the nearest neighbourhood (Wagholi, Kharadi, …).
 */
export function useDiscoveryArea() {
  const ctx = useContext(DiscoveryAreaContext);
  if (!ctx) {
    throw new Error("useDiscoveryArea must be used within DiscoveryAreaProvider");
  }
  return ctx;
}
