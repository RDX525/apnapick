"use client";

import { useEffect, useRef } from "react";
import type { LatLng } from "@/domain/geo/types";
import { cn } from "@/lib/utils";

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const PUNE: LatLng = { lat: 18.5204, lng: 73.8567 };

export function OnboardingPinMap({
  position,
  onPick,
  className,
}: {
  position: LatLng | null;
  onPick: (position: LatLng) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !containerRef.current) return;
        leafletRef.current = L;

        const start = position ?? PUNE;
        const map = L.map(containerRef.current, {
          scrollWheelZoom: false,
          zoomControl: true,
          attributionControl: true,
        }).setView([start.lat, start.lng], position ? 17 : 12);

        L.tileLayer(OSM_TILE_URL, {
          attribution: OSM_ATTR,
          maxZoom: 19,
        }).addTo(map);
        map.attributionControl.setPrefix(false);

        map.on("click", (event) => {
          onPickRef.current({
            lat: event.latlng.lat,
            lng: event.latlng.lng,
          });
        });

        mapRef.current = map;
        requestAnimationFrame(() => map.invalidateSize());
      } catch {
        // Tile map is progressive — lat/lng fields still work.
      }
    }

    void boot();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
    };
    // Boot once; pin updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !position) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([position.lat, position.lng]);
    } else {
      markerRef.current = L.marker([position.lat, position.lng], {
        draggable: true,
        title: "Business location",
      }).addTo(map);
      markerRef.current.on("dragend", () => {
        const next = markerRef.current?.getLatLng();
        if (!next) return;
        onPickRef.current({ lat: next.lat, lng: next.lng });
      });
    }
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 17), {
      duration: 0.35,
    });
  }, [position]);

  return (
    <div
      ref={containerRef}
      className={cn("ap-leaflet border-border/70 min-h-[240px] w-full overflow-hidden rounded-xl border", className)}
      role="application"
      aria-label="Business map. Click to place the pin."
    />
  );
}
