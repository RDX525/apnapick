"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { LatLng, MapMarker } from "@/domain/geo/types";
import { FallbackDiscoveryMap } from "@/components/maps/discovery-map";
import { cn } from "@/lib/utils";

const LeafletDiscoveryMap = dynamic(
  () => import("@/components/maps/discovery-map").then((m) => m.LeafletDiscoveryMap),
  {
    ssr: false,
    loading: () => (
      <div className="ap-map-canvas ap-map-premium text-muted-foreground flex min-h-[320px] items-center justify-center text-sm">
        Loading map…
      </div>
    ),
  },
);

/**
 * Maps UI with automatic fallback when Leaflet/tiles fail.
 * List results remain the source of truth.
 */
export function DiscoveryMapPanel({
  center,
  userPosition,
  markers,
  selectedId,
  mapsEnabled,
  onSelect,
  className,
}: {
  center: LatLng;
  userPosition?: LatLng | null;
  markers: MapMarker[];
  selectedId?: string | null;
  mapsEnabled: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const [useFallback, setUseFallback] = useState(!mapsEnabled);

  if (useFallback) {
    return (
      <FallbackDiscoveryMap
        center={center}
        markers={markers}
        selectedId={selectedId}
        onSelect={onSelect}
        className={cn("aspect-[4/5] min-h-[320px]", className)}
      />
    );
  }

  return (
    <LeafletDiscoveryMap
      center={center}
      userPosition={userPosition}
      markers={markers}
      selectedId={selectedId}
      onSelect={onSelect}
      onFatalError={() => setUseFallback(true)}
      className={cn("aspect-[4/5] min-h-[320px]", className)}
    />
  );
}
