"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLng, MapMarker } from "@/domain/geo/types";
import { cn } from "@/lib/utils";

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pinHtml(marker: MapMarker, index: number) {
  const selected = Boolean(marker.selected);
  const label = escapeHtml(marker.label);
  const n = index + 1;
  if (selected) {
    return `<div class="ap-map-pin ap-map-pin-active"><span class="ap-map-pin-dot">${n}</span><span class="ap-map-pin-label">${label}</span></div>`;
  }
  return `<div class="ap-map-pin"><span class="ap-map-pin-dot">${n}</span></div>`;
}

/**
 * List-first fallback map — no tile SDK required.
 * Platform keeps working when Leaflet/tiles fail.
 */
export function FallbackDiscoveryMap({
  center,
  markers,
  selectedId,
  onSelect,
  className,
}: {
  center: LatLng;
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const span = 0.055;
  const minLat = center.lat - span;
  const maxLat = center.lat + span;
  const minLng = center.lng - span;
  const maxLng = center.lng + span;

  function project(lat: number, lng: number) {
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
    return {
      left: `${Math.min(94, Math.max(6, x))}%`,
      top: `${Math.min(90, Math.max(12, y))}%`,
    };
  }

  return (
    <div
      className={cn("ap-map-canvas ap-map-premium relative overflow-hidden", className)}
    >
      <div className="ap-map-wash pointer-events-none absolute inset-0" />
      <div className="ap-map-grid pointer-events-none absolute inset-0 opacity-30" />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
        viewBox="0 0 400 500"
        aria-hidden
      >
        <path
          d="M20 80C90 70 140 140 210 130C280 120 310 40 390 70"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-sea/25"
        />
        <path
          d="M40 460C120 400 90 280 180 250C270 220 300 320 380 290"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-primary/20"
        />
        <circle cx="210" cy="210" r="70" className="fill-sea/10" />
      </svg>
      <p className="bg-card/80 text-foreground absolute top-3 left-3 z-10 rounded-full px-3 py-1 text-[11px] font-medium shadow-sm ring-1 ring-black/5 backdrop-blur-md">
        Nearby preview
      </p>
      {markers.map((m, index) => {
        const pos = project(m.position.lat, m.position.lng);
        const selected = selectedId === m.id || Boolean(m.selected);
        return (
          <button
            key={m.id}
            type="button"
            title={m.label}
            aria-label={`Select ${m.label}`}
            onClick={() => onSelect?.(m.id)}
            className={cn(
              "absolute z-10 -translate-x-1/2 -translate-y-1/2",
              selected ? "z-20" : "",
            )}
            style={{ left: pos.left, top: pos.top }}
          >
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full shadow-lg transition",
                selected
                  ? "bg-primary text-primary-foreground py-1 pr-2.5 pl-1"
                  : "bg-card text-foreground size-8 justify-center ring-1 ring-black/10",
              )}
            >
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-[10px] font-semibold",
                  selected ? "bg-white/20" : "bg-primary text-primary-foreground",
                )}
              >
                {index + 1}
              </span>
              {selected ? (
                <span className="max-w-[8rem] truncate text-[11px] font-medium">
                  {m.label}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
      {markers.length === 0 ? (
        <p className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
          Pins appear when businesses have locations
        </p>
      ) : null}
    </div>
  );
}

export function LeafletDiscoveryMap({
  center,
  userPosition,
  markers,
  selectedId,
  onSelect,
  onFatalError,
  className,
}: {
  center: LatLng;
  userPosition?: LatLng | null;
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onFatalError?: () => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const tileRef = useRef<import("leaflet").TileLayer | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const markerSignaturesRef = useRef<Map<string, string>>(new Map());
  const userMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId ?? null);
  const hasFittedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    const markersMap = markersRef.current;
    const markerSignatures = markerSignaturesRef.current;
    let resizeObserver: ResizeObserver | null = null;
    let resizeFrame: number | null = null;

    async function boot() {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");
        if (cancelled || !containerRef.current) return;
        leafletRef.current = L;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const map = L.map(containerRef.current, {
          scrollWheelZoom: false,
          zoomControl: false,
          attributionControl: true,
        }).setView([center.lat, center.lng], 13);

        L.control.zoom({ position: "bottomright" }).addTo(map);
        map.attributionControl.setPrefix(false);

        const tiles = L.tileLayer(OSM_TILE_URL, {
          attribution: OSM_ATTR,
          maxZoom: 19,
        }).addTo(map);
        tileRef.current = tiles;

        mapRef.current = map;
        setMapReady(true);
        requestAnimationFrame(() => map.invalidateSize());
        resizeObserver = new ResizeObserver(() => {
          if (resizeFrame != null) return;
          resizeFrame = requestAnimationFrame(() => {
            resizeFrame = null;
            map.invalidateSize();
          });
        });
        resizeObserver.observe(containerRef.current);
      } catch {
        onFatalError?.();
      }
    }

    void boot();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (resizeFrame != null) cancelAnimationFrame(resizeFrame);
      const map = mapRef.current;
      map?.remove();
      mapRef.current = null;
      tileRef.current = null;
      leafletRef.current = null;
      markersMap.clear();
      markerSignatures.clear();
      userMarkerRef.current = null;
      hasFittedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    const existing = markersRef.current;
    const signatures = markerSignaturesRef.current;
    const activeId = selectedId ?? null;

    for (const [id, marker] of existing) {
      if (!markers.some((m) => m.id === id)) {
        marker.remove();
        existing.delete(id);
        signatures.delete(id);
      }
    }

    markers.forEach((m, index) => {
      const selected = activeId === m.id || Boolean(m.selected);
      const signature = [m.position.lat, m.position.lng, m.label, selected, index].join(
        "|",
      );
      const prev = existing.get(m.id);
      if (prev && signatures.get(m.id) === signature) return;

      const icon = L.divIcon({
        className: "ap-map-pin-wrap",
        iconSize: selected ? [168, 36] : [32, 32],
        iconAnchor: selected ? [18, 18] : [16, 16],
        html: pinHtml({ ...m, selected }, index),
      });

      if (prev) {
        prev.setLatLng([m.position.lat, m.position.lng]);
        prev.setIcon(icon);
      } else {
        const marker = L.marker([m.position.lat, m.position.lng], {
          icon,
          riseOnHover: true,
          title: `Select ${m.label}`,
          alt: `Select ${m.label}`,
        }).addTo(map);
        marker.on("click", () => onSelectRef.current?.(m.id));
        existing.set(m.id, marker);
      }
      signatures.set(m.id, signature);
    });

    if (userMarkerRef.current) {
      if (userPosition) {
        userMarkerRef.current.setLatLng([userPosition.lat, userPosition.lng]);
      } else {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    } else if (userPosition) {
      userMarkerRef.current = L.marker([userPosition.lat, userPosition.lng], {
        icon: L.divIcon({
          className: "ap-map-pin-wrap",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          html: `<span class="ap-map-you"><span class="ap-map-you-pulse"></span></span>`,
        }),
        interactive: false,
        zIndexOffset: 600,
      }).addTo(map);
    }

    const selectedMarker = markers.find((m) => m.id === activeId);
    if (selectedMarker && selectedIdRef.current !== activeId) {
      map.panTo([selectedMarker.position.lat, selectedMarker.position.lng]);
    } else if (!hasFittedRef.current) {
      if (markers.length > 0) {
        const bounds = L.latLngBounds(
          markers.map((m) => [m.position.lat, m.position.lng] as [number, number]),
        );
        bounds.extend([center.lat, center.lng]);
        map.fitBounds(bounds.pad(0.22), { maxZoom: 15 });
        hasFittedRef.current = true;
      } else {
        map.setView([center.lat, center.lng], 13);
      }
    }
    selectedIdRef.current = activeId;
  }, [mapReady, markers, center, userPosition, selectedId]);

  return (
    <div
      ref={containerRef}
      className={cn("ap-leaflet min-h-[320px] w-full", className)}
    />
  );
}
